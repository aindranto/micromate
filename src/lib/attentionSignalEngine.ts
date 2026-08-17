import { 
  Asset, 
  MaintenanceRecord, 
  Reminder, 
  TCOSummaryMetrics, 
  CanonicalSignal, 
  SignalEvidence, 
  PriorityResolution, 
  AttentionLevel, 
  ResolvedAction,
  SignalSeverity
} from '../types';

/**
 * Phase 3F-1: Canonical Signal Extraction Engine
 * Extract deterministic, evidence-backed signals for a given asset from canonical facts.
 * 100% pure function, zero side effects, zero database mutations.
 */
export function extractCanonicalSignalsForAsset(
  asset: Asset,
  reminders: Reminder[],
  maintenanceRecords: MaintenanceRecord[],
  tcoSummary: TCOSummaryMetrics | null = null,
  evaluationDateStr?: string
): CanonicalSignal[] {
  const evaluationDate = evaluationDateStr || new Date().toISOString().split('T')[0];
  const evalTimestamp = new Date(evaluationDate).getTime();

  const signals: CanonicalSignal[] = [];

  // Filter reminders for this asset
  const assetReminders = reminders.filter(r => (r.asset_id || asset.asset_id) === asset.asset_id);

  // 1. DOCUMENT_EXPIRED / REMINDER_EXPIRED (CRITICAL)
  for (const r of assetReminders) {
    if (r.status === 'completed' || r.status === 'dismissed') continue;
    
    if (r.due_date) {
      const dueTimestamp = new Date(r.due_date).getTime();
      if (!isNaN(dueTimestamp) && dueTimestamp < evalTimestamp) {
        const daysOverdue = Math.floor((evalTimestamp - dueTimestamp) / (1000 * 60 * 60 * 24));
        const isMaintenanceType = r.type === 'maintenance';

        const evidence: SignalEvidence[] = [{
          source_domain: isMaintenanceType ? 'MAINTENANCE' : 'REMINDER',
          source_record_id: r.reminder_id,
          source_field: 'due_date',
          observed_value: r.due_date,
          evaluation_date: evaluationDate,
          threshold_rule: `due_date (${r.due_date}) < evaluationDate (${evaluationDate}) [${daysOverdue} days overdue]`
        }];

        if (isMaintenanceType) {
          signals.push({
            signal_id: `SIG-MAINT-OVERDUE-${r.reminder_id}`,
            signal_type: 'MAINTENANCE_OVERDUE',
            asset_id: asset.asset_id,
            severity: 'HIGH',
            evidence,
            action_code: 'SCHEDULE_MAINTENANCE',
            priority_order: 30
          });
        } else {
          signals.push({
            signal_id: `SIG-DOC-EXPIRED-${r.reminder_id}`,
            signal_type: 'DOCUMENT_EXPIRED',
            asset_id: asset.asset_id,
            severity: 'CRITICAL',
            evidence,
            action_code: 'REVIEW_DOCUMENT_RENEWAL',
            priority_order: 10
          });
        }
      } else if (!isNaN(dueTimestamp) && dueTimestamp >= evalTimestamp) {
        // Check DOCUMENT_EXPIRING_SOON (HIGH) - within 30 days
        const daysRemaining = Math.floor((dueTimestamp - evalTimestamp) / (1000 * 60 * 60 * 24));
        if (daysRemaining <= 30) {
          const evidence: SignalEvidence[] = [{
            source_domain: 'REMINDER',
            source_record_id: r.reminder_id,
            source_field: 'due_date',
            observed_value: r.due_date,
            evaluation_date: evaluationDate,
            threshold_rule: `0 <= (due_date - evaluationDate) <= 30 days [${daysRemaining} days remaining]`
          }];

          signals.push({
            signal_id: `SIG-DOC-EXPIRING-${r.reminder_id}`,
            signal_type: 'DOCUMENT_EXPIRING_SOON',
            asset_id: asset.asset_id,
            severity: 'HIGH',
            evidence,
            action_code: 'PREPARE_DOCUMENT_RENEWAL',
            priority_order: 20
          });
        }
      }
    }
  }

  // 2. MAINTENANCE_OVERDUE from Maintenance Records
  const assetMaintenance = maintenanceRecords.filter(m => m.asset_id === asset.asset_id);
  for (const m of assetMaintenance) {
    const scheduledTimestamp = new Date(m.date).getTime();
    if (!isNaN(scheduledTimestamp) && scheduledTimestamp < evalTimestamp) {
      const daysOverdue = Math.floor((evalTimestamp - scheduledTimestamp) / (1000 * 60 * 60 * 24));
      
      // Prevent duplicate signal if already captured from reminders
      const existingMaintSig = signals.find(s => s.signal_type === 'MAINTENANCE_OVERDUE' && s.evidence.some(e => e.source_record_id === m.maintenance_id));
      if (!existingMaintSig) {
        signals.push({
          signal_id: `SIG-MAINT-OVERDUE-REC-${m.maintenance_id}`,
          signal_type: 'MAINTENANCE_OVERDUE',
          asset_id: asset.asset_id,
          severity: 'HIGH',
          evidence: [{
            source_domain: 'MAINTENANCE',
            source_record_id: m.maintenance_id,
            source_field: 'date',
            observed_value: m.date,
            evaluation_date: evaluationDate,
            threshold_rule: `scheduled_date (${m.date}) < evaluationDate (${evaluationDate}) [${daysOverdue} days overdue]`
          }],
          action_code: 'SCHEDULE_MAINTENANCE',
          priority_order: 30
        });
      }
    }
  }

  // 3. COST_TREND_INCREASE from TCO Summary Metrics
  if (tcoSummary && tcoSummary.cost_trend_percentage !== null) {
    const deltaAmount = tcoSummary.current_month_cost - tcoSummary.previous_month_cost;
    // Condition: trend >= +25% AND delta >= Rp 500.000
    if (tcoSummary.cost_trend_percentage >= 25 && deltaAmount >= 500000) {
      signals.push({
        signal_id: `SIG-COST-TREND-${asset.asset_id}`,
        signal_type: 'COST_TREND_INCREASE',
        asset_id: asset.asset_id,
        severity: 'MEDIUM',
        evidence: [
          {
            source_domain: 'TCO',
            source_record_id: asset.asset_id,
            source_field: 'cost_trend_percentage',
            observed_value: `${tcoSummary.cost_trend_percentage}%`,
            evaluation_date: evaluationDate,
            threshold_rule: 'cost_trend_percentage >= 25%'
          },
          {
            source_domain: 'TCO',
            source_record_id: asset.asset_id,
            source_field: 'current_month_cost',
            observed_value: tcoSummary.current_month_cost,
            evaluation_date: evaluationDate,
            threshold_rule: `deltaAmount (${deltaAmount}) >= 500000`
          },
          {
            source_domain: 'TCO',
            source_record_id: asset.asset_id,
            source_field: 'previous_month_cost',
            observed_value: tcoSummary.previous_month_cost,
            evaluation_date: evaluationDate,
            threshold_rule: 'previous_month_cost_baseline'
          }
        ],
        action_code: 'REVIEW_COST_ANALYTICS',
        priority_order: 40
      });
    }
  }

  // 4. DATA_INCOMPLETE (INFO)
  const missingFields: string[] = [];
  if (asset.category === 'vehicle') {
    const licensePlate = asset.vehicle_details?.license_plate;
    if (!licensePlate) {
      missingFields.push('vehicle_details.license_plate');
    }
  }
  if (!asset.serial_number && asset.category === 'device') {
    missingFields.push('serial_number');
  }

  if (missingFields.length > 0) {
    signals.push({
      signal_id: `SIG-DATA-INCOMPLETE-${asset.asset_id}`,
      signal_type: 'DATA_INCOMPLETE',
      asset_id: asset.asset_id,
      severity: 'INFO',
      evidence: missingFields.map(field => ({
        source_domain: 'ASSET',
        source_record_id: asset.asset_id,
        source_field: field,
        observed_value: 'MISSING_BLANK',
        evaluation_date: evaluationDate,
        threshold_rule: `${field} is missing or blank`
      })),
      action_code: 'COMPLETE_ASSET_PROFILE',
      priority_order: 50
    });
  }

  return signals;
}

/**
 * Phase 3F-2: Policy Engine & Priority Resolution
 * Evaluates signals using policy rules, severity ceilings, and deterministic tie-breaking.
 */
const SEVERITY_RANK: Record<SignalSeverity, number> = {
  CRITICAL: 1,
  HIGH: 2,
  MEDIUM: 3,
  LOW: 4,
  INFO: 5
};

const SEVERITY_SCORE_CONTRIBUTION: Record<SignalSeverity, number> = {
  CRITICAL: 40,
  HIGH: 25,
  MEDIUM: 15,
  LOW: 5,
  INFO: 0
};

export function resolvePriorityPolicy(
  signals: CanonicalSignal[],
  assetId: string
): PriorityResolution {
  if (signals.length === 0) {
    return {
      asset_id: assetId,
      attention_level: 'LOW',
      attention_score: 0,
      primary_signal: null,
      supporting_signals: [],
      all_signals: [],
      explanation: ['Tidak ada sinyal perhatian yang terdeteksi. Aset dalam kondisi normal.']
    };
  }

  // Sort signals deterministically:
  // 1. Severity Rank (CRITICAL -> HIGH -> MEDIUM -> LOW -> INFO)
  // 2. Priority Order (lower number = higher priority)
  // 3. Signal ID string tie-breaker
  const sortedSignals = [...signals].sort((a, b) => {
    const rankA = SEVERITY_RANK[a.severity] || 99;
    const rankB = SEVERITY_RANK[b.severity] || 99;
    if (rankA !== rankB) return rankA - rankB;

    if (a.priority_order !== b.priority_order) {
      return a.priority_order - b.priority_order;
    }

    return a.signal_id.localeCompare(b.signal_id);
  });

  const primarySignal = sortedSignals[0];
  const supportingSignals = sortedSignals.slice(1);

  // Calculate raw accumulated score
  let rawScore = sortedSignals.reduce((sum, sig) => sum + (SEVERITY_SCORE_CONTRIBUTION[sig.severity] || 0), 0);

  // Apply Severity Ceiling / Floor Rules
  const hasCritical = sortedSignals.some(s => s.severity === 'CRITICAL');
  const hasHigh = sortedSignals.some(s => s.severity === 'HIGH');
  const hasMedium = sortedSignals.some(s => s.severity === 'MEDIUM');

  let attentionLevel: AttentionLevel = 'LOW';
  let finalScore = rawScore;

  if (hasCritical) {
    attentionLevel = 'CRITICAL';
    finalScore = Math.max(80, Math.min(100, rawScore));
  } else if (hasHigh) {
    attentionLevel = 'HIGH';
    finalScore = Math.max(60, Math.min(79, rawScore));
  } else if (hasMedium) {
    attentionLevel = 'MEDIUM';
    finalScore = Math.max(30, Math.min(59, rawScore));
  } else {
    attentionLevel = 'LOW';
    finalScore = Math.min(29, rawScore);
  }

  // Build transparent human-readable explanation trace
  const explanation: string[] = sortedSignals.map(sig => {
    const primaryEvidence = sig.evidence[0];
    const evidenceText = primaryEvidence 
      ? ` [Bukti: ${primaryEvidence.source_domain}.${primaryEvidence.source_field} = ${primaryEvidence.observed_value}]`
      : '';

    switch (sig.signal_type) {
      case 'DOCUMENT_EXPIRED':
        return `[CRITICAL] Dokumen / pengingat terlewat jatuh tempo.${evidenceText}`;
      case 'DOCUMENT_EXPIRING_SOON':
        return `[HIGH] Dokumen / pengingat akan jatuh tempo dalam 30 hari.${evidenceText}`;
      case 'MAINTENANCE_OVERDUE':
        return `[HIGH] Jadwal servis / perbaikan terlewat dari tanggal rencana.${evidenceText}`;
      case 'COST_TREND_INCREASE':
        return `[MEDIUM] Kenaikan signifikan biaya operasional vs bulan sebelumnya.${evidenceText}`;
      case 'DATA_INCOMPLETE':
        return `[INFO] Informasi identitas aset belum lengkap.${evidenceText}`;
      default:
        return `[${sig.severity}] Sinyal ${sig.signal_type}.${evidenceText}`;
    }
  });

  return {
    asset_id: assetId,
    attention_level: attentionLevel,
    attention_score: finalScore,
    primary_signal: primarySignal,
    supporting_signals: supportingSignals,
    all_signals: sortedSignals,
    explanation
  };
}

/**
 * Phase 3F-3: Abstract Action Resolver
 * Maps abstract ActionCodes to user-facing action descriptors safely without UI coupling.
 */
export function resolveAction(actionCode: string, contextData?: Record<string, unknown>): ResolvedAction {
  switch (actionCode) {
    case 'REVIEW_DOCUMENT_RENEWAL':
      return {
        action_code: 'REVIEW_DOCUMENT_RENEWAL',
        label: 'Perbarui Dokumen / STNK',
        description: 'Tinjau dokumen yang terlewat dan lakukan pembaruan status.',
        available: true,
        context_data: contextData
      };

    case 'PREPARE_DOCUMENT_RENEWAL':
      return {
        action_code: 'PREPARE_DOCUMENT_RENEWAL',
        label: 'Persiapkan Pembaruan',
        description: 'Persiapkan persyaratan sebelum dokumen jatuh tempo.',
        available: true,
        context_data: contextData
      };

    case 'SCHEDULE_MAINTENANCE':
      return {
        action_code: 'SCHEDULE_MAINTENANCE',
        label: 'Jadwalkan Servis Sekarang',
        description: 'Catat atau perbarui jadwal pemeliharaan kendaraan.',
        available: true,
        context_data: contextData
      };

    case 'REVIEW_COST_ANALYTICS':
      return {
        action_code: 'REVIEW_COST_ANALYTICS',
        label: 'Tinjau Rincian Pengeluaran',
        description: 'Buka dashboard TCO untuk menganalisis lonjakan biaya.',
        available: true,
        context_data: contextData
      };

    case 'COMPLETE_ASSET_PROFILE':
      return {
        action_code: 'COMPLETE_ASSET_PROFILE',
        label: 'Lengkapi Informasi Aset',
        description: 'Lengkapi nomor seri / plat nomor yang masih kosong.',
        available: true,
        context_data: contextData
      };

    default:
      // Fallback for NO_ACTION_AVAILABLE
      return {
        action_code: actionCode || 'NO_ACTION_AVAILABLE',
        label: 'Lihat Detail Aset',
        description: 'Aksi spesifik tidak tersedia pada konteks saat ini.',
        available: false,
        context_data: contextData
      };
  }
}
