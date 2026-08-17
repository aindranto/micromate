import React from 'react';
import { Asset } from '../types';
import { TCOAnalyticsDashboard } from './tco/TCOAnalyticsDashboard';

interface CostAnalyticsPageProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
}

export const CostAnalyticsPage: React.FC<CostAnalyticsPageProps> = ({
  assets,
  onSelectAsset,
}) => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-stone-900 tracking-tight">
          Analisis Biaya & Total Cost of Ownership (TCO)
        </h2>
        <p className="text-xs font-medium text-stone-600 mt-0.5">
          Evaluasi total investasi pembelian, biaya servis berkala, pajak, dan akumulasi pengeluaran operasional aset Anda
        </p>
      </div>

      {/* Pure Analytics Engine & Dashboard Component */}
      <TCOAnalyticsDashboard assets={assets} />
    </div>
  );
};
