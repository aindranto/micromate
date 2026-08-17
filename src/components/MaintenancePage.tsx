import React, { useState } from 'react';
import { Asset } from '../types';
import { formatRupiah, formatCompactCurrency, formatDate } from '../lib/utils';
import { Wrench, Eye } from 'lucide-react';

interface MaintenancePageProps {
  assets: Asset[];
  onAddMaintenance: () => void;
  onSelectAsset: (asset: Asset) => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  assets,
  onSelectAsset,
}) => {
  const [selectedType, setSelectedType] = useState<string>('all');

  // Collect all maintenance records across assets
  const allLogs = assets.flatMap((a) =>
    (a.maintenance_records || []).map((m) => ({
      ...m,
      assetName: a.name,
      assetCategory: a.category,
      assetBrand: a.brand,
      asset: a
    }))
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const filteredLogs = allLogs.filter((log) => {
    return selectedType === 'all' || log.type === selectedType;
  });

  const totalCost = filteredLogs.reduce((sum, l) => sum + l.cost, 0);
  const totalAssetsWithMaintenance = assets.filter(
    (a) => a.maintenance_records && a.maintenance_records.length > 0
  ).length;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'oil_change': return 'Ganti Oli';
      case 'routine_service': return 'Servis Rutin';
      case 'ac': return 'Cuci/Servis AC';
      case 'tire': return 'Ban & Velg';
      case 'battery': return 'Aki & Baterai';
      case 'brake': return 'Kampas Rem';
      case 'repair': return 'Perbaikan';
      default: return type.replace('_', ' ').toUpperCase();
    }
  };

  return (
    <div className="space-y-4 pb-28 sm:pb-24">
      
      {/* Clean Header */}
      <div className="pt-1">
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
          Perawatan &amp; Servis
        </h2>
        <p className="text-xs font-medium text-stone-600 mt-0.5">
          Riwayat perawatan, perbaikan &amp; biaya aset Anda.
        </p>
      </div>

      {/* Single Compact Horizontal Summary Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-3 divide-x divide-stone-200/80 text-center">
          <div className="px-1.5 sm:px-2">
            <span className="text-base sm:text-lg font-black text-stone-900 block leading-tight">
              {filteredLogs.length}
            </span>
            <span className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider block mt-0.5">
              Catatan Servis
            </span>
          </div>

          <div className="px-1.5 sm:px-2">
            <span className="text-base sm:text-lg font-black text-emerald-900 block leading-tight">
              {formatCompactCurrency(totalCost)}
            </span>
            <span className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider block mt-0.5">
              Total Biaya
            </span>
          </div>

          <div className="px-1.5 sm:px-2">
            <span className="text-base sm:text-lg font-black text-emerald-800 block leading-tight">
              {totalAssetsWithMaintenance}/{assets.length}
            </span>
            <span className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-wider block mt-0.5">
              Aset Dirawat
            </span>
          </div>
        </div>
      </div>

      {/* Horizontal Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'routine_service', label: 'Servis Rutin' },
          { id: 'oil_change', label: 'Ganti Oli' },
          { id: 'ac', label: 'Cuci/Servis AC' },
          { id: 'tire', label: 'Ban & Velg' },
          { id: 'battery', label: 'Aki & Baterai' },
          { id: 'brake', label: 'Kampas Rem' },
          { id: 'repair', label: 'Perbaikan' },
        ].map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setSelectedType(f.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
              selectedType === f.id
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs font-bold'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Main Focus: Maintenance History Records */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-10 text-center space-y-3 shadow-2xs">
          <Wrench className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-800 text-base">
            Tidak ada riwayat perawatan
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Catat pekerjaan servis rutin atau ganti oli pertama Anda untuk mulai memantau riwayat perawatan.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredLogs.map((log, index) => (
            <div
              key={log.maintenance_id || (log as any).id || `maint-log-${index}`}
              className="bg-white rounded-2xl border border-stone-200 p-3.5 sm:p-4 hover:border-emerald-600/60 transition-all shadow-2xs space-y-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onSelectAsset(log.asset)}
                      className="text-xs sm:text-sm font-extrabold text-stone-900 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <Wrench className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span className="truncate">{log.assetName}</span>
                    </button>
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider bg-emerald-100/80 text-emerald-900 border border-emerald-200/80 rounded-md shrink-0">
                      {getTypeLabel(log.type)}
                    </span>
                  </div>

                  <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                    {formatDate(log.date)} {log.mileage ? `· ${log.mileage.toLocaleString('id-ID')} km` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-xs sm:text-sm text-stone-900 bg-stone-50 px-2.5 py-1 rounded-xl border border-stone-200/80">
                    {formatRupiah(log.cost)}
                  </span>
                  {log.asset && (
                    <button
                      type="button"
                      onClick={() => onSelectAsset(log.asset)}
                      className="px-2.5 py-1 text-xs font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail Aset</span>
                    </button>
                  )}
                </div>
              </div>

              {(log.notes || log.provider) && (
                <div className="pt-2 border-t border-stone-100 space-y-0.5 text-xs">
                  {log.notes && <p className="text-stone-700 font-medium">{log.notes}</p>}
                  {log.provider && (
                    <p className="text-stone-400 text-[11px]">
                      Penyedia / Bengkel: <span className="font-bold text-stone-600">{log.provider}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
};

