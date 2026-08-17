import React, { useState } from 'react';
import { Asset, GatewayExecutionStatus, WorkflowCase } from '../../types';
import { computeTCOAnalyticsReport } from '../../lib/tcoAnalyticsEngine';
import { TrendingUp, CheckCircle2, ShieldCheck, X, FileText, ArrowRight } from 'lucide-react';

interface CostTrendReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  triggerSignalId?: string;
  gatewayStatus: GatewayExecutionStatus;
  workflowCase?: WorkflowCase;
  onAcknowledge: (note: string) => void;
}

export const CostTrendReviewModal: React.FC<CostTrendReviewModalProps> = ({
  isOpen,
  onClose,
  asset,
  gatewayStatus,
  workflowCase,
  onAcknowledge
}) => {
  const [note, setNote] = useState('');

  if (!isOpen) return null;

  // Compute TCO summary for context display
  let tcoSummary = null;
  try {
    const report = computeTCOAnalyticsReport(asset, { timeRange: 'ALL' });
    tcoSummary = report.summary;
  } catch (e) {
    console.warn('Failed to compute TCO summary for review modal:', e);
  }

  const isCompleted = gatewayStatus === 'SUCCESS' || workflowCase?.workflow_state === 'RESOLVED';

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    onAcknowledge(note || 'Peninjauan tren biaya dikonfirmasi pengguna.');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
      data-testid="cost-trend-review-modal"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-amber-950 text-white p-5 flex items-center justify-between border-b border-amber-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-900/60 rounded-xl border border-amber-800 text-amber-300">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                Peninjauan Tren Biaya (Cost Review)
              </h3>
              <p className="text-amber-200/80 text-xs">
                {asset.name} • MODE B: Read-Only Audit
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-amber-900/50 transition-colors"
            data-testid="cost-review-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* TCO Context Card */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs text-amber-900 font-semibold">
              <span>Ringkasan Tren Biaya Operational</span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-mono text-[10px]">
                {asset.asset_code || asset.asset_id}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                <span className="text-stone-500 text-[10px] block">Bulan Lalu</span>
                <span className="font-bold text-stone-800 text-sm">
                  Rp {(tcoSummary?.previous_month_cost || 0).toLocaleString('id-ID')}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                <span className="text-stone-500 text-[10px] block">Bulan Ini</span>
                <span className="font-bold text-amber-700 text-sm">
                  Rp {(tcoSummary?.current_month_cost || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {tcoSummary?.cost_trend_percentage != null && (
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                Peningkatan estimasi: <strong>+{tcoSummary.cost_trend_percentage}%</strong> dibandingkan periode sebelumnya.
              </p>
            )}
          </div>

          {/* Execution State Display */}
          {isCompleted ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2 text-emerald-900">
              <div className="flex items-center gap-2 font-bold text-sm text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Peninjauan Dikonfirmasi & Dicatat dalam Audit Trail</span>
              </div>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Peninjauan tren biaya telah tersimpan secara permanen pada jejak audit tanpa mengubah atau menghapus data transaksi asal.
              </p>
              {workflowCase?.context_data?.user_acknowledgement_note && (
                <div className="mt-2 p-2.5 bg-white border border-emerald-100 rounded-lg text-xs font-mono text-emerald-800">
                  <span className="font-semibold block text-[10px] text-stone-500 font-sans uppercase">Catatan Peninjauan:</span>
                  "{workflowCase.context_data.user_acknowledgement_note}"
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleConfirm} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-stone-500" />
                  Catatan Peninjauan Pengguna (Audit Note)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Contoh: Kenaikan biaya dipicu penggantian 4 buah ban ganda pada tanggal 12..."
                  rows={3}
                  className="w-full text-xs p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none leading-relaxed"
                  data-testid="cost-review-note-input"
                />
              </div>

              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-start gap-2 text-[11px] text-stone-600 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Read-Only Isolation:</strong> Acknowledgment ini mencatat bukti bahwa manusia telah meninjau situasi, tanpa menghapus sinyal 3F atau mengubah laporan TCO.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-stone-600 hover:bg-stone-50 text-xs font-medium transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                  data-testid="cost-review-submit-btn"
                >
                  <span>Konfirmasi Peninjauan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer for completed state */}
        {isCompleted && (
          <div className="bg-stone-50 px-6 py-4 border-t border-stone-200 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs font-semibold transition-colors"
              data-testid="cost-review-done-btn"
            >
              Selesai
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
