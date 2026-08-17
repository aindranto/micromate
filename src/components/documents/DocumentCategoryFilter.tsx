import React from 'react';
import { 
  FileBadge2, 
  ShieldCheck, 
  Receipt, 
  BookOpen, 
  Umbrella, 
  Camera, 
  FileText,
  LayoutGrid
} from 'lucide-react';
import { UI_CATEGORIES, UICategoryKey, UICategoryDefinition } from '../../lib/documentPresentation';

interface DocumentCategoryFilterProps {
  selectedCategory: UICategoryKey;
  onSelectCategory: (category: UICategoryKey) => void;
  categoryCounts?: Record<UICategoryKey, number>;
}

export const DocumentCategoryFilter: React.FC<DocumentCategoryFilterProps> = ({
  selectedCategory,
  onSelectCategory,
  categoryCounts
}) => {
  const getCategoryIcon = (iconName: string) => {
    const iconClass = 'w-3.5 h-3.5 mr-1.5';
    switch (iconName) {
      case 'FileBadge2':
        return <FileBadge2 className={iconClass} />;
      case 'ShieldCheck':
        return <ShieldCheck className={iconClass} />;
      case 'Receipt':
        return <Receipt className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Umbrella':
        return <Umbrella className={iconClass} />;
      case 'Camera':
        return <Camera className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
      {/* "Semua" Chip */}
      <button
        id="chip-cat-all"
        onClick={() => onSelectCategory('ALL')}
        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
          selectedCategory === 'ALL'
            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
            : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5 mr-1.5" />
        <span>Semua</span>
        {categoryCounts?.ALL !== undefined && (
          <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 dark:bg-black/20">
            {categoryCounts.ALL}
          </span>
        )}
      </button>

      {/* 7 Canonical Categories */}
      {UI_CATEGORIES.map((cat: UICategoryDefinition) => {
        const isSelected = selectedCategory === cat.key;
        const count = categoryCounts?.[cat.key];

        return (
          <button
            key={cat.key}
            id={`chip-cat-${cat.key.toLowerCase()}`}
            onClick={() => onSelectCategory(cat.key)}
            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              isSelected
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            {getCategoryIcon(cat.iconName)}
            <span>{cat.label}</span>
            {count !== undefined && count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
