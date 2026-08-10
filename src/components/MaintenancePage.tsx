import React, { useState } from 'react';
import { Asset, MaintenanceType } from '../types';
import { formatRupiah, formatDate } from '../lib/utils';
import { Wrench, Plus, Filter, Calendar, Car, Laptop, Box } from 'lucide-react';

interface MaintenancePageProps {
  assets: Asset[];
  onAddMaintenance: () => void;
  onSelectAsset: (asset: Asset) => void;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({
  assets,
  onAddMaintenance,
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

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Pusat Riwayat Perawatan & Servis
          </h2>
          <p className="text-xs font-medium text-stone-600 mt-0.5">
            Log lengkap perbaikan, ganti oli, sparepart, dan biaya servis aset Anda
          </p>
        </div>

        <button
          type="button"
          onClick={onAddMaintenance}
          className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Servis</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mb-1">Total Catatan Servis</span>
          <span className="text-2xl font-black text-stone-900">{filteredLogs.length}</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mb-1">Total Pengeluaran Servis</span>
          <span className="text-2xl font-black text-emerald-900">{formatRupiah(totalCost)}</span>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-stone-200 shadow-2xs">
          <span className="text-xs text-stone-500 font-bold uppercase tracking-wider block mb-1">Aset Terawat</span>
          <span className="text-2xl font-black text-emerald-800">
            {assets.filter((a) => a.maintenance_records && a.maintenance_records.length > 0).length} / {assets.length}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'all', label: 'Semua Jenis' },
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
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
              selectedType === f.id
                ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs font-bold'
                : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline Feed */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3 shadow-2xs">
          <Wrench className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-800 text-base">
            Tidak ada riwayat perawatan
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Catat pekerjaan servis rutin atau ganti oli pertama Anda untuk mulai memantau riwayat perawatan.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 shadow-2xs">
          <div className="relative pl-6 border-l-2 border-stone-200 space-y-6">
            {filteredLogs.map((log, index) => (
              <div key={log.maintenance_id || (log as any).id || `maint-log-${index}`} className="relative group">
                <div className="absolute -left-[31px] top-1.5 w-3.5 h-3.5 rounded-full bg-emerald-700 ring-4 ring-white" />

                <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200 hover:border-emerald-600 transition-all space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-md">
                          {log.type.replace('_', ' ')}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectAsset(log.asset)}
                          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                        >
                          {log.assetName}
                        </button>
                      </div>
                      <span className="text-[11px] text-stone-600 font-medium block pt-1">
                        Tanggal: <strong className="text-stone-800">{formatDate(log.date)}</strong>
                        {log.mileage ? ` • Odometer: ${log.mileage.toLocaleString('id-ID')} km` : ''}
                      </span>
                    </div>

                    <span className="font-black text-base text-stone-900">
                      {formatRupiah(log.cost)}
                    </span>
                  </div>

                  {log.notes && (
                    <p className="text-xs text-stone-800 font-medium pt-1">
                      {log.notes}
                    </p>
                  )}

                  {log.provider && (
                    <p className="text-[11px] text-stone-500">
                      Bengkel / Penyedia: <span className="font-semibold text-stone-800">{log.provider}</span>
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
