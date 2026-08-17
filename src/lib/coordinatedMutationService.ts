import {
  WorkflowCase,
  MutationOutcome,
  CoordinatedMutationResult,
  Asset,
  Reminder,
  MaintenanceRecord,
  Expense,
  AssetHistoryEvent
} from '../types';
import { transitionWorkflowCase } from './workflowStateMachine';
import {
  executeRecordServiceTransaction,
  CreateMaintenanceInput,
  MaintenanceAtomicTransactionResult
} from './maintenanceDomain';
import { completeReminderState } from './reminderDomain';

/**
 * PHASE 4-3: COORDINATED MUTATION & CROSS-DOMAIN RECONCILER
 * 
 * Invariants:
 * 1. Honest State Reporting: Primary & Secondary mutations tracked individually.
 * 2. No Fake Rollbacks: If Primary succeeds and Secondary fails, workflow transitions
 *    to PARTIALLY_COMPLETED and RECONCILIATION_REQUIRED. Primary state remains committed.
 * 3. Idempotency Protection: Deterministic mutation IDs prevent duplicate record creations on retries.
 * 4. Evidence Linkage: Secondary mutation only targets explicit linked_reminder_id from context.
 * 5. Strict Read-Only 3F Boundary: No changes to 3F Attention Engine or ViewModel.
 */

export interface ExecuteCoordinatedMaintenanceInput {
  workflowCase: Readonly<WorkflowCase>;
  asset: Asset;
  maintenanceInput: CreateMaintenanceInput;
  linkedReminder?: Reminder;
  options?: {
    nowTimestamp?: string;
    // Options for simulating network/persistence failures in adversarial tests
    simulatedFailures?: {
      primaryFailureMessage?: string;
      secondaryFailureMessage?: string;
    };
  };
}

export interface CoordinatedMutationExecutionDetails {
  result: CoordinatedMutationResult;
  maintenanceTransactionResult?: MaintenanceAtomicTransactionResult;
  updatedReminder?: Reminder;
}

// In-Memory Idempotency Cache for mutation outcomes
const mutationOutcomeRegistry = new Map<string, MutationOutcome>();
const maintenanceResultRegistry = new Map<string, MaintenanceAtomicTransactionResult>();

/**
 * Clears the idempotency cache (used for test isolation)
 */
export function clearMutationRegistry(): void {
  mutationOutcomeRegistry.clear();
  maintenanceResultRegistry.clear();
}

/**
 * Retrieves cached mutation outcome if previously executed
 */
export function getCachedMutationOutcome(operationId: string): MutationOutcome | undefined {
  return mutationOutcomeRegistry.get(operationId);
}

export const getRegisteredMutation = getCachedMutationOutcome;

/**
 * Registers or updates a mutation outcome in the cache
 */
export function registerMutationOutcome(operationId: string, outcome: MutationOutcome): void {
  mutationOutcomeRegistry.set(operationId, outcome);
}


/**
 * Generates deterministic mutation operation IDs
 */
export function generateMutationOperationIds(workflowCaseId: string) {
  return {
    primaryOpId: `${workflowCaseId}:MAINTENANCE_CREATE`,
    secondaryOpId: `${workflowCaseId}:REMINDER_COMPLETE`
  };
}

/**
 * Primary Orchestrator for Maintenance Overdue Closure (Case 01)
 */
export function executeCoordinatedMaintenanceClosure(
  input: ExecuteCoordinatedMaintenanceInput
): CoordinatedMutationExecutionDetails {
  const { workflowCase, asset, maintenanceInput, linkedReminder, options } = input;
  const nowIso = options?.nowTimestamp || new Date().toISOString();
  const { primaryOpId, secondaryOpId } = generateMutationOperationIds(workflowCase.workflow_case_id);

  let currentCase: WorkflowCase = { ...workflowCase };

  // Step 1: Ensure Workflow is in READY or EXECUTING
  if (currentCase.workflow_state === 'DRAFT') {
    const prepRes = transitionWorkflowCase(currentCase, 'PREPARE', { timestamp: nowIso });
    if (prepRes.accepted === false) {
      throw new Error(`Failed to prepare workflow case: ${prepRes.reason}`);
    }
    currentCase = prepRes.workflow_case;
  }

  // Determine transition event to enter EXECUTING
  const transitionEvent = (currentCase.workflow_state === 'RECONCILIATION_REQUIRED' || currentCase.workflow_state === 'FAILED')
    ? 'RETRY'
    : 'EXECUTE';

  const execRes = transitionWorkflowCase(currentCase, transitionEvent, { timestamp: nowIso });
  if (execRes.accepted === false) {
    throw new Error(`Failed to enter EXECUTING state: ${execRes.reason}`);
  }
  currentCase = execRes.workflow_case;

  // Step 2: Primary Mutation - Create MaintenanceRecord
  let primaryOutcome = mutationOutcomeRegistry.get(primaryOpId);
  let maintenanceTxResult: MaintenanceAtomicTransactionResult | undefined = maintenanceResultRegistry.get(primaryOpId);

  if (!primaryOutcome || primaryOutcome.status !== 'SUCCEEDED') {
    if (options?.simulatedFailures?.primaryFailureMessage) {
      // Primary Mutation Failure (e.g. database down, validation error)
      primaryOutcome = {
        operation_id: primaryOpId,
        status: 'FAILED',
        entity_type: 'MaintenanceRecord',
        error_message: options.simulatedFailures.primaryFailureMessage,
        completed_at: nowIso
      };
      mutationOutcomeRegistry.set(primaryOpId, primaryOutcome);

      // Secondary is NOT ATTEMPTED
      const secondaryOutcome: MutationOutcome = {
        operation_id: secondaryOpId,
        status: 'NOT_ATTEMPTED',
        entity_type: 'Reminder'
      };

      const failRes = transitionWorkflowCase(currentCase, 'FAIL', {
        timestamp: nowIso,
        failure: {
          failed_step: 'PRIMARY_MAINTENANCE_MUTATION',
          error_message: options.simulatedFailures.primaryFailureMessage,
          failed_at: nowIso,
          attempt_count: 1
        }
      });

      if (failRes.accepted) {
        currentCase = failRes.workflow_case;
      }

      return {
        result: {
          workflow_case_id: workflowCase.workflow_case_id,
          primary_mutation: primaryOutcome,
          secondary_mutation: secondaryOutcome,
          overall_status: 'FAILURE',
          reconciliation_required: true,
          updated_workflow_case: currentCase
        }
      };
    }

    // Execute actual primary domain transaction
    try {
      maintenanceTxResult = executeRecordServiceTransaction(asset, maintenanceInput, {
        nowTimestamp: nowIso
      });
      maintenanceResultRegistry.set(primaryOpId, maintenanceTxResult);

      primaryOutcome = {
        operation_id: primaryOpId,
        status: 'SUCCEEDED',
        entity_type: 'MaintenanceRecord',
        entity_id: maintenanceTxResult.maintenanceRecord.maintenance_id,
        completed_at: nowIso
      };
      mutationOutcomeRegistry.set(primaryOpId, primaryOutcome);
    } catch (err: any) {
      primaryOutcome = {
        operation_id: primaryOpId,
        status: 'FAILED',
        entity_type: 'MaintenanceRecord',
        error_message: err.message || 'Error executing primary maintenance transaction',
        completed_at: nowIso
      };
      mutationOutcomeRegistry.set(primaryOpId, primaryOutcome);

      const secondaryOutcome: MutationOutcome = {
        operation_id: secondaryOpId,
        status: 'NOT_ATTEMPTED',
        entity_type: 'Reminder'
      };

      const failRes = transitionWorkflowCase(currentCase, 'FAIL', {
        timestamp: nowIso,
        failure: {
          failed_step: 'PRIMARY_MAINTENANCE_MUTATION',
          error_message: primaryOutcome.error_message || 'Primary mutation failed',
          failed_at: nowIso,
          attempt_count: 1
        }
      });

      if (failRes.accepted) {
        currentCase = failRes.workflow_case;
      }

      return {
        result: {
          workflow_case_id: workflowCase.workflow_case_id,
          primary_mutation: primaryOutcome,
          secondary_mutation: secondaryOutcome,
          overall_status: 'FAILURE',
          reconciliation_required: true,
          updated_workflow_case: currentCase
        }
      };
    }
  }

  // Update context data with linked maintenance ID
  if (primaryOutcome.entity_id) {
    currentCase = {
      ...currentCase,
      context_data: {
        ...currentCase.context_data,
        linked_maintenance_id: primaryOutcome.entity_id
      }
    };
  }

  // Step 3: Secondary Mutation - Update Linked Reminder
  let secondaryOutcome: MutationOutcome;
  let updatedReminder: Reminder | undefined = undefined;

  const linkedReminderIdInContext = currentCase.context_data?.linked_reminder_id;

  if (!linkedReminder || !linkedReminderIdInContext || linkedReminder.reminder_id !== linkedReminderIdInContext) {
    // Unlinked maintenance or no matching linked reminder -> Secondary is NOT ATTEMPTED
    secondaryOutcome = {
      operation_id: secondaryOpId,
      status: 'NOT_ATTEMPTED',
      entity_type: 'Reminder'
    };

    // Primary succeeded, no secondary needed -> COMPLETED -> RESOLVED
    const compRes = transitionWorkflowCase(currentCase, 'COMPLETE', { timestamp: nowIso });
    if (compRes.accepted) {
      currentCase = compRes.workflow_case;
    }
    const resRes = transitionWorkflowCase(currentCase, 'RESOLVE', { timestamp: nowIso });
    if (resRes.accepted) {
      currentCase = resRes.workflow_case;
    }

    return {
      result: {
        workflow_case_id: workflowCase.workflow_case_id,
        primary_mutation: primaryOutcome,
        secondary_mutation: secondaryOutcome,
        overall_status: 'SUCCESS',
        reconciliation_required: false,
        updated_workflow_case: currentCase
      },
      maintenanceTransactionResult: maintenanceTxResult
    };
  }

  // Linked Reminder exists -> Attempt Secondary Mutation
  const cachedSecondary = mutationOutcomeRegistry.get(secondaryOpId);
  if (cachedSecondary && cachedSecondary.status === 'SUCCEEDED') {
    secondaryOutcome = cachedSecondary;
  } else if (options?.simulatedFailures?.secondaryFailureMessage) {
    // Secondary Mutation Failure (e.g. timeout on reminder status update)
    secondaryOutcome = {
      operation_id: secondaryOpId,
      status: 'FAILED',
      entity_type: 'Reminder',
      entity_id: linkedReminder.reminder_id,
      error_message: options.simulatedFailures.secondaryFailureMessage,
      completed_at: nowIso
    };
    mutationOutcomeRegistry.set(secondaryOpId, secondaryOutcome);

    // Transition EXECUTING -> PARTIALLY_COMPLETED via PARTIAL_FAILURE
    const partRes = transitionWorkflowCase(currentCase, 'PARTIAL_FAILURE', {
      timestamp: nowIso,
      failure: {
        failed_step: 'SECONDARY_REMINDER_MUTATION',
        error_message: options.simulatedFailures.secondaryFailureMessage,
        failed_at: nowIso,
        attempt_count: 1
      },
      context_data: {
        partial_failure_logs: [options.simulatedFailures.secondaryFailureMessage]
      }
    });

    if (partRes.accepted) {
      currentCase = partRes.workflow_case;
    }

    // Transition PARTIALLY_COMPLETED -> RECONCILIATION_REQUIRED via RECONCILE
    const reconRes = transitionWorkflowCase(currentCase, 'RECONCILE', { timestamp: nowIso });
    if (reconRes.accepted) {
      currentCase = reconRes.workflow_case;
    }

    return {
      result: {
        workflow_case_id: workflowCase.workflow_case_id,
        primary_mutation: primaryOutcome,
        secondary_mutation: secondaryOutcome,
        overall_status: 'PARTIAL_FAILURE',
        reconciliation_required: true,
        updated_workflow_case: currentCase
      },
      maintenanceTransactionResult: maintenanceTxResult
    };
  } else {
    // Perform Secondary Mutation
    try {
      const completionResult = completeReminderState(linkedReminder, {
        nowTimestamp: nowIso
      });
      updatedReminder = completionResult.updatedReminder;

      secondaryOutcome = {
        operation_id: secondaryOpId,
        status: 'SUCCEEDED',
        entity_type: 'Reminder',
        entity_id: updatedReminder.reminder_id,
        completed_at: nowIso
      };
      mutationOutcomeRegistry.set(secondaryOpId, secondaryOutcome);
    } catch (err: any) {
      secondaryOutcome = {
        operation_id: secondaryOpId,
        status: 'FAILED',
        entity_type: 'Reminder',
        entity_id: linkedReminder.reminder_id,
        error_message: err.message || 'Error updating linked reminder',
        completed_at: nowIso
      };
      mutationOutcomeRegistry.set(secondaryOpId, secondaryOutcome);

      const partRes = transitionWorkflowCase(currentCase, 'PARTIAL_FAILURE', {
        timestamp: nowIso,
        failure: {
          failed_step: 'SECONDARY_REMINDER_MUTATION',
          error_message: secondaryOutcome.error_message || 'Secondary mutation failed',
          failed_at: nowIso,
          attempt_count: 1
        }
      });
      if (partRes.accepted) {
        currentCase = partRes.workflow_case;
      }

      const reconRes = transitionWorkflowCase(currentCase, 'RECONCILE', { timestamp: nowIso });
      if (reconRes.accepted) {
        currentCase = reconRes.workflow_case;
      }

      return {
        result: {
          workflow_case_id: workflowCase.workflow_case_id,
          primary_mutation: primaryOutcome,
          secondary_mutation: secondaryOutcome,
          overall_status: 'PARTIAL_FAILURE',
          reconciliation_required: true,
          updated_workflow_case: currentCase
        },
        maintenanceTransactionResult: maintenanceTxResult
      };
    }
  }

  // Both Primary and Secondary Succeeded -> Transition to COMPLETED then RESOLVED
  const compRes = transitionWorkflowCase(currentCase, 'COMPLETE', { timestamp: nowIso });
  if (compRes.accepted) {
    currentCase = compRes.workflow_case;
  }
  const resRes = transitionWorkflowCase(currentCase, 'RESOLVE', { timestamp: nowIso });
  if (resRes.accepted) {
    currentCase = resRes.workflow_case;
  }

  return {
    result: {
      workflow_case_id: workflowCase.workflow_case_id,
      primary_mutation: primaryOutcome,
      secondary_mutation: secondaryOutcome,
      overall_status: 'SUCCESS',
      reconciliation_required: false,
      updated_workflow_case: currentCase
    },
    maintenanceTransactionResult: maintenanceTxResult,
    updatedReminder
  };
}
