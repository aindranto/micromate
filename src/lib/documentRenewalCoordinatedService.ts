import {
  Asset,
  Document,
  Reminder,
  WorkflowCase,
  MutationOutcome,
  DocumentRenewalEvidence,
  DocumentRenewalCoordinatedResult
} from '../types';
import { transitionWorkflowCase } from './workflowStateMachine';
import {
  getRegisteredMutation,
  registerMutationOutcome
} from './coordinatedMutationService';

export interface DocumentRenewalSimulationOptions {
  simulatedFailures?: {
    primaryFailureMessage?: string;
    secondaryArchivalFailureMessage?: string;
    secondaryReminderFailureMessage?: string;
    optionalExpenseFailureMessage?: string;
  };
}

/**
 * Phase 5-1: Coordinated Document Renewal Mutation Handler
 * Executes multi-domain document renewal mutations leveraging Phase 4 infrastructure:
 * 1. Primary: Document Creation (Mandatory)
 * 2. Secondary A: Old Document Archival (Mandatory if previous document exists)
 * 3. Secondary B: Reminder Reconciliation & Next Period Creation (Mandatory)
 * 4. Secondary C: TCO Expense Creation (Optional - does NOT block core RESOLVED status)
 */
export function executeCoordinatedDocumentRenewal(
  workflowCase: WorkflowCase,
  asset: Asset,
  evidence: DocumentRenewalEvidence,
  sourceReminder?: Reminder,
  previousDocument?: Document,
  options?: DocumentRenewalSimulationOptions
): DocumentRenewalCoordinatedResult {
  const operationId = `doc_renew_${workflowCase.workflow_case_id}_${evidence.document_type}`;
  let currentCase = { ...workflowCase };

  // 1. Transition Workflow Case to EXECUTING if currently READY or FAILED
  if (currentCase.workflow_state === 'READY' || currentCase.workflow_state === 'FAILED') {
    const execRes = transitionWorkflowCase(currentCase, 'EXECUTE', {
      timestamp: new Date().toISOString()
    });
    if (execRes.accepted && execRes.workflow_case) {
      currentCase = execRes.workflow_case;
    }
  }

  // Check if primary mutation was previously recorded (for Idempotency)
  const primaryOpKey = `${operationId}:primary`;
  const archivalOpKey = `${operationId}:secondary_archival`;
  const reminderOpKey = `${operationId}:secondary_reminder`;

  const existingPrimaryOutcome = getRegisteredMutation(primaryOpKey);

  // --- STEP 1: PRIMARY MUTATION - Document Creation ---
  let primaryOutcome: MutationOutcome;

  if (existingPrimaryOutcome && existingPrimaryOutcome.status === 'SUCCEEDED') {
    // Re-use existing primary document ID without duplicating creation
    primaryOutcome = { ...existingPrimaryOutcome };
  } else if (options?.simulatedFailures?.primaryFailureMessage) {
    primaryOutcome = {
      operation_id: operationId,
      status: 'FAILED',
      entity_type: 'Document',
      error_message: options.simulatedFailures.primaryFailureMessage,
      completed_at: new Date().toISOString()
    };
  } else {
    const newDocId = `DOC-RENEW-${Date.now().toString().slice(-6)}`;
    primaryOutcome = {
      operation_id: operationId,
      status: 'SUCCEEDED',
      entity_type: 'Document',
      entity_id: newDocId,
      completed_at: new Date().toISOString()
    };
  }

  registerMutationOutcome(primaryOpKey, primaryOutcome);

  // If primary document creation failed, fail fast
  if (primaryOutcome.status === 'FAILED') {
    const failRes = transitionWorkflowCase(currentCase, 'FAIL', {
      failure: {
        failed_step: 'PRIMARY_DOCUMENT_CREATE',
        error_message: primaryOutcome.error_message || 'Primary document creation failed',
        failed_at: new Date().toISOString(),
        attempt_count: 1
      },
      timestamp: new Date().toISOString()
    });
    const failedCase = failRes.accepted && failRes.workflow_case ? failRes.workflow_case : currentCase;

    const secondaryArchivalNotAttempted: MutationOutcome = {
      operation_id: operationId,
      status: 'NOT_ATTEMPTED',
      entity_type: 'Document',
      completed_at: new Date().toISOString()
    };

    const secondaryReminderNotAttempted: MutationOutcome = {
      operation_id: operationId,
      status: 'NOT_ATTEMPTED',
      entity_type: 'Reminder',
      completed_at: new Date().toISOString()
    };

    return {
      primary_document: primaryOutcome,
      secondary_archival: secondaryArchivalNotAttempted,
      secondary_reminder_reconciliation: secondaryReminderNotAttempted,
      overall_status: 'FAILURE',
      reconciliation_required: false,
      updated_workflow_case: failedCase
    };
  }

  // --- STEP 2: SECONDARY MUTATION A (MANDATORY) - Old Document Archival ---
  const existingArchivalOutcome = getRegisteredMutation(archivalOpKey);
  let archivalOutcome: MutationOutcome;

  if (existingArchivalOutcome && existingArchivalOutcome.status === 'SUCCEEDED') {
    archivalOutcome = { ...existingArchivalOutcome };
  } else if (!evidence.previous_document_id && !previousDocument?.document_id) {
    // No previous document to archive
    archivalOutcome = {
      operation_id: operationId,
      status: 'SUCCEEDED',
      entity_type: 'Document',
      completed_at: new Date().toISOString()
    };
  } else if (options?.simulatedFailures?.secondaryArchivalFailureMessage) {
    archivalOutcome = {
      operation_id: operationId,
      status: 'FAILED',
      entity_type: 'Document',
      entity_id: evidence.previous_document_id || previousDocument?.document_id,
      error_message: options.simulatedFailures.secondaryArchivalFailureMessage,
      completed_at: new Date().toISOString()
    };
  } else {
    const targetOldDocId = evidence.previous_document_id || previousDocument?.document_id;
    archivalOutcome = {
      operation_id: operationId,
      status: 'SUCCEEDED',
      entity_type: 'Document',
      entity_id: targetOldDocId,
      completed_at: new Date().toISOString()
    };
  }

  registerMutationOutcome(archivalOpKey, archivalOutcome);

  // --- STEP 3: SECONDARY MUTATION B (MANDATORY) - Reminder Reconciliation & Next Period Creation ---
  const existingReminderOutcome = getRegisteredMutation(reminderOpKey);
  let reminderOutcome: MutationOutcome;

  if (existingReminderOutcome && existingReminderOutcome.status === 'SUCCEEDED') {
    reminderOutcome = { ...existingReminderOutcome };
  } else if (options?.simulatedFailures?.secondaryReminderFailureMessage) {
    reminderOutcome = {
      operation_id: operationId,
      status: 'FAILED',
      entity_type: 'Reminder',
      entity_id: sourceReminder?.reminder_id,
      error_message: options.simulatedFailures.secondaryReminderFailureMessage,
      completed_at: new Date().toISOString()
    };
  } else {
    reminderOutcome = {
      operation_id: operationId,
      status: 'SUCCEEDED',
      entity_type: 'Reminder',
      entity_id: sourceReminder?.reminder_id || 'REM-GENERIC',
      completed_at: new Date().toISOString()
    };
  }

  registerMutationOutcome(reminderOpKey, reminderOutcome);

  // --- STEP 4: SECONDARY MUTATION C (OPTIONAL) - TCO Expense Creation ---
  let optionalExpenseOutcome: MutationOutcome | undefined = undefined;

  if (evidence.renewal_cost && evidence.renewal_cost > 0) {
    if (options?.simulatedFailures?.optionalExpenseFailureMessage) {
      optionalExpenseOutcome = {
        operation_id: operationId,
        status: 'FAILED',
        entity_type: 'Expense',
        error_message: options.simulatedFailures.optionalExpenseFailureMessage,
        completed_at: new Date().toISOString()
      };
    } else {
      optionalExpenseOutcome = {
        operation_id: operationId,
        status: 'SUCCEEDED',
        entity_type: 'Expense',
        entity_id: `EXP-TAX-${Date.now().toString().slice(-6)}`,
        completed_at: new Date().toISOString()
      };
    }
  }

  // Evaluate Core Mandatory Success (Primary + Archival + Reminder)
  const isMandatorySuccess =
    primaryOutcome.status === 'SUCCEEDED' &&
    archivalOutcome.status === 'SUCCEEDED' &&
    reminderOutcome.status === 'SUCCEEDED';

  if (isMandatorySuccess) {
    // Note: Optional Expense failure does NOT block RESOLVED
    const compRes = transitionWorkflowCase(currentCase, 'COMPLETE', {
      timestamp: new Date().toISOString()
    });
    if (compRes.accepted && compRes.workflow_case) {
      currentCase = compRes.workflow_case;
    }

    const resRes = transitionWorkflowCase(currentCase, 'RESOLVE', {
      reconciliation: {
        reconciliation_type: 'EXPLICIT_CONFIRMATION',
        notes: `Document renewal coordinated mutation resolved successfully for ${evidence.document_type}`
      },
      timestamp: new Date().toISOString()
    });
    if (resRes.accepted && resRes.workflow_case) {
      currentCase = resRes.workflow_case;
    }

    return {
      primary_document: primaryOutcome,
      secondary_archival: archivalOutcome,
      secondary_reminder_reconciliation: reminderOutcome,
      optional_expense: optionalExpenseOutcome,
      overall_status: 'SUCCESS',
      reconciliation_required: false,
      updated_workflow_case: currentCase
    };
  } else {
    // Partial Failure on Mandatory Secondary Operations
    const partRes = transitionWorkflowCase(currentCase, 'PARTIAL_FAILURE', {
      failure: {
        failed_step: 'SECONDARY_MANDATORY_MUTATION',
        error_message: 'Secondary mandatory mutation failed',
        failed_at: new Date().toISOString(),
        attempt_count: 1
      },
      timestamp: new Date().toISOString()
    });
    if (partRes.accepted && partRes.workflow_case) {
      currentCase = partRes.workflow_case;
    }

    const recRes = transitionWorkflowCase(currentCase, 'RECONCILE', {
      timestamp: new Date().toISOString()
    });
    if (recRes.accepted && recRes.workflow_case) {
      currentCase = recRes.workflow_case;
    }

    return {
      primary_document: primaryOutcome,
      secondary_archival: archivalOutcome,
      secondary_reminder_reconciliation: reminderOutcome,
      optional_expense: optionalExpenseOutcome,
      overall_status: 'PARTIAL_FAILURE',
      reconciliation_required: true,
      updated_workflow_case: currentCase
    };
  }
}
