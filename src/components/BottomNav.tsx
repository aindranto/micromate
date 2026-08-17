import React, { useState, useRef, useEffect } from 'react';
import { 
  House, 
  Box, 
  Plus, 
  Wrench, 
  Bell,
  Settings,
  X,
  PlusCircle,
  Clock,
  FileText
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAddAsset: () => void;
  onQuickAddMaintenance?: () => void;
  onQuickAddReminder?: () => void;
  onOpenSettings?: () => void;
  needsAttentionCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onQuickAddAsset,
  onQuickAddMaintenance,
  onQuickAddReminder,
  onOpenSettings,
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
        {/* Quick Action Popup Menu */}
        {isQuickActionOpen && (
          <div className="mb-3 w-56 sm:w-60 bg-white rounded-2xl border border-stone-200 shadow-2xl p-2 z-50 space-y-1 animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-150">
            <div className="px-3 py-1.5 border-b border-stone-100 flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-stone-500">Aksi Cepat</span>
              <button 
                type="button"
                onClick={() => setIsQuickActionOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg cursor-pointer"
                aria-label="Tutup menu aksi cepat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Add Asset */}
            <button
              type="button"
              onClick={() => handleActionClick(onQuickAddAsset)}
              className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-stone-800 hover:text-emerald-950 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center shrink-0">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <span className="block font-bold">Aset Baru</span>
                <span className="text-[10px] text-stone-400 font-normal block">Tambah perangkat / kendaraan</span>
              </div>
            </button>

            {/* Quick Add Maintenance */}
            {onQuickAddMaintenance && (
              <button
                type="button"
                onClick={() => handleActionClick(onQuickAddMaintenance)}
                className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-stone-800 hover:text-emerald-950 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center shrink-0">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold">Catat Servis</span>
                  <span className="text-[10px] text-stone-400 font-normal block">Rekam perbaikan &amp; biaya</span>
                </div>
              </button>
            )}

            {/* Quick Add Reminder */}
            {onQuickAddReminder && (
              <button
                type="button"
                onClick={() => handleActionClick(onQuickAddReminder)}
                className="w-full px-3 py-2 text-left rounded-xl hover:bg-emerald-50 text-stone-800 hover:text-emerald-950 flex items-center gap-2.5 text-xs font-bold transition-colors cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-900 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <span className="block font-bold">Tambah Reminder</span>
                  <span className="text-[10px] text-stone-400 font-normal block">Garansi, pajak, SIM &amp; jadwal</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Floating Action Button */}
        <button
          type="button"
          onClick={() => setIsQuickActionOpen(!isQuickActionOpen)}
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-emerald-800 hover:bg-emerald-900 text-white flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-all border-2 border-white cursor-pointer ${
            isQuickActionOpen ? 'rotate-45 bg-stone-900 hover:bg-stone-950 shadow-2xl' : ''
          }`}
          title="Aksi Cepat (+)"
          aria-label="Aksi Cepat"
        >
          <Plus className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
        </button>
      </div>

      {/* Fixed Bottom Navigation Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-stone-200/90 shadow-lg px-2 sm:px-4 py-1.5 transition-colors pb-safe">
        <div className="flex items-center justify-around max-w-md mx-auto relative">
          
          {/* 1. Home */}
          <button
            type="button"
            onClick={() => {
              setIsQuickActionOpen(false);
              onTabChange('dashboard');
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'dashboard' 
                ? 'bg-emerald-100/80 text-emerald-950 font-extrabold' 
                : 'text-stone-500 font-medium hover:text-stone-800'
            }`}
          >
            <House className={`w-5 h-5 ${activeTab === 'dashboard' ? 'text-emerald-900' : 'text-stone-500'}`} />
            <span className="text-[10px] tracking-tight">Home</span>
          </button>

          {/* 2. Aset */}
          <button
            type="button"
            onClick={() => {
              setIsQuickActionOpen(false);
              onTabChange('assets');
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'assets' 
                ? 'bg-emerald-100/80 text-emerald-950 font-extrabold' 
                : 'text-stone-500 font-medium hover:text-stone-800'
            }`}
          >
            <Box className={`w-5 h-5 ${activeTab === 'assets' ? 'text-emerald-900' : 'text-stone-500'}`} />
            <span className="text-[10px] tracking-tight">Aset</span>
          </button>

          {/* 3. Reminder (with badge) */}
          <button
            type="button"
            onClick={() => {
              setIsQuickActionOpen(false);
              onTabChange('reminders');
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'reminders' 
                ? 'bg-emerald-100/80 text-emerald-950 font-extrabold' 
                : 'text-stone-500 font-medium hover:text-stone-800'
            }`}
          >
            <div className="relative">
              <Bell className={`w-5 h-5 ${activeTab === 'reminders' ? 'text-emerald-900' : 'text-stone-500'}`} />
              {needsAttentionCount > 0 && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 min-w-[16px] h-[16px] rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white">
                  {needsAttentionCount}
                </span>
              )}
            </div>
            <span className="text-[10px] tracking-tight">Reminder</span>
          </button>

          {/* 4. Pengaturan (Settings) */}
          <button
            type="button"
            onClick={() => {
              setIsQuickActionOpen(false);
              if (onOpenSettings) {
                onOpenSettings();
              } else {
                onTabChange('settings');
              }
            }}
            className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings' 
                ? 'bg-emerald-100/80 text-emerald-950 font-extrabold' 
                : 'text-stone-500 font-medium hover:text-stone-800'
            }`}
          >
            <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-emerald-900' : 'text-stone-500'}`} />
            <span className="text-[10px] tracking-tight">Pengaturan</span>
          </button>

        </div>
      </div>
    </>
  );
};
