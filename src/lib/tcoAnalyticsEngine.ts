/**
 * MICROMATE PHASE 3E-1: ASSET COST INTELLIGENCE & TCO ANALYTICS ENGINE
 * 
 * Scope: Pure Functional Read-Model Analytics Engine for Total Cost of Ownership (TCO)
 * 
 * Invariants:
 * 1. Read-Only: Consumes canonical facts from Asset, Maintenance, Reminders, and Expenses.
 * 2. Zero Writes: Never modifies database state, historical records, or asset entities.
 * 3. Pure & Deterministic: TCO(Dataset_A) === TCO(Dataset_B) with money arithmetic.
 * 4. Missing Data Policy: Distinguishes 0 cost vs missing/invalid cost with diagnostic tracking.
 * 5. No Depreciation: Depreciation is set to NOT_AVAILABLE for 3E-1.
 */

import { 
  Asset, 
  MaintenanceRecord, 
  Expense, 
  Reminder, 
  TCOTimeRange, 
  TCOCostCategory, 
  TCOFactRecord, 
  TCOCategoryBreakdown, 
  TCOMonthlyPoint, 
  TCOSummaryMetrics, 
  TCOAnalyticsReport 
} from '../types';

// ============================================================================
// MONEY ARITHMETIC & SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitizes money input into deterministic integer minor units (Rupiah integer).
 * Eliminates floating point rounding drifts (e.g. 100000.00000000003 -> 100000).
 */
export function sanitizeMoneyAmount(val: unknown): { amount: number | null; error?: TCOFactRecord['exclusion_reason'] } {
  if (val === null || val === undefined || val === '') {
    return { amount: null, error: 'MISSING_AMOUNT' };
  }
  
  const num = Number(val);
  if (isNaN(num)) {
    return { amount: null, error: 'INVALID_AMOUNT_NAN' };
  }
  
  if (num < 0) {
    return { amount: null, error: 'NEGATIVE_AMOUNT' };
  }

  return { amount: Math.round(num) };
}

/**
 * Formats YYYY-MM or ISO string to canonical YYYY-MM key.
 */
export function formatYearMonthKey(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'UNKNOWN';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Formats YYYY-MM key to human-readable month label (e.g. "2026-01" -> "Jan 2026").
 */
export function formatYearMonthLabel(yearMonthKey: string): string {
  if (!/^\d{4}-\d{2}$/.test(yearMonthKey)) return yearMonthKey;
  const [year, monthStr] = yearMonthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const monthIdx = parseInt(monthStr, 10) - 1;
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${monthNames[monthIdx]} ${year}`;
  }
  return yearMonthKey;
}

// ============================================================================
// CANONICAL COST FACT ADAPTER
// ============================================================================

/**
 * Extracts and normalizes canonical cost facts from an Asset entity and its sub-records.
 * Pure functional — zero mutations to original input objects.
 */
export function extractCanonicalCostFacts(asset: Asset): TCOFactRecord[] {
  const facts: TCOFactRecord[] = [];
  const processedExpenseIds = new Set<string>();

  // 1. Purchase Cost Fact (if present)
  if (asset.purchase_price !== undefined) {
    const sanitized = sanitizeMoneyAmount(asset.purchase_price);
    facts.push({
      fact_id: `FACT-PURCHASE-${asset.asset_id}`,
      asset_id: asset.asset_id,
      source_type: 'PURCHASE',
      source_id: asset.asset_id,
      category: 'PURCHASE',
      title: 'Harga Pembelian Aset',
      amount: sanitized.amount ?? 0,
      date: asset.purchase_date || asset.created_at,
      valid: sanitized.amount !== null,
      exclusion_reason: sanitized.error
    });
  }

  // 2. Maintenance Records Facts
  if (Array.isArray(asset.maintenance_records)) {
    asset.maintenance_records.forEach((m: MaintenanceRecord, idx: number) => {
      if (m.deleted) return;
      const sanitized = sanitizeMoneyAmount(m.cost);
      
      // Track linked expense ID to prevent double counting
      if (m.expense_id) {
        processedExpenseIds.add(m.expense_id);
      }

      facts.push({
        fact_id: `FACT-MAINT-${m.maintenance_id || idx}`,
        asset_id: asset.asset_id,
        source_type: 'MAINTENANCE',
        source_id: m.maintenance_id || `m_${idx}`,
        category: 'MAINTENANCE',
        title: m.title || `Servis: ${m.type}`,
        amount: sanitized.amount ?? 0,
        date: m.date || m.created_at,
        mileage: m.mileage,
        valid: sanitized.amount !== null,
        exclusion_reason: sanitized.error
      });
    });
  }

  // 3. Operational Expense Facts (Excluding expenses already linked to maintenance)
  if (Array.isArray(asset.expenses)) {
    asset.expenses.forEach((e: Expense, idx: number) => {
      if (e.source_id && processedExpenseIds.has(e.source_id)) return;
      if (e.expense_id && processedExpenseIds.has(e.expense_id)) return;

      const sanitized = sanitizeMoneyAmount(e.amount);
      
      let category: TCOCostCategory = 'OTHER';
      if (e.type === 'maintenance' || e.type === 'repair' || e.source_type === 'MAINTENANCE') {
        category = 'MAINTENANCE';
      } else if (e.type === 'accessories' || e.source_type === 'ACCESSORY') {
        category = 'ACCESSORY';
      } else if (e.type === 'purchase' || e.source_type === 'PURCHASE') {
        category = 'PURCHASE';
      } else if (e.source_type === 'TAX') {
        category = 'TAX_REGISTRATION';
      }

      facts.push({
        fact_id: `FACT-EXPENSE-${e.expense_id || idx}`,
        asset_id: asset.asset_id,
        source_type: 'EXPENSE',
        source_id: e.expense_id || `e_${idx}`,
        category,
        title: e.description || `Pengeluaran: ${e.type}`,
        amount: sanitized.amount ?? 0,
        date: e.date,
        valid: sanitized.amount !== null,
        exclusion_reason: sanitized.error
      });
    });
  }

  // 4. Reminders / Tax Renewal Facts
  if (Array.isArray(asset.reminders)) {
    asset.reminders.forEach((r: Reminder, idx: number) => {
      if (r.deleted) return;
      const metadataCost = r.metadata?.cost ?? r.metadata?.renewal_cost;
      if (metadataCost !== undefined) {
        const sanitized = sanitizeMoneyAmount(metadataCost);
        const isTaxDoc = r.type === 'documents' || r.type === 'vehicle';
        
        facts.push({
          fact_id: `FACT-REMINDER-${r.reminder_id || idx}`,
          asset_id: asset.asset_id,
          source_type: 'REMINDER',
          source_id: r.reminder_id || `r_${idx}`,
          category: isTaxDoc ? 'TAX_REGISTRATION' : 'OTHER',
          title: r.title,
          amount: sanitized.amount ?? 0,
          date: r.due_date,
          valid: sanitized.amount !== null,
          exclusion_reason: sanitized.error
        });
      }
    });
  }

  return facts;
}

// ============================================================================
// TIME RANGE FILTER
// ============================================================================

/**
 * Filters canonical cost facts by date range relative to a reference date.
 */
export function filterFactsByTimeRange(
  facts: TCOFactRecord[], 
  timeRange: TCOTimeRange, 
  referenceDate: Date = new Date()
): TCOFactRecord[] {
  if (timeRange === 'ALL') return facts;

  const refTime = referenceDate.getTime();
  let monthsBack = 3;
  if (timeRange === '6M') monthsBack = 6;
  if (timeRange === '1Y') monthsBack = 12;

  const cutoffDate = new Date(referenceDate);
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
  const cutoffTime = cutoffDate.getTime();

  return facts.filter(f => {
    try {
      const factTime = new Date(f.date).getTime();
      return !isNaN(factTime) && factTime >= cutoffTime && factTime <= refTime + (24 * 60 * 60 * 1000);
    } catch {
      return false;
    }
  });
}

// ============================================================================
// MAIN PURE TCO ANALYTICS ENGINE
// ============================================================================

/**
 * Computes the complete TCO Analytics Report for an asset.
 * Pure functional & deterministic — zero database writes or entity mutations.
 */
export function computeTCOAnalyticsReport(
  asset: Asset, 
  options?: {
    timeRange?: TCOTimeRange;
    referenceDate?: Date;
  }
): TCOAnalyticsReport {
  const timeRange = options?.timeRange || 'ALL';
  const refDate = options?.referenceDate || new Date();
  
  const allFacts = extractCanonicalCostFacts(asset);
  const filteredFacts = filterFactsByTimeRange(allFacts, timeRange, refDate);

  const includedFacts = filteredFacts.filter(f => f.valid);
  const excludedFacts = filteredFacts.filter(f => !f.valid);

  // 1. Purchase Price Fact
  const purchaseFact = allFacts.find(f => f.category === 'PURCHASE' && f.valid);
  const purchasePrice = purchaseFact ? purchaseFact.amount : null;

  // 2. Operational Costs (Excludes Purchase Price)
  const operationalFacts = includedFacts.filter(f => f.category !== 'PURCHASE');
  const operationalCost = operationalFacts.reduce((sum, f) => sum + f.amount, 0);

  // Total Cost = Operational Cost + (Purchase Price if included)
  const totalCost = operationalCost + (purchasePrice ?? 0);

  // 3. Active Period Calculation (Months)
  let activePeriodMonths = 1;
  const dates = includedFacts
    .map(f => new Date(f.date).getTime())
    .filter(t => !isNaN(t));

  if (asset.purchase_date) {
    const pTime = new Date(asset.purchase_date).getTime();
    if (!isNaN(pTime)) dates.push(pTime);
  }

  if (dates.length > 0) {
    const earliestTime = Math.min(...dates);
    const diffMs = refDate.getTime() - earliestTime;
    const diffDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    activePeriodMonths = Math.max(1, Math.ceil(diffDays / 30.4375));
  }

  const monthlyAverageCost = Math.round(operationalCost / activePeriodMonths);

  // 4. Cost Per Kilometer Calculation
  let maxMileage = 0;
  if (asset.vehicle_details?.current_mileage) {
    maxMileage = asset.vehicle_details.current_mileage;
  }
  
  if (Array.isArray(asset.maintenance_records)) {
    asset.maintenance_records.forEach(m => {
      if (m.mileage && m.mileage > maxMileage) {
        maxMileage = m.mileage;
      }
    });
  }

  const costPerKm = maxMileage > 0 ? Math.round(operationalCost / maxMileage) : null;

  // 5. Current Month vs Previous Month Costs
  const currentYM = formatYearMonthKey(refDate.toISOString());
  
  const prevDate = new Date(refDate);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const previousYM = formatYearMonthKey(prevDate.toISOString());

  const currentMonthCost = operationalFacts
    .filter(f => formatYearMonthKey(f.date) === currentYM)
    .reduce((sum, f) => sum + f.amount, 0);

  const previousMonthCost = operationalFacts
    .filter(f => formatYearMonthKey(f.date) === previousYM)
    .reduce((sum, f) => sum + f.amount, 0);

  let costTrendPercentage: number | null = null;
  if (previousMonthCost > 0) {
    costTrendPercentage = Math.round(((currentMonthCost - previousMonthCost) / previousMonthCost) * 100);
  }

  // 6. Cost Category Breakdown
  const categoryLabels: Record<TCOCostCategory, string> = {
    MAINTENANCE: 'Servis & Perbaikan',
    TAX_REGISTRATION: 'Pajak & Dokumen',
    FUEL: 'BBM & Operasional',
    PURCHASE: 'Harga Pembelian',
    ACCESSORY: 'Aksesoris & Modifikasi',
    OTHER: 'Pengeluaran Lainnya'
  };

  const categories: TCOCostCategory[] = ['MAINTENANCE', 'TAX_REGISTRATION', 'FUEL', 'ACCESSORY', 'OTHER'];
  const categoryBreakdown: TCOCategoryBreakdown[] = categories.map(cat => {
    const catFacts = operationalFacts.filter(f => f.category === cat);
    const catTotal = catFacts.reduce((sum, f) => sum + f.amount, 0);
    const pct = operationalCost > 0 ? Math.round((catTotal / operationalCost) * 100) : 0;
    
    return {
      category: cat,
      label: categoryLabels[cat],
      total_amount: catTotal,
      percentage: pct,
      record_count: catFacts.length
    };
  });

  // 7. Monthly Trend Aggregation
  const monthlyMap = new Map<string, TCOMonthlyPoint>();
  
  // Initialize last 6 months buckets
  for (let i = 5; i >= 0; i--) {
    const d = new Date(refDate);
    d.setMonth(d.getMonth() - i);
    const ymKey = formatYearMonthKey(d.toISOString());
    monthlyMap.set(ymKey, {
      year_month: ymKey,
      label: formatYearMonthLabel(ymKey),
      maintenance_amount: 0,
      tax_amount: 0,
      fuel_amount: 0,
      other_amount: 0,
      total_amount: 0
    });
  }

  operationalFacts.forEach(f => {
    const ymKey = formatYearMonthKey(f.date);
    let point = monthlyMap.get(ymKey);
    if (!point) {
      point = {
        year_month: ymKey,
        label: formatYearMonthLabel(ymKey),
        maintenance_amount: 0,
        tax_amount: 0,
        fuel_amount: 0,
        other_amount: 0,
        total_amount: 0
      };
      monthlyMap.set(ymKey, point);
    }

    if (f.category === 'MAINTENANCE') point.maintenance_amount += f.amount;
    else if (f.category === 'TAX_REGISTRATION') point.tax_amount += f.amount;
    else if (f.category === 'FUEL') point.fuel_amount += f.amount;
    else point.other_amount += f.amount;

    point.total_amount += f.amount;
  });

  const monthlyTrend = Array.from(monthlyMap.values()).sort((a, b) => a.year_month.localeCompare(b.year_month));

  const summary: TCOSummaryMetrics = {
    asset_id: asset.asset_id,
    time_range: timeRange,
    total_cost: totalCost,
    purchase_price: purchasePrice,
    operational_cost: operationalCost,
    monthly_average_cost: monthlyAverageCost,
    cost_per_km: costPerKm,
    current_month_cost: currentMonthCost,
    previous_month_cost: previousMonthCost,
    cost_trend_percentage: costTrendPercentage,
    active_period_months: activePeriodMonths,
    included_facts_count: includedFacts.length,
    excluded_facts_count: excludedFacts.length,
    depreciation_status: 'NOT_AVAILABLE'
  };

  return {
    asset_id: asset.asset_id,
    asset_name: asset.name,
    generated_at: refDate.toISOString(),
    time_range: timeRange,
    summary,
    category_breakdown: categoryBreakdown,
    monthly_trend: monthlyTrend,
    facts: filteredFacts
  };
}
