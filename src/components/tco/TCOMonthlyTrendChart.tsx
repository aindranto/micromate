import React from 'react';
import { FormattedMonthlyPoint } from '../../lib/tcoPresentationAdapter';
import { BarChart3 } from 'lucide-react';

interface TCOMonthlyTrendChartProps {
  monthlyPoints: FormattedMonthlyPoint[];
}

export const TCOMonthlyTrendChart: React.FC<TCOMonthlyTrendChartProps> = ({ monthlyPoints }) => {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
            <BarChart3 className="w-4 h-4" />
          </div>
          <h3 className="text-base font-bold text-stone-900 tracking-tight">
            Tren Biaya Bulanan
          </h3>
        </div>
      </div>

      {/* Chart Visual Container */}
      <div className="pt-4 pb-2">
        <div className="h-48 flex items-end justify-between gap-2 sm:gap-4 border-b border-stone-200 px-2 pb-2">
          {monthlyPoints.map((point) => (
            <div key={point.yearMonth} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group relative">
              {/* Tooltip on Hover */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full mb-2 z-20 bg-stone-900 text-white text-[11px] rounded-lg py-1.5 px-2.5 shadow-lg whitespace-nowrap pointer-events-none">
                <div className="font-bold">{point.label}</div>
                <div>Total: {point.formattedTotalAmount}</div>
                <div className="text-stone-300 text-[10px]">Servis: {point.formattedMaintenanceAmount}</div>
                <div className="text-stone-300 text-[10px]">Pajak: {point.formattedTaxAmount}</div>
              </div>

              {/* Bar Column */}
              <div
                style={{ height: `${point.heightPercentage}%` }}
                className="w-full max-w-[36px] bg-emerald-800 group-hover:bg-emerald-600 rounded-t-lg transition-all duration-300 relative flex flex-col justify-end overflow-hidden"
              />

              {/* Month Label */}
              <span className="text-[10px] sm:text-xs font-semibold text-stone-500 truncate w-full text-center">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
