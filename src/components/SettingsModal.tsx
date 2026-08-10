import React, { useState, useEffect } from 'react';
import { SyncStatus, ServiceHealth } from '../types';
import { dbManager } from '../lib/db';
import { X, Settings, Download, Upload, RotateCcw, Database, Check, RefreshCw, AlertTriangle, HardDrive, Code2, UploadCloud } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: SyncStatus;
  serviceHealth: ServiceHealth;
  syncQueueCount: number;
  hasDemoData?: boolean;
  onFlushSync: () => void;
  onDataReload: () => void;
  onVerifyConnection: () => void;
  onClearDemoData?: () => void;
  onOpenDemoOnboarding?: () => void;
  onClearCacheAndReset?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  serviceHealth,
  syncQueueCount,
  hasDemoData,
  onFlushSync,
  onDataReload,
  onVerifyConnection,
  onClearDemoData,
  onOpenDemoOnboarding,
  onClearCacheAndReset,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const [appsScriptUrl, setAppsScriptUrl] = useState(
    localStorage.getItem('micromate_apps_script_url') || ''
  );
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'none' | 'clear_cache' | 'reset_seed'>('none');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSaveAppsScriptUrl = async () => {
    localStorage.setItem('micromate_apps_script_url', appsScriptUrl.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setIsVerifying(true);
    await onVerifyConnection();
    const pullRes = await dbManager.pullFromGoogleSheets();
    if (pullRes.success && pullRes.count > 0) {
      onDataReload();
    }
    setIsVerifying(false);
  };

  const handlePullFromSheets = async () => {
    setIsPulling(true);
    setPullMessage(null);
    const result = await dbManager.pullFromGoogleSheets();
    setIsPulling(false);
    if (result.success) {
      let msg = `Berhasil menyinkronkan ${result.count} data aset dari Google Sheets!`;
      if (result.reconciledRemoved && result.reconciledRemoved > 0) {
        msg += ` (${result.reconciledRemoved} aset yang tidak ada di cloud telah disesuaikan/dihapus dari lokal)`;
      }
      setPullMessage(msg);
      onDataReload();
    } else {
      setPullMessage(result.error || 'Gagal menarik data dari Google Sheets.');
    }
  };

  const handlePushToSheets = async () => {
    setIsPushing(true);
    setPullMessage(null);
    try {
      const assets = await dbManager.getAllAssets();
      const validAssets = assets.filter(a => !a.deleted);
      for (const asset of validAssets) {
        await dbManager.addToSyncQueue('saveAsset', asset);
      }
      const success = await dbManager.flushSyncQueue();
      if (success) {
        setPullMessage(`Berhasil mengirim & memperbarui ${validAssets.length} data aset ke Google Sheets!`);
      } else {
        setPullMessage('Gagal mengirim data. Pastikan Web App Apps Script sudah di-deploy sebagai "Anyone".');
      }
    } catch (e: any) {
      setPullMessage('Gagal push data: ' + (e?.message || 'Error koneksi'));
    } finally {
      setIsPushing(false);
    }
  };

  const handleExportJSON = async () => {
    const jsonStr = await dbManager.exportJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `micromate_assets_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = await dbManager.importJSON(content);
        if (success) {
          setImportStatus('Data aset berhasil diimpor!');
          setTimeout(() => {
            onDataReload();
            onClose();
          }, 1000);
        } else {
          setImportStatus('Format file JSON tidak valid.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-lg shadow-xl flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-stone-700" />
            <h3 className="font-bold text-stone-900 text-lg">
              Pengaturan & Penyimpanan
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-600 rounded-xl cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6 text-xs flex-1 overflow-y-auto no-scrollbar">
          
          {/* Section 1: Storage & Sync Status */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>Status Penyimpanan Lokal (IndexedDB)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                ✓ Aktif (Offline-First)
              </span>
            </div>

            <p className="text-stone-600 leading-relaxed font-medium">
              Seluruh data aset, garansi, kendaraan, dan riwayat perawatan Anda tersimpan secara offline-first di browser lokal. MicroMate tetap dapat digunakan secara penuh tanpa koneksi internet.
            </p>

            <div className="flex items-center justify-between pt-1">
              <span className="text-stone-700 font-semibold">
                Sync Queue Antrean: <strong>{syncQueueCount} item</strong>
              </span>
              <button
                onClick={onFlushSync}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs cursor-pointer active:scale-95 transition-all"
              >
                Sinkronkan Sekarang
              </button>
            </div>
          </div>

          {/* Section 2: Google Apps Script Gateway (Drive & Sheets) */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div>
              <span className="font-bold text-stone-900 text-sm block">
                Arsitektur Penyimpanan Cloud (Google Drive + Sheets Gateway)
              </span>
              <span className="text-[11px] text-stone-500 font-medium block mt-0.5">
                Alur data: Frontend MicroMate → Google Apps Script Gateway → Google Drive (Dokumen & Foto) + Google Sheets (Metadata).
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-stone-800 text-xs block">
                Google Apps Script API Endpoint Web App
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium text-xs focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
                <button
                  onClick={handleSaveAppsScriptUrl}
                  disabled={isVerifying}
                  className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-all text-xs disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Menguji...</span>
                    </>
                  ) : copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Tersimpan</span>
                    </>
                  ) : (
                    <span>Simpan & Tes Endpoint</span>
                  )}
                </button>
              </div>
            </div>

            {/* Verification Breakdown Card */}
            <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2 text-[11px]">
              <span className="font-bold text-stone-900 block">Status Verifikasi Layanan:</span>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 rounded bg-stone-50 border border-stone-200">
                  <span className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <Code2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Google Apps Script Web App</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    serviceHealth.appsScript 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {serviceHealth.appsScript ? '✓ Terhubung' : '⚠️ Belum dikonfigurasi'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded bg-stone-50 border border-stone-200">
                  <span className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <Database className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Google Sheets Metadata</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    serviceHealth.googleSheets 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}>
                    {serviceHealth.googleSheets ? '✓ Terhubung' : '⚪ Menunggu koneksi'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-1.5 rounded bg-stone-50 border border-stone-200">
                  <span className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Google Drive Vault Folder</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    serviceHealth.googleDrive 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-stone-100 text-stone-600 border border-stone-200'
                  }`}>
                    {serviceHealth.googleDrive ? '✓ Terhubung' : '⚪ Menunggu koneksi'}
                  </span>
                </div>
              </div>

              {serviceHealth.errorMessage && (
                <p className="text-rose-600 text-[10px] pt-1 font-medium">
                  ⚠️ {serviceHealth.errorMessage}
                </p>
              )}
            </div>

            {/* Pull & Push Sync Buttons */}
            <div className="pt-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handlePullFromSheets}
                  disabled={isPulling || isPushing || !appsScriptUrl}
                  className="py-2.5 px-3 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-2xs text-[11px]"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isPulling ? 'animate-spin' : ''}`} />
                  <span>{isPulling ? 'Menarik Data...' : 'Tarik Data dari Sheets'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePushToSheets}
                  disabled={isPushing || isPulling || !appsScriptUrl}
                  className="py-2.5 px-3 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50 shadow-2xs text-[11px]"
                >
                  <UploadCloud className={`w-3.5 h-3.5 ${isPushing ? 'animate-spin' : ''}`} />
                  <span>{isPushing ? 'Mengirim Data...' : 'Kirim Semua ke Sheets'}</span>
                </button>
              </div>

              {pullMessage && (
                <p className={`text-[11px] font-bold mt-2 p-2 rounded-lg border ${
                  pullMessage.includes('Berhasil') 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                    : 'bg-rose-50 text-rose-900 border-rose-200'
                }`}>
                  {pullMessage}
                </p>
              )}
            </div>
          </div>

          {/* Section 3: Backup Export / Import */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <label className="font-bold text-stone-800 block">
              Ekspor & Impor Data (JSON Backup)
            </label>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleExportJSON}
                className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-stone-200"
              >
                <Download className="w-4 h-4 text-emerald-700" />
                <span>Unduh File JSON Backup</span>
              </button>

              <label className="flex-1 px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer border border-stone-200">
                <Upload className="w-4 h-4 text-emerald-700" />
                <span>Impor File JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>
            {importStatus && (
              <p className="text-xs font-bold text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                {importStatus}
              </p>
            )}
          </div>

          {/* Section 4: Demo Data Management */}
          {hasDemoData && (
            <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-extrabold text-amber-950 block text-xs">🧪 Data Contoh (Demo) Masih Aktif</span>
                <span className="text-[11px] text-amber-900 font-medium">
                  Atur alur onboarding awal atau hapus data contoh tanpa mengganggu aset asli Anda.
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {onOpenDemoOnboarding && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenDemoOnboarding();
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-amber-800 hover:bg-amber-900 text-white rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all shadow-2xs"
                  >
                    Buka Dialog Onboarding
                  </button>
                )}
                {onClearDemoData && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearDemoData();
                    }}
                    className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 rounded-xl font-bold text-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Hapus Demo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Section 5: Reset DB & Clear Cache */}
          <div className="pt-4 border-t border-stone-200 space-y-3">
            
            {/* Clear Cache Row */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-rose-700 block text-xs">Clear Cache & Reset State Aplikasi</span>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Hapus seluruh cache browser (`localStorage` + `IndexedDB`) & muat ulang aplikasi dari awal.
                  </span>
                </div>

                {confirmAction !== 'clear_cache' && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('clear_cache')}
                    className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear Cache & Reset</span>
                  </button>
                )}
              </div>

              {confirmAction === 'clear_cache' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in">
                  <p className="text-xs font-bold text-rose-950">
                    ⚠️ Konfirmasi: Hapus seluruh cache lokal & muat ulang aplikasi sekarang?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmAction('none');
                        if (onClearCacheAndReset) {
                          onClearCacheAndReset();
                        } else {
                          localStorage.clear();
                          if (window.indexedDB) {
                            try { window.indexedDB.deleteDatabase('MicroMateDB'); } catch (e) {}
                          }
                          window.location.reload();
                        }
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      Ya, Hapus & Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('none')}
                      className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Reset Seed Row */}
            <div className="flex flex-col space-y-2 pt-2 border-t border-stone-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-stone-700 block text-xs">Reset ke Seed Sampel</span>
                  <span className="text-[11px] text-stone-500 font-medium">
                    Kembalikan data ke kondisi awal (MacBook, Vario, LG AC, Sony A7)
                  </span>
                </div>

                {confirmAction !== 'reset_seed' && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('reset_seed')}
                    className="px-3 py-1.5 bg-stone-100 text-stone-700 hover:bg-stone-200 border border-stone-300 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Data</span>
                  </button>
                )}
              </div>

              {confirmAction === 'reset_seed' && (
                <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl space-y-2 animate-fade-in">
                  <p className="text-xs font-bold text-stone-900">
                    ⚠️ Konfirmasi: Kembalikan data ke kondisi awal (Seed Data)? Data baru Anda akan terhapus.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setConfirmAction('none');
                        await dbManager.resetData();
                        onDataReload();
                        onClose();
                      }}
                      className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                    >
                      Ya, Reset Data
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmAction('none')}
                      className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
