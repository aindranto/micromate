import React, { useState } from 'react';
import { Asset, AssetCategory, AssetStatus } from '../types';
import { 
  formatRupiah, 
  formatDate, 
  getWarrantyStatus,
  formatImageUrl
} from '../lib/utils';
import { 
  Search, 
  Plus, 
  LayoutGrid, 
  List, 
  Laptop, 
  Car, 
  Home, 
  Camera, 
  Gamepad2, 
  Box, 
  ShieldCheck, 
  AlertCircle,
  Clock,
  Filter,
  Maximize2,
  ZoomIn
} from 'lucide-react';
import { ImageViewerModal, MediaItem } from './ImageViewerModal';

interface AssetListProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onQuickAddAsset: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

export const AssetList: React.FC<AssetListProps> = ({
  assets,
  onSelectAsset,
  onQuickAddAsset,
  searchQuery,
  onSearchChange,
  selectedCategory: externalCategory,
  onCategoryChange,
}) => {
  const [internalCategory, setInternalCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Image Viewer Lightbox State
  const [previewMedia, setPreviewMedia] = useState<{ isOpen: boolean; items: MediaItem[]; initialIndex?: number }>({
    isOpen: false,
    items: [],
    initialIndex: 0
  });

  const handleOpenPhotoPreview = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    if (!asset.photo_url) return;

    const mediaList: MediaItem[] = [
      {
        url: asset.photo_url,
        title: asset.name,
        category: asset.category,
        type: 'image'
      }
    ];

    // Include documents if available
    if (asset.documents && asset.documents.length > 0) {
      asset.documents.forEach((doc) => {
        if (doc.file_url) {
          mediaList.push({
            url: doc.file_url,
            title: doc.name || 'Dokumen Aset',
            category: doc.type || 'dokumen',
            type: doc.file_url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
          });
        }
      });
    }

    setPreviewMedia({
      isOpen: true,
      items: mediaList,
      initialIndex: 0
    });
  };

  const selectedCategory = externalCategory !== undefined ? externalCategory : internalCategory;

  const handleSelectCategory = (catId: string) => {
    setInternalCategory(catId);
    if (onCategoryChange) {
      onCategoryChange(catId);
    }
  };

  const categories = [
    { id: 'all', label: 'Semua Aset', icon: Box },
    { id: 'device', label: 'Devices', icon: Laptop },
    { id: 'vehicle', label: 'Vehicles', icon: Car },
    { id: 'home', label: 'Home', icon: Home },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
    { id: 'other', label: 'Lainnya', icon: Box },
  ];

  // Filter assets
  const filteredAssets = assets.filter((asset) => {
    // Search query match
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      asset.name.toLowerCase().includes(q) ||
      (asset.brand && asset.brand.toLowerCase().includes(q)) ||
      (asset.model && asset.model.toLowerCase().includes(q)) ||
      (asset.serial_number && asset.serial_number.toLowerCase().includes(q)) ||
      (asset.vehicle_details?.license_plate && asset.vehicle_details.license_plate.toLowerCase().includes(q));

    // Category match
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;

    // Status match
    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Primary Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
            Inventaris Aset ({filteredAssets.length})
          </h2>
          <p className="text-xs text-stone-500">
            Daftar lengkap perangkat, kendaraan, dan perlengkapan rumah tangga Anda
          </p>
        </div>

        <button
          type="button"
          onClick={onQuickAddAsset}
          className="flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm shadow-2xs transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tambah Aset</span>
          <span className="sm:hidden">Tambah</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 overflow-x-auto py-1 no-scrollbar">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border cursor-pointer ${
                isActive
                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search, Status Filters & View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-stone-200 shadow-xs">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari berdasarkan nama, S/N, IMEI, plat nomor, atau merk..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-stone-900 placeholder-stone-400"
          />
        </div>

        {/* Status Dropdown */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-500">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-xl text-stone-800 focus:outline-none"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active (Aktif)</option>
              <option value="stored">Stored (Disimpan)</option>
              <option value="under_repair">Under Repair (Servis)</option>
              <option value="sold">Sold (Terjual)</option>
              <option value="disposed">Disposed (Dibuang)</option>
            </select>
          </div>

          {/* Grid vs List View Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title="Tampilan Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title="Tampilan List"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* Asset Cards Container */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center space-y-3">
          <Box className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-bold text-stone-800 text-base">
            Tidak ada aset yang ditemukan
          </h3>
          <p className="text-xs text-stone-500 max-w-xs mx-auto">
            Coba ubah kata kunci pencarian atau sesuaikan filter kategori dan status.
          </p>
          <button
            type="button"
            onClick={onQuickAddAsset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-xs mt-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Pertama</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset, index) => {
            const warInfo = getWarrantyStatus(asset.warranty);
            return (
              <div
                key={asset.asset_id || `ast-grid-${index}`}
                onClick={() => onSelectAsset(asset)}
                className="bg-white rounded-2xl border border-stone-200 hover:border-emerald-300 p-4 shadow-2xs hover:shadow-sm cursor-pointer transition-all flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  {/* Photo & Category Badge */}
                  <div className="relative w-full h-40 bg-stone-100 rounded-xl overflow-hidden border border-stone-200 flex items-center justify-center group/photo">
                    {asset.photo_url ? (
                      <>
                        <img
                          src={formatImageUrl(asset.photo_url)}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                        />
                        {/* Expand / Zoom Overlay Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenPhotoPreview(e, asset)}
                          className="absolute bottom-2 right-2 p-1.5 bg-stone-900/80 hover:bg-emerald-600 text-white rounded-lg backdrop-blur-md opacity-0 group-hover/photo:opacity-100 sm:opacity-90 transition-all shadow-md cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                          title="Lihat & Zoom Gambar"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Zoom</span>
                        </button>
                      </>
                    ) : (
                      <Box className="w-10 h-10 text-stone-300" />
                    )}

                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-stone-900/80 backdrop-blur-md text-white rounded-md">
                        {asset.category}
                      </span>
                      {asset.status !== 'active' && (
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-stone-950 rounded-md">
                          {asset.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Info Header */}
                  <div>
                    <h3 className="font-bold text-stone-900 text-base group-hover:text-emerald-600 transition-colors line-clamp-1">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      {asset.brand ? `${asset.brand} ` : ''}{asset.model ? `• ${asset.model}` : ''}
                    </p>
                  </div>

                  {/* Serial Number & License Plate Highlights */}
                  <div className="text-xs space-y-1 bg-stone-50 p-2.5 rounded-xl border border-stone-200/80">
                    {asset.serial_number && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400">S/N:</span>
                        <span className="font-mono font-medium">{asset.serial_number}</span>
                      </div>
                    )}
                    {asset.vehicle_details?.license_plate && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400">Plat Nomor:</span>
                        <span className="font-bold text-emerald-600">
                          {asset.vehicle_details.license_plate}
                        </span>
                      </div>
                    )}
                    {asset.vehicle_details?.current_mileage !== undefined && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400">Odometer:</span>
                        <span className="font-medium">
                          {asset.vehicle_details.current_mileage.toLocaleString('id-ID')} km
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Info: Price & Warranty status */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 block">Harga Beli</span>
                    <span className="font-bold text-stone-900">
                      {formatRupiah(asset.purchase_price)}
                    </span>
                  </div>

                  <span className={`px-2 py-1 text-[10px] font-semibold rounded-md ${warInfo.badgeClass}`}>
                    {warInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode View */
        <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100 overflow-hidden shadow-xs">
          {filteredAssets.map((asset, index) => {
            const warInfo = getWarrantyStatus(asset.warranty);
            return (
              <div
                key={asset.asset_id || `ast-list-${index}`}
                onClick={() => onSelectAsset(asset)}
                className="p-4 hover:bg-stone-50 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div 
                    className="relative w-12 h-12 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center overflow-hidden shrink-0 group/thumb"
                    onClick={(e) => asset.photo_url && handleOpenPhotoPreview(e, asset)}
                  >
                    {asset.photo_url ? (
                      <>
                        <img src={formatImageUrl(asset.photo_url)} alt={asset.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </>
                    ) : (
                      <Box className="w-5 h-5 text-stone-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-stone-900 text-sm group-hover:text-emerald-600 transition-colors truncate">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-stone-500 truncate">
                      {asset.brand} • {asset.category}
                      {asset.serial_number ? ` • S/N: ${asset.serial_number}` : ''}
                      {asset.vehicle_details?.license_plate ? ` • ${asset.vehicle_details.license_plate}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <span className="font-bold text-sm text-stone-900 block">
                      {formatRupiah(asset.purchase_price)}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {formatDate(asset.purchase_date)}
                    </span>
                  </div>

                  <span className={`hidden sm:inline-block px-2.5 py-1 text-[10px] font-semibold rounded-md ${warInfo.badgeClass}`}>
                    {warInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Viewer Lightbox Modal */}
      <ImageViewerModal
        isOpen={previewMedia.isOpen}
        onClose={() => setPreviewMedia((prev) => ({ ...prev, isOpen: false }))}
        items={previewMedia.items}
        initialIndex={previewMedia.initialIndex || 0}
      />

    </div>
  );
};
