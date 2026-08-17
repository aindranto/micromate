import React from 'react';
import { TCOTimeRange, Asset } from '../../types';
import { Calendar, ChevronDown, Info } from 'lucide-react';

interface TCOHeaderProps {
  assets: Asset[];
  selectedAssetId: string;
  onSelectAsset: (assetId: string) => void;
  timeRange: TCOTimeRange;
  onTimeRangeChange: (range: TCOTimeRange) => void;
}

export const TCOHeader: React.FC<TCOHeaderProps> = ({
  assets,
  selectedAssetId,
  onSelectAsset,
  timeRange,
  onTimeRangeChange
}) => {
  const timeRangeOptions: { value: TCOTimeRange; label: string }[] = [
    { value: '3M', label: '3 Bulan' },
    { value: '6M', label: '6 Bulan' },
    { value: '1Y', label: '12 Bulan' },
    { value: 'ALL', label: 'Semua' }
  ];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Asset Switcher */}
        <div className="space-y-1">
          <label htmlFor="tco-asset-select" className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Pilih Aset Analisis
          </label>
          <div className="relative inline-block w-full sm:w-72">
            <select
              id="tco-asset-select"
              value={selectedAssetId}
              onChange={(e) => onSelectAsset(e.target.value)}
              className="w-full appearance-none bg-stone-50 border border-stone-200 text-stone-900 font-semibold text-sm rounded-xl px-3.5 py-2.5 pr-9 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all cursor-pointer"
            >
              <option value="ALL_ASSETS">Semua Aset (Fleet Total)</option>
              {assets.map((asset) => (
                <option key={asset.asset_id} value={asset.asset_id}>
                  {asset.name} ({asset.category})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="space-y-1">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Periode Laporan
          </span>
          <div className="inline-flex p-1 bg-stone-100 rounded-xl border border-stone-200/80">
            {timeRangeOptions.map((opt) => (
              <button
                key={opt.value}
                id={`tco-range-btn-${opt.value}`}
                type="button"
                onClick={() => onTimeRangeChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === opt.value
                    ? 'bg-emerald-800 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
