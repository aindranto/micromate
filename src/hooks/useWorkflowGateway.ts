import { useState, useCallback } from 'react';
import {
  WorkflowCase,
  Asset,
  Reminder,
  WorkflowGatewayRequest,
  WorkflowGatewayResponse,
  GatewayExecutionStatus,
  CoordinatedMutationResult
} from '../types';
import {
  startWorkflowCase,
  executeWorkflowCase,
  retryWorkflowCase,
  reconcileWorkflowCase,
  cancelWorkflowCase
} from '../lib/workflowExecutionGateway';

export interface UseWorkflowGatewayReturn {
  gatewayStatus: GatewayExecutionStatus;
  currentCase: WorkflowCase | null;
  mutationResult: CoordinatedMutationResult | null;
  errorMessage: string | null;
  isProcessing: boolean;
  availableActions: ('EXECUTE' | 'RETRY' | 'RECONCILE' | 'CANCEL')[];
  initCase: (request: WorkflowGatewayRequest, asset: Asset) => WorkflowGatewayResponse;
  executeCase: (
    request: WorkflowGatewayRequest,
    asset: Asset,
    linkedReminder?: Reminder,
    options?: { simulatedFailures?: { primaryFailureMessage?: string; secondaryFailureMessage?: string } }
  ) => WorkflowGatewayResponse;
  retryCurrentCase: (
    asset: Asset,
    linkedReminder?: Reminder,
    options?: { simulatedFailures?: { primaryFailureMessage?: string; secondaryFailureMessage?: string } }
  ) => WorkflowGatewayResponse | null;
  reconcileCurrentCase: (notes?: string) => WorkflowGatewayResponse | null;
  cancelCurrentCase: () => WorkflowGatewayResponse | null;
  resetGateway: () => void;
}

export function useWorkflowGateway(): UseWorkflowGatewayReturn {
  const [gatewayStatus, setGatewayStatus] = useState<GatewayExecutionStatus>('IDLE');
  const [currentCase, setCurrentCase] = useState<WorkflowCase | null>(null);
  const [mutationResult, setMutationResult] = useState<CoordinatedMutationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [availableActions, setAvailableActions] = useState<('EXECUTE' | 'RETRY' | 'RECONCILE' | 'CANCEL')[]>([]);

  const applyResponse = (res: WorkflowGatewayResponse) => {
    setGatewayStatus(res.gateway_status);
    setCurrentCase(res.workflow_case);
    setMutationResult(res.mutation_result || null);
    setErrorMessage(res.error_message || null);
    setAvailableActions(res.available_actions);
    setIsProcessing(res.gateway_status === 'PREPARING' || res.gateway_status === 'EXECUTING');
  };

  const initCase = useCallback((request: WorkflowGatewayRequest, asset: Asset): WorkflowGatewayResponse => {
    setErrorMessage(null);
    const res = startWorkflowCase(request, asset);
    applyResponse(res);
    return res;
  }, []);

  const executeCase = useCallback(
    (
      request: WorkflowGatewayRequest,
      asset: Asset,
      linkedReminder?: Reminder,
      options?: { simulatedFailures?: { primaryFailureMessage?: string; secondaryFailureMessage?: string } }
    ): WorkflowGatewayResponse => {
      setGatewayStatus('EXECUTING');
      setIsProcessing(true);
      setErrorMessage(null);

      const res = executeWorkflowCase(request, asset, linkedReminder, options);
      applyResponse(res);
      return res;
    },
    []
  );

  const retryCurrentCase = useCallback(
    (
      asset: Asset,
      linkedReminder?: Reminder,
      options?: { simulatedFailures?: { primaryFailureMessage?: string; secondaryFailureMessage?: string } }
    ): WorkflowGatewayResponse | null => {
      if (!currentCase) return null;
      setGatewayStatus('EXECUTING');
      setIsProcessing(true);
      setErrorMessage(null);

      const res = retryWorkflowCase(currentCase, asset, linkedReminder, options);
      applyResponse(res);
      return res;
    },
    [currentCase]
  );

  const reconcileCurrentCase = useCallback(
    (notes?: string): WorkflowGatewayResponse | null => {
      if (!currentCase) return null;
      setErrorMessage(null);

      const res = reconcileWorkflowCase(currentCase, notes);
      applyResponse(res);
      return res;
    },
    [currentCase]
  );

  const cancelCurrentCase = useCallback((): WorkflowGatewayResponse | null => {
    if (!currentCase) return null;
    const res = cancelWorkflowCase(currentCase);
    applyResponse(res);
    return res;
  }, [currentCase]);

  const resetGateway = useCallback(() => {
    setGatewayStatus('IDLE');
    setCurrentCase(null);
    setMutationResult(null);
    setErrorMessage(null);
    setIsProcessing(false);
    setAvailableActions([]);
  }, []);

  return {
    gatewayStatus,
    currentCase,
    mutationResult,
    errorMessage,
    isProcessing,
    availableActions,
    initCase,
    executeCase,
    retryCurrentCase,
    reconcileCurrentCase,
    cancelCurrentCase,
    resetGateway
  };
}
