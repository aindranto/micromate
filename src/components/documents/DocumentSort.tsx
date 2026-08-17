import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import { DocumentSortOption } from '../../lib/documentPresentation';

interface DocumentSortProps {
  sortBy: DocumentSortOption;
  onSortChange: (sort: DocumentSortOption) => void;
}

export const DocumentSort: React.FC<DocumentSortProps> = ({
  sortBy,
  onSortChange
}) => {
  return (
    <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
      <ArrowUpDown className="w-3.5 h-3.5" />
      <select
        id="select-document-sort"
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value as DocumentSortOption)}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
      >
        <option value="NEWEST">Terbaru Diunggah</option>
        <option value="OLDEST">Terlama</option>
        <option value="NAME_ASC">Nama (A - Z)</option>
        <option value="NAME_DESC">Nama (Z - A)</option>
        <option value="SIZE_DESC">Ukuran Terbesar</option>
      </select>
    </div>
  );
};
