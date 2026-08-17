import { 
  Asset, 
  CanonicalSignal, 
  PriorityResolution, 
  SignalEvidence, 
  SeverityTone, 
  AssetDataState, 
  EvidenceViewModel, 
  SignalItemViewModel, 
  AssetAttentionViewModel, 
  FleetAttentionDashboardViewModel 
} from '../types';
import { resolveAction } from './attentionSignalEngine';

/**
 * Phase 3F-5A: Attention Intelligence Presentation Adapter
 * Pure view formatter that maps Engine decision outputs (PriorityResolution, CanonicalSignal)
 * to presentation ViewModels (AssetAttentionViewModel) with zero recalculation or decision logic.
 */

export function mapSeverityToTone(severity: string): SeverityTone {
  switch (severity) {
    case 'CRITICAL':
      return 'critical';
    case 'HIGH':
      return 'high';
    case 'MEDIUM':
      return 'medium';
    case 'LOW':
      return 'low';
    case 'INFO':
    default:
      return 'neutral';
  }
}

export function formatDomainLabel(domain: string): string {
  switch (domain) {
    case 'REMINDER':
      return 'Pengingat / Dokumen';
    case 'MAINTENANCE':
      return 'Pemeliharaan Servis';
    case 'TCO':
      return 'Analisis Biaya (TCO)';
    case 'ASSET':
      return 'Identitas Aset';
    default:
      return domain;
  }
}

export function formatFieldLabel(field: string): string {
  switch (field) {
    case 'due_date':
    case 'dueDate':
      return 'Tanggal Jatuh Tempo';
    case 'date':
      return 'Tanggal Rencana Servis';
    case 'cost_trend_percentage':
      return 'Tren Lonjakan Biaya';
    case 'current_month_cost':
      return 'Pengeluaran Bulan Ini';
    case 'previous_month_cost':
      return 'Pengeluaran Bulan Lalu';
    case 'vehicle_details.license_plate':
    case 'licensePlate_or_vin':
      return 'Plat Nomor / VIN';
    case 'serial_number':
    case 'serialNumber':
      return 'Nomor Seri Aset';
    default:
      return field;
  }
}

export function formatObservedValue(val: string | number): string {
  if (typeof val === 'number') {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);
  }
  return String(val);
}

export function formatEvidenceViewModel(evidence: SignalEvidence): EvidenceViewModel {
  return {
    domain_label: formatDomainLabel(evidence.source_domain),
    record_id: evidence.source_record_id,
    field_label: formatFieldLabel(evidence.source_field),
    observed_value: formatObservedValue(evidence.observed_value),
    rule_explanation: evidence.threshold_rule
  };
}

export function formatSignalItemViewModel(signal: CanonicalSignal): SignalItemViewModel {
  const resolvedAction = resolveAction(signal.action_code, {
    asset_id: signal.asset_id,
    signal_id: signal.signal_id
  });

  let title = '';
  let description = '';
  let typeLabel = '';

  switch (signal.signal_type) {
    case 'DOCUMENT_EXPIRED':
      typeLabel = 'Dokumen Kedaluwarsa';
      title = 'Dokumen / STNK Terlewat Jatuh Tempo';
      description = 'Dokumen aset telah melewati tanggal jatuh tempo dan memerlukan perpanjangan segera.';
      break;
    case 'DOCUMENT_EXPIRING_SOON':
      typeLabel = 'Mendekati Jatuh Tempo';
      title = 'Dokumen Segera Jatuh Tempo';
      description = 'Masa berlaku dokumen akan habis dalam kurun waktu kurang dari 30 hari.';
      break;
    case 'MAINTENANCE_OVERDUE':
      typeLabel = 'Servis Terlewat';
      title = 'Jadwal Pemeliharaan Terlewat';
      description = 'Jadwal pemeliharaan berkala kendaraan belum dicatat selesai sesuai tanggal rencana.';
      break;
    case 'COST_TREND_INCREASE':
      typeLabel = 'Lonjakan Biaya';
      title = 'Kenaikan Biaya Operasional Signifikan';
      description = 'Pengeluaran operasional bulan ini naik lebih dari 25% dibandingkan bulan sebelumnya.';
      break;
    case 'DATA_INCOMPLETE':
      typeLabel = 'Profil Belum Lengkap';
      title = 'Informasi Identitas Belum Lengkap';
      description = 'Informasi penting seperti Plat Nomor atau Nomor Seri belum diisi.';
      break;
    default:
      typeLabel = 'Sinyal Perhatian';
      title = `Sinyal Perhatian ${signal.signal_type}`;
      description = 'Aset memerlukan perhatian berdasarkan aturan sistem.';
      break;
  }

  return {
    signal_id: signal.signal_id,
    type_label: typeLabel,
    severity: signal.severity,
    severity_tone: mapSeverityToTone(signal.severity),
    title,
    description,
    evidence_list: signal.evidence.map(formatEvidenceViewModel),
    primary_action: resolvedAction
  };
}

export function buildAssetAttentionViewModel(
  asset: Asset,
  resolution: PriorityResolution,
  factsAvailable: boolean = true
): AssetAttentionViewModel {
  const signalViews = resolution.all_signals.map(formatSignalItemViewModel);
  const primarySignalView = resolution.primary_signal ? formatSignalItemViewModel(resolution.primary_signal) : null;
  const supportingSignalViews = resolution.supporting_signals.map(formatSignalItemViewModel);

  // Hardened Data State Invariant
  let dataState: AssetDataState = 'SUFFICIENT';
  if (!factsAvailable) {
    dataState = 'EMPTY';
  } else if (resolution.all_signals.length === 1 && resolution.all_signals[0].signal_type === 'DATA_INCOMPLETE') {
    dataState = 'INSUFFICIENT';
  }

  let headerBadgeText = '🟢 KONDISI NORMAL';
  let summaryText = 'Tidak ditemukan hal yang membutuhkan perhatian berdasarkan data yang tersedia.';

  if (dataState === 'EMPTY') {
    headerBadgeText = '⚪ BELUM CUKUP DATA';
    summaryText = 'Belum ada data fakta yang cukup untuk menilai perhatian aset ini.';
  } else if (dataState === 'INSUFFICIENT') {
    headerBadgeText = '⚙️ DATA PROFIL INKOMPLET';
    summaryText = 'Informasi identitas aset belum lengkap. Harap lengkapi profil.';
  } else {
    switch (resolution.attention_level) {
      case 'CRITICAL':
        headerBadgeText = '🚨 PERLU PERHATIAN SANGAT TINGGI';
        summaryText = `${resolution.all_signals.length} masalah kritis memerlukan tindakan segera.`;
        break;
      case 'HIGH':
        headerBadgeText = '⚠️ PERLU PERHATIAN TINGGI';
        summaryText = `${resolution.all_signals.length} item mendekati batas waktu atau terlewat.`;
        break;
      case 'MEDIUM':
        headerBadgeText = '⚡ CATATAN OPERASIONAL';
        summaryText = `${resolution.all_signals.length} catatan operasional terdeteksi.`;
        break;
      case 'LOW':
      case 'INFO':
      default:
        headerBadgeText = '🟢 KONDISI NORMAL';
        summaryText = 'Aset dalam kondisi baik tanpa indikasi risiko aktif.';
        break;
    }
  }

  const hasActionableSignals = signalViews.some(s => s.primary_action.available);

  return {
    asset_id: asset.asset_id,
    asset_name: asset.name,
    asset_category: asset.category,
    attention_level: resolution.attention_level,
    header_badge_text: headerBadgeText,
    severity_tone: mapSeverityToTone(resolution.attention_level),
    summary_text: summaryText,
    // SECONDARY ONLY DISPLAY
    attention_score_display: `${resolution.attention_score} / 100`,
    primary_signal: primarySignalView,
    supporting_signals: supportingSignalViews,
    all_signals: signalViews,
    total_signals_count: signalViews.length,
    has_actionable_signals: hasActionableSignals,
    data_state: dataState
  };
}

export function buildFleetAttentionDashboardViewModel(
  assetViewModels: AssetAttentionViewModel[],
  generatedAtStr?: string
): FleetAttentionDashboardViewModel {
  const generatedAt = generatedAtStr || new Date().toISOString().split('T')[0];

  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let normalCount = 0;
  let insufficientCount = 0;

  for (const vm of assetViewModels) {
    if (vm.data_state === 'EMPTY' || vm.data_state === 'INSUFFICIENT') {
      insufficientCount++;
    } else {
      switch (vm.attention_level) {
        case 'CRITICAL':
          criticalCount++;
          break;
        case 'HIGH':
          highCount++;
          break;
        case 'MEDIUM':
          mediumCount++;
          break;
        case 'LOW':
        case 'INFO':
        default:
          normalCount++;
          break;
      }
    }
  }

  // Top priority assets: CRITICAL and HIGH, sorted deterministically by level then name
  const topPriority = assetViewModels
    .filter(a => a.attention_level === 'CRITICAL' || a.attention_level === 'HIGH')
    .sort((a, b) => {
      if (a.attention_level !== b.attention_level) {
        return a.attention_level === 'CRITICAL' ? -1 : 1;
      }
      return a.asset_name.localeCompare(b.asset_name);
    });

  return {
    generated_at_formatted: generatedAt,
    total_assets_evaluated: assetViewModels.length,
    critical_attention_count: criticalCount,
    high_attention_count: highCount,
    medium_attention_count: mediumCount,
    normal_attention_count: normalCount,
    insufficient_data_count: insufficientCount,
    asset_views: assetViewModels,
    top_priority_assets: topPriority
  };
}
