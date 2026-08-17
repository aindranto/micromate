import React from 'react';
import { Search, X } from 'lucide-react';

interface DocumentSearchProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export const DocumentSearch: React.FC<DocumentSearchProps> = ({
  value,
  onChange,
  placeholder = 'Cari dokumen berdasarkan judul, nama file, atau catatan…'
}) => {
  return (
    <div className="relative flex-1">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        id="input-document-search"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
      />
      {value && (
        <button
          id="btn-clear-doc-search"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          title="Hapus pencarian"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
