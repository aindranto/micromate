import React, { useState } from 'react';
import { Asset, MaintenanceRecord, AssetStatus, AssetDocument, Document } from '../types';
import { 
  formatRupiah, 
  formatDate, 
  getWarrantyStatus, 
  calculateAssetTCO,
  formatImageUrl,
  getAssetMainPhoto
} from '../lib/utils';
import {
  getDocumentPrimaryUrl,
  getDocumentPreviewUrl,
  getDocumentDisplayTitle,
  getDocumentDisplayType
} from '../lib/documentDomain';
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
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Tag,
  Maximize2,
  ZoomIn,
  Eye,
  User,
  MapPin,
  History,
  ArrowRight,
  Layers,
  Activity,
  Receipt,
  FileCheck,
  Building,
  Hash,
  Share2,
  Check,
  Smartphone,
  Link2
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

// Business Lifecycle Status Configuration
const getBusinessStatusBadge = (status?: string) => {
  const s = (status || 'active').toLowerCase();
  switch (s) {
    case 'active':
      return { label: 'AKTIF', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200' };
    case 'under_repair':
      return { label: 'DISERVIS', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200' };
    case 'stored':
      return { label: 'DISIMPAN', badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' };
    case 'sold':
      return { label: 'TERJUAL', badgeClass: 'bg-blue-50 text-blue-800 border-blue-200' };
    case 'disposed':
      return { label: 'DIBUANG', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200' };
    default:
      return { label: s.toUpperCase(), badgeClass: 'bg-stone-100 text-stone-700 border-stone-200' };
  }
};

// Infrastructure Sync State Configuration
const getSyncStateBadge = (asset: Asset) => {
  if (asset.is_demo || asset.data_origin === 'demo') {
    return { label: 'Contoh Data', dotClass: 'bg-purple-500', textClass: 'text-purple-700 bg-purple-50 border-purple-200' };
  }
  if (asset.data_origin === 'synced') {
    return { label: 'Tersinkron', dotClass: 'bg-emerald-500', textClass: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
  }
  return { label: 'Disimpan Lokal', dotClass: 'bg-amber-500', textClass: 'text-amber-700 bg-amber-50 border-amber-200' };
};

type ActiveHubTab = 'overview' | 'activity' | 'documents' | 'service' | 'expenses';

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
  const [activeTab, setActiveTab] = useState<ActiveHubTab>('overview');
  const [isMobileTabExpanded, setIsMobileTabExpanded] = useState<boolean>(false);
  const [activeAccordionTab, setActiveAccordionTab] = useState<ActiveHubTab | null>('overview');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Exclusive Accordion Toggle for Mobile & Tablet
  const toggleMobileAccordion = (tabId: ActiveHubTab) => {
    setActiveAccordionTab((prev) => (prev === tabId ? null : tabId));
  };

  // Lightbox Media Preview State
  const [previewMedia, setPreviewMedia] = useState<{ isOpen: boolean; items: MediaItem[]; initialIndex?: number }>({
    isOpen: false,
    items: [],
    initialIndex: 0
  });

  const tcoInfo = calculateAssetTCO(asset);
  const warrantyInfo = getWarrantyStatus(asset.warranty);
  const statusBadge = getBusinessStatusBadge(asset.status);
  const syncBadge = getSyncStateBadge(asset);

  const handleCopyAssetCode = () => {
    if (!asset.asset_code) return;
    navigator.clipboard.writeText(asset.asset_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Helper for merging lifecycle history timeline
  const getAssetHistoryList = () => {
    const items: Array<{
      id: string;
      timestamp: string;
      type: string;
      title: string;
      oldValue?: string;
      newValue?: string;
      performedBy?: string;
      notes?: string;
      iconType: 'user' | 'status' | 'location' | 'service' | 'created' | 'generic';
    }> = [];

    if (asset.history && asset.history.length > 0) {
      asset.history.forEach((h: any) => {
        let iconType: 'user' | 'status' | 'location' | 'service' | 'created' | 'generic' = 'generic';
        const actionType = h.action || h.event_type || 'CREATED';
        if (actionType === 'USER_CHANGED') iconType = 'user';
        else if (actionType === 'STATUS_CHANGED') iconType = 'status';
        else if (actionType === 'LOCATION_CHANGED') iconType = 'location';
        else if (actionType === 'SERVICE_RECORDED') iconType = 'service';
        else if (actionType === 'CREATED') iconType = 'created';

        const displayTitle = h.title || (
          actionType === 'USER_CHANGED' ? 'Penanggung Jawab Berubah' :
          actionType === 'STATUS_CHANGED' ? 'Status Aset Berubah' :
          actionType === 'LOCATION_CHANGED' ? 'Lokasi Aset Berubah' :
          actionType === 'CREATED' ? 'Aset Didaftarkan' :
          'Perubahan Data Aset'
        );

        items.push({
          id: h.event_id || `hist_${Math.random()}`,
          timestamp: h.timestamp,
          type: actionType,
          title: displayTitle,
          oldValue: h.old_value,
          newValue: h.new_value,
          performedBy: h.performed_by,
          notes: h.notes,
          iconType
        });
      });
    }

    if (asset.maintenance_records) {
      asset.maintenance_records.forEach((m) => {
        const exists = items.some((i) => i.id === m.maintenance_id || (i.notes && i.notes.includes(m.maintenance_id)));
        if (!exists) {
          items.push({
            id: m.maintenance_id,
            timestamp: m.date,
            type: 'SERVICE_RECORDED',
            title: `Perawatan / Servis (${m.type})`,
            newValue: formatRupiah(m.cost),
            performedBy: m.provider || 'Bengkel / Teknisi',
            notes: m.notes,
            iconType: 'service'
          });
        }
      });
    }

    const hasCreated = items.some((i) => i.type === 'CREATED');
    if (!hasCreated) {
      items.push({
        id: 'evt_created_init',
        timestamp: asset.created_at || asset.purchase_date || new Date().toISOString(),
        type: 'CREATED',
        title: 'Aset Didaftarkan Pertama Kali',
        newValue: asset.name,
        performedBy: asset.assigned_user || 'Sistem',
        notes: `Registrasi awal aset dengan status ${asset.status === 'active' ? 'Aktif' : asset.status}.`,
        iconType: 'created'
      });
    }

    return items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  // Collect all media items for gallery viewer
  const getAssetMediaList = (): MediaItem[] => {
    const list: MediaItem[] = [];
    const mainPhoto = getAssetMainPhoto(asset);

    if (mainPhoto) {
      list.push({
        url: mainPhoto,
        title: `${asset.name} (Foto Utama)`,
        category: asset.category,
        type: 'image'
      });
    }

    if (asset.documents && asset.documents.length > 0) {
      asset.documents.forEach((doc) => {
        if ((doc as any).deleted) return;
        const previewUrl = getDocumentPreviewUrl(doc);
        const primaryUrl = getDocumentPrimaryUrl(doc);
        const displayUrl = previewUrl || primaryUrl;

        if (displayUrl && displayUrl !== mainPhoto) {
          const docType = getDocumentDisplayType(doc);
          const mime = (doc as any).mime_type || '';
          const isPdf = displayUrl.toLowerCase().endsWith('.pdf') || mime.includes('pdf') || docType === 'invoice' || docType === 'manual';

          list.push({
            url: formatImageUrl(displayUrl) || displayUrl,
            title: getDocumentDisplayTitle(doc),
            category: docType,
            type: isPdf ? 'pdf' : 'image'
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

  const handleOpenDocument = (doc: any) => {
    const primaryUrl = getDocumentPrimaryUrl(doc);
    if (!primaryUrl) return;

    if (primaryUrl.startsWith('http://') || primaryUrl.startsWith('https://')) {
      const openWin = window['open'];
      openWin(primaryUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (primaryUrl.startsWith('data:')) {
      try {
        const parts = primaryUrl.split(',');
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
        const openWin = window['open'];
        const newWin = openWin(blobUrl, '_blank');
        if (!newWin) {
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = getDocumentDisplayTitle(doc);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } catch (err) {
        console.error('Gagal membuka file base64:', err);
      }
    }
  };

  const historyItems = getAssetHistoryList();
  const documentItems = asset.documents || [];
  const maintenanceItems = asset.maintenance_records || [];
  const reminderItems = asset.reminders || [];

  return (
    <div className="space-y-6 pb-20">
      
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-1.5 sm:gap-4 flex-nowrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer shrink-0"
          title="Kembali ke Daftar Aset"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Kembali ke Daftar Aset</span>
          <span className="sm:hidden">Kembali</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Change Status selector */}
          <div className="relative">
            <select
              value={asset.status}
              onChange={(e) => onUpdateStatus(asset.asset_id, e.target.value as AssetStatus)}
              className="px-2.5 py-1.5 text-xs font-bold rounded-xl bg-white border border-stone-200 text-stone-800 focus:outline-none max-w-[110px] xs:max-w-[140px] sm:max-w-none truncate shrink-0 cursor-pointer shadow-2xs"
            >
              <option value="active">🟢 Active (Aktif)</option>
              <option value="under_repair">🟡 Under Repair (Diservis)</option>
              <option value="stored">⚪ Stored (Disimpan)</option>
              <option value="sold">🔵 Sold (Terjual)</option>
              <option value="disposed">🔴 Disposed (Dibuang)</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => onEditAsset && onEditAsset(asset)}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs active:scale-95 rounded-xl border border-emerald-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
            title="Edit Data Aset"
          >
            <Edit3 className="w-4 h-4 text-emerald-700" />
            <span className="hidden sm:inline">Edit</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="p-2 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 active:scale-95 rounded-xl border border-rose-200 transition-all cursor-pointer shadow-2xs shrink-0 flex items-center justify-center"
            title="Hapus Aset"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
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
                <p className="text-xs text-stone-500">Tindakan ini akan menandai aset sebagai terhapus (tombstone)</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus <strong className="text-stone-900">"{asset.name}"</strong>? Riwayat dan catatan terkait akan dipindahkan dari inventaris aktif.
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

      {/* ASSET LIFECYCLE HUB HEADER */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-5 sm:gap-6">
        
        {/* Photo Thumbnail */}
        {(() => {
          const mainPhoto = getAssetMainPhoto(asset);
          return (
            <div 
              onClick={() => mainPhoto && handleOpenPhotoPreview(0)}
              className={`relative w-full md:w-56 h-48 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 shrink-0 flex items-center justify-center group/photo ${
                mainPhoto ? 'cursor-pointer' : ''
              }`}
            >
              {mainPhoto ? (
                <>
                  <img src={mainPhoto} alt={asset.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover/photo:scale-105 transition-transform duration-300" />
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
          );
        })()}

        {/* Essential Specs & Business vs Sync State Badges */}
        <div className="flex-1 space-y-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Badge */}
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

              {/* Business Lifecycle Status Badge */}
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-md border ${statusBadge.badgeClass}`}>
                {statusBadge.label}
              </span>

              {/* Infrastructure Sync State Badge */}
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md border flex items-center gap-1.5 ${syncBadge.textClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${syncBadge.dotClass}`} />
                <span>{syncBadge.label}</span>
              </span>

              {/* Warranty Badge */}
              <span className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-md ${warrantyInfo.badgeClass}`}>
                {warrantyInfo.label}
              </span>
            </div>

            <div className="pt-0.5">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
                {asset.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-500 mt-0.5">
                <span>{asset.brand || 'No Brand'}{asset.model ? ` • ${asset.model}` : ''}</span>
                {asset.serial_number && (
                  <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded text-stone-700 text-[11px]">
                    S/N: {asset.serial_number}
                  </span>
                )}
                {asset.asset_code && (
                  <button 
                    type="button"
                    onClick={handleCopyAssetCode}
                    className="flex items-center gap-1 font-mono text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md hover:bg-emerald-100 transition-colors cursor-pointer"
                    title="Klik untuk salin kode aset"
                  >
                    <Hash className="w-3 h-3 text-emerald-600" />
                    <span>{asset.asset_code}</span>
                    {copiedCode ? <Check className="w-3 h-3 text-emerald-700" /> : <Share2 className="w-3 h-3 text-emerald-500" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Harga Beli</span>
              <span className="font-bold text-stone-900 text-xs sm:text-sm">
                {formatRupiah(asset.purchase_price)}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Total Biaya (TCO)</span>
              <span className="font-bold text-emerald-900 text-xs sm:text-sm">
                {formatRupiah(tcoInfo.totalCostOfOwnership)}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Penanggung Jawab</span>
              <span className="font-bold text-stone-800 text-xs sm:text-sm truncate block">
                {asset.assigned_user || 'Belum Ditugaskan'}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 bg-stone-50 rounded-xl border border-stone-200">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">Lokasi Aset</span>
              <span className="font-bold text-stone-800 text-xs sm:text-sm truncate block">
                {asset.location || asset.purchase_location || 'Kantor / Rumah'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* MOBILE & TABLET VERSION (< lg): Expand / Collapse Hub Tab Menu */}
      <div className="lg:hidden w-full">
        <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
          <button
            type="button"
            id="mobile-asset-tab-accordion-toggle"
            onClick={() => setIsMobileTabExpanded((prev) => !prev)}
            className="w-full p-3.5 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            aria-expanded={isMobileTabExpanded}
            aria-controls="mobile-asset-tab-menu"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2 rounded-xl bg-emerald-800 text-white shrink-0 shadow-2xs">
                {activeTab === 'overview' && <Layers className="w-4 h-4" />}
                {activeTab === 'activity' && <History className="w-4 h-4" />}
                {activeTab === 'documents' && <FileText className="w-4 h-4" />}
                {activeTab === 'service' && <Wrench className="w-4 h-4" />}
                {activeTab === 'expenses' && <DollarSign className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Tab Aktif</span>
                  {activeTab === 'activity' && historyItems.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {historyItems.length} riwayat
                    </span>
                  )}
                  {activeTab === 'documents' && documentItems.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {documentItems.length} dokumen
                    </span>
                  )}
                  {activeTab === 'service' && maintenanceItems.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200">
                      {maintenanceItems.length} servis
                    </span>
                  )}
                </div>
                <p className="font-extrabold text-stone-900 text-sm truncate">
                  {activeTab === 'overview' && 'Overview & Spesifikasi'}
                  {activeTab === 'activity' && 'Riwayat & Lifecycle'}
                  {activeTab === 'documents' && 'Dokumen & Nota'}
                  {activeTab === 'service' && 'Servis & Perawatan'}
                  {activeTab === 'expenses' && 'Pengeluaran & TCO'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 bg-white px-2.5 py-1.5 rounded-xl border border-stone-200 shadow-2xs shrink-0">
              <span>{isMobileTabExpanded ? 'Tutup' : 'Pilih Tab'}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMobileTabExpanded ? 'rotate-180 text-emerald-800' : 'text-stone-500'}`} />
            </div>
          </button>

          {isMobileTabExpanded && (
            <div id="mobile-asset-tab-menu" className="p-2.5 border-t border-stone-200 bg-stone-50/50 space-y-1.5 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {[
                  { id: 'overview', label: 'Overview & Spesifikasi', desc: 'Identitas, spesifikasi & info pembelian', icon: Layers, count: undefined },
                  { id: 'activity', label: 'Riwayat & Lifecycle', desc: 'Log aktivitas, mutasi & perubahan status', icon: History, count: historyItems.length },
                  { id: 'documents', label: 'Dokumen & Nota', desc: 'Nota pembelian, garansi & manual book', icon: FileText, count: documentItems.length },
                  { id: 'service', label: 'Servis & Perawatan', desc: 'Riwayat servis berkala & pengingat jadwal', icon: Wrench, count: maintenanceItems.length },
                  { id: 'expenses', label: 'Pengeluaran & TCO', desc: 'Total cost of ownership & rincian biaya', icon: DollarSign, count: undefined },
                ].map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      id={`mobile-detail-tab-item-${item.id}`}
                      onClick={() => {
                        setActiveTab(item.id as ActiveHubTab);
                        setIsMobileTabExpanded(false);
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-700/70 text-white' : 'bg-stone-100 text-stone-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold truncate">{item.label}</p>
                          <p className={`text-[11px] truncate ${isActive ? 'text-emerald-100' : 'text-stone-400'}`}>{item.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        {item.count !== undefined && item.count > 0 && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                            isActive
                              ? 'bg-emerald-900/60 text-white border border-emerald-700'
                              : 'bg-stone-100 text-stone-600 border border-stone-200'
                          }`}>
                            {item.count}
                          </span>
                        )}
                        {isActive && <Check className="w-4 h-4 text-emerald-200 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DESKTOP VERSION (hidden lg:block): ASSET DETAIL HUB TABS NAVIGATION */}
      <div className="hidden lg:block border-b border-stone-200 bg-white rounded-2xl p-1.5 shadow-2xs">
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar" aria-label="Hub Tabs">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Overview & Spesifikasi</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'activity'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat & Lifecycle</span>
            {historyItems.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'activity' ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-200 text-stone-700'
              }`}>
                {historyItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'documents'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Dokumen & Nota</span>
            {documentItems.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'documents' ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-200 text-stone-700'
              }`}>
                {documentItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('service')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'service'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Servis & Perawatan</span>
            {maintenanceItems.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                activeTab === 'service' ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-200 text-stone-700'
              }`}>
                {maintenanceItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'expenses'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pengeluaran & TCO</span>
          </button>
        </nav>
      </div>

      {/* TAB CONTENTS */}
      <div className="space-y-6">

        {/* TAB 1: OVERVIEW & SPECIFICATIONS */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Information Grid */}
            <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  <span>Spesifikasi & Informasi Detail</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">Identitas aset, penanggung jawab, lokasi, dan detail pembelian.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Identitas Aset</span>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Nama Aset:</span>
                    <span className="font-bold text-stone-900">{asset.name}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Kode Aset (Barcode/Tag):</span>
                    <span className="font-mono font-bold text-stone-900">{asset.asset_code || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Merk / Brand:</span>
                    <span className="font-semibold text-stone-800">{asset.brand || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Model / Seri:</span>
                    <span className="font-semibold text-stone-800">{asset.model || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Nomor Seri (S/N):</span>
                    <span className="font-mono font-bold text-stone-900">{asset.serial_number || '-'}</span>
                  </div>
                </div>

                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Penugasan & Pembelian</span>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Penanggung Jawab Saat Ini:</span>
                    <span className="font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {asset.assigned_user || 'Belum Ditugaskan'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Lokasi Penempatan:</span>
                    <span className="font-semibold text-stone-800">
                      {asset.location || asset.purchase_location || 'Tidak Ditentukan'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-200/60">
                    <span className="text-stone-500">Tanggal Pembelian:</span>
                    <span className="font-semibold text-stone-800">{formatDate(asset.purchase_date)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-stone-500">Harga Pembelian:</span>
                    <span className="font-bold text-stone-900">{formatRupiah(asset.purchase_price)}</span>
                  </div>
                </div>
              </div>

              {/* Warranty Card in Overview */}
              {asset.warranty && (
                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      <span>Informasi Garansi Resmi / Distributor</span>
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

              {/* Vehicle Category Details */}
              {asset.vehicle_details && (
                <div className="p-5 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <Car className="w-4 h-4 text-emerald-700" />
                    <span>Detail Kendaraan & Status Legalitas</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Plat Nomor</span>
                      <span className="font-extrabold text-stone-900 text-sm">
                        {asset.vehicle_details.license_plate}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Odometer</span>
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

              {/* Device Category Details */}
              {asset.device_details && (
                <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <Laptop className="w-4 h-4 text-blue-700" />
                    <span>Detail Gadget & Perangkat Elektronik</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    {asset.device_details.model_number && (
                      <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Model Number</span>
                        <span className="font-semibold text-stone-900">{asset.device_details.model_number}</span>
                      </div>
                    )}
                    {asset.device_details.imei && (
                      <div className="bg-white p-3 rounded-xl border border-blue-100">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">IMEI</span>
                        <span className="font-semibold font-mono text-stone-900">{asset.device_details.imei}</span>
                      </div>
                    )}
                    {asset.device_details.accessories && asset.device_details.accessories.length > 0 && (
                      <div className="bg-white p-3 rounded-xl border border-blue-100 col-span-1 md:col-span-3">
                        <span className="text-[10px] text-stone-400 uppercase font-bold block mb-1">Aksesori Bawaan:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {asset.device_details.accessories.map((acc, idx) => (
                            <span key={`acc-${idx}-${acc}`} className="px-2 py-0.5 bg-stone-100 text-stone-700 rounded text-[11px] font-medium">
                              {acc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SIM Card Details & Digital Account Tracker */}
              {asset.sim_details && (
                <div className="p-5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                      <Smartphone className="w-4 h-4 text-emerald-700" />
                      <span>Detail Kartu SIM & Pelacak Akun Digital</span>
                    </div>
                    {asset.sim_details.registration_status && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 uppercase">
                        {asset.sim_details.registration_status === 'registered' ? 'Terdaftar Dukcapil' : asset.sim_details.registration_status}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Nomor Telepon / SIM</span>
                      <span className="font-extrabold text-stone-900 font-mono text-sm tracking-wide">
                        {asset.sim_details.phone_number || '-'}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Provider Operator</span>
                      <span className="font-bold text-emerald-900 text-xs">
                        {asset.sim_details.provider || '-'}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-emerald-100">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">Masa Aktif</span>
                      <span className="font-semibold text-stone-800 text-xs">
                        {asset.sim_details.active_until ? formatDate(asset.sim_details.active_until) : 'Tidak Tercatat'}
                      </span>
                    </div>
                  </div>

                  {asset.sim_details.account_dependencies && asset.sim_details.account_dependencies.length > 0 && (
                    <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-stone-900 font-bold text-xs">
                          <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Akun & Layanan Digital Terhubung (OTP/Verifikasi)</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {asset.sim_details.account_dependencies.length} Layanan
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {asset.sim_details.account_dependencies.map((acc, idx) => (
                          <span
                            key={`acc-dep-${idx}-${acc}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-2xs"
                          >
                            <span>{acc}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200/80 text-xs space-y-1.5">
                <span className="font-bold text-stone-800 text-xs block flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>Catatan Khusus Aset</span>
                </span>
                <p className="text-stone-700 leading-relaxed font-medium whitespace-pre-line">
                  {asset.notes ? asset.notes : 'Tidak ada catatan tambahan untuk aset ini.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: ACTIVITY & LIFECYCLE HISTORY */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-700" />
                  <span>Rekam Jejak & Lifecycle Timeline</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Melacak perpindahan pengguna, perubahan status, perpindahan lokasi, dan riwayat servis.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-stone-100 text-stone-700 rounded-full border border-stone-200 shrink-0 self-start sm:self-auto">
                {historyItems.length} Aktivitas Terekam
              </span>
            </div>

            {/* Current Ownership Callout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-800 text-white rounded-xl shrink-0 shadow-2xs">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Penanggung Jawab Saat Ini</span>
                  <span className="font-extrabold text-stone-900 text-sm">
                    {asset.assigned_user || 'Belum Ditugaskan'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-800 text-white rounded-xl shrink-0 shadow-2xs">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Lokasi Penempatan</span>
                  <span className="font-bold text-stone-900 text-sm">
                    {asset.location || asset.purchase_location || 'Tidak Ditentukan'}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline List */}
            {historyItems.length === 0 ? (
              <div className="p-8 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <History className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">Belum Ada Catatan Riwayat</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
                  Perubahan pengguna, lokasi, atau status aset akan dicatat secara otomatis di sini.
                </p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                {historyItems.map((item) => {
                  let badgeBg = 'bg-stone-100 text-stone-700 border-stone-200';
                  let IconComponent = Clock;

                  if (item.iconType === 'user') {
                    badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-200';
                    IconComponent = User;
                  } else if (item.iconType === 'location') {
                    badgeBg = 'bg-blue-100 text-blue-900 border-blue-200';
                    IconComponent = MapPin;
                  } else if (item.iconType === 'status') {
                    badgeBg = 'bg-amber-100 text-amber-900 border-amber-200';
                    IconComponent = Tag;
                  } else if (item.iconType === 'service') {
                    badgeBg = 'bg-purple-100 text-purple-900 border-purple-200';
                    IconComponent = Wrench;
                  } else if (item.iconType === 'created') {
                    badgeBg = 'bg-stone-900 text-white border-stone-900';
                    IconComponent = CheckCircle2;
                  }

                  return (
                    <div key={item.id} className="relative group">
                      {/* Timeline Node Dot */}
                      <div className={`absolute -left-[31px] top-1.5 w-6 h-6 rounded-full border flex items-center justify-center shadow-2xs ${badgeBg}`}>
                        <IconComponent className="w-3 h-3" />
                      </div>

                      {/* Timeline Card */}
                      <div className="bg-stone-50/80 hover:bg-stone-50 border border-stone-200 p-4 rounded-2xl space-y-2 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-stone-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase tracking-wider ${badgeBg}`}>
                              {item.title}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-stone-500">
                            {formatDate(item.timestamp)}
                          </span>
                        </div>

                        {/* Old → New Value Indicator */}
                        {(item.oldValue || item.newValue) && (
                          <div className="flex items-center gap-2 text-xs font-semibold pt-1">
                            {item.oldValue && (
                              <span className="px-2 py-1 bg-stone-200/80 text-stone-700 rounded-lg line-through text-[11px]">
                                {item.oldValue}
                              </span>
                            )}
                            {item.oldValue && item.newValue && (
                              <ArrowRight className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                            )}
                            {item.newValue && (
                              <span className="px-2.5 py-1 bg-emerald-800 text-white rounded-lg font-bold text-[11px]">
                                {item.newValue}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Performed by & Notes */}
                        {item.notes && (
                          <p className="text-xs text-stone-700 leading-relaxed font-medium">
                            {item.notes}
                          </p>
                        )}

                        {item.performedBy && (
                          <div className="text-[10px] text-stone-500 font-medium flex items-center gap-1 pt-1">
                            <span>Dicatat / Penanggung jawab:</span>
                            <span className="font-bold text-stone-800">{item.performedBy}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENTS & INVOICES */}
        {activeTab === 'documents' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-700" />
                  <span>Dokumen, Bukti Pembelian & Garansi</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Faktur pembelian, kartu garansi resmi, STNK, BPKB, atau buku manual.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddDocument(asset.asset_id)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Unggah Dokumen</span>
              </button>
            </div>

            {documentItems.length === 0 ? (
              <div className="py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <FileText className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">Belum Ada Dokumen</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                  Simpan bukti pembelian, sertifikat garansi, atau foto fisik untuk verifikasi kepemilikan.
                </p>
                <button
                  type="button"
                  onClick={() => onAddDocument(asset.asset_id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl hover:bg-emerald-50 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Unggah Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {documentItems.map((doc, index) => {
                  const docTitle = getDocumentDisplayTitle(doc);
                  const docType = getDocumentDisplayType(doc);
                  const primaryUrl = getDocumentPrimaryUrl(doc);
                  const previewUrl = getDocumentPreviewUrl(doc);

                  return (
                    <div
                      key={doc.document_id || (doc as any).id || `doc-${index}`}
                      className="p-4 rounded-2xl border border-stone-200 flex items-center justify-between gap-3 bg-stone-50/80 hover:bg-stone-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl shrink-0">
                          <FileCheck className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-stone-900 truncate" title={docTitle}>
                            {docTitle}
                          </h4>
                          <p className="text-[10px] text-stone-500 uppercase font-semibold mt-0.5">
                            {docType} • {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {(previewUrl || primaryUrl) && (
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
                            <span>Lihat</span>
                          </button>
                        )}
                        {primaryUrl && (
                          <button
                            type="button"
                            onClick={() => handleOpenDocument(doc)}
                            className="p-1.5 text-stone-600 hover:bg-stone-200/80 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title="Buka File / External Link"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SERVICE & MAINTENANCE */}
        {activeTab === 'service' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
              <div>
                <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-emerald-700" />
                  <span>Riwayat Servis & Perawatan Berkala</span>
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Catat biaya servis, ganti oli, suku cadang, dan perbaikan berkala.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onAddMaintenance(asset.asset_id)}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catat Servis</span>
              </button>
            </div>

            {maintenanceItems.length === 0 ? (
              <div className="py-12 text-center bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                <Wrench className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-stone-700">Belum Ada Riwayat Servis</p>
                <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1 mb-4">
                  Aset belum memiliki rekaman perawatan atau perbaikan berkala.
                </p>
                <button
                  type="button"
                  onClick={() => onAddMaintenance(asset.asset_id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-emerald-700 border border-emerald-200 font-bold text-xs rounded-xl hover:bg-emerald-50 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Servis Pertama</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenanceItems.map((item, index) => (
                  <div
                    key={item.maintenance_id || (item as any).id || `maint-${index}`}
                    className="p-4 rounded-2xl border border-stone-200 bg-stone-50/80 hover:bg-stone-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                          {item.type}
                        </span>
                        {item.title && (
                          <span className="text-xs font-bold text-stone-900">
                            {item.title}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-stone-500">
                          • {formatDate(item.date)}
                        </span>
                      </div>
                      {item.mileage && (
                        <p className="text-[11px] font-bold text-emerald-800">
                          Odometer: {item.mileage.toLocaleString('id-ID')} km
                        </p>
                      )}
                      {item.notes && <p className="text-xs text-stone-800 font-medium">{item.notes}</p>}
                      {(item.provider || (item as any).technician_name) && (
                        <p className="text-[11px] text-stone-500 font-medium">
                          Bengkel / Teknisi: <strong className="text-stone-700">{[item.provider, (item as any).technician_name].filter(Boolean).join(' • ')}</strong>
                        </p>
                      )}
                    </div>
                    <div className="text-left sm:text-right shrink-0">
                      <span className="text-sm font-black text-stone-900 block">
                        {formatRupiah(item.cost)}
                      </span>
                      {item.next_date && (
                        <span className="text-[10px] font-semibold text-stone-500 block">
                          Berikutnya: {formatDate(item.next_date)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: EXPENSES & TCO (Total Cost of Ownership) */}
        {activeTab === 'expenses' && (
          <div className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 space-y-6 shadow-2xs animate-fade-in">
            <div className="border-b border-stone-100 pb-4">
              <h3 className="text-base font-extrabold text-stone-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" />
                <span>Analisis Biaya Total Kepemilikan (TCO)</span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Kalkulasi komprehensif harga beli, total perawatan akumulatif, dan rasio depresiasi aset.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Harga Beli Awal</span>
                <span className="text-xl font-black text-stone-900 block">{formatRupiah(asset.purchase_price)}</span>
                <p className="text-[11px] text-stone-500">Dibeli {formatDate(asset.purchase_date)}</p>
              </div>

              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-1">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">Total Biaya Perawatan</span>
                <span className="text-xl font-black text-stone-900 block">{formatRupiah(tcoInfo.maintenanceTotal + tcoInfo.repairTotal)}</span>
                <p className="text-[11px] text-stone-500">{tcoInfo.maintenanceRatioPercent}% dari harga pembelian</p>
              </div>

              <div className="p-4 bg-emerald-50/80 rounded-2xl border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Total Kepemilikan (TCO)</span>
                <span className="text-xl font-black text-emerald-950 block">{formatRupiah(tcoInfo.totalCostOfOwnership)}</span>
                <p className="text-[11px] text-emerald-800 font-medium">Estimasi ~{formatRupiah(tcoInfo.costPerYear)}/tahun</p>
              </div>
            </div>

            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
              <span className="font-bold text-stone-800 block">Kalkulasi Kepemilikan:</span>
              <p className="text-stone-600 leading-relaxed">
                Aset ini telah dimiliki selama kurang lebih <strong>{tcoInfo.yearsOwned} tahun</strong>. Rasio biaya perawatan terhadap harga beli berada pada angka <strong>{tcoInfo.maintenanceRatioPercent}%</strong>.
              </p>
            </div>
          </div>
        )}

      </div>

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
