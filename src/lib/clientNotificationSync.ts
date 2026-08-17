import {
  ClientNotification,
  ClientNotificationState,
  CanonicalSignal
} from '../types';
import {
  getClientNotification,
  registerClientNotification,
  transitionClientState,
  synchronizeObsoleteState
} from './clientNotificationService';

/**
 * PHASE 6-2B: CLIENT NOTIFICATION STATE SYNCHRONIZATION
 * 
 * Reconciler Pasif, Idempoten, dan Read-Only terhadap Operational Core.
 * 
 * Invariants:
 * 1. Synchronizer MUST NOT create new NotificationRecords.
 * 2. Synchronizer MUST NOT invoke Workflow Gateway or execute cases.
 * 3. Synchronizer MUST NOT mutate any domain models (Asset, Documents, etc.).
 * 4. Synchronizer MUST NOT mutate 3F signals.
 * 5. signal_snapshot remains strictly for historical auditing (I-07-04).
 * 6. OBSOLETE is derived only from missing canonical signals (I-07-01).
 * 7. Repeated sync runs are strictly idempotent (I-07-05).
 * 8. Sync failures are completely isolated from the operational core (I-07-06).
 */

export interface SyncResult {
  readonly notification_id: string;
  readonly previous_state: ClientNotificationState;
  readonly current_state: ClientNotificationState;
  readonly converged: boolean;
  readonly convergence_type?: 'OPERATIONAL' | 'PRESENTATION' | 'NONE';
}

/**
 * Executes a single Client Notification state synchronization and convergence pass.
 * Completely read-only with respect to the core domain and 3F engines.
 */
export function synchronizeClientState(
  notificationId: string,
  activeSignals: CanonicalSignal[],
  remoteStateSource?: {
    client_state: ClientNotificationState;
    cancel_reason?: string;
    cancel_actor?: string;
  },
  options?: {
    nowTimestamp?: string;
    simulateNetworkFailure?: boolean;
  }
): SyncResult {
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  // I-07-06: Isolated Sync Failures - Return last known state on failure
  if (options?.simulateNetworkFailure) {
    const existing = getClientNotification(notificationId);
    if (!existing) {
      throw new Error(`Sync failed: Network unreachable and no local cached record found for ${notificationId}`);
    }
    return {
      notification_id: notificationId,
      previous_state: existing.client_state,
      current_state: existing.client_state,
      converged: false,
      convergence_type: 'NONE'
    };
  }

  const localItem = getClientNotification(notificationId);
  if (!localItem) {
    // I-07-07: Synchronizer must not create "ghost" notifications if missing in local store
    throw new Error(`Synchronization rejected: Cannot sync non-existent client notification ${notificationId} (No ghost creation permitted)`);
  }

  const previousState = localItem.client_state;
  let currentState = previousState;
  let convergenceType: 'OPERATIONAL' | 'PRESENTATION' | 'NONE' = 'NONE';

  // --- Pipeline 1: Operational Convergence (Canonical 3F Supremacy - I-07-01) ---
  const signalId = localItem.signal_snapshot.signal_id;
  const isSignalStillActive = activeSignals.some(sig => sig.signal_id === signalId);

  if (!isSignalStillActive) {
    if (previousState !== 'OBSOLETE' && previousState !== 'CANCELLED') {
      const updated = synchronizeObsoleteState(notificationId, activeSignals, nowIso);
      return {
        notification_id: notificationId,
        previous_state: previousState,
        current_state: updated.client_state,
        converged: true,
        convergence_type: 'OPERATIONAL'
      };
    }
  }

  // If already in a terminal state, protect and do not allow re-opening
  if (previousState === 'OBSOLETE' || previousState === 'CANCELLED') {
    return {
      notification_id: notificationId,
      previous_state: previousState,
      current_state: previousState,
      converged: false,
      convergence_type: 'NONE'
    };
  }

  // --- Pipeline 2: Presentation Convergence (Cross-Device Sync - I-07-03) ---
  if (remoteStateSource) {
    const remoteState = remoteStateSource.client_state;
    
    // We only converge presentation state if the remote state represents progress
    // State Priority Order: UNREAD (0) -> READ (1) -> OPENED (2)
    const statePriority = (s: ClientNotificationState): number => {
      switch (s) {
        case 'OPENED': return 2;
        case 'READ': return 1;
        case 'UNREAD': return 0;
        default: return -1; // CANCELLED/OBSOLETE handled separately
      }
    };

    if (remoteState === 'CANCELLED' || remoteState === 'OBSOLETE') {
      // Direct terminal override
      const updated = transitionClientState(notificationId, remoteState, {
        reason: remoteStateSource.cancel_reason,
        actor: remoteStateSource.cancel_actor,
        nowTimestamp: nowIso
      });
      return {
        notification_id: notificationId,
        previous_state: previousState,
        current_state: updated.client_state,
        converged: true,
        convergence_type: 'PRESENTATION'
      };
    }

    if (statePriority(remoteState) > statePriority(previousState)) {
      const updated = transitionClientState(notificationId, remoteState, {
        nowTimestamp: nowIso
      });
      return {
        notification_id: notificationId,
        previous_state: previousState,
        current_state: updated.client_state,
        converged: true,
        convergence_type: 'PRESENTATION'
      };
    }
  }

  // I-07-05: Idempotency check (no state changes)
  return {
    notification_id: notificationId,
    previous_state: previousState,
    current_state: currentState,
    converged: false,
    convergence_type: 'NONE'
  };
}

/**
 * Synchronizes a list of local notifications against a set of live 3F active signals
 */
export function synchronizeClientNotifications(
  notificationIds: string[],
  activeSignals: CanonicalSignal[],
  options?: {
    nowTimestamp?: string;
  }
): SyncResult[] {
  return notificationIds.map(id => synchronizeClientState(id, activeSignals, undefined, options));
}
