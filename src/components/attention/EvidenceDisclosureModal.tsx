import React from 'react';
import { EvidenceViewModel } from '../../types';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';

interface EvidenceDisclosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  evidenceList: EvidenceViewModel[];
  assetName: string;
}

/**
 * Phase 3F-5B React UI Primitives: EvidenceDisclosureModal
 * Renders a clean, accessible modal dialog overlay showcasing transparent evidence details.
 * No mutation, pure presentation.
 */
export const EvidenceDisclosureModal: React.FC<EvidenceDisclosureModalProps> = ({
  isOpen,
  onClose,
  evidenceList,
  assetName
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
      data-testid="evidence-disclosure-modal"
    >
      <div 
        className="bg-white rounded-2xl border border-stone-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-150 flex items-center justify-between bg-stone-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-950 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 leading-tight">Bukti Analisis</h3>
              <p className="text-[11px] text-stone-500 truncate max-w-[280px]">
                Aset: <span className="font-semibold text-stone-700">{assetName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 hover:bg-stone-200/80 rounded-lg text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <p className="text-xs text-stone-500 leading-relaxed">
            Berikut adalah data historis dan fakta operasional yang memicu sinyal perhatian pada aset ini. Sistem menjamin akurasi evaluasi berdasarkan aturan ambang batas (threshold rules) di bawah ini:
          </p>

          <div className="space-y-3">
            {evidenceList.map((ev, index) => {
              // Extract status icon based on domains
              let DomainIcon = HelpCircle;
              let bgClass = 'bg-stone-50';
              let textClass = 'text-stone-600';

              if (ev.domain_label.includes('Pengingat') || ev.domain_label.includes('REMINDER')) {
                DomainIcon = AlertTriangle;
                bgClass = 'bg-rose-50';
                textClass = 'text-rose-900';
              } else if (ev.domain_label.includes('Pemeliharaan') || ev.domain_label.includes('MAINTENANCE')) {
                DomainIcon = AlertCircle;
                bgClass = 'bg-amber-50';
                textClass = 'text-amber-900';
              } else if (ev.domain_label.includes('Biaya') || ev.domain_label.includes('TCO')) {
                DomainIcon = ShieldAlert;
                bgClass = 'bg-indigo-50';
                textClass = 'text-indigo-900';
              } else if (ev.domain_label.includes('Identitas') || ev.domain_label.includes('ASSET')) {
                DomainIcon = CheckCircle2;
                bgClass = 'bg-sky-50';
                textClass = 'text-sky-900';
              }

              return (
                <div 
                  key={`${ev.record_id}-${index}`}
                  className={`p-3.5 rounded-xl border border-stone-200/80 ${bgClass} space-y-2`}
                  data-testid={`evidence-item-${index}`}
                >
                  <div className="flex items-center gap-2">
                    <DomainIcon className="w-4 h-4 text-stone-500 shrink-0" />
                    <span className="text-[11px] font-bold text-stone-800 uppercase tracking-wider">
                      {ev.domain_label}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-stone-200/60 rounded text-stone-600 font-mono select-all ml-auto">
                      ID: {ev.record_id}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs border-t border-stone-200/50 pt-2">
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-tight">Kriteria</span>
                      <span className="font-semibold text-stone-700 block">{ev.field_label}</span>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-tight">Nilai Tercatat</span>
                      <span className={`font-bold block ${textClass}`}>{ev.observed_value}</span>
                    </div>
                  </div>

                  <div className="bg-white/80 border border-stone-100 rounded-lg p-2.5 mt-2">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-tight block mb-0.5">Aturan Pemicu</span>
                    <p className="text-xs text-stone-600 font-mono leading-relaxed">
                      {ev.rule_explanation}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-stone-150 flex justify-end bg-stone-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
          >
            Mengerti, Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
