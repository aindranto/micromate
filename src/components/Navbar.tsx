import React, { useState, useEffect } from 'react';
import { SyncStatus, ServiceHealth, Asset } from '../types';
import { 
  Box, 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  Settings, 
  Search,
  Database,
  HardDrive,
  Clock,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  UploadCloud,
  Code2,
  Download,
  Sparkles,
  BookOpen,
  X
} from 'lucide-react';

interface NavbarProps {
  syncStatus: SyncStatus;
  syncQueueCount: number;
  serviceHealth: ServiceHealth;
  lastSyncTime: string;
  hasDemoData?: boolean;
  onSyncClick: () => void;
  onPullClick?: () => void;
  onOpenSettings: () => void;
  onNavigateDocs?: () => void;
  onQuickAddAsset: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onVerifyConnection?: () => void;
  onClearDemoData?: () => void;
  onOpenDemoOnboarding?: () => void;
  onNotificationAction?: (payload: any) => void;
  assets?: Asset[];
}

export const Navbar: React.FC<NavbarProps> = ({
  syncStatus,
  syncQueueCount,
  serviceHealth,
  lastSyncTime,
  hasDemoData,
  onSyncClick,
  onPullClick,
  onOpenSettings,
  onNavigateDocs,
  onQuickAddAsset,
  searchQuery,
  onSearchChange,
  onVerifyConnection,
  onClearDemoData,
  onOpenDemoOnboarding,
  onNotificationAction,
  assets = []
}) => {
  const [showSyncPopover, setShowSyncPopover] = useState(false);
  const [isDemoBannerVisible, setIsDemoBannerVisible] = useState(() => {
    return localStorage.getItem('micromate_demo_banner_dismissed') !== 'true';
  });

  const handleDismissDemoBanner = () => {
    setIsDemoBannerVisible(false);
    localStorage.setItem('micromate_demo_banner_dismissed', 'true');
  };

  // Contextual indicator config
  const getHeaderBadgeConfig = () => {
    switch (syncStatus) {
      case 'unconfigured':
        return {
          shortLabel: 'Local',
          fullLabel: 'Penyimpanan Lokal',
          classes: 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200',
          icon: <HardDrive className="w-3.5 h-3.5 text-stone-600 shrink-0" />
        };
      case 'unverified':
        return {
          shortLabel: 'Perlu Verifikasi',
          fullLabel: 'Koneksi Perlu Verifikasi',
          classes: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300',
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
        };
      case 'partial':
        return {
          shortLabel: 'Sebagian',
          fullLabel: 'Koneksi Sebagian',
          classes: 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        };
      case 'pending':
        return {
          shortLabel: `${syncQueueCount} Pending`,
          fullLabel: `${syncQueueCount} Perubahan Pending`,
          classes: 'bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 font-extrabold',
          icon: <UploadCloud className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        };
      case 'syncing':
        return {
          shortLabel: 'Syncing...',
          fullLabel: 'Menyinkronkan...',
          classes: 'bg-emerald-50 text-emerald-950 border-emerald-300 font-extrabold',
          icon: <RefreshCw className="w-3.5 h-3.5 text-emerald-700 animate-spin shrink-0" />
        };
      case 'synced':
        return {
          shortLabel: 'Tersinkron',
          fullLabel: `Tersinkron ${lastSyncTime ? `· ${lastSyncTime}` : ''}`,
          classes: 'bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 border-emerald-200',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        };
      case 'error':
        return {
          shortLabel: 'Sync Error',
          fullLabel: 'Gagal Menyinkronkan',
          classes: 'bg-rose-50 hover:bg-rose-100 text-rose-900 border-rose-300',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        };
      case 'offline':
      default:
        return {
          shortLabel: 'Offline',
          fullLabel: 'Offline · Data Lokal',
          classes: 'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200',
          icon: <WifiOff className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        };
    }
  };

  const badgeConfig = getHeaderBadgeConfig();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-colors">
      <div className="w-full px-3.5 sm:px-6 lg:px-8 xl:px-10 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Brand Logo & Name */}
        <a 
          href="#landing" 
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 group cursor-pointer"
          title="Ke Halaman Landing Page"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-900 text-white flex items-center justify-center shadow-2xs font-black text-base sm:text-lg shrink-0 group-hover:bg-emerald-950 transition-colors">
            <Box className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-extrabold text-stone-900 text-base sm:text-lg tracking-tight leading-none truncate group-hover:text-emerald-900 transition-colors">
              MicroMate
            </h1>
            <p className="text-[11px] text-stone-500 hidden sm:block font-medium truncate mt-0.5">
              Personal Asset Vault
            </p>
          </div>
        </a>

        {/* Global Search Input (Desktop M3 Search Bar) */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari aset, plat nomor, serial number, brand..."
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-stone-100/80 focus:bg-white border border-stone-200/80 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-600/40 text-stone-900 placeholder-stone-400 transition-all font-medium"
            />
          </div>
        </div>

        {/* Action Controls: Contextual Sync Status + Settings */}
        <div className="flex items-center gap-1.5 sm:gap-2 relative shrink-0">
          
          {/* Contextual Sync Status Badge (M3 Badge) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSyncPopover(!showSyncPopover)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border transition-all cursor-pointer shadow-2xs ${badgeConfig.classes}`}
              title="Status Koneksi & Penyimpanan"
            >
              {badgeConfig.icon}
              <span className="hidden sm:inline">{badgeConfig.fullLabel}</span>
              <span className="sm:hidden font-bold">{badgeConfig.shortLabel}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {/* Sync Detail Popover Card (M3 Container) */}
            {showSyncPopover && (
              <div 
                className="absolute right-0 mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] bg-white/95 backdrop-blur-md rounded-3xl border border-stone-200/80 shadow-2xl p-4.5 z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
                onMouseLeave={() => setShowSyncPopover(false)}
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-extrabold text-stone-900">Status Penyimpanan &amp; Sync</span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                    syncStatus === 'unconfigured' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                    syncStatus === 'error' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                    'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {syncStatus === 'synced' ? '🟢 Terhubung' :
                     syncStatus === 'unconfigured' ? '⚪ Penyimpanan Lokal' :
                     syncStatus === 'unverified' ? '🟡 Belum Verifikasi' :
                     syncStatus === 'partial' ? '🟡 Koneksi Sebagian' :
                     syncStatus === 'pending' ? '🟡 Changes Pending' :
                     syncStatus === 'syncing' ? '🔄 Syncing' :
                     syncStatus === 'error' ? '🔴 Sync Error' : '⚪ Offline'}
                  </span>
                </div>

                {/* Service Breakdown Matrix */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <Code2 className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Google Apps Script</span>
                    </span>
                    <span className={`font-bold ${
                      serviceHealth.appsScript ? 'text-emerald-800' : 'text-amber-800'
                    }`}>
                      {serviceHealth.appsScript ? '✓ Aktif' : '⚪ Belum dikonfigurasi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <Database className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Google Sheets</span>
                    </span>
                    <span className={`font-bold ${
                      serviceHealth.googleSheets ? 'text-emerald-800' : 'text-stone-500'
                    }`}>
                      {serviceHealth.googleSheets ? '✓ Aktif' : '⚪ Belum terhubung'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-800" />
                      <span>Google Drive Vault</span>
                    </span>
                    <span className={`font-bold ${
                      serviceHealth.googleDrive ? 'text-emerald-800' : 'text-stone-500'
                    }`}>
                      {serviceHealth.googleDrive ? '✓ Aktif' : '⚪ Belum terhubung'}
                    </span>
                  </div>

                  {lastSyncTime && (
                    <div className="flex items-center justify-between pt-1 border-t border-stone-100 text-stone-500 text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>Terakhir Sync</span>
                      </span>
                      <span className="font-semibold text-stone-800">{lastSyncTime}</span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  {syncStatus === 'unconfigured' || syncStatus === 'partial' || syncStatus === 'error' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSettings();
                        setShowSyncPopover(false);
                      }}
                      className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs"
                    >
                      <UploadCloud className="w-4 h-4 text-emerald-300" />
                      <span>☁️ Kelola Integrasi Storage</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onSyncClick();
                          setShowSyncPopover(false);
                        }}
                        className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sinkronkan Sekarang</span>
                      </button>

                      {onPullClick && (
                        <button
                          type="button"
                          onClick={() => {
                            onPullClick();
                            setShowSyncPopover(false);
                          }}
                          className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-stone-200"
                        >
                          <Download className="w-3 h-3 text-emerald-800" />
                          <span>Tarik Data dari Sheets</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Panduan & Docs Button */}
          {onNavigateDocs && (
            <button
              type="button"
              onClick={onNavigateDocs}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-stone-200"
              title="Panduan & Dokumentasi"
            >
              <BookOpen className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-stone-700" />
            </button>
          )}

          {/* Settings Button (Desktop only; on mobile it is housed in the bottom navigation bar) */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden lg:flex p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-stone-200"
            title="Pengaturan Control Center"
          >
            <Settings className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-stone-700" />
          </button>

        </div>
      </div>

      {/* Contextual Demo Data Notification Banner */}
      {hasDemoData && isDemoBannerVisible && (
        <div className="bg-amber-50/90 border-b border-amber-200/80 px-3 py-1 text-[11px] font-medium text-amber-950 flex items-center justify-between gap-2 transition-all">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span className="shrink-0">🧪</span>
            <span className="truncate text-stone-700">Data contoh (demo assets) aktif.</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onOpenDemoOnboarding && (
              <button
                type="button"
                onClick={onOpenDemoOnboarding}
                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-md text-[10px] font-bold cursor-pointer transition-colors border border-amber-200"
              >
                Kelola
              </button>
            )}
            <button
              type="button"
              onClick={handleDismissDemoBanner}
              className="p-1 text-stone-500 hover:text-stone-900 hover:bg-amber-100 rounded-md cursor-pointer transition-colors"
              title="Tutup banner ini"
              aria-label="Tutup"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

