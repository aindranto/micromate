import React, { useState, useMemo } from 'react';
import { Asset, TCOTimeRange } from '../../types';
import { computeTCOAnalyticsReport } from '../../lib/tcoAnalyticsEngine';
import { adaptTCOReportToViewModel, TCOViewModel } from '../../lib/tcoPresentationAdapter';
import { TCOHeader } from './TCOHeader';
import { TCOKPIGrid } from './TCOKPIGrid';
import { TCOCategoryBreakdown } from './TCOCategoryBreakdown';
import { TCOMonthlyTrendChart } from './TCOMonthlyTrendChart';
import { TCODataQualityFooter } from './TCODataQualityFooter';
import { FolderOpen } from 'lucide-react';

interface TCOAnalyticsDashboardProps {
  assets: Asset[];
  initialAssetId?: string;
}

export const TCOAnalyticsDashboard: React.FC<TCOAnalyticsDashboardProps> = ({
  assets,
  initialAssetId
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    initialAssetId || (assets.length > 0 ? assets[0].asset_id : 'ALL_ASSETS')
  );
  const [timeRange, setTimeRange] = useState<TCOTimeRange>('ALL');

  // Find target asset or construct aggregate fleet asset
  const targetAsset: Asset | undefined = useMemo(() => {
    if (selectedAssetId === 'ALL_ASSETS' || assets.length === 0) {
      if (assets.length === 0) return undefined;
      // Aggregate all assets into a fleet view
      return {
        asset_id: 'FLEET-ALL',
        workspace_id: assets[0].workspace_id,
        category: 'tool',
        name: 'Semua Aset (Fleet Total)',
        status: 'active',
        purchase_price: assets.reduce((sum, a) => sum + (a.purchase_price || 0), 0),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        maintenance_records: assets.flatMap(a => a.maintenance_records || []),
        expenses: assets.flatMap(a => a.expenses || []),
        reminders: assets.flatMap(a => a.reminders || [])
      };
    }
    return assets.find(a => a.asset_id === selectedAssetId);
  }, [assets, selectedAssetId]);

  // Compute report from pure analytics engine and adapt to view model
  const viewModel: TCOViewModel | null = useMemo(() => {
    if (!targetAsset) return null;
    const report = computeTCOAnalyticsReport(targetAsset, { timeRange });
    return adaptTCOReportToViewModel(report);
  }, [targetAsset, timeRange]);

  if (!viewModel || assets.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto">
          <FolderOpen className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-stone-900">Belum Ada Data Aset</h3>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Tambahkan aset baru beserta data pembelian atau riwayat biaya untuk melihat analisis TCO mendalam.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <TCOHeader
        assets={assets}
        selectedAssetId={selectedAssetId}
        onSelectAsset={setSelectedAssetId}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
      />

      {/* KPI Grid */}
      <TCOKPIGrid metrics={viewModel.formattedSummary} />

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TCOCategoryBreakdown categories={viewModel.categoryItems} />
        <TCOMonthlyTrendChart monthlyPoints={viewModel.monthlyPoints} />
      </div>

      {/* Data Quality Footer */}
      <TCODataQualityFooter summary={viewModel.formattedSummary} />
    </div>
  );
};
