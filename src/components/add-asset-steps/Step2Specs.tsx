import React from 'react';
import { AssetCategory, VehicleType } from '../../types';
import { 
  Car, Smartphone, Radio, Link2, Plus, X, Calendar, 
  Gauge, ShieldAlert, Cpu, FileText, Check, Layers
} from 'lucide-react';

interface Step2SpecsProps {
  category: AssetCategory;
  // Vehicle fields
  vehicleType: VehicleType;
  setVehicleType: (vt: VehicleType) => void;
  licensePlate: string;
  setLicensePlate: (lp: string) => void;
  manufactureYear: number;
  setManufactureYear: (yr: number) => void;
  currentMileage: number | '';
  setCurrentMileage: (mileage: number | '') => void;
  annualTaxDate: string;
  setAnnualTaxDate: (date: string) => void;
  // Device fields
  modelNumber: string;
  setModelNumber: (mn: string) => void;
  imei: string;
  setImei: (imei: string) => void;
  // SIM Card & Account Dependency fields
  hasSimDetails: boolean;
  setHasSimDetails: (has: boolean) => void;
  phoneNumber: string;
  setPhoneNumber: (pn: string) => void;
  simProvider: string;
  setSimProvider: (sp: string) => void;
  simActiveUntil: string;
  setSimActiveUntil: (sau: string) => void;
  simRegStatus: 'registered' | 'unregistered' | 'expired';
  setSimRegStatus: (status: 'registered' | 'unregistered' | 'expired') => void;
  accountDependencies: string[];
  customAccountInput: string;
  setCustomAccountInput: (val: string) => void;
  handleAddAccountDependency: (acc: string) => void;
  handleRemoveAccountDependency: (acc: string) => void;
  quickAccountPresets: string[];
  // Notes
  notes: string;
  setNotes: (notes: string) => void;
}

export const Step2Specs: React.FC<Step2SpecsProps> = ({
  category,
  vehicleType,
  setVehicleType,
  licensePlate,
  setLicensePlate,
  manufactureYear,
  setManufactureYear,
  currentMileage,
  setCurrentMileage,
  annualTaxDate,
  setAnnualTaxDate,
  modelNumber,
  setModelNumber,
  imei,
  setImei,
  hasSimDetails,
  setHasSimDetails,
  phoneNumber,
  setPhoneNumber,
  simProvider,
  setSimProvider,
  simActiveUntil,
  setSimActiveUntil,
  simRegStatus,
  setSimRegStatus,
  accountDependencies,
  customAccountInput,
  setCustomAccountInput,
  handleAddAccountDependency,
  handleRemoveAccountDependency,
  quickAccountPresets,
  notes,
  setNotes,
}) => {
  const isVehicle = category === 'vehicle';
  const isSim = category === 'sim_card';
  const isDevice = category === 'device' || category === 'photography';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Vehicle Specific Details (When category is vehicle) */}
      {isVehicle && (
        <div className="p-4 sm:p-5 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-4">
          <div className="flex items-center gap-2 text-amber-950 font-bold text-xs uppercase tracking-wide">
            <Car className="w-4 h-4 text-amber-800" />
            <span>Spesifikasi Khusus Kendaraan & Pajak STNK</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-800">Jenis Kendaraan</label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
              >
                <option value="motorcycle">Sepeda Motor</option>
                <option value="car">Mobil / Sedan / SUV / MPV</option>
                <option value="truck">Truk / Kendaraan Niaga</option>
                <option value="bicycle">Sepeda Listrik / Sepeda Kayuh</option>
                <option value="other">Lainnya</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Plat Nomor Kendaraan</label>
              <input
                type="text"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                placeholder="misal: B 1234 XYZ / DK 4567 AA"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl uppercase font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">Tahun Pembuatan / Perakitan</label>
              <input
                type="number"
                min={1970}
                max={new Date().getFullYear() + 1}
                value={manufactureYear}
                onChange={(e) => setManufactureYear(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-stone-400" />
                  <span>Odometer Saat Ini (km)</span>
                </span>
                <span className="text-[10px] text-stone-400 font-normal">Opsional</span>
              </label>
              <input
                type="number"
                value={currentMileage}
                onChange={(e) => setCurrentMileage(e.target.value ? Number(e.target.value) : '')}
                placeholder="misal: 14500"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-1 sm:col-span-2 bg-white p-3.5 rounded-xl border border-amber-200/60">
              <label className="font-bold text-amber-950 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Tanggal Jatuh Tempo Pajak STNK Tahunan</span>
                </span>
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                  Pengingat Otomatis
                </span>
              </label>
              <input
                type="date"
                value={annualTaxDate}
                onChange={(e) => setAnnualTaxDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-amber-50/50 border border-amber-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-stone-900 font-medium text-xs mt-1"
              />
              <p className="text-[11px] text-stone-500 mt-1">
                Sistem akan memantau dan memberikan notifikasi proaktif sebelum jatuh tempo pajak tahunan STNK kendaraan ini.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIM Card Details & Digital Account Dependency Tracker */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isSim || hasSimDetails 
          ? 'bg-emerald-50/70 border-emerald-200 space-y-4' 
          : 'bg-stone-50/80 border-stone-200 space-y-3'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center text-xs font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 block">
                {isSim ? 'Informasi Kartu SIM & Akun Terhubung *' : 'Koneksi Kartu SIM / Nomor HP Tertaut'}
              </span>
              <span className="text-[11px] text-stone-500 font-medium">
                {isSim 
                  ? 'Catat provider, masa aktif, dan daftar akun digital yang bergantung pada nomor ini'
                  : 'Aktifkan jika perangkat ini menggunakan kartu SIM khusus yang perlu dipantau'}
              </span>
            </div>
          </div>

          {!isSim && (
            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs hover:bg-stone-50">
              <input
                type="checkbox"
                checked={hasSimDetails}
                onChange={(e) => setHasSimDetails(e.target.checked)}
                className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
              />
              <span className="text-xs font-bold text-stone-800">
                {hasSimDetails ? 'SIM Terpasang' : 'Tambah Info SIM'}
              </span>
            </label>
          )}
        </div>

        {(isSim || hasSimDetails) && (
          <div className="space-y-4 pt-2 border-t border-emerald-200/80 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-800">Nomor Telepon / SIM *</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="081234567890 / +62..."
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Provider Operator</label>
                <input
                  type="text"
                  value={simProvider}
                  onChange={(e) => setSimProvider(e.target.value)}
                  placeholder="Telkomsel, Indosat, XL, Tri, Smartfren, By.U"
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-800">Masa Aktif / Tenggang</label>
                <input
                  type="date"
                  value={simActiveUntil}
                  onChange={(e) => setSimActiveUntil(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 font-medium"
                />
              </div>
            </div>

            <div className="space-y-1 text-xs">
              <label className="font-bold text-stone-800 block">Status Registrasi Dukcapil (NIK / KK)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'registered', label: '✅ Terdaftar Resmi' },
                  { id: 'unregistered', label: '⚠️ Belum Registrasi' },
                  { id: 'expired', label: '❌ Masa Tenggang' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSimRegStatus(st.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer text-center ${
                      simRegStatus === st.id
                        ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                        : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Dependency Tracker */}
            <div className="p-4 bg-white rounded-2xl border border-emerald-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-emerald-800" />
                  <span>Pelacak Keterikatan Akun Digital (OTP & Pemulihan)</span>
                </label>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {accountDependencies.length} Terpilih
                </span>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                Pilih atau ketik layanan perbankan, media sosial, dan aplikasi yang menggunakan nomor ini untuk penerimaan kode OTP atau verifikasi pemulihan darurat:
              </p>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {quickAccountPresets.map((preset) => {
                  const isAdded = accountDependencies.includes(preset);
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => (isAdded ? handleRemoveAccountDependency(preset) : handleAddAccountDependency(preset))}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3 text-stone-400" />}
                      <span>{preset}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customAccountInput}
                  onChange={(e) => setCustomAccountInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAccountDependency(customAccountInput);
                    }
                  }}
                  placeholder="Ketik akun lain lalu tekan Enter (misal: Binance, PayPal, Email Kantor)..."
                  className="flex-1 px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
                />
                <button
                  type="button"
                  onClick={() => handleAddAccountDependency(customAccountInput)}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold rounded-xl shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah</span>
                </button>
              </div>

              {/* Current Added Tags */}
              {accountDependencies.length > 0 && (
                <div className="pt-2 border-t border-stone-100 flex flex-wrap gap-1.5">
                  {accountDependencies.map((acc) => (
                    <span
                      key={acc}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/70 text-emerald-950 border border-emerald-200/80 rounded-lg text-xs font-semibold"
                    >
                      <span>{acc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAccountDependency(acc)}
                        className="hover:text-rose-600 cursor-pointer p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Gadget / Device Specifics (When category is device / photography) */}
      {isDevice && (
        <div className="p-4 sm:p-5 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-3">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-xs">
            <Cpu className="w-4 h-4 text-emerald-800" />
            <span>Spesifikasi Perangkat Keras / IMEI</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label className="font-bold text-stone-800">Model Number / Part Number</label>
              <input
                type="text"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                placeholder="misal: A2681 / MN8X3ID/A"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-800">IMEI (Untuk Smartphone / Seluler)</label>
              <input
                type="text"
                value={imei}
                onChange={(e) => setImei(e.target.value)}
                placeholder="15 digit nomor IMEI (contoh: 356891091234567)"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. Notes & Technical Specifications */}
      <div className="p-4 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-2 text-xs">
        <label className="font-bold text-stone-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-stone-400" />
            <span>Catatan Tambahan & Spesifikasi Teknis</span>
          </span>
          <span className="text-[10px] text-stone-400 font-normal">Opsional</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Tuliskan catatan teknis, kapasitas RAM/SSD, warna, jenis freon, riwayat servis awal, atau konfigurasi khusus..."
          className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 text-stone-900 placeholder:text-stone-400 font-medium text-xs leading-relaxed"
        />
      </div>

    </div>
  );
};
