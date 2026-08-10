import React, { useState } from 'react';
import { Asset, Reminder } from '../types';
import { formatDate, getDaysRemaining } from '../lib/utils';
import { Bell, Plus, CheckCircle2, Clock, AlertTriangle, Filter } from 'lucide-react';

interface RemindersPageProps {
  assets: Asset[];
  onAddReminder: () => void;
  onCompleteReminder: (reminderId: string) => void;
  onSelectAsset: (asset: Asset) => void;
}

export const RemindersPage: React.FC<RemindersPageProps> = ({
  assets,
  onAddReminder,
  onCompleteReminder,
  onSelectAsset,
}) => {
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'overdue' | 'completed'>('all');

  // Collect all reminders across assets
  const allReminders = assets.flatMap((a) =>
    (a.reminders || []).map((r) => ({
      ...r,
      assetName: a.name,
      asset: a
    }))
  );

  const filteredReminders = allReminders.filter((r) => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight">
            Reminder Center
          </h2>
          <p className="text-xs font-medium text-stone-600 mt-0.5">
            Jadwal perawatan rutin, masa berlaku garansi, dan tanggal jatuh tempo pajak STNK
          </p>
        </div>

        <button
          type="button"
          onClick={onAddReminder}
          className="flex items-center justify-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-2xs transition-all active:scale-95 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Reminder</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-stone-100/80 p-1.5 rounded-2xl border border-stone-200 w-fit">
        {[
          { id: 'all', label: 'Semua' },
          { id: 'upcoming', label: 'Mendatang' },
          { id: 'overdue', label: 'Jatuh Tempo (Overdue)' },
          { id: 'completed', label: 'Selesai' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterStatus(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              filterStatus === tab.id
                ? 'bg-emerald-800 text-white font-bold shadow-2xs'
                : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Reminders List */}
      {filteredReminders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3 shadow-2xs">
          <Bell className="w-10 h-10 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-800 text-base">
            Tidak ada reminder ditemukan
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Semua agenda jadwal perawatan dan pengingat pajak kendaraan Anda aman.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReminders.map((rem, index) => {
            const daysLeft = rem.due_date ? getDaysRemaining(rem.due_date) : null;
            let relativeLabel = '';
            if (daysLeft !== null && rem.status !== 'completed') {
              if (daysLeft < 0) {
                relativeLabel = `TERLAMBAT ${Math.abs(daysLeft)} HARI`;
              } else if (daysLeft === 0) {
                relativeLabel = 'JATUH TEMPO HARI INI';
              } else {
                relativeLabel = `${daysLeft} HARI LAGI`;
              }
            }

            return (
              <div
                key={rem.reminder_id || (rem as any).id || `rem-pg-${index}`}
                className={`bg-white p-4.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all shadow-2xs ${
                  rem.status === 'overdue' || (daysLeft !== null && daysLeft < 0 && rem.status !== 'completed')
                    ? 'border-rose-200 bg-rose-50/40 hover:border-rose-300'
                    : rem.status === 'completed'
                    ? 'border-stone-200 opacity-60 bg-stone-50/50'
                    : 'border-stone-200 hover:border-emerald-600'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-md border ${
                      rem.status === 'overdue' || (daysLeft !== null && daysLeft < 0 && rem.status !== 'completed')
                        ? 'bg-rose-600 text-white border-rose-700'
                        : rem.status === 'completed'
                        ? 'bg-stone-200 text-stone-700 border-stone-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                    }`}>
                      {rem.status === 'overdue' || (daysLeft !== null && daysLeft < 0 && rem.status !== 'completed')
                        ? '🔴 Overdue'
                        : rem.status === 'completed'
                        ? 'Selesai'
                        : '🟠 Upcoming'}
                    </span>

                    {relativeLabel && (
                      <span className={`text-[11px] font-bold ${
                        daysLeft !== null && daysLeft <= 0 ? 'text-rose-700' : 'text-amber-900'
                      }`}>
                        • {relativeLabel}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onSelectAsset(rem.asset)}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 hover:underline cursor-pointer"
                    >
                      {rem.assetName}
                    </button>
                  </div>

                  <h4 className="font-bold text-stone-900 text-sm">
                    {rem.title}
                  </h4>

                  <p className="text-xs text-stone-600 font-medium flex items-center gap-1.5 flex-wrap">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>Jatuh Tempo: <strong>{formatDate(rem.due_date)}</strong></span>
                    {rem.repeat_rule && rem.repeat_rule !== 'none' && (
                      <span className="text-stone-500">• Siklus: {rem.repeat_rule}</span>
                    )}
                  </p>
                </div>

                {rem.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => onCompleteReminder(rem.reminder_id)}
                    className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all"
                  >
                    Selesaikan
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
