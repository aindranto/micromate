import React from 'react';
import { 
  Document, 
  DocumentType 
} from '../../types';
import { 
  UICategoryKey, 
  DocumentSortOption,
  filterDocuments,
  sortDocuments,
  UI_CATEGORIES
} from '../../lib/documentPresentation';
import { DocumentToolbar } from './DocumentToolbar';
import { DocumentList } from './DocumentList';
import { AddDocumentModal } from './AddDocumentModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { DeleteDocumentModal } from './DeleteDocumentModal';

interface DocumentVaultProps {
  assetId: string;
  assetName?: string;
  documents: Document[];
  onAddDocument: (payload: {
    title: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    documentType: DocumentType;
    base64Data: string;
    notes?: string;
  }) => Promise<void> | void;
  onRetryUpload?: (document: Document) => Promise<void> | void;
  onEditMetadata?: (document: Document) => Promise<void> | void;
  onDeleteDocument?: (document: Document) => Promise<void> | void;
}

export const DocumentVault: React.FC<DocumentVaultProps> = ({
  assetId,
  assetName,
  documents = [],
  onAddDocument,
  onRetryUpload,
  onEditMetadata,
  onDeleteDocument
}) => {
  // State
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedCategory, setSelectedCategory] = React.useState<UICategoryKey>('ALL');
  const [sortBy, setSortBy] = React.useState<DocumentSortOption>('NEWEST');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = React.useState<boolean>(false);
  const [viewingDocument, setViewingDocument] = React.useState<Document | null>(null);
  const [deletingDocument, setDeletingDocument] = React.useState<Document | null>(null);

  // 1. Calculate category counts
  const categoryCounts = React.useMemo(() => {
    const counts: Record<UICategoryKey, number> = {
      ALL: 0,
      REGISTRATION: 0,
      WARRANTY: 0,
      INVOICE: 0,
      MANUAL: 0,
      INSURANCE: 0,
      PHOTO: 0,
      OTHER: 0
    };

    const activeDocs = documents.filter(d => !d.deleted);
    counts.ALL = activeDocs.length;

    activeDocs.forEach((doc) => {
      const docType = doc.document_type || 'other';
      const cat = UI_CATEGORIES.find(c => c.types.includes(docType));
      if (cat) {
        counts[cat.key] = (counts[cat.key] || 0) + 1;
      } else {
        counts.OTHER = (counts.OTHER || 0) + 1;
      }
    });

    return counts;
  }, [documents]);

  // 2. Pure Filter & Sort Pipeline
  const displayedDocuments = React.useMemo(() => {
    const filtered = filterDocuments(documents, {
      categoryKey: selectedCategory,
      searchQuery: searchQuery,
      includeDeleted: false
    });
    return sortDocuments(filtered, sortBy);
  }, [documents, selectedCategory, searchQuery, sortBy]);

  // 3. User Actions Handlers
  const handlePreview = (doc: Document) => {
    setViewingDocument(doc);
  };

  const handleDownload = (doc: Document) => {
    const src = doc.local_file_ref || doc.drive_url;
    if (!src) return;

    // Create safe download trigger
    const link = window.document.createElement('a');
    link.href = src;
    link.download = doc.file_name || doc.title || 'document';
    if (doc.drive_url && !doc.local_file_ref) {
      link.target = '_blank';
    }
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleOpenDrive = (doc: Document) => {
    if (doc.drive_url) {
      const openWin = window['open'];
      openWin(doc.drive_url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
  };

  return (
    <div id="document-vault-root" className="space-y-4">
      {/* Header Info & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Berkas & Dokumen Aset
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Simpan STNK, BPKB, nota servis, garansi, atau buku petunjuk aset Anda.
          </p>
        </div>
      </div>

      {/* Toolbar Controls (Search, Filter, Sort, Add) */}
      <DocumentToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onAddClick={() => setIsAddModalOpen(true)}
        categoryCounts={categoryCounts}
        totalCount={displayedDocuments.length}
      />

      {/* Main Document List */}
      <DocumentList
        documents={displayedDocuments}
        onPreview={handlePreview}
        onDownload={handleDownload}
        onOpenDrive={handleOpenDrive}
        onRetryUpload={onRetryUpload}
        onEditMetadata={onEditMetadata}
        onDelete={(doc) => setDeletingDocument(doc)}
        onAddClick={() => setIsAddModalOpen(true)}
        selectedCategory={selectedCategory}
        searchQuery={searchQuery}
        onResetFilters={handleResetFilters}
      />

      {/* Add Document Modal */}
      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        assetId={assetId}
        assetName={assetName}
        onSave={onAddDocument}
      />

      {/* Document Viewer Modal (Purity Guarantees: 0 domain side-effects) */}
      <DocumentViewerModal
        document={viewingDocument}
        isOpen={!!viewingDocument}
        onClose={() => setViewingDocument(null)}
        onDownload={handleDownload}
      />

      {/* Delete Confirmation Modal */}
      <DeleteDocumentModal
        document={deletingDocument}
        isOpen={!!deletingDocument}
        onClose={() => setDeletingDocument(null)}
        onConfirm={async (doc) => {
          if (onDeleteDocument) {
            await onDeleteDocument(doc);
          }
        }}
      />
    </div>
  );
};
