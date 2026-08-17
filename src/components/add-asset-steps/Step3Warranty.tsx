import React from 'react';
import { 
  DollarSign, Calendar, Store, ShieldCheck, Clock, 
  FileText, Shield, Sparkles, Check 
} from 'lucide-react';
import { formatRupiah } from '../../lib/utils';

interface Step3WarrantyProps {
  purchasePrice: number | '';
  setPurchasePrice: (price: number | '') => void;
  purchaseDate: string;
  handlePurchaseDateChange: (date: string) => void;
  purchaseLocation: string;
  setPurchaseLocation: (loc: string) => void;
  // Warranty fields
  hasWarranty: boolean;
  setHasWarranty: (has: boolean) => void;
  warrantyStartDate: string;
  handleWarrantyStartDateChange: (date: string) => void;
  warrantyMethod: 'duration' | 'manual';
  handleWarrantyMethodChange: (method: 'duration' | 'manual') => void;
  warrantyDurationValue: number | '';
  handleWarrantyDurationValueChange: (val: number | '') => void;
  warrantyDurationUnit: 'years' | 'months' | 'days';
  handleWarrantyDurationUnitChange: (unit: 'years' | 'months' | 'days') => void;
  warrantyEndDate: string;
  setWarrantyEndDate: (date: string) => void;
  warrantyProvider: string;
  setWarrantyProvider: (provider: string) => void;
  warrantyNumber: string;
  setWarrantyNumber: (num: string) => void;
  warrantyType: string;
  setWarrantyType: (type: string) => void;
  warrantyNotes: string;
  setWarrantyNotes: (notes: string) => void;
  brand: string;
}

export const Step3Warranty: React.FC<Step3WarrantyProps> = ({
  purchasePrice,
  setPurchasePrice,
  purchaseDate,
  handlePurchaseDateChange,
  purchaseLocation,
  setPurchaseLocation,
  hasWarranty,
  setHasWarranty,
  warrantyStartDate,
  handleWarrantyStartDateChange,
  warrantyMethod,
  handleWarrantyMethodChange,
  warrantyDurationValue,
  handleWarrantyDurationValueChange,
  warrantyDurationUnit,
  handleWarrantyDurationUnitChange,
  warrantyEndDate,
  setWarrantyEndDate,
  warrantyProvider,
  setWarrantyProvider,
  warrantyNumber,
  setWarrantyNumber,
  warrantyType,
  setWarrantyType,
  warrantyNotes,
  setWarrantyNotes,
  brand,
}) => {
  const quickDurationPresets = [
    { label: '6 Bulan', val: 6, unit: 'months' as const },
    { label: '1 Tahun', val: 1, unit: 'years' as const },
    { label: '2 Tahun', val: 2, unit: 'years' as const },
    { label: '3 Tahun', val: 3, unit: 'years' as const },
    { label: '5 Tahun', val: 5, unit: 'years' as const },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Purchase Details */}
      <div className="p-4 sm:p-5 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-4">
        <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wide">
          <DollarSign className="w-4 h-4 text-emerald-800" />
          <span>Informasi Pembelian & Biaya Aset</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Purchase Price */}
          <div className="space-y-1">
            <label className="font-bold text-stone-800 flex items-center justify-between">
              <span>Harga Pembelian (Rp)</span>
              {typeof purchasePrice === 'number' && purchasePrice > 0 && (
                <span className="text-[11px] font-bold text-emerald-800">
                  {formatRupiah(purchasePrice)}
                </span>
              )}
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={(e) => setPurchasePrice(e.target.value ? Number(e.target.value) : '')}
              placeholder="misal: 15000000"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
            />
          </div>

          {/* Purchase Date */}
          <div className="space-y-1">
            <label className="font-bold text-stone-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-stone-400" />
              <span>Tanggal Pembelian</span>
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={(e) => handlePurchaseDateChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
            />
          </div>

          {/* Purchase Store / Location */}
          <div className="space-y-1 sm:col-span-2">
            <label className="font-bold text-stone-800 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-stone-400" />
                <span>Toko / Tempat Pembelian</span>
              </span>
              <span className="text-[10px] text-stone-400 font-normal">Opsional</span>
            </label>
            <input
              type="text"
              value={purchaseLocation}
              onChange={(e) => setPurchaseLocation(e.target.value)}
              placeholder="iBox Grand Indonesia, Tokopedia Official Store, Digimap, Dealer Honda"
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
            />
          </div>
        </div>
      </div>

      {/* 2. Warranty Information */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        hasWarranty 
          ? 'bg-emerald-50/70 border-emerald-200 space-y-4' 
          : 'bg-stone-50/80 border-stone-200 space-y-3'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 block">Jaminan & Proteksi Garansi</span>
              <span className="text-[11px] text-stone-500 font-medium">
                {hasWarranty 
                  ? 'Sistem akan memantau masa aktif & memberi peringatan sebelum garansi habis'
                  : 'Aktifkan jika produk memiliki garansi resmi, toko, atau asuransi'}
              </span>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs hover:bg-stone-50">
            <input
              type="checkbox"
              checked={hasWarranty}
              onChange={(e) => setHasWarranty(e.target.checked)}
              className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-bold text-stone-800">
              {hasWarranty ? 'Memiliki Garansi' : 'Tidak Ada Garansi'}
            </span>
          </label>
        </div>

        {hasWarranty && (
          <div className="space-y-4 pt-2 border-t border-emerald-200/80 animate-in fade-in duration-150 text-xs">
            
            {/* Warranty Method Selector (Duration vs Manual End Date) */}
            <div className="p-3.5 bg-white rounded-xl border border-emerald-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-stone-800">Metode Penentuan Masa Garansi</span>
                <div className="flex rounded-lg bg-stone-100 p-0.5 border border-stone-200 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleWarrantyMethodChange('duration')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      warrantyMethod === 'duration'
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Berdasarkan Durasi
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWarrantyMethodChange('manual')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      warrantyMethod === 'manual'
                        ? 'bg-emerald-800 text-white shadow-2xs'
                        : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Tanggal Berakhir Bebas
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Start Date */}
                <div className="space-y-1">
                  <label className="font-bold text-stone-700">Tanggal Mulai Garansi</label>
                  <input
                    type="date"
                    value={warrantyStartDate}
                    onChange={(e) => handleWarrantyStartDateChange(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                  />
                </div>

                {/* Duration Inputs or Manual Date */}
                {warrantyMethod === 'duration' ? (
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Lama / Durasi Garansi</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={1}
                        value={warrantyDurationValue}
                        onChange={(e) => handleWarrantyDurationValueChange(e.target.value ? Number(e.target.value) : '')}
                        className="w-20 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                      />
                      <select
                        value={warrantyDurationUnit}
                        onChange={(e) => handleWarrantyDurationUnitChange(e.target.value as any)}
                        className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                      >
                        <option value="years">Tahun</option>
                        <option value="months">Bulan</option>
                        <option value="days">Hari</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <label className="font-bold text-stone-700">Tanggal Berakhir Garansi *</label>
                    <input
                      type="date"
                      value={warrantyEndDate}
                      onChange={(e) => setWarrantyEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Quick Duration Buttons (When in duration mode) */}
              {warrantyMethod === 'duration' && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-stone-500 font-medium">Preset Cepat:</span>
                  {quickDurationPresets.map((preset) => {
                    const isSelected =
                      warrantyDurationValue === preset.val && warrantyDurationUnit === preset.unit;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          handleWarrantyDurationValueChange(preset.val);
                          handleWarrantyDurationUnitChange(preset.unit);
                        }}
                        className={`px-2 py-0.5 rounded-md text-[11px] font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-800'
                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Resulting Warranty Expiry Display */}
              {warrantyEndDate && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-100/60 rounded-lg border border-emerald-200 text-xs font-semibold text-emerald-950">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Garansi Berakhir Hingga:</span>
                  </span>
                  <span className="font-extrabold font-mono text-emerald-900">
                    {warrantyEndDate}
                  </span>
                </div>
              )}
            </div>

            {/* Provider, Policy Number, Type & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Penyedia Garansi</label>
                <input
                  type="text"
                  value={warrantyProvider}
                  onChange={(e) => setWarrantyProvider(e.target.value)}
                  placeholder={`misal: ${brand || 'Apple'} Official, iBox, Mitra Care`}
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Nomor Polis / Kartu Garansi</label>
                <input
                  type="text"
                  value={warrantyNumber}
                  onChange={(e) => setWarrantyNumber(e.target.value)}
                  placeholder="misal: WR-998231 / Care+ ID"
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-stone-700">Tipe Garansi</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'official', label: 'Resmi Pabrikan' },
                    { id: 'distributor', label: 'Distributor / Toko' },
                    { id: 'extended', label: 'Proteksi Tambahan' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setWarrantyType(item.id)}
                      className={`py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all cursor-pointer text-center ${
                        warrantyType === item.id
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="font-bold text-stone-700">Catatan & Syarat Klaim Garansi</label>
                <input
                  type="text"
                  value={warrantyNotes}
                  onChange={(e) => setWarrantyNotes(e.target.value)}
                  placeholder="Klaim wajib bawa nota fisik + kartu garansi, tidak termasuk kerusakan air..."
                  className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                />
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};
