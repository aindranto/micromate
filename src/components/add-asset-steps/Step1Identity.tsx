import React from 'react';
import { AssetCategory } from '../../types';
import { useCategories, getCategoryIcon } from '../../lib/categories';
import { RefreshCw, Tag, Building2, UserCheck, MapPin, Hash, Sparkles } from 'lucide-react';

interface Step1IdentityProps {
  category: AssetCategory;
  setCategory: (cat: AssetCategory) => void;
  name: string;
  setName: (name: string) => void;
  brand: string;
  setBrand: (brand: string) => void;
  model: string;
  setModel: (model: string) => void;
  assignedUser: string;
  setAssignedUser: (user: string) => void;
  location: string;
  setLocation: (loc: string) => void;
  noSerialNumber: boolean;
  handleToggleNoSerialNumber: (checked: boolean) => void;
  serialNumber: string;
  setSerialNumber: (sn: string) => void;
  assetCode: string;
  setAssetCode: (code: string) => void;
  handleRegenerateAssetCode: () => void;
  validationError?: string;
}

export const Step1Identity: React.FC<Step1IdentityProps> = ({
  category,
  setCategory,
  name,
  setName,
  brand,
  setBrand,
  model,
  setModel,
  assignedUser,
  setAssignedUser,
  location,
  setLocation,
  noSerialNumber,
  handleToggleNoSerialNumber,
  serialNumber,
  setSerialNumber,
  assetCode,
  setAssetCode,
  handleRegenerateAssetCode,
  validationError,
}) => {
  const userCategories = useCategories();

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Category Selection Grid */}
      <div className="p-4 sm:p-5 bg-stone-50/90 rounded-2xl border border-stone-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-emerald-800" />
            <span>Pilih Kategori Aset *</span>
          </label>
          <span className="text-[11px] text-stone-500 font-medium">
            Kategori menentukan kolom spesifikasi di langkah berikutnya
          </span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {userCategories.map((item) => {
            const Icon = getCategoryIcon(item.iconName);
            const isSelected = category === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id as AssetCategory)}
                className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-xs font-bold gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs scale-[1.02]'
                    : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="truncate max-w-full">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Primary Information Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        {/* Asset Name */}
        <div className="space-y-1 sm:col-span-2">
          <label className="font-bold text-stone-800 flex items-center justify-between">
            <span>Nama Aset / Produk *</span>
            <span className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Wajib Diisi
            </span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="misal: MacBook Air M2 13-inch / Honda Vario 160 ABS / Kartu SIM Telkomsel Halo"
            className={`w-full px-3.5 py-2.5 bg-white border rounded-xl focus:outline-none focus:ring-2 text-stone-900 placeholder:text-stone-400 font-medium ${
              validationError
                ? 'border-rose-300 focus:ring-rose-500/30 focus:border-rose-500'
                : 'border-stone-200 focus:ring-emerald-600/30 focus:border-emerald-600'
            }`}
          />
          {validationError && (
            <p className="text-[11px] text-rose-600 font-bold mt-1 animate-in fade-in">
              {validationError}
            </p>
          )}
        </div>

        {/* Brand */}
        <div className="space-y-1">
          <label className="font-bold text-stone-800 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-stone-400" />
            <span>Merk / Brand</span>
          </label>
          <input
            type="text"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            placeholder="Apple, Honda, Sony, Telkomsel"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>

        {/* Model */}
        <div className="space-y-1">
          <label className="font-bold text-stone-800">Model / Tipe Varian</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="misal: M2 256GB / CBS ISS / Postpaid"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>

        {/* Assigned User */}
        <div className="space-y-1">
          <label className="font-bold text-stone-800 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-stone-400" />
              <span>Pengguna / Penanggung Jawab</span>
            </span>
            <span className="text-[10px] text-stone-400 font-normal">Opsional</span>
          </label>
          <input
            type="text"
            value={assignedUser}
            onChange={(e) => setAssignedUser(e.target.value)}
            placeholder="misal: Budi Santoso (IT), Rian, Citra"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>

        {/* Location */}
        <div className="space-y-1">
          <label className="font-bold text-stone-800 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-stone-400" />
              <span>Lokasi Penempatan</span>
            </span>
            <span className="text-[10px] text-stone-400 font-normal">Opsional</span>
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="misal: Kantor Pusat (L3), Meja Kerja, Rumah"
            className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-medium"
          />
        </div>

        {/* Serial Number & Asset Code Block */}
        <div className="space-y-2.5 sm:col-span-2 bg-stone-50/90 p-4 rounded-2xl border border-stone-200">
          {noSerialNumber ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-bold text-stone-800 text-xs block">Serial Number (S/N)</label>
                <input
                  type="text"
                  value="Tidak memiliki S/N"
                  disabled
                  className="w-full px-3.5 py-2 bg-stone-200/70 border border-stone-300 rounded-xl text-stone-500 font-semibold cursor-not-allowed select-none text-xs"
                />
              </div>

              <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-stone-800 text-xs flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-emerald-800" />
                    <span>Kode Aset Unik</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    🔒 Generasi Otomatis
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl font-mono font-bold text-emerald-950 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
                  />
                  <button
                    type="button"
                    onClick={handleRegenerateAssetCode}
                    className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs rounded-xl shadow-2xs shrink-0 cursor-pointer active:scale-95 transition-all"
                    title="Generate ulang kode aset"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate Ulang</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="font-bold text-stone-800 text-xs block">Serial Number (S/N)</label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Nomor Seri / S/N (contoh: C02G1234MD6R / SN998124)"
                className="w-full px-3.5 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 text-stone-900 placeholder:text-stone-400 font-mono font-medium text-xs sm:text-sm"
              />
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={noSerialNumber}
              onChange={(e) => handleToggleNoSerialNumber(e.target.checked)}
              className="rounded text-emerald-800 focus:ring-emerald-700 w-4 h-4 cursor-pointer"
            />
            <span className="text-xs font-semibold text-stone-800">
              Produk tidak memiliki Serial Number (Gunakan kode otomatis sistem)
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};
