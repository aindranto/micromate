import React from 'react';
import { 
  Upload, FileText, CheckCircle2, Image as ImageIcon, Trash2, Eye, 
  FileCheck, ShieldCheck, Tag, Building, Hash, Calendar, DollarSign, 
  Smartphone, Car, UserCheck, MapPin, Link2
} from 'lucide-react';
import { AssetCategory } from '../../types';
import { formatRupiah, formatDate } from '../../lib/utils';
import { useCategories } from '../../lib/categories';

interface Step4ReviewProps {
  // Photo states
  photoFile: {
    dataUrl: string;
    name: string;
    sizeFormatted: string;
    originalSizeMb?: number;
  } | null;
  photoUploading: boolean;
  photoError: string;
  handlePhotoChange: (file: File | undefined) => void;
  setPhotoFile: (file: any) => void;
  photoUrl: string;
  setPhotoUrl: (url: string) => void;
  // Invoice states
  invoiceFile: {
    dataUrl: string;
    name: string;
    sizeFormatted: string;
    type: string;
  } | null;
  invoiceError: string;
  handleInvoiceChange: (file: File | undefined) => void;
  setInvoiceFile: (file: any) => void;
  // Review data
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
  // SIM & Vehicle
  hasSimDetails: boolean;
  phoneNumber: string;
  simProvider: string;
  accountDependencies: string[];
  licensePlate: string;
  notes: string;
}

export const Step4Review: React.FC<Step4ReviewProps> = ({
  photoFile,
  photoUploading,
  photoError,
  handlePhotoChange,
  setPhotoFile,
  photoUrl,
  setPhotoUrl,
  invoiceFile,
  invoiceError,
  handleInvoiceChange,
  setInvoiceFile,
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
  accountDependencies,
  licensePlate,
  notes,
}) => {
  const userCategories = useCategories();
  const categoryLabel = userCategories.find((c) => c.id === category)?.label || category;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* 1. Upload Section: Foto Aset & Invoice */}
      <div className="p-4 sm:p-5 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-stone-900 font-bold text-xs uppercase tracking-wide">
            <Upload className="w-4 h-4 text-emerald-800" />
            <span>Upload Berkas & Foto Bukti Fisik</span>
          </div>
          <span className="text-[11px] text-stone-500 font-medium">
            Kompresi otomatis tersimpan di perangkat lokal
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Foto Produk */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 text-xs flex items-center justify-between">
              <span>Foto Aset / Produk</span>
              <span className="text-[10px] text-stone-400 font-normal">Maks 5 MB (Auto Kompres)</span>
            </label>

            {photoFile || photoUrl ? (
              <div className="relative p-3 bg-white border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-stone-100 overflow-hidden border border-stone-200 shrink-0">
                  <img
                    src={photoFile?.dataUrl || photoUrl}
                    alt="Preview Aset"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-stone-900 text-xs truncate block">
                    {photoFile?.name || 'Foto Terlampir'}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    {photoFile?.sizeFormatted ? `Ukuran: ${photoFile.sizeFormatted}` : 'URL Gambar Siap'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPhotoUrl('');
                  }}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Hapus Foto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-5 bg-white border-2 border-dashed border-stone-200 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer group text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-stone-800 block text-xs">Pilih / Seret Foto Aset</span>
                  <span className="text-[11px] text-stone-400 font-medium block">
                    JPG, PNG, atau WEBP
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                  disabled={photoUploading}
                  className="hidden"
                />
              </label>
            )}

            {photoError && <p className="text-[11px] font-bold text-rose-600 mt-1">{photoError}</p>}
          </div>

          {/* Invoice / Bukti Pembelian */}
          <div className="space-y-1.5">
            <label className="font-bold text-stone-800 text-xs flex items-center justify-between">
              <span>Invoice / Bukti Pembelian</span>
              <span className="text-[10px] text-stone-400 font-normal">PDF/JPG (Maks 10 MB)</span>
            </label>

            {invoiceFile ? (
              <div className="relative p-3 bg-white border border-emerald-200 rounded-2xl flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center border border-emerald-200 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-stone-900 text-xs truncate block">
                    {invoiceFile.name}
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium block">
                    {invoiceFile.sizeFormatted} • Invoice Terlampir
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceFile(null)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                  title="Hapus Invoice"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-5 bg-white border-2 border-dashed border-stone-200 rounded-2xl hover:border-emerald-600 hover:bg-emerald-50/20 transition-all cursor-pointer group text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 group-hover:scale-110 transition-transform">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-stone-800 block text-xs">Upload Invoice Pembelian</span>
                  <span className="text-[11px] text-stone-400 font-medium block">
                    PDF, JPG, atau PNG
                  </span>
                </div>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(e) => handleInvoiceChange(e.target.files?.[0])}
                  className="hidden"
                />
              </label>
            )}

            {invoiceError && (
              <p className="text-[11px] font-bold text-rose-600 mt-1">{invoiceError}</p>
            )}
          </div>
        </div>

        {/* Optional External Photo URL */}
        <div className="pt-2 border-t border-stone-200/80">
          <label className="font-bold text-stone-700 text-[11px] block mb-1">
            Atau gunakan URL Gambar Eksternal (Opsional)
          </label>
          <input
            type="url"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://images.unsplash.com/..."
            className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium text-xs focus:ring-2 focus:ring-emerald-600/30"
          />
        </div>
      </div>

      {/* 2. Comprehensive Live Review Card */}
      <div className="p-4 sm:p-5 bg-emerald-950 text-white rounded-3xl border border-emerald-800 shadow-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-800 text-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-white">Ringkasan Data Registrasi</h4>
              <p className="text-[11px] text-emerald-300">
                Periksa kembali kelengkapan spesifikasi aset sebelum disimpan
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-800 text-emerald-100 uppercase tracking-wider">
            {categoryLabel}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-emerald-900/60 p-4 rounded-2xl border border-emerald-800/80">
          <div>
            <span className="text-[10px] text-emerald-400 font-semibold block">Nama Produk / Aset</span>
            <span className="font-extrabold text-white text-sm block truncate">
              {name || 'Belum diisi'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-400 font-semibold block">Merek & Model</span>
            <span className="font-bold text-emerald-100 block">
              {brand ? `${brand} ${model || ''}` : '-'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-400 font-semibold block">
              {noSerialNumber ? 'Kode Aset Sistem' : 'Nomor Seri (S/N)'}
            </span>
            <span className="font-mono font-bold text-emerald-200 block truncate">
              {noSerialNumber ? assetCode : (serialNumber || '-')}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-400 font-semibold block">Penanggung Jawab / Lokasi</span>
            <span className="font-medium text-emerald-100 block truncate">
              {assignedUser || location ? `${assignedUser || '-'} • ${location || '-'}` : '-'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-400 font-semibold block">Harga Pembelian</span>
            <span className="font-extrabold text-emerald-200 block">
              {typeof purchasePrice === 'number' && purchasePrice > 0
                ? formatRupiah(purchasePrice)
                : 'Tidak dicantumkan'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-400 font-semibold block">Tanggal Beli & Toko</span>
            <span className="font-medium text-emerald-100 block truncate">
              {purchaseDate ? formatDate(purchaseDate) : '-'} {purchaseLocation ? `(${purchaseLocation})` : ''}
            </span>
          </div>

          {hasWarranty && (
            <div className="sm:col-span-2 pt-2 border-t border-emerald-800/80 flex items-center justify-between">
              <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Garansi {warrantyProvider ? `(${warrantyProvider})` : ''}:</span>
              </span>
              <span className="font-extrabold font-mono text-emerald-200">
                Aktif s/d {warrantyEndDate ? formatDate(warrantyEndDate) : '-'}
              </span>
            </div>
          )}

          {(category === 'sim_card' || hasSimDetails) && phoneNumber && (
            <div className="sm:col-span-2 pt-2 border-t border-emerald-800/80 flex items-center justify-between">
              <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                <span>SIM {simProvider}: {phoneNumber}</span>
              </span>
              {accountDependencies.length > 0 && (
                <span className="text-[10px] font-bold text-emerald-200 bg-emerald-800/80 px-2 py-0.5 rounded">
                  {accountDependencies.length} Akun Terhubung
                </span>
              )}
            </div>
          )}

          {category === 'vehicle' && licensePlate && (
            <div className="sm:col-span-2 pt-2 border-t border-emerald-800/80 flex items-center justify-between">
              <span className="text-[11px] text-emerald-300 font-medium flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-emerald-400" />
                <span>Plat Kendaraan:</span>
              </span>
              <span className="font-extrabold font-mono text-emerald-200">
                {licensePlate}
              </span>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};
