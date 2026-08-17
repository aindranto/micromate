import React, { useState, useEffect, useCallback } from 'react';
import { Asset, SyncStatus, ServiceHealth, MaintenanceRecord, Reminder, AssetDocument, AssetStatus } from './types';
import { dbManager } from './lib/db';
import { INITIAL_WORKSPACE_ID } from './lib/seedData';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { AssetList } from './components/AssetList';
import { AssetDetail } from './components/AssetDetail';
import { MaintenancePage } from './components/MaintenancePage';
import { RemindersPage } from './components/RemindersPage';
import { CostAnalyticsPage } from './components/CostAnalyticsPage';
import { DocumentationPage } from './components/DocumentationPage';
import { AttentionDashboardPage } from './components/attention/AttentionDashboardPage';

// Modals
import { AddAssetModal } from './components/AddAssetModal';
import { AddMaintenanceModal } from './components/AddMaintenanceModal';
import { AddReminderModal } from './components/AddReminderModal';
import { AddDocumentModal } from './components/AddDocumentModal';
import { SettingsModal } from './components/SettingsModal';
import { DemoOnboardingModal } from './components/DemoOnboardingModal';
import { OnboardingPage } from './components/OnboardingPage';
import { PinLockModal } from './components/PinLockModal';

import { getNeedsAttentionItems } from './lib/utils';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // App PIN Lock State
  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('micromate_app_pin'));
  });
  
  // Refined Sync State Machine
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unconfigured');
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({
    appsScript: false,
    googleSheets: false,
    googleDrive: false,
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Onboarding & Standalone Route State (Canonical Initialization Gate with Route Precedence Invariant)
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(() => {
    return localStorage.getItem('micromate_setup_completed') === 'true' ||
      localStorage.getItem('micromate_onboarding_completed') === 'true';
  });

  const [currentRoute, setCurrentRoute] = useState<'app' | 'setup' | 'setup-google'>(() => {
    const isCompleted = localStorage.getItem('micromate_setup_completed') === 'true' ||
      localStorage.getItem('micromate_onboarding_completed') === 'true';

    // If app is already initialized, stale #/setup or #/onboarding hash MUST NOT force setup view
    if (isCompleted) {
      return 'app';
    }

    const hash = window.location.hash.toLowerCase();
    if (hash === '#/setup' || hash === '#setup' || hash === '#/onboarding') return 'setup';
    if (hash === '#/setup/google' || hash === '#setup/google') return 'setup-google';
    
    return 'setup';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const isCompleted = localStorage.getItem('micromate_setup_completed') === 'true' ||
        localStorage.getItem('micromate_onboarding_completed') === 'true' ||
        isSetupCompleted;

      const hash = window.location.hash.toLowerCase();
      if (hash === '#/setup' || hash === '#setup' || hash === '#/onboarding') {
        // Stale setup hash on initialized app redirects canonically to app view
        if (isCompleted) {
          setCurrentRoute('app');
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        } else {
          setCurrentRoute('setup');
        }
      } else if (hash === '#/setup/google' || hash === '#setup/google') {
        setCurrentRoute(isCompleted ? 'app' : 'setup-google');
      } else if (isCompleted) {
        setCurrentRoute('app');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [isSetupCompleted]);
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemoOnboardingOpen, setIsDemoOnboardingOpen] = useState(false);
  const [hasPromptedDemoOnboarding, setHasPromptedDemoOnboarding] = useState(false);
  const [syncToast, setSyncToast] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (syncToast) {
      const timer = setTimeout(() => setSyncToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [syncToast]);

  // Target asset ID for maintenance/document modals
  const [targetAssetId, setTargetAssetId] = useState<string | undefined>(undefined);

  const hasDemoData = assets.some((a) => a.is_demo || a.data_origin === 'demo');

  const handleOpenAddAsset = () => {
    setEditingAsset(null);
    setIsAddAssetOpen(true);
  };

  const handleOpenEditAsset = (asset: Asset) => {
    setEditingAsset(asset);
    setIsAddAssetOpen(true);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setActiveTab('assets');
    setSelectedAsset(null);
  };

  // Perform full health check & evaluate sync state
  const verifySyncConnection = useCallback(async () => {
    const queueCount = await dbManager.getSyncQueueCount();
    setSyncQueueCount(queueCount);

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    const scriptUrl = localStorage.getItem('micromate_apps_script_url');
    if (!scriptUrl || !scriptUrl.trim()) {
      setSyncStatus('unconfigured');
      setServiceHealth({
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        errorMessage: 'Apps Script belum dikonfigurasi'
      });
      return;
    }

    // Health probe
    setSyncStatus('unverified');
    const health = await dbManager.checkHealth(scriptUrl);
    setServiceHealth(health);

    if (!health.appsScript) {
      setSyncStatus('error');
    } else {
      if (!health.googleSheets || !health.googleDrive) {
        setSyncStatus('partial');
      } else if (queueCount > 0) {
        setSyncStatus('pending');
      } else {
        setSyncStatus('synced');
        if (!lastSyncTime) {
          setLastSyncTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
        }
      }

      // Jika Gateway terhubung dan database lokal kosong/di-reset, otomatis tarik data dari Google Sheets
      const localAssets = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
      if (localAssets.length === 0) {
        const pullRes = await dbManager.pullFromGoogleSheets();
        if (pullRes.success && pullRes.count > 0) {
          const freshList = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
          setAssets(freshList);
        }
      }

      // Prompt demo onboarding modal whenever Gateway is verified and demo data exists
      const demoExists = await dbManager.hasDemoData();
      if (demoExists && !hasPromptedDemoOnboarding) {
        setIsDemoOnboardingOpen(true);
        setHasPromptedDemoOnboarding(true);
      }
    }
  }, [lastSyncTime, hasPromptedDemoOnboarding]);

  // Load assets from database on startup
  const reloadData = useCallback(async () => {
    await dbManager.init();
    const list = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
    setAssets(list);

    // If currently viewing a detailed asset, update its reference
    if (selectedAsset) {
      const updated = list.find((a) => a.asset_id === selectedAsset.asset_id);
      setSelectedAsset(updated || null);
    }

    await verifySyncConnection();
  }, [selectedAsset, verifySyncConnection]);

  const triggerAutoSync = useCallback(async () => {
    const count = await dbManager.getSyncQueueCount();
    setSyncQueueCount(count);
    const scriptUrl = localStorage.getItem('micromate_apps_script_url');
    if (scriptUrl && scriptUrl.trim() && navigator.onLine) {
      await handleFlushSync();
    }
  }, []);

  useEffect(() => {
    const initApp = async () => {
      await reloadData();

      // Async Initialization Gate: Validate & Self-Heal Canonical Setup State
      const currentFlag = localStorage.getItem('micromate_setup_completed') === 'true' ||
        localStorage.getItem('micromate_onboarding_completed') === 'true';

      if (!currentFlag) {
        // Inspect whether a valid, consistent persisted initialization state exists in storage
        const hasValidState = await dbManager.hasValidPersistedState();
        if (hasValidState) {
          localStorage.setItem('micromate_setup_completed', 'true');
          localStorage.setItem('micromate_onboarding_completed', 'true');
          setIsSetupCompleted(true);
          setCurrentRoute('app');
          if (window.location.hash && (window.location.hash.toLowerCase().includes('setup') || window.location.hash.toLowerCase().includes('onboarding'))) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
      } else {
        // If flag is valid and current route is stale setup hash, clean it
        const hash = window.location.hash.toLowerCase();
        if (hash === '#/setup' || hash === '#setup' || hash === '#/onboarding') {
          setCurrentRoute('app');
          window.history.replaceState(null, '', window.location.pathname);
        }
      }

      const scriptUrl = localStorage.getItem('micromate_apps_script_url');
      if (scriptUrl && scriptUrl.trim() && navigator.onLine) {
        // Auto 2-Way Sync on Startup / Refresh
        await triggerAutoSync();
      }
    };

    initApp();

    const handleOnline = () => {
      verifySyncConnection();
      triggerAutoSync();
    };
    const handleOffline = () => setSyncStatus('offline');

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        triggerAutoSync();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handlers
  const handleSaveAsset = async (newAsset: Asset) => {
    await dbManager.saveAsset(newAsset, INITIAL_WORKSPACE_ID);
    await reloadData();
    await triggerAutoSync();
  };

  const handleDeleteAsset = async (assetId: string) => {
    await dbManager.deleteAsset(assetId, INITIAL_WORKSPACE_ID);
    setSelectedAsset(null);
    await reloadData();
    await triggerAutoSync();
  };

  const handleUpdateStatus = async (assetId: string, status: AssetStatus) => {
    const asset = assets.find((a) => a.asset_id === assetId);
    if (asset) {
      asset.status = status;
      await dbManager.saveAsset(asset, INITIAL_WORKSPACE_ID);
      await reloadData();
      await triggerAutoSync();
    }
  };

  const handleSaveMaintenance = async (assetId: string, input: any, options?: any) => {
    await dbManager.addMaintenanceRecord(assetId, input, INITIAL_WORKSPACE_ID, options);
    await reloadData();
    await triggerAutoSync();
  };

  const handleSaveReminder = async (assetId: string | undefined, reminder: Reminder) => {
    await dbManager.addReminder(assetId, reminder, INITIAL_WORKSPACE_ID);
    await reloadData();
    await triggerAutoSync();
  };

  const handleCompleteReminder = async (reminderId: string) => {
    await dbManager.completeReminder(reminderId, INITIAL_WORKSPACE_ID);
    await reloadData();
    await triggerAutoSync();
  };

  const handleDismissReminder = async (reminderId: string) => {
    await dbManager.dismissReminder(reminderId, INITIAL_WORKSPACE_ID);
    await reloadData();
    await triggerAutoSync();
  };

  const handleSaveDocument = async (assetId: string, doc: AssetDocument) => {
    await dbManager.addDocument(assetId, doc, INITIAL_WORKSPACE_ID);
    await reloadData();
    await triggerAutoSync();
  };

  const handleClearDemoData = async () => {
    await dbManager.clearDemoData();
    setIsDemoOnboardingOpen(false);
    await reloadData();
  };

  const handleClearCacheAndReset = async () => {
    localStorage.removeItem('micromate_setup_completed');
    localStorage.removeItem('micromate_onboarding_completed');
    localStorage.removeItem('micromate_db_seeded');
    localStorage.removeItem('micromate_demo_dismissed');
    localStorage.removeItem('micromate_apps_script_url');
    localStorage.removeItem('micromate_user_email');
    localStorage.removeItem('micromate_connection_verified');
    localStorage.removeItem('micromate_app_pin');
    localStorage.removeItem('micromate_notif_prefs');
    await dbManager.clearAllData();
    setIsSettingsOpen(false);
    setIsSetupCompleted(false);
    setCurrentRoute('setup');
    window.location.hash = '#setup';
    await reloadData();
  };

  const handleCompleteSetup = async (
    mode: 'cloud' | 'local',
    initialDataChoice: 'existing' | 'empty' | 'demo'
  ) => {
    localStorage.setItem('micromate_setup_completed', 'true');
    localStorage.setItem('micromate_onboarding_completed', 'true');
    setIsSetupCompleted(true);
    setCurrentRoute('app');
    window.location.hash = '';

    if (initialDataChoice === 'existing' && mode === 'cloud') {
      await handlePullFromSheets();
    } else if (initialDataChoice === 'empty') {
      await dbManager.clearDemoData();
      if (mode === 'cloud') {
        await handleFlushSync();
      }
    } else if (initialDataChoice === 'demo' && mode === 'cloud') {
      await handleFlushSync();
    }

    await reloadData();
  };

  const handleKeepDemoData = async () => {
    await dbManager.markAllDemoAsUser();
    setIsDemoOnboardingOpen(false);
    await reloadData();
    await handleFlushSync();
  };

  const handleFlushSync = async (isManual = false) => {
    const scriptUrl = localStorage.getItem('micromate_apps_script_url');
    if (!scriptUrl || !scriptUrl.trim()) {
      if (isManual) setIsSettingsOpen(true);
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      if (isManual) {
        setSyncToast({
          type: 'info',
          message: 'Perangkat offline. Perubahan disimpan lokal.'
        });
      }
      return;
    }

    setSyncStatus('syncing');
    const success = await dbManager.flushSyncQueue();
    if (success) {
      // Muat ulang data aset setelah sinkronisasi dan penarikan data dari Google Sheets
      const list = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
      setAssets(list);

      if (selectedAsset) {
        const updated = list.find((a) => a.asset_id === selectedAsset.asset_id);
        setSelectedAsset(updated || null);
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setSyncQueueCount(0);
      setLastSyncTime(nowStr);
      setSyncStatus('synced');
      setServiceHealth({
        appsScript: true,
        googleSheets: true,
        googleDrive: true,
        lastChecked: nowStr
      });
      if (isManual) {
        setSyncToast({
          type: 'success',
          message: 'Sinkronisasi berhasil.'
        });
      }
    } else {
      setSyncStatus('error');
      if (isManual) {
        setSyncToast({
          type: 'error',
          message: 'Gagal menyinkronkan data ke Google Sheets.'
        });
      }
    }
  };

  const handlePullFromSheets = async () => {
    const scriptUrl = localStorage.getItem('micromate_apps_script_url');
    if (!scriptUrl || !scriptUrl.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      setSyncToast({
        type: 'info',
        message: 'Tidak dapat menarik data: Perangkat sedang offline.'
      });
      return;
    }

    setSyncStatus('syncing');
    const res = await dbManager.pullFromGoogleSheets();
    if (res.success) {
      const list = await dbManager.getAllAssets(INITIAL_WORKSPACE_ID);
      setAssets(list);

      if (selectedAsset) {
        const updated = list.find((a) => a.asset_id === selectedAsset.asset_id);
        setSelectedAsset(updated || null);
      }

      const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(nowStr);
      setSyncStatus('synced');
      setServiceHealth({
        appsScript: true,
        googleSheets: true,
        googleDrive: true,
        lastChecked: nowStr
      });

      if (res.count && res.count > 0) {
        setSyncToast({
          type: 'success',
          message: `Berhasil memuat ${res.count} data aset dari Google Sheets.`
        });
      } else {
        setSyncToast({
          type: 'info',
          message: `Google Sheets terhubung, namun tidak ada baris data aset ditemukan (0 aset).`
        });
      }
    } else {
      setSyncStatus('error');
      setSyncToast({
        type: 'error',
        message: `Gagal menarik data dari Google Sheets: ${res.error || 'Periksa URL Apps Script atau konfigurasi Sheet'}`
      });
    }
  };

  const handleNotificationAction = useCallback((payload: any) => {
    if (!payload || !payload.asset_id) return;
    const matchedAsset = assets.find((a) => a.asset_id === payload.asset_id);
    if (matchedAsset) {
      setSelectedAsset(matchedAsset);
      if (payload.workflow_type === 'DOCUMENT_RENEWAL') {
        setActiveTab('assets');
      } else if (payload.workflow_type === 'MAINTENANCE') {
        setActiveTab('maintenance');
      } else if (payload.workflow_type === 'COST_ACK') {
        setActiveTab('expenses');
      }
    }
  }, [assets]);

  const attentionItems = getNeedsAttentionItems(assets);

  // Standalone Setup / Onboarding Route Check
  if (!isSetupCompleted || currentRoute === 'setup' || currentRoute === 'setup-google') {
    return (
      <OnboardingPage
        initialStep={currentRoute === 'setup-google' ? 'google_setup' : 'welcome'}
        onComplete={handleCompleteSetup}
        onClose={() => {
          setCurrentRoute('app');
          window.location.hash = '';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans transition-colors antialiased">
      
      {/* Top Header Navbar */}
      <Navbar
        syncStatus={syncStatus}
        syncQueueCount={syncQueueCount}
        serviceHealth={serviceHealth}
        lastSyncTime={lastSyncTime}
        hasDemoData={hasDemoData}
        onSyncClick={() => handleFlushSync(true)}
        onPullClick={handlePullFromSheets}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNavigateDocs={() => {
          setActiveTab('docs');
          setSelectedAsset(null);
        }}
        onQuickAddAsset={handleOpenAddAsset}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (q.trim() && activeTab !== 'assets') {
            setActiveTab('assets');
            setSelectedAsset(null);
          }
        }}
        onVerifyConnection={verifySyncConnection}
        onClearDemoData={handleClearDemoData}
        onOpenDemoOnboarding={() => setIsDemoOnboardingOpen(true)}
        onNotificationAction={handleNotificationAction}
        assets={assets}
      />

      {/* Sync Toast Feedback Banner */}
      {syncToast && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 max-w-sm w-full animate-in slide-in-from-top-2 duration-200">
          <div
            className={`p-2.5 px-3.5 rounded-xl shadow-lg border flex items-center gap-2.5 backdrop-blur-md text-xs ${
              syncToast.type === 'success'
                ? 'bg-stone-900/95 text-emerald-300 border-emerald-800/40 shadow-stone-950/20'
                : syncToast.type === 'error'
                ? 'bg-rose-950/95 text-rose-100 border-rose-800/60 shadow-rose-950/20'
                : 'bg-stone-900/95 text-stone-100 border-stone-700/60 shadow-stone-950/20'
            }`}
          >
            <div className="shrink-0">
              {syncToast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {syncToast.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-400" />}
              {syncToast.type === 'info' && <Info className="w-4 h-4 text-amber-400" />}
            </div>
            <div className="flex-1 font-medium leading-tight text-stone-200">
              {syncToast.message}
            </div>
            <button
              type="button"
              onClick={() => setSyncToast(null)}
              className="shrink-0 p-1 hover:bg-white/10 rounded-md text-stone-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Body Layout with Sidebar */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex">
        
        {/* Desktop Sidebar Navigation */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setSelectedAsset(null);
            if (tab === 'assets') {
              // keep current category or default to 'all' if navigating main nav
            }
          }}
          selectedCategory={selectedCategory}
          onCategorySelect={handleCategorySelect}
          onQuickAdd={handleOpenAddAsset}
          needsAttentionCount={attentionItems.length}
        />

        {/* Content Region */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-full overflow-hidden">
          
          {selectedAsset ? (
            <AssetDetail
              asset={selectedAsset}
              onBack={() => setSelectedAsset(null)}
              onAddMaintenance={(id) => {
                setTargetAssetId(id);
                setIsAddMaintenanceOpen(true);
              }}
              onAddReminder={(id) => {
                setTargetAssetId(id);
                setIsAddReminderOpen(true);
              }}
              onAddDocument={(id) => {
                setTargetAssetId(id);
                setIsAddDocumentOpen(true);
              }}
              onUpdateStatus={handleUpdateStatus}
              onDeleteAsset={handleDeleteAsset}
              onCompleteReminder={handleCompleteReminder}
              onEditAsset={handleOpenEditAsset}
            />
          ) : activeTab === 'dashboard' ? (
            <Dashboard
              assets={assets}
              onSelectAsset={(a) => setSelectedAsset(a)}
              onQuickAddAsset={handleOpenAddAsset}
              onQuickAddMaintenance={() => {
                setTargetAssetId(undefined);
                setIsAddMaintenanceOpen(true);
              }}
              onQuickAddReminder={() => {
                setTargetAssetId(undefined);
                setIsAddReminderOpen(true);
              }}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onCategorySelect={handleCategorySelect}
              onCompleteReminder={handleCompleteReminder}
            />
          ) : activeTab === 'assets' ? (
            <AssetList
              assets={assets}
              onSelectAsset={(a) => setSelectedAsset(a)}
              onQuickAddAsset={() => setIsAddAssetOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
            />
          ) : activeTab === 'maintenance' ? (
            <MaintenancePage
              assets={assets}
              onAddMaintenance={() => {
                setTargetAssetId(undefined);
                setIsAddMaintenanceOpen(true);
              }}
              onSelectAsset={(a) => setSelectedAsset(a)}
            />
          ) : activeTab === 'reminders' ? (
            <RemindersPage
              assets={assets}
              onAddReminder={() => {
                setTargetAssetId(undefined);
                setIsAddReminderOpen(true);
              }}
              onCompleteReminder={handleCompleteReminder}
              onDismissReminder={handleDismissReminder}
              onSelectAsset={(a) => setSelectedAsset(a)}
            />
          ) : activeTab === 'expenses' ? (
            <CostAnalyticsPage
              assets={assets}
              onSelectAsset={(a) => setSelectedAsset(a)}
            />
          ) : activeTab === 'docs' ? (
            <DocumentationPage
              onOpenSettings={() => setIsSettingsOpen(true)}
              onQuickAddAsset={handleOpenAddAsset}
            />
          ) : activeTab === 'attention' ? (
            <AttentionDashboardPage
              assets={assets}
              onSelectAsset={(a) => setSelectedAsset(a)}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onEditAsset={handleOpenEditAsset}
            />
          ) : null}

        </main>

      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedAsset(null);
        }}
        onQuickAddAsset={handleOpenAddAsset}
        onQuickAddMaintenance={() => {
          setTargetAssetId(undefined);
          setIsAddMaintenanceOpen(true);
        }}
        onQuickAddReminder={() => {
          setTargetAssetId(undefined);
          setIsAddReminderOpen(true);
        }}
        onOpenSettings={() => setIsSettingsOpen(true)}
        needsAttentionCount={attentionItems.length}
      />

      {/* Modals */}
      <AddAssetModal
        isOpen={isAddAssetOpen}
        onClose={() => {
          setIsAddAssetOpen(false);
          setEditingAsset(null);
        }}
        onSave={handleSaveAsset}
        assetToEdit={editingAsset}
        onShowToast={(type, message) => setSyncToast({ type, message })}
      />

      <AddMaintenanceModal
        isOpen={isAddMaintenanceOpen}
        onClose={() => setIsAddMaintenanceOpen(false)}
        assets={assets}
        initialAssetId={targetAssetId}
        onSave={handleSaveMaintenance}
      />

      <AddReminderModal
        isOpen={isAddReminderOpen}
        onClose={() => setIsAddReminderOpen(false)}
        assets={assets}
        initialAssetId={targetAssetId}
        onSave={handleSaveReminder}
      />

      {selectedAsset && (
        <AddDocumentModal
          isOpen={isAddDocumentOpen}
          onClose={() => setIsAddDocumentOpen(false)}
          asset={selectedAsset}
          onSave={handleSaveDocument}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        syncStatus={syncStatus}
        serviceHealth={serviceHealth}
        syncQueueCount={syncQueueCount}
        hasDemoData={hasDemoData}
        onFlushSync={handleFlushSync}
        onDataReload={reloadData}
        onVerifyConnection={verifySyncConnection}
        onClearDemoData={handleClearDemoData}
        onOpenDemoOnboarding={() => setIsDemoOnboardingOpen(true)}
        onRestartOnboarding={() => {
          setIsSettingsOpen(false);
          setCurrentRoute('setup');
        }}
        onClearCacheAndReset={handleClearCacheAndReset}
      />

      <DemoOnboardingModal
        isOpen={isDemoOnboardingOpen}
        demoCount={assets.filter((a) => a.is_demo || a.data_origin === 'demo' || ['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'].includes(a.asset_id)).length}
        onChooseStartFresh={handleClearDemoData}
        onChooseKeepDemo={handleKeepDemoData}
        onClose={() => setIsDemoOnboardingOpen(false)}
      />

      <PinLockModal
        isOpen={isAppLocked}
        onSuccess={() => setIsAppLocked(false)}
        onResetPin={() => setIsAppLocked(false)}
      />

    </div>
  );
}
