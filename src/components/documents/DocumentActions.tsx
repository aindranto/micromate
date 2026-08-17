import React from 'react';
import { 
  Eye, 
  ExternalLink, 
  Download, 
  RefreshCw, 
  MoreVertical, 
  Trash2, 
  Edit3 
} from 'lucide-react';
import { Document } from '../../types';
import { getDocumentActionCapabilities } from '../../lib/documentPresentation';

interface DocumentActionsProps {
  document: Document;
  onPreview: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onOpenDrive?: (doc: Document) => void;
  onRetryUpload?: (doc: Document) => void;
  onEditMetadata?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  isCompact?: boolean;
}

export const DocumentActions: React.FC<DocumentActionsProps> = ({
  document,
  onPreview,
  onDownload,
  onOpenDrive,
  onRetryUpload,
  onEditMetadata,
  onDelete,
  isCompact = false
}) => {
  const capabilities = getDocumentActionCapabilities(document);
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  return (
    <div className="flex items-center space-x-1 relative" ref={dropdownRef}>
      {/* Primary Action Button */}
      {capabilities.canRetryUpload && onRetryUpload && (
        <button
          id={`btn-retry-${document.document_id}`}
          onClick={() => onRetryUpload(document)}
          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors"
          title="Coba upload ulang berkas"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          <span>Coba Lagi</span>
        </button>
      )}

      {(capabilities.canViewLocal || capabilities.canViewCloud) && (
        <button
          id={`btn-preview-${document.document_id}`}
          onClick={() => onPreview(document)}
          className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors"
          title="Lihat isi dokumen"
        >
          <Eye className="w-3.5 h-3.5 mr-1" />
          <span>Lihat</span>
        </button>
      )}

      {capabilities.canViewCloud && document.drive_url && (
        <a
          id={`link-drive-${document.document_id}`}
          href={document.drive_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center px-2 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
          title="Buka langsung di Google Drive"
        >
          <ExternalLink className="w-3.5 h-3.5 mr-1" />
          <span className="hidden sm:inline">Drive</span>
        </a>
      )}

      {/* Overflow Menu for Secondary Actions */}
      <div className="relative">
        <button
          id={`btn-menu-${document.document_id}`}
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Tindakan lainnya"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 animate-in fade-in-50 zoom-in-95">
            {capabilities.canDownload && (
              <button
                id={`btn-download-${document.document_id}`}
                onClick={() => {
                  setShowDropdown(false);
                  onDownload(document);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center"
              >
                <Download className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Unduh Berkas
              </button>
            )}

            {capabilities.canEditMetadata && onEditMetadata && (
              <button
                id={`btn-edit-${document.document_id}`}
                onClick={() => {
                  setShowDropdown(false);
                  onEditMetadata(document);
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center"
              >
                <Edit3 className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Ubah Metadata
              </button>
            )}

            {capabilities.canDelete && onDelete && (
              <>
                <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <button
                  id={`btn-delete-${document.document_id}`}
                  onClick={() => {
                    setShowDropdown(false);
                    onDelete(document);
                  }}
                  className="w-full px-3 py-2 text-left text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-500" />
                  Hapus Dokumen
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
