import React, { useState, useEffect } from 'react';
import { SyncStatus, ServiceHealth } from '../types';
import { dbManager } from '../lib/db';
import { APPS_SCRIPT_CODE } from '../lib/appsScriptCode';
import { 
  X, Settings, Download, Upload, RotateCcw, Database, Check, RefreshCw, 
  AlertTriangle, HardDrive, Code2, UploadCloud, Lock, KeyRound, ShieldCheck, 
  Tag, Plus, Edit3, Trash2, Sparkles, Mail, Unlink, FileCode, ShieldAlert,
  FileText, Cloud, ChevronDown, ExternalLink
} from 'lucide-react';
import { 
  useCategories, saveCategories, CATEGORY_ICON_LIST, getCategoryIcon, 
  DEFAULT_CATEGORIES, CategoryItem 
} from '../lib/categories';

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

  const [activeTab, setActiveTab] = useState<'sync' | 'security' | 'categories' | 'backup' | 'danger'>('sync');

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

  const handleDeleteCategory = (catId: string) => {
    if (catId === 'other' || catId === 'lainnya') {
      alert('Kategori "Lainnya" adalah kategori bawaan sistem dan tidak dapat dihapus.');
      return;
    }
    const cat = categories.find(c => c.id === catId);
    if (categories.length <= 1) {
      alert('Minimal harus ada 1 kategori aset.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${cat?.label || catId}"?`)) {
      const updatedList = categories.filter((c) => c.id !== catId);
      saveCategories(updatedList);
    }
  };

  const handleResetDefaultCategories = () => {
    if (window.confirm('Kembalikan daftar kategori ke pengaturan awal/bawaan?')) {
      saveCategories(DEFAULT_CATEGORIES);
    }
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
      const assets = await dbManager.getAllAssets();
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
    const jsonStr = await dbManager.exportJSON();
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
    const success = await dbManager.importJSON(importPreviewData.rawContent);
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
      <div className="bg-white rounded-3xl border border-stone-200 w-full max-w-3xl shadow-2xl flex flex-col h-[620px] max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-3 sm:p-4 md:p-5 border-b border-stone-200 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="p-1.5 sm:p-2 bg-emerald-50 text-emerald-800 rounded-xl">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-stone-900 text-sm sm:text-base md:text-lg leading-none">
                Control Center MicroMate
              </h3>
              <p className="text-[10px] sm:text-[11px] text-stone-500 font-medium mt-0.5 sm:mt-1">
                Pusat Kontrol Penyimpanan, Keamanan &amp; Kategori
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 sm:p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer transition-colors">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Mobile Navigation Dropdown & Quick Pill Selector (< sm) */}
        <div className="sm:hidden p-2 bg-stone-100 border-b border-stone-200 shrink-0 space-y-2">
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as any)}
              className="w-full pl-9 pr-8 py-2 bg-white border border-stone-300 rounded-xl font-extrabold text-xs text-stone-900 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600 shadow-2xs cursor-pointer"
            >
              <option value="sync">Storage &amp; Sync (Penyimpanan)</option>
              <option value="security">Keamanan PIN Aplikasi</option>
              <option value="categories">Kategori Aset</option>
              <option value="backup">Backup &amp; Restore (JSON)</option>
              <option value="danger">Zona Berbahaya (Reset Data)</option>
            </select>
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {activeTab === 'sync' && <Cloud className="w-4 h-4 text-emerald-700" />}
              {activeTab === 'security' && <Lock className="w-4 h-4 text-emerald-700" />}
              {activeTab === 'categories' && <Tag className="w-4 h-4 text-emerald-700" />}
              {activeTab === 'backup' && <Database className="w-4 h-4 text-emerald-700" />}
              {activeTab === 'danger' && <ShieldAlert className="w-4 h-4 text-rose-600" />}
            </div>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-500">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>

          {/* Quick Icon-Only Pill Bar on Mobile for 1-tap switching */}
          <div className="flex items-center justify-between gap-1">
            {[
              { id: 'sync', icon: Cloud, label: 'Sync' },
              { id: 'security', icon: Lock, label: 'PIN' },
              { id: 'categories', icon: Tag, label: 'Kategori' },
              { id: 'backup', icon: Database, label: 'Backup' },
              { id: 'danger', icon: ShieldAlert, label: 'Bahaya' },
            ].map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              const isDanger = item.id === 'danger';
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex-1 py-1.5 px-1 rounded-lg text-[10px] font-extrabold flex flex-col items-center justify-center gap-0.5 transition-colors border cursor-pointer ${
                    isActive
                      ? isDanger
                        ? 'bg-rose-50 text-rose-950 border-rose-300 ring-1 ring-rose-300/50 shadow-2xs'
                        : 'bg-white text-emerald-950 border-stone-200/90 ring-1 ring-black/5 shadow-2xs'
                      : isDanger
                        ? 'bg-transparent text-rose-700 border-transparent hover:bg-rose-100/50'
                        : 'bg-transparent text-stone-600 border-transparent hover:bg-stone-200/60'
                  }`}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${isDanger ? 'text-rose-600' : isActive ? 'text-emerald-700' : 'text-stone-500'}`} />
                  <span className="truncate max-w-[55px] text-center leading-none">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop & Mobile Landscape Navigation Tabs Bar (sm:flex) */}
        <div className="hidden sm:flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-stone-100 border-b border-stone-200 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap shrink-0 md:flex-1 transition-colors border cursor-pointer ${
              activeTab === 'sync'
                ? 'bg-white text-emerald-950 shadow-xs border-stone-200/90 ring-1 ring-black/5 font-extrabold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 border-transparent'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>Storage &amp; Sync</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap shrink-0 md:flex-1 transition-colors border cursor-pointer ${
              activeTab === 'security'
                ? 'bg-white text-emerald-950 shadow-xs border-stone-200/90 ring-1 ring-black/5 font-extrabold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 border-transparent'
            }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>Keamanan PIN</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('categories')}
            className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap shrink-0 md:flex-1 transition-colors border cursor-pointer ${
              activeTab === 'categories'
                ? 'bg-white text-emerald-950 shadow-xs border-stone-200/90 ring-1 ring-black/5 font-extrabold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 border-transparent'
            }`}
          >
            <Tag className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>Kategori Aset</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('backup')}
            className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap shrink-0 md:flex-1 transition-colors border cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white text-emerald-950 shadow-xs border-stone-200/90 ring-1 ring-black/5 font-extrabold'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60 border-transparent'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0 text-emerald-700" />
            <span>Backup &amp; Restore</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('danger')}
            className={`px-2.5 md:px-3 py-1.5 md:py-2 rounded-xl text-[11px] md:text-xs font-bold flex items-center justify-center gap-1 md:gap-1.5 whitespace-nowrap shrink-0 md:flex-1 transition-colors border cursor-pointer ${
              activeTab === 'danger'
                ? 'bg-rose-50 text-rose-950 shadow-xs border-rose-200 ring-1 ring-rose-300/50 font-extrabold'
                : 'text-rose-700 hover:text-rose-900 hover:bg-rose-100/60 border-transparent'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Zona Bahaya</span>
          </button>
        </div>

        <div className="p-3.5 sm:p-5 md:p-6 space-y-4 sm:space-y-6 text-xs flex-1 overflow-y-auto no-scrollbar">
          
          {/* TAB 1: Storage & Sync */}
          {activeTab === 'sync' && (
            <div className="space-y-5 animate-fade-in">
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

          {/* TAB 2: Security & PIN Access */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-fade-in">
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

          {/* TAB 3: Asset Categories */}
          {activeTab === 'categories' && (
            <div className="space-y-4 animate-fade-in">
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

                    <div className="flex items-center justify-end gap-2 pt-1">
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
                )}

                {/* Category Items List - Editable Cards without text truncation or button overlap */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                  {categories.map((cat) => {
                    const IconComponent = getCategoryIcon(cat.iconName);
                    return (
                      <div
                        key={cat.id}
                        onClick={() => handleStartEditCategory(cat)}
                        className="flex items-center justify-between p-2.5 bg-white rounded-2xl border border-stone-200 shadow-2xs hover:border-emerald-600 hover:shadow-xs transition-all group cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-1 overflow-hidden">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-50 text-emerald-800 shrink-0 group-hover:bg-emerald-100 transition-colors">
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span className="font-extrabold text-stone-800 text-xs truncate">
                            {cat.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 ml-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditCategory(cat);
                            }}
                            className="p-1 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg cursor-pointer transition-colors"
                            title="Edit Kategori"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(cat.id);
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetDefaultCategories}
                    className="text-[11px] font-bold text-stone-500 hover:text-emerald-800 underline cursor-pointer transition-colors"
                  >
                    ↺ Kembalikan Kategori Bawaan
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Backup & Restore (JSON) */}
          {activeTab === 'backup' && (
            <div className="space-y-4 animate-fade-in">
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
                        <span>Pratinjau Data JSON: {importPreviewData.fileName}</span>
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
                        <span className="block font-black text-emerald-800 text-base">{importPreviewData.warrantiesCount}</span>
                        <span className="text-[10px] font-bold text-stone-600">Garansi</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-emerald-200">
                        <span className="block font-black text-emerald-800 text-base">{importPreviewData.vehiclesCount}</span>
                        <span className="text-[10px] font-bold text-stone-600">Kendaraan</span>
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

              {/* Demo Data Section */}
              {hasDemoData && (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                        Buka Onboarding
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
            </div>
          )}

          {/* TAB 5: Danger Zone */}
          {activeTab === 'danger' && (
            <div className="space-y-4 animate-fade-in">
              <div className="p-4 bg-rose-50/60 rounded-2xl border-2 border-rose-200 space-y-4">
                <div className="flex items-center gap-2 text-rose-900 font-extrabold text-sm border-b border-rose-200 pb-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  <span>Zona Berbahaya (Tindakan Destruktif)</span>
                </div>

                {/* Disconnect Google Gateway */}
                {dbManager.isConnectionVerified() && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-rose-200">
                    <div>
                      <span className="font-bold text-stone-900 text-xs block">Putuskan Apps Script Gateway</span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Hapus kredensial endpoint dan verifikasi email Google Sheets.
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnectGateway}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300 font-bold rounded-xl flex items-center justify-center gap-1 text-xs shrink-0 cursor-pointer transition-all active:scale-95"
                    >
                      <Unlink className="w-3.5 h-3.5 text-rose-600" />
                      <span>Putuskan Koneksi</span>
                    </button>
                  </div>
                )}

                {/* Clear Cache & Reset State */}
                <div className="flex flex-col space-y-2 p-3 bg-white rounded-xl border border-rose-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-rose-700 block text-xs">Clear Cache &amp; Reset State Aplikasi</span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Hapus seluruh cache browser (`localStorage` &amp; `IndexedDB`) lalu muat ulang aplikasi.
                      </span>
                    </div>

                    {confirmAction !== 'clear_cache' && (
                      <button
                        type="button"
                        onClick={() => setConfirmAction('clear_cache')}
                        className="px-3 py-1.5 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all shadow-2xs shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Clear Cache &amp; Reset</span>
                      </button>
                    )}
                  </div>

                  {confirmAction === 'clear_cache' && (
                    <div className="p-3 bg-rose-100 border border-rose-300 rounded-xl space-y-2 animate-fade-in mt-2">
                      <p className="text-xs font-bold text-rose-950">
                        ⚠️ Konfirmasi: Hapus seluruh cache lokal &amp; muat ulang aplikasi sekarang?
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
                          className="px-3.5 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                        >
                          Ya, Hapus &amp; Reset
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

                {/* Reset Seed Data */}
                <div className="flex flex-col space-y-2 p-3 bg-white rounded-xl border border-rose-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-stone-800 block text-xs">Reset ke Seed Sampel Bawaan</span>
                      <span className="text-[11px] text-stone-500 font-medium">
                        Kembalikan seluruh data lokal ke sampel bawaan (MacBook, Vario, LG AC, Sony A7).
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
                    <div className="p-3 bg-stone-100 border border-stone-300 rounded-xl space-y-2 animate-fade-in mt-2">
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
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-2xs"
                        >
                          Ya, Reset Data
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmAction('none')}
                          className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

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
              Salin kode di bawah ini, buka <strong>script.google.com</strong>, buat New Project, lalu paste kode ini. Setelah itu, jalankan fungsi <code>testAuthAndEmail</code> sekali di editor untuk otorisasi, lalu klik Deploy &gt; New Deployment &gt; Web App (Execute as: Me, Access: Anyone).
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
    </div>
  );
};
