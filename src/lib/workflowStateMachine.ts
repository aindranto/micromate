import {
  WorkflowCase,
  WorkflowEvent,
  WorkflowState,
  WorkflowTransitionPayload,
  WorkflowTransitionResult
} from '../types';

/**
 * Phase 4-2: Workflow State Machine Engine
 * 
 * Strict Pure State Machine Authority for WorkflowCase Lifecycle.
 * - Pure function: Zero side-effects, zero mutations to input objects.
 * - Strict transition matrix driven by explicit domain WorkflowEvents.
 * - Enforces terminal state protections and failure recovery paths.
 */

// Transition Matrix Mapping: Current State -> Event -> Next State
const TRANSITION_MATRIX: Partial<Record<WorkflowState, Partial<Record<WorkflowEvent, WorkflowState>>>> = {
  DRAFT: {
    PREPARE: 'READY',
    CANCEL: 'CANCELLED'
  },
  READY: {
    EXECUTE: 'EXECUTING',
    CANCEL: 'CANCELLED'
  },
  EXECUTING: {
    COMPLETE: 'COMPLETED',
    PARTIAL_FAILURE: 'PARTIALLY_COMPLETED',
    FAIL: 'FAILED'
  },
  COMPLETED: {
    RESOLVE: 'RESOLVED'
  },
  PARTIALLY_COMPLETED: {
    RECONCILE: 'RECONCILIATION_REQUIRED'
  },
  RECONCILIATION_REQUIRED: {
    RESOLVE: 'RESOLVED',
    RETRY: 'EXECUTING',
    CANCEL: 'CANCELLED'
  },
  FAILED: {
    RETRY: 'EXECUTING',
    RECONCILE: 'RECONCILIATION_REQUIRED',
    CANCEL: 'CANCELLED'
  }
};

const TERMINAL_STATES: ReadonlySet<WorkflowState> = new Set(['RESOLVED', 'CANCELLED']);

/**
 * Evaluates whether a transition is allowed from a given state for a given event.
 */
export function canTransition(currentState: WorkflowState, event: WorkflowEvent): boolean {
  if (TERMINAL_STATES.has(currentState)) {
    return false;
  }
  return Boolean(TRANSITION_MATRIX[currentState]?.[event]);
}

/**
 * Pure state machine transition handler.
 * Given a WorkflowCase, a WorkflowEvent, and an optional payload,
 * returns a WorkflowTransitionResult without mutating the input case.
 */
export function transitionWorkflowCase(
  workflowCase: Readonly<WorkflowCase>,
  event: WorkflowEvent,
  payload?: WorkflowTransitionPayload
): WorkflowTransitionResult {
  const currentState = workflowCase.workflow_state;

  // 1. Terminal State Protection
  if (TERMINAL_STATES.has(currentState)) {
    return {
      accepted: false,
      previous_state: currentState,
      attempted_event: event,
      reason: `Terminal state '${currentState}' cannot accept any events.`
    };
  }

  // 2. Matrix Validation
  const nextState = TRANSITION_MATRIX[currentState]?.[event];
  if (!nextState) {
    return {
      accepted: false,
      previous_state: currentState,
      attempted_event: event,
      reason: `Illegal transition: Event '${event}' is not valid for state '${currentState}'.`
    };
  }

  // 3. Construct new immutable WorkflowCase
  const now = payload?.timestamp || new Date().toISOString();

  const newContextData = payload?.context_data
    ? { ...workflowCase.context_data, ...payload.context_data }
    : workflowCase.context_data ? { ...workflowCase.context_data } : undefined;

  const updatedCase: WorkflowCase = {
    ...workflowCase,
    workflow_state: nextState,
    updated_at: now,
    ...(newContextData ? { context_data: newContextData } : {}),
    ...(payload?.failure ? { failure: { ...payload.failure } } : workflowCase.failure ? { failure: { ...workflowCase.failure } } : {}),
    ...(payload?.reconciliation ? { reconciliation: { ...payload.reconciliation } } : workflowCase.reconciliation ? { reconciliation: { ...workflowCase.reconciliation } } : {})
  };

  return {
    accepted: true,
    previous_state: currentState,
    next_state: nextState,
    workflow_case: updatedCase
  };
}
