import React, { useState, useMemo } from 'react';
import { FleetAttentionDashboardViewModel, AssetAttentionViewModel } from '../../types';
import { AssetAttentionCard } from './AssetAttentionCard';
import { 
  Package, 
  XOctagon, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  HelpCircle,
  ListFilter
} from 'lucide-react';

interface FleetAttentionOverviewProps {
  dashboardVm: FleetAttentionDashboardViewModel;
  onExecuteAction: (actionCode: string, contextData?: Record<string, any>) => void;
}

type AttentionFilter = 'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'NORMAL' | 'INSUFFICIENT';

/**
 * Phase 3F-5B React UI Primitives: FleetAttentionOverview
 * Composes the metrics bars and filtered asset grids.
 * Enforces zero inline decision logic - purely renders VM.
 */
export const FleetAttentionOverview: React.FC<FleetAttentionOverviewProps> = ({
  dashboardVm,
  onExecuteAction
}) => {
  const [activeFilter, setActiveFilter] = useState<AttentionFilter>('ALL');

  const {
    generated_at_formatted,
    total_assets_evaluated,
    critical_attention_count,
    high_attention_count,
    medium_attention_count,
    normal_attention_count,
    insufficient_data_count,
    asset_views,
    top_priority_assets
  } = dashboardVm;

  // Filter logic
  const filteredAssetViews = useMemo(() => {
    if (activeFilter === 'ALL') return asset_views;
    if (activeFilter === 'CRITICAL') return asset_views.filter(v => v.attention_level === 'CRITICAL' && v.data_state === 'SUFFICIENT');
    if (activeFilter === 'HIGH') return asset_views.filter(v => v.attention_level === 'HIGH' && v.data_state === 'SUFFICIENT');
    if (activeFilter === 'MEDIUM') return asset_views.filter(v => v.attention_level === 'MEDIUM' && v.data_state === 'SUFFICIENT');
    if (activeFilter === 'NORMAL') {
      return asset_views.filter(v => (v.attention_level === 'LOW' || v.attention_level === 'INFO') && v.data_state === 'SUFFICIENT');
    }
    if (activeFilter === 'INSUFFICIENT') {
      return asset_views.filter(v => v.data_state === 'EMPTY' || v.data_state === 'INSUFFICIENT');
    }
    return asset_views;
  }, [activeFilter, asset_views]);

  return (
    <div className="space-y-6" data-testid="fleet-attention-overview">
      {/* Fleet Summary Top Metric Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 sm:gap-4" data-testid="fleet-metrics-bar">
        {/* Total evaluated */}
        <div className="bg-white border border-stone-200 rounded-xl p-4 flex items-center gap-3.5 shadow-2xs">
          <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">Total Aset</span>
            <span className="text-xl font-extrabold text-stone-900 block font-mono" data-testid="metric-total-evaluated">
              {total_assets_evaluated}
            </span>
          </div>
        </div>

        {/* Critical */}
        <button
          type="button"
          onClick={() => setActiveFilter('CRITICAL')}
          className={`text-left bg-white border rounded-xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-rose-400 transition-colors cursor-pointer w-full ${
            activeFilter === 'CRITICAL' ? 'ring-2 ring-rose-500 border-rose-500 bg-rose-50/5' : 'border-stone-200'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <XOctagon className="w-5 h-5 text-rose-700" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">Kritis</span>
            <span className="text-xl font-extrabold text-rose-700 block font-mono" data-testid="metric-critical">
              {critical_attention_count}
            </span>
          </div>
        </button>

        {/* High */}
        <button
          type="button"
          onClick={() => setActiveFilter('HIGH')}
          className={`text-left bg-white border rounded-xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-amber-400 transition-colors cursor-pointer w-full ${
            activeFilter === 'HIGH' ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/5' : 'border-stone-200'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">Tinggi</span>
            <span className="text-xl font-extrabold text-amber-700 block font-mono" data-testid="metric-high">
              {high_attention_count}
            </span>
          </div>
        </button>

        {/* Medium / Normal */}
        <button
          type="button"
          onClick={() => setActiveFilter('NORMAL')}
          className={`text-left bg-white border rounded-xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-emerald-400 transition-colors cursor-pointer w-full ${
            activeFilter === 'NORMAL' ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/5' : 'border-stone-200'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">Normal</span>
            <span className="text-xl font-extrabold text-emerald-700 block font-mono" data-testid="metric-normal">
              {normal_attention_count}
            </span>
          </div>
        </button>

        {/* Insufficient Data */}
        <button
          type="button"
          onClick={() => setActiveFilter('INSUFFICIENT')}
          className={`text-left bg-white border rounded-xl p-4 flex items-center gap-3.5 shadow-2xs hover:border-stone-400 transition-colors cursor-pointer w-full col-span-2 md:col-span-1 ${
            activeFilter === 'INSUFFICIENT' ? 'ring-2 ring-stone-500 border-stone-500 bg-stone-50' : 'border-stone-200'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5 text-stone-600" />
          </div>
          <div>
            <span className="text-[10px] text-stone-400 block font-bold uppercase tracking-wider">Inkomplet</span>
            <span className="text-xl font-extrabold text-stone-600 block font-mono" data-testid="metric-insufficient">
              {insufficient_data_count}
            </span>
          </div>
        </button>
      </div>

      {/* Top Priority Warning Banner */}
      {top_priority_assets.length > 0 && activeFilter === 'ALL' && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center shrink-0 text-rose-700">
            <XOctagon className="w-4 h-4" />
          </div>
          <div className="flex-1 space-y-0.5">
            <h4 className="text-xs font-bold text-rose-900 uppercase tracking-tight">Tindakan Segera Diperlukan</h4>
            <p className="text-xs text-rose-700/90 leading-relaxed">
              Terdapat <strong>{top_priority_assets.length} aset</strong> dengan tingkat perhatian kritis atau tinggi. Sinyal pemicu di bawah telah diverifikasi secara deterministik oleh kebijakan sistem.
            </p>
          </div>
        </div>
      )}

      {/* Grid Header & Interactive Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-stone-100">
        <div>
          <h3 className="text-sm font-extrabold text-stone-800 uppercase tracking-wider flex items-center gap-2">
            <ListFilter className="w-4 h-4 text-stone-400" />
            <span>Daftar Evaluasi Perhatian ({filteredAssetViews.length})</span>
          </h3>
          <p className="text-[11px] text-stone-400 mt-0.5 font-mono">
            Terakhir diperbarui: {generated_at_formatted}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 bg-stone-100 p-1 rounded-xl w-fit border border-stone-200">
          {(['ALL', 'CRITICAL', 'HIGH', 'NORMAL', 'INSUFFICIENT'] as AttentionFilter[]).map((filter) => {
            let label = 'Semua';
            if (filter === 'CRITICAL') label = '🚨 Kritis';
            if (filter === 'HIGH') label = '⚠️ Tinggi';
            if (filter === 'NORMAL') label = '🟢 Normal';
            if (filter === 'INSUFFICIENT') label = '⚙️ Inkomplet';

            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-white text-stone-900 shadow-3xs font-extrabold' 
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Cards */}
      {filteredAssetViews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="attention-cards-grid">
          {filteredAssetViews.map((vm) => (
            <AssetAttentionCard 
              key={vm.asset_id} 
              vm={vm} 
              onExecuteAction={onExecuteAction}
            />
          ))}
        </div>
      ) : (
        <div 
          className="bg-white border border-stone-200 rounded-2xl py-12 px-6 text-center space-y-2 shadow-2xs"
          data-testid="attention-empty-state"
        >
          <div className="w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center mx-auto text-stone-400">
            <CheckCircle2 className="w-6 h-6 text-stone-400" />
          </div>
          <h4 className="text-sm font-bold text-stone-800">Tidak ada aset dalam filter ini</h4>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            Seluruh aset dalam grup filter ini berada dalam kondisi aman atau belum memiliki sinyal perhatian aktif yang terekam.
          </p>
        </div>
      )}
    </div>
  );
};
