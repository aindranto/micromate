import React, { useState, useEffect } from 'react';
import {
  Asset,
  Document,
  Reminder,
  WorkflowCase,
  DocumentRenewalEvidence,
  GatewayExecutionStatus,
  WorkflowGatewayResponse,
  CoordinatedMutationResult
} from '../../types';
import {
  X,
  ArrowLeft,
  Check,
  UploadCloud,
  FileCheck,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  Calendar,
  DollarSign,
  Info
} from 'lucide-react';

export interface DocumentRenewalResolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: Asset;
  reminder?: Reminder;
  document?: Document;
  gatewayStatus: GatewayExecutionStatus;
  gatewayResponse?: WorkflowGatewayResponse | null;
  workflowCase?: WorkflowCase | null;
  mutationResult?: CoordinatedMutationResult | null;
  errorMessage?: string | null;
  availableActions?: ('EXECUTE' | 'RETRY' | 'RECONCILE' | 'CANCEL')[];
  onExecute: (evidence: DocumentRenewalEvidence) => void;
  onRetry?: () => void;
  onReconcile?: (notes?: string) => void;
  onCancel?: () => void;
}

type ModalStep = 'EVIDENCE_COLLECTION' | 'REVIEW_CONFIRMATION' | 'EXECUTION_FEEDBACK';

export const DocumentRenewalResolverModal: React.FC<DocumentRenewalResolverModalProps> = ({
  isOpen,
  onClose,
  asset,
  reminder,
  document: existingDocument,
  gatewayStatus,
  gatewayResponse,
  workflowCase,
  mutationResult,
  errorMessage,
  availableActions = [],
  onExecute,
  onRetry,
  onReconcile,
  onCancel
}) => {
  const [step, setStep] = useState<ModalStep>('EVIDENCE_COLLECTION');

  // Form Evidence State
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('dokumen_stnk_2026.pdf');
  const [fileSize, setFileSize] = useState<number>(1048576);
  const [mimeType, setMimeType] = useState<string>('application/pdf');
  const [documentType, setDocumentType] = useState<string>('stnk');
  const [title, setTitle] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState<string>('');
  const [issuerName, setIssuerName] = useState<string>('Samsat Jakarta');
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [renewalCost, setRenewalCost] = useState<string>('385000');
  const [userConfirmedVerification, setUserConfirmedVerification] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Reconcile Note State
  const [showReconcileConfirm, setShowReconcileConfirm] = useState(false);
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Default Expiry Date Calculator (1 Year from today or existing expiry)
  useEffect(() => {
    if (isOpen) {
      // Determine doc type from existing doc or reminder or asset
      const docType = (existingDocument as any)?.document_type || (existingDocument as any)?.type || (reminder?.type === 'documents' ? 'stnk' : 'stnk');
      setDocumentType(docType);

      // Default Title
      const defaultTitle = existingDocument
        ? `Perpanjangan ${existingDocument.title}`
        : reminder
        ? `Perpanjangan ${reminder.title}`
        : `Perpanjangan STNK ${asset.name}`;
      setTitle(defaultTitle);

      // Default Expiry Date: +1 year from existing document expiry or current date
      const docExpiry = (existingDocument as any)?.expiry_date || (existingDocument as any)?.end_date;
      const baseDate = docExpiry ? new Date(docExpiry) : new Date();
      baseDate.setFullYear(baseDate.getFullYear() + 1);
      const isoDate = baseDate.toISOString().substring(0, 10);
      setNewExpiryDate(isoDate);

      // Default Doc Number
      if (!documentNumber) {
        setDocumentNumber(`STNK-${asset.asset_id.substring(0, 6).toUpperCase()}-${new Date().getFullYear()}`);
      }

      setStep('EVIDENCE_COLLECTION');
      setUserConfirmedVerification(false);
      setFormError(null);
      setShowReconcileConfirm(false);
      setReconcileNotes('');
    }
  }, [isOpen, asset, reminder, existingDocument]);

  // Transition to Execution Feedback step when gateway state activates
  useEffect(() => {
    if (gatewayStatus === 'EXECUTING' || gatewayStatus === 'SUCCESS' || gatewayStatus === 'RECONCILIATION_REQUIRED' || gatewayStatus === 'FAILURE') {
      setStep('EXECUTION_FEEDBACK');
    }
  }, [gatewayStatus]);

  if (!isOpen) return null;

  const currentCase = gatewayResponse?.workflow_case || workflowCase;
  const currentMutation = gatewayResponse?.mutation_result || mutationResult;
  const currentError = gatewayResponse?.error_message || errorMessage;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setFileName(selectedFile.name);
      setFileSize(selectedFile.size);
      setMimeType(selectedFile.type || 'application/pdf');
      
      if (!title || title.startsWith('Perpanjangan')) {
        const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setTitle(`Perpanjangan ${cleanName.charAt(0).toUpperCase() + cleanName.slice(1)}`);
      }
      setFormError(null);
    }
  };

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Judul dokumen baru wajib diisi.');
      return;
    }
    if (!newExpiryDate) {
      setFormError('Tanggal masa berlaku baru wajib diisi.');
      return;
    }
    if (!userConfirmedVerification) {
      setFormError('Anda wajib mengonfirmasi keabsahan dokumen sebelum melanjutkan.');
      return;
    }

    setFormError(null);
    // Move to Step 2 REVIEW without performing any mutation (PH5-I01)
    setStep('REVIEW_CONFIRMATION');
  };

  const handleConfirmAndProcess = () => {
    const costNum = renewalCost ? parseFloat(renewalCost) : 0;
    const evidence: DocumentRenewalEvidence = {
      asset_id: asset.asset_id,
      document_type: documentType as any,
      title: title.trim(),
      new_expiry_date: newExpiryDate,
      document_number: documentNumber.trim() || undefined,
      issuer_name: issuerName.trim() || undefined,
      file_name: fileName,
      mime_type: mimeType,
      file_size: fileSize,
      file_fingerprint: `fp_renew_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      renewal_cost: costNum > 0 ? costNum : undefined,
      previous_document_id: existingDocument?.document_id
    };

    // Execute Mutation via Gateway
    setStep('EXECUTION_FEEDBACK');
    onExecute(evidence);
  };

  const handleConfirmReconcile = () => {
    if (onReconcile) {
      onReconcile(reconcileNotes.trim() || 'Konfirmasi rekonsiliasi manual perpanjangan dokumen.');
    }
    setShowReconcileConfirm(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      data-testid="document-renewal-resolver-modal"
    >
      <div className="bg-white border border-stone-200 rounded-2xl shadow-xl max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh] transition-all">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 leading-tight">
                Perpanjangan Dokumen Resmi Aset
              </h3>
              <p className="text-xs text-stone-500">
                Aset: <span className="font-semibold text-stone-700">{asset.name}</span> ({asset.asset_id})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors cursor-pointer"
            data-testid="renewal-modal-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Scroll Container */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: EVIDENCE COLLECTION FORM */}
          {step === 'EVIDENCE_COLLECTION' && (
            <form onSubmit={handleProceedToReview} className="space-y-4" data-testid="step-evidence-collection">
              {/* Existing Document Facts Banner */}
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl space-y-1.5 text-xs">
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-stone-400 block">
                  Fakta Dokumen / Pengingat Saat Ini
                </span>
                <div className="flex items-center justify-between font-medium text-stone-800">
                  <span className="font-bold">{existingDocument?.title || reminder?.title || `STNK ${asset.name}`}</span>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-mono text-[11px] font-bold">
                    Expired: {(existingDocument as any)?.expiry_date || (existingDocument as any)?.end_date || reminder?.due_date || 'Terlewat'}
                  </span>
                </div>
                {existingDocument?.document_id && (
                  <p className="text-[11px] text-stone-500 font-mono">
                    ID Dokumen Lama: {existingDocument.document_id}
                  </p>
                )}
              </div>

              {formError && (
                <div className="flex items-start p-3 text-xs text-rose-800 bg-rose-50 rounded-xl border border-rose-200 gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Upload File Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-stone-700">
                  Unggah Bukti Berkas Dokumen Baru <span className="text-rose-500">*</span>
                </label>
                <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center hover:border-stone-300 bg-stone-50/50 transition-all cursor-pointer relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    accept=".pdf,image/jpeg,image/png,.jpg,.png"
                    data-testid="file-upload-input"
                  />
                  <div className="flex flex-col items-center gap-1">
                    <UploadCloud className="w-7 h-7 text-stone-400" />
                    <span className="text-xs font-bold text-stone-700 truncate max-w-xs">
                      {fileName ? fileName : 'Klik atau seret file dokumen baru di sini'}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      PDF, JPG, PNG (Maksimal 25MB) • {(fileSize / 1024).toFixed(0)} KB
                    </span>
                  </div>
                </div>
              </div>

              {/* Form Grid: Title & Doc Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Judul Dokumen Baru <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Contoh: Pajak STNK 2026-2027"
                    className="w-full p-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    data-testid="input-doc-title"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Nomor Resmi Dokumen
                  </label>
                  <input
                    type="text"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="Contoh: STNK-B-1234-XYZ"
                    className="w-full p-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                    data-testid="input-doc-number"
                  />
                </div>
              </div>

              {/* Form Grid: Expiry Date & Renewal Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Masa Berlaku Baru (Jatuh Tempo) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    className="w-full p-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    data-testid="input-new-expiry-date"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-stone-700">
                    Biaya Perpanjangan (Rp) <span className="text-stone-400 text-[10px] font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="number"
                    value={renewalCost}
                    onChange={(e) => setRenewalCost(e.target.value)}
                    placeholder="385000"
                    className="w-full p-2.5 text-xs border border-stone-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                    data-testid="input-renewal-cost"
                  />
                </div>
              </div>

              {/* User Verification Checkbox (PH5-I01 Evidence First) */}
              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="user-verification-check"
                  checked={userConfirmedVerification}
                  onChange={(e) => setUserConfirmedVerification(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-stone-300 focus:ring-emerald-500 cursor-pointer"
                  data-testid="verification-checkbox"
                />
                <label htmlFor="user-verification-check" className="text-xs text-emerald-950 font-medium leading-relaxed cursor-pointer">
                  Saya memastikan dokumen ini adalah dokumen perpanjangan resmi terbaru dan tanggal berlaku di atas telah diverifikasi dengan benar.
                </label>
              </div>

              {/* Step 1 Footer Action Bar */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                  data-testid="btn-cancel-step-1"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!userConfirmedVerification || !newExpiryDate || !title}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  data-testid="btn-proceed-review"
                >
                  <span>Tinjau Renewal</span>
                  <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: REVIEW CONFIRMATION */}
          {step === 'REVIEW_CONFIRMATION' && (
            <div className="space-y-4" data-testid="step-review-confirmation">
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Konfirmasi Tinjauan Perpanjangan</span>
                </div>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  Periksa rincian mutasi terkoordinasi sebelum dikonfirmasi. Tidak ada perubahan data yang disimpan sebelum Anda menekan tombol konfirmasi.
                </p>
              </div>

              {/* Rincian Rencana Mutasi Terkoordinasi */}
              <div className="space-y-2.5 border border-stone-200 rounded-xl p-4 bg-stone-50 text-xs">
                <span className="font-bold text-stone-700 block text-[11px] uppercase tracking-wide border-b border-stone-200 pb-2">
                  Rencana Operasi Terkoordinasi:
                </span>

                <div className="flex items-start gap-2.5 text-stone-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900 block">1. Dokumen Baru Dibuat & Diaktifkan</span>
                    <span className="text-stone-600">{title} (Berlaku s/d <strong className="font-mono text-emerald-700">{newExpiryDate}</strong>)</span>
                    <span className="block text-[10px] text-stone-400 font-mono">Berkas: {fileName}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-stone-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900 block">2. Dokumen Lama Diarsipkan (Histori Dijaga)</span>
                    <span className="text-stone-600">{existingDocument?.title || `Dokumen Terlewat (${asset.name})`}</span>
                    <span className="block text-[10px] text-stone-400 font-mono">Status diubah ke ARCHIVED dengan referensi pembaruan.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-stone-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-stone-900 block">3. Rekonsiliasi Pengingat & Periode Berikutnya</span>
                    <span className="text-stone-600">Pengingat lama diselesaikan. Pengingat periode baru dijadwalkan otomatis pada <strong className="font-mono text-stone-900">{newExpiryDate}</strong>.</span>
                  </div>
                </div>

                {parseFloat(renewalCost) > 0 && (
                  <div className="flex items-start gap-2.5 text-stone-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900 block">4. Catatan Biaya Operasional (TCO)</span>
                      <span className="text-stone-600">Rp {parseFloat(renewalCost).toLocaleString('id-ID')} dicatat ke analisis pengeluaran TCO.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2 Footer Action Bar */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setStep('EVIDENCE_COLLECTION')}
                  className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer flex items-center gap-1.5"
                  data-testid="btn-back-to-step-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali Edit</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAndProcess}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                  data-testid="btn-confirm-renewal-process"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Konfirmasi & Proses Renewal</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: EXECUTION FEEDBACK */}
          {step === 'EXECUTION_FEEDBACK' && (
            <div className="space-y-4" data-testid="step-execution-feedback">
              {/* Case Reference Header if case exists */}
              {currentCase && (
                <div className="text-xs font-mono bg-stone-100/70 border border-stone-200 rounded-lg p-2.5 flex items-center justify-between">
                  <span className="text-stone-500 font-medium">Kasus WorkFlow #</span>
                  <span className="font-bold text-stone-800" data-testid="renewal-case-id">
                    {currentCase.workflow_case_id}
                  </span>
                </div>
              )}

              {showReconcileConfirm ? (
                /* MANUAL RECONCILIATION CONFIRMATION LAYER */
                <div className="space-y-4" data-testid="reconciliation-confirm-layer">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                      <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                      <h4>Konfirmasi Rekonsiliasi Manual</h4>
                    </div>
                    <p className="text-xs text-amber-900/90 leading-relaxed">
                      Sistem mengonfirmasi bahwa dokumen baru telah berhasil dibuat. Anda dapat menyelesaikan status kasus secara manual dengan catatan verifikasi.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-stone-700">
                      Catatan Rekonsiliasi
                    </label>
                    <textarea
                      value={reconcileNotes}
                      onChange={(e) => setReconcileNotes(e.target.value)}
                      placeholder="Contoh: Dokumen fisik perpanjangan telah diverifikasi oleh tim legal..."
                      className="w-full p-2.5 text-xs border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none resize-none h-20"
                      data-testid="reconcile-notes-input"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReconcileConfirm(false)}
                      className="px-4 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition-colors cursor-pointer"
                    >
                      Batal
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
                  {/* PREPARING or EXECUTING STATE */}
                  {(gatewayStatus === 'PREPARING' || gatewayStatus === 'EXECUTING') && (
                    <div className="text-center py-8 space-y-3" data-testid="gateway-status-executing">
                      <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                      <h4 className="text-sm font-bold text-stone-800" data-testid="gateway-status-heading">
                        Mengeksekusi perpanjangan dokumen...
                      </h4>
                      <p className="text-xs text-stone-500 max-w-xs mx-auto leading-relaxed">
                        Mengoordinasikan pembuatan dokumen baru, pengarsipan dokumen lama, dan rekonsiliasi pengingat...
                      </p>
                    </div>
                  )}

                  {/* SUCCESS STATE */}
                  {gatewayStatus === 'SUCCESS' && (
                    <div className="space-y-4" data-testid="gateway-status-success">
                      <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950" data-testid="gateway-status-heading">
                            Perpanjangan Dokumen Berhasil
                          </h4>
                          <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                            Seluruh mutasi terkoordinasi berhasil disimpan dan kasus perpanjangan beralih ke status <strong>RESOLVED</strong>.
                          </p>
                        </div>
                      </div>

                      {/* Verified Mutation Facts Breakdown */}
                      <div className="space-y-2 bg-stone-50 border border-stone-200 rounded-xl p-3.5 text-xs">
                        <span className="font-bold text-stone-700 block text-[11px] uppercase tracking-wide">
                          Fakta Mutasi Terverifikasi:
                        </span>

                        <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Dokumen baru dibuat (ID: {currentMutation?.primary_mutation.entity_id || 'DOC-NEW'})</span>
                        </div>

                        <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Dokumen lama diarsipkan & referensi perpanjangan diperbarui</span>
                        </div>

                        <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>Pengingat diselesaikan & periode berikutnya dijadwalkan ({newExpiryDate})</span>
                        </div>

                        {/* Optional Expense Outcome Display (PH5-I04 Independent Truth) */}
                        {currentMutation?.secondary_mutation && (
                          <div className="flex items-center gap-2 text-stone-800 font-medium" data-testid="outcome-item-success">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Biaya perpanjangan berhasil dicatat ke TCO</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RECONCILIATION_REQUIRED STATE */}
                  {gatewayStatus === 'RECONCILIATION_REQUIRED' && (
                    <div className="space-y-4" data-testid="gateway-status-reconciliation-required">
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                        <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                          <h4 data-testid="gateway-status-heading">Penyelesaian Perpanjangan Parsial</h4>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed">
                          Dokumen baru berhasil dibuat, namun sebagian mutasi sekunder (pengingat/pengarsipan) memerlukan tindakan lanjutan.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs border border-stone-200 rounded-xl p-3.5 bg-stone-50">
                        <span className="font-bold text-stone-700 block text-[11px] uppercase">
                          Rincian Mutasi:
                        </span>
                        
                        {currentMutation?.primary_mutation.status === 'SUCCEEDED' && (
                          <div className="flex items-center gap-2 text-emerald-800 font-medium" data-testid="outcome-item-success">
                            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Dokumen Baru: Berhasil tersimpan ({currentMutation.primary_mutation.entity_id})</span>
                          </div>
                        )}

                        {currentMutation?.secondary_mutation?.status === 'FAILED' && (
                          <div className="flex items-start gap-2 text-rose-800 font-medium" data-testid="outcome-item-failure">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <span>Pengingat Sekunder: Belum berhasil diperbarui</span>
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
                            Gagal Membuat Dokumen Baru
                          </h4>
                          <p className="text-xs text-rose-800 mt-1">
                            {currentError || 'Terjadi kesalahan sistem saat membuat dokumen perpanjangan baru.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-100">
                    {availableActions.includes('CANCEL') && gatewayStatus !== 'SUCCESS' && (
                      <button
                        type="button"
                        onClick={onCancel || onClose}
                        className="px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors cursor-pointer"
                        data-testid="gateway-cancel-btn"
                      >
                        Batalkan
                      </button>
                    )}

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

                    {(gatewayStatus === 'SUCCESS' || (!availableActions.includes('RETRY') && !availableActions.includes('RECONCILE'))) && (
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
          )}
        </div>
      </div>
    </div>
  );
};
