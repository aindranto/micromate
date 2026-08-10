import React, { useState, useEffect } from 'react';
import { Asset, MaintenanceType, MaintenanceRecord } from '../types';
import { X, Wrench } from 'lucide-react';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  initialAssetId?: string;
  onSave: (assetId: string, record: MaintenanceRecord) => void;
}

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
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

  const [selectedAssetId, setSelectedAssetId] = useState(
    initialAssetId || (assets.length > 0 ? assets[0].asset_id : '')
  );
  const [type, setType] = useState<MaintenanceType>('routine_service');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mileage, setMileage] = useState<number | ''>('');
  const [cost, setCost] = useState<number | ''>('');
  const [provider, setProvider] = useState('');
  const [notes, setNotes] = useState('');
  const [nextMileage, setNextMileage] = useState<number | ''>('');

  if (!isOpen) return null;

  const selectedAsset = assets.find((a) => a.asset_id === selectedAssetId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId || !cost) return;

    const record: MaintenanceRecord = {
      maintenance_id: 'mnt_' + Date.now(),
      asset_id: selectedAssetId,
      type,
      date,
      mileage: mileage ? Number(mileage) : undefined,
      cost: Number(cost),
      provider: provider || undefined,
      notes: notes || undefined,
      next_mileage: nextMileage ? Number(nextMileage) : undefined,
      created_at: new Date().toISOString()
    };

    onSave(selectedAssetId, record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-lg">
              Catat Servis & Perawatan
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 text-xs flex-1 overflow-y-auto no-scrollbar">
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Pilih Aset Yang Dirawat *
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
            >
              {assets.map((a) => (
                <option key={a.asset_id} value={a.asset_id}>
                  {a.name} ({a.category}) {a.vehicle_details ? `- ${a.vehicle_details.license_plate}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-800 block mb-1">Jenis Servis *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as MaintenanceType)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium"
              >
                <option value="routine_service">Servis Rutin</option>
                <option value="oil_change">Ganti Oli Mesin/Gardan</option>
                <option value="tire">Ban & Velg</option>
                <option value="battery">Aki / Baterai</option>
                <option value="brake">Kampas Rem</option>
                <option value="transmission">Transmisi / CVT</option>
                <option value="ac">Cuci / Servis AC</option>
                <option value="repair">Perbaikan / Sparepart</option>
                <option value="custom">Lainnya</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1">Tanggal *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-medium"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-800 block mb-1">Biaya (Rp) *</label>
              <input
                type="number"
                required
                value={cost}
                onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
                placeholder="250000"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 placeholder:text-stone-400"
              />
            </div>

            {selectedAsset?.category === 'vehicle' && (
              <div>
                <label className="font-bold text-stone-800 block mb-1">Km Saat Ini</label>
                <input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value ? Number(e.target.value) : '')}
                  placeholder="12500"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium"
                />
              </div>
            )}
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Bengkel / Penyedia Jasa</label>
            <input
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="AHASS, Shop&Drive, iBox Center"
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Catatan Pengerjaan</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detail perbaikan atau item sparepart..."
              className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium"
            />
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
              Simpan Servis
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
