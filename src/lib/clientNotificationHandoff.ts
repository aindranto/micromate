import {
  CanonicalSignal,
  ClientNotification,
  ClientNotificationState,
  Asset,
  WorkflowGatewayRequest,
  WorkflowGatewayResponse
} from '../types';
import {
  getClientNotification,
  transitionClientState
} from './clientNotificationService';

/**
 * MICROMATE — PHASE 6-2C: DEEP-LINK HANDOFF & GATEWAY HYDRATION
 * 
 * Headline: "Hydration may prepare an action; only the Gateway may execute an action."
 * 
 * Invariants:
 * 1. Deep-link is purely declarative (I-08-01)
 * 2. Deep-link cannot execute mutations (I-08-02)
 * 3. Gateway remains the single execution authority (I-08-03)
 * 4. Current truth in live 3F activeSignals beats notification snapshot (I-08-04)
 * 5. Hydration of local state is completely read-only and is not execution (I-08-05)
 * 6. Invalid / Stale Deep-Links fail gracefully prior to any mutation (I-08-06)
 * 7. Complete unbroken audit lineage tracking is preserved (I-08-07)
 * 8. Opening a Deep-Link transitions status to OPENED but is not resolution (I-08-08)
 */

export interface DeepLinkPayload {
  readonly action_code: string;
  readonly asset_id: string;
  readonly signal_id: string;
  readonly notification_id: string;
  readonly workflow_type: 'MAINTENANCE' | 'DOCUMENT_RENEWAL' | 'COST_ACK';
  readonly source_record_id?: string;
  readonly context?: Record<string, any>;
}

export interface GatewayHydrationState {
  readonly hydrated: boolean;
  readonly payload: DeepLinkPayload;
  readonly workflow_case_id: string;
  readonly initial_form_state: Record<string, any>;
  readonly audit_lineage: {
    readonly notification_id: string;
    readonly signal_id: string;
    readonly action_code: string;
    readonly workflow_case_id: string;
    readonly origin_channel?: string;
  };
}

/**
 * I-08-01: Parsers an incoming Deep-Link URL into a declarative DeepLinkPayload
 */
export function parseDeepLink(urlStr: string): DeepLinkPayload {
  if (!urlStr) {
    throw new Error('Malformed URL payload: Empty deep-link');
  }

  try {
    const base = 'https://micromate.internal';
    const parsed = new URL(urlStr, base);
    const params = parsed.searchParams;

    const action_code = params.get('action_code') || '';
    const asset_id = params.get('asset_id') || '';
    const signal_id = params.get('signal_id') || '';
    const notification_id = params.get('notification_id') || '';
    const workflow_type_str = params.get('workflow_type') || '';
    const source_record_id = params.get('source_record_id') || undefined;

    if (!action_code || !asset_id || !signal_id || !notification_id || !workflow_type_str) {
      throw new Error('Malformed URL payload: Missing required deep-link parameters');
    }

    if (workflow_type_str !== 'MAINTENANCE' && workflow_type_str !== 'DOCUMENT_RENEWAL' && workflow_type_str !== 'COST_ACK') {
      throw new Error(`Malformed URL payload: Invalid workflow_type '${workflow_type_str}'`);
    }

    return {
      action_code,
      asset_id,
      signal_id,
      notification_id,
      workflow_type: workflow_type_str as 'MAINTENANCE' | 'DOCUMENT_RENEWAL' | 'COST_ACK',
      source_record_id
    };
  } catch (err: any) {
    throw new Error(`Malformed URL payload: ${err.message}`);
  }
}

/**
 * I-08-04 / I-08-06: Validates declarative payload against current live active signals
 */
export function validateDeepLinkAgainstCurrentTruth(
  payload: DeepLinkPayload,
  activeSignals: CanonicalSignal[]
): { valid: boolean; reason?: string } {
  // 1. Resolve notification record
  const notification = getClientNotification(payload.notification_id);
  if (!notification) {
    return { valid: false, reason: 'REJECTED: Unknown notification_id' };
  }

  // 2. Prevent reopening terminal client states (I-08-06 / I-08-09 protection)
  if (notification.client_state === 'OBSOLETE') {
    return { valid: false, reason: 'REJECTED: Notification is already OBSOLETE' };
  }
  if (notification.client_state === 'CANCELLED') {
    return { valid: false, reason: 'REJECTED: Notification is already CANCELLED' };
  }

  // 3. Ensure action and asset parameter symmetry matches the bound intent
  if (notification.action_binding.action_code !== payload.action_code) {
    return { valid: false, reason: 'REJECTED: Malformed action code mismatch' };
  }
  if (notification.signal_snapshot.asset_id !== payload.asset_id) {
    return { valid: false, reason: 'REJECTED: Asset ID mismatch' };
  }

  // 4. Current Truth Beats Notification Snapshot (I-08-04)
  const isSignalStillActive = activeSignals.some(sig => sig.signal_id === payload.signal_id);
  if (!isSignalStillActive) {
    return { valid: false, reason: 'REJECTED: Stale signal reference (canonical signal is no longer active)' };
  }

  return { valid: true };
}

/**
 * I-08-02 / I-08-05: Hydrates Gateway Resolution UI without any DB or Domain state mutation
 */
export function hydrateGatewayResolutionUI(
  payload: DeepLinkPayload,
  activeSignals: CanonicalSignal[],
  options?: {
    nowTimestamp?: string;
  }
): GatewayHydrationState {
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  // First validate against active signals
  const validation = validateDeepLinkAgainstCurrentTruth(payload, activeSignals);
  if (!validation.valid) {
    throw new Error(validation.reason || 'REJECTED: Validation failed');
  }

  // Mark client notification state as OPENED (I-08-08 / Golden Path)
  const notification = getClientNotification(payload.notification_id);
  if (notification && notification.client_state !== 'OPENED') {
    transitionClientState(payload.notification_id, 'OPENED', { nowTimestamp: nowIso });
  }

  // Generate deterministic hydrated case ID to link notification lineage with gateway
  const workflowCaseId = `WFC-HYD-${payload.notification_id.substring(3)}-${payload.signal_id.substring(4)}`;

  // Construct initial prefilled form state
  const initialFormState: Record<string, any> = {
    asset_id: payload.asset_id,
    action_code: payload.action_code,
    source_record_id: payload.source_record_id,
    trigger_signal_id: payload.signal_id,
    workflow_case_id: workflowCaseId,
    prefilled_at: nowIso,
    audit_linked: true
  };

  // Unbroken lineage context (I-08-07)
  const auditLineage = {
    notification_id: payload.notification_id,
    signal_id: payload.signal_id,
    action_code: payload.action_code,
    workflow_case_id: workflowCaseId,
    origin_channel: 'IN_APP_PUSH'
  };

  return {
    hydrated: true,
    payload,
    workflow_case_id: workflowCaseId,
    initial_form_state: initialFormState,
    audit_lineage: auditLineage
  };
}
