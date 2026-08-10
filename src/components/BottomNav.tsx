import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Plus, 
  Wrench, 
  Bell 
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onQuickAdd: () => void;
  needsAttentionCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  onQuickAdd,
  needsAttentionCount,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-stone-200 px-4 py-2 transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        
        {/* Dashboard */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            activeTab === 'dashboard' ? 'text-emerald-800 font-bold' : 'text-stone-600 font-medium'
          }`}
        >
          <div className="relative">
            <LayoutDashboard className="w-5 h-5" />
            {needsAttentionCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-600 ring-2 ring-white" />
            )}
          </div>
          <span>Home</span>
        </button>

        {/* Assets */}
        <button
          type="button"
          onClick={() => onTabChange('assets')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            activeTab === 'assets' ? 'text-emerald-800 font-bold' : 'text-stone-600 font-medium'
          }`}
        >
          <Package className="w-5 h-5" />
          <span>Aset</span>
        </button>

        {/* Central Primary Action Button (+) */}
        <div className="relative -top-5">
          <button
            type="button"
            onClick={onQuickAdd}
            className="w-12 h-12 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow-md active:scale-95 transition-transform border-4 border-white cursor-pointer"
            title="Tambah Aset Baru"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Maintenance */}
        <button
          type="button"
          onClick={() => onTabChange('maintenance')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            activeTab === 'maintenance' ? 'text-emerald-800 font-bold' : 'text-stone-600 font-medium'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span>Servis</span>
        </button>

        {/* Reminders */}
        <button
          type="button"
          onClick={() => onTabChange('reminders')}
          className={`flex flex-col items-center gap-1 text-xs font-medium transition-colors ${
            activeTab === 'reminders' ? 'text-emerald-800 font-bold' : 'text-stone-600 font-medium'
          }`}
        >
          <Bell className="w-5 h-5" />
          <span>Reminder</span>
        </button>

      </div>
    </div>
  );
};
