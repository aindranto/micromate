import React, { useState } from 'react';
import { Asset, Reminder, WorkflowGatewayRequest } from '../../types';
import { 
  extractCanonicalSignalsForAsset, 
  resolvePriorityPolicy 
} from '../../lib/attentionSignalEngine';
import { 
  buildAssetAttentionViewModel, 
  buildFleetAttentionDashboardViewModel 
} from '../../lib/attentionPresentationAdapter';
import { computeTCOAnalyticsReport } from '../../lib/tcoAnalyticsEngine';
import { FleetAttentionOverview } from './FleetAttentionOverview';
import { WorkflowExecutionModal } from '../workflow/WorkflowExecutionModal';
import { DocumentRenewalResolverModal } from '../workflow/DocumentRenewalResolverModal';
import { CostTrendReviewModal } from '../workflow/CostTrendReviewModal';
import { useWorkflowGateway } from '../../hooks/useWorkflowGateway';
import { DocumentRenewalEvidence } from '../../types';
import { ShieldCheck, Info } from 'lucide-react';

interface AttentionDashboardPageProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onNavigateTab: (tab: string) => void;
  onEditAsset?: (asset: Asset) => void;
}

/**
 * Phase 3F-5C & Phase 4-5: Attention Dashboard Page Component
 * Pure orchestrator that connects the Canonical Signal Engine, Presentation Adapter,
 * and Workflow Gateway for execution feedback modal.
 */
export const AttentionDashboardPage: React.FC<AttentionDashboardPageProps> = ({
  assets,
  onSelectAsset,
  onNavigateTab,
  onEditAsset
}) => {
  const evalDate = new Date().toISOString().split('T')[0];

  const {
    gatewayStatus,
    currentCase,
    mutationResult,
    errorMessage,
    availableActions,
    executeCase,
    retryCurrentCase,
    reconcileCurrentCase,
    cancelCurrentCase,
    resetGateway
  } = useWorkflowGateway();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [isCostModalOpen, setIsCostModalOpen] = useState(false);
  const [selectedAssetForWorkflow, setSelectedAssetForWorkflow] = useState<Asset | null>(null);
  const [selectedReminderForWorkflow, setSelectedReminderForWorkflow] = useState<Reminder | undefined>(undefined);
  const [activeActionCode, setActiveActionCode] = useState<string>('');
  const [activeTriggerSignalId, setActiveTriggerSignalId] = useState<string | undefined>(undefined);

  // Map each asset to its corresponding ViewModel deterministically
  const assetViewModels = assets.map(asset => {
    // 1. Compute TCO report to get current & previous month costs for trend-based signals
    let tcoSummary = null;
    try {
      const report = computeTCOAnalyticsReport(asset, {
        timeRange: 'ALL',
        referenceDate: new Date(evalDate)
      });
      tcoSummary = report.summary;
    } catch (e) {
      console.warn(`Failed to calculate TCO for asset ${asset.asset_id}:`, e);
    }

    // 2. Extract signals using the pure functional Canonical Signal Engine
    const reminders = asset.reminders || [];
    const maintenance = asset.maintenance_records || [];
    const signals = extractCanonicalSignalsForAsset(asset, reminders, maintenance, tcoSummary, evalDate);

    // 3. Resolve priorities and ceilings
    const resolution = resolvePriorityPolicy(signals, asset.asset_id);

    // 4. Check if facts are available
    const hasFacts = reminders.length > 0 || maintenance.length > 0 || (asset.expenses || []).length > 0;

    // 5. Build presentation-friendly ViewModel
    return buildAssetAttentionViewModel(asset, resolution, hasFacts);
  });

  // Compose the Fleet Dashboard ViewModel
  const dashboardVm = buildFleetAttentionDashboardViewModel(assetViewModels, evalDate);

  // Accessible Action Router mapping abstract ActionCodes to Workflow Gateway executions
  const handleExecuteAction = (actionCode: string, contextData?: Record<string, unknown>) => {
    const assetId = contextData?.asset_id as string;
    const targetAsset = assets.find(a => a.asset_id === assetId) || assets[0];

    if (actionCode === 'COMPLETE_ASSET_PROFILE') {
      if (targetAsset && onEditAsset) {
        onEditAsset(targetAsset);
      } else if (targetAsset) {
        onSelectAsset(targetAsset);
      }
      return;
    }

    if (targetAsset) {
      const sourceRecordId = (contextData?.source_record_id as string) || targetAsset.reminders?.[0]?.reminder_id;
      const linkedReminder = targetAsset.reminders?.find(r => r.reminder_id === sourceRecordId) || targetAsset.reminders?.[0];

      setSelectedAssetForWorkflow(targetAsset);
      setSelectedReminderForWorkflow(linkedReminder);
      setActiveActionCode(actionCode);
      setActiveTriggerSignalId(contextData?.trigger_signal_id as string);

      if (actionCode === 'REVIEW_DOCUMENT_RENEWAL' || actionCode === 'RENEW_DOCUMENT') {
        // PH5-I01: Evidence First - Open Resolver Modal without mutating data immediately
        resetGateway();
        setIsRenewalModalOpen(true);
      } else if (actionCode === 'REVIEW_COST_ANALYTICS' || actionCode === 'REVIEW_EXPENSE') {
        // Mode B: Read-Only Audit Review Modal
        resetGateway();
        setIsCostModalOpen(true);
      } else {
        // Maintenance & standard workflow execution
        const request: WorkflowGatewayRequest = {
          action_code: actionCode,
          asset_id: targetAsset.asset_id,
          source_record_id: sourceRecordId,
          trigger_signal_id: contextData?.trigger_signal_id as string
        };

        executeCase(request, targetAsset, linkedReminder);
        setIsModalOpen(true);
      }
    }
  };

  const handleExecuteRenewalEvidence = (evidence: DocumentRenewalEvidence) => {
    if (!selectedAssetForWorkflow) return;

    const request: WorkflowGatewayRequest = {
      action_code: activeActionCode || 'REVIEW_DOCUMENT_RENEWAL',
      asset_id: selectedAssetForWorkflow.asset_id,
      source_record_id: selectedReminderForWorkflow?.reminder_id,
      trigger_signal_id: activeTriggerSignalId,
      payload: {
        documentEvidence: evidence
      }
    };

    executeCase(request, selectedAssetForWorkflow, selectedReminderForWorkflow);
  };

  const handleAcknowledgeCostTrend = (note: string) => {
    if (!selectedAssetForWorkflow) return;

    const request: WorkflowGatewayRequest = {
      action_code: activeActionCode || 'REVIEW_COST_ANALYTICS',
      asset_id: selectedAssetForWorkflow.asset_id,
      trigger_signal_id: activeTriggerSignalId,
      payload: {
        notes: note
      }
    };

    executeCase(request, selectedAssetForWorkflow);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsRenewalModalOpen(false);
    setIsCostModalOpen(false);
  };

  const handleRetryWorkflow = () => {
    if (selectedAssetForWorkflow) {
      retryCurrentCase(selectedAssetForWorkflow, selectedReminderForWorkflow);
    }
  };

  const handleReconcileWorkflow = (notes?: string) => {
    reconcileCurrentCase(notes);
  };

  const handleCancelWorkflow = () => {
    cancelCurrentCase();
  };

  return (
    <div className="space-y-6 pb-12" data-testid="attention-dashboard-page">
      {/* Informative Header Banner */}
      <div className="bg-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-sm border border-emerald-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Kecerdasan Perhatian (Attention Intelligence)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Pusat Perhatian Armada (Fleet Attention Center)
          </h2>
          <p className="text-emerald-100/90 text-xs sm:text-xs leading-relaxed">
            Sistem menganalisis seluruh data jatuh tempo dokumen, jadwal pemeliharaan terlewat, dan lonjakan biaya operasional secara otomatis untuk memberikan sinyal rekomendasi berbasis bukti transparan.
          </p>
        </div>
        <div className="bg-emerald-900/50 border border-emerald-800 rounded-xl p-3 flex items-start gap-2 max-w-xs shrink-0">
          <Info className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />
          <p className="text-[10px] text-emerald-200 leading-normal">
            <strong>Evidence-Centric:</strong> Rekomendasi dijamin memiliki bukti faktual transparan dari catatan pengingat, servis, atau TCO.
          </p>
        </div>
      </div>

      {/* Composed Fleet Attention Overview UI */}
      <FleetAttentionOverview 
        dashboardVm={dashboardVm} 
        onExecuteAction={handleExecuteAction}
      />

      {/* Workflow Execution Feedback Modal (Maintenance) */}
      <WorkflowExecutionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        gatewayStatus={gatewayStatus}
        workflowCase={currentCase}
        mutationResult={mutationResult}
        errorMessage={errorMessage}
        availableActions={availableActions}
        onRetry={handleRetryWorkflow}
        onReconcile={handleReconcileWorkflow}
        onCancel={handleCancelWorkflow}
      />

      {/* Document Renewal Evidence Resolver Modal */}
      {selectedAssetForWorkflow && (
        <DocumentRenewalResolverModal
          isOpen={isRenewalModalOpen}
          onClose={handleCloseModal}
          asset={selectedAssetForWorkflow}
          reminder={selectedReminderForWorkflow}
          gatewayStatus={gatewayStatus}
          workflowCase={currentCase}
          mutationResult={mutationResult}
          errorMessage={errorMessage}
          availableActions={availableActions}
          onExecute={handleExecuteRenewalEvidence}
          onRetry={handleRetryWorkflow}
          onReconcile={handleReconcileWorkflow}
          onCancel={handleCancelWorkflow}
        />
      )}

      {/* Mode B: Cost Trend Review & Audit Acknowledgement Modal */}
      {selectedAssetForWorkflow && (
        <CostTrendReviewModal
          isOpen={isCostModalOpen}
          onClose={handleCloseModal}
          asset={selectedAssetForWorkflow}
          triggerSignalId={activeTriggerSignalId}
          gatewayStatus={gatewayStatus}
          workflowCase={currentCase}
          onAcknowledge={handleAcknowledgeCostTrend}
        />
      )}
    </div>
  );
};
