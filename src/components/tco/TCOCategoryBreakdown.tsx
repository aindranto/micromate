import React from 'react';
import { FormattedCategoryItem } from '../../lib/tcoPresentationAdapter';
import { PieChart } from 'lucide-react';

interface TCOCategoryBreakdownProps {
  categories: FormattedCategoryItem[];
}

export const TCOCategoryBreakdown: React.FC<TCOCategoryBreakdownProps> = ({ categories }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
            <PieChart className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-stone-900 tracking-tight">
            Distribusi Biaya Per Kategori
          </h3>
        </div>
      </div>

      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.category} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-semibold text-stone-700">
              <span className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${cat.colorClass.split(' ')[0]}`} />
                <span>{cat.label}</span>
                <span className="text-stone-400 font-normal">({cat.recordCountLabel})</span>
              </span>
              <span className="font-bold text-stone-900">
                {cat.formattedAmount} <span className="text-stone-500 font-normal ml-1">({cat.percentageLabel})</span>
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-stone-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${cat.colorClass.split(' ')[0]}`}
                style={{ width: `${Math.max(cat.percentage, cat.percentage > 0 ? 2 : 0)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
