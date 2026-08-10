import React, { useState, useEffect, useCallback } from 'react';
import { Asset, SyncStatus, ServiceHealth, MaintenanceRecord, Reminder, AssetDocument, AssetStatus } from './types';
import { dbManager } from './lib/db';
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

// Modals
import { AddAssetModal } from './components/AddAssetModal';
import { AddMaintenanceModal } from './components/AddMaintenanceModal';
import { AddReminderModal } from './components/AddReminderModal';
import { AddDocumentModal } from './components/AddDocumentModal';
import { SettingsModal } from './components/SettingsModal';
import { DemoOnboardingModal } from './components/DemoOnboardingModal';

import { getNeedsAttentionItems } from './lib/utils';

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Refined Sync State Machine
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('unconfigured');
  const [syncQueueCount, setSyncQueueCount] = useState<number>(0);
  const [serviceHealth, setServiceHealth] = useState<ServiceHealth>({
    appsScript: false,
    googleSheets: false,
    googleDrive: false,
  });
  const [lastSyncTime, setLastSyncTime] = useState<string>('');

  // Modals state
  const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [isAddMaintenanceOpen, setIsAddMaintenanceOpen] = useState(false);
  const [isAddReminderOpen, setIsAddReminderOpen] = useState(false);
  const [isAddDocumentOpen, setIsAddDocumentOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemoOnboardingOpen, setIsDemoOnboardingOpen] = useState(false);
  const [hasPromptedDemoOnboarding, setHasPromptedDemoOnboarding] = useState(false);

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
      const localAssets = await dbManager.getAllAssets();
      if (localAssets.length === 0) {
        const pullRes = await dbManager.pullFromGoogleSheets();
        if (pullRes.success && pullRes.count > 0) {
          const freshList = await dbManager.getAllAssets();
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
    const list = await dbManager.getAllAssets();
    setAssets(list);

    // If currently viewing a detailed asset, update its reference
    if (selectedAsset) {
      const updated = list.find((a) => a.asset_id === selectedAsset.asset_id);
      setSelectedAsset(updated || null);
    }

    await verifySyncConnection();
  }, [selectedAsset, verifySyncConnection]);

  useEffect(() => {
    reloadData();

    const handleOnline = () => verifySyncConnection();
    const handleOffline = () => setSyncStatus('offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const triggerAutoSync = async () => {
    const count = await dbManager.getSyncQueueCount();
    setSyncQueueCount(count);
    const scriptUrl = localStorage.getItem('micromate_apps_script_url');
    if (scriptUrl && scriptUrl.trim() && navigator.onLine) {
      await handleFlushSync();
    }
  };

  // Handlers
  const handleSaveAsset = async (newAsset: Asset) => {
    await dbManager.saveAsset(newAsset);
    await reloadData();
    await triggerAutoSync();
  };

  const handleDeleteAsset = async (assetId: string) => {
    await dbManager.deleteAsset(assetId);
    setSelectedAsset(null);
    await reloadData();
    await triggerAutoSync();
  };

  const handleUpdateStatus = async (assetId: string, status: AssetStatus) => {
    const asset = assets.find((a) => a.asset_id === assetId);
    if (asset) {
      asset.status = status;
      await dbManager.saveAsset(asset);
      await reloadData();
      await triggerAutoSync();
    }
  };

  const handleSaveMaintenance = async (assetId: string, record: MaintenanceRecord) => {
    await dbManager.addMaintenanceRecord(assetId, record);
    await reloadData();
    await triggerAutoSync();
  };

  const handleSaveReminder = async (assetId: string | undefined, reminder: Reminder) => {
    await dbManager.addReminder(assetId, reminder);
    await reloadData();
    await triggerAutoSync();
  };

  const handleCompleteReminder = async (reminderId: string) => {
    await dbManager.completeReminder(reminderId);
    await reloadData();
    await triggerAutoSync();
  };

  const handleSaveDocument = async (assetId: string, doc: AssetDocument) => {
    await dbManager.addDocument(assetId, doc);
    await reloadData();
    await triggerAutoSync();
  };

  const handleClearDemoData = async () => {
    await dbManager.clearDemoData();
    setIsDemoOnboardingOpen(false);
    await reloadData();
  };

  const handleClearCacheAndReset = async () => {
    localStorage.clear();
    if (window.indexedDB) {
      try {
        window.indexedDB.deleteDatabase('MicroMateDB');
      } catch (e) {}
    }
    window.location.reload();
  };

  const handleKeepDemoData = async () => {
    await dbManager.markAllDemoAsUser();
    setIsDemoOnboardingOpen(false);
    await reloadData();
    await handleFlushSync();
  };

  const handleFlushSync = async () => {
    const scriptUrl = localStorage.getItem('micromate_apps_script_url');
    if (!scriptUrl || !scriptUrl.trim()) {
      setIsSettingsOpen(true);
      return;
    }

    if (!navigator.onLine) {
      setSyncStatus('offline');
      return;
    }

    setSyncStatus('syncing');
    const success = await dbManager.flushSyncQueue();
    if (success) {
      // Muat ulang data aset setelah sinkronisasi dan penarikan data dari Google Sheets
      const list = await dbManager.getAllAssets();
      setAssets(list);

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
    } else {
      setSyncStatus('error');
    }
  };

  const attentionItems = getNeedsAttentionItems(assets);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans transition-colors antialiased">
      
      {/* Top Header Navbar */}
      <Navbar
        syncStatus={syncStatus}
        syncQueueCount={syncQueueCount}
        serviceHealth={serviceHealth}
        lastSyncTime={lastSyncTime}
        hasDemoData={hasDemoData}
        onSyncClick={handleFlushSync}
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
      />

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
        onQuickAdd={handleOpenAddAsset}
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
        onClearCacheAndReset={handleClearCacheAndReset}
      />

      <DemoOnboardingModal
        isOpen={isDemoOnboardingOpen}
        demoCount={assets.filter((a) => a.is_demo || a.data_origin === 'demo' || ['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'].includes(a.asset_id)).length}
        onChooseStartFresh={handleClearDemoData}
        onChooseKeepDemo={handleKeepDemoData}
        onClose={() => setIsDemoOnboardingOpen(false)}
      />

    </div>
  );
}
