import React from 'react';
import { FileText, Plus, RefreshCcw } from 'lucide-react';
import { Document } from '../../types';
import { DocumentCard } from './DocumentCard';
import { UICategoryKey } from '../../lib/documentPresentation';

interface DocumentListProps {
  documents: Document[];
  onPreview: (doc: Document) => void;
  onDownload: (doc: Document) => void;
  onOpenDrive?: (doc: Document) => void;
  onRetryUpload?: (doc: Document) => void;
  onEditMetadata?: (doc: Document) => void;
  onDelete?: (doc: Document) => void;
  onAddClick: () => void;
  selectedCategory: UICategoryKey;
  searchQuery: string;
  onResetFilters: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onPreview,
  onDownload,
  onOpenDrive,
  onRetryUpload,
  onEditMetadata,
  onDelete,
  onAddClick,
  selectedCategory,
  searchQuery,
  onResetFilters
}) => {
  if (documents.length === 0) {
    const isFiltered = selectedCategory !== 'ALL' || searchQuery.trim().length > 0;

    return (
      <div 
        id="doc-list-empty-state"
        className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 p-8 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {isFiltered ? 'Tidak ada dokumen yang sesuai' : 'Belum ada dokumen untuk aset ini'}
        </h3>

        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          {isFiltered
            ? 'Coba ubah kata kunci pencarian atau pilih filter kategori lainnya.'
            : 'Simpan STNK, nota servis, kartu garansi, atau buku petunjuk agar tersimpan rapi dan aman.'}
        </p>

        {isFiltered ? (
          <button
            id="btn-reset-doc-filters"
            onClick={onResetFilters}
            className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCcw className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Reset Filter</span>
          </button>
        ) : (
          <button
            id="btn-empty-add-document"
            onClick={onAddClick}
            className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Tambah Dokumen Sekarang</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div id="doc-cards-container" className="space-y-3">
      {documents.map((doc) => (
        <DocumentCard
          key={doc.document_id}
          document={doc}
          onPreview={onPreview}
          onDownload={onDownload}
          onOpenDrive={onOpenDrive}
          onRetryUpload={onRetryUpload}
          onEditMetadata={onEditMetadata}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};
