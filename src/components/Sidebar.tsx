import React from 'react';
import {
  Box,
  Plus,
  ShieldCheck,
} from 'lucide-react';
import { NAV_ITEMS } from '../lib/navigation';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAdd: () => void;
  needsAttentionCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onQuickAdd,
  needsAttentionCount,
}) => {
  const mainItems = NAV_ITEMS.filter((item) => item.section === 'utama');
  const systemItems = NAV_ITEMS.filter((item) => item.section === 'sistem');

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    const badge = item.id === 'attention' && needsAttentionCount > 0 ? needsAttentionCount : null;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => onTabChange(item.id)}
        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs sm:text-sm transition-all cursor-pointer ${
          isActive
            ? 'bg-emerald-100/90 text-emerald-950 font-extrabold shadow-2xs'
            : 'bg-transparent text-stone-600 font-semibold hover:bg-stone-200/60 hover:text-stone-900'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-900' : 'text-stone-500'}`} />
          <span className="truncate">{item.label}</span>
        </div>
        {badge ? (
          <span className="px-2 py-0.5 text-[10px] font-extrabold bg-rose-600 text-white rounded-full shrink-0 shadow-2xs">
            {badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <aside className="w-64 hidden lg:flex flex-col border-r border-stone-200/80 bg-stone-50/50 shrink-0 select-none sticky top-16 self-start h-[calc(100vh-4rem)] overflow-y-auto p-4 justify-between">
      <div className="space-y-6">

        {/* MicroMate branding */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-9 h-9 rounded-2xl bg-emerald-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Box className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-stone-900 text-base tracking-tight leading-none truncate">
              MicroMate
            </p>
            <p className="text-[11px] text-stone-500 font-medium truncate mt-0.5">
              Personal Asset Vault
            </p>
          </div>
        </div>

        {/* M3 Extended FAB (Primary Action) */}
        <div>
          <button
            type="button"
            onClick={onQuickAdd}
            className="w-full py-3 px-5 bg-emerald-900 hover:bg-emerald-950 text-white font-bold rounded-full text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-200 shrink-0" />
            <span>Tambah Aset Baru</span>
          </button>
        </div>

        {/* Primary Nav Menu (M3 Navigation Rail Items) */}
        <nav className="space-y-1.5">
          <p className="px-4 text-[11px] font-bold text-stone-400 mb-2">
            Navigasi utama
          </p>
          {mainItems.map(renderItem)}
        </nav>

        {/* System destination: Pengaturan */}
        <nav className="space-y-1.5 pt-4 border-t border-stone-200/80">
          {systemItems.map(renderItem)}
        </nav>

      </div>

      {/* Footer Info Container (M3 Surface Card) */}
      <div className="p-3.5 bg-white rounded-3xl border border-stone-200/80 shadow-2xs space-y-1 mt-6">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
          <ShieldCheck className="w-4 h-4 text-emerald-800" />
          <span>Offline-First Storage</span>
        </div>
        <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
          Tersimpan aman di browser (IndexedDB) & tersinkronisasi.
        </p>
      </div>
    </aside>
  );
};
