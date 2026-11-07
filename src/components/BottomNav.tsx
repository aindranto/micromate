import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Plus,
  Wrench,
  Bell,
  X
} from 'lucide-react';
import { BOTTOM_NAV_ITEMS } from '../lib/navigation';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAddAsset: () => void;
  onQuickAddMaintenance?: () => void;
  onQuickAddReminder?: () => void;
  needsAttentionCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onQuickAddAsset,
  onQuickAddMaintenance,
  onQuickAddReminder,
  needsAttentionCount,
}) => {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close quick action menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsQuickActionOpen(false);
      }
    };
    if (isQuickActionOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isQuickActionOpen]);

  const handleActionClick = (action: () => void) => {
    setIsQuickActionOpen(false);
    action();
  };

  return (
    <>
      {/* Backdrop for Quick Action Popup */}
      {isQuickActionOpen && (
        <div 
          className="fixed inset-0 bg-stone-900/30 backdrop-blur-2xs z-40 animate-in fade-in duration-150"
          onClick={() => setIsQuickActionOpen(false)}
        />
      )}

      {/* Standalone Fixed Bottom Right FAB (Floating Action Button) & Quick Action Popover */}
      <div 
        ref={menuRef}
        className="fixed bottom-20 right-5 sm:bottom-22 sm:right-6 lg:bottom-8 lg:right-8 z-50 flex flex-col items-end"
      >
        {/* Quick Action Popup Menu (M3 Container) */}
        {isQuickActionOpen && (
          <div className="mb-3 w-60 bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/80 shadow-2xl p-2.5 z-50 space-y-1 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-2 border-b border-stone-100/80 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">Aksi Cepat</span>
              <button 
                type="button"
                onClick={() => setIsQuickActionOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer transition-colors"
                aria-label="Tutup menu aksi cepat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Asset */}
            <button
              type="button"
              onClick={() => handleActionClick(onQuickAddAsset)}
              className="w-full px-3.5 py-2.5 text-left rounded-2xl hover:bg-emerald-50/80 text-stone-800 hover:text-emerald-950 flex items-center gap-3 text-xs font-bold transition-all cursor-pointer"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0 shadow-2xs">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold text-stone-900">Aset Baru</span>
                <span className="text-[10px] text-stone-400 font-medium block">Tambah perangkat / kendaraan</span>
              </div>
            </button>

            {/* Quick Add Maintenance */}
            {onQuickAddMaintenance && (
              <button
                type="button"
                onClick={() => handleActionClick(onQuickAddMaintenance)}
                className="w-full px-3.5 py-2.5 text-left rounded-2xl hover:bg-emerald-50/80 text-stone-800 hover:text-emerald-950 flex items-center gap-3 text-xs font-bold transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-stone-900">Catat Servis</span>
                  <span className="text-[10px] text-stone-400 font-medium block">Rekam perbaikan &amp; biaya</span>
                </div>
              </button>
            )}

            {/* Quick Add Reminder */}
            {onQuickAddReminder && (
              <button
                type="button"
                onClick={() => handleActionClick(onQuickAddReminder)}
                className="w-full px-3.5 py-2.5 text-left rounded-2xl hover:bg-emerald-50/80 text-stone-800 hover:text-emerald-950 flex items-center gap-3 text-xs font-bold transition-all cursor-pointer"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-900 flex items-center justify-center shrink-0 shadow-2xs">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold text-stone-900">Tambah Reminder</span>
                  <span className="text-[10px] text-stone-400 font-medium block">Garansi, pajak, SIM &amp; jadwal</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* M3 Floating Action Button (FAB) */}
        <button
          type="button"
          onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
          className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-emerald-900 hover:bg-emerald-950 text-white flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all border-2 border-white cursor-pointer ${
            isQuickActionOpen ? 'rotate-45 bg-stone-900 hover:bg-stone-950 shadow-2xl' : ''
          }`}
          title="Aksi Cepat (+)"
          aria-label="Aksi Cepat"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </button>
      </div>

      {/* Fixed M3 Bottom Navigation Bar.
          Item, label pendek, ikon, dan urutan diambil dari daftar navigasi
          bersama (src/lib/navigation.ts) — sama dengan sidebar desktop.
          Badge jumlah perhatian menempel di Reminder Center: satu-satunya
          rumah perhatian dan pengingat sejak v0.2.6 (dulu "Pusat Perhatian"
          digabung ke sini). */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200/80 shadow-lg px-2 sm:px-4 py-2 transition-all pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto relative">

          {BOTTOM_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const showBadge = item.id === 'reminders' && needsAttentionCount > 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setIsQuickActionOpen(false);
                  onTabChange(item.id);
                }}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-100/90 text-emerald-950 font-extrabold shadow-2xs'
                    : 'text-stone-500 font-semibold hover:text-stone-800'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-900' : 'text-stone-500'}`} />
                  {showBadge && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[16px] h-[16px] rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                      {needsAttentionCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] tracking-tight">{item.shortLabel}</span>
              </button>
            );
          })}

        </div>
      </div>
    </>
  );
};
