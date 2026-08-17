import React from 'react';
import { FormattedSummaryMetrics } from '../../lib/tcoPresentationAdapter';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface TCODataQualityFooterProps {
  summary: FormattedSummaryMetrics;
}

export const TCODataQualityFooter: React.FC<TCODataQualityFooterProps> = ({ summary }) => {
  return (
    <div className="bg-stone-50 rounded-xl border border-stone-200 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-stone-600 font-medium">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span>{summary.formattedFactsCountLabel} yang terverifikasi dan valid.</span>
      </div>

      {summary.hasExcludedFacts && (
        <div className="flex items-center gap-2 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {summary.excludedFactsCount} catatan biaya diabaikan karena data nominal tidak valid atau duplikat terdeteksi.
          </span>
        </div>
      )}
    </div>
  );
};
