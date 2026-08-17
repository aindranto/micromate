import React from 'react';
import { 
  FileText, 
  File, 
  Image as ImageIcon, 
  FileCheck,
  Calendar,
  Layers
} from 'lucide-react';
import { Document } from '../../types';
import { 
  getDocumentCategory, 
  formatDocumentFileSize,
  UICategoryDefinition 
} from '../../lib/documentPresentation';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentActions } from './DocumentActions';

interface DocumentCardProps {
  document: Document;
  onPreview: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onOpenDrive?: (doc: Document) => void;
  onRetryUpload?: (doc: Document) => void;
  onEditMetadata?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  onPreview,
  onDownload,
  onOpenDrive,
  onRetryUpload,
  onEditMetadata,
  onDelete
}) => {
  const category: UICategoryDefinition = getDocumentCategory(document);
  const isImage = document.mime_type?.startsWith('image/') || document.file_name?.match(/\.(jpg|jpeg|png|webp|gif)$/i);
  const isPdf = document.mime_type === 'application/pdf' || document.file_name?.endsWith('.pdf');

  const formattedDate = React.useMemo(() => {
    try {
      const date = new Date(document.created_at);
      return new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(date);
    } catch {
      return document.created_at;
    }
  }, [document.created_at]);

  const renderThumbnailOrIcon = () => {
    if (isImage && (document.thumbnail_url || document.local_file_ref)) {
      return (
        <div 
          className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-700 cursor-pointer"
          onClick={() => onPreview(document)}
        >
          <img 
            src={document.thumbnail_url || document.local_file_ref} 
            alt={document.title || document.file_name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={(e) => {
              // Fallback to icon if thumbnail fails
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        </div>
      );
    }

    return (
      <div 
        className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        onClick={() => onPreview(document)}
      >
        {isPdf ? (
          <FileText className="w-6 h-6 text-rose-500" />
        ) : isImage ? (
          <ImageIcon className="w-6 h-6 text-indigo-500" />
        ) : (
          <File className="w-6 h-6 text-slate-500" />
        )}
      </div>
    );
  };

  return (
    <div 
      id={`doc-card-${document.document_id}`}
      className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 transition-all hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Thumbnail + Metadata */}
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          {renderThumbnailOrIcon()}

          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h4 
                id={`doc-title-${document.document_id}`}
                className="font-medium text-sm text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                onClick={() => onPreview(document)}
                title={document.title || document.file_name}
              >
                {document.title || document.file_name}
              </h4>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
              {document.file_name} • {formatDocumentFileSize(document.file_size)}
            </p>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Category Tag */}
              <span className="inline-flex items-center text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                <Layers className="w-3 h-3 mr-1 opacity-70" />
                {category.label}
              </span>

              {/* Upload Date */}
              <span className="inline-flex items-center text-[11px] text-slate-500 dark:text-slate-400">
                <Calendar className="w-3 h-3 mr-1 opacity-70" />
                {formattedDate}
              </span>

              {/* Status Badge */}
              <DocumentStatusBadge document={document} size="sm" />
            </div>

            {/* Optional Notes */}
            {document.notes && (
              <p className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 mt-2 border border-slate-100 dark:border-slate-800/80">
                {document.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex-shrink-0">
          <DocumentActions
            document={document}
            onPreview={onPreview}
            onDownload={onDownload}
            onOpenDrive={onOpenDrive}
            onRetryUpload={onRetryUpload}
            onEditMetadata={onEditMetadata}
            onDelete={onDelete}
          />
        </div>
      </div>
    </div>
  );
};
