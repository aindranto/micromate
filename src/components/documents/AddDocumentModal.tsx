import React from 'react';
import { 
  UploadCloud, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers,
  FileCheck
} from 'lucide-react';
import { DocumentType } from '../../types';
import { UI_CATEGORIES, UICategoryDefinition } from '../../lib/documentPresentation';
import { compressImageFile } from '../../lib/imageCompressor';

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: string;
  assetName?: string;
  onSave: (payload: {
    title: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    documentType: DocumentType;
    base64Data: string;
    notes?: string;
  }) => Promise<void> | void;
}

export const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  onClose,
  assetId,
  assetName,
  onSave
}) => {
  const [file, setFile] = React.useState<File | null>(null);
  const [base64Content, setBase64Content] = React.useState<string>('');
  const [title, setTitle] = React.useState<string>('');
  const [documentType, setDocumentType] = React.useState<DocumentType>('stnk');
  const [notes, setNotes] = React.useState<string>('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [isDragging, setIsDragging] = React.useState<boolean>(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setFile(null);
      setBase64Content('');
      setTitle('');
      setDocumentType('stnk');
      setNotes('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileSelection = (selectedFile: File) => {
    setError(null);

    // 1. Enforce 25MB ceiling guard
    const maxBytes = 25 * 1024 * 1024;
    if (selectedFile.size > maxBytes) {
      setError('Ukuran berkas melebihi batas maksimal 25 MB.');
      return;
    }

    setFile(selectedFile);
    if (!title) {
      // Auto-populate human title from file name (clean extensions)
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }

    // Auto-detect DocumentType based on filename keywords
    const lowerName = selectedFile.name.toLowerCase();
    if (lowerName.includes('stnk')) setDocumentType('stnk');
    else if (lowerName.includes('bpkb')) setDocumentType('bpkb');
    else if (lowerName.includes('garansi') || lowerName.includes('warranty')) setDocumentType('warranty');
    else if (lowerName.includes('nota') || lowerName.includes('struk') || lowerName.includes('invoice')) setDocumentType('service_receipt');
    else if (lowerName.includes('manual') || lowerName.includes('panduan')) setDocumentType('manual');
    else if (lowerName.includes('asuransi') || lowerName.includes('polis')) setDocumentType('insurance');
    else if (selectedFile.type.startsWith('image/')) setDocumentType('condition_photo');

    // Read & compress base64
    compressImageFile(selectedFile, { maxDimension: 1200, quality: 0.80 })
      .then((result) => {
        setBase64Content(result);
      })
      .catch(() => {
        setError('Gagal membaca & mengompres berkas lokal.');
      });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !base64Content) {
      setError('Silakan pilih berkas dokumen terlebih dahulu.');
      return;
    }
    if (!title.trim()) {
      setError('Judul dokumen wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        title: title.trim(),
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        documentType,
        base64Data: base64Content,
        notes: notes.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan dokumen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="modal-add-document"
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Tambah Dokumen Aset
            </h3>
            {assetName && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Aset: <span className="font-medium text-slate-700 dark:text-slate-300">{assetName}</span>
              </p>
            )}
          </div>
          <button
            id="btn-close-add-doc-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="flex items-start p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop File Picker */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Berkas Dokumen <span className="text-rose-500">*</span>
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20' 
                  : file 
                  ? 'border-emerald-300 dark:border-emerald-700/60 bg-emerald-50/30 dark:bg-emerald-950/10'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(e) => e.target.files?.[0] && handleFileSelection(e.target.files[0])}
              />

              {file ? (
                <div className="flex items-center justify-center space-x-3 text-left">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center flex-shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {file.name}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • Klik untuk ganti berkas
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <UploadCloud className="w-8 h-8 mx-auto text-slate-400 dark:text-slate-500" />
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Klik untuk memilih atau seret berkas ke sini
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    Mendukung PDF, JPG, PNG, WEBP (Maksimal 25 MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Judul Dokumen */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Judul Dokumen <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-add-doc-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: STNK Motor Vario 2026"
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* Kategori Dokumen (7 Kategori Canonical) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Kategori Dokumen <span className="text-rose-500">*</span>
            </label>
            <select
              id="select-add-doc-type"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as DocumentType)}
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100"
            >
              <option value="stnk">STNK (Registrasi & Legal)</option>
              <option value="bpkb">BPKB (Registrasi & Legal)</option>
              <option value="registration">Dokumen Registrasi Lainnya</option>
              <option value="warranty">Kartu Garansi</option>
              <option value="purchase_receipt">Kwitansi / Nota Pembelian</option>
              <option value="service_receipt">Nota Servis Bengkel</option>
              <option value="invoice">Faktur / Invoice</option>
              <option value="manual">Buku Petunjuk (Manual)</option>
              <option value="insurance">Polis Asuransi</option>
              <option value="condition_photo">Foto Kondisi / Fisik Aset</option>
              <option value="other">Dokumen Lainnya</option>
            </select>
          </div>

          {/* Catatan Tambahan (Opsional) */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              id="input-add-doc-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Catatan masa berlaku, nomor polisi, atau detail klaim…"
              className="w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 resize-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              id="btn-cancel-add-doc"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-add-doc"
              disabled={isSubmitting || !file}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Menyimpan…' : 'Simpan Dokumen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
