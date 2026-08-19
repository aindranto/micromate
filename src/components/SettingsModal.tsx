import React, { useState, useEffect } from 'react';
import { SyncStatus, ServiceHealth, SyncQueueItem } from '../types';
import { dbManager } from '../lib/db';
import { INITIAL_WORKSPACE_ID } from '../lib/seedData';
import { runContractTests, TestLogEntry } from '../lib/contractTests';
import { APPS_SCRIPT_CODE } from '../lib/appsScriptCode';
import { 
  X, Settings, Download, Upload, RotateCcw, Database, Check, RefreshCw, 
  AlertTriangle, HardDrive, Code2, UploadCloud, Lock, KeyRound, ShieldCheck, 
  Tag, Plus, Edit3, Trash2, Sparkles, Mail, Unlink, FileCode, ShieldAlert,
  FileText, Cloud, ChevronDown, ChevronUp, Maximize2, Minimize2, ExternalLink, Bell
} from 'lucide-react';
import { 
  useCategories, saveCategories, CATEGORY_ICON_LIST, getCategoryIcon, 
  DEFAULT_CATEGORIES, CategoryItem 
} from '../lib/categories';
import { 
  getNotificationPreferences, 
  saveNotificationPreferences, 
  requestBrowserPushPermission 
} from '../lib/notificationPreferenceService';

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
  onRestartOnboarding?: () => void;
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
  onRestartOnboarding,
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

  // App Lock PIN State
  const [appPin, setAppPin] = useState(
    localStorage.getItem('micromate_app_pin') || ''
  );
  const [pinInput, setPinInput] = useState('');
  const [pinMsg, setPinMsg] = useState('');

  // Category Management State
  const categories = useCategories();
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryLabelInput, setCategoryLabelInput] = useState('');
  const [categoryIconInput, setCategoryIconInput] = useState('Box');
  const [categorySearchQuery, setCategorySearchQuery] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [deletingCategoryInfo, setDeletingCategoryInfo] = useState<{ id: string; label: string; inUseCount: number } | null>(null);
  const [isConfirmingResetCategories, setIsConfirmingResetCategories] = useState(false);

  // Accordion Expand/Collapse state for Control Center modules (Exclusive Accordion)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    sync: true,
    security: false,
    categories: false,
    notifications: false,
    backup: false,
    diagnostics: false,
    danger: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => {
      const isCurrentlyOpen = !!prev[key];
      // Exclusive Accordion behavior: opening one collapses all other sections
      return {
        sync: key === 'sync' ? !isCurrentlyOpen : false,
        security: key === 'security' ? !isCurrentlyOpen : false,
        categories: key === 'categories' ? !isCurrentlyOpen : false,
        notifications: key === 'notifications' ? !isCurrentlyOpen : false,
        backup: key === 'backup' ? !isCurrentlyOpen : false,
        diagnostics: key === 'diagnostics' ? !isCurrentlyOpen : false,
        danger: key === 'danger' ? !isCurrentlyOpen : false,
      };
    });
  };

  const areAllExpanded = Object.values(expandedSections).every(Boolean);
  const toggleAllSections = () => {
    const nextVal = !areAllExpanded;
    setExpandedSections({
      sync: nextVal,
      security: nextVal,
      categories: nextVal,
      notifications: nextVal,
      backup: nextVal,
      diagnostics: nextVal,
      danger: nextVal,
    });
  };

  // Notification Preferences State (Phase 6-3E)
  const [notiPrefs, setNotiPrefs] = useState(() => getNotificationPreferences());

  useEffect(() => {
    if (isOpen) {
      setNotiPrefs(getNotificationPreferences());
    }
  }, [isOpen]);

  const handleToggleGlobal = () => {
    const updated = { ...notiPrefs, globalEnabled: !notiPrefs.globalEnabled };
    setNotiPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleToggleChannel = (categoryKey: keyof typeof notiPrefs.categories, channelKey: 'inApp' | 'browserPush' | 'email') => {
    const updated = {
      ...notiPrefs,
      categories: {
        ...notiPrefs.categories,
        [categoryKey]: {
          ...notiPrefs.categories[categoryKey],
          [channelKey]: !notiPrefs.categories[categoryKey][channelKey]
        }
      }
    };
    setNotiPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const handleRequestPushPermission = async () => {
    const permission = await requestBrowserPushPermission();
    const updated = {
      ...notiPrefs,
      browserPermissionState: permission
    };
    setNotiPrefs(updated);
    saveNotificationPreferences(updated);
  };

  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showCodeGuide, setShowCodeGuide] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const copyAppsScriptCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const [isSyncingTwoWay, setIsSyncingTwoWay] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [showManualAdvancedSync, setShowManualAdvancedSync] = useState(false);
  const [pullMessage, setPullMessage] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'none' | 'clear_cache' | 'reset_seed' | 'disconnect_google'>('none');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // JSON Import Preview State
  const [importPreviewData, setImportPreviewData] = useState<{
    filename: string;
    assetsCount: number;
    servicesCount: number;
    remindersCount: number;
    categoriesCount: number;
    rawContent: string;
  } | null>(null);

  // Email Ownership Verification State
  const [otpStep, setOtpStep] = useState<'IDLE' | 'VERIFYING_URL' | 'OTP_SENT' | 'VERIFYING_OTP' | 'VERIFIED' | 'ERROR'>(
    dbManager.isConnectionVerified() ? 'VERIFIED' : 'IDLE'
  );
  const [otpInput, setOtpInput] = useState('');
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState<string>(
    dbManager.getMaskedOwnerEmail() || 'u••••@gmail.com'
  );
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [otpExpiryTimer, setOtpExpiryTimer] = useState<number>(0);

  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0 || otpExpiryTimer > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        setOtpExpiryTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown, otpExpiryTimer]);

  // Diagnostics & Contract Verification States
  const [testResults, setTestResults] = useState<TestLogEntry[] | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [expandedSuiteId, setExpandedSuiteId] = useState<string | null>(null);
  const [testsRunTimestamp, setTestsRunTimestamp] = useState<string | null>(null);

  // Sync Queue Inspector & Failure Management State
  const [queueItems, setQueueItems] = useState<SyncQueueItem[]>([]);
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);
  const [showQueueDetails, setShowQueueDetails] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<SyncQueueItem | null>(null);

  const refreshQueueItems = async () => {
    setIsLoadingQueue(true);
    try {
      const items = await dbManager.getAllSyncQueueItems();
      setQueueItems(items);
    } catch (e) {
      console.error('Failed to load queue items', e);
    } finally {
      setIsLoadingQueue(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshQueueItems();
    }
  }, [isOpen, syncQueueCount]);

  const handleRetryItem = async (itemId: string) => {
    await dbManager.retryQueueItem(itemId);
    await refreshQueueItems();
    if (onFlushSync) onFlushSync();
  };

  const handleRemoveItem = async (itemId: string) => {
    await dbManager.removeSyncQueueItem(itemId);
    await refreshQueueItems();
    if (selectedQueueItem?.id === itemId) setSelectedQueueItem(null);
  };

  const handleRetryAllFailed = async () => {
    await dbManager.retryAllFailedQueueItems();
    await refreshQueueItems();
    if (onFlushSync) onFlushSync();
  };

  const handleClearAllFailed = async () => {
    await dbManager.clearAllFailedQueueItems();
    await refreshQueueItems();
  };

  const handleRunContractTests = async () => {
    setIsRunningTests(true);
    setTestResults(null);
    try {
      const results = await runContractTests();
      setTestResults(results);
      setTestsRunTimestamp(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (e) {
      console.error('Contract tests execution failed', e);
    } finally {
      setIsRunningTests(false);
    }
  };

  if (!isOpen) return null;

  const handleConnectAndIdentify = async () => {
    if (!appsScriptUrl.trim()) {
      setOtpError('Masukkan Apps Script Web App URL terlebih dahulu.');
      return;
    }
    localStorage.setItem('micromate_apps_script_url', appsScriptUrl.trim());
    setOtpError(null);
    setOtpMessage(null);
    setIsVerifying(true);
    setOtpStep('VERIFYING_URL');

    // Step 1: Identify Gateway
    const idRes = await dbManager.identifyGateway(appsScriptUrl.trim());
    if (!idRes.success) {
      setIsVerifying(false);
      setOtpStep('ERROR');
      setOtpError(idRes.message || idRes.error || 'Gagal terhubung ke URL Apps Script.');
      return;
    }

    const masked = idRes.emailMasked || 'u••••@gmail.com';
    setMaskedEmail(masked);

    // Step 2: Request OTP
    const otpRes = await dbManager.requestOtp(appsScriptUrl.trim());
    setIsVerifying(false);

    if (otpRes.success) {
      setOtpStep('OTP_SENT');
      setResendCooldown(45);
      setOtpExpiryTimer(300); // 5 minutes
      setOtpMessage(`Kode verifikasi 6 digit telah dikirim ke email pemilik Google Account: ${masked}`);
    } else {
      setOtpStep('ERROR');
      setOtpError(otpRes.message || 'Gagal meminta kode OTP. Silakan coba lagi.');
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    setOtpError(null);
    setOtpMessage('Mengirim ulang kode OTP...');
    const otpRes = await dbManager.requestOtp(appsScriptUrl.trim());
    if (otpRes.success) {
      setResendCooldown(45);
      setOtpExpiryTimer(300);
      setOtpMessage(`Kode verifikasi baru telah dikirim ke ${maskedEmail}.`);
    } else {
      setOtpError(otpRes.message || 'Gagal mengirim ulang OTP.');
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = (codeToVerify || otpInput).trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setOtpError('Kode OTP harus terdiri dari 6 digit angka.');
      return;
    }
    setOtpError(null);
    setOtpMessage(null);
    setIsVerifying(true);
    setOtpStep('VERIFYING_OTP');

    const res = await dbManager.verifyOtp(code, appsScriptUrl.trim());
    setIsVerifying(false);

    if (res.success && res.verified) {
      setOtpStep('VERIFIED');
      setOtpMessage('✓ Verifikasi kepemilikan email berhasil! Koneksi Cloud aktif.');
      await onVerifyConnection();
      const pullRes = await dbManager.pullFromGoogleSheets();
      if (pullRes.success && pullRes.count > 0) {
        onDataReload();
      }
    } else {
      setOtpStep('OTP_SENT');
      setOtpError(res.message || 'Kode OTP tidak sesuai. Silakan periksa email Anda.');
    }
  };

  const handleDisconnectGateway = () => {
    if (window.confirm('Apakah Anda yakin ingin memutuskan koneksi dengan Apps Script Gateway ini?')) {
      dbManager.disconnectGateway();
      localStorage.removeItem('micromate_apps_script_url');
      setAppsScriptUrl('');
      setOtpStep('IDLE');
      setOtpInput('');
      setOtpMessage('Koneksi telah diputuskan.');
      setOtpError(null);
      onVerifyConnection();
    }
  };

  const handleSaveAppsScriptUrl = async () => {
    handleConnectAndIdentify();
  };

  const handleSavePin = () => {
    if (pinInput.length !== 4 || !/^\d{4}$/.test(pinInput)) {
      setPinMsg('PIN harus terdiri dari 4 digit angka.');
      return;
    }
    localStorage.setItem('micromate_app_pin', pinInput);
    setAppPin(pinInput);
    setPinInput('');
    setPinMsg('✓ PIN keamanan berhasil diaktifkan!');
    setTimeout(() => setPinMsg(''), 3000);
  };

  const handleRemovePin = () => {
    localStorage.removeItem('micromate_app_pin');
    setAppPin('');
    setPinInput('');
    setPinMsg('Pengunci PIN berhasil dinonaktifkan.');
    setTimeout(() => setPinMsg(''), 3000);
  };

  // Category Management Handlers
  const handleStartAddCategory = () => {
    setIsAddingCategory(true);
    setEditingCategoryId(null);
    setCategoryLabelInput('');
    setCategoryIconInput('Box');
    setCategoryError('');
  };

  const handleStartEditCategory = (cat: CategoryItem) => {
    setIsAddingCategory(false);
    setEditingCategoryId(cat.id);
    setCategoryLabelInput(cat.label);
    setCategoryIconInput(cat.iconName);
    setCategoryError('');
  };

  const handleSaveCategory = () => {
    if (!categoryLabelInput.trim()) {
      setCategoryError('Nama kategori tidak boleh kosong.');
      return;
    }

    let updatedList = [...categories];
    if (editingCategoryId) {
      updatedList = updatedList.map((c) => 
        c.id === editingCategoryId 
          ? { ...c, label: categoryLabelInput.trim(), iconName: categoryIconInput }
          : c
      );
    } else {
      const newId = categoryLabelInput.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `cat_${Date.now()}`;
      const finalId = updatedList.some(c => c.id === newId) ? `cat_${Date.now()}` : newId;
      updatedList.push({
        id: finalId,
        label: categoryLabelInput.trim(),
        iconName: categoryIconInput,
        isDefault: false
      });
    }

    saveCategories(updatedList);
    setIsAddingCategory(false);
    setEditingCategoryId(null);
    setCategoryLabelInput('');
    setCategoryIconInput('Box');
    setCategoryError('');
  };

  const handleStartDeleteCategory = async (catId: string) => {
    setCategoryError('');
    if (catId === 'other' || catId === 'lainnya') {
      setCategoryError('Kategori "Lainnya" adalah kategori utama sistem dan tidak dapat dihapus.');
      return;
    }
    
    const cat = categories.find(c => c.id === catId);
    if (categories.length <= 1) {
      setCategoryError('Minimal harus ada 1 kategori aset.');
      return;
    }

    try {
      const allAssets = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
      const inUseAssets = allAssets.filter(
        a => !a.deleted && (
          a.category === catId || 
          a.category.toLowerCase() === catId.toLowerCase() || 
          (cat?.label && a.category.toLowerCase() === cat.label.toLowerCase())
        )
      );

      setDeletingCategoryInfo({
        id: catId,
        label: cat?.label || catId,
        inUseCount: inUseAssets.length
      });
    } catch (e) {
      console.error('Gagal menyiapkan penghapusan kategori:', e);
      setCategoryError('Gagal memeriksa data aset.');
    }
  };

  const handleConfirmDeleteCategory = async () => {
    if (!deletingCategoryInfo) return;
    const { id: catId, inUseCount } = deletingCategoryInfo;

    try {
      if (inUseCount > 0) {
        const cat = categories.find(c => c.id === catId);
        const allAssets = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
        const inUseAssets = allAssets.filter(
          a => !a.deleted && (
            a.category === catId || 
            a.category.toLowerCase() === catId.toLowerCase() || 
            (cat?.label && a.category.toLowerCase() === cat.label.toLowerCase())
          )
        );

        for (const asset of inUseAssets) {
          await dbManager.saveAsset({
            ...asset,
            category: 'other',
            updated_at: new Date().toISOString()
          }, INITIAL_WORKSPACE_ID);
        }
        
        onDataReload();
      }

      const updatedList = categories.filter((c) => c.id !== catId);
      saveCategories(updatedList);
      setIsAddingCategory(false);
      setEditingCategoryId(null);
      setDeletingCategoryInfo(null);
    } catch (e) {
      console.error('Gagal menghapus kategori:', e);
      setCategoryError('Terjadi kesalahan saat menghapus kategori.');
      setDeletingCategoryInfo(null);
    }
  };

  const handleConfirmResetCategories = () => {
    saveCategories(DEFAULT_CATEGORIES);
    setIsConfirmingResetCategories(false);
  };

  // Bidirectional 2-Way Sync
  const handleTwoWaySync = async () => {
    setIsSyncingTwoWay(true);
    setPullMessage(null);
    try {
      // 1. Flush local queue to cloud
      await dbManager.flushSyncQueue();
      // 2. Pull latest from cloud
      const pullRes = await dbManager.pullFromGoogleSheets();
      if (pullRes.success) {
        let msg = `✓ Sinkronisasi 2 arah berhasil! ${pullRes.count} data disinkronkan dengan Cloud.`;
        if (pullRes.reconciledRemoved && pullRes.reconciledRemoved > 0) {
          msg += ` (${pullRes.reconciledRemoved} aset yang dihapus di cloud telah disesuaikan)`;
        }
        setPullMessage(msg);
        onDataReload();
      } else {
        setPullMessage(pullRes.error || 'Gagal menyinkronkan dengan Google Sheets.');
      }
    } catch (e: any) {
      setPullMessage('Gagal sinkronisasi 2 arah: ' + (e?.message || 'Error koneksi'));
    } finally {
      setIsSyncingTwoWay(false);
    }
  };

  const handlePullFromSheets = async () => {
    setIsPulling(true);
    setPullMessage(null);
    const result = await dbManager.pullFromGoogleSheets();
    setIsPulling(false);
    if (result.success) {
      let msg = `Berhasil menarik ${result.count} data aset dari Google Sheets!`;
      if (result.reconciledRemoved && result.reconciledRemoved > 0) {
        msg += ` (${result.reconciledRemoved} disesuaikan)`;
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
      const assets = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
      const validAssets = assets.filter(a => !a.deleted);
      for (const asset of validAssets) {
        await dbManager.addToSyncQueue('saveAsset', asset);
      }
      const success = await dbManager.flushSyncQueue();
      if (success) {
        setPullMessage(`Berhasil mengirim ${validAssets.length} data aset ke Google Sheets!`);
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
    const jsonStr = await dbManager.exportJSON(INITIAL_WORKSPACE_ID);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `micromate_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSelectJSONFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          const assetsCount = Array.isArray(parsed.assets) ? parsed.assets.length : 0;
          const servicesCount = Array.isArray(parsed.services) ? parsed.services.length : 0;
          const remindersCount = Array.isArray(parsed.reminders) ? parsed.reminders.length : 0;
          const categoriesCount = Array.isArray(parsed.categories) ? parsed.categories.length : 0;

          setImportPreviewData({
            filename: file.name,
            assetsCount,
            servicesCount,
            remindersCount,
            categoriesCount,
            rawContent: content
          });
        } catch (err) {
          setImportStatus('Format file JSON tidak valid atau terdistorsi.');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmImportJSON = async () => {
    if (!importPreviewData) return;
    const success = await dbManager.importJSON(importPreviewData.rawContent, INITIAL_WORKSPACE_ID);
    if (success) {
      setImportStatus('✓ Data aset & komponen berhasil diimpor!');
      setImportPreviewData(null);
      setTimeout(() => {
        onDataReload();
        onClose();
      }, 1000);
    } else {
      setImportStatus('⚠️ Gagal mengimpor file JSON.');
      setImportPreviewData(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-stone-200/80 w-full max-w-3xl shadow-2xl flex flex-col h-[620px] max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200/80 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-emerald-100/90 text-emerald-950 rounded-2xl shadow-2xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base md:text-lg leading-none">
                Control Center MicroMate
              </h3>
              <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-1">
                Pusat Kontrol Penyimpanan, Keamanan &amp; Kategori
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-full cursor-pointer transition-all active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Expand / Collapse All Control Bar */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-stone-100/90 border-b border-stone-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-extrabold text-stone-700">
              Menu Pengaturan &amp; Kontrol Sistem
            </span>
          </div>
          <button
            type="button"
            onClick={toggleAllSections}
            className="px-2.5 py-1 text-[11px] font-bold text-emerald-900 hover:text-emerald-950 bg-white hover:bg-emerald-50 rounded-lg border border-stone-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            {areAllExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Tutup Semua</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-emerald-700" />
                <span>Buka Semua</span>
              </>
            )}
          </button>
        </div>

        <div className="p-3.5 sm:p-5 md:p-6 space-y-3.5 text-xs flex-1 overflow-y-auto no-scrollbar">
          
          {/* SECTION 1: Storage & Sync */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('sync')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">Storage &amp; Sinkronisasi Cloud</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      serviceHealth.appsScript && dbManager.isConnectionVerified()
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-stone-200 text-stone-700'
                    }`}>
                      {serviceHealth.appsScript && dbManager.isConnectionVerified() ? '✓ Terhubung' : 'Offline / Lokal'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
                    IndexedDB lokal, antrean mutasi FIFO, dan integrasi Google Sheets
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${expandedSections.sync ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.sync && (
              <div className="p-3.5 sm:p-5 border-t border-stone-200 space-y-5 animate-fade-in">
              {/* Section 1: Storage & Sync Status */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-stone-900">
                <Database className="w-4 h-4 text-emerald-700" />
                <span>Status Penyimpanan Lokal &amp; Antrean (IndexedDB)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                ✓ Aktif (Offline-First)
              </span>
            </div>

            <p className="text-stone-600 leading-relaxed font-medium">
              Seluruh data aset, garansi, kendaraan, dan riwayat perawatan tersimpan secara offline-first di browser lokal. MicroMate mengeksekusi mutasi dengan antrean berurutan (FIFO) dan mekanisme retry otomatis berstandar enterprise.
            </p>

            {/* Sync Queue Summary Stats */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-center">
                <span className="text-[10px] text-stone-500 font-bold block">Antrean Tertunda</span>
                <span className="text-sm font-extrabold text-stone-900">
                  {queueItems.filter(i => i.status === 'PENDING' || i.status === 'PROCESSING').length}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-center">
                <span className="text-[10px] text-amber-600 font-bold block">Sedang Retry</span>
                <span className="text-sm font-extrabold text-amber-900">
                  {queueItems.filter(i => i.status === 'FAILED_RETRYABLE').length}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-stone-200 text-center">
                <span className="text-[10px] text-rose-600 font-bold block">Gagal Permanen</span>
                <span className={`text-sm font-extrabold ${queueItems.some(i => i.status === 'FAILED_PERMANENT') ? 'text-rose-600' : 'text-stone-400'}`}>
                  {queueItems.filter(i => i.status === 'FAILED_PERMANENT').length}
                </span>
              </div>
            </div>

            {/* Failed Permanent / Retry Alert */}
            {queueItems.some(i => i.status === 'FAILED_PERMANENT' || i.status === 'FAILED_RETRYABLE') && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-rose-900 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Perhatian: Ada Mutasi Tertahan di Antrean</span>
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleRetryAllFailed}
                      className="px-2 py-1 bg-rose-800 hover:bg-rose-900 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all active:scale-95 shadow-2xs"
                    >
                      Coba Lagi Semua
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllFailed}
                      className="px-2 py-1 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                    >
                      Bersihkan Gagal
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-rose-800 font-medium">
                  Terdapat perubahan yang belum berhasil terkirim ke Google Sheets. Anda dapat meninjau penyebab kegagalan di bawah atau menekan tombol coba lagi.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setShowQueueDetails(!showQueueDetails)}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 underline flex items-center gap-1 cursor-pointer"
              >
                <span>{showQueueDetails ? 'Sembunyikan Rincian Antrean' : `Lihat Inspeksi Antrean (${queueItems.length} item)`}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showQueueDetails ? 'rotate-180' : ''}`} />
              </button>

              <button
                onClick={onFlushSync}
                className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-lg text-xs cursor-pointer active:scale-95 transition-all shadow-2xs"
              >
                Sinkronkan Sekarang
              </button>
            </div>

            {/* Detailed Sync Queue Inspector */}
            {showQueueDetails && (
              <div className="mt-3 pt-3 border-t border-stone-200 space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-stone-800">Daftar Transaksi Antrean Sinkronisasi:</span>
                  <button
                    type="button"
                    onClick={refreshQueueItems}
                    disabled={isLoadingQueue}
                    className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingQueue ? 'animate-spin' : ''}`} />
                    <span>Muat Ulang Antrean</span>
                  </button>
                </div>

                {queueItems.length === 0 ? (
                  <div className="p-4 bg-white rounded-xl border border-stone-200 text-center text-stone-500 font-medium text-[11px]">
                    ✨ Antrean sinkronisasi bersih. Seluruh data lokal telah tersinkronkan.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
                    {queueItems.map((item) => {
                      const isFailedPerm = item.status === 'FAILED_PERMANENT';
                      const isRetryable = item.status === 'FAILED_RETRYABLE';
                      const isProcessing = item.status === 'PROCESSING';

                      return (
                        <div
                          key={item.id}
                          className={`p-2.5 rounded-xl border transition-all text-[11px] ${
                            isFailedPerm
                              ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                              : isRetryable
                              ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                              : isProcessing
                              ? 'bg-blue-50/80 border-blue-300 text-blue-950'
                              : 'bg-white border-stone-200 text-stone-800'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border ${
                                isFailedPerm
                                  ? 'bg-rose-200 text-rose-900 border-rose-300'
                                  : isRetryable
                                  ? 'bg-amber-200 text-amber-900 border-amber-300'
                                  : isProcessing
                                  ? 'bg-blue-200 text-blue-900 border-blue-300'
                                  : 'bg-stone-100 text-stone-700 border-stone-300'
                              }`}>
                                {item.status}
                              </span>
                              <span className="font-extrabold">{item.action}</span>
                              <span className="text-[10px] text-stone-500 font-mono">[{item.entity || 'GENERAL'}]</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {(isFailedPerm || isRetryable) && (
                                <button
                                  type="button"
                                  onClick={() => handleRetryItem(item.id)}
                                  className="px-2 py-0.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95"
                                  title="Coba sinkronkan ulang mutasi ini"
                                >
                                  Coba Lagi
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="px-2 py-0.5 bg-stone-200 hover:bg-rose-100 hover:text-rose-800 text-stone-700 rounded text-[10px] font-bold cursor-pointer transition-all"
                                title="Hapus mutasi dari antrean"
                              >
                                Hapus
                              </button>
                            </div>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-stone-600 font-mono">
                            <span>ID: {item.mutation_id || item.id}</span>
                            {item.asset_id && <span>Aset: {item.asset_id}</span>}
                            <span>Percobaan: {item.retry_count || 0}/5</span>
                          </div>

                          {item.last_error && (
                            <div className="mt-1 p-1.5 bg-rose-100/70 rounded-lg text-[10px] text-rose-900 font-semibold border border-rose-200">
                              ⚠️ Eror: {item.last_error}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Google Apps Script Gateway & Email Ownership Verification */}
          <div className="space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                  <UploadCloud className="w-4 h-4 text-emerald-800" />
                  <span>Penyimpanan Cloud Personal &amp; Verifikasi Kepemilikan</span>
                </span>
                <span className="text-[11px] text-stone-500 font-medium block mt-0.5">
                  MicroMate terhubung langsung ke Google Sheets &amp; Google Drive pribadi Anda melalui Google Apps Script Web App dengan verifikasi kepemilikan email.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.location.hash = '#/setup/google';
                }}
                className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-extrabold rounded-xl text-[11px] inline-flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-300 shadow-2xs shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-800" />
                <span className="hidden sm:inline">Buka Setup Wizard (/setup)</span>
                <span className="sm:hidden">Setup Wizard</span>
              </button>
            </div>

            {/* Endpoint URL Input Card */}
            <div className="space-y-2 bg-white p-3.5 rounded-xl border border-stone-200">
              <div className="flex items-center justify-between">
                <label className="font-bold text-stone-800 text-xs block">
                  Apps Script Web App Endpoint URL
                </label>
                <button
                  type="button"
                  onClick={() => setShowCodeGuide(true)}
                  className="text-[11px] font-bold text-emerald-800 hover:text-emerald-900 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>📖 Buka Panduan &amp; Salin Skrip</span>
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={appsScriptUrl}
                  onChange={(e) => {
                    setAppsScriptUrl(e.target.value);
                    if (otpStep === 'ERROR' || otpStep === 'OTP_SENT') {
                      setOtpStep('IDLE');
                    }
                  }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium text-xs focus:bg-white focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 shadow-2xs"
                />
                {dbManager.isConnectionVerified() && (
                  <button
                    type="button"
                    onClick={handleDisconnectGateway}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 font-bold rounded-xl flex items-center gap-1 text-xs shrink-0 cursor-pointer transition-all"
                    title="Putuskan Koneksi"
                  >
                    <Unlink className="w-3.5 h-3.5 text-rose-600" />
                    <span className="hidden sm:inline">Putuskan</span>
                  </button>
                )}
              </div>

              {/* Primary Action Button */}
              {(!dbManager.isConnectionVerified() || otpStep !== 'VERIFIED') && (
                <button
                  type="button"
                  onClick={handleConnectAndIdentify}
                  disabled={isVerifying || !appsScriptUrl.trim()}
                  className="w-full mt-1.5 py-2.5 px-4 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all text-xs disabled:opacity-50 shadow-2xs"
                >
                  {isVerifying && (otpStep === 'VERIFYING_URL' || otpStep === 'IDLE') ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memeriksa Endpoint & Mengirim OTP...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-300" />
                      <span>Hubungkan & Minta Kode OTP Verifikasi</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* OTP Input Card (Active when OTP_SENT or VERIFYING_OTP) */}
            {(otpStep === 'OTP_SENT' || otpStep === 'VERIFYING_OTP') && (
              <div className="p-4 bg-emerald-50/80 border-2 border-emerald-300/80 rounded-2xl space-y-3 animate-in fade-in zoom-in-95 duration-150 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-stone-900 text-xs">
                        Langkah 2: Masukkan Kode Verifikasi OTP (6 Digit)
                      </h4>
                      <p className="text-[11px] text-stone-600 font-medium">
                        Dikirim ke email Google Owner: <strong className="text-emerald-900 underline">{maskedEmail}</strong>
                      </p>
                    </div>
                  </div>
                  {otpExpiryTimer > 0 && (
                    <span className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-950 text-[10px] font-bold border border-emerald-300 font-mono">
                      ⏱️ {Math.floor(otpExpiryTimer / 60)}:{String(otpExpiryTimer % 60).padStart(2, '0')}
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-700" />
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      value={otpInput}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtpInput(val);
                        if (val.length === 6) {
                          handleVerifyOtp(val);
                        }
                      }}
                      placeholder="• • • • • •"
                      className="w-full pl-10 pr-4 py-3 bg-white border-2 border-emerald-300 rounded-xl text-center text-lg font-mono font-extrabold tracking-[0.4em] text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 shadow-inner"
                      autoFocus
                    />
                  </div>

                  {otpError && (
                    <p className="text-rose-700 font-bold text-[11px] bg-rose-50 p-2 rounded-lg border border-rose-200">
                      ⚠️ {otpError}
                    </p>
                  )}

                  {otpMessage && !otpError && (
                    <p className="text-emerald-900 font-semibold text-[11px] bg-emerald-100/70 p-2 rounded-lg border border-emerald-200">
                      ℹ️ {otpMessage}
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={isVerifying || otpInput.length !== 6}
                      className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
                    >
                      {isVerifying ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Memverifikasi...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Verifikasi Kode OTP</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isVerifying}
                      className="px-3.5 py-2.5 bg-white hover:bg-stone-100 text-stone-800 font-bold rounded-xl text-xs border border-stone-300 cursor-pointer disabled:opacity-50 transition-all shrink-0"
                    >
                      {resendCooldown > 0 ? `Kirim Ulang (${resendCooldown}s)` : 'Kirim Ulang'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Verified Banner */}
            {(dbManager.isConnectionVerified() || otpStep === 'VERIFIED') && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span>Google Gateway Terverifikasi</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200/80 text-emerald-950 border border-emerald-400">
                    🟢 Active & Verified
                  </span>
                </div>
                <p className="text-[11px] text-emerald-900 font-medium leading-relaxed">
                  Google Apps Script dikonfirmasi milik akun Google owner <strong>{maskedEmail}</strong>. Data terhubung aman dengan Google Sheets & Drive pribadi.
                </p>
              </div>
            )}

            {/* Verification Breakdown Matrix */}
            <div className="p-3 bg-white rounded-xl border border-stone-200 space-y-2 text-[11px]">
              <span className="font-bold text-stone-900 block">Status Verifikasi Layanan:</span>
              
              <div className="space-y-1.5">
                <div className="flex items-center justify-between p-1.5 rounded bg-stone-50 border border-stone-200">
                  <span className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <Code2 className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Google Apps Script Endpoint</span>
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

                <div className="flex items-center justify-between p-1.5 rounded bg-stone-50 border border-stone-200">
                  <span className="flex items-center gap-1.5 text-stone-700 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Verifikasi Kepemilikan Email</span>
                  </span>
                  <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    dbManager.isConnectionVerified()
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {dbManager.isConnectionVerified() ? `✓ ${maskedEmail}` : '⚠️ Belum Verifikasi'}
                  </span>
                </div>
              </div>

              {otpError && otpStep === 'ERROR' && (
                <p className="text-rose-600 text-[10px] pt-1 font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                  ⚠️ {otpError}
                </p>
              )}
            </div>

            {/* Primary 2-Way Unified Sync Action */}
            <div className="p-4 bg-emerald-900 text-white rounded-2xl space-y-3 shadow-md mt-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-extrabold text-sm text-white flex items-center gap-1.5">
                    <RefreshCw className={`w-4 h-4 text-emerald-300 ${isSyncingTwoWay ? 'animate-spin' : ''}`} />
                    <span>Sinkronisasi 2 Arah (Unified Sync)</span>
                  </span>
                  <span className="text-[11px] text-emerald-200 font-medium block mt-0.5">
                    Kirim data lokal terbaru sekaligus tarik data terbaru dari Google Sheets secara otomatis.
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleTwoWaySync}
                disabled={isSyncingTwoWay || !appsScriptUrl.trim() || !dbManager.isConnectionVerified()}
                className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-stone-700 text-stone-950 font-extrabold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
              >
                {isSyncingTwoWay ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-stone-950" />
                    <span>Sedang Menyinkronkan Data...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-stone-950" />
                    <span>Mulai Sinkronkan Sekarang</span>
                  </>
                )}
              </button>

              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setShowManualAdvancedSync(!showManualAdvancedSync)}
                  className="text-[10px] text-emerald-300 hover:text-white underline font-medium cursor-pointer"
                >
                  {showManualAdvancedSync ? 'Sembunyikan Opsi Manual' : 'Opsi Lanjutan (Manual Pull / Manual Push)'}
                </button>
              </div>

              {/* Manual Push / Pull Advanced Options */}
              {showManualAdvancedSync && (
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-800 animate-fade-in">
                  <button
                    type="button"
                    onClick={handlePullFromSheets}
                    disabled={isPulling || isPushing || !appsScriptUrl || !dbManager.isConnectionVerified()}
                    className="p-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 rounded-xl font-bold text-[11px] text-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{isPulling ? 'Menarik...' : 'Tarik dari Sheets'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePushToSheets}
                    disabled={isPushing || isPulling || !appsScriptUrl || !dbManager.isConnectionVerified()}
                    className="p-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 rounded-xl font-bold text-[11px] text-emerald-100 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{isPushing ? 'Mengirim...' : 'Kirim ke Sheets'}</span>
                  </button>
                </div>
              )}
            </div>

            {pullMessage && (
              <p className={`text-[11px] font-bold mt-2 p-2.5 rounded-xl border ${
                pullMessage.includes('Berhasil') || pullMessage.includes('✓')
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                  : 'bg-rose-50 text-rose-900 border-rose-200'
              }`}>
                {pullMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>

          {/* SECTION 2: Security & PIN Access */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('security')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">Keamanan PIN Aplikasi</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      appPin ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {appPin ? '✓ PIN Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
                    Pengunci layar antarmuka 4-digit saat perangkat digunakan bersama
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${expandedSections.security ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.security && (
              <div className="p-3.5 sm:p-5 border-t border-stone-200 space-y-4 animate-fade-in">
                <div className="space-y-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-stone-900 text-sm block flex items-center gap-1.5">
                        <Lock className="w-4 h-4 text-emerald-800" />
                        <span>Pengunci PIN Antarmuka Aplikasi</span>
                      </span>
                      <span className="text-[11px] text-stone-600 font-medium block mt-1 leading-relaxed">
                        PIN ini mengunci layar visual UI saat dibuka kembali (bukan enkripsi database). Mencegah akses tak berizin saat perangkat digunakan bersama.
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      appPin ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-stone-100 text-stone-600 border border-stone-200'
                    }`}>
                      {appPin ? '✓ PIN Aktif' : 'Nonaktif'}
                    </span>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex gap-2">
                      <input
                        type="password"
                        maxLength={4}
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                        placeholder={appPin ? 'Masukkan PIN Baru (4 digit)' : 'Set 4-digit PIN Baru'}
                        className="flex-1 px-3.5 py-2 bg-white border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-400 font-medium text-xs focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 tracking-widest text-center"
                      />
                      <button
                        type="button"
                        onClick={handleSavePin}
                        className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl cursor-pointer text-xs shrink-0 active:scale-95 transition-all shadow-2xs"
                      >
                        {appPin ? 'Ubah PIN' : 'Aktifkan PIN'}
                      </button>
                      {appPin && (
                        <button
                          type="button"
                          onClick={handleRemovePin}
                          className="px-3 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 font-bold rounded-xl cursor-pointer text-xs shrink-0 active:scale-95 transition-all"
                        >
                          Matikan
                        </button>
                      )}
                    </div>

                    {pinMsg && (
                      <p className={`text-[11px] font-bold ${pinMsg.includes('✓') ? 'text-emerald-800' : 'text-rose-600'}`}>
                        {pinMsg}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: Asset Categories */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('categories')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">Manajemen Kategori Aset</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                      {categories.length} Kategori
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
                    Tambah, edit label, pilih ikon, dan sesuaikan klasifikasi aset
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${expandedSections.categories ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.categories && (
              <div className="p-3.5 sm:p-5 border-t border-stone-200 space-y-4 animate-fade-in">
              <div className="space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="font-extrabold text-stone-900 text-sm block flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-emerald-800" />
                      <span>Kategori Aset</span>
                    </span>
                    <span className="text-[11px] text-stone-600 font-medium block mt-0.5">
                      Tambah, edit, atau atur kategori sesuai kebutuhan Anda.
                    </span>
                  </div>
                  
                  {!isAddingCategory && !editingCategoryId && (
                    <button
                      type="button"
                      onClick={handleStartAddCategory}
                      className="px-3 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all shrink-0 cursor-pointer self-start sm:self-center"
                    >
                      <Plus className="w-3.5 h-3.5 text-emerald-300" />
                      <span>+ Tambah Kategori</span>
                    </button>
                  )}
                </div>

                {/* Form Tambah/Edit Kategori */}
                {(isAddingCategory || editingCategoryId) && (
                  <div className="p-3.5 bg-white rounded-xl border-2 border-emerald-500 space-y-3 shadow-md animate-fade-in">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                      <span className="font-extrabold text-stone-900 text-xs flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-700" />
                        <span>{editingCategoryId ? 'Edit Kategori Aset' : 'Tambah Kategori Baru'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingCategory(false);
                          setEditingCategoryId(null);
                        }}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-700 block">Nama Kategori *</label>
                      <input
                        type="text"
                        value={categoryLabelInput}
                        onChange={(e) => setCategoryLabelInput(e.target.value)}
                        placeholder="contoh: Elektronik Kantor, Kendaraan, Kamera, Perhiasan..."
                        className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-stone-700 block">Pilih Ikon Kategori</label>
                        <input
                          type="text"
                          value={categorySearchQuery}
                          onChange={(e) => setCategorySearchQuery(e.target.value)}
                          placeholder="Cari ikon..."
                          className="px-2.5 py-1 text-[10px] bg-stone-50 border border-stone-200 rounded-lg w-32 text-stone-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      {/* Icon Picker Grid */}
                      <div className="grid grid-cols-6 sm:grid-cols-9 gap-1.5 max-h-40 overflow-y-auto p-2 bg-stone-50 rounded-xl border border-stone-200">
                        {CATEGORY_ICON_LIST.filter(item => 
                          !categorySearchQuery || 
                          item.label.toLowerCase().includes(categorySearchQuery.toLowerCase()) || 
                          item.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
                        ).map((item) => {
                          const IconComp = item.icon;
                          const isSelected = categoryIconInput === item.name;
                          return (
                            <button
                              key={item.name}
                              type="button"
                              onClick={() => setCategoryIconInput(item.name)}
                              title={item.label}
                              className={`p-2 rounded-xl flex flex-col items-center justify-center transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-emerald-800 text-white border-emerald-800 shadow-2xs scale-105 ring-2 ring-emerald-600/30'
                                  : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-100 hover:border-stone-300'
                              }`}
                            >
                              <IconComp className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {categoryError && (
                      <p className="text-[11px] font-bold text-rose-600">{categoryError}</p>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        {editingCategoryId && (
                          <button
                            type="button"
                            onClick={() => handleStartDeleteCategory(editingCategoryId)}
                            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold text-xs rounded-xl flex items-center gap-1 border border-rose-200 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Hapus Kategori</span>
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(false);
                            setEditingCategoryId(null);
                          }}
                          className="px-3.5 py-1.5 text-stone-600 font-bold text-xs hover:bg-stone-100 rounded-lg cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCategory}
                          className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
                        >
                          {editingCategoryId ? 'Simpan Perubahan' : 'Tambah Kategori'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Category Items List - Clean 2-column cards with full labels, Edit & Delete actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {categories.map((cat) => {
                    const IconComponent = getCategoryIcon(cat.iconName);
                    const isDefault = ['device', 'devices', 'vehicle', 'vehicles', 'home', 'camera', 'gaming', 'other', 'perangkat', 'kendaraan', 'rumah', 'kamera', 'lainnya'].includes(cat.id.toLowerCase());

                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleStartEditCategory(cat)}
                        className="flex items-center justify-between p-3 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-600/50 hover:shadow-xs transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-extrabold text-stone-800 text-xs sm:text-sm block truncate">
                              {cat.label}
                            </span>
                            {isDefault && (
                              <span className="text-[10px] text-stone-400 font-medium block">
                                Kategori bawaan
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions: Edit & Delete with comfortable touch targets & subtle hover states */}
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCategory(cat);
                            }}
                            className="p-2 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-xl transition-colors cursor-pointer"
                            title={`Edit kategori ${cat.label}`}
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartDeleteCategory(cat.id);
                            }}
                            className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                            title={`Hapus kategori ${cat.label}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setIsConfirmingResetCategories(true)}
                    className="text-[11px] font-bold text-stone-500 hover:text-emerald-800 underline cursor-pointer transition-colors"
                  >
                    ↺ Kembalikan Kategori Bawaan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 4: Backup & Restore (JSON) */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('backup')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-100 text-purple-800 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">Backup &amp; Restore Data (JSON)</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                      JSON Engine
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
                    Ekspor salinan cadangan lengkap atau impor berkas JSON ke database
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${expandedSections.backup ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.backup && (
              <div className="p-3.5 sm:p-5 border-t border-stone-200 space-y-4 animate-fade-in">
              <div className="space-y-4 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <span className="font-extrabold text-stone-900 text-sm block flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-800" />
                    <span>Ekspor &amp; Impor Data (JSON Backup)</span>
                  </span>
                  <span className="text-[11px] text-stone-600 font-medium block mt-0.5">
                    Unduh salinan cadangan lengkap seluruh aset, dokumen, garansi, dan log servis Anda.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleExportJSON}
                    className="flex-1 px-4 py-3 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95 text-xs"
                  >
                    <Download className="w-4 h-4 text-emerald-300" />
                    <span>Unduh File JSON Backup</span>
                  </button>

                  <label className="flex-1 px-4 py-3 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-extrabold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-all shadow-2xs text-xs">
                    <Upload className="w-4 h-4 text-emerald-700" />
                    <span>Pilih File JSON untuk Impor</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleSelectJSONFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Import JSON Preview Box */}
                {importPreviewData && (
                  <div className="p-4 bg-emerald-50/80 border-2 border-emerald-500 rounded-2xl space-y-3 shadow-sm animate-fade-in">
                    <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
                      <span className="font-extrabold text-emerald-950 text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-emerald-700" />
                        <span>Pratinjau Data JSON: {importPreviewData.filename}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setImportPreviewData(null)}
                        className="p-1 text-stone-400 hover:text-stone-600 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[11px] text-stone-700 font-medium">
                      Berikut ringkasan data yang ditemukan dalam file backup:
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-black text-emerald-800 text-base">{importPreviewData.assetsCount}</span>
                        <span className="text-[10px] font-bold text-stone-600">Aset Utuh</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-black text-emerald-800 text-base">{importPreviewData.remindersCount}</span>
                        <span className="text-[10px] font-bold text-stone-600">Pengingat</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-black text-emerald-800 text-base">{importPreviewData.categoriesCount}</span>
                        <span className="text-[10px] font-bold text-stone-600">Kategori</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-black text-emerald-800 text-base">{importPreviewData.servicesCount}</span>
                        <span className="text-[10px] font-bold text-stone-600">Riwayat Servis</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setImportPreviewData(null)}
                        className="px-3.5 py-1.5 text-stone-600 font-bold text-xs hover:bg-stone-200/50 rounded-lg cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImportJSON}
                        className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Konfirmasi &amp; Impor Data</span>
                      </button>
                    </div>
                  </div>
                )}

                {importStatus && !importPreviewData && (
                  <p className={`text-xs font-bold p-2.5 rounded-xl border ${
                    importStatus.includes('Berhasil') 
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                      : 'bg-rose-50 text-rose-900 border-rose-200'
                  }`}>
                    {importStatus}
                  </p>
                )}
              </div>
            </div>
            )}
          </div>

          {/* SECTION 5: Diagnostics / Contract Verification */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('diagnostics')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-100 text-teal-800 shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">Uji Kontrak &amp; Diagnostik Sistem</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-900 border border-teal-200">
                      Audit &amp; Test Suite
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
                    Uji kepatuhan runtime IndexedDB lokal dan inspeksi detail antrean mutasi
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${expandedSections.diagnostics ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.diagnostics && (
              <div className="p-3.5 sm:p-5 border-t border-stone-200 space-y-4 animate-fade-in text-xs">
                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-extrabold text-stone-900 text-sm block flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-800" />
                        <span>Uji Kontrak Database Lokal (Phase 2C Contract Tests)</span>
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block mt-0.5">
                        Uji kepatuhan runtime database lokal (IndexedDB), generasi riwayat audit otomatis, dan antrean sinkronisasi tanpa melibatkan jaringan luar.
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleRunContractTests}
                      disabled={isRunningTests}
                      className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 active:scale-95 text-xs shadow-xs"
                    >
                      {isRunningTests ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Menjalankan Uji Kontrak...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4 text-emerald-300" />
                          <span>Mulai Jalankan Tes Kontrak (Uji 2C)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {isRunningTests && (
                  <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col items-center justify-center space-y-3 animate-pulse">
                    <RefreshCw className="w-8 h-8 text-emerald-800 animate-spin" />
                    <p className="text-xs font-bold text-stone-700">Mengeksekusi asertasi &amp; penulisan IndexedDB...</p>
                  </div>
                )}

                {testResults && (
                  <div className="space-y-4 animate-fade-in">
                    <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                      testResults.every(r => r.success)
                        ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                        : 'bg-rose-50 text-rose-900 border-rose-200'
                    }`}>
                      <div>
                        <span className="font-extrabold text-xs block">
                          STATUS PENGUJIAN: {testResults.every(r => r.success) ? 'LULUS (PASS)' : 'GAGAL (FAIL)'}
                        </span>
                        <span className="text-[11px] font-medium block mt-0.5">
                          Dijalankan pada pukul: {testsRunTimestamp} • {testResults.filter(r => r.success).length} dari {testResults.length} modul pengujian berhasil.
                        </span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase ${
                        testResults.every(r => r.success)
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        {testResults.every(r => r.success) ? 'Ready' : 'Issues Found'}
                      </span>
                    </div>

                    {/* Test Suites Accordion */}
                    <div className="space-y-2">
                      {testResults.map((suite) => (
                        <div key={suite.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                          <button
                            type="button"
                            onClick={() => setExpandedSuiteId(expandedSuiteId === suite.id ? null : suite.id)}
                            className="w-full p-3.5 flex items-center justify-between hover:bg-stone-50 transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${suite.success ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                              <span className="font-extrabold text-stone-800 truncate text-[11px] sm:text-xs">
                                {suite.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-stone-400 font-bold">{suite.duration}ms</span>
                              <ChevronDown className={`w-4 h-4 text-stone-400 transition-transform ${expandedSuiteId === suite.id ? 'rotate-180' : ''}`} />
                            </div>
                          </button>

                          {expandedSuiteId === suite.id && (
                            <div className="border-t border-stone-100 bg-stone-900 p-3 font-mono text-[10px] leading-relaxed text-stone-300 max-h-56 overflow-y-auto no-scrollbar space-y-1">
                              {suite.logs.map((logLine, index) => (
                                <div key={index} className={logLine.startsWith('❌') ? 'text-rose-400 font-bold' : logLine.startsWith('✓') ? 'text-emerald-400 font-bold' : ''}>
                                  {logLine}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 6: Notifications (Phase 6-3E) */}
          <div className="rounded-2xl border border-stone-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('notifications')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-stone-50 hover:bg-stone-100/80 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-800 shrink-0">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-stone-900 text-xs sm:text-sm">Preferensi &amp; Saluran Notifikasi</h4>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      notiPrefs.globalEnabled ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-stone-200 text-stone-700'
                    }`}>
                      {notiPrefs.globalEnabled ? '✓ Aktif' : 'Muted'}
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5">
                    In-app feeds, browser push alerts, dan email notifikasi via Google Gateway
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-stone-500 shrink-0 transition-transform duration-200 ${expandedSections.notifications ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.notifications && (
              <div className="p-3.5 sm:p-5 border-t border-stone-200 space-y-4 animate-fade-in text-xs font-medium text-stone-700">
              
              {/* Card 1: Master Switch */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 pr-4">
                    <span className="font-extrabold text-stone-900 text-sm block flex items-center gap-2">
                      <Bell className="w-4 h-4 text-emerald-700" />
                      <span>Aktifkan Pusat Notifikasi MicroMate</span>
                    </span>
                    <span className="text-[11px] text-stone-600 block leading-relaxed max-w-xl">
                      Mute seluruh visual badge angka dan feed notifikasi secara instan. Menonaktifkan master switch ini tidak akan merusak riwayat logs atau memutus audit log di database lokal.
                    </span>
                  </div>
                  
                  {/* Premium Switch */}
                  <button
                    type="button"
                    onClick={handleToggleGlobal}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      notiPrefs.globalEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        notiPrefs.globalEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Card 2: Browser Push Notifications Integration */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-stone-900 text-sm block">
                      Notifikasi Browser (Push Alerts)
                    </span>
                    <span className="text-[11px] text-stone-600 block leading-relaxed max-w-xl">
                      Kirim alert instan langsung di pojok layar Anda meskipun aplikasi berjalan di latar belakang (memerlukan izin browser eksplisit).
                    </span>
                  </div>

                  <div className="flex items-center shrink-0">
                    {notiPrefs.browserPermissionState === 'granted' && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>Diizinkan (Aktif)</span>
                      </span>
                    )}
                    {notiPrefs.browserPermissionState === 'denied' && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Diblokir Browser
                      </span>
                    )}
                    {notiPrefs.browserPermissionState === 'unsupported' && (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-stone-200 text-stone-600 border border-stone-300">
                        Tidak Didukung (Iframe Sandbox)
                      </span>
                    )}
                    {notiPrefs.browserPermissionState === 'default' && (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        className="px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer"
                      >
                        Minta Izin Browser
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Preference Matrix */}
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3">
                <div className="border-b border-stone-200 pb-2">
                  <span className="font-extrabold text-stone-900 text-sm block">
                    Saluran Notifikasi Berdasarkan Kategori
                  </span>
                  <span className="text-[11px] text-stone-600 block mt-0.5">
                    Pilih bagaimana Anda ingin menerima alert untuk setiap jenis aktivitas sistem. Notifikasi email dikirim otomatis melalui backend gateway Google Sheets (Phase 6-1C).
                  </span>
                </div>

                {/* Desktop layout: multi-column matrix table (hidden md:block) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[500px]">
                    <thead>
                      <tr className="border-b border-stone-200">
                        <th className="pb-2 font-bold text-stone-800 text-[11px] uppercase tracking-wider w-1/2">
                          Kategori Aktivitas
                        </th>
                        <th className="pb-2 font-bold text-stone-800 text-[11px] uppercase tracking-wider text-center px-2">
                          In-App (Feeds)
                        </th>
                        <th className="pb-2 font-bold text-stone-800 text-[11px] uppercase tracking-wider text-center px-2">
                          Browser Push
                        </th>
                        <th className="pb-2 font-bold text-stone-800 text-[11px] uppercase tracking-wider text-center px-2">
                          Email (Gateway)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {[
                        {
                          key: 'DOCUMENT_EXPIRING_SOON',
                          label: 'Dokumen Hampir Kadaluarsa',
                          desc: 'Pemberitahuan STNK, SIM, atau polis asuransi yang akan habis masa berlakunya dalam waktu dekat.'
                        },
                        {
                          key: 'DOCUMENT_EXPIRED',
                          label: 'Dokumen Telah Kadaluarsa',
                          desc: 'Alert instan saat dokumen penting sudah melewati masa tenggang dan butuh pembaruan darurat.'
                        },
                        {
                          key: 'MAINTENANCE_OVERDUE',
                          label: 'Perawatan Melewati Batas',
                          desc: 'Sinyal bahwa jadwal servis berkala kendaraan Anda sudah terlewati (melebihi batas aman).'
                        },
                        {
                          key: 'COST_TREND_INCREASE',
                          label: 'Kenaikan Tren Biaya TCO',
                          desc: 'Analitik visual mendeteksi anomali pengeluaran bulanan atau lonjakan tren finansial aset.'
                        }
                      ].map((cat) => {
                        const channelPrefs = notiPrefs.categories[cat.key as keyof typeof notiPrefs.categories];
                        return (
                          <tr key={cat.key} className="hover:bg-stone-100/50 transition-colors">
                            <td className="py-3 pr-4">
                              <span className="font-extrabold text-stone-900 text-xs block">
                                {cat.label}
                              </span>
                              <span className="text-[10px] text-stone-500 font-medium block leading-normal mt-0.5 max-w-sm">
                                {cat.desc}
                              </span>
                            </td>
                            <td className="py-3 text-center px-2">
                              <input
                                type="checkbox"
                                disabled={!notiPrefs.globalEnabled}
                                checked={channelPrefs?.inApp || false}
                                onChange={() => handleToggleChannel(cat.key as any, 'inApp')}
                                className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 text-center px-2">
                              <input
                                type="checkbox"
                                disabled={!notiPrefs.globalEnabled || notiPrefs.browserPermissionState !== 'granted'}
                                checked={(channelPrefs?.browserPush && notiPrefs.browserPermissionState === 'granted') || false}
                                onChange={() => handleToggleChannel(cat.key as any, 'browserPush')}
                                className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                            <td className="py-3 text-center px-2">
                              <input
                                type="checkbox"
                                disabled={!notiPrefs.globalEnabled}
                                checked={channelPrefs?.email || false}
                                onChange={() => handleToggleChannel(cat.key as any, 'email')}
                                className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile layout: stacked vertical card groups (block md:hidden) */}
                <div className="block md:hidden space-y-3">
                  {[
                    {
                      key: 'DOCUMENT_EXPIRING_SOON',
                      label: 'Dokumen Hampir Kadaluarsa',
                      desc: 'Pemberitahuan STNK, SIM, atau polis asuransi yang akan habis masa berlakunya dalam waktu dekat.'
                    },
                    {
                      key: 'DOCUMENT_EXPIRED',
                      label: 'Dokumen Telah Kadaluarsa',
                      desc: 'Alert instan saat dokumen penting sudah melewati masa tenggang dan butuh pembaruan darurat.'
                    },
                    {
                      key: 'MAINTENANCE_OVERDUE',
                      label: 'Perawatan Melewati Batas',
                      desc: 'Sinyal bahwa jadwal servis berkala kendaraan Anda sudah terlewati (melebihi batas aman).'
                    },
                    {
                      key: 'COST_TREND_INCREASE',
                      label: 'Kenaikan Tren Biaya TCO',
                      desc: 'Analitik visual mendeteksi anomali pengeluaran bulanan atau lonjakan tren finansial aset.'
                    }
                  ].map((cat) => {
                    const channelPrefs = notiPrefs.categories[cat.key as keyof typeof notiPrefs.categories];
                    return (
                      <div 
                        key={`mobile-pref-${cat.key}`}
                        className="p-3 bg-white rounded-xl border border-stone-200 space-y-3"
                      >
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-stone-950 text-xs block leading-tight">
                            {cat.label}
                          </span>
                          <span className="text-[10px] text-stone-500 font-medium block leading-normal">
                            {cat.desc}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-100">
                          {/* Channel 1: In-App */}
                          <label className="flex flex-col items-center justify-between p-2 rounded-lg bg-stone-50/60 border border-stone-150 min-h-[50px] cursor-pointer">
                            <span className="text-[9px] font-bold text-stone-500 uppercase">In-App</span>
                            <input
                              type="checkbox"
                              disabled={!notiPrefs.globalEnabled}
                              checked={channelPrefs?.inApp || false}
                              onChange={() => handleToggleChannel(cat.key as any, 'inApp')}
                              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-1.5"
                            />
                          </label>

                          {/* Channel 2: Browser Push */}
                          <label className="flex flex-col items-center justify-between p-2 rounded-lg bg-stone-50/60 border border-stone-150 min-h-[50px] cursor-pointer">
                            <span className="text-[9px] font-bold text-stone-500 uppercase">Push</span>
                            <input
                              type="checkbox"
                              disabled={!notiPrefs.globalEnabled || notiPrefs.browserPermissionState !== 'granted'}
                              checked={(channelPrefs?.browserPush && notiPrefs.browserPermissionState === 'granted') || false}
                              onChange={() => handleToggleChannel(cat.key as any, 'browserPush')}
                              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-1.5"
                            />
                          </label>

                          {/* Channel 3: Email */}
                          <label className="flex flex-col items-center justify-between p-2 rounded-lg bg-stone-50/60 border border-stone-150 min-h-[50px] cursor-pointer">
                            <span className="text-[9px] font-bold text-stone-500 uppercase">Email</span>
                            <input
                              type="checkbox"
                              disabled={!notiPrefs.globalEnabled}
                              checked={channelPrefs?.email || false}
                              onChange={() => handleToggleChannel(cat.key as any, 'email')}
                              className="w-4 h-4 rounded border-stone-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-1.5"
                            />
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 7: Danger Zone */}
          <div className="rounded-2xl border border-rose-200 bg-white shadow-2xs overflow-hidden transition-all">
            <button
              type="button"
              onClick={() => toggleSection('danger')}
              className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between bg-rose-50/60 hover:bg-rose-100/70 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-800 shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-rose-950 text-xs sm:text-sm">Zona Bahaya (Reset &amp; Pemutusan)</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                      Tindakan Kritis
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-rose-700 font-medium mt-0.5">
                    Reset data lokal ke wizard setup awal atau putuskan sambungan Google Apps Script
                  </p>
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-rose-600 shrink-0 transition-transform duration-200 ${expandedSections.danger ? 'rotate-180' : ''}`} />
            </button>
            {expandedSections.danger && (
              <div className="p-3.5 sm:p-5 border-t border-rose-200 space-y-4 animate-fade-in">
              <div className="p-4 bg-rose-50/60 rounded-2xl border-2 border-rose-200 space-y-4">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm border-b border-rose-200 pb-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Zona Berbahaya (Reset &amp; Pemutusan)</span>
                </div>

                {/* Primary Reset & Return to Initial Setup */}
                <div className="flex flex-col space-y-2 p-3.5 bg-white rounded-xl border border-rose-200 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-rose-900 block text-xs flex items-center gap-1.5">
                        <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                        <span>Reset Data &amp; Buka Setup Awal</span>
                      </span>
                      <span className="text-[11px] text-stone-600 font-medium block">
                        Menghapus seluruh aset lokal &amp; cache penyimpanan, lalu langsung mengarahkan Anda ke layar wizard setup awal (pilihan Google Sheets atau Mode Lokal).
                      </span>
                    </div>

                    {confirmAction !== 'clear_cache' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction('clear_cache')}
                        className="px-3.5 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset &amp; Buka Setup Awal</span>
                      </button>
                    )}
                  </div>

                  {confirmAction === 'clear_cache' && (
                    <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl space-y-2 animate-fade-in mt-2">
                      <p className="text-xs font-bold text-rose-950">
                        ⚠️ Konfirmasi: Hapus seluruh data lokal &amp; kembali ke wizard setup awal sekarang?
                      </p>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmAction('none');
                            if (onClearCacheAndReset) {
                              onClearCacheAndReset();
                            }
                          }}
                          className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs active:scale-95"
                        >
                          Ya, Reset &amp; Buka Setup Awal
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction('none')}
                          className="px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-800 rounded-lg font-bold text-xs border border-stone-300 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Disconnect Google Gateway */}
                {dbManager.isConnectionVerified() && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white rounded-xl border border-stone-200">
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-stone-900 text-xs block flex items-center gap-1.5">
                        <Unlink className="w-3.5 h-3.5 text-stone-600" />
                        <span>Putuskan Apps Script Gateway</span>
                      </span>
                      <span className="text-[11px] text-stone-500 font-medium block">
                        Hapus kredensial endpoint Google Sheets dari browser ini. Data lokal tidak akan terhapus.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnectGateway}
                      className="px-3.5 py-2 bg-stone-50 hover:bg-rose-50 text-rose-800 border border-rose-200 font-bold rounded-xl flex items-center justify-center gap-1 text-xs shrink-0 cursor-pointer transition-all active:scale-95"
                    >
                      <Unlink className="w-3.5 h-3.5 text-rose-600" />
                      <span>Putuskan Koneksi</span>
                    </button>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>

      </div>
    </div>

      {/* Code Helper Modal */}
      {showCodeGuide && (
        <div className="fixed inset-0 z-60 bg-stone-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 text-white w-full max-w-2xl rounded-3xl p-6 space-y-4 border border-stone-800 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <span>Google Apps Script Backend Code &amp; Guide</span>
              </h3>
              <button 
                onClick={() => setShowCodeGuide(false)}
                className="text-stone-400 hover:text-white font-bold text-sm px-2 py-1 rounded cursor-pointer"
              >
                ✕ Tutup
              </button>
            </div>
            <p className="text-xs text-stone-300">
              Buat Google Sheet baru di <a href="https://sheet.new" target="_blank" rel="noreferrer" className="text-emerald-400 underline font-semibold">sheet.new</a>, buka menu <i>Extensions &gt; Apps Script</i>, lalu tempel kode di bawah ini. Setelah itu, jalankan fungsi <code>testAuthAndEmail</code> sekali di editor untuk otorisasi, lalu klik Deploy &gt; New Deployment &gt; Web App (Execute as: Me, Access: Anyone).
            </p>
            <div className="relative">
              <pre className="p-4 bg-stone-950 rounded-xl text-stone-300 font-mono text-[11px] max-h-64 overflow-y-auto border border-stone-800">
                {APPS_SCRIPT_CODE}
              </pre>
              <button
                type="button"
                onClick={copyAppsScriptCode}
                className="absolute top-3 right-3 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-md cursor-pointer"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <FileCode className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Tersalin!' : 'Salin Kode'}</span>
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowCodeGuide(false)}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Mengerti, Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* In-App Category Delete Confirmation Modal */}
      {deletingCategoryInfo && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-stone-200 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">Hapus Kategori?</h3>
                <p className="text-xs text-stone-500 font-medium">Kategori: {deletingCategoryInfo.label}</p>
              </div>
            </div>

            {deletingCategoryInfo.inUseCount > 0 ? (
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-1.5">
                <p className="text-xs font-extrabold text-amber-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Sedang digunakan oleh {deletingCategoryInfo.inUseCount} aset</span>
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  Aset tersebut tidak akan dihapus. Jika Anda melanjutkan, {deletingCategoryInfo.inUseCount} aset ini akan dipindahkan ke kategori <strong className="font-extrabold text-amber-950">"Lainnya"</strong>.
                </p>
              </div>
            ) : (
              <p className="text-xs text-stone-600 leading-relaxed font-medium">
                Apakah Anda yakin ingin menghapus kategori <strong className="font-extrabold text-stone-900">"{deletingCategoryInfo.label}"</strong>?
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingCategoryInfo(null)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Ya, Hapus Kategori
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-App Reset Default Categories Confirmation Modal */}
      {isConfirmingResetCategories && (
        <div className="fixed inset-0 z-70 bg-stone-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-stone-200 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-900 text-base">Reset Kategori Bawaan?</h3>
                <p className="text-xs text-stone-500 font-medium">Pengaturan awal pabrik</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed font-medium">
              Apakah Anda yakin ingin mengembalikan daftar kategori ke susunan bawaan (Device, Vehicle, Home, Camera, Gaming, Lainnya)?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmingResetCategories(false)}
                className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmResetCategories}
                className="px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-extrabold text-xs rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                Ya, Reset Bawaan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
