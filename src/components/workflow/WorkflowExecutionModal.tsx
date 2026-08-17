import React, { useState } from 'react';
import { 
  GatewayExecutionStatus, 
  WorkflowGatewayResponse, 
  WorkflowCase, 
  CoordinatedMutationResult 
} from '../../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw, 
  ShieldAlert, 
  X, 
  ArrowLeft, 
  Check,
  FileCheck
} from 'lucide-react';

export interface WorkflowExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  gatewayStatus: GatewayExecutionStatus;
  gatewayResponse?: WorkflowGatewayResponse | null;
  workflowCase?: WorkflowCase | null;
  mutationResult?: CoordinatedMutationResult | null;
  errorMessage?: string | null;
  availableActions?: ('EXECUTE' | 'RETRY' | 'RECONCILE' | 'CANCEL')[];
  onRetry?: () => void;
  onReconcile?: (notes?: string) => void;
  onCancel?: () => void;
}

export const WorkflowExecutionModal: React.FC<WorkflowExecutionModalProps> = ({
  isOpen,
  onClose,
  gatewayStatus,
  gatewayResponse,
  workflowCase,
  mutationResult,
  errorMessage,
  availableActions = [],
  onRetry,
  onReconcile,
  onCancel
}) => {
  const [showReconcileConfirm, setShowReconcileConfirm] = useState(false);
  const [reconcileNotes, setReconcileNotes] = useState('');

  if (!isOpen) return null;

  const currentCase = gatewayResponse?.workflow_case || workflowCase;
  const currentMutation = gatewayResponse?.mutation_result || mutationResult;
  const currentError = gatewayResponse?.error_message || errorMessage;

  const handleConfirmReconcile = () => {
    if (onReconcile) {
      onReconcile(reconcileNotes.trim() || 'Manual user explicit reconciliation confirmation.');
    }
    setShowReconcileConfirm(false);
    setReconcileNotes('');
  };

  const handleBackFromReconcile = () => {
    setShowReconcileConfirm(false);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      data-testid="workflow-execution-modal"
    >
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-lg w-full overflow-hidden flex flex-col transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-stone-900">
              Penyelesaian Kasus Aksi
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            data-testid="gateway-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Case Reference Header if case exists */}
          {currentCase && (
            <div className="text-xs font-mono bg-stone-100/70 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between">
              <span className="text-stone-500 font-medium">Kasus #</span>
              <span className="font-bold text-stone-800" data-testid="workflow-case-id">
                {currentCase.workflow_case_id}
              </span>
            </div>
          )}

          {/* Render State Views */}
          {showReconcileConfirm ? (
            /* MANUAL RECONCILIATION CONFIRMATION LAYER */
            <div className="space-y-4" data-testid="reconciliation-confirm-layer">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <h4>Konfirmasi Rekonsiliasi Manual</h4>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Sistem menemukan bahwa sebagian proses sebelumnya telah berhasil. Anda akan mengonfirmasi bahwa data yang tersisa boleh diselesaikan berdasarkan kasus ini.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Catatan Rekonsiliasi (Opsional)
                </label>
                <textarea
                  value={reconcileNotes}
                  onChange={(e) => setReconcileNotes(e.target.value)}
                  placeholder="Contoh: Bukti fisik servis sudah diverifikasi langsung oleh admin..."
                  className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none h-20"
                  data-testid="reconcile-notes-input"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBackFromReconcile}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  data-testid="reconcile-back-btn"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReconcile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  data-testid="reconcile-confirm-btn"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Konfirmasi & Selesaikan</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* PREPARING STATE */}
              {gatewayStatus === 'PREPARING' && (
                <div className="text-center py-6 space-y-3" data-testid="gateway-status-preparing">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <h4 className="text-sm font-bold text-stone-800" data-testid="gateway-status-heading">
                    Menyiapkan penyelesaian...
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Membuka kasus kerja resmi dan memverifikasi batas integritas sebelum mutasi data. Belum ada perubahan data yang disimpan.
                  </p>
                </div>
              )}

              {/* EXECUTING STATE */}
              {gatewayStatus === 'EXECUTING' && (
                <div className="text-center py-6 space-y-3" data-testid="gateway-status-executing">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                  <h4 className="text-sm font-bold text-stone-800" data-testid="gateway-status-heading">
                    Sedang menyelesaikan...
                  </h4>
                  <p className="text-xs text-stone-500 max-w-xs mx-auto">
                    Mengoordinasikan mutasi terintegrasi secara transaksi atomically...
                  </p>
                </div>
              )}

              {/* SUCCESS STATE */}
              {gatewayStatus === 'SUCCESS' && (
                <div className="space-y-4" data-testid="gateway-status-success">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950" data-testid="gateway-status-heading">
                        Berhasil Diselesaikan
                      </h4>
                      <p className="text-xs text-emerald-800">
                        Seluruh mutasi terkoordinasi berhasil dieksekusi dan kasus resmi telah RESOLVED.
                      </p>
                    </div>
                  </div>

                  {/* Facts Breakdown */}
                  <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs">
                    <span className="font-bold text-stone-700 block text-[11px] uppercase tracking-wide">
                      Fakta Mutasi Terverifikasi:
                    </span>
                    {currentMutation?.primary_mutation && (
                      <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Entitas utama ({currentMutation.primary_mutation.entity_type}) tersimpan (ID: {currentMutation.primary_mutation.entity_id})</span>
                      </div>
                    )}
                    {currentMutation?.secondary_mutation && currentMutation.secondary_mutation.status === 'SUCCEEDED' && (
                      <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Entitas sekunder ({currentMutation.secondary_mutation.entity_type}) berhasil diperbarui</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Status kasus pekerjaan beralih ke RESOLVED</span>
                    </div>
                  </div>
                </div>
              )}

              {/* RECONCILIATION_REQUIRED STATE */}
              {gatewayStatus === 'RECONCILIATION_REQUIRED' && (
                <div className="space-y-4" data-testid="gateway-status-reconciliation-required">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                      <h4 data-testid="gateway-status-heading">Penyelesaian Belum Lengkap</h4>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      Sebagian mutasi berhasil disimpan, tetapi sebagian lainnya gagal karena kendala jaringan atau batas sistem.
                    </p>
                  </div>

                  {/* Succeeded vs Failed Operations */}
                  <div className="space-y-2 text-xs border border-stone-200 rounded-xl p-3 bg-stone-50">
                    <span className="font-bold text-stone-700 block text-[11px] uppercase">
                      Status Operasi Kasus:
                    </span>
                    
                    {currentMutation?.primary_mutation.status === 'SUCCEEDED' && (
                      <div className="flex items-center gap-2 text-emerald-800 font-medium" data-testid="outcome-item-success">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Berhasil: {currentMutation.primary_mutation.entity_type} tersimpan</span>
                      </div>
                    )}

                    {currentMutation?.secondary_mutation?.status === 'FAILED' && (
                      <div className="flex items-start gap-2 text-rose-800 font-medium" data-testid="outcome-item-failure">
                        <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span>Belum berhasil: {currentMutation.secondary_mutation.entity_type} gagal diperbarui</span>
                          {currentMutation.secondary_mutation.error_message && (
                            <span className="block text-[10px] text-rose-600 font-mono mt-0.5">
                              ({currentMutation.secondary_mutation.error_message})
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FAILURE STATE */}
              {gatewayStatus === 'FAILURE' && (
                <div className="space-y-4" data-testid="gateway-status-failure">
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
                    <XCircle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-rose-950" data-testid="gateway-status-heading">
                        Penyelesaian Gagal
                      </h4>
                      <p className="text-xs text-rose-800 mt-1">
                        {currentError || 'Terjadi kesalahan sistem saat mengeksekusi mutasi.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* CANCELLED STATE */}
              {gatewayStatus === 'CANCELLED' && (
                <div className="space-y-4" data-testid="gateway-status-cancelled">
                  <div className="p-4 bg-stone-100 border border-stone-200 rounded-xl">
                    <h4 className="text-sm font-bold text-stone-800" data-testid="gateway-status-heading">
                      Penyelesaian Dibatalkan
                    </h4>
                    <p className="text-xs text-stone-600 mt-1 leading-relaxed">
                      Penyelesaian dibatalkan. Tidak ada perubahan lanjutan yang dilakukan pada sistem.
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons Bar */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                {/* Cancel action if allowed */}
                {availableActions.includes('CANCEL') && gatewayStatus !== 'SUCCESS' && gatewayStatus !== 'CANCELLED' && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                    data-testid="gateway-cancel-btn"
                  >
                    Batalkan
                  </button>
                )}

                {/* Reconcile action if RECONCILIATION_REQUIRED */}
                {availableActions.includes('RECONCILE') && (
                  <button
                    type="button"
                    onClick={() => setShowReconcileConfirm(true)}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    data-testid="gateway-reconcile-btn"
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Rekonsiliasi Manual</span>
                  </button>
                )}

                {/* Retry action if available */}
                {availableActions.includes('RETRY') && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                    data-testid="gateway-retry-btn"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Coba Lagi</span>
                  </button>
                )}

                {/* Close button for terminal or completed states */}
                {(gatewayStatus === 'SUCCESS' || gatewayStatus === 'CANCELLED' || (!availableActions.includes('RETRY') && !availableActions.includes('RECONCILE'))) && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    data-testid="gateway-modal-close-btn"
                  >
                    Tutup
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
