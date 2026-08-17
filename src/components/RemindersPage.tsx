import React, { useState, useMemo } from 'react';
import { Asset, Reminder, ReminderDerivedState, ReminderType } from '../types';
import { formatDate } from '../lib/utils';
import { getReminderPresentationState } from '../lib/reminderDomain';
import { 
  Bell, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Eye, 
  Calendar, 
  Sparkles, 
  Check, 
  X, 
  RefreshCw,
  Tag,
  Layers,
  ChevronRight
} from 'lucide-react';

interface RemindersPageProps {
  assets: Asset[];
  onAddReminder: () => void;
  onCompleteReminder: (reminderId: string) => void;
  onDismissReminder?: (reminderId: string) => void;
  onSelectAsset: (asset: Asset) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  assets,
  onAddReminder,
  onCompleteReminder,
  onDismissReminder,
  onSelectAsset,
}) => {
  // Navigation & Filter State
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'overdue' | 'upcoming' | 'completed'>('all');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // Reference Date: Pure UTC Day
  const todayYMD = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Collect & Enrich All Reminders across Assets
  const enrichedReminders = useMemo(() => {
    const list: Array<{
      reminder: Reminder;
      asset?: Asset;
      assetName: string;
      category: string;
      evaluation: ReturnType<typeof getReminderPresentationState>;
    }> = [];

    for (const asset of assets) {
      if (asset.reminders && asset.reminders.length > 0) {
        for (const rem of asset.reminders) {
          if (!rem.deleted) {
            const evalState = getReminderPresentationState(rem, todayYMD);
            list.push({
              reminder: rem,
              asset,
              assetName: rem.asset_name || asset.name,
              category: asset.category || 'general',
              evaluation: evalState,
            });
          }
        }
      }
    }

    // Sort: Overdue first (most overdue top), then Due Today, then Upcoming (nearest first), then Completed
    return list.sort((a, b) => {
      const orderMap: Record<ReminderDerivedState, number> = {
        overdue: 1,
        due_today: 2,
        upcoming: 3,
        completed: 4,
        dismissed: 5,
      };
      const rankDiff = orderMap[a.evaluation.displayStatus] - orderMap[b.evaluation.displayStatus];
      if (rankDiff !== 0) return rankDiff;

      // Within same category, sort by due_date ascending
      return a.reminder.due_date.localeCompare(b.reminder.due_date);
    });
  }, [assets, todayYMD]);

  // Section Counts
  const counts = useMemo(() => {
    return {
      all: enrichedReminders.filter((r) => r.reminder.status !== 'dismissed').length,
      overdue: enrichedReminders.filter((r) => r.evaluation.displayStatus === 'overdue').length,
      today: enrichedReminders.filter((r) => r.evaluation.displayStatus === 'due_today').length,
      upcoming: enrichedReminders.filter((r) => r.evaluation.displayStatus === 'upcoming').length,
      completed: enrichedReminders.filter((r) => r.reminder.status === 'completed').length,
    };
  }, [enrichedReminders]);

  // Filtered by selected filters
  const filteredList = useMemo(() => {
    return enrichedReminders.filter((item) => {
      // Tab Filter
      if (activeTab === 'overdue' && item.evaluation.displayStatus !== 'overdue') return false;
      if (activeTab === 'today' && item.evaluation.displayStatus !== 'due_today') return false;
      if (activeTab === 'upcoming' && item.evaluation.displayStatus !== 'upcoming') return false;
      if (activeTab === 'completed' && item.reminder.status !== 'completed') return false;
      if (activeTab === 'all' && item.reminder.status === 'dismissed') return false;

      // Asset Filter
      if (selectedAssetId !== 'all' && item.reminder.asset_id !== selectedAssetId && item.asset?.asset_id !== selectedAssetId) {
        return false;
      }

      // Category Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }

      return true;
    });
  }, [enrichedReminders, activeTab, selectedAssetId, selectedCategory]);

  // Groupings for Task-Oriented Dashboard
  const overdueItems = useMemo(
    () => filteredList.filter((item) => item.evaluation.displayStatus === 'overdue'),
    [filteredList]
  );
  const todayItems = useMemo(
    () => filteredList.filter((item) => item.evaluation.displayStatus === 'due_today'),
    [filteredList]
  );
  const upcomingItems = useMemo(
    () => filteredList.filter((item) => item.evaluation.displayStatus === 'upcoming'),
    [filteredList]
  );
  const completedItems = useMemo(
    () => filteredList.filter((item) => item.reminder.status === 'completed'),
    [filteredList]
  );

  // Action Handlers
  const handleComplete = async (reminderId: string) => {
    if (isProcessingId) return; // Double-click lock
    setIsProcessingId(reminderId);
    try {
      await onCompleteReminder(reminderId);
    } finally {
      setIsProcessingId(null);
    }
  };

  const handleDismiss = async (reminderId: string) => {
    if (!onDismissReminder || isProcessingId) return;
    setIsProcessingId(reminderId);
    try {
      await onDismissReminder(reminderId);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Helper for Repeat Rule badge
  const renderRepeatBadge = (rule: string) => {
    if (!rule || rule === 'once' || rule === 'none') return null;
    const labels: Record<string, string> = {
      daily: 'Harian',
      weekly: 'Mingguan',
      monthly: 'Bulanan',
      quarterly: '3 Bulanan',
      semi_annually: '6 Bulanan',
      annually: 'Tahunan',
      custom_days: 'Custom Hari',
      custom_km: 'Berdasarkan KM',
    };
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
        <RefreshCw className="w-2.5 h-2.5" />
        {labels[rule] || rule}
      </span>
    );
  };

  // Render a single Reminder Task Card
  const renderReminderCard = (item: (typeof enrichedReminders)[0]) => {
    const { reminder, asset, assetName, evaluation } = item;
    const isOverdue = evaluation.displayStatus === 'overdue';
    const isDueToday = evaluation.displayStatus === 'due_today';
    const isCompleted = reminder.status === 'completed';
    const isProcessing = isProcessingId === reminder.reminder_id;

    return (
      <div
        key={`card-${reminder.reminder_id}`}
        id={`reminder-card-${reminder.reminder_id}`}
        className={`bg-white rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isOverdue
            ? 'border-rose-300 bg-rose-50/30 hover:border-rose-400'
            : isDueToday
            ? 'border-amber-300 bg-amber-50/20 hover:border-amber-400'
            : isCompleted
            ? 'border-stone-200 bg-stone-50/60 opacity-75'
            : 'border-stone-200 hover:border-emerald-600'
        }`}
      >
        <div className="space-y-2 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Pill */}
            <span
              className={`px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                isOverdue
                  ? 'bg-rose-600 text-white border-rose-700 shadow-2xs'
                  : isDueToday
                  ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                  : isCompleted
                  ? 'bg-stone-200 text-stone-700 border-stone-300'
                  : 'bg-emerald-100 text-emerald-900 border-emerald-200'
              }`}
            >
              {isOverdue ? '🔴 Overdue' : isDueToday ? '🟡 Hari Ini' : isCompleted ? '🟢 Selesai' : '🔵 Mendatang'}
            </span>

            {/* Relative Delta Label */}
            {isOverdue && (
              <span className="text-[11px] font-extrabold text-rose-700">
                • Terlambat {Math.abs(evaluation.daysRemaining)} hari
              </span>
            )}
            {isDueToday && (
              <span className="text-[11px] font-extrabold text-amber-900">
                • Jatuh tempo hari ini
              </span>
            )}
            {!isOverdue && !isDueToday && !isCompleted && (
              <span className="text-[11px] font-semibold text-stone-600">
                • {evaluation.daysRemaining} hari lagi
              </span>
            )}

            {/* Repeat rule badge */}
            {renderRepeatBadge(reminder.repeat_rule)}

            {/* Asset Link */}
            {asset && (
              <button
                type="button"
                id={`btn-nav-asset-${reminder.reminder_id}`}
                onClick={() => onSelectAsset(asset)}
                className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer ml-auto sm:ml-0 flex items-center gap-1"
              >
                <span>{assetName}</span>
                <ChevronRight className="w-3 h-3 text-emerald-600" />
              </button>
            )}
          </div>

          <h4 className="font-black text-stone-900 text-base tracking-tight leading-snug">
            {reminder.title}
          </h4>

          <div className="flex items-center gap-3 text-xs text-stone-600 font-medium flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Jatuh Tempo: <strong className="text-stone-800">{formatDate(reminder.due_date)}</strong></span>
            </span>

            {reminder.notes && (
              <span className="text-stone-500 max-w-md truncate">
                • {reminder.notes}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {asset && (
            <button
              type="button"
              id={`btn-view-asset-${reminder.reminder_id}`}
              onClick={() => onSelectAsset(asset)}
              className="px-3 py-1.5 text-xs font-bold bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Detail Aset</span>
            </button>
          )}

          {!isCompleted && (
            <>
              {onDismissReminder && (
                <button
                  type="button"
                  id={`btn-dismiss-${reminder.reminder_id}`}
                  disabled={isProcessing}
                  onClick={() => handleDismiss(reminder.reminder_id)}
                  title="Abaikan pengingat ini"
                  className="px-3 py-1.5 text-xs font-bold bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                >
                  Abaikan
                </button>
              )}

              <button
                type="button"
                id={`btn-complete-${reminder.reminder_id}`}
                disabled={isProcessing}
                onClick={() => handleComplete(reminder.reminder_id)}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black rounded-xl shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{isProcessing ? 'Memproses...' : 'Selesaikan'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            <span>Reminder Hub</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
              Task-Oriented
            </span>
          </h2>
          <p className="text-xs font-medium text-stone-600 mt-0.5">
            Kelola jadwal servis berkala, perpanjangan pajak STNK, asuransi, dan masa aktif garansi
          </p>
        </div>

        <button
          type="button"
          id="btn-add-reminder-hub"
          onClick={onAddReminder}
          className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-xs shadow-2xs hover:shadow-xs transition-all flex items-center gap-2 cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pengingat</span>
        </button>
      </div>

      {/* Primary Tab Filter with Live Counters */}
      <div className="flex items-center gap-1.5 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-200 flex-wrap">
        {[
          { id: 'all', label: 'Semua', count: counts.all },
          { id: 'today', label: 'Hari Ini', count: counts.today, badgeColor: 'bg-amber-600' },
          { id: 'overdue', label: 'Terlambat', count: counts.overdue, badgeColor: 'bg-rose-600' },
          { id: 'upcoming', label: 'Mendatang', count: counts.upcoming },
          { id: 'completed', label: 'Selesai', count: counts.completed },
        ].map((tab) => (
          <button
            key={tab.id}
            id={`tab-reminder-${tab.id}`}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-emerald-800 text-white shadow-2xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black leading-none ${
                  activeTab === tab.id
                    ? 'bg-emerald-950 text-white'
                    : tab.badgeColor
                    ? `${tab.badgeColor} text-white`
                    : 'bg-stone-200 text-stone-800'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Secondary Filter Bar: Asset & Category */}
      <div className="flex items-center gap-3 flex-wrap text-xs bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs">
        <div className="flex items-center gap-1.5 text-stone-500 font-bold">
          <Filter className="w-3.5 h-3.5" />
          <span>Filter:</span>
        </div>

        {/* Asset Selector */}
        <select
          id="select-filter-asset"
          value={selectedAssetId}
          onChange={(e) => setSelectedAssetId(e.target.value)}
          className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="all">Semua Aset ({assets.length})</option>
          {assets.map((a) => (
            <option key={`opt-asset-${a.asset_id}`} value={a.asset_id}>
              {a.name}
            </option>
          ))}
        </select>

        {/* Category Selector */}
        <select
          id="select-filter-category"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-800 focus:outline-none focus:border-emerald-600 cursor-pointer"
        >
          <option value="all">Semua Kategori</option>
          <option value="vehicle">Kendaraan</option>
          <option value="electronics">Elektronik</option>
          <option value="appliances">Peralatan Rumah</option>
          <option value="general">Lainnya</option>
        </select>

        {(selectedAssetId !== 'all' || selectedCategory !== 'all') && (
          <button
            type="button"
            id="btn-reset-filters"
            onClick={() => {
              setSelectedAssetId('all');
              setSelectedCategory('all');
            }}
            className="text-[11px] font-bold text-rose-700 hover:text-rose-900 cursor-pointer underline ml-auto"
          >
            Reset Filter
          </button>
        )}
      </div>

      {/* Main Task List Area */}
      {filteredList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center space-y-3 shadow-2xs">
          <Bell className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-900 text-base">
            Tidak ada pengingat pada filter ini
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Semua agenda jadwal perawatan, garansi, dan pajak kendaraan Anda berjalan sesuai rencana.
          </p>
          <button
            type="button"
            id="btn-empty-add-reminder"
            onClick={onAddReminder}
            className="px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-all cursor-pointer inline-flex items-center gap-1.5 mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Pengingat Baru</span>
          </button>
        </div>
      ) : activeTab === 'all' ? (
        /* Task-Oriented Grouped Layout */
        <div className="space-y-8">
          {/* Overdue Section */}
          {overdueItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                  <h3 className="font-black text-sm text-rose-900 uppercase tracking-wider">
                    ⚠️ Jatuh Tempo (Overdue)
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-black bg-rose-100 text-rose-800 rounded-md border border-rose-200">
                    {overdueItems.length}
                  </span>
                </div>
                <span className="text-xs text-rose-700 font-semibold">Perlu tindakan segera</span>
              </div>
              <div className="space-y-3">
                {overdueItems.map((item) => renderReminderCard(item))}
              </div>
            </div>
          )}

          {/* Today Section */}
          {todayItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <h3 className="font-black text-sm text-amber-950 uppercase tracking-wider">
                    📅 Hari Ini (Due Today)
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-black bg-amber-100 text-amber-900 rounded-md border border-amber-200">
                    {todayItems.length}
                  </span>
                </div>
                <span className="text-xs text-amber-800 font-semibold">Jadwal hari ini</span>
              </div>
              <div className="space-y-3">
                {todayItems.map((item) => renderReminderCard(item))}
              </div>
            </div>
          )}

          {/* Upcoming Section */}
          {upcomingItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h3 className="font-black text-sm text-stone-900 uppercase tracking-wider">
                    🔵 Mendatang (Upcoming)
                  </h3>
                  <span className="px-2 py-0.5 text-xs font-black bg-stone-100 text-stone-700 rounded-md border border-stone-200">
                    {upcomingItems.length}
                  </span>
                </div>
                <span className="text-xs text-stone-500 font-semibold">Agenda selanjutnya</span>
              </div>
              <div className="space-y-3">
                {upcomingItems.map((item) => renderReminderCard(item))}
              </div>
            </div>
          )}

          {/* Completed Section (if all tab) */}
          {completedItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                <h3 className="font-black text-sm text-stone-600 uppercase tracking-wider">
                  🟢 Selesai (Completed)
                </h3>
                <span className="px-2 py-0.5 text-xs font-black bg-stone-100 text-stone-600 rounded-md border border-stone-200">
                  {completedItems.length}
                </span>
              </div>
              <div className="space-y-3">
                {completedItems.map((item) => renderReminderCard(item))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Tab Specific List */
        <div className="space-y-3">
          {filteredList.map((item) => renderReminderCard(item))}
        </div>
      )}
    </div>
  );
};
