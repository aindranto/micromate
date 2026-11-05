import React from 'react';
import { Check, Layers, Smartphone, ShieldCheck, FileCheck, CheckCircle2 } from 'lucide-react';

export interface StepItem {
  id: number;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

interface StepProgressBarProps {
  currentStep: number;
  totalSteps: number;
  onStepClick: (step: number) => void;
  canNavigateToStep?: (step: number) => boolean;
}

export const StepProgressBar: React.FC<StepProgressBarProps> = ({
  currentStep,
  totalSteps,
  onStepClick,
  canNavigateToStep = (_step: number) => true,
}) => {
  const steps: StepItem[] = [
    {
      id: 1,
      title: 'Informasi Dasar',
      subtitle: 'Nama, kategori & lokasi',
      icon: <Layers className="w-4 h-4" />,
    },
    {
      id: 2,
      title: 'Spesifikasi Khusus',
      subtitle: 'Detail teknis & identitas',
      icon: <Smartphone className="w-4 h-4" />,
    },
    {
      id: 3,
      title: 'Garansi & Dokumen',
      subtitle: 'Pembelian & garansi',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 4,
      title: 'Berkas & Review',
      subtitle: 'Upload foto, nota & review',
      icon: <FileCheck className="w-4 h-4" />,
    },
    {
      id: 5,
      title: 'Simpan & Konfirmasi',
      subtitle: 'Verifikasi & simpan aset',
      icon: <CheckCircle2 className="w-4 h-4" />,
    },
  ];

  const currentStepData = steps.find((s) => s.id === currentStep) || steps[0];
  const progressPercent = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="w-full bg-stone-50 border-b border-stone-200 px-4 sm:px-6 py-3.5 shrink-0">
      {/* Mobile Step Header */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs font-extrabold shrink-0 shadow-2xs">
              {currentStep}
            </span>
            <div className="min-w-0">
              <span className="text-xs font-bold text-stone-900 block truncate">
                {currentStepData.title}
              </span>
              <span className="text-[10px] text-stone-500 block truncate">
                Langkah {currentStep} dari {totalSteps} • {currentStepData.subtitle}
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded-md">
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar Track */}
        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-800 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop / Tablet Stepper Flow (Tailwind, no MUI) */}
      <div className="hidden sm:block">
        <ol className="flex w-full items-start">
          {steps.map((step, idx) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = canNavigateToStep(step.id);
            // Connector line after this step follows this step's state,
            // same as the old MUI styled connector: emerald-600 when the
            // step is done, emerald-800 while it is current, stone-200 after.
            const lineClass = isCompleted
              ? 'bg-emerald-600'
              : isCurrent
                ? 'bg-emerald-800'
                : 'bg-stone-200';

            return (
              <li key={step.id} className="flex min-w-0 flex-1 items-start last:flex-none">
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => isClickable && onStepClick(step.id)}
                  className={`flex min-w-0 flex-1 items-center gap-2.5 p-2 rounded-2xl border text-left transition-all cursor-pointer ${
                    isCurrent
                      ? 'bg-white border-emerald-700 shadow-2xs ring-2 ring-emerald-600/20'
                      : isCompleted
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950 hover:bg-emerald-100/50'
                      : 'bg-white/50 border-stone-200/80 text-stone-400 cursor-not-allowed opacity-75'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 transition-all ${
                      isCurrent
                        ? 'bg-emerald-800 text-white shadow-2xs scale-105'
                        : isCompleted
                        ? 'bg-emerald-700 text-white'
                        : 'bg-stone-200 text-stone-500'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="min-w-0 flex-1 pl-1">
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-xs font-bold truncate block ${
                          isCurrent
                            ? 'text-stone-900'
                            : isCompleted
                            ? 'text-emerald-950'
                            : 'text-stone-500'
                        }`}
                      >
                        {step.title}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] truncate block ${
                        isCurrent
                          ? 'text-emerald-700 font-semibold'
                          : isCompleted
                          ? 'text-stone-500'
                          : 'text-stone-400'
                      }`}
                    >
                      {step.subtitle}
                    </span>
                  </div>
                </button>
                {idx < steps.length - 1 && (
                  <div
                    aria-hidden="true"
                    className={`mt-[22px] h-0.5 w-3 shrink-0 rounded-full transition-colors ${lineClass}`}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
};
