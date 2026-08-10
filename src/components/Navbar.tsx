import React, { useState } from 'react';
import { SyncStatus, ServiceHealth } from '../types';
import { 
  Box, 
  RefreshCw, 
  CheckCircle2, 
  WifiOff, 
  Settings, 
  Search,
  BookOpen,
  Database,
  HardDrive,
  Clock,
  ChevronDown,
  AlertTriangle,
  AlertCircle,
  UploadCloud,
  Code2
} from 'lucide-react';

interface NavbarProps {
  syncStatus: SyncStatus;
  syncQueueCount: number;
  serviceHealth: ServiceHealth;
  lastSyncTime: string;
  hasDemoData?: boolean;
  onSyncClick: () => void;
  onOpenSettings: () => void;
  onNavigateDocs?: () => void;
  onQuickAddAsset: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onVerifyConnection?: () => void;
  onClearDemoData?: () => void;
  onOpenDemoOnboarding?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  syncStatus,
  syncQueueCount,
  serviceHealth,
  lastSyncTime,
  hasDemoData,
  onSyncClick,
  onOpenSettings,
  onNavigateDocs,
  onQuickAddAsset,
  searchQuery,
  onSearchChange,
  onVerifyConnection,
  onClearDemoData,
  onOpenDemoOnboarding,
}) => {
  const [showSyncPopover, setShowSyncPopover] = useState(false);

  // Helper badge config for the header button
  const getHeaderBadgeConfig = () => {
    switch (syncStatus) {
      case 'unconfigured':
        return {
          label: '⚪ Belum Terhubung',
          classes: 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        };
      case 'unverified':
        return {
          label: '🟡 Belum Diverifikasi',
          classes: 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100',
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
        };
      case 'partial':
        return {
          label: '🟡 Koneksi Sebagian',
          classes: 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        };
      case 'pending':
        return {
          label: `🟡 ${syncQueueCount} Pending`,
          classes: 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200',
          icon: <UploadCloud className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        };
      case 'syncing':
        return {
          label: '🔄 Menyinkronkan...',
          classes: 'bg-amber-50 border-amber-300 text-amber-900',
          icon: <RefreshCw className="w-3.5 h-3.5 text-amber-600 animate-spin shrink-0" />
        };
      case 'synced':
        return {
          label: `🟢 Synced ${lastSyncTime ? `· ${lastSyncTime}` : ''}`,
          classes: 'bg-emerald-50 border-emerald-300 text-emerald-950 hover:bg-emerald-100',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        };
      case 'error':
        return {
          label: '🔴 Sync Error',
          classes: 'bg-rose-50 border-rose-300 text-rose-900 hover:bg-rose-100',
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
        };
      case 'offline':
      default:
        return {
          label: '⚪ Offline · Data Lokal',
          classes: 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200',
          icon: <WifiOff className="w-3.5 h-3.5 text-stone-500 shrink-0" />
        };
    }
  };

  const badgeConfig = getHeaderBadgeConfig();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center shadow-xs font-bold text-lg">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-stone-900 text-lg tracking-tight leading-none">
                MicroMate
              </h1>
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-900 px-1.5 py-0.5 rounded border border-emerald-200/80">
                MVP v1.0
              </span>
              {hasDemoData && (
                <button
                  type="button"
                  onClick={onOpenDemoOnboarding}
                  title="Klik untuk memilih opsi data contoh atau hapus data contoh"
                  className="text-[10px] font-extrabold bg-amber-100 hover:bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs transition-all cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span>🧪 Data Contoh</span>
                </button>
              )}
            </div>
            <p className="text-xs text-stone-500 hidden sm:block font-medium">
              Personal Asset & Maintenance Manager
            </p>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari aset, plat nomor, serial number, brand..."
              className="w-full pl-9 pr-4 py-1.5 text-sm bg-stone-50 focus:bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/40 text-stone-900 placeholder-stone-400 transition-all"
            />
          </div>
        </div>

        {/* Action Controls & Sync Status Badge */}
        <div className="flex items-center gap-2 sm:gap-3 relative">
          
          {/* Sync Status Badge with Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSyncPopover(!showSyncPopover)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold rounded-xl border transition-all cursor-pointer shadow-2xs ${badgeConfig.classes}`}
              title="Status Koneksi & Sinkronisasi Cloud"
            >
              {badgeConfig.icon}
              <span className="hidden sm:inline">{badgeConfig.label}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {/* Sync Detail Popover Card */}
            {showSyncPopover && (
              <div 
                className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-stone-200 shadow-xl p-4 z-50 space-y-3.5"
                onMouseLeave={() => setShowSyncPopover(false)}
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <span className="text-xs font-bold text-stone-900">Status Sinkronisasi</span>
                  <span className={`px-2 py-0.5 text-[10px] font-extrabold rounded-full border ${
                    syncStatus === 'synced' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                    syncStatus === 'unconfigured' ? 'bg-stone-100 text-stone-700 border-stone-200' :
                    syncStatus === 'error' ? 'bg-rose-100 text-rose-900 border-rose-300' :
                    'bg-amber-100 text-amber-900 border-amber-300'
                  }`}>
                    {syncStatus === 'synced' ? '🟢 Synced' :
                     syncStatus === 'unconfigured' ? '⚪ Belum Terhubung' :
                     syncStatus === 'unverified' ? '🟡 Belum Diverifikasi' :
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
                      <Code2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Google Apps Script</span>
                    </span>
                    <span className={`font-bold ${
                      serviceHealth.appsScript ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {serviceHealth.appsScript ? '✓ Terhubung' : '⚠️ Belum dikonfigurasi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <Database className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Google Sheets</span>
                    </span>
                    <span className={`font-bold ${
                      serviceHealth.googleSheets ? 'text-emerald-700' : 'text-stone-500'
                    }`}>
                      {serviceHealth.googleSheets ? '✓ Terhubung' : '⚪ Menunggu koneksi'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-stone-600 font-medium">
                      <HardDrive className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Google Drive Vault</span>
                    </span>
                    <span className={`font-bold ${
                      serviceHealth.googleDrive ? 'text-emerald-700' : 'text-stone-500'
                    }`}>
                      {serviceHealth.googleDrive ? '✓ Terhubung' : '⚪ Menunggu koneksi'}
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

                {/* Reassurance Offline-First Banner */}
                <div className="p-2.5 bg-stone-50 rounded-xl border border-stone-200 text-[11px] text-stone-600 space-y-1">
                  <span className="font-bold text-stone-800 block">💡 Local-First Operational Storage:</span>
                  <p className="leading-snug">
                    Data lokal tetap 100% aman di peramban Anda (IndexedDB), tidak tergantung pada koneksi cloud.
                  </p>
                </div>

                <div className="pt-1 flex gap-2">
                  {syncStatus === 'unconfigured' || syncStatus === 'partial' || syncStatus === 'error' ? (
                    <button
                      type="button"
                      onClick={() => {
                        onOpenSettings();
                        setShowSyncPopover(false);
                      }}
                      className="w-full py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>Pengaturan Sync</span>
                    </button>
                  ) : (
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
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Documentation & Help Guide Button */}
          {onNavigateDocs && (
            <button
              type="button"
              onClick={onNavigateDocs}
              className="p-2 text-stone-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
              title="Panduan & Dokumentasi"
            >
              <BookOpen className="w-4 h-4" />
            </button>
          )}

          {/* Settings Button */}
          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
            title="Pengaturan & Ekspor Data"
          >
            <Settings className="w-4 h-4" />
          </button>

        </div>
      </div>
    </header>
  );
};
