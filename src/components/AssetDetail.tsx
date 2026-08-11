import React, { useState } from 'react';
import { Asset, MaintenanceRecord, AssetStatus, AssetDocument } from '../types';
import { 
  formatRupiah, 
  formatDate, 
  getWarrantyStatus, 
  calculateAssetTCO,
  formatImageUrl
} from '../lib/utils';
import { 
  ArrowLeft, 
  Wrench, 
  Plus, 
  ShieldCheck, 
  FileText, 
  DollarSign, 
  Calendar, 
  Clock, 
  Car, 
  Laptop, 
  Box, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  Tag,
  Maximize2,
  ZoomIn,
  Eye
} from 'lucide-react';
import { ImageViewerModal, MediaItem } from './ImageViewerModal';
import { useCategories, getCategoryIcon, getCategoryLabel } from '../lib/categories';

interface AssetDetailProps {
  asset: Asset;
  onBack: () => void;
  onAddMaintenance: (assetId: string) => void;
  onAddReminder: (assetId: string) => void;
  onAddDocument: (assetId: string) => void;
  onUpdateStatus: (assetId: string, status: AssetStatus) => void;
  onDeleteAsset: (assetId: string) => void;
  onCompleteReminder: (reminderId: string) => void;
  onEditAsset?: (asset: Asset) => void;
}

export const AssetDetail: React.FC<AssetDetailProps> = ({
  asset,
  onBack,
  onAddMaintenance,
  onAddReminder,
  onAddDocument,
  onUpdateStatus,
  onDeleteAsset,
  onCompleteReminder,
  onEditAsset,
}) => {
  const categories = useCategories();
  const [activeTab, setActiveTab] = useState<
    'specs' | 'maintenance' | 'warranty' | 'reminders' | 'tco' | 'documents'
  >('specs');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Lightbox Media Preview State
  const [previewMedia, setPreviewMedia] = useState<{ isOpen: boolean; items: MediaItem[]; initialIndex?: number }>({
    isOpen: false,
    items: [],
    initialIndex: 0
  });

  const tcoInfo = calculateAssetTCO(asset);
  const warrantyInfo = getWarrantyStatus(asset.warranty);

  // Collect all media items for gallery viewer
  const getAssetMediaList = (): MediaItem[] => {
    const list: MediaItem[] = [];

    if (asset.photo_url) {
      list.push({
        url: asset.photo_url,
        title: `${asset.name} (Foto Utama)`,
        category: asset.category,
        type: 'image'
      });
    }

    if (asset.documents && asset.documents.length > 0) {
      asset.documents.forEach((doc) => {
        if (doc.file_url) {
          list.push({
            url: doc.file_url,
            title: doc.name || 'Dokumen Aset',
            category: doc.type || 'dokumen',
            type: doc.file_url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
          });
        }
      });
    }

    return list;
  };

  const handleOpenPhotoPreview = (index = 0) => {
    const mediaList = getAssetMediaList();
    if (mediaList.length === 0) return;

    setPreviewMedia({
      isOpen: true,
      items: mediaList,
      initialIndex: index
    });
  };

  const handleOpenDocument = (doc: AssetDocument) => {
    if (!doc.file_url) return;

    if (doc.file_url.startsWith('http://') || doc.file_url.startsWith('https://')) {
      window.open(doc.file_url, '_blank', 'noopener,noreferrer');
      return;
    }

    if (doc.file_url.startsWith('data:')) {
      try {
        const parts = doc.file_url.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const newWin = window.open(blobUrl, '_blank');
        if (!newWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = doc.name || 'dokumen';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Gagal membuka file base64:', err);
      }
    }
  };

  return (
    <div className="space-y-6 pb-16">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 flex-nowrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer shrink-0"
          title="Kembali ke Daftar Aset"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Kembali ke Daftar Aset</span>
          <span className="sm:hidden">Kembali</span>
        </button>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Change Status selector */}
          <select
            value={asset.status}
            onChange={(e) => onUpdateStatus(asset.asset_id, e.target.value as AssetStatus)}
            className="px-2 py-1.5 text-xs font-semibold rounded-xl bg-white border border-stone-200 text-stone-800 focus:outline-none max-w-[100px] xs:max-w-[130px] sm:max-w-none truncate shrink-0"
          >
            <option value="active">Active (Aktif)</option>
            <option value="stored">Stored (Disimpan)</option>
            <option value="under_repair">Under Repair (Sedang Servis)</option>
            <option value="sold">Sold (Terjual)</option>
            <option value="disposed">Disposed (Dibuang)</option>
          </select>

          <button
            type="button"
            onClick={() => onEditAsset && onEditAsset(asset)}
            className="p-1.5 sm:px-3.5 sm:py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs active:scale-95 rounded-xl border border-emerald-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
            title="Edit Produk / Aset"
          >
            <Edit3 className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Edit Aset</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-1.5 sm:p-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 active:scale-95 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center gap-1"
            title="Hapus Aset"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
            <span className="hidden lg:inline text-xs font-bold">Hapus</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/65 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-2xl w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2.5 bg-rose-100 rounded-xl shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-sm">Hapus Aset Ini?</h3>
                <p className="text-xs text-stone-500">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-stone-900">"{asset.name}"</strong>? Data aset ini akan dihapus dari inventaris Anda.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  onDeleteAsset(asset.asset_id);
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer text-center"
              >
                Ya, Hapus Aset
              </button>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="py-2.5 px-4 bg-stone-100 hover:bg-stone-200 active:scale-95 text-stone-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asset Hero Header Card */}
      <div className="bg-white rounded-3xl border border-stone-200 p-6 shadow-xs flex flex-col md:flex-row gap-6">
        
        {/* Photo Thumbnail */}
        <div 
          onClick={() => asset.photo_url && handleOpenPhotoPreview(0)}
          className={`relative w-full md:w-56 h-48 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center group/photo ${
            asset.photo_url ? 'cursor-pointer' : ''
          }`}
        >
          {asset.photo_url ? (
            <>
              <img src={formatImageUrl(asset.photo_url)} alt={asset.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300" />
              <div className="absolute inset-0 bg-stone-950/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs backdrop-blur-xs">
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                <span>Lihat & Zoom</span>
              </div>
              <div className="absolute top-2 right-2 p-1.5 bg-stone-900/80 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-md">
                <Maximize2 className="w-3 h-3 text-emerald-400" />
              </div>
            </>
          ) : (
            <Box className="w-12 h-12 text-stone-300" />
          )}
        </div>

        {/* Essential Specs & High-level Metrics */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {(() => {
                const foundCategory = categories.find(c => c.id === asset.category);
                const IconComponent = getCategoryIcon(foundCategory?.iconName || 'Box');
                const label = getCategoryLabel(asset.category, categories);
                return (
                  <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-white rounded-md flex items-center gap-1.5">
                    <IconComponent className="w-3 h-3 text-emerald-400" />
                    <span>{label}</span>
                  </span>
                );
              })()}
              <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md ${warrantyInfo.badgeClass}`}>
                {warrantyInfo.label}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
              {asset.name}
            </h1>
            <p className="text-sm font-medium text-stone-500">
              {asset.brand ? `${asset.brand} ` : ''}{asset.model ? `• ${asset.model}` : ''}
              {asset.serial_number ? ` • S/N: ${asset.serial_number}` : ''}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Harga Beli</span>
              <span className="font-bold text-stone-900 text-sm">
                {formatRupiah(asset.purchase_price)}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Kepemilikan (TCO)</span>
              <span className="font-bold text-emerald-900 text-sm">
                {formatRupiah(tcoInfo.totalCostOfOwnership)}
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Biaya / Tahun</span>
              <span className="font-bold text-stone-900 text-sm">
                {formatRupiah(tcoInfo.costPerYear)}/thn
              </span>
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">Rasio Perawatan</span>
              <span className="font-bold text-stone-900 text-sm">
                {tcoInfo.maintenanceRatioPercent}% <span className="text-[10px] font-medium text-stone-500">dari beli</span>
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2 border-b border-stone-200 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'specs', label: 'Spesifikasi & Detail', icon: FileText },
          { id: 'maintenance', label: `Riwayat Servis (${asset.maintenance_records?.length || 0})`, icon: Wrench },
          { id: 'warranty', label: 'Garansi', icon: ShieldCheck },
          { id: 'reminders', label: `Reminder (${asset.reminders?.length || 0})`, icon: Clock },
          { id: 'tco', label: 'Analisis Biaya (TCO)', icon: DollarSign },
          { id: 'documents', label: `Dokumen (${asset.documents?.length || 0})`, icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-xs whitespace-nowrap transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: Specs & Overview */}
      {activeTab === 'specs' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h3 className="text-base font-bold text-stone-900">
            Informasi Spesifikasi Aset
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Kategori & Brand</span>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Nama Aset:</span>
                <span className="font-bold text-stone-900">{asset.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Merk / Brand:</span>
                <span className="font-semibold text-stone-800">{asset.brand || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Model:</span>
                <span className="font-semibold text-stone-800">{asset.model || '-'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Pengguna / Penanggung Jawab:</span>
                <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {asset.assigned_user || '-'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Serial Number (S/N):</span>
                <span className="font-mono font-bold text-stone-900">{asset.serial_number || '-'}</span>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2">
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Pembelian & Lokasi</span>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Tanggal Beli:</span>
                <span className="font-semibold text-stone-800">{formatDate(asset.purchase_date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-stone-200/60">
                <span className="text-stone-500">Lokasi / Toko:</span>
                <span className="font-semibold text-stone-800">{asset.purchase_location || '-'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-500">Harga Pembelian:</span>
                <span className="font-bold text-stone-900">{formatRupiah(asset.purchase_price)}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Specifics */}
          {asset.vehicle_details && (
            <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                <Car className="w-4 h-4" />
                <span>Detail Dokumen & Odometer Kendaraan</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Plat Nomor</span>
                  <span className="font-extrabold text-stone-900 text-sm">
                    {asset.vehicle_details.license_plate}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Odometer Saat Ini</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {asset.vehicle_details.current_mileage.toLocaleString('id-ID')} km
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Pajak STNK Tahunan</span>
                  <span className="font-semibold text-stone-900 text-xs">
                    {formatDate(asset.vehicle_details.annual_tax_date)}
                  </span>
                </div>

                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Target Ganti Oli</span>
                  <span className="font-semibold text-stone-900 text-xs">
                    {asset.vehicle_details.next_oil_change_mileage ? `${asset.vehicle_details.next_oil_change_mileage.toLocaleString('id-ID')} km` : '-'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Device Specifics */}
          {asset.device_details && (
            <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
              <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                <Laptop className="w-4 h-4" />
                <span>Detail Perangkat & Aksesori</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                {asset.device_details.model_number && (
                  <div className="bg-white p-3 rounded-xl">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">Model Number</span>
                    <span className="font-semibold text-stone-900">{asset.device_details.model_number}</span>
                  </div>
                )}
                {asset.device_details.imei && (
                  <div className="bg-white p-3 rounded-xl">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block">IMEI</span>
                    <span className="font-semibold font-mono text-stone-900">{asset.device_details.imei}</span>
                  </div>
                )}
                {asset.device_details.accessories && asset.device_details.accessories.length > 0 && (
                  <div className="bg-white p-3 rounded-xl col-span-1 md:col-span-3">
                    <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Aksesori Bawaan:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {asset.device_details.accessories.map((acc, idx) => (
                        <span key={`acc-${idx}-${acc}`} className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[11px]">
                          {acc}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Warranty Summary Card in Specs Tab */}
          {asset.warranty && (
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-900 font-bold">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Informasi Garansi Produk</span>
                </div>
                <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md ${warrantyInfo.badgeClass}`}>
                  {warrantyInfo.label}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-stone-700">
                <div>
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Penyedia Garansi</span>
                  <span className="font-semibold text-stone-900">{asset.warranty.provider || 'Garansi Resmi'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Tanggal Mulai</span>
                  <span className="font-semibold text-stone-900">{formatDate(asset.warranty.start_date)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-stone-400 font-bold block uppercase">Tanggal Berakhir</span>
                  <span className="font-semibold text-stone-900">{formatDate(asset.warranty.end_date)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1.5">
            <span className="font-bold text-stone-800 text-xs block flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Catatan & Info Detail Perangkat</span>
            </span>
            <p className="text-stone-700 leading-relaxed font-medium whitespace-pre-line">
              {asset.notes ? asset.notes : 'Tidak ada catatan tambahan untuk aset ini.'}
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: Maintenance Timeline */}
      {activeTab === 'maintenance' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Timeline Riwayat Servis & Perawatan
              </h3>
              <p className="text-xs text-stone-500">
                Pencatatan berkala servis rutin, ganti oli, sparepart, dan perbaikan
              </p>
            </div>

            <button
              type="button"
              onClick={() => onAddMaintenance(asset.asset_id)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Servis</span>
            </button>
          </div>

          {!asset.maintenance_records || asset.maintenance_records.length === 0 ? (
            <div className="py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200 space-y-3">
              <Wrench className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-semibold text-stone-700">
                Belum ada riwayat servis untuk {asset.name}
              </p>
              <button
                type="button"
                onClick={() => onAddMaintenance(asset.asset_id)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Catatan Servis</span>
              </button>
            </div>
          ) : (
            <div className="relative pl-6 border-l-2 border-stone-200 space-y-6">
              {asset.maintenance_records.map((rec, index) => (
                <div key={rec.maintenance_id || (rec as any).record_id || `maint-rec-${index}`} className="relative group">
                  <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white" />
                  
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-white rounded">
                          {rec.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs font-bold text-stone-800">
                          {formatDate(rec.date)}
                        </span>
                        {rec.mileage && (
                          <span className="text-xs text-stone-500 font-mono">
                            ({rec.mileage.toLocaleString('id-ID')} km)
                          </span>
                        )}
                      </div>

                      <span className="font-extrabold text-sm text-rose-600">
                        {formatRupiah(rec.cost)}
                      </span>
                    </div>

                    <p className="text-xs text-stone-700 font-medium">
                      {rec.notes || 'Pekerjaan servis rutin'}
                    </p>

                    {rec.provider && (
                      <p className="text-[11px] text-stone-400">
                        Penyedia Jasa / Bengkel: <strong className="text-stone-600">{rec.provider}</strong>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Warranty */}
      {activeTab === 'warranty' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Informasi Garansi Aset
            </h3>
            <span className={`px-3 py-1 text-xs font-bold rounded-lg ${warrantyInfo.badgeClass}`}>
              {warrantyInfo.label}
            </span>
          </div>

          {asset.warranty ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-stone-50 rounded-xl space-y-2">
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Penyedia & Jenis Garansi</span>
                <p className="font-bold text-stone-900 text-sm">
                  {asset.warranty.provider}
                </p>
                <p className="text-stone-500">
                  Nomor Kartu Garansi: <strong className="text-stone-800 font-mono">{asset.warranty.warranty_number || '-'}</strong>
                </p>
                <p className="text-stone-500">
                  Tipe Garansi: <span className="capitalize font-semibold">{asset.warranty.warranty_type || 'Resmi'}</span>
                </p>
              </div>

              <div className="p-4 bg-stone-50 rounded-xl space-y-2">
                <span className="text-stone-400 font-bold uppercase block text-[10px]">Periode Garansi</span>
                <p className="text-stone-600">
                  Mulai: <strong>{formatDate(asset.warranty.start_date)}</strong>
                </p>
                <p className="text-stone-600">
                  Berakhir: <strong>{formatDate(asset.warranty.end_date)}</strong>
                </p>
                {asset.warranty.notes && (
                  <p className="text-stone-500 pt-1 italic">{asset.warranty.notes}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-stone-400 text-xs">
              Belum ada informasi garansi yang disimpan untuk aset ini.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Reminders */}
      {activeTab === 'reminders' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Jadwal & Pengingat Aset
            </h3>
            <button
              type="button"
              onClick={() => onAddReminder(asset.asset_id)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Reminder Baru</span>
            </button>
          </div>

          {!asset.reminders || asset.reminders.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              Belum ada reminder khusus untuk aset ini.
            </div>
          ) : (
            <div className="space-y-3">
              {asset.reminders.map((rem, index) => (
                <div
                  key={`rem-det-${rem.reminder_id || (rem as any).id || ''}-${index}`}
                  className="p-4 rounded-xl border border-stone-200 flex items-center justify-between gap-4"
                >
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">
                      {rem.title}
                    </h4>
                    <p className="text-xs text-stone-500">
                      Jatuh Tempo: {formatDate(rem.due_date)} • Repeat: {rem.repeat_rule}
                    </p>
                  </div>

                  {rem.status !== 'completed' ? (
                    <button
                      type="button"
                      onClick={() => onCompleteReminder(rem.reminder_id)}
                      className="px-3 py-1.5 bg-emerald-100 text-emerald-800 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors cursor-pointer"
                    >
                      Selesaikan
                    </button>
                  ) : (
                    <span className="text-xs font-bold text-emerald-600">Selesai</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TCO & Expenses */}
      {activeTab === 'tco' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <h3 className="text-base font-bold text-stone-900">
            Breakdown Total Cost of Ownership (TCO)
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 bg-stone-50 rounded-xl space-y-1">
              <span className="text-stone-400 font-bold uppercase block text-[10px]">Harga Pembelian</span>
              <span className="text-base font-extrabold text-stone-900">
                {formatRupiah(tcoInfo.purchasePrice)}
              </span>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl space-y-1">
              <span className="text-stone-400 font-bold uppercase block text-[10px]">Biaya Servis & Perawatan</span>
              <span className="text-base font-extrabold text-rose-600">
                {formatRupiah(tcoInfo.maintenanceTotal + tcoInfo.repairTotal)}
              </span>
            </div>

            <div className="p-4 bg-stone-50 rounded-xl space-y-1">
              <span className="text-stone-400 font-bold uppercase block text-[10px]">Aksesori & Sparepart</span>
              <span className="text-base font-extrabold text-amber-600">
                {formatRupiah(tcoInfo.accessoriesTotal)}
              </span>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
              <span className="text-emerald-800 font-bold uppercase block text-[10px]">Total TCO</span>
              <span className="text-lg font-extrabold text-emerald-700">
                {formatRupiah(tcoInfo.totalCostOfOwnership)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2 border-t border-stone-100">
            <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-stone-500 font-bold text-xs block">Rasio Perawatan vs Harga Beli</span>
                <p className="text-[11px] text-stone-500 mt-0.5">Persentase biaya servis dibanding harga beli awal</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-emerald-900 block">{tcoInfo.maintenanceRatioPercent}%</span>
                <span className="text-[10px] font-semibold text-stone-500">dari harga beli</span>
              </div>
            </div>

            <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200 flex items-center justify-between">
              <div>
                <span className="text-stone-500 font-bold text-xs block">Estimasi Biaya Kepemilikan Per Tahun</span>
                <p className="text-[11px] text-stone-500 mt-0.5">Masa kepemilikan ~{tcoInfo.yearsOwned} tahun</p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-black text-stone-900 block">{formatRupiah(tcoInfo.costPerYear)}</span>
                <span className="text-[10px] font-semibold text-stone-500">per tahun</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: Documents */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900">
              Dokumen & Bukti Pembelian
            </h3>
            <button
              type="button"
              onClick={() => onAddDocument(asset.asset_id)}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Unggah Dokumen</span>
            </button>
          </div>

          {!asset.documents || asset.documents.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              Belum ada dokumen yang diunggah untuk aset ini.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {asset.documents.map((doc, index) => (
                <div
                  key={doc.document_id || (doc as any).id || `doc-${index}`}
                  className="p-3.5 rounded-xl border border-stone-200 flex items-center justify-between gap-3 bg-stone-50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-stone-900 truncate">
                        {doc.name}
                      </h4>
                      <p className="text-[10px] text-stone-400 uppercase font-semibold">
                        {doc.type} • {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const targetIdx = asset.photo_url ? index + 1 : index;
                        handleOpenPhotoPreview(targetIdx);
                      }}
                      className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                      title="Preview / Zoom Dokumen"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Preview</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenDocument(doc)}
                      className="p-1.5 text-stone-600 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                      title="Buka File / External Link"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Image & Document Viewer Modal */}
      <ImageViewerModal
        isOpen={previewMedia.isOpen}
        onClose={() => setPreviewMedia((prev) => ({ ...prev, isOpen: false }))}
        items={previewMedia.items}
        initialIndex={previewMedia.initialIndex || 0}
      />

    </div>
  );
};
