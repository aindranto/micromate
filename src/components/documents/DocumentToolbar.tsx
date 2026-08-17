import React from 'react';
import { Plus } from 'lucide-react';
import { DocumentSearch } from './DocumentSearch';
import { DocumentSort } from './DocumentSort';
import { DocumentCategoryFilter } from './DocumentCategoryFilter';
import { UICategoryKey, DocumentSortOption } from '../../lib/documentPresentation';

interface DocumentToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: UICategoryKey;
  onCategoryChange: (cat: UICategoryKey) => void;
  sortBy: DocumentSortOption;
  onSortChange: (sort: DocumentSortOption) => void;
  onAddClick: () => void;
  categoryCounts?: Record<UICategoryKey, number>;
  totalCount: number;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  onAddClick,
  categoryCounts,
  totalCount
}) => {
  return (
    <div className="space-y-3">
      {/* Top Row: Search + Sort + Primary CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <DocumentSearch value={searchQuery} onChange={onSearchChange} />
        
        <div className="flex items-center justify-between sm:justify-end gap-2 flex-shrink-0">
          <DocumentSort sortBy={sortBy} onSortChange={onSortChange} />

          <button
            id="btn-add-document"
            onClick={onAddClick}
            className="inline-flex items-center justify-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Tambah Dokumen</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: 7 Categories Chips */}
      <DocumentCategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={onCategoryChange}
        categoryCounts={categoryCounts}
      />
    </div>
  );
};
