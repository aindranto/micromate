import React, { useState } from 'react';
import { AssetAttentionViewModel } from '../../types';
import { ActionResolverCTA } from './ActionResolverCTA';
import { EvidenceDisclosureModal } from './EvidenceDisclosureModal';
import { 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Eye, 
  Sparkles, 
  ShieldAlert, 
  AlertTriangle, 
  XOctagon,
  CalendarDays
} from 'lucide-react';

interface AssetAttentionCardProps {
  vm: AssetAttentionViewModel;
  onExecuteAction: (actionCode: string, contextData?: Record<string, any>) => void;
}

/**
 * Phase 3F-5B React UI Primitives: AssetAttentionCard
 * Displays a beautiful, fully featured attention card for an individual asset.
 * Uses mathematical borders, precise neutral tones, and clear typography.
 */
export const AssetAttentionCard: React.FC<AssetAttentionCardProps> = ({
  vm,
  onExecuteAction
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState<{
    isOpen: boolean;
    evidenceList: any[];
    title: string;
  }>({
    isOpen: false,
    evidenceList: [],
    title: ''
  });

  const {
    asset_name,
    asset_category,
    header_badge_text,
    severity_tone,
    summary_text,
    attention_score_display,
    primary_signal,
    supporting_signals,
    total_signals_count,
    data_state
  } = vm;

  // Design tokens based on severity tones
  let borderClass = 'border-stone-200';
  let bgClass = 'bg-white';
  let badgeColorClass = 'bg-stone-100 text-stone-800 border-stone-200';
  let ScoreIcon = Sparkles;

  if (data_state === 'EMPTY') {
    borderClass = 'border-dashed border-stone-300';
    bgClass = 'bg-stone-50/50';
    badgeColorClass = 'bg-stone-100 text-stone-500 border-stone-200';
  } else if (data_state === 'INSUFFICIENT') {
    borderClass = 'border-amber-200';
    bgClass = 'bg-amber-50/10';
    badgeColorClass = 'bg-amber-50 text-amber-800 border-amber-100';
    ScoreIcon = CalendarDays;
  } else {
    switch (severity_tone) {
      case 'critical':
        borderClass = 'border-rose-200';
        bgClass = 'bg-rose-50/10';
        badgeColorClass = 'bg-rose-100 text-rose-800 border-rose-200';
        ScoreIcon = XOctagon;
        break;
      case 'high':
        borderClass = 'border-amber-200';
        bgClass = 'bg-amber-50/10';
        badgeColorClass = 'bg-amber-100 text-amber-800 border-amber-200';
        ScoreIcon = AlertTriangle;
        break;
      case 'medium':
        borderClass = 'border-indigo-200';
        bgClass = 'bg-indigo-50/10';
        badgeColorClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        ScoreIcon = ShieldAlert;
        break;
      case 'low':
      case 'neutral':
      default:
        borderClass = 'border-stone-200';
        bgClass = 'bg-white';
        badgeColorClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
        ScoreIcon = Sparkles;
        break;
    }
  }

  const handleOpenEvidence = (evidenceList: any[], signalTitle: string) => {
    setSelectedEvidence({
      isOpen: true,
      evidenceList,
      title: signalTitle
    });
  };

  return (
    <div 
      className={`rounded-2xl border ${borderClass} ${bgClass} p-5 flex flex-col justify-between h-full space-y-4 shadow-2xs hover:shadow-sm transition-all duration-200 select-none`}
      data-testid={`asset-attention-card-${vm.asset_id}`}
    >
      <div className="space-y-3">
        {/* Top Badges & Score Line */}
        <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-3">
          <span 
            className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border tracking-wide whitespace-nowrap ${badgeColorClass}`}
            data-testid="card-header-badge"
          >
            {header_badge_text}
          </span>
          {/* Secondary Score Display Only */}
          <div className="flex items-center gap-1.5 text-xs text-stone-500 font-bold font-mono">
            <ScoreIcon className="w-3.5 h-3.5" />
            <span data-testid="card-attention-score">{attention_score_display}</span>
          </div>
        </div>

        {/* Asset Identity Block */}
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
            {asset_category === 'vehicle' ? '🚗 KENDARAAN' : asset_category === 'device' ? '💻 PERANGKAT' : '📦 ASET'}
          </span>
          <h4 className="text-base font-extrabold text-stone-900 leading-snug tracking-tight">
            {asset_name}
          </h4>
        </div>

        {/* Primary Alert / Normal Summary text */}
        <p className="text-xs text-stone-600 leading-relaxed" data-testid="card-summary-text">
          {summary_text}
        </p>

        {/* Primary Signal Box (if exists) */}
        {primary_signal && (
          <div 
            className="p-3 bg-stone-50 border border-stone-200 rounded-xl space-y-2"
            data-testid="primary-signal-box"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[9px] px-1.5 py-0.2 bg-stone-200 rounded text-stone-600 font-bold uppercase tracking-tight block w-fit mb-1">
                  Sinyal Utama
                </span>
                <h5 className="text-xs font-bold text-stone-900 leading-snug">
                  {primary_signal.title}
                </h5>
              </div>
              {primary_signal.evidence_list.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenEvidence(primary_signal.evidence_list, primary_signal.title)}
                  className="p-1 text-emerald-600 hover:text-emerald-700 bg-white hover:bg-emerald-50 border border-stone-200 rounded-lg flex items-center justify-center gap-1 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                  title="Lihat bukti transparan"
                  data-testid="view-evidence-btn"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Bukti</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-500 leading-normal">
              {primary_signal.description}
            </p>
          </div>
        )}

        {/* Supporting Signals Accordion */}
        {supporting_signals.length > 0 && (
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full py-1 px-2 border border-stone-200/80 rounded-lg bg-white hover:bg-stone-50 flex items-center justify-between text-[11px] font-bold text-stone-500 transition-all cursor-pointer"
              data-testid="supporting-signals-toggle"
            >
              <span>{supporting_signals.length} Sinyal Pendukung</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {isExpanded && (
              <div className="space-y-1.5 pl-1 animate-in slide-in-from-top-1 duration-150" data-testid="supporting-signals-container">
                {supporting_signals.map((sig) => (
                  <div 
                    key={sig.signal_id}
                    className="p-2.5 bg-stone-50/80 border border-stone-200/50 rounded-lg space-y-1"
                    data-testid="supporting-signal-item"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="text-[9px] text-stone-400 block font-bold uppercase">
                        {sig.type_label}
                      </span>
                      {sig.evidence_list.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenEvidence(sig.evidence_list, sig.title)}
                          className="text-[9px] font-bold text-emerald-600 hover:text-emerald-700 bg-transparent flex items-center gap-0.5 cursor-pointer"
                        >
                          <Eye className="w-2.5 h-2.5" />
                          <span>Bukti</span>
                        </button>
                      )}
                    </div>
                    <h6 className="text-[11px] font-bold text-stone-800 leading-tight">
                      {sig.title}
                    </h6>
                    <p className="text-[10px] text-stone-500 leading-normal">
                      {sig.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA Bottom Section */}
      <div className="pt-3 border-t border-stone-100">
        {primary_signal ? (
          <ActionResolverCTA 
            action={primary_signal.primary_action}
            onExecute={onExecuteAction}
          />
        ) : (
          <div className="flex items-start gap-1.5 p-3 bg-stone-50 border border-stone-200/50 rounded-xl text-stone-500 text-[11px]">
            <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Tidak ada tindakan mendesak yang diperlukan untuk aset ini saat ini. Semua data terpantau aman.
            </p>
          </div>
        )}
      </div>

      {/* Disclosure Modal Backdrop */}
      {selectedEvidence.isOpen && (
        <EvidenceDisclosureModal
          isOpen={selectedEvidence.isOpen}
          onClose={() => setSelectedEvidence({ isOpen: false, evidenceList: [], title: '' })}
          evidenceList={selectedEvidence.evidenceList}
          assetName={asset_name}
        />
      )}
    </div>
  );
};
