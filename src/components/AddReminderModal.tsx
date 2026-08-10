import React, { useState, useEffect } from 'react';
import { Asset, Reminder, ReminderType, RepeatRule } from '../types';
import { X, Bell } from 'lucide-react';

interface AddReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  initialAssetId?: string;
  onSave: (assetId: string | undefined, reminder: Reminder) => void;
}

export const AddReminderModal: React.FC<AddReminderModalProps> = ({
  isOpen,
  onClose,
  assets,
  initialAssetId,
  onSave,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    initialAssetId || (assets.length > 0 ? assets[0].asset_id : '')
  );
  const [title, setTitle] = useState('');
  const [type, setType] = useState<ReminderType>('maintenance');
  const [dueDate, setDueDate] = useState('');
  const [repeatRule, setRepeatRule] = useState<RepeatRule>('none');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) return;

    const reminder: Reminder = {
      reminder_id: 'rem_' + Date.now(),
      asset_id: selectedAssetId || undefined,
      type,
      title,
      due_date: dueDate,
      repeat_rule: repeatRule,
      status: 'upcoming',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSave(selectedAssetId || undefined, reminder);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-md shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-stone-900 text-lg">
              Tambah Reminder Baru
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs flex-1 overflow-y-auto no-scrollbar">
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Aset Terkait (Opsional)
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            >
              <option value="">-- Tanpa Aset Khusus --</option>
              {assets.map((a) => (
                <option key={a.asset_id} value={a.asset_id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Judul Pengingat *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="misal: Jatuh tempo pajak STNK / Ganti filter AC"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-800 block mb-1">Kategori *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as ReminderType)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium"
              >
                <option value="maintenance">Maintenance / Service</option>
                <option value="warranty">Masa Garansi</option>
                <option value="vehicle">STNK & Pajak</option>
                <option value="documents">Dokumen / Asuransi</option>
                <option value="custom">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1">Tanggal Jatuh Tempo *</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Siklus Pengulangan</label>
            <select
              value={repeatRule}
              onChange={(e) => setRepeatRule(e.target.value as RepeatRule)}
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium"
            >
              <option value="none">Sekali Saja (Tanpa Pengulangan)</option>
              <option value="monthly">Setiap Bulan</option>
              <option value="quarterly">Setiap 3 Bulan (Quarterly)</option>
              <option value="semi_annually">Setiap 6 Bulan</option>
              <option value="annually">Setiap Tahun (Tahunan)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-stone-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-700 font-semibold hover:bg-stone-100 rounded-xl cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              Simpan Reminder
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
