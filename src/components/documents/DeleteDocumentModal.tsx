import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Document } from '../../types';

interface DeleteDocumentModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (doc: Document) => Promise<void> | void;
}

export const DeleteDocumentModal: React.FC<DeleteDocumentModalProps> = ({
  document,
  isOpen,
  onClose,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = React.useState<boolean>(false);

  if (!isOpen || !document) return null;

  const handleConfirm = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(document);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="modal-delete-document"
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
      >
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Hapus Dokumen Aset?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Dokumen <span className="font-semibold text-slate-700 dark:text-slate-300">"{document.title || document.file_name}"</span> akan dihapus dari daftar aktif.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
          <p>• Data lokal akan ditandai terhapus (soft-delete).</p>
          <p>• Sinkronisasi Google Sheets akan memperbarui status dokumen.</p>
        </div>

        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            id="btn-confirm-delete-doc"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
          >
            {isDeleting ? 'Menghapus…' : 'Ya, Hapus Dokumen'}
          </button>
        </div>
      </div>
    </div>
  );
};
