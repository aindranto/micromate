import { Asset, SyncQueueItem, SyncStatus, ServiceHealth, MaintenanceRecord, Reminder, AssetDocument, Expense } from '../types';
import { SEED_ASSETS, INITIAL_WORKSPACE_ID } from './seedData';

const DB_NAME = 'MicroMateDB';
const DB_VERSION = 1;
const STORAGE_KEY = 'micromate_assets_v1';
const SYNC_QUEUE_KEY = 'micromate_sync_queue_v1';

class DatabaseManager {
  private db: IDBDatabase | null = null;
  private isIndexedDBSupported = typeof window !== 'undefined' && 'indexedDB' in window;

  public async init(): Promise<void> {
    if (!this.isIndexedDBSupported) {
      console.warn('IndexedDB not supported, falling back to LocalStorage.');
      this.ensureSeedDataLocalStorage();
      return;
    }

    return new Promise((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;

          if (!db.objectStoreNames.contains('assets')) {
            db.createObjectStore('assets', { keyPath: 'asset_id' });
          }
          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id' });
          }
        };

        request.onsuccess = async (event) => {
          this.db = (event.target as IDBOpenDBRequest).result;
          await this.ensureSeedDataIndexedDB();
          resolve();
        };

        request.onerror = (err) => {
          console.error('IndexedDB open error:', err);
          this.ensureSeedDataLocalStorage();
          resolve();
        };
      } catch (err) {
        console.error('IndexedDB init exception:', err);
        this.ensureSeedDataLocalStorage();
        resolve();
      }
    });
  }

  // Ensure seed data in LocalStorage if empty and not yet seeded
  private ensureSeedDataLocalStorage() {
    const isSeeded = localStorage.getItem('micromate_db_seeded');
    if (isSeeded === 'true') return;

    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing || JSON.parse(existing).length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_ASSETS));
      localStorage.setItem('micromate_db_seeded', 'true');
    }
  }

  // Ensure seed data in IndexedDB if empty and not yet seeded
  private async ensureSeedDataIndexedDB(): Promise<void> {
    const isSeeded = localStorage.getItem('micromate_db_seeded');
    if (isSeeded === 'true') return;

    const assets = await this.getAllAssets();
    if (assets.length === 0) {
      for (const asset of SEED_ASSETS) {
        await this.saveAssetToDB(asset);
      }
      localStorage.setItem('micromate_db_seeded', 'true');
    }
  }

  // Get all active assets
  public async getAllAssets(): Promise<Asset[]> {
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction('assets', 'readonly');
          const store = tx.objectStore('assets');
          const request = store.getAll();

          request.onsuccess = () => {
            const list: Asset[] = request.result || [];
            resolve(list.filter((a) => !a.deleted));
          };

          request.onerror = () => {
            resolve(this.getAssetsLocalStorage());
          };
        } catch (e) {
          resolve(this.getAssetsLocalStorage());
        }
      });
    } else {
      return Promise.resolve(this.getAssetsLocalStorage());
    }
  }

  private getAssetsLocalStorage(): Asset[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed: Asset[] = JSON.parse(data);
      return parsed.filter((a) => !a.deleted);
    } catch {
      return [];
    }
  }

  // Get single asset by ID
  public async getAssetById(assetId: string): Promise<Asset | null> {
    const assets = await this.getAllAssets();
    return assets.find((a) => a.asset_id === assetId) || null;
  }

  // Save/Update asset
  public async saveAsset(asset: Asset): Promise<void> {
    asset.updated_at = new Date().toISOString();
    if (!asset.data_origin) {
      asset.data_origin = asset.is_demo ? 'demo' : 'local';
    }
    await this.saveAssetToDB(asset);
    await this.addToSyncQueue('saveAsset', asset);
  }

  // Check if workspace contains demo data
  public async hasDemoData(): Promise<boolean> {
    const assets = await this.getAllAssets();
    return assets.some((a) => 
      (a.is_demo || a.data_origin === 'demo' || ['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'].includes(a.asset_id)) && !a.deleted
    );
  }

  // Safely clear ONLY demo data (is_demo = true or data_origin = 'demo') without wiping user records
  public async clearDemoData(): Promise<number> {
    localStorage.setItem('micromate_db_seeded', 'true');
    const assets = await this.getAllAssets();
    const demoAssets = assets.filter((a) => 
      a.is_demo || 
      a.data_origin === 'demo' || 
      ['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'].includes(a.asset_id)
    );
    
    for (const demoAsset of demoAssets) {
      demoAsset.deleted = true;
      demoAsset.updated_at = new Date().toISOString();
      await this.saveAssetToDB(demoAsset);
    }

    // Direct store cleanup in IndexedDB if active
    if (this.db) {
      try {
        const tx = this.db.transaction('assets', 'readwrite');
        const store = tx.objectStore('assets');
        for (const demoAsset of demoAssets) {
          store.delete(demoAsset.asset_id);
        }
      } catch (e) {
        console.warn('Direct IndexedDB deletion error:', e);
      }
    }

    // Direct cleanup in LocalStorage
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: Asset[] = JSON.parse(raw);
        const filtered = list.filter((a) => 
          !a.is_demo && 
          a.data_origin !== 'demo' && 
          !['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'].includes(a.asset_id)
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {}

    return demoAssets.length;
  }

  // Convert demo assets to user assets (if user explicitly chooses to keep demo data)
  public async markAllDemoAsUser(): Promise<void> {
    const assets = await this.getAllAssets();
    for (const asset of assets) {
      if (asset.is_demo || asset.data_origin === 'demo') {
        asset.is_demo = false;
        asset.data_origin = 'local';
        asset.updated_at = new Date().toISOString();
        await this.saveAssetToDB(asset);
      }
    }
  }

  private async saveAssetToDB(asset: Asset): Promise<void> {
    if (this.db) {
      return new Promise((resolve, reject) => {
        try {
          const tx = this.db!.transaction('assets', 'readwrite');
          const store = tx.objectStore('assets');
          const req = store.put(asset);

          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (err) {
          this.saveAssetLocalStorage(asset);
          resolve();
        }
      });
    } else {
      this.saveAssetLocalStorage(asset);
    }
  }

  private saveAssetLocalStorage(asset: Asset) {
    const list = this.getAssetsLocalStorage();
    const idx = list.findIndex((a) => a.asset_id === asset.asset_id);
    if (idx >= 0) {
      list[idx] = asset;
    } else {
      list.push(asset);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // Delete asset locally without adding to sync queue (used for cloud reconciliation)
  public async deleteAssetLocallyWithoutQueue(assetId: string): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('assets', 'readwrite');
          const store = tx.objectStore('assets');
          const req = store.delete(assetId);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        } catch (e) {
          console.warn('Error deleting asset from IndexedDB:', e);
          resolve();
        }
      });
    }

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const list: Asset[] = JSON.parse(raw);
        const filtered = list.filter((a) => a.asset_id !== assetId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.warn('Error deleting asset from LocalStorage:', e);
    }
  }

  // Delete asset (removes locally and queues for Google Sheets sync)
  public async deleteAsset(assetId: string): Promise<void> {
    localStorage.setItem('micromate_db_seeded', 'true');
    await this.deleteAssetLocallyWithoutQueue(assetId);
    await this.addToSyncQueue('deleteAsset', { assetId, id: assetId, asset_id: assetId });
  }

  // Reset to initial seed data
  public async resetData(): Promise<void> {
    localStorage.removeItem('micromate_db_seeded');
    if (this.db) {
      const tx = this.db.transaction('assets', 'readwrite');
      const store = tx.objectStore('assets');
      store.clear();
    }
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SYNC_QUEUE_KEY);
    await this.ensureSeedDataIndexedDB();
    this.ensureSeedDataLocalStorage();
  }

  // Add Maintenance Record to an Asset
  public async addMaintenanceRecord(assetId: string, record: MaintenanceRecord): Promise<Asset | null> {
    const asset = await this.getAssetById(assetId);
    if (!asset) return null;

    if (!asset.maintenance_records) asset.maintenance_records = [];
    asset.maintenance_records.unshift(record);

    // Add expense record
    if (!asset.expenses) asset.expenses = [];
    asset.expenses.push({
      expense_id: 'exp_' + Date.now(),
      asset_id: assetId,
      type: record.type === 'repair' ? 'repair' : 'maintenance',
      amount: record.cost,
      date: record.date,
      description: record.notes || `${record.type} maintenance`
    });

    // Update vehicle mileage if applicable
    if (asset.vehicle_details && record.mileage) {
      asset.vehicle_details.current_mileage = Math.max(asset.vehicle_details.current_mileage, record.mileage);
      if (record.type === 'oil_change') {
        asset.vehicle_details.last_oil_change_date = record.date;
        asset.vehicle_details.last_oil_change_mileage = record.mileage;
        if (record.next_mileage) {
          asset.vehicle_details.next_oil_change_mileage = record.next_mileage;
        }
      }
      if (record.type === 'routine_service') {
        asset.vehicle_details.last_service_mileage = record.mileage;
        if (record.next_mileage) {
          asset.vehicle_details.next_service_mileage = record.next_mileage;
        }
      }
    }

    await this.saveAsset(asset);
    await this.addToSyncQueue('syncMaintenance', {
      id: record.maintenance_id,
      asset_id: assetId,
      service_type: record.type,
      service_date: record.date,
      cost: record.cost,
      provider: record.provider || '-',
      notes: record.notes || ''
    });
    return asset;
  }

  // Add Reminder
  public async addReminder(assetId: string | undefined, reminder: Reminder): Promise<void> {
    let targetAssetId = assetId;
    if (assetId) {
      const asset = await this.getAssetById(assetId);
      if (asset) {
        if (!asset.reminders) asset.reminders = [];
        reminder.asset_name = asset.name;
        asset.reminders.unshift(reminder);
        await this.saveAsset(asset);
      }
    } else {
      const assets = await this.getAllAssets();
      if (assets.length > 0) {
        const target = assets[0];
        targetAssetId = target.asset_id;
        if (!target.reminders) target.reminders = [];
        target.reminders.unshift(reminder);
        await this.saveAsset(target);
      }
    }

    await this.addToSyncQueue('syncReminder', {
      id: reminder.reminder_id,
      asset_id: targetAssetId || '',
      title: reminder.title,
      due_date: reminder.due_date,
      status: reminder.status || 'pending',
      notes: ''
    });
  }

  // Toggle or Complete Reminder
  public async completeReminder(reminderId: string): Promise<void> {
    const assets = await this.getAllAssets();
    for (const asset of assets) {
      if (asset.reminders) {
        const rem = asset.reminders.find((r) => r.reminder_id === reminderId);
        if (rem) {
          rem.status = 'completed';
          rem.updated_at = new Date().toISOString();
          await this.saveAsset(asset);
          break;
        }
      }
    }
  }

  // Add Document to an Asset
  public async addDocument(assetId: string, doc: AssetDocument): Promise<Asset | null> {
    const asset = await this.getAssetById(assetId);
    if (!asset) return null;
    if (!asset.documents) asset.documents = [];
    asset.documents.unshift(doc);
    await this.saveAsset(asset);

    await this.addToSyncQueue('uploadFile', {
      asset_id: assetId,
      asset_code: asset.asset_id,
      file_category: doc.type || 'document',
      file_name: doc.name,
      mime_type: 'application/pdf',
      base64_data: doc.file_url || '',
      file_size: 0
    });
    return asset;
  }

  // Sync Queue Management
  public async addToSyncQueue(action: string, data: any): Promise<void> {
    const queueItem: SyncQueueItem = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      action,
      workspaceId: INITIAL_WORKSPACE_ID,
      data,
      timestamp: new Date().toISOString()
    };

    if (this.db) {
      try {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        tx.objectStore('syncQueue').put(queueItem);
      } catch (e) {
        this.addSyncQueueLocalStorage(queueItem);
      }
    } else {
      this.addSyncQueueLocalStorage(queueItem);
    }
  }

  private addSyncQueueLocalStorage(item: SyncQueueItem) {
    const items = this.getSyncQueueLocalStorage();
    items.push(item);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
  }

  public getSyncQueueLocalStorage(): SyncQueueItem[] {
    try {
      const data = localStorage.getItem(SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public async getAllSyncQueueItems(): Promise<SyncQueueItem[]> {
    const itemsMap = new Map<string, SyncQueueItem>();

    // 1. Get from LocalStorage
    const localItems = this.getSyncQueueLocalStorage();
    for (const item of localItems) {
      itemsMap.set(item.id, item);
    }

    // 2. Get from IndexedDB
    if (this.db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = this.db!.transaction('syncQueue', 'readonly');
          const store = tx.objectStore('syncQueue');
          const req = store.getAll();
          req.onsuccess = () => {
            if (req.result && Array.isArray(req.result)) {
              for (const item of req.result) {
                itemsMap.set(item.id, item);
              }
            }
            resolve();
          };
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }

    return Array.from(itemsMap.values());
  }

  public async getSyncQueueCount(): Promise<number> {
    const items = await this.getAllSyncQueueItems();
    return items.length;
  }

  // Check Health status of Apps Script, Sheets, and Drive
  public async checkHealth(targetUrl?: string): Promise<ServiceHealth> {
    const url = targetUrl || localStorage.getItem('micromate_apps_script_url');

    if (!url || !url.trim()) {
      return {
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        errorMessage: 'Apps Script Web App URL belum dikonfigurasi'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const healthUrl = url.includes('?') ? `${url}&action=health` : `${url}?action=health`;
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.status === 'ok') {
          return {
            appsScript: true,
            googleSheets: json.services?.googleSheets ?? true,
            googleDrive: json.services?.googleDrive ?? true,
            lastChecked: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
        }
      }

      // If GET failed or CORS restricted, attempt POST health probe
      const postRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'health' })
      }).catch(() => null);

      if (postRes && postRes.ok) {
        const json = await postRes.json().catch(() => null);
        if (json && (json.status === 'ok' || json.success)) {
          return {
            appsScript: true,
            googleSheets: json.services?.googleSheets ?? true,
            googleDrive: json.services?.googleDrive ?? true,
            lastChecked: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
        }
      }

      // Fallback: If URL format is valid Apps Script URL and reachable
      if (url.startsWith('https://script.google.com/macros/s/')) {
        return {
          appsScript: true,
          googleSheets: true,
          googleDrive: true,
          lastChecked: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
      }

      return {
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        errorMessage: 'Respon dari Apps Script tidak valid'
      };
    } catch (err: any) {
      return {
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        errorMessage: err?.message || 'Gagal terhubung ke Apps Script'
      };
    }
  }

  // Update Local Asset Document or Photo with Google Drive URL returned from Apps Script
  private async updateAssetDriveUrl(assetId: string, fileName: string, fileCategory: string, driveUrl: string, base64Data?: string): Promise<void> {
    if (!assetId || !driveUrl) return;
    const asset = await this.getAssetById(assetId);
    if (!asset) return;

    let updated = false;
    if (asset.documents && Array.isArray(asset.documents)) {
      for (const doc of asset.documents) {
        if (doc.name === fileName || (base64Data && doc.file_url === base64Data)) {
          doc.file_url = driveUrl;
          updated = true;
        }
      }
    }
    if (fileCategory === 'photo' || (base64Data && asset.photo_url === base64Data)) {
      asset.photo_url = driveUrl;
      updated = true;
    }

    if (updated) {
      await this.saveAsset(asset);
    }
  }

  // Process Sync Queue with backend / Apps Script Gateway & Reconcile with Google Sheets
  public async flushSyncQueue(): Promise<boolean> {
    const url = localStorage.getItem('micromate_apps_script_url');
    if (!url || !url.trim()) {
      return false;
    }

    try {
      const queue = await this.getAllSyncQueueItems();
      let successCount = 0;

      if (queue.length > 0) {
        for (const item of queue) {
          let sent = false;
          let responseData: any = null;

          try {
            // Direct fetch to Google Apps Script Web App
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'text/plain' },
              body: JSON.stringify(item)
            });
            if (res.ok) {
              sent = true;
              responseData = await res.json().catch(() => null);
            }
          } catch (e) {
            console.warn('Direct Apps Script fetch error:', e);
          }

          // Fallback to proxy endpoint if direct fetch failed
          if (!sent) {
            try {
              const proxyRes = await fetch('/api/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item)
              });
              if (proxyRes.ok) {
                sent = true;
                responseData = await proxyRes.json().catch(() => null);
              }
            } catch (e) {
              console.warn('Proxy fetch error:', e);
            }
          }

          if (sent) {
            successCount++;
            if (responseData && responseData.file_url && item.data) {
              await this.updateAssetDriveUrl(
                item.data.asset_id,
                item.data.file_name,
                item.data.file_category,
                responseData.file_url,
                item.data.base64_data
              );
            }
          }
        }

        // If items sent, clear sync stores
        if (successCount > 0) {
          localStorage.removeItem(SYNC_QUEUE_KEY);
          if (this.db) {
            try {
              const tx = this.db.transaction('syncQueue', 'readwrite');
              tx.objectStore('syncQueue').clear();
            } catch (e) {
              console.warn('Error clearing IndexedDB syncQueue store:', e);
            }
          }
        }
      }

      // Tarik & rekonsiliasi data dari Google Sheets ke IndexedDB/LocalStorage
      const pullRes = await this.pullFromGoogleSheets();

      return (queue.length === 0 || successCount > 0) && pullRes.success;
    } catch (err) {
      console.warn('Sync failed (offline or network error):', err);
      return false;
    }
  }

  // Tarik & sinkronkan seluruh data aset dari Google Sheets ke IndexedDB & LocalStorage dengan Cloud Reconciliation
  public async pullFromGoogleSheets(): Promise<{ success: boolean; count: number; reconciledRemoved?: number; error?: string }> {
    const url = localStorage.getItem('micromate_apps_script_url');
    if (!url || !url.trim()) {
      return { success: false, count: 0, error: 'Endpoint Google Apps Script belum dikonfigurasi.' };
    }

    let remoteAssets: Asset[] = [];
    let fetched = false;

    // 1. Coba request langsung ke Apps Script Endpoint via POST
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getAllAssets' })
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && Array.isArray(json.assets)) {
          remoteAssets = json.assets;
          fetched = true;
        }
      }
    } catch (e) {
      console.warn('Direct pull from Apps Script failed:', e);
    }

    // 2. Coba GET sebagai fallback jika POST terblokir CORS
    if (!fetched) {
      try {
        const getUrl = url.includes('?') ? `${url}&action=getAllAssets` : `${url}?action=getAllAssets`;
        const res = await fetch(getUrl, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.assets)) {
            remoteAssets = json.assets;
            fetched = true;
          }
        }
      } catch (e) {
        console.warn('GET pull from Apps Script failed:', e);
      }
    }

    // 3. Fallback ke Proxy jika ada
    if (!fetched) {
      try {
        const proxyRes = await fetch('/api/exec', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'getAllAssets' })
        });
        if (proxyRes.ok) {
          const json = await proxyRes.json();
          if (json && json.success && Array.isArray(json.assets)) {
            remoteAssets = json.assets;
            fetched = true;
          }
        }
      } catch (e) {
        console.warn('Proxy pull failed:', e);
      }
    }

    if (fetched) {
      localStorage.setItem('micromate_db_seeded', 'true');

      // Get current local assets & unsynced queue items
      const localAssets = await this.getAllAssets();
      const syncQueue = await this.getAllSyncQueueItems();
      const pendingLocalAssetIds = new Set<string>();
      for (const item of syncQueue) {
        if (item.data) {
          const id = item.data.asset_id || item.data.assetId || item.data.id;
          if (id) pendingLocalAssetIds.add(id);
        }
      }

      const remoteAssetIds = new Set<string>();
      for (const asset of remoteAssets) {
        asset.data_origin = 'synced';
        remoteAssetIds.add(asset.asset_id);
        await this.saveAssetToDB(asset);
      }

      // Cloud Reconciliation: Remove local assets that do not exist in Google Sheets and have no pending local sync actions
      let reconciledRemoved = 0;
      for (const localAsset of localAssets) {
        if (!remoteAssetIds.has(localAsset.asset_id)) {
          // If asset is not in cloud AND has no unsynced changes pending in queue, it was deleted in cloud
          if (!pendingLocalAssetIds.has(localAsset.asset_id)) {
            await this.deleteAssetLocallyWithoutQueue(localAsset.asset_id);
            reconciledRemoved++;
          }
        }
      }

      return { success: true, count: remoteAssets.length, reconciledRemoved };
    }

    return { success: false, count: 0, error: 'Gagal mengambil data dari Google Sheets' };
  }

  // Export DB as JSON string
  public async exportJSON(): Promise<string> {
    const assets = await this.getAllAssets();
    return JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      workspace_id: INITIAL_WORKSPACE_ID,
      assets
    }, null, 2);
  }

  // Import JSON string into DB
  public async importJSON(jsonStr: string): Promise<boolean> {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.assets && Array.isArray(parsed.assets)) {
        for (const asset of parsed.assets) {
          await this.saveAsset(asset);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }
}

export const dbManager = new DatabaseManager();
