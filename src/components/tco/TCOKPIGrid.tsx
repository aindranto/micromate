import React from 'react';
import { FormattedSummaryMetrics } from '../../lib/tcoPresentationAdapter';
import { DollarSign, TrendingUp, TrendingDown, Wrench, Shield, Calendar, Gauge, Info } from 'lucide-react';

interface TCOKPIGridProps {
  metrics: FormattedSummaryMetrics;
}

export const TCOKPIGrid: React.FC<TCOKPIGridProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* 1. Grand Total Cost */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Total Biaya (TCO)
          </span>
          <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {metrics.formattedTotalCost}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-stone-500 font-medium">
          <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
          <span title={metrics.totalCostTooltipLabel} className="truncate">
            Harga Beli + Total Biaya Operasional
          </span>
        </div>
      </div>

      {/* 2. Operational Cost */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Biaya Operasional
          </span>
          <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
            <Wrench className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {metrics.formattedOperationalCost}
        </div>
        <div className="text-xs text-stone-500 font-medium">
          Servis, Pajak & Pengeluaran Terkait
        </div>
      </div>

      {/* 3. Monthly Average Cost */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Rata-Rata Biaya
          </span>
          <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {metrics.formattedMonthlyAverage}
        </div>
        <div className="text-xs text-stone-500 font-medium">
          Selama {metrics.formattedActivePeriod} periode aktif
        </div>
      </div>

      {/* 4. Cost Per Km (if available) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Biaya Per Kilometer
          </span>
          <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {metrics.formattedCostPerKm ?? 'N/A'}
        </div>
        <div className="text-xs text-stone-500 font-medium">
          {metrics.formattedCostPerKm ? 'Berdasarkan odometer kendaraan' : 'Kilometer tidak tersedia'}
        </div>
      </div>

      {/* 5. Current Month Operational Cost */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Biaya Bulan Ini
          </span>
          <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
            <Shield className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
          {metrics.formattedCurrentMonthCost}
        </div>
        <div className="text-xs text-stone-500 font-medium">
          Bulan sebelumnya: {metrics.formattedPreviousMonthCost}
        </div>
      </div>

      {/* 6. Cost Trend % */}
      <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
            Tren Biaya (MoM)
          </span>
          <div className={`p-2 rounded-xl ${
            metrics.costTrendTone === 'negative'
              ? 'bg-rose-50 text-rose-700'
              : metrics.costTrendTone === 'positive'
              ? 'bg-emerald-50 text-emerald-800'
              : 'bg-stone-100 text-stone-600'
          }`}>
            {metrics.trendDirection === 'INCREASE' ? (
              <TrendingUp className="w-4 h-4" />
            ) : metrics.trendDirection === 'DECREASE' ? (
              <TrendingDown className="w-4 h-4" />
            ) : (
              <Calendar className="w-4 h-4" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-2xl sm:text-3xl font-black tracking-tight ${
            metrics.costTrendTone === 'negative'
              ? 'text-rose-600'
              : metrics.costTrendTone === 'positive'
              ? 'text-emerald-800'
              : 'text-stone-900'
          }`}>
            {metrics.formattedCostTrendPercentage ?? '0%'}
          </span>
        </div>
        <div className="text-xs text-stone-500 font-medium">
          {metrics.trendDirection === 'INCREASE'
            ? '↑ Kenaikan pengeluaran dibanding bulan lalu'
            : metrics.trendDirection === 'DECREASE'
            ? '↓ Penurunan pengeluaran dibanding bulan lalu'
            : 'Perubahan biaya tidak signifikan'}
        </div>
      </div>
    </div>
  );
};
