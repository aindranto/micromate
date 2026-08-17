import React from 'react';
import { 
  X, 
  Download, 
  ExternalLink, 
  FileText, 
  ZoomIn, 
  ZoomOut, 
  RotateCw 
} from 'lucide-react';
import { Document } from '../../types';
import { getDocumentCategory, formatDocumentFileSize } from '../../lib/documentPresentation';
import { DocumentStatusBadge } from './DocumentStatusBadge';

interface DocumentViewerModalProps {
  document: Document | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  document,
  isOpen,
  onClose,
  onDownload
}) => {
  const [zoom, setZoom] = React.useState<number>(100);
  const [rotation, setRotation] = React.useState<number>(0);

  React.useEffect(() => {
    if (isOpen) {
      setZoom(100);
      setRotation(0);
    }
  }, [isOpen]);

  if (!isOpen || !document) return null;

  const isImage = document.mime_type?.startsWith('image/') || document.file_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const isPdf = document.mime_type === 'application/pdf' || document.file_name?.endsWith('.pdf');
  const fileSource = document.local_file_ref || document.drive_url;
  const category = getDocumentCategory(document);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 250));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="modal-document-viewer"
        className="w-full max-w-4xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex-shrink-0">
          <div className="min-w-0 flex-1 mr-4">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {document.title || document.file_name}
              </h3>
              <DocumentStatusBadge document={document} size="sm" />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {document.file_name} • {formatDocumentFileSize(document.file_size)} • {category.label}
            </p>
          </div>

          {/* Viewer Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {isImage && (
              <div className="hidden sm:flex items-center space-x-1 mr-2 border-r border-slate-200 dark:border-slate-700 pr-2">
                <button
                  onClick={handleZoomOut}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Perkecil"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-slate-500 w-10 text-center">{zoom}%</span>
                <button
                  onClick={handleZoomIn}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Perbesar"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={handleRotate}
                  className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Putar 90 Derajat"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              id="btn-viewer-download"
              onClick={() => onDownload(document)}
              className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Unduh Berkas"
            >
              <Download className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Unduh</span>
            </button>

            {document.drive_url && (
              <a
                id="btn-viewer-open-drive"
                href={document.drive_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors"
                title="Buka di Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">Buka di Drive</span>
              </a>
            )}

            <button
              id="btn-close-viewer"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              title="Tutup Viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer Stage */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950 overflow-auto flex items-center justify-center p-4">
          {fileSource ? (
            isImage ? (
              <div className="max-w-full max-h-full flex items-center justify-center overflow-auto p-2">
                <img
                  src={fileSource}
                  alt={document.title || document.file_name}
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out'
                  }}
                  className="max-h-[75vh] max-w-full object-contain rounded shadow-md"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : isPdf ? (
              <iframe
                src={fileSource}
                title={document.title || document.file_name}
                className="w-full h-full rounded-lg border-0 shadow-inner bg-white"
              />
            ) : (
              <div className="text-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-md">
                <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  Pratinjau Langsung Tidak Tersedia
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                  Format berkas ini ({document.mime_type}) dapat diunduh untuk dibuka melalui aplikasi pihak ketiga di perangkat Anda.
                </p>
                <button
                  onClick={() => onDownload(document)}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Unduh Berkas Sekarang
                </button>
              </div>
            )
          ) : (
            <div className="text-center p-8">
              <FileText className="w-12 h-12 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs text-slate-500">Berkas fisik tidak ditemukan di memori lokal atau cloud.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
