import React from 'react';
import { Asset } from '../types';
import { 
  getNeedsAttentionItems, 
  formatRupiah, 
  formatDate, 
  calculateAssetTCO,
  formatImageUrl,
  getAssetMainPhoto
} from '../lib/utils';
import { 
  AlertTriangle, 
  Laptop, 
  Car, 
  Home, 
  Box, 
  Plus, 
  Wrench, 
  Bell, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  ChevronRight,
  Sparkles,
  Eye
} from 'lucide-react';

interface DashboardProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onQuickAddAsset: () => void;
  onQuickAddMaintenance: () => void;
  onQuickAddReminder: () => void;
  onNavigateTab: (tab: string) => void;
  onCategorySelect?: (category: string) => void;
  onCompleteReminder: (reminderId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  assets,
  onSelectAsset,
  onQuickAddAsset,
  onQuickAddMaintenance,
  onQuickAddReminder,
  onNavigateTab,
  onCategorySelect,
  onCompleteReminder,
}) => {
  // Calculate summary counts
  const devicesCount = assets.filter((a) => a.category === 'device').length;
  const vehiclesCount = assets.filter((a) => a.category === 'vehicle').length;
  const homeCount = assets.filter((a) => a.category === 'home').length;
  const otherCount = assets.filter((a) => ['camera', 'gaming', 'other'].includes(a.category)).length;

  // Calculate Total Cost of Ownership across all active assets
  const totalTCO = assets.reduce((sum, a) => {
    const tco = calculateAssetTCO(a);
    return sum + tco.totalCostOfOwnership;
  }, 0);

  // Needs Attention items
  const attentionItems = getNeedsAttentionItems(assets);

  // Recent maintenance logs across all assets
  const recentMaintenanceLogs = assets
    .flatMap((a) => 
      (a.maintenance_records || []).map((m) => ({
        ...m,
        assetName: a.name,
        assetCategory: a.category,
        assetId: a.asset_id
      }))
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Simplified Welcome Banner (M3 Primary Surface Container) */}
      <div className="bg-emerald-900 text-white rounded-3xl p-5 sm:p-7 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-white">
            Ringkasan Aset Hari Ini
          </h2>
          <p className="text-emerald-100/90 text-xs sm:text-sm font-medium">
            {attentionItems.length > 0 
              ? `Terdapat ${attentionItems.length} poin perhatian terkait garansi, servis, atau pajak.`
              : 'Semua aset dan jadwal perawatan Anda terkelola dengan baik.'}
          </p>
        </div>

        {/* Quick Action Buttons (M3 Filled & Tonal Buttons) */}
        <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto shrink-0">
          <button
            type="button"
            onClick={onQuickAddAsset}
            className="flex items-center justify-center gap-1.5 bg-white text-emerald-950 hover:bg-emerald-50 font-bold px-3.5 sm:px-4 py-2.5 rounded-full text-[11px] sm:text-xs shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-800 shrink-0" />
            <span>Aset Baru</span>
          </button>

          <button
            type="button"
            onClick={onQuickAddMaintenance}
            className="flex items-center justify-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold px-3 sm:px-4 py-2.5 rounded-full text-[11px] sm:text-xs border border-white/20 transition-all cursor-pointer active:scale-95"
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
            <span>Servis</span>
          </button>

          <button
            type="button"
            onClick={onQuickAddReminder}
            className="flex items-center justify-center gap-1.5 bg-emerald-800/80 hover:bg-emerald-800 text-white font-bold px-3 sm:px-4 py-2.5 rounded-full text-[11px] sm:text-xs border border-white/20 transition-all cursor-pointer active:scale-95"
          >
            <Bell className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Reminder</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Overview (M3 Container Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Total Devices */}
        <div 
          onClick={() => onCategorySelect ? onCategorySelect('device') : onNavigateTab('assets')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs hover:border-emerald-600/70 hover:shadow-md cursor-pointer transition-all duration-200 min-w-0"
        >
          <div className="flex items-center justify-between mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-stone-600 truncate">Devices</span>
            <div className="p-2 rounded-2xl bg-stone-100/80 text-stone-800 shrink-0">
              <Laptop className="w-4 h-4 text-emerald-800" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-stone-900">
            {devicesCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1 truncate">Laptop, Phone, Tablet</p>
        </div>

        {/* Vehicles */}
        <div 
          onClick={() => onCategorySelect ? onCategorySelect('vehicle') : onNavigateTab('assets')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs hover:border-emerald-600/70 hover:shadow-md cursor-pointer transition-all duration-200 min-w-0"
        >
          <div className="flex items-center justify-between mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-stone-600 truncate">Vehicles</span>
            <div className="p-2 rounded-2xl bg-stone-100/80 text-stone-800 shrink-0">
              <Car className="w-4 h-4 text-emerald-800" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-stone-900">
            {vehiclesCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1 truncate">Motor & Mobil</p>
        </div>

        {/* Home Appliances */}
        <div 
          onClick={() => onCategorySelect ? onCategorySelect('home') : onNavigateTab('assets')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs hover:border-emerald-600/70 hover:shadow-md cursor-pointer transition-all duration-200 min-w-0"
        >
          <div className="flex items-center justify-between mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-stone-600 truncate">Home</span>
            <div className="p-2 rounded-2xl bg-stone-100/80 text-stone-800 shrink-0">
              <Home className="w-4 h-4 text-emerald-800" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-stone-900">
            {homeCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1 truncate">AC, TV, Elektronik</p>
        </div>

        {/* Other Assets */}
        <div 
          onClick={() => onCategorySelect ? onCategorySelect('other') : onNavigateTab('assets')}
          className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs hover:border-emerald-600/70 hover:shadow-md cursor-pointer transition-all duration-200 min-w-0"
        >
          <div className="flex items-center justify-between mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-stone-600 truncate">Kamera & Lainnya</span>
            <div className="p-2 rounded-2xl bg-stone-100/80 text-stone-800 shrink-0">
              <Box className="w-4 h-4 text-emerald-800" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-stone-900">
            {otherCount}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1 truncate">Hobi & Aksesori</p>
        </div>

        {/* Total Cost of Ownership */}
        <div 
          onClick={() => onNavigateTab('expenses')}
          className="col-span-2 md:col-span-1 bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-2xs hover:border-emerald-600/70 hover:shadow-md cursor-pointer transition-all duration-200 min-w-0"
        >
          <div className="flex items-center justify-between mb-2 gap-1">
            <span className="text-[11px] sm:text-xs font-bold text-stone-600 truncate">Total Nilai & Biaya</span>
            <div className="p-2 rounded-2xl bg-emerald-100/80 text-emerald-900 shrink-0">
              <TrendingUp className="w-4 h-4 text-emerald-800" />
            </div>
          </div>
          <div className="text-base sm:text-lg font-bold text-stone-900 truncate">
            {formatRupiah(totalTCO)}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1 truncate">Aset + Total Servis</p>
        </div>

      </div>

      {/* "Needs Attention" Section (M3 Container Card) */}
      <div className="bg-white rounded-3xl border border-stone-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-stone-900 text-base sm:text-lg truncate">
                Needs Attention
              </h3>
              <p className="text-xs text-stone-500 font-medium truncate hidden xs:block">
                Aset yang membutuhkan perawatan, pembayaran pajak, atau perhatian garansi
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('reminders')}
            className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer shrink-0 self-end xs:self-center"
          >
            <span>Semua Reminder</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {attentionItems.length === 0 ? (
          <div className="py-6 sm:py-8 text-center bg-stone-50/80 rounded-2xl border border-dashed border-stone-200 space-y-2 px-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
            <p className="text-sm font-bold text-stone-800">
              Tidak ada agenda mendesak
            </p>
            <p className="text-xs text-stone-500 font-medium max-w-sm mx-auto">
              Semua garansi masih berlaku dan belum ada jadwal service atau pajak STNK yang jatuh tempo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {attentionItems.map((item, index) => {
              const targetAsset = assets.find((a) => a.asset_id === item.assetId);
              const days = item.daysDiff;
              
              // Formatting relative time text
              let relativeText = '';
              if (days !== undefined && days !== null) {
                if (days < 0) {
                  relativeText = `TERLAMBAT ${Math.abs(days)} HARI`;
                } else if (days === 0) {
                  relativeText = 'HARI INI!';
                } else {
                  relativeText = `${days} HARI LAGI`;
                }
              }

              return (
                <div
                  key={`dash-att-${item.id || ''}-${index}`}
                  className={`p-4 rounded-2xl border flex flex-col xs:flex-row xs:items-center justify-between gap-3 transition-all min-w-0 ${
                    item.isOverdue
                      ? 'bg-rose-50/80 border-rose-200/80 shadow-2xs'
                      : 'bg-amber-50/80 border-amber-200/80 shadow-2xs'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 text-[9px] sm:text-[10px] font-extrabold tracking-wide uppercase rounded-full border ${
                        item.isOverdue
                          ? 'bg-rose-600 text-white border-rose-700'
                          : 'bg-amber-500 text-white border-amber-600'
                      }`}>
                        {item.isOverdue ? '🔴 Overdue' : '🟠 Mendatang'}
                      </span>
                      {relativeText && (
                        <span className={`text-[10px] sm:text-[11px] font-bold ${
                          item.isOverdue ? 'text-rose-700' : 'text-amber-900'
                        }`}>
                          • {relativeText}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                      {item.title}
                    </h4>

                    <div className="flex items-center gap-2 text-[11px] sm:text-xs text-stone-600 truncate">
                      {targetAsset ? (
                        <button
                          type="button"
                          onClick={() => onSelectAsset(targetAsset)}
                          className="font-extrabold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer flex items-center gap-1 truncate"
                          title="Lihat Detail Aset"
                        >
                          <span>{item.assetName}</span>
                          <ChevronRight className="w-3 h-3 shrink-0" />
                        </button>
                      ) : (
                        <span className="font-semibold text-stone-700 truncate">
                          {item.assetName}
                        </span>
                      )}
                      {item.dueDate && (
                        <span className="text-stone-500 font-medium flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" />
                          {formatDate(item.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end xs:self-center">
                    {targetAsset && (
                      <button
                        type="button"
                        onClick={() => onSelectAsset(targetAsset)}
                        className="px-3.5 py-2 text-xs font-bold rounded-full bg-emerald-900 text-white hover:bg-emerald-950 transition-all shadow-2xs whitespace-nowrap cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Detail Aset</span>
                      </button>
                    )}
                    {(item.category === 'maintenance' || item.category === 'custom') && (
                      <button
                        type="button"
                        onClick={() => onCompleteReminder(item.id)}
                        className="px-3 py-2 text-xs font-bold rounded-full bg-white text-emerald-900 border border-emerald-300/80 hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        Selesaikan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Assets & Recent Maintenance Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Registered Assets Quick List */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base sm:text-lg">
              Aset Terdaftar ({assets.length})
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('assets')}
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {assets.slice(0, 4).map((asset, index) => {
              const mainPhoto = getAssetMainPhoto(asset);
              return (
                <div
                  key={asset.asset_id || `dash-ast-${index}`}
                  onClick={() => onSelectAsset(asset)}
                  className="p-3 sm:p-3.5 rounded-xl border border-stone-200/80 hover:bg-stone-50 hover:border-emerald-200 cursor-pointer transition-all flex items-center justify-between gap-2.5 group min-w-0"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                      {mainPhoto ? (
                        <img src={mainPhoto} alt={asset.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : (
                        <Box className="w-5 h-5 text-stone-400" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-stone-900 group-hover:text-emerald-600 transition-colors truncate">
                        {asset.name}
                      </h4>
                      <p className="text-[11px] sm:text-xs text-stone-500 truncate">
                        {asset.brand || 'No Brand'} • {asset.subcategory || asset.category}
                        {asset.serial_number ? ` • S/N: ${asset.serial_number}` : ''}
                        {asset.vehicle_details?.license_plate ? ` • ${asset.vehicle_details.license_plate}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs sm:text-sm font-bold text-stone-800 block">
                      {formatRupiah(asset.purchase_price)}
                    </span>
                    <span className="text-[10px] text-stone-400 block">
                      {formatDate(asset.purchase_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Maintenance Feed */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-stone-900 text-base sm:text-lg">
              Riwayat Perawatan Terbaru
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTab('maintenance')}
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Log</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentMaintenanceLogs.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              Belum ada riwayat perbaikan atau servis yang dicatat.
            </div>
          ) : (
            <div className="relative pl-4 border-l-2 border-stone-200 space-y-4">
              {recentMaintenanceLogs.map((log, index) => {
                const targetAsset = assets.find((a) => a.asset_id === log.assetId);
                return (
                  <div key={log.maintenance_id || (log as any).id || `dash-maint-${index}`} className="relative group">
                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                    
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold text-stone-400">
                            {formatDate(log.date)}
                          </span>
                          {targetAsset && (
                            <button
                              type="button"
                              onClick={() => onSelectAsset(targetAsset)}
                              className="text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer flex items-center gap-1"
                              title="Lihat Detail Aset"
                            >
                              <span>• {log.assetName}</span>
                              <Eye className="w-3 h-3 text-emerald-600" />
                            </button>
                          )}
                        </div>
                        <h4 className="text-sm font-bold text-stone-900 capitalize">
                          {log.type.replace('_', ' ')}
                        </h4>
                        <p className="text-xs text-stone-600 line-clamp-1">
                          {log.notes || 'Pekerjaan rutin teratur'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 shrink-0">
                          {formatRupiah(log.cost)}
                        </span>
                        {targetAsset && (
                          <button
                            type="button"
                            onClick={() => onSelectAsset(targetAsset)}
                            className="px-2 py-1 text-[11px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Lihat Detail Aset"
                          >
                            <Eye className="w-3 h-3 text-emerald-700" />
                            <span>Detail</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
