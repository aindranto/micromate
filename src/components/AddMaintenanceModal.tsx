import React, { useState, useEffect, useId } from 'react';
import { Asset, MaintenanceType } from '../types';
import { CreateMaintenanceInput } from '../lib/maintenanceDomain';
import { formatRupiah } from '../lib/utils';
import { 
  X, 
  Wrench, 
  Car, 
  Calendar, 
  DollarSign, 
  Building2, 
  FileText, 
  Bell, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Info,
  Loader2,
  Gauge
} from 'lucide-react';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: Asset[];
  initialAssetId?: string;
  onSave: (
    assetId: string, 
    input: CreateMaintenanceInput,
    options?: {
      allowOdometerCorrection?: boolean;
      correctionReason?: string;
      performedBy?: string;
      mutationId?: string;
    }
  ) => Promise<void> | void;
}

const MAINTENANCE_OPTIONS: Array<{ value: MaintenanceType; label: string; defaultDays: number; defaultKm: number }> = [
  { value: 'routine_service', label: 'Servis Rutin Berkala', defaultDays: 90, defaultKm: 4000 },
  { value: 'oil_change', label: 'Ganti Oli Mesin / Gardan', defaultDays: 60, defaultKm: 2500 },
  { value: 'repair', label: 'Perbaikan / Ganti Sparepart', defaultDays: 180, defaultKm: 8000 },
  { value: 'tire', label: 'Ban & Velg', defaultDays: 180, defaultKm: 10000 },
  { value: 'battery', label: 'Aki / Baterai', defaultDays: 365, defaultKm: 20000 },
  { value: 'brake', label: 'Kampas & Minyak Rem', defaultDays: 120, defaultKm: 6000 },
  { value: 'transmission', label: 'Transmisi / CVT / Rantai', defaultDays: 120, defaultKm: 8000 },
  { value: 'ac', label: 'Cuci / Servis AC', defaultDays: 90, defaultKm: 5000 },
  { value: 'custom', label: 'Perawatan Lainnya', defaultDays: 90, defaultKm: 5000 },
];

export const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({
  isOpen,
  onClose,
  assets,
  initialAssetId,
  onSave,
}) => {
  const formId = useId();

  // Selected asset
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  
  // Core fields
  const [type, setType] = useState<MaintenanceType>('routine_service');
  const [date, setDate] = useState<string>('');
  const [cost, setCost] = useState<number | ''>('');
  const [provider, setProvider] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Vehicle specific: Odometer
  const [mileage, setMileage] = useState<number | ''>('');
  const [isOdometerCorrection, setIsOdometerCorrection] = useState<boolean>(false);
  const [correctionReason, setCorrectionReason] = useState<string>('');

  // Next reminder forecast
  const [createReminder, setCreateReminder] = useState<boolean>(true);
  const [intervalDays, setIntervalDays] = useState<number>(60);
  const [intervalKm, setIntervalKm] = useState<number>(2500);

  // Advanced Financial breakdown (collapsible)
  const [showAdvancedFinance, setShowAdvancedFinance] = useState<boolean>(false);
  const [subtotal, setSubtotal] = useState<number | ''>('');
  const [tax, setTax] = useState<number | ''>('');
  const [discount, setDiscount] = useState<number | ''>('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Synchronize initial state whenever modal opens or initialAssetId changes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const targetId = initialAssetId || (assets.length > 0 ? assets[0].asset_id : '');
      setSelectedAssetId(targetId);
      
      const todayYMD = new Date().toISOString().split('T')[0];
      setDate(todayYMD);
      setType('routine_service');
      setCost('');
      setProvider('');
      setNotes('');
      setIsOdometerCorrection(false);
      setCorrectionReason('');
      setShowAdvancedFinance(false);
      setSubtotal('');
      setTax('');
      setDiscount('');
      setErrorMessage(null);
      setIsSubmitting(false);

      const selAsset = assets.find((a) => a.asset_id === targetId);
      if (selAsset?.vehicle_details?.current_mileage) {
        setMileage(selAsset.vehicle_details.current_mileage);
      } else {
        setMileage('');
      }
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, initialAssetId, assets]);

  // When selected asset changes, update mileage default
  const handleAssetChange = (newAssetId: string) => {
    setSelectedAssetId(newAssetId);
    setErrorMessage(null);
    setIsOdometerCorrection(false);
    setCorrectionReason('');

    const sel = assets.find((a) => a.asset_id === newAssetId);
    if (sel?.vehicle_details?.current_mileage) {
      setMileage(sel.vehicle_details.current_mileage);
    } else {
      setMileage('');
    }
  };

  // When service type changes, update default reminder intervals
  const handleTypeChange = (newType: MaintenanceType) => {
    setType(newType);
    const opt = MAINTENANCE_OPTIONS.find((o) => o.value === newType);
    if (opt) {
      setIntervalDays(opt.defaultDays);
      setIntervalKm(opt.defaultKm);
    }
  };

  if (!isOpen) return null;

  const currentAsset = assets.find((a) => a.asset_id === selectedAssetId);
  const isVehicle = currentAsset?.category === 'vehicle' || !!currentAsset?.vehicle_details;
  const currentRecordedMileage = currentAsset?.vehicle_details?.current_mileage || 0;

  // Check if odometer is reversed
  const isOdometerDecreasing = isVehicle && typeof mileage === 'number' && mileage < currentRecordedMileage;

  // Effective cost calculation
  const calculatedCost = typeof cost === 'number' && cost >= 0 
    ? cost 
    : (typeof subtotal === 'number' ? Math.max(0, subtotal + (Number(tax) || 0) - (Number(discount) || 0)) : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetId) {
      setErrorMessage('Pilih aset yang akan diservis.');
      return;
    }

    if (calculatedCost <= 0 && cost === '') {
      setErrorMessage('Masukkan total biaya servis.');
      return;
    }

    if (isVehicle && isOdometerDecreasing && !isOdometerCorrection) {
      setErrorMessage(`Odometer (${Number(mileage).toLocaleString('id-ID')} km) lebih rendah dari catatan saat ini (${currentRecordedMileage.toLocaleString('id-ID')} km). Centang koreksi odometer jika ini perbaikan catatan.`);
      return;
    }

    if (isOdometerCorrection && !correctionReason.trim()) {
      setErrorMessage('Wajib mengisi alasan koreksi odometer.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const maintId = `maint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mutationId = `MUT-MAINT-CREATE-${maintId}`;

    const input: CreateMaintenanceInput = {
      maintenance_id: maintId,
      asset_id: selectedAssetId,
      type,
      date: date || new Date().toISOString().split('T')[0],
      cost: Number(cost) || (typeof subtotal === 'number' ? calculatedCost : 0),
      subtotal: typeof subtotal === 'number' ? subtotal : undefined,
      tax: typeof tax === 'number' ? tax : undefined,
      discount: typeof discount === 'number' ? discount : undefined,
      mileage: isVehicle && typeof mileage === 'number' ? mileage : undefined,
      provider: provider.trim() || undefined,
      notes: notes.trim() || undefined,
      interval_days: createReminder ? intervalDays : undefined,
      interval_km: isVehicle && createReminder ? intervalKm : undefined,
      create_next_reminder: createReminder,
    };

    try {
      await onSave(selectedAssetId, input, {
        allowOdometerCorrection: isOdometerCorrection,
        correctionReason: isOdometerCorrection ? correctionReason.trim() : undefined,
        performedBy: provider.trim() || 'Admin / User',
        mutationId,
      });

      setIsSubmitting(false);
      onClose();
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Servis belum tersimpan. Tidak ada perubahan sebagian yang diterapkan.');
    }
  };

  return (
    <div 
      id={`modal-maint-backdrop-${formId}`}
      className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
    >
      <div 
        id={`modal-maint-card-${formId}`}
        className="bg-white rounded-3xl border border-stone-200/80 w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-200"
      >
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 border-b border-stone-200/80 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100/90 text-emerald-950 flex items-center justify-center shadow-2xs">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base sm:text-lg leading-tight">
                Catat Servis & Perawatan
              </h3>
              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                Pencatatan riwayat teknis, pengeluaran & pengingat berkala
              </p>
            </div>
          </div>
          <button 
            type="button" 
            id={`btn-close-modal-${formId}`}
            onClick={onClose} 
            disabled={isSubmitting}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ERROR NOTIFICATION BANNER */}
        {errorMessage && (
          <div className="px-5 py-3 bg-rose-50 border-b border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block">Peringatan Transaksi:</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* MODAL BODY FORM */}
        <form 
          id={`form-add-maintenance-${formId}`}
          onSubmit={handleSubmit} 
          className="p-5 sm:p-6 space-y-4 text-xs flex-1 overflow-y-auto"
        >
          
          {/* FIELD 1: PILIH ASET */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5 flex items-center justify-between">
              <span>Pilih Aset Yang Dirawat <span className="text-rose-500">*</span></span>
              {currentAsset && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                  {currentAsset.category.toUpperCase()}
                </span>
              )}
            </label>
            <select
              id={`select-asset-${formId}`}
              value={selectedAssetId}
              onChange={(e) => handleAssetChange(e.target.value)}
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-semibold text-stone-900 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all cursor-pointer"
            >
              {assets.map((a) => (
                <option key={a.asset_id} value={a.asset_id}>
                  {a.name} ({a.category}) {a.vehicle_details ? `— [${a.vehicle_details.license_plate}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* FIELD 2: JENIS SERVIS & TANGGAL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-bold text-stone-800 block mb-1.5">
                Jenis Servis <span className="text-rose-500">*</span>
              </label>
              <select
                id={`select-type-${formId}`}
                value={type}
                onChange={(e) => handleTypeChange(e.target.value as MaintenanceType)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
              >
                {MAINTENANCE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-stone-800 block mb-1.5">
                Tanggal Servis <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                id={`input-date-${formId}`}
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 font-semibold focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
              />
            </div>
          </div>

          {/* FIELD 3: BIAYA & ODOMETER (CONDITIONAL VEHICLE) */}
          <div className={`grid ${isVehicle ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'} gap-3`}>
            <div>
              <label className="font-bold text-stone-800 block mb-1.5 flex items-center justify-between">
                <span>Total Biaya Servis (Rp) <span className="text-rose-500">*</span></span>
                {typeof cost === 'number' && cost > 0 && (
                  <span className="text-[10px] text-emerald-800 font-bold">
                    {formatRupiah(cost)}
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">
                  Rp
                </span>
                <input
                  type="number"
                  id={`input-cost-${formId}`}
                  required={!showAdvancedFinance}
                  value={cost}
                  onChange={(e) => setCost(e.target.value ? Number(e.target.value) : '')}
                  placeholder="250000"
                  min="0"
                  disabled={isSubmitting}
                  className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                />
              </div>
            </div>

            {/* ODOMETER INPUT (ONLY FOR VEHICLES) */}
            {isVehicle && (
              <div>
                <label className="font-bold text-stone-800 block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5 text-stone-500" />
                    <span>Km Odometer Saat Ini</span>
                  </span>
                  {currentRecordedMileage > 0 && (
                    <span className="text-[10px] text-stone-500 font-medium">
                      Tercatat: {currentRecordedMileage.toLocaleString('id-ID')} km
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    id={`input-mileage-${formId}`}
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value ? Number(e.target.value) : '')}
                    placeholder={currentRecordedMileage ? currentRecordedMileage.toString() : '12500'}
                    min="0"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl font-bold text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium text-xs">
                    km
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* ODOMETER DECREASING / CORRECTION SAFEGUARD */}
          {isVehicle && isOdometerDecreasing && (
            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2.5 animate-in fade-in">
              <div className="flex items-start gap-2 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-snug">
                  <strong>Peringatan Odometer:</strong> Nilai {Number(mileage).toLocaleString('id-ID')} km lebih rendah dari catatan sebelumnya ({currentRecordedMileage.toLocaleString('id-ID')} km).
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs font-bold text-stone-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  id={`chk-odometer-correction-${formId}`}
                  checked={isOdometerCorrection}
                  onChange={(e) => setIsOdometerCorrection(e.target.checked)}
                  disabled={isSubmitting}
                  className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-600 border-stone-300 cursor-pointer"
                />
                <span>Koreksi Odometer (Perbaikan salah input / ganti speedometer)</span>
              </label>

              {isOdometerCorrection && (
                <div className="pt-1">
                  <label className="font-semibold text-stone-800 block mb-1 text-[11px]">
                    Alasan Koreksi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id={`input-correction-reason-${formId}`}
                    required
                    value={correctionReason}
                    onChange={(e) => setCorrectionReason(e.target.value)}
                    placeholder="Contoh: Koreksi typo pencatatan kasir bengkel"
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 bg-white border border-amber-300 rounded-xl text-stone-900 placeholder:text-stone-400 text-xs font-medium focus:ring-2 focus:ring-amber-500/30"
                  />
                </div>
              )}
            </div>
          )}

          {/* FIELD 4: BENGKEL / TEKNISI */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-stone-500" />
              <span>Bengkel / Penyedia Jasa / Teknisi</span>
            </label>
            <input
              type="text"
              id={`input-provider-${formId}`}
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="AHASS, Shop&Drive, Bengkel Berkah, Teknisi Budi..."
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all"
            />
          </div>

          {/* FIELD 5: CATATAN PENGERJAAN */}
          <div>
            <label className="font-bold text-stone-800 block mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              <span>Catatan Pengerjaan & Suku Cadang</span>
            </label>
            <textarea
              rows={2}
              id={`textarea-notes-${formId}`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Rincian oli yang digunakan, part yang diganti, atau kendala kendaraan..."
              disabled={isSubmitting}
              className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 transition-all resize-none"
            />
          </div>

          {/* ADVANCED FINANCIAL BREAKDOWN (COLLAPSIBLE ACCORDION) */}
          <div className="border border-stone-200 rounded-2xl overflow-hidden bg-stone-50/50">
            <button
              type="button"
              id={`btn-toggle-advanced-finance-${formId}`}
              onClick={() => setShowAdvancedFinance(!showAdvancedFinance)}
              className="w-full px-3.5 py-2.5 flex items-center justify-between text-stone-700 hover:text-stone-900 font-bold text-[11px] transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-stone-500" />
                <span>Rincian Finansial Lanjutan (Pajak, Diskon, Subtotal)</span>
              </span>
              {showAdvancedFinance ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showAdvancedFinance && (
              <div className="p-3.5 pt-1 border-t border-stone-200/80 grid grid-cols-3 gap-2.5 bg-white">
                <div>
                  <label className="font-semibold text-stone-600 block mb-1 text-[10px]">Subtotal (Rp)</label>
                  <input
                    type="number"
                    value={subtotal}
                    onChange={(e) => setSubtotal(e.target.value ? Number(e.target.value) : '')}
                    placeholder="250000"
                    disabled={isSubmitting}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 block mb-1 text-[10px]">Pajak PPN (Rp)</label>
                  <input
                    type="number"
                    value={tax}
                    onChange={(e) => setTax(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    disabled={isSubmitting}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                  />
                </div>
                <div>
                  <label className="font-semibold text-stone-600 block mb-1 text-[10px]">Diskon / Voucher (Rp)</label>
                  <input
                    type="number"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value ? Number(e.target.value) : '')}
                    placeholder="0"
                    disabled={isSubmitting}
                    className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-semibold text-stone-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FIELD 6: PENGINGAT SERVIS BERIKUTNYA */}
          <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-200/80 space-y-2.5">
            <label className="flex items-center justify-between text-xs font-bold text-stone-900 cursor-pointer">
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-700" />
                <span>Jadwalkan Pengingat Servis Berikutnya Otomatis</span>
              </span>
              <input
                type="checkbox"
                id={`chk-create-reminder-${formId}`}
                checked={createReminder}
                onChange={(e) => setCreateReminder(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 rounded text-emerald-800 focus:ring-emerald-600 border-stone-300 cursor-pointer"
              />
            </label>

            {createReminder && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-stone-600 block mb-1">
                    Interval Waktu (Hari)
                  </label>
                  <input
                    type="number"
                    id={`input-interval-days-${formId}`}
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(Number(e.target.value) || 30)}
                    min="1"
                    disabled={isSubmitting}
                    className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-stone-900 font-bold text-xs"
                  />
                </div>

                {isVehicle && (
                  <div>
                    <label className="text-[10px] font-bold text-stone-600 block mb-1">
                      Interval Jarak (Km)
                    </label>
                    <input
                      type="number"
                      id={`input-interval-km-${formId}`}
                      value={intervalKm}
                      onChange={(e) => setIntervalKm(Number(e.target.value) || 1000)}
                      min="100"
                      disabled={isSubmitting}
                      className="w-full px-3 py-1.5 bg-white border border-emerald-200 rounded-xl text-stone-900 font-bold text-xs"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* TRANSACTION IMPACT PREVIEW (RINGKASAN DAMPAK OTOMATIS) */}
          <div 
            id={`preview-transaction-impact-${formId}`}
            className="p-3.5 bg-stone-100/80 rounded-2xl border border-stone-200 text-[11px] space-y-1.5 text-stone-700"
          >
            <span className="font-extrabold text-stone-900 uppercase tracking-wider block text-[10px] flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-emerald-700" />
              <span>Dampak Transaksi Setelah Disimpan:</span>
            </span>
            <div className="space-y-1 pl-1 font-medium">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Riwayat servis dicatat ke timeline aset</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>
                  <strong>{formatRupiah(calculatedCost || Number(cost) || 0)}</strong> otomatis masuk ke Pengeluaran (TCO)
                </span>
              </div>
              {isVehicle && typeof mileage === 'number' && mileage > 0 && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    Odometer diperbarui ke <strong>{mileage.toLocaleString('id-ID')} km</strong>
                  </span>
                </div>
              )}
              {createReminder && (
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>
                    Pengingat berikutnya dijadwalkan (+{intervalDays} hari {isVehicle ? `/ +${intervalKm.toLocaleString('id-ID')} km` : ''})
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* MODAL FOOTER BUTTONS */}
          <div className="pt-3 border-t border-stone-200/80 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
            <button
              type="button"
              id={`btn-cancel-${formId}`}
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 text-stone-700 font-bold text-xs sm:text-sm hover:bg-stone-100 rounded-full cursor-pointer transition-all disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              id={`btn-submit-maintenance-${formId}`}
              disabled={isSubmitting || !selectedAssetId || (calculatedCost <= 0 && cost === '')}
              className="px-5 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs sm:text-sm rounded-full shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan Servis...</span>
                </>
              ) : (
                <span>Simpan Servis</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
