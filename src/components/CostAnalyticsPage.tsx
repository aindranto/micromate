import React from 'react';
import { Asset } from '../types';
import { formatRupiah, calculateAssetTCO } from '../lib/utils';
import { DollarSign, PieChart, TrendingUp, Box, Flame, Award, Wrench } from 'lucide-react';

interface CostAnalyticsPageProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
}

export const CostAnalyticsPage: React.FC<CostAnalyticsPageProps> = ({
  assets,
  onSelectAsset,
}) => {
  // Aggregate overall metrics across assets
  let grandPurchase = 0;
  let grandMaintenance = 0;
  let grandRepair = 0;
  let grandAccessories = 0;

  const assetTcoList = assets.map((a) => {
    const tco = calculateAssetTCO(a);
    grandPurchase += tco.purchasePrice;
    grandMaintenance += tco.maintenanceTotal;
    grandRepair += tco.repairTotal;
    grandAccessories += tco.accessoriesTotal;
    return {
      asset: a,
      ...tco
    };
  }).sort((a, b) => b.totalCostOfOwnership - a.totalCostOfOwnership);

  const grandTotalTCO = grandPurchase + grandMaintenance + grandRepair + grandAccessories;

  // Calculate percentage shares for visual progress bar
  const purchasePct = grandTotalTCO > 0 ? (grandPurchase / grandTotalTCO) * 100 : 0;
  const maintenancePct = grandTotalTCO > 0 ? (grandMaintenance / grandTotalTCO) * 100 : 0;
  const accessoriesPct = grandTotalTCO > 0 ? (grandAccessories / grandTotalTCO) * 100 : 0;
  const repairPct = grandTotalTCO > 0 ? (grandRepair / grandTotalTCO) * 100 : 0;

  const maxAssetTCO = assetTcoList[0]?.totalCostOfOwnership || 1;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-stone-900 tracking-tight">
          Analisis Biaya & Total Cost of Ownership (TCO)
        </h2>
        <p className="text-xs font-medium text-stone-600 mt-0.5">
          Evaluasi total investasi pembelian, biaya servis berkala, dan akumulasi perbaikan aset Anda
        </p>
      </div>

      {/* TCO Grand Total Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Akumulasi Total Kepemilikan (Grand TCO)
          </span>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/80 w-fit">
            {assets.length} Aset Terdaftar
          </span>
        </div>

        <div className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
          {formatRupiah(grandTotalTCO)}
        </div>

        {/* Visual Stacked Bar Breakdown */}
        <div className="space-y-2 pt-2">
          <div className="h-3.5 w-full bg-stone-100 rounded-full overflow-hidden flex border border-stone-200">
            <div 
              style={{ width: `${purchasePct}%` }} 
              className="bg-emerald-800 h-full" 
              title={`Pembelian Awal: ${purchasePct.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${maintenancePct}%` }} 
              className="bg-emerald-500 h-full" 
              title={`Servis & Maintenance: ${maintenancePct.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${accessoriesPct}%` }} 
              className="bg-amber-500 h-full" 
              title={`Aksesori: ${accessoriesPct.toFixed(1)}%`}
            />
            <div 
              style={{ width: `${repairPct}%` }} 
              className="bg-rose-500 h-full" 
              title={`Perbaikan: ${repairPct.toFixed(1)}%`}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 flex-wrap gap-2">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-800" />
              <span>Pembelian ({purchasePct.toFixed(0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Servis ({maintenancePct.toFixed(0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>Aksesori ({accessoriesPct.toFixed(0)}%)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <span>Repair ({repairPct.toFixed(0)}%)</span>
            </span>
          </div>
        </div>

        {/* Breakdown bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-200 text-xs">
          <div>
            <span className="text-stone-500 block font-medium">Pembelian Awal</span>
            <span className="font-bold text-stone-900 text-sm">{formatRupiah(grandPurchase)}</span>
          </div>

          <div>
            <span className="text-stone-500 block font-medium">Servis & Maintenance</span>
            <span className="font-bold text-emerald-800 text-sm">{formatRupiah(grandMaintenance)}</span>
          </div>

          <div>
            <span className="text-stone-500 block font-medium">Aksesori & Sparepart</span>
            <span className="font-bold text-emerald-800 text-sm">{formatRupiah(grandAccessories)}</span>
          </div>

          <div>
            <span className="text-stone-500 block font-medium">Perbaikan/Repair</span>
            <span className="font-bold text-emerald-800 text-sm">{formatRupiah(grandRepair)}</span>
          </div>
        </div>
      </div>

      {/* Top Costly Assets Visual Ranking Section */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-stone-900 text-lg">
              Top Aset dengan Nilai Kepemilikan Tertinggi
            </h3>
          </div>
          <span className="text-xs font-semibold text-stone-500">
            Urutan TCO
          </span>
        </div>

        <div className="space-y-3">
          {assetTcoList.slice(0, 3).map((item, idx) => {
            const barWidth = (item.totalCostOfOwnership / maxAssetTCO) * 100;
            return (
              <div
                key={item.asset.asset_id}
                onClick={() => onSelectAsset(item.asset)}
                className="p-4 bg-stone-50/80 rounded-xl border border-stone-200 hover:border-emerald-600 cursor-pointer transition-all space-y-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                      idx === 0 ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                      idx === 1 ? 'bg-stone-200 text-stone-800 border border-stone-300' :
                      'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 text-sm truncate">
                        {item.asset.name}
                      </h4>
                      <span className="text-[11px] text-stone-500 font-medium">
                        {item.asset.brand || 'No Brand'} • {item.asset.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-sm sm:text-base font-black text-emerald-900 shrink-0">
                    {formatRupiah(item.totalCostOfOwnership)}
                  </span>
                </div>

                {/* Relative TCO comparison bar */}
                <div className="space-y-1">
                  <div className="h-2 w-full bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      style={{ width: `${barWidth}%` }} 
                      className="h-full bg-emerald-700 rounded-full transition-all duration-500"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-500">
                    <span>Beli: {formatRupiah(item.purchasePrice)}</span>
                    <span>Biaya Servis & Perawatan: {formatRupiah(item.maintenanceTotal + item.repairTotal + item.accessoriesTotal)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Itemized Breakdown Table per Asset */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-4">
        <h3 className="font-bold text-stone-900 text-lg">
          Semua Rincian Biaya Aset ({assetTcoList.length})
        </h3>

        <div className="space-y-3">
          {assetTcoList.map((item) => (
            <div
              key={item.asset.asset_id}
              onClick={() => onSelectAsset(item.asset)}
              className="p-4 bg-stone-50/80 rounded-xl border border-stone-200 hover:border-emerald-600 cursor-pointer transition-all space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">
                    {item.asset.name}
                  </h4>
                  <p className="text-xs text-stone-500 font-medium">
                    {item.asset.brand} • {item.asset.category}
                  </p>
                </div>

                <span className="text-base font-black text-emerald-800">
                  {formatRupiah(item.totalCostOfOwnership)}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] pt-2 border-t border-stone-200 text-stone-700">
                <div>Beli: <strong className="text-stone-900">{formatRupiah(item.purchasePrice)}</strong></div>
                <div>Servis: <strong className="text-stone-900">{formatRupiah(item.maintenanceTotal)}</strong></div>
                <div>Aksesori: <strong className="text-stone-900">{formatRupiah(item.accessoriesTotal)}</strong></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
