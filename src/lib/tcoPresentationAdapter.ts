/**
 * MICROMATE PHASE 3E-2A: TCO ANALYTICS PRESENTATION ADAPTER
 * 
 * Scope: Presentation State Adapter mapping raw TCOAnalyticsReport into UI-ready
 * formatted strings, badge color tones, progress percentages, and accessibility labels.
 * 
 * Invariants:
 * UI-01: UI does not calculate TCO or perform financial arithmetic.
 * UI-02: UI does not write or mutate transaction/domain data.
 * UI-03: UI does not invoke Drive Gateway or storage handlers.
 * UI-04: UI strictly consumes TCOAnalyticsReport and formatted presentation objects.
 * UI-05: Time range filtering changes read state without triggering domain/sync mutations.
 */

import { TCOAnalyticsReport, TCOSummaryMetrics, TCOCategoryBreakdown, TCOMonthlyPoint, TCOTimeRange } from '../types';

export interface FormattedSummaryMetrics {
  formattedTotalCost: string;
  totalCostTooltipLabel: string;
  formattedPurchasePrice: string | null;
  formattedOperationalCost: string;
  formattedMonthlyAverage: string;
  formattedCostPerKm: string | null;
  formattedCurrentMonthCost: string;
  formattedPreviousMonthCost: string;
  formattedCostTrendPercentage: string | null;
  trendDirection: 'INCREASE' | 'DECREASE' | 'FLAT' | 'UNKNOWN';
  costTrendTone: 'positive' | 'negative' | 'neutral';
  formattedActivePeriod: string;
  formattedFactsCountLabel: string;
  hasExcludedFacts: boolean;
  excludedFactsCount: number;
}

export interface FormattedCategoryItem {
  category: string;
  label: string;
  formattedAmount: string;
  percentage: number;
  percentageLabel: string;
  recordCountLabel: string;
  colorClass: string;
}

export interface FormattedMonthlyPoint {
  yearMonth: string;
  label: string;
  formattedTotalAmount: string;
  formattedMaintenanceAmount: string;
  formattedTaxAmount: string;
  formattedFuelAmount: string;
  formattedOtherAmount: string;
  heightPercentage: number;
}

export interface TCOViewModel {
  assetId: string;
  assetName: string;
  timeRange: TCOTimeRange;
  timeRangeLabel: string;
  formattedSummary: FormattedSummaryMetrics;
  categoryItems: FormattedCategoryItem[];
  monthlyPoints: FormattedMonthlyPoint[];
  hasData: boolean;
  isEmptyState: boolean;
}

/**
 * Currency formatter helper using IDR locale.
 */
export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return 'Rp 0';
  }
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Returns human-readable label for time range option.
 */
export function getTimeRangeLabel(range: TCOTimeRange): string {
  switch (range) {
    case '3M': return '3 Bulan Terakhir';
    case '6M': return '6 Bulan Terakhir';
    case '1Y': return '1 Tahun Terakhir';
    case 'ALL': return 'Semua Riwayat';
    default: return 'Semua Riwayat';
  }
}

/**
 * Maps category code to Tailwind visual color theme.
 */
export function getCategoryColorClass(category: string): string {
  switch (category) {
    case 'MAINTENANCE': return 'bg-amber-500 text-amber-500';
    case 'TAX_REGISTRATION': return 'bg-blue-500 text-blue-500';
    case 'FUEL': return 'bg-emerald-500 text-emerald-500';
    case 'PURCHASE': return 'bg-purple-500 text-purple-500';
    case 'ACCESSORY': return 'bg-indigo-500 text-indigo-500';
    default: return 'bg-slate-400 text-slate-400';
  }
}

/**
 * Pure Presentation State Adapter.
 * Converts TCOAnalyticsReport into immutable, formatted TCOViewModel.
 */
export function adaptTCOReportToViewModel(report: TCOAnalyticsReport): TCOViewModel {
  const summary: TCOSummaryMetrics = report.summary;

  // Determine trend direction and tone
  let trendDirection: 'INCREASE' | 'DECREASE' | 'FLAT' | 'UNKNOWN' = 'UNKNOWN';
  let costTrendTone: 'positive' | 'negative' | 'neutral' = 'neutral';

  if (summary.cost_trend_percentage !== null) {
    if (summary.cost_trend_percentage > 0) {
      trendDirection = 'INCREASE';
      costTrendTone = 'negative'; // Cost increase is negative for budget
    } else if (summary.cost_trend_percentage < 0) {
      trendDirection = 'DECREASE';
      costTrendTone = 'positive'; // Cost decrease is positive for budget
    } else {
      trendDirection = 'FLAT';
      costTrendTone = 'neutral';
    }
  }

  // Format Summary Metrics
  const formattedSummary: FormattedSummaryMetrics = {
    formattedTotalCost: formatRupiah(summary.total_cost),
    totalCostTooltipLabel: 'Total biaya akumulatif yang tercatat (Harga Pembelian + Biaya Operasional & Servis)',
    formattedPurchasePrice: summary.purchase_price !== null ? formatRupiah(summary.purchase_price) : null,
    formattedOperationalCost: formatRupiah(summary.operational_cost),
    formattedMonthlyAverage: `${formatRupiah(summary.monthly_average_cost)} / bln`,
    formattedCostPerKm: summary.cost_per_km !== null ? `${formatRupiah(summary.cost_per_km)} / km` : null,
    formattedCurrentMonthCost: formatRupiah(summary.current_month_cost),
    formattedPreviousMonthCost: formatRupiah(summary.previous_month_cost),
    formattedCostTrendPercentage: summary.cost_trend_percentage !== null 
      ? `${summary.cost_trend_percentage > 0 ? '+' : ''}${summary.cost_trend_percentage}%` 
      : null,
    trendDirection,
    costTrendTone,
    formattedActivePeriod: `${summary.active_period_months} Bulan`,
    formattedFactsCountLabel: `Berdasarkan ${summary.included_facts_count} catatan biaya`,
    hasExcludedFacts: summary.excluded_facts_count > 0,
    excludedFactsCount: summary.excluded_facts_count
  };

  // Format Category Items
  const categoryItems: FormattedCategoryItem[] = report.category_breakdown.map((item: TCOCategoryBreakdown) => ({
    category: item.category,
    label: item.label,
    formattedAmount: formatRupiah(item.total_amount),
    percentage: item.percentage,
    percentageLabel: `${item.percentage}%`,
    recordCountLabel: `${item.record_count} catatan`,
    colorClass: getCategoryColorClass(item.category)
  }));

  // Calculate max monthly total for relative height normalization in charts
  const maxMonthlyTotal = Math.max(...report.monthly_trend.map(p => p.total_amount), 1);

  // Format Monthly Trend Points
  const monthlyPoints: FormattedMonthlyPoint[] = report.monthly_trend.map((point: TCOMonthlyPoint) => {
    const heightPct = Math.round((point.total_amount / maxMonthlyTotal) * 100);
    return {
      yearMonth: point.year_month,
      label: point.label,
      formattedTotalAmount: formatRupiah(point.total_amount),
      formattedMaintenanceAmount: formatRupiah(point.maintenance_amount),
      formattedTaxAmount: formatRupiah(point.tax_amount),
      formattedFuelAmount: formatRupiah(point.fuel_amount),
      formattedOtherAmount: formatRupiah(point.other_amount),
      heightPercentage: Math.max(heightPct, point.total_amount > 0 ? 8 : 2) // Minimum 8% height for visibility if > 0
    };
  });

  const hasData = summary.included_facts_count > 0 || summary.total_cost > 0;

  return {
    assetId: report.asset_id,
    assetName: report.asset_name,
    timeRange: report.time_range,
    timeRangeLabel: getTimeRangeLabel(report.time_range),
    formattedSummary,
    categoryItems,
    monthlyPoints,
    hasData,
    isEmptyState: !hasData
  };
}
