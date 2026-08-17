import React from 'react';
import { ResolvedAction } from '../../types';
import { ArrowRight, Lock } from 'lucide-react';

interface ActionResolverCTAProps {
  action: ResolvedAction;
  onExecute: (actionCode: string, contextData?: Record<string, any>) => void;
}

/**
 * Phase 3F-5B React UI Primitives: ActionResolverCTA
 * Consumes ResolvedAction and renders a dynamic, interactive button or fallback.
 * Zero business decision logic here.
 */
export const ActionResolverCTA: React.FC<ActionResolverCTAProps> = ({
  action,
  onExecute
}) => {
  const { action_code, label, description, available, context_data } = action;

  if (!available) {
    return (
      <div 
        className="flex items-center gap-2 p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-500 text-xs"
        data-testid="action-resolver-disabled"
      >
        <Lock className="w-3.5 h-3.5 shrink-0" />
        <div className="leading-relaxed">
          <span className="font-semibold block text-stone-600">{label}</span>
          <span>{description || 'Aksi ini tidak tersedia dalam kondisi saat ini.'}</span>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onExecute(action_code, context_data)}
      className="w-full flex items-center justify-between px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer group shadow-xs"
      data-testid={`action-resolver-cta-${action_code}`}
    >
      <div className="text-left min-w-0 pr-3">
        <span className="block text-white font-bold leading-normal truncate">
          {label}
        </span>
        {description && (
          <span className="block text-emerald-100/80 text-[10px] font-normal leading-normal truncate">
            {description}
          </span>
        )}
      </div>
      <ArrowRight className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 text-white" />
    </button>
  );
};
