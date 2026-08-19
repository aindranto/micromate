import React from 'react';
import { 
  CheckCircle2, AlertTriangle, ShieldCheck, Smartphone, Car, 
  Building, DollarSign, Calendar, Upload, FileText, Image as ImageIcon,
  Loader2, CloudUpload, ArrowRight, UserCheck, MapPin
} from 'lucide-react';
import { Asset, AssetCategory } from '../../types';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useCategories } from '../../lib/categories';

interface Step5ConfirmProps {
  assetToEdit?: Asset | null;
  name: string;
  category: AssetCategory;
  brand: string;
  model: string;
  serialNumber: string;
  assetCode: string;
  noSerialNumber: boolean;
  assignedUser: string;
  location: string;
  purchasePrice: number | '';
  purchaseDate: string;
  purchaseLocation: string;
  hasWarranty: boolean;
  warrantyEndDate: string;
  warrantyProvider: string;
  hasSimDetails: boolean;
  phoneNumber: string;
  simProvider: string;
  licensePlate: string;
  photoFile: { dataUrl: string; name: string } | null;
  photoUrl: string;
  invoiceFile: { name: string } | null;
  isSubmitting: boolean;
  syncStepMessage: string;
  onConfirmSave: () => void;
}

export const Step5Confirm: React.FC<Step5ConfirmProps> = ({
  assetToEdit,
  name,
  category,
  brand,
  model,
  serialNumber,
  assetCode,
  noSerialNumber,
  assignedUser,
  location,
  purchasePrice,
  purchaseDate,
  purchaseLocation,
  hasWarranty,
  warrantyEndDate,
  warrantyProvider,
  hasSimDetails,
  phoneNumber,
  simProvider,
  licensePlate,
  photoFile,
  photoUrl,
  invoiceFile,
  isSubmitting,
  syncStepMessage,
  onConfirmSave,
}) => {
  const userCategories = useCategories();
  const categoryLabel = userCategories.find((c) => c.id === category)?.label || category;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Step 5 Banner Header */}
      <div className="p-4 sm:p-5 bg-emerald-800 text-white rounded-3xl shadow-sm border border-emerald-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-xs flex items-center justify-center text-white shrink-0 border border-white/20">
            <CheckCircle2 className="w-6 h-6 text-emerald-200" />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-white">
              {assetToEdit ? 'Konfirmasi Perubahan Data Aset' : 'Konfirmasi Registrasi Aset Baru'}
            </h4>
            <p className="text-xs text-emerald-100">
              Langkah 5 dari 5: Verifikasi akhir sebelum disimpan ke database
            </p>
          </div>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white border border-white/20 uppercase tracking-wide">
          {assetToEdit ? 'Mode Edit' : 'Aset Baru'}
        </span>
      </div>

      {/* Main Confirmation Card */}
      <div className="p-5 bg-white rounded-3xl border border-stone-200 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            {(photoFile?.dataUrl || photoUrl) ? (
              <div className="w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                <img src={photoFile?.dataUrl || photoUrl} alt={name} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-100 shrink-0 font-extrabold text-base">
                {name ? name.substring(0, 2).toUpperCase() : 'AS'}
              </div>
            )}
            <div>
              <h3 className="font-extrabold text-stone-900 text-base">{name || 'Aset Tanpa Nama'}</h3>
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
                Kategori: {categoryLabel}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-stone-100 text-stone-700 px-3 py-1 rounded-xl border border-stone-200">
            {noSerialNumber ? assetCode : (serialNumber || assetCode)}
          </span>
        </div>

        {/* Detailed Grid Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] text-stone-500 font-bold uppercase block mb-1">Identitas & Brand</span>
            <div className="font-bold text-stone-900">
              {brand ? `${brand} ${model || ''}` : 'Merek/Model tidak diisi'}
            </div>
            <div className="text-stone-500 text-[11px] mt-0.5">
              S/N: {noSerialNumber ? `${assetCode} (Otomatis)` : (serialNumber || '-')}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] text-stone-500 font-bold uppercase block mb-1">Penanggung Jawab & Lokasi</span>
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{assignedUser || 'Belum ditugaskan'}</span>
            </div>
            <div className="text-stone-500 text-[11px] mt-0.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span>{location || 'Lokasi belum diatur'}</span>
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] text-stone-500 font-bold uppercase block mb-1">Informasi Pembelian</span>
            <div className="font-extrabold text-emerald-800">
              {typeof purchasePrice === 'number' && purchasePrice > 0 ? formatRupiah(purchasePrice) : 'Harga tidak dicantumkan'}
            </div>
            <div className="text-stone-500 text-[11px] mt-0.5">
              {purchaseDate ? formatDate(purchaseDate) : '-'} {purchaseLocation ? `• ${purchaseLocation}` : ''}
            </div>
          </div>

          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
            <span className="text-[10px] text-stone-500 font-bold uppercase block mb-1">Status Garansi & Dokumen</span>
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>{hasWarranty ? `Garansi ${warrantyProvider || 'Resmi'}` : 'Tanpa Garansi'}</span>
            </div>
            <div className="text-stone-500 text-[11px] mt-0.5">
              {hasWarranty && warrantyEndDate ? `s/d ${formatDate(warrantyEndDate)}` : ''} 
              {invoiceFile ? ` • Invoice: ${invoiceFile.name}` : ''}
            </div>
          </div>
        </div>

        {/* Category Specific Badges */}
        {(category === 'sim_card' || hasSimDetails || category === 'vehicle') && (
          <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            {phoneNumber && (
              <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
                <span>SIM {simProvider}: {phoneNumber}</span>
              </span>
            )}
            {licensePlate && (
              <span className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-emerald-700" />
                <span>Plat Kendaraan: {licensePlate}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Sync Strategy Alert Box */}
      <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-amber-900 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-extrabold text-amber-950">
            Penyimpanan Offline-First & Automatic Cloud Sync
          </p>
          <p className="text-amber-800 leading-relaxed">
            Data akan langsung disimpan secara instant di memori browser (IndexedDB) dan didaftarkan ke antrean pembaruan otomatis Google Sheets & Drive.
          </p>
        </div>
      </div>

      {/* Action Submit Trigger Button inside Step 5 */}
      <div className="pt-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onConfirmSave}
          className="w-full py-3.5 px-6 bg-emerald-800 hover:bg-emerald-900 active:scale-[0.98] text-white text-sm font-extrabold rounded-2xl shadow-md cursor-pointer transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{syncStepMessage || 'Sedang Menyimpan & Disinkronkan...'}</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 text-emerald-200" />
              <span>{assetToEdit ? 'Simpan & Perbarui Data Aset' : 'Simpan & Konfirmasi Aset Baru'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
