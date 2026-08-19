import React, { useState } from 'react';
import { Asset, AssetCategory, AssetStatus } from '../types';
import { 
  formatRupiah, 
  formatDate, 
  getWarrantyStatus,
  formatImageUrl,
  getAssetMainPhoto
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
  ZoomIn,
  ChevronDown,
  Check
} from 'lucide-react';
import { ImageViewerModal, MediaItem } from './ImageViewerModal';
import { useCategories, getCategoryIcon } from '../lib/categories';

interface AssetListProps {
  assets: Asset[];
  onSelectAsset: (asset: Asset) => void;
  onQuickAddAsset: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory?: string;
  onCategoryChange?: (category: string) => void;
}

// Business Lifecycle Status Configuration
const getBusinessStatusConfig = (status?: string) => {
  const s = (status || 'active').toLowerCase();
  switch (s) {
    case 'active':
      return { label: 'Aktif', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'under_repair':
      return { label: 'Diservis', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'stored':
      return { label: 'Disimpan', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' };
    case 'sold':
      return { label: 'Terjual', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'disposed':
      return { label: 'Dibuang', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' };
    default:
      return { label: s.toUpperCase(), badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' };
  }
};

// Infrastructure Sync State Configuration
const getSyncStateConfig = (asset: Asset) => {
  if (asset.is_demo || asset.data_origin === 'demo') {
    return { label: 'Contoh', dotClass: 'bg-purple-500', textClass: 'text-purple-700' };
  }
  if (asset.data_origin === 'synced') {
    return { label: 'Tersinkron', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700' };
  }
  return { label: 'Disimpan Lokal', dotClass: 'bg-amber-500', textClass: 'text-amber-700' };
};

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = localStorage.getItem('micromate_asset_view_mode');
      if (saved === 'grid' || saved === 'list') return saved;
    } catch (e) {}
    return 'list';
  });

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('micromate_asset_view_mode', mode);
    } catch (e) {}
  };
  const [isMobileCategoryExpanded, setIsMobileCategoryExpanded] = useState<boolean>(false);
  
  // Image Viewer Lightbox State
  const [previewMedia, setPreviewMedia] = useState<{ isOpen: boolean; items: MediaItem[]; initialIndex?: number }>({
    isOpen: false,
    items: [],
    initialIndex: 0
  });

  const handleOpenPhotoPreview = (e: React.MouseEvent, asset: Asset) => {
    e.stopPropagation();
    const mainPhoto = getAssetMainPhoto(asset);
    if (!mainPhoto && (!asset.documents || asset.documents.length === 0)) return;

    const mediaList: MediaItem[] = [];

    if (mainPhoto) {
      mediaList.push({
        url: mainPhoto,
        title: asset.name,
        category: asset.category,
        type: 'image'
      });
    }

    // Include documents if available
    if (asset.documents && asset.documents.length > 0) {
      asset.documents.forEach((doc: any) => {
        const fileUrl = doc.file_url || doc.drive_url || doc.thumbnail_url;
        if (fileUrl && fileUrl !== mainPhoto) {
          mediaList.push({
            url: formatImageUrl(fileUrl) || fileUrl,
            title: doc.title || doc.name || 'Dokumen Aset',
            category: doc.document_type || doc.type || 'dokumen',
            type: fileUrl.toLowerCase().endsWith('.pdf') ? 'pdf' : 'image'
          });
        }
      });
    }

    if (mediaList.length === 0) return;

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

  const userCategories = useCategories();

  const categories = [
    { id: 'all', label: 'Semua Aset', icon: Box },
    ...userCategories.map((c) => ({
      id: c.id,
      label: c.label,
      icon: getCategoryIcon(c.iconName)
    }))
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

  const getCategoryAssetCount = (catId: string) => {
    if (catId === 'all') return assets.length;
    return assets.filter((a) => a.category === catId).length;
  };

  const activeCategoryObj = categories.find((c) => c.id === selectedCategory) || categories[0];
  const ActiveCategoryIcon = activeCategoryObj.icon;

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Primary Control */}
      <div>
        <h2 className="text-2xl font-bold text-stone-900 tracking-tight">
          Inventaris Aset ({filteredAssets.length})
        </h2>
        <p className="text-xs text-stone-500 mt-0.5">
          Daftar lengkap perangkat, kendaraan, dan perlengkapan rumah tangga Anda
        </p>
      </div>

      {/* MOBILE VERSION (< sm): Expand / Collapse Category Accordion */}
      <div className="sm:hidden w-full">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
          <button
            type="button"
            id="mobile-category-accordion-toggle"
            onClick={() => setIsMobileCategoryExpanded((prev) => !prev)}
            className="w-full p-3 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            aria-expanded={isMobileCategoryExpanded}
            aria-controls="mobile-category-menu"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-800 text-white shrink-0 shadow-2xs">
                <ActiveCategoryIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Kategori Terpilih</span>
                  <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {getCategoryAssetCount(activeCategoryObj.id)} aset
                  </span>
                </div>
                <p className="font-extrabold text-stone-900 text-sm truncate">
                  {activeCategoryObj.label}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-white px-2.5 py-1.5 rounded-xl border border-stone-200 shadow-2xs shrink-0">
              <span>{isMobileCategoryExpanded ? 'Tutup' : 'Ubah Kategori'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileCategoryExpanded ? 'rotate-180 text-emerald-800' : 'text-stone-500'}`} />
            </div>
          </button>

          {isMobileCategoryExpanded && (
            <div id="mobile-category-menu" className="p-2.5 border-t border-stone-200 bg-stone-50/50 space-y-1.5 animate-fade-in">
              <div className="grid grid-cols-1 gap-1.5">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isActive = selectedCategory === cat.id;
                  const count = getCategoryAssetCount(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      id={`mobile-category-item-${cat.id}`}
                      onClick={() => {
                        handleSelectCategory(cat.id);
                        setIsMobileCategoryExpanded(false);
                      }}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-emerald-700/70 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{cat.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                          isActive
                            ? 'bg-emerald-900/60 text-white border border-emerald-700'
                            : 'bg-stone-100 text-stone-600 border border-stone-200'
                        }`}>
                          {count} aset
                        </span>
                        {isActive && <Check className="w-4 h-4 text-emerald-200" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP / TABLET VERSION (sm:flex): Category M3 Filter Chips (Single-Row Horizontal Scroll) */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto py-1.5 no-scrollbar w-full max-w-full shrink-0">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              id={`desktop-category-tab-${cat.id}`}
              onClick={() => handleSelectCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-emerald-900 text-white shadow-2xs'
                  : 'bg-stone-100/80 text-stone-700 hover:bg-stone-200/70 border border-stone-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search, Status Filters & View Switcher (M3 Surface Container) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-3xl border border-stone-200/80 shadow-2xs">
        
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari berdasarkan nama, S/N, IMEI, plat nomor, atau merk..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-stone-100/70 border border-transparent hover:border-stone-200 focus:border-emerald-600 focus:bg-white rounded-full focus:outline-none transition-all text-stone-900 placeholder-stone-400 font-medium"
          />
        </div>

        {/* Status Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
            <Filter className="w-3.5 h-3.5 text-stone-500" />
            <span className="hidden sm:inline">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 text-xs bg-stone-100/70 border border-stone-200/80 rounded-full text-stone-800 focus:outline-none font-semibold cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Active (Aktif)</option>
              <option value="stored">Stored (Disimpan)</option>
              <option value="under_repair">Under Repair (Servis)</option>
              <option value="sold">Sold (Terjual)</option>
              <option value="disposed">Disposed (Dibuang)</option>
            </select>
          </div>

          {/* Grid vs List View Toggle (M3 Segmented Button) */}
          <div className="flex items-center bg-stone-100/90 p-1 rounded-full border border-stone-200/80">
            <button
              type="button"
              onClick={() => handleViewModeChange('grid')}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
              title="Tampilan Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleViewModeChange('list')}
              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-emerald-900 shadow-2xs font-bold'
                  : 'text-stone-500 hover:text-stone-800'
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
        <div className="bg-white rounded-3xl border border-stone-200/80 p-12 text-center space-y-3 shadow-2xs">
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
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white font-bold rounded-full text-xs mt-2 cursor-pointer transition-all shadow-2xs active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Aset Pertama</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset, index) => {
            const warInfo = getWarrantyStatus(asset.warranty);
            const statusConfig = getBusinessStatusConfig(asset.status);
            const syncConfig = getSyncStateConfig(asset);
            const mainPhoto = getAssetMainPhoto(asset);
            return (
              <div
                key={asset.asset_id || `ast-grid-${index}`}
                onClick={() => onSelectAsset(asset)}
                className="bg-white rounded-3xl border border-stone-200/80 hover:border-emerald-500/60 p-4 shadow-2xs hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  {/* Photo & Category Badge */}
                  <div className="relative w-full h-40 bg-stone-100/80 rounded-2xl overflow-hidden border border-stone-200/60 flex items-center justify-center group/photo">
                    {mainPhoto ? (
                      <>
                        <img
                          src={mainPhoto}
                          alt={asset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300"
                        />
                        {/* Expand / Zoom Overlay Button */}
                        <button
                          type="button"
                          onClick={(e) => handleOpenPhotoPreview(e, asset)}
                          className="absolute bottom-2 right-2 p-1.5 bg-stone-900/80 hover:bg-emerald-700 text-white rounded-full backdrop-blur-md opacity-0 group-hover/photo:opacity-100 sm:opacity-90 transition-all shadow-md cursor-pointer flex items-center gap-1 text-[11px] font-bold"
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
                      <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-stone-900/80 backdrop-blur-md text-white rounded-full">
                        {asset.category}
                      </span>
                      {/* Business Lifecycle Badge */}
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${statusConfig.badgeClass}`}>
                        {statusConfig.label}
                      </span>
                    </div>

                    {/* Infrastructure Sync State Indicator */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-stone-200/80 shadow-2xs">
                      <span className={`w-1.5 h-1.5 rounded-full ${syncConfig.dotClass}`} />
                      <span className={`text-[10px] font-semibold ${syncConfig.textClass}`}>
                        {syncConfig.label}
                      </span>
                    </div>
                  </div>

                  {/* Info Header */}
                  <div>
                    <h3 className="font-bold text-stone-900 text-base group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {asset.name}
                    </h3>
                    <p className="text-xs text-stone-500 font-medium">
                      {asset.brand ? `${asset.brand} ` : ''}{asset.model ? `• ${asset.model}` : ''}
                    </p>
                  </div>

                  {/* Serial Number & License Plate Highlights */}
                  <div className="text-xs space-y-1 bg-stone-100/70 p-3 rounded-2xl border border-stone-200/50">
                    {asset.assigned_user && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400 font-medium">Pengguna:</span>
                        <span className="font-bold text-emerald-900 truncate max-w-[150px]">{asset.assigned_user}</span>
                      </div>
                    )}
                    {asset.serial_number && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400 font-medium">S/N:</span>
                        <span className="font-mono font-medium text-stone-800">{asset.serial_number}</span>
                      </div>
                    )}
                    {asset.vehicle_details?.license_plate && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400 font-medium">Plat Nomor:</span>
                        <span className="font-bold text-emerald-800">
                          {asset.vehicle_details.license_plate}
                        </span>
                      </div>
                    )}
                    {asset.vehicle_details?.current_mileage !== undefined && (
                      <div className="flex justify-between text-stone-600">
                        <span className="text-stone-400 font-medium">Odometer:</span>
                        <span className="font-semibold text-stone-800">
                          {asset.vehicle_details.current_mileage.toLocaleString('id-ID')} km
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Info: Price & Warranty status */}
                <div className="pt-3 border-t border-stone-100/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-stone-400 font-medium block">Harga Beli</span>
                    <span className="font-bold text-stone-900">
                      {formatRupiah(asset.purchase_price)}
                    </span>
                  </div>

                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${warInfo.badgeClass}`}>
                    {warInfo.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode View (M3 Container) */
        <div className="bg-white rounded-3xl border border-stone-200/80 divide-y divide-stone-100/80 overflow-hidden shadow-2xs">
          {filteredAssets.map((asset, index) => {
            const warInfo = getWarrantyStatus(asset.warranty);
            const statusConfig = getBusinessStatusConfig(asset.status);
            const syncConfig = getSyncStateConfig(asset);
            const mainPhoto = getAssetMainPhoto(asset);
            return (
              <div
                key={asset.asset_id || `ast-list-${index}`}
                onClick={() => onSelectAsset(asset)}
                className="p-4 hover:bg-stone-50/80 cursor-pointer transition-colors flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div 
                    className="relative w-12 h-12 rounded-2xl bg-stone-100/80 border border-stone-200/80 flex items-center justify-center overflow-hidden shrink-0 group/thumb"
                    onClick={(e) => mainPhoto && handleOpenPhotoPreview(e, asset)}
                  >
                    {mainPhoto ? (
                      <>
                        <img src={mainPhoto} alt={asset.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white">
                          <ZoomIn className="w-4 h-4" />
                        </div>
                      </>
                    ) : (
                      <Box className="w-5 h-5 text-stone-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-stone-900 text-sm group-hover:text-emerald-800 transition-colors truncate">
                        {asset.name}
                      </h3>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-full border ${statusConfig.badgeClass}`}>
                        {statusConfig.label}
                      </span>
                      <span className="flex items-center gap-1 text-[10px]">
                        <span className={`w-1.5 h-1.5 rounded-full ${syncConfig.dotClass}`} />
                        <span className={`font-semibold ${syncConfig.textClass}`}>{syncConfig.label}</span>
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 font-medium truncate mt-0.5">
                      {asset.brand} • {asset.category}
                      {asset.assigned_user ? ` • Pengguna: ${asset.assigned_user}` : ''}
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
                    <span className="text-[10px] text-stone-400 font-medium">
                      {formatDate(asset.purchase_date)}
                    </span>
                  </div>

                  <span className={`hidden sm:inline-block px-2.5 py-1 text-[10px] font-bold rounded-full ${warInfo.badgeClass}`}>
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
