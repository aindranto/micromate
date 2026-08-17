import {
  WorkflowCase,
  WorkflowType,
  Asset,
  Document,
  Reminder,
  WorkflowGatewayRequest,
  WorkflowGatewayResponse,
  GatewayExecutionStatus,
  DocumentRenewalEvidence
} from '../types';
import { transitionWorkflowCase, canTransition } from './workflowStateMachine';
import { executeCoordinatedMaintenanceClosure } from './coordinatedMutationService';
import { executeCoordinatedDocumentRenewal } from './documentRenewalCoordinatedService';
import { recordAcknowledgement } from './acknowledgementService';

/**
 * MICROMATE PHASE 4-4: ACTION EXECUTION & UI INTEGRATION GATEWAY
 * 
 * Boundary & Core Responsibilities:
 * 1. Gateway Orchestrator: UI strictly interacts via Gateway methods, NEVER calling domain mutations directly.
 * 2. 3F Read-Only Boundary: Does not modify 3F Attention Engine or Presentation Adapter.
 * 3. Immutable Case ID & State Control: Enforces valid state transitions via Workflow State Machine Engine.
 * 4. Manual Reconciliation: Handles PARTIALLY_COMPLETED / RECONCILIATION_REQUIRED explicitly.
 * 5. Execution State Feedback: Provides honest, single-session execution feedback to UI callers.
 */

// In-Memory Gateway Case Registry
const gatewayCaseStore = new Map<string, WorkflowCase>();

/**
 * Clears the gateway case store (for test isolation)
 */
export function clearGatewayStore(): void {
  gatewayCaseStore.clear();
}

/**
 * Retrieves a stored workflow case by ID
 */
export function getWorkflowCaseById(workflowCaseId: string): WorkflowCase | undefined {
  return gatewayCaseStore.get(workflowCaseId);
}

/**
 * Maps action_code to canonical workflow_type
 */
export function mapActionCodeToWorkflowType(actionCode: string): WorkflowType {
  switch (actionCode) {
    case 'SCHEDULE_MAINTENANCE':
    case 'RECORD_SERVICE':
      return 'MAINTENANCE_OVERDUE_CLOSURE';
    case 'REVIEW_DOCUMENT_RENEWAL':
    case 'PREPARE_DOCUMENT_RENEWAL':
    case 'RENEW_DOCUMENT':
    case 'UPLOAD_DOCUMENT':
      return 'DOCUMENT_RENEWAL_CLOSURE';
    case 'REVIEW_COST_ANALYTICS':
    case 'REVIEW_EXPENSE':
    case 'LOG_PURCHASE':
      return 'COST_TREND_REVIEW';
    default:
      return 'MAINTENANCE_OVERDUE_CLOSURE';
  }
}

/**
 * Determines available UI actions based on current workflow state
 */
export function getAvailableActionsForState(state: string): ('EXECUTE' | 'RETRY' | 'RECONCILE' | 'CANCEL')[] {
  switch (state) {
    case 'DRAFT':
    case 'READY':
      return ['EXECUTE', 'CANCEL'];
    case 'FAILED':
      return ['RETRY', 'CANCEL'];
    case 'PARTIALLY_COMPLETED':
    case 'RECONCILIATION_REQUIRED':
      return ['RECONCILE', 'RETRY', 'CANCEL'];
    case 'RESOLVED':
    case 'CANCELLED':
    default:
      return [];
  }
}

/**
 * 4-4A/B: Starts/Initializes a new Workflow Case without executing domain mutations yet
 */
export function startWorkflowCase(
  request: WorkflowGatewayRequest,
  asset: Asset,
  options?: { nowTimestamp?: string }
): WorkflowGatewayResponse {
  const nowIso = options?.nowTimestamp || new Date().toISOString();
  const workflowCaseId = request.workflow_case_id || `WFC-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const workflowType = mapActionCodeToWorkflowType(request.action_code);

  const newCase: WorkflowCase = {
    workflow_case_id: workflowCaseId,
    workflow_type: workflowType,
    workflow_state: 'DRAFT',
    asset_id: asset.asset_id,
    trigger_signal_id: request.trigger_signal_id,
    source_record_id: request.source_record_id,
    action_code: request.action_code,
    created_at: nowIso,
    updated_at: nowIso,
    context_data: {
      linked_reminder_id: request.source_record_id,
      ...(request.payload || {})
    }
  };

  // Transition DRAFT -> PREPARE -> READY
  const prepRes = transitionWorkflowCase(newCase, 'PREPARE', { timestamp: nowIso });
  if (prepRes.accepted === false) {
    return {
      success: false,
      gateway_status: 'FAILURE',
      workflow_case: newCase,
      error_message: prepRes.reason,
      available_actions: []
    };
  }

  const readyCase = prepRes.workflow_case;
  gatewayCaseStore.set(workflowCaseId, readyCase);

  return {
    success: true,
    gateway_status: 'PREPARING',
    workflow_case: readyCase,
    available_actions: getAvailableActionsForState(readyCase.workflow_state)
  };
}

/**
 * 4-4B: Executes a Workflow Case through State Machine & Coordinated Mutation Service
 */
export function executeWorkflowCase(
  request: WorkflowGatewayRequest,
  asset: Asset,
  linkedReminder?: Reminder,
  options?: {
    nowTimestamp?: string;
    simulatedFailures?: {
      primaryFailureMessage?: string;
      secondaryFailureMessage?: string;
    };
  }
): WorkflowGatewayResponse {
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  // Find existing case or start a new one
  let activeCase: WorkflowCase;
  if (request.workflow_case_id && gatewayCaseStore.has(request.workflow_case_id)) {
    activeCase = gatewayCaseStore.get(request.workflow_case_id)!;
  } else {
    const startRes = startWorkflowCase(request, asset, { nowTimestamp: nowIso });
    if (!startRes.success) {
      return startRes;
    }
    activeCase = startRes.workflow_case;
  }

  // Reject execution on terminal states
  if (activeCase.workflow_state === 'RESOLVED' || activeCase.workflow_state === 'CANCELLED') {
    return {
      success: false,
      gateway_status: activeCase.workflow_state === 'RESOLVED' ? 'SUCCESS' : 'CANCELLED',
      workflow_case: activeCase,
      error_message: `Workflow Case ${activeCase.workflow_case_id} is in terminal state '${activeCase.workflow_state}' and cannot be re-executed.`,
      available_actions: []
    };
  }

  // Branch based on workflow_type
  if (activeCase.workflow_type === 'COST_TREND_REVIEW') {
    // Mode B: Read-Only Audit Acknowledgement Flow (No domain mutation)
    const noteText = request.payload?.notes || request.payload?.user_acknowledgement_note || 'Peninjauan tren biaya dikonfirmasi pengguna.';
    const ackRecord = recordAcknowledgement({
      signal_id: activeCase.trigger_signal_id || `SIG-COST-${asset.asset_id}`,
      asset_id: asset.asset_id,
      action_code: activeCase.action_code || 'REVIEW_COST_ANALYTICS',
      source_record_id: activeCase.source_record_id,
      acknowledged_by: 'USER_MANUAL',
      acknowledged_at: nowIso,
      note: noteText
    });

    // State machine transitions: READY -> EXECUTE -> COMPLETE -> RESOLVE
    let workingCase = { ...activeCase };
    const execRes = transitionWorkflowCase(workingCase, 'EXECUTE', { timestamp: nowIso });
    if (execRes.accepted) {
      workingCase = execRes.workflow_case;
    }

    const compRes = transitionWorkflowCase(workingCase, 'COMPLETE', { timestamp: nowIso });
    if (compRes.accepted) {
      workingCase = compRes.workflow_case;
    }

    const resolveRes = transitionWorkflowCase(workingCase, 'RESOLVE', {
      timestamp: nowIso,
      context_data: {
        user_acknowledgement_note: noteText,
        acknowledgement_id: ackRecord.acknowledgement_id
      } as any,
      reconciliation: {
        reconciliation_type: 'EXPLICIT_CONFIRMATION',
        reconciled_at: nowIso,
        reconciled_by: 'USER_MANUAL',
        resolution_notes: `Peninjauan tren biaya dicatat dengan ID Bukti Audit: ${ackRecord.acknowledgement_id}`
      }
    });

    const finalCase = resolveRes.accepted ? resolveRes.workflow_case : workingCase;
    gatewayCaseStore.set(finalCase.workflow_case_id, finalCase);

    return {
      success: true,
      gateway_status: 'SUCCESS',
      workflow_case: finalCase,
      available_actions: []
    };
  }

  if (activeCase.workflow_type === 'DOCUMENT_RENEWAL_CLOSURE') {
    const defaultEvidence: DocumentRenewalEvidence = {
      asset_id: asset.asset_id,
      document_type: request.payload?.documentInput?.document_type || request.payload?.evidence?.document_type || 'stnk',
      title: request.payload?.documentInput?.title || request.payload?.evidence?.title || `Perpanjangan Dokumen ${asset.name}`,
      new_expiry_date: request.payload?.documentInput?.new_expiry_date || request.payload?.evidence?.new_expiry_date || new Date(Date.now() + 365*24*60*60*1000).toISOString().substring(0, 10),
      file_name: request.payload?.documentInput?.file_name || request.payload?.evidence?.file_name || 'dokumen_perpanjangan.pdf',
      mime_type: request.payload?.documentInput?.mime_type || request.payload?.evidence?.mime_type || 'application/pdf',
      file_size: request.payload?.documentInput?.file_size || request.payload?.evidence?.file_size || 1024000,
      file_fingerprint: request.payload?.documentInput?.file_fingerprint || request.payload?.evidence?.file_fingerprint || `fp_doc_${activeCase.workflow_case_id}`,
      renewal_cost: request.payload?.documentInput?.renewal_cost || request.payload?.evidence?.renewal_cost || 350000,
      previous_document_id: request.source_record_id || request.payload?.evidence?.previous_document_id
    };

    const docResult = executeCoordinatedDocumentRenewal(
      activeCase,
      asset,
      request.payload?.documentEvidence || defaultEvidence,
      linkedReminder,
      request.payload?.previousDocument,
      {
        simulatedFailures: {
          primaryFailureMessage: options?.simulatedFailures?.primaryFailureMessage,
          secondaryArchivalFailureMessage: (options?.simulatedFailures as any)?.secondaryArchivalFailureMessage,
          secondaryReminderFailureMessage: options?.simulatedFailures?.secondaryFailureMessage || (options?.simulatedFailures as any)?.secondaryReminderFailureMessage,
          optionalExpenseFailureMessage: (options?.simulatedFailures as any)?.optionalExpenseFailureMessage
        }
      }
    );

    const updatedCase = docResult.updated_workflow_case;
    gatewayCaseStore.set(updatedCase.workflow_case_id, updatedCase);

    let gatewayStatus: GatewayExecutionStatus = 'SUCCESS';
    if (docResult.overall_status === 'PARTIAL_FAILURE') {
      gatewayStatus = 'RECONCILIATION_REQUIRED';
    } else if (docResult.overall_status === 'FAILURE') {
      gatewayStatus = 'FAILURE';
    }

    return {
      success: docResult.overall_status === 'SUCCESS',
      gateway_status: gatewayStatus,
      workflow_case: updatedCase,
      mutation_result: {
        workflow_case_id: updatedCase.workflow_case_id,
        primary_mutation: docResult.primary_document,
        secondary_mutation: docResult.secondary_reminder_reconciliation,
        overall_status: docResult.overall_status,
        reconciliation_required: docResult.reconciliation_required,
        updated_workflow_case: docResult.updated_workflow_case
      },
      error_message: updatedCase.failure?.error_message,
      available_actions: getAvailableActionsForState(updatedCase.workflow_state)
    };
  }

  // Prepare maintenance payload
  const maintenanceInput = request.payload?.maintenanceInput || {
    asset_id: asset.asset_id,
    type: 'routine_service',
    date: nowIso.substring(0, 10),
    title: `Servis Berkala ${asset.name}`,
    cost: request.payload?.cost || 0,
    mileage: asset.vehicle_details?.current_mileage
  };

  // Delegate execution to Coordinated Mutation Service
  const executionDetails = executeCoordinatedMaintenanceClosure({
    workflowCase: activeCase,
    asset,
    maintenanceInput,
    linkedReminder,
    options: {
      nowTimestamp: nowIso,
      simulatedFailures: options?.simulatedFailures
    }
  });

  const { result, maintenanceTransactionResult } = executionDetails;
  const updatedCase = result.updated_workflow_case;
  gatewayCaseStore.set(updatedCase.workflow_case_id, updatedCase);

  if (maintenanceTransactionResult?.updatedAsset) {
    const updated = maintenanceTransactionResult.updatedAsset;
    asset.maintenance_records = updated.maintenance_records;
    asset.reminders = updated.reminders;
    asset.expenses = updated.expenses;
    asset.history = updated.history;
    if (asset.vehicle_details && updated.vehicle_details) {
      Object.assign(asset.vehicle_details, updated.vehicle_details);
    }
  }

  let gatewayStatus: GatewayExecutionStatus = 'SUCCESS';
  if (result.overall_status === 'PARTIAL_FAILURE') {
    gatewayStatus = 'RECONCILIATION_REQUIRED';
  } else if (result.overall_status === 'FAILURE') {
    gatewayStatus = 'FAILURE';
  }

  return {
    success: result.overall_status === 'SUCCESS',
    gateway_status: gatewayStatus,
    workflow_case: updatedCase,
    mutation_result: result,
    error_message: updatedCase.failure?.error_message,
    available_actions: getAvailableActionsForState(updatedCase.workflow_state)
  };
}

/**
 * 4-4C: Retries execution of a failed or partially completed Workflow Case
 */
export function retryWorkflowCase(
  workflowCase: WorkflowCase,
  asset: Asset,
  linkedReminder?: Reminder,
  options?: {
    nowTimestamp?: string;
    simulatedFailures?: {
      primaryFailureMessage?: string;
      secondaryFailureMessage?: string;
    };
  }
): WorkflowGatewayResponse {
  if (!canTransition(workflowCase.workflow_state, 'RETRY')) {
    return {
      success: false,
      gateway_status: workflowCase.workflow_state === 'RESOLVED' ? 'SUCCESS' : 'FAILURE',
      workflow_case: workflowCase,
      error_message: `Workflow Case ${workflowCase.workflow_case_id} in state '${workflowCase.workflow_state}' cannot accept RETRY event.`,
      available_actions: getAvailableActionsForState(workflowCase.workflow_state)
    };
  }

  const req: WorkflowGatewayRequest = {
    workflow_case_id: workflowCase.workflow_case_id,
    action_code: workflowCase.action_code || 'SCHEDULE_MAINTENANCE',
    asset_id: asset.asset_id,
    trigger_signal_id: workflowCase.trigger_signal_id,
    source_record_id: workflowCase.source_record_id,
    payload: workflowCase.context_data
  };

  return executeWorkflowCase(req, asset, linkedReminder, options);
}

/**
 * 4-4C: Manually reconciles a Workflow Case in RECONCILIATION_REQUIRED state
 */
export function reconcileWorkflowCase(
  workflowCase: WorkflowCase,
  resolutionNotes?: string,
  options?: { nowTimestamp?: string }
): WorkflowGatewayResponse {
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  if (!canTransition(workflowCase.workflow_state, 'RESOLVE') && !canTransition(workflowCase.workflow_state, 'RECONCILE')) {
    return {
      success: false,
      gateway_status: 'FAILURE',
      workflow_case: workflowCase,
      error_message: `Workflow Case ${workflowCase.workflow_case_id} in state '${workflowCase.workflow_state}' cannot be manually reconciled.`,
      available_actions: getAvailableActionsForState(workflowCase.workflow_state)
    };
  }

  let workingCase = { ...workflowCase };

  // If in RECONCILIATION_REQUIRED or PARTIALLY_COMPLETED, resolve directly
  const resolveRes = transitionWorkflowCase(workingCase, 'RESOLVE', {
    timestamp: nowIso,
    reconciliation: {
      reconciliation_type: 'EXPLICIT_CONFIRMATION',
      reconciled_at: nowIso,
      reconciled_by: 'USER_MANUAL',
      resolution_notes: resolutionNotes || 'Rekonsiliasi manual berhasil dikonfirmasi pengguna.'
    }
  });

  if (resolveRes.accepted === false) {
    return {
      success: false,
      gateway_status: 'FAILURE',
      workflow_case: workingCase,
      error_message: resolveRes.reason,
      available_actions: getAvailableActionsForState(workingCase.workflow_state)
    };
  }

  const finalCase = resolveRes.workflow_case;
  gatewayCaseStore.set(finalCase.workflow_case_id, finalCase);

  return {
    success: true,
    gateway_status: 'SUCCESS',
    workflow_case: finalCase,
    available_actions: []
  };
}

/**
 * Cancels a Workflow Case
 */
export function cancelWorkflowCase(
  workflowCase: WorkflowCase,
  options?: { nowTimestamp?: string }
): WorkflowGatewayResponse {
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  const cancelRes = transitionWorkflowCase(workflowCase, 'CANCEL', { timestamp: nowIso });
  if (cancelRes.accepted === false) {
    return {
      success: false,
      gateway_status: 'FAILURE',
      workflow_case: workflowCase,
      error_message: cancelRes.reason,
      available_actions: getAvailableActionsForState(workflowCase.workflow_state)
    };
  }

  const cancelledCase = cancelRes.workflow_case;
  gatewayCaseStore.set(cancelledCase.workflow_case_id, cancelledCase);

  return {
    success: true,
    gateway_status: 'CANCELLED',
    workflow_case: cancelledCase,
    available_actions: []
  };
}
