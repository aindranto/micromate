import React, { useState, useEffect } from 'react';
import { Asset, Reminder, ReminderType, ReminderRepeatRule } from '../types';
import { createCanonicalReminder } from '../lib/reminderDomain';
import { X, Bell, Calendar, Tag, AlertCircle } from 'lucide-react';

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
  const [repeatRule, setRepeatRule] = useState<ReminderRepeatRule>('once');
  const [customDays, setCustomDays] = useState<number>(30);
  const [notes, setNotes] = useState('');

  // Sync initialAssetId when prop changes or modal opens
  useEffect(() => {
    if (initialAssetId) {
      setSelectedAssetId(initialAssetId);
    } else if (assets.length > 0 && !selectedAssetId) {
      setSelectedAssetId(assets[0].asset_id);
    }
  }, [initialAssetId, assets, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const chosenAsset = assets.find((a) => a.asset_id === selectedAssetId);

    // Call domain factory to ensure canonical shape & normalized fields
    const reminder = createCanonicalReminder({
      asset_id: selectedAssetId || undefined,
      asset_name: chosenAsset?.name,
      type,
      title: title.trim(),
      due_date: dueDate,
      repeat_rule: repeatRule,
      custom_interval_days: repeatRule === 'custom_days' ? customDays : undefined,
      notes: notes.trim() || undefined,
    });

    onSave(selectedAssetId || undefined, reminder);
    
    // Reset form
    setTitle('');
    setDueDate('');
    setNotes('');
    setRepeatRule('once');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        id="modal-add-reminder-content"
        className="bg-white rounded-3xl border border-stone-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-stone-900 text-lg tracking-tight">
                Tambah Pengingat Baru
              </h3>
              <p className="text-xs text-stone-500 font-medium">
                Buat jadwal pengingat untuk perawatan, pajak, atau garansi
              </p>
            </div>
          </div>
          <button 
            type="button" 
            id="btn-close-add-reminder-modal"
            onClick={onClose} 
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs flex-1 overflow-y-auto no-scrollbar">
          {/* Target Asset */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5">
              Aset Terkait (Opsional)
            </label>
            <select
              id="input-reminder-asset"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 cursor-pointer"
            >
              <option value="">-- Tanpa Aset Khusus (Pengingat Global) --</option>
              {assets.map((a) => (
                <option key={a.asset_id} value={a.asset_id}>
                  {a.name} ({a.category || 'Aset'})
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5">
              Judul Pengingat *
            </label>
            <input
              type="text"
              id="input-reminder-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="misal: Pajak Tahunan STNK / Ganti Oli Mesin / Perpanjang AppleCare"
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          {/* Category & Due Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="font-bold text-stone-800 block mb-1.5">
                Kategori *
              </label>
              <select
                id="input-reminder-type"
                value={type}
                onChange={(e) => setType(e.target.value as ReminderType)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium cursor-pointer"
              >
                <option value="maintenance">Perawatan / Servis</option>
                <option value="warranty">Masa Garansi</option>
                <option value="vehicle">Pajak STNK & Kendaraan</option>
                <option value="documents">Dokumen & Asuransi</option>
                <option value="custom">Lain-lain</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1.5">
                Tanggal Jatuh Tempo *
              </label>
              <input
                type="date"
                id="input-reminder-due-date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium cursor-pointer"
              />
            </div>
          </div>

          {/* Recurrence Rule */}
          <div className="space-y-2">
            <label className="font-bold text-stone-800 block">
              Siklus Pengulangan
            </label>
            <select
              id="input-reminder-repeat-rule"
              value={repeatRule}
              onChange={(e) => setRepeatRule(e.target.value as ReminderRepeatRule)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium cursor-pointer"
            >
              <option value="once">Sekali Saja (Non-Recurring)</option>
              <option value="daily">Setiap Hari</option>
              <option value="weekly">Setiap Minggu</option>
              <option value="monthly">Setiap Bulan</option>
              <option value="quarterly">Setiap 3 Bulan (Kuartal)</option>
              <option value="semi_annually">Setiap 6 Bulan (Semester)</option>
              <option value="annually">Setiap Tahun (Tahunan)</option>
              <option value="custom_days">Kustom Interval Hari</option>
            </select>

            {repeatRule === 'custom_days' && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-stone-600 font-semibold">Ulangi setiap</span>
                <input
                  type="number"
                  min="1"
                  max="3650"
                  value={customDays}
                  onChange={(e) => setCustomDays(parseInt(e.target.value, 10) || 30)}
                  className="w-20 px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 text-center"
                />
                <span className="text-stone-600 font-semibold">hari</span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              id="input-reminder-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Bawa buku servis dan KTP asli saat perpanjangan..."
              className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-medium text-stone-900 placeholder:text-stone-400 resize-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              id="btn-cancel-add-reminder"
              onClick={onClose}
              className="px-4 py-2.5 text-stone-700 font-bold hover:bg-stone-100 rounded-xl cursor-pointer transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-add-reminder"
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-black rounded-xl shadow-2xs transition-all cursor-pointer active:scale-95"
            >
              Simpan Pengingat
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
