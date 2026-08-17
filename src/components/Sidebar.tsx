import React from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Wrench, 
  Bell, 
  PieChart, 
  Plus,
  ShieldCheck,
  ShieldAlert,
  BookOpen
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedCategory?: string;
  onCategorySelect?: (category: string) => void;
  onQuickAdd: () => void;
  needsAttentionCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onQuickAdd,
  needsAttentionCount,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attention', label: 'Pusat Perhatian', icon: ShieldAlert, badge: needsAttentionCount > 0 ? needsAttentionCount : null },
    { id: 'assets', label: 'Aset Saya', icon: Package },
    { id: 'maintenance', label: 'Perawatan & Servis', icon: Wrench },
    { id: 'reminders', label: 'Reminder Center', icon: Bell },
    { id: 'expenses', label: 'Biaya & TCO', icon: PieChart },
    { id: 'docs', label: 'Panduan & Docs', icon: BookOpen },
  ];

  return (
    <aside className="w-64 hidden lg:flex flex-col border-r border-stone-200 bg-white min-h-[calc(100vh-4rem)] p-4 justify-between shrink-0 select-none">
      <div className="space-y-6">
        
        {/* Quick Add Button */}
        <div>
          <button
            type="button"
            onClick={onQuickAdd}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Baru</span>
          </button>
        </div>

        {/* Primary Nav Menu */}
        <nav className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2">
            Navigasi Utama
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-200 font-semibold'
                    : 'bg-transparent text-stone-600 border-transparent hover:bg-stone-100 hover:text-stone-900'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-stone-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.badge ? (
                  <span className="px-2 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full shrink-0">
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

      </div>

      {/* Footer info */}
      <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1">
        <div className="flex items-center gap-2 text-xs font-semibold text-stone-800">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Offline-First Storage</span>
        </div>
        <p className="text-[11px] text-stone-500 leading-relaxed">
          Tersimpan aman di browser (IndexedDB) & tersinkronisasi.
        </p>
      </div>
    </aside>
  );
};


