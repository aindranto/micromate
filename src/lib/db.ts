import { Asset, SyncQueueItem, SyncStatus, ServiceHealth, MaintenanceRecord, Reminder, AssetDocument, Document, Expense, SyncEntity, SyncQueueItemStatus, SyncErrorType, DeviceSession, CrossDomainTransaction } from '../types';
import { SEED_ASSETS, INITIAL_WORKSPACE_ID } from './seedData';
import { ConflictResolutionEngine } from './conflictResolution';
import { completeReminderState, dismissReminderState, normalizeRepeatRule } from './reminderDomain';
import { CreateMaintenanceInput, executeRecordServiceTransaction, recordOdometerCorrection } from './maintenanceDomain';
import { CrossDomainTransactionLedger, ReplayReconciler } from './transactionLedger';
import {
  CreateDocumentInput,
  UpdateDocumentMetadataInput,
  TransitionDocumentSyncStateInput,
  createCanonicalDocument,
  transitionDocumentSyncStatus,
  updateDocumentMetadata as updateDocMetadata,
  tombstoneDocument as tombstoneDoc,
  restoreDocument as restoreDoc,
  getActiveDocumentsForAsset,
  normalizeToCanonicalDocument,
} from './documentDomain';

const DB_NAME = 'MicroMateDB';
const DB_VERSION = 2;
const STORAGE_KEY = 'micromate_assets_v1';
const SYNC_QUEUE_KEY = 'micromate_sync_queue_v1';
const TOMBSTONES_KEY = 'micromate_deleted_tombstones_v1';
const TRANSACTION_LEDGER_KEY = 'micromate_txn_ledger_v1';

export class WorkspaceBoundaryViolationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkspaceBoundaryViolationError';
  }
}

export class DatabaseManager {
  private db: IDBDatabase | null = null;
  private isIndexedDBSupported = typeof window !== 'undefined' && 'indexedDB' in window;
  private isFlushing: boolean = false;
  private flushLockTimestamp: number = 0;
  private ledger: CrossDomainTransactionLedger = new CrossDomainTransactionLedger();

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
          const oldVersion = event.oldVersion;

          let assetStore: IDBObjectStore;
          if (!db.objectStoreNames.contains('assets')) {
            assetStore = db.createObjectStore('assets', { keyPath: 'asset_id' });
          } else {
            assetStore = (event.target as IDBOpenDBRequest).transaction!.objectStore('assets');
          }

          if (!db.objectStoreNames.contains('syncQueue')) {
            db.createObjectStore('syncQueue', { keyPath: 'id' });
          }

          // Invariant P0-2B-I01 & Opsi B: Create workspace_id index if missing
          if (!assetStore.indexNames.contains('workspace_id')) {
            assetStore.createIndex('workspace_id', 'workspace_id', { unique: false });
          }

          // Hydrate legacy records inside onupgradeneeded transition (v1 -> v2)
          if (oldVersion < 2) {
            const cursorReq = assetStore.openCursor();
            cursorReq.onsuccess = (e) => {
              const cursor = (e.target as IDBRequest<IDBCursorWithValue | null>).result;
              if (cursor) {
                const asset = cursor.value;
                let modified = false;
                // Invariant P0-2B-I05: Quarantine legacy data without guessing ownership
                if (!asset.workspace_id) {
                  asset.workspace_id = 'UNASSIGNED_QUARANTINE';
                  modified = true;
                }
                if (modified) {
                  cursor.update(asset);
                }
                cursor.continue();
              }
            };
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

  private validateWorkspaceId(workspaceId: any): string {
    if (workspaceId === undefined || workspaceId === null) {
      throw new WorkspaceBoundaryViolationError('Workspace ID is required and cannot be null or undefined.');
    }
    if (typeof workspaceId !== 'string') {
      throw new WorkspaceBoundaryViolationError('Workspace ID must be a string.');
    }
    const trimmed = workspaceId.trim();
    if (trimmed === '') {
      throw new WorkspaceBoundaryViolationError('Workspace ID cannot be empty or whitespace-only.');
    }
    return trimmed;
  }

  // Ensure seed data in IndexedDB if empty and not yet seeded
  private async ensureSeedDataIndexedDB(): Promise<void> {
    const isSeeded = localStorage.getItem('micromate_db_seeded');
    if (isSeeded === 'true') return;

    const assets = await this.getAllAssetsInternal();
    if (assets.length === 0) {
      for (const asset of SEED_ASSETS) {
        await this.saveAssetToDB(asset);
      }
      localStorage.setItem('micromate_db_seeded', 'true');
    }
  }

  // Get all active assets (enforcing Workspace Boundary)
  public async getAllAssets(workspaceId: string): Promise<Asset[]> {
    if (workspaceId === 'SYSTEM_ALL') {
      return this.getAllAssetsInternal();
    }
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    if (this.db) {
      return new Promise((resolve) => {
        try {
          const tx = this.db!.transaction('assets', 'readonly');
          const store = tx.objectStore('assets');
          
          // Get all records and filter in-memory to ensure legacy or cloud-synced assets without explicit workspace_id default to INITIAL_WORKSPACE_ID
          const request = store.getAll();

          request.onsuccess = () => {
            let list: Asset[] = request.result || [];
            list = list.filter((a) => {
              const assetWorkspace = a.workspace_id || INITIAL_WORKSPACE_ID;
              return assetWorkspace === validWorkspaceId;
            });
            resolve(list.filter((a) => !a.deleted));
          };

          request.onerror = () => {
            resolve(this.getAssetsLocalStorage(validWorkspaceId));
          };
        } catch (e) {
          resolve(this.getAssetsLocalStorage(validWorkspaceId));
        }
      });
    } else {
      return Promise.resolve(this.getAssetsLocalStorage(validWorkspaceId));
    }
  }

  private getAssetsLocalStorage(workspaceId: string): Asset[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed: Asset[] = JSON.parse(data);
      const filtered = parsed.filter((a) => !a.deleted);
      return filtered.filter((a) => (a.workspace_id || INITIAL_WORKSPACE_ID) === workspaceId);
    } catch {
      return [];
    }
  }

  private async getAllAssetsInternal(): Promise<Asset[]> {
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
            resolve(this.getAssetsLocalStorageInternal());
          };
        } catch (e) {
          resolve(this.getAssetsLocalStorageInternal());
        }
      });
    } else {
      return Promise.resolve(this.getAssetsLocalStorageInternal());
    }
  }

  private getAssetsLocalStorageInternal(): Asset[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed: Asset[] = JSON.parse(data);
      return parsed.filter((a) => !a.deleted);
    } catch {
      return [];
    }
  }

  private async getAssetByIdInternal(assetId: string): Promise<Asset | null> {
    const assets = await this.getAllAssetsInternal();
    return assets.find((a) => a.asset_id === assetId) || null;
  }

  // Get single asset by ID (with cross-workspace verification)
  public async getAssetById(assetId: string, workspaceId: string): Promise<Asset | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (asset && (asset.workspace_id || INITIAL_WORKSPACE_ID) !== validWorkspaceId) {
      return null;
    }
    return asset;
  }

  // Save/Update asset
  public async saveAsset(asset: Asset, workspaceId: string): Promise<void> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Asset workspace ID mismatch.`);
    }
    asset.updated_at = new Date().toISOString();
    if (!asset.data_origin) {
      asset.data_origin = asset.is_demo ? 'demo' : 'local';
    }

    if (!asset.history) asset.history = [];

    // Compare with existing asset to detect changes automatically
    const existingAsset = await this.getAssetByIdInternal(asset.asset_id);
    if (!existingAsset) {
      // New asset creation event
      if (asset.history.length === 0) {
        asset.history.push({
          event_id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          asset_id: asset.asset_id,
          asset_code: asset.asset_code,
          timestamp: asset.created_at || new Date().toISOString(),
          action: 'CREATED',
          field: 'Pendaftaran',
          new_value: asset.name,
          performed_by: asset.assigned_user || 'Sistem',
          notes: `Aset pertama kali didaftarkan ke sistem.`
        });
      }
    } else {
      if (existingAsset.workspace_id !== validWorkspaceId) {
        throw new WorkspaceBoundaryViolationError(`Unauthorized update: Asset belongs to workspace ${existingAsset.workspace_id}.`);
      }
      const nowIso = new Date().toISOString();

      // Detect User Change
      if ((existingAsset.assigned_user || '').trim() !== (asset.assigned_user || '').trim()) {
        const oldVal = existingAsset.assigned_user || 'Belum ditugaskan';
        const newVal = asset.assigned_user || 'Belum ditugaskan';
        asset.history.unshift({
          event_id: 'evt_' + Date.now() + '_u_' + Math.random().toString(36).substring(2, 6),
          asset_id: asset.asset_id,
          asset_code: asset.asset_code,
          timestamp: nowIso,
          action: 'USER_CHANGED',
          field: 'Pengguna',
          old_value: oldVal,
          new_value: newVal,
          performed_by: asset.assigned_user || 'Sistem',
          notes: `Perubahan penanggung jawab dari "${oldVal}" ke "${newVal}".`
        });
      }

      // Detect Status Change
      if (existingAsset.status !== asset.status) {
        const statusMap: Record<string, string> = {
          active: 'Aktif',
          stored: 'Disimpan',
          under_repair: 'Dalam Perawatan',
          sold: 'Dijual',
          disposed: 'Dihapus/Disimpan'
        };
        const oldVal = statusMap[existingAsset.status] || existingAsset.status;
        const newVal = statusMap[asset.status] || asset.status;
        asset.history.unshift({
          event_id: 'evt_' + Date.now() + '_s_' + Math.random().toString(36).substring(2, 6),
          asset_id: asset.asset_id,
          asset_code: asset.asset_code,
          timestamp: nowIso,
          action: 'STATUS_CHANGED',
          field: 'Status',
          old_value: oldVal,
          new_value: newVal,
          performed_by: asset.assigned_user || 'Sistem',
          notes: `Perubahan status aset dari "${oldVal}" menjadi "${newVal}".`
        });
      }

      // Detect Location Change
      if ((existingAsset.location || '').trim() !== (asset.location || '').trim()) {
        const oldVal = existingAsset.location || 'Tidak ditentukan';
        const newVal = asset.location || 'Tidak ditentukan';
        asset.history.unshift({
          event_id: 'evt_' + Date.now() + '_l_' + Math.random().toString(36).substring(2, 6),
          asset_id: asset.asset_id,
          asset_code: asset.asset_code,
          timestamp: nowIso,
          action: 'METADATA_CHANGED',
          field: 'Lokasi',
          old_value: oldVal,
          new_value: newVal,
          performed_by: asset.assigned_user || 'Sistem',
          notes: `Perubahan lokasi aset dari "${oldVal}" ke "${newVal}".`
        });
      }
    }

    await this.saveAssetToDB(asset);

    // Prepare a lightweight metadata payload for Google Sheets to prevent cell-limit / request size errors
    const syncAssetPayload = JSON.parse(JSON.stringify(asset));

    // If there is an unsynced base64 photo, queue it as a separate upload task to Google Drive
    if (asset.photo_url && asset.photo_url.startsWith('data:')) {
      const isPng = asset.photo_url.includes('image/png');
      const ext = isPng ? 'png' : 'jpg';
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const fileName = `${asset.asset_id}_photo_${Date.now()}.${ext}`;

      await this.addToSyncQueue(
        'uploadFile',
        {
          asset_id: asset.asset_id,
          asset_code: asset.asset_id,
          file_category: 'photo',
          file_name: fileName,
          mime_type: mime,
          base64_data: asset.photo_url,
          file_size: 0,
          workspace_id: validWorkspaceId
        },
        'DOCUMENT',
        `${asset.asset_id}_photo`,
        asset.asset_id,
        `MUT-UPLOAD-PHOTO-${asset.asset_id}`
      );
      
      // Strip base64 from Sheets row payload (it will be updated with the Drive URL once sync is flushed)
      syncAssetPayload.photo_url = '';
    }

    // Process unsynced base64 documents (Invariants I-A06-1, I-A06-2):
    // Queue uploadFile tasks to Google Drive for each document that has local base64 data
    if (asset.documents && Array.isArray(asset.documents)) {
      for (const doc of asset.documents as any[]) {
        const docFileUrl = doc.file_url || doc.local_file_ref;
        if (docFileUrl && typeof docFileUrl === 'string' && docFileUrl.startsWith('data:')) {
          const docId = doc.document_id || `doc_${Date.now()}`;
          const docName = doc.file_name || doc.name || `${asset.asset_id}_doc_${Date.now()}`;
          const docType = doc.document_type || doc.type || 'document';
          const isPdf = docFileUrl.includes('application/pdf');
          const isPng = docFileUrl.includes('image/png');
          const isJpg = docFileUrl.includes('image/jpeg') || docFileUrl.includes('image/jpg');
          const docMime = doc.mime_type || (isPdf ? 'application/pdf' : isPng ? 'image/png' : isJpg ? 'image/jpeg' : 'application/octet-stream');
          
          await this.addToSyncQueue(
            'uploadFile',
            {
              asset_id: asset.asset_id,
              asset_code: asset.asset_id,
              document_id: docId,
              file_category: docType,
              file_name: docName,
              mime_type: docMime,
              base64_data: docFileUrl,
              file_size: doc.file_size || 0,
              workspace_id: validWorkspaceId
            },
            'DOCUMENT',
            docId,
            asset.asset_id,
            `MUT-UPLOAD-DOC-${docId}`
          );
        }
      }
    }

    // Strip any unsynced base64 documents from Sheets payload (prevent cell overflow / request size errors)
    if (syncAssetPayload.documents && Array.isArray(syncAssetPayload.documents)) {
      for (const doc of syncAssetPayload.documents) {
        if (doc.file_url && typeof doc.file_url === 'string' && doc.file_url.startsWith('data:')) {
          doc.file_url = '';
        }
        if (doc.local_file_ref && typeof doc.local_file_ref === 'string' && doc.local_file_ref.startsWith('data:')) {
          doc.local_file_ref = '';
        }
      }
    }

    await this.addToSyncQueue('saveAsset', syncAssetPayload, 'ASSET', asset.asset_id, asset.asset_id);
  }

  // Check if workspace contains demo data
  public async hasDemoData(): Promise<boolean> {
    const assets = await this.getAllAssetsInternal();
    return assets.some((a) => 
      (a.is_demo || a.data_origin === 'demo' || ['ast_macbook_m2', 'ast_vario_160', 'ast_lg_ac_1pk', 'ast_sony_a7iv'].includes(a.asset_id)) && !a.deleted
    );
  }

  // Safely clear ONLY demo data (is_demo = true or data_origin = 'demo') without wiping user records
  public async clearDemoData(): Promise<number> {
    localStorage.setItem('micromate_db_seeded', 'true');
    const assets = await this.getAllAssetsInternal();
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
    const assets = await this.getAllAssetsInternal();
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
    const list = this.getAssetsLocalStorageInternal();
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

  // Tombstone Management (Prevents resurrection of locally deleted assets during remote sync)
  public recordDeletedAssetTombstone(assetId: string): void {
    if (!assetId) return;
    try {
      const existing = this.getDeletedAssetTombstones();
      existing.add(assetId);
      localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(Array.from(existing)));
    } catch (e) {}
  }

  public getDeletedAssetTombstones(): Set<string> {
    try {
      const raw = localStorage.getItem(TOMBSTONES_KEY);
      if (!raw) return new Set<string>();
      const list = JSON.parse(raw);
      return new Set<string>(Array.isArray(list) ? list : []);
    } catch {
      return new Set<string>();
    }
  }

  public isAssetTombstoned(assetId: string): boolean {
    if (!assetId) return false;
    return this.getDeletedAssetTombstones().has(assetId);
  }

  public clearDeletedAssetTombstone(assetId: string): void {
    if (!assetId) return;
    try {
      const existing = this.getDeletedAssetTombstones();
      existing.delete(assetId);
      localStorage.setItem(TOMBSTONES_KEY, JSON.stringify(Array.from(existing)));
    } catch (e) {}
  }

  // Delete asset (removes locally, records tombstone, and queues for Google Sheets sync)
  public async deleteAsset(assetId: string, workspaceId: string): Promise<void> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) {
      throw new WorkspaceBoundaryViolationError(`Asset ${assetId} not found.`);
    }
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Unauthorized mutation: Asset ${assetId} belongs to workspace ${asset.workspace_id}, not ${validWorkspaceId}.`);
    }
    localStorage.setItem('micromate_db_seeded', 'true');
    this.recordDeletedAssetTombstone(assetId);
    await this.deleteAssetLocallyWithoutQueue(assetId);
    await this.addToSyncQueue(
      'deleteAsset',
      { assetId, id: assetId, asset_id: assetId, workspace_id: validWorkspaceId },
      'ASSET',
      assetId,
      assetId
    );
  }

  // Reset to initial seed data (loads 4 demo assets)
  public async resetData(): Promise<void> {
    localStorage.removeItem('micromate_db_seeded');
    localStorage.removeItem(TOMBSTONES_KEY);
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

  // Factory reset: completely wipe all assets and start with an empty workspace
  public async clearAllData(): Promise<void> {
    localStorage.setItem('micromate_db_seeded', 'true');
    localStorage.removeItem(TOMBSTONES_KEY);
    if (this.db) {
      try {
        const tx = this.db.transaction('assets', 'readwrite');
        const store = tx.objectStore('assets');
        store.clear();
      } catch (e) {}
      try {
        const qTx = this.db.transaction('syncQueue', 'readwrite');
        qTx.objectStore('syncQueue').clear();
      } catch (e) {}
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem(SYNC_QUEUE_KEY);
  }

  // Phase 3C-3: Atomic Record Service Transaction (Historical Fact Engine)
  public async addMaintenanceRecord(
    assetId: string, 
    recordOrInput: MaintenanceRecord | CreateMaintenanceInput,
    workspaceId: string,
    options?: {
      mutationId?: string;
      allowOdometerCorrection?: boolean;
      correctionReason?: string;
      performedBy?: string;
    }
  ): Promise<{ updatedAsset: Asset; result: ReturnType<typeof executeRecordServiceTransaction> } | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) return null;
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Unauthorized maintenance record creation on Asset ${assetId}.`);
    }

    const maintId = (recordOrInput as MaintenanceRecord).maintenance_id;
    const mutationId = options?.mutationId || (`MUT-MAINT-CREATE-${maintId}`);

    const canonicalInput: CreateMaintenanceInput = {
      maintenance_id: maintId,
      asset_id: assetId,
      type: recordOrInput.type,
      date: recordOrInput.date,
      title: (recordOrInput as any).title,
      description: (recordOrInput as any).description,
      mileage: recordOrInput.mileage,
      subtotal: (recordOrInput as any).subtotal,
      tax: (recordOrInput as any).tax,
      discount: (recordOrInput as any).discount,
      cost: recordOrInput.cost,
      provider: recordOrInput.provider,
      provider_name: (recordOrInput as any).provider_name,
      technician_name: (recordOrInput as any).technician_name,
      notes: recordOrInput.notes,
      items: (recordOrInput as any).items,
      next_date: (recordOrInput as any).next_date,
      next_mileage: (recordOrInput as any).next_mileage,
      interval_km: (recordOrInput as any).interval_km,
      interval_days: (recordOrInput as any).interval_days,
      create_next_reminder: (recordOrInput as any).create_next_reminder,
    };

    // Register in Cross-Domain Transaction Ledger
    this.ledger.registerTransaction({
      mutation_id: mutationId,
      entity_type: 'MAINTENANCE',
      entity_id: maintId,
      asset_id: assetId,
      action: 'RECORD_SERVICE',
      payload: canonicalInput,
      status: 'PROCESSING',
    });

    // Reconcile / Idempotent execute
    const reconcileResult = ReplayReconciler.reconcileMaintenanceTransaction(
      asset,
      canonicalInput,
      {
        mutationId,
        allowOdometerCorrection: options?.allowOdometerCorrection,
        correctionReason: options?.correctionReason,
        performedBy: options?.performedBy,
      }
    );

    // Save atomical asset state
    await this.saveAsset(reconcileResult.reconciledAsset, validWorkspaceId);

    // Mark completed in Ledger
    this.ledger.updateTransactionStatus(
      mutationId,
      'COMPLETED',
      reconcileResult.evaluation.completed_steps
    );

    // Prepare domain result object
    const canonicalDomainResult = executeRecordServiceTransaction(asset, canonicalInput, {
      allowOdometerCorrection: options?.allowOdometerCorrection,
      correctionReason: options?.correctionReason,
      performedBy: options?.performedBy,
    });

    // Enqueue sync event with unique deterministic mutation_id
    await this.addToSyncQueue(
      'syncMaintenance',
      {
        id: maintId,
        maintenance_id: maintId,
        asset_id: assetId,
        service_type: canonicalDomainResult.maintenanceRecord.type,
        service_date: canonicalDomainResult.maintenanceRecord.date,
        cost: canonicalDomainResult.maintenanceRecord.cost,
        subtotal: canonicalDomainResult.maintenanceRecord.subtotal,
        tax: canonicalDomainResult.maintenanceRecord.tax,
        discount: canonicalDomainResult.maintenanceRecord.discount,
        mileage: canonicalDomainResult.maintenanceRecord.mileage,
        provider: canonicalDomainResult.maintenanceRecord.provider || '-',
        technician_name: canonicalDomainResult.maintenanceRecord.technician_name,
        notes: canonicalDomainResult.maintenanceRecord.notes || '',
        expense_id: canonicalDomainResult.linkedExpense.expense_id,
        workspace_id: validWorkspaceId
      },
      'MAINTENANCE',
      maintId,
      assetId,
      mutationId
    );

    return {
      updatedAsset: reconcileResult.reconciledAsset,
      result: canonicalDomainResult,
    };
  }

  // Get Transaction Ledger instance
  public getTransactionLedger(): CrossDomainTransactionLedger {
    return this.ledger;
  }

  // Delete Maintenance Record (Soft delete & adjust linked records)
  public async deleteMaintenanceRecord(
    assetId: string,
    maintenanceId: string,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Asset | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) return null;
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Unauthorized maintenance record deletion on Asset ${assetId}.`);
    }

    if (asset.maintenance_records) {
      const idx = asset.maintenance_records.findIndex((m) => m.maintenance_id === maintenanceId);
      if (idx >= 0) {
        asset.maintenance_records[idx].deleted = true;
        asset.maintenance_records[idx].updated_at = new Date().toISOString();

        // Also remove/mark linked expense
        if (asset.expenses) {
          asset.expenses = asset.expenses.filter(
            (e) => !(e.source_type === 'MAINTENANCE' && e.source_id === maintenanceId) && e.expense_id !== `exp_maint_${maintenanceId}`
          );
        }

        await this.saveAsset(asset, validWorkspaceId);

        const mutationId = options?.mutationId || (`MUT-MAINT-DELETE-${maintenanceId}`);
        await this.addToSyncQueue(
          'deleteMaintenance',
          { id: maintenanceId, asset_id: assetId, workspace_id: validWorkspaceId },
          'MAINTENANCE',
          maintenanceId,
          assetId,
          mutationId
        );
      }
    }
    return asset;
  }

  // Explicit Odometer Correction with Audit Trail
  public async correctOdometer(
    assetId: string,
    newMileage: number,
    reason: string,
    workspaceId: string,
    performedBy: string = 'User / Admin',
    options?: { mutationId?: string }
  ): Promise<{ updatedAsset: Asset; historyEvent: any } | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) return null;
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Unauthorized odometer correction on Asset ${assetId}.`);
    }

    const result = recordOdometerCorrection(asset, newMileage, reason, performedBy);
    await this.saveAsset(result.updatedAsset, validWorkspaceId);

    const mutationId = options?.mutationId || (`MUT-ODO-CORRECT-${assetId}-${Date.now()}`);
    await this.addToSyncQueue(
      'updateAsset',
      {
        asset_id: assetId,
        current_mileage: newMileage,
        correction_reason: reason,
        history_event_id: result.historyEvent.event_id,
        workspace_id: validWorkspaceId
      },
      'ASSET',
      assetId,
      assetId,
      mutationId
    );

    return result;
  }

  // --- Phase 3C-1 Reminder Domain Methods ---

  // Get all active reminders across all assets (isolated by workspace)
  public async getAllReminders(workspaceId: string): Promise<Reminder[]> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssets(validWorkspaceId);
    const reminders: Reminder[] = [];
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.reminders && asset.reminders.length > 0) {
        for (const rem of asset.reminders) {
          if (!rem.deleted) {
            reminders.push({
              ...rem,
              asset_name: rem.asset_name || asset.name,
              asset_id: rem.asset_id || asset.asset_id,
            });
          }
        }
      }
    }
    return reminders;
  }

  // Add/Create Reminder (Canonical Domain Method with workspace context)
  public async addReminder(
    assetId: string | undefined,
    reminder: Reminder,
    workspaceId: string,
    explicitMutationId?: string
  ): Promise<Reminder> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    let targetAssetId = assetId || reminder.asset_id;
    let targetAsset: Asset | null = null;

    if (targetAssetId) {
      targetAsset = await this.getAssetByIdInternal(targetAssetId);
    }

    if (!targetAsset) {
      const assets = await this.getAllAssets(validWorkspaceId);
      if (assets.length > 0) {
        targetAsset = assets[0];
        targetAssetId = targetAsset.asset_id;
      }
    }

    if (targetAsset) {
      if (targetAsset.workspace_id !== validWorkspaceId) {
        throw new WorkspaceBoundaryViolationError(`Unauthorized reminder assignment.`);
      }
      if (!targetAsset.reminders) targetAsset.reminders = [];
      reminder.asset_id = targetAsset.asset_id;
      reminder.asset_name = targetAsset.name;

      // Idempotency: avoid duplicates if reminder_id already exists
      const existingIdx = targetAsset.reminders.findIndex((r) => r.reminder_id === reminder.reminder_id);
      if (existingIdx >= 0) {
        targetAsset.reminders[existingIdx] = reminder;
      } else {
        targetAsset.reminders.unshift(reminder);
      }
      await this.saveAsset(targetAsset, validWorkspaceId);
    } else {
      throw new WorkspaceBoundaryViolationError(`No valid target asset found in workspace ${validWorkspaceId} for reminder creation.`);
    }

    const mutationId = explicitMutationId || (`MUT-REM-CREATE-${reminder.reminder_id}`);
    await this.addToSyncQueue(
      'syncReminder',
      {
        id: reminder.reminder_id,
        reminder_id: reminder.reminder_id,
        asset_id: targetAssetId || '',
        title: reminder.title,
        type: reminder.type,
        due_date: reminder.due_date,
        repeat_rule: reminder.repeat_rule,
        status: reminder.status || 'pending',
        notes: reminder.notes || '',
        next_due_at: reminder.next_due_at,
        last_completed_at: reminder.last_completed_at,
        workspace_id: validWorkspaceId
      },
      'REMINDER',
      reminder.reminder_id,
      targetAssetId || '',
      mutationId
    );

    return reminder;
  }

  // Complete Reminder (Canonical Domain Method with Recurrence Engine and workspace context)
  public async completeReminder(
    reminderId: string, 
    workspaceId: string,
    options?: { completedAt?: string; mutationId?: string }
  ): Promise<{ updatedReminder: Reminder | null; isRecurring: boolean }> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.reminders) {
        const remIdx = asset.reminders.findIndex((r) => r.reminder_id === reminderId);
        if (remIdx >= 0) {
          const rem = asset.reminders[remIdx];
          
          // Execute canonical transition via reminderDomain
          const transition = completeReminderState(rem, {
            completedAt: options?.completedAt,
          });

          asset.reminders[remIdx] = transition.updatedReminder;
          await this.saveAsset(asset, validWorkspaceId);

          const mutationId = options?.mutationId || (`MUT-REM-COMPLETE-${reminderId}-${Date.now()}`);
          await this.addToSyncQueue(
            'syncReminder',
            {
              id: transition.updatedReminder.reminder_id,
              reminder_id: transition.updatedReminder.reminder_id,
              asset_id: asset.asset_id,
              status: transition.updatedReminder.status,
              due_date: transition.updatedReminder.due_date,
              last_completed_at: transition.updatedReminder.last_completed_at,
              repeat_rule: transition.updatedReminder.repeat_rule,
              title: transition.updatedReminder.title,
              workspace_id: validWorkspaceId
            },
            'REMINDER',
            transition.updatedReminder.reminder_id,
            asset.asset_id,
            mutationId
          );

          return { updatedReminder: transition.updatedReminder, isRecurring: transition.isRecurring };
        }
      }
    }
    return { updatedReminder: null, isRecurring: false };
  }

  // Dismiss Reminder (Terminal Dismissal with workspace context)
  public async dismissReminder(
    reminderId: string,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Reminder | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.reminders) {
        const remIdx = asset.reminders.findIndex((r) => r.reminder_id === reminderId);
        if (remIdx >= 0) {
          const rem = asset.reminders[remIdx];
          const dismissed = dismissReminderState(rem);
          asset.reminders[remIdx] = dismissed;
          await this.saveAsset(asset, validWorkspaceId);

          const mutationId = options?.mutationId || (`MUT-REM-DISMISS-${reminderId}`);
          await this.addToSyncQueue(
            'syncReminder',
            {
              id: dismissed.reminder_id,
              reminder_id: dismissed.reminder_id,
              asset_id: asset.asset_id,
              status: 'dismissed',
              title: dismissed.title,
              workspace_id: validWorkspaceId
            },
            'REMINDER',
            dismissed.reminder_id,
            asset.asset_id,
            mutationId
          );

          return dismissed;
        }
      }
    }
    return null;
  }

  // Add Document to an Asset (Legacy compatibility + Canonical storage)
  public async addDocument(assetId: string, doc: AssetDocument | Document, workspaceId: string): Promise<Asset | null> {
    const canonicalDoc = normalizeToCanonicalDocument(doc);
    return this.createDocument(assetId, canonicalDoc, workspaceId);
  }

  // --- Phase 3D-1 Canonical Document Domain Methods ---

  // Create a canonical Document locally in LOCAL_ONLY state and register mutation
  public async createDocument(
    assetId: string,
    input: CreateDocumentInput | Document,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Asset | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) return null;
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Unauthorized document creation on Asset ${assetId}.`);
    }

    let doc: Document;
    if ('sync_status' in input && input.document_id) {
      doc = input as Document;
    } else {
      doc = createCanonicalDocument(input as CreateDocumentInput);
    }

    if (!asset.documents) asset.documents = [];

    // Idempotent insertion: update existing if present, else prepend
    const existingIdx = asset.documents.findIndex((d: any) => d.document_id === doc.document_id);
    if (existingIdx >= 0) {
      asset.documents[existingIdx] = doc;
    } else {
      asset.documents.unshift(doc);
    }

    await this.saveAsset(asset, validWorkspaceId);

    const mutationId = options?.mutationId || `MUT-DOCUMENT-CREATE-${doc.document_id}`;
    await this.addToSyncQueue(
      'syncDocument',
      {
        document_id: doc.document_id,
        asset_id: assetId,
        title: doc.title,
        file_name: doc.file_name,
        mime_type: doc.mime_type,
        file_size: doc.file_size,
        document_type: doc.document_type,
        sync_status: doc.sync_status,
        drive_file_id: doc.drive_file_id,
        drive_url: doc.drive_url,
        workspace_id: validWorkspaceId
      },
      'DOCUMENT',
      doc.document_id,
      assetId,
      mutationId
    );

    return asset;
  }

  // Get a single Document by ID
  public async getDocumentById(documentId: string, workspaceId: string): Promise<Document | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.documents) {
        const found = asset.documents.find((d: any) => d.document_id === documentId);
        if (found) {
          return normalizeToCanonicalDocument(found);
        }
      }
    }
    return null;
  }

  // Get all active documents for an asset (excluding tombstoned)
  public async getDocumentsByAsset(assetId: string, workspaceId: string, includeDeleted: boolean = false): Promise<Document[]> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) return [];
    if (asset.workspace_id !== validWorkspaceId) {
      throw new WorkspaceBoundaryViolationError(`Unauthorized document read on Asset ${assetId}.`);
    }
    if (!asset.documents) return [];

    const normalized = asset.documents.map(normalizeToCanonicalDocument);
    return includeDeleted ? normalized : normalized.filter((d) => !d.deleted);
  }

  // Update Document metadata
  public async updateDocumentMetadata(
    documentId: string,
    input: UpdateDocumentMetadataInput,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Document | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.documents) {
        const docIdx = asset.documents.findIndex((d: any) => d.document_id === documentId);
        if (docIdx >= 0) {
          const currentDoc = normalizeToCanonicalDocument(asset.documents[docIdx]);
          const updated = updateDocMetadata(currentDoc, input);
          asset.documents[docIdx] = updated;
          await this.saveAsset(asset, validWorkspaceId);

          const mutationId = options?.mutationId || `MUT-DOCUMENT-UPDATE-${documentId}`;
          await this.addToSyncQueue(
            'syncDocument',
            {
              document_id: documentId,
              asset_id: asset.asset_id,
              title: updated.title,
              document_type: updated.document_type,
              metadata: updated.metadata,
              updated_at: updated.updated_at,
              workspace_id: validWorkspaceId
            },
            'DOCUMENT',
            documentId,
            asset.asset_id,
            mutationId
          );

          return updated;
        }
      }
    }
    return null;
  }

  // Transition Document sync lifecycle state
  public async transitionDocumentSyncState(
    documentId: string,
    transition: TransitionDocumentSyncStateInput,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Document | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.documents) {
        const docIdx = asset.documents.findIndex((d: any) => d.document_id === documentId);
        if (docIdx >= 0) {
          const currentDoc = normalizeToCanonicalDocument(asset.documents[docIdx]);
          const updated = transitionDocumentSyncStatus(currentDoc, transition);
          asset.documents[docIdx] = updated;
          await this.saveAsset(asset, validWorkspaceId);

          const mutationId = options?.mutationId || `MUT-DOCUMENT-STATUS-${documentId}-${updated.sync_status}`;
          await this.addToSyncQueue(
            'syncDocument',
            {
              document_id: documentId,
              asset_id: asset.asset_id,
              sync_status: updated.sync_status,
              drive_file_id: updated.drive_file_id,
              drive_url: updated.drive_url,
              thumbnail_url: updated.thumbnail_url,
              workspace_id: validWorkspaceId
            },
            'DOCUMENT',
            documentId,
            asset.asset_id,
            mutationId
          );

          return updated;
        }
      }
    }
    return null;
  }

  // Tombstone delete a document
  public async deleteDocument(
    documentId: string,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Document | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.documents) {
        const docIdx = asset.documents.findIndex((d: any) => d.document_id === documentId);
        if (docIdx >= 0) {
          const currentDoc = normalizeToCanonicalDocument(asset.documents[docIdx]);
          const deleted = tombstoneDoc(currentDoc);
          asset.documents[docIdx] = deleted;
          await this.saveAsset(asset, validWorkspaceId);

          const mutationId = options?.mutationId || `MUT-DOCUMENT-DELETE-${documentId}`;
          await this.addToSyncQueue(
            'deleteDocument',
            {
              document_id: documentId,
              asset_id: asset.asset_id,
              deleted: true,
              workspace_id: validWorkspaceId
            },
            'DOCUMENT',
            documentId,
            asset.asset_id,
            mutationId
          );

          return deleted;
        }
      }
    }
    return null;
  }

  // Restore a tombstoned document
  public async restoreDocument(
    documentId: string,
    workspaceId: string,
    options?: { mutationId?: string }
  ): Promise<Document | null> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssetsInternal();
    for (const asset of assets) {
      if (asset.workspace_id !== validWorkspaceId) continue;
      if (asset.documents) {
        const docIdx = asset.documents.findIndex((d: any) => d.document_id === documentId);
        if (docIdx >= 0) {
          const currentDoc = normalizeToCanonicalDocument(asset.documents[docIdx]);
          const restored = restoreDoc(currentDoc);
          asset.documents[docIdx] = restored;
          await this.saveAsset(asset, validWorkspaceId);

          const mutationId = options?.mutationId || `MUT-DOCUMENT-RESTORE-${documentId}`;
          await this.addToSyncQueue(
            'syncDocument',
            {
              document_id: documentId,
              asset_id: asset.asset_id,
              deleted: false,
              workspace_id: validWorkspaceId
            },
            'DOCUMENT',
            documentId,
            asset.asset_id,
            mutationId
          );

          return restored;
        }
      }
    }
    return null;
  }

  // Sync Queue Management (Phase 2D Architecture)
  public async addToSyncQueue(
    action: string, 
    data: any, 
    explicitEntity?: SyncEntity, 
    explicitEntityId?: string, 
    explicitAssetId?: string, 
    explicitMutationId?: string
  ): Promise<SyncQueueItem> {
    let entity: SyncEntity = explicitEntity || 'GENERAL';
    let entityId = explicitEntityId || '';
    let assetId = explicitAssetId || '';

    if (!explicitEntity) {
      if (action === 'saveAsset' || action === 'syncAsset') {
        entity = 'ASSET';
        entityId = data?.asset_id || data?.id || '';
        assetId = entityId;
      } else if (action === 'deleteAsset') {
        entity = 'ASSET';
        entityId = data?.assetId || data?.asset_id || data?.id || '';
        assetId = entityId;
      } else if (action === 'syncMaintenance' || action === 'addMaintenance') {
        entity = 'SERVICE';
        entityId = data?.maintenance_id || data?.id || '';
        assetId = data?.asset_id || '';
      } else if (action === 'syncReminder' || action === 'addReminder') {
        entity = 'REMINDER';
        entityId = data?.reminder_id || data?.id || '';
        assetId = data?.asset_id || '';
      } else if (action === 'uploadFile') {
        entity = 'DOCUMENT';
        entityId = data?.document_id || (data?.file_name ? `${data?.asset_id}_${data?.file_name}` : ('doc_' + Date.now()));
        assetId = data?.asset_id || '';
      } else if (action === 'syncExpense' || action === 'addExpense') {
        entity = 'EXPENSE';
        entityId = data?.expense_id || data?.id || '';
        assetId = data?.asset_id || '';
      }
    }

    const nowIso = new Date().toISOString();
    const mutationId = explicitMutationId || ('MUT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase());

    // Invariant I-A06-3: Idempotent queueing if mutation_id already exists in queue
    if (explicitMutationId) {
      const existingQueue = await this.getAllSyncQueueItems();
      const existingItem = existingQueue.find(i => i.mutation_id === explicitMutationId && (i.status === 'PENDING' || i.status === 'PROCESSING' || i.status === 'FAILED_RETRYABLE'));
      if (existingItem) {
        return existingItem;
      }
    }

    const queueId = 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const derivedWorkspaceId = (data?.workspace_id || data?.workspaceId || '').trim();
    const finalWorkspaceId = derivedWorkspaceId !== '' ? derivedWorkspaceId : INITIAL_WORKSPACE_ID;

    const queueItem: SyncQueueItem = {
      id: queueId,
      mutation_id: mutationId,
      action,
      entity,
      entity_id: entityId,
      asset_id: assetId,
      workspaceId: finalWorkspaceId,
      data: {
        ...data,
        mutation_id: mutationId,
        mutationId: mutationId
      },
      created_at: nowIso,
      timestamp: nowIso,
      retry_count: 0,
      retryCount: 0,
      status: 'PENDING'
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

    return queueItem;
  }

  // Pending Mutation Protection: Check if an entity has pending unsynced changes
  public async hasPendingMutation(entity: SyncEntity | string, entityId: string): Promise<boolean> {
    const queue = await this.getAllSyncQueueItems();
    return queue.some(item => {
      const isPending = item.status === 'PENDING' || item.status === 'PROCESSING' || item.status === 'FAILED_RETRYABLE';
      if (!isPending) return false;

      if (entity === 'ASSET') {
        return (item.entity === 'ASSET' && (item.entity_id === entityId || item.asset_id === entityId)) ||
               (item.asset_id === entityId && item.action === 'deleteAsset');
      }
      return item.entity === entity && item.entity_id === entityId;
    });
  }

  // Exponential Backoff Schedule: 5s, 15s, 60s, 120s, 300s
  public calculateBackoffDelaySeconds(retryCount: number): number {
    if (retryCount <= 1) return 5;
    if (retryCount === 2) return 15;
    if (retryCount === 3) return 60;
    if (retryCount === 4) return 120;
    return 300; // Attempt 5+ -> 5 minutes
  }

  // Error Classification: Retryable vs Non-Retryable
  public classifySyncError(errorStatus: number | string, errorMessage: string): { isRetryable: boolean; type: SyncErrorType } {
    const msg = String(errorMessage || '').toLowerCase();
    const statusNum = typeof errorStatus === 'number' ? errorStatus : parseInt(String(errorStatus), 10);

    // Non-retryable status codes or messages (e.g. 400 Bad Request, 401 Unauthorized, 403 Forbidden, 422 Unprocessable)
    if (
      statusNum === 400 || 
      statusNum === 401 || 
      statusNum === 403 || 
      statusNum === 422 ||
      msg.includes('session_expired') ||
      msg.includes('session_not_found') ||
      msg.includes('session_revoked') ||
      msg.includes('invalid_token') ||
      msg.includes('token sesi diperlukan') ||
      msg.includes('validation_error') ||
      msg.includes('unknown_action') ||
      msg.includes('malformed') ||
      msg.includes('post_body_empty') ||
      msg.includes('invalid_record')
    ) {
      return { isRetryable: false, type: 'NON_RETRYABLE' };
    }

    // Retryable errors: Network offline, 5xx server errors, timeout, 429 rate limit
    return { isRetryable: true, type: 'RETRYABLE' };
  }

  private addSyncQueueLocalStorage(item: SyncQueueItem) {
    const items = this.getSyncQueueLocalStorage();
    items.push(item);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
  }

  public async updateSyncQueueItem(item: SyncQueueItem): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        tx.objectStore('syncQueue').put(item);
      } catch (e) {
        this.updateSyncQueueLocalStorage(item);
      }
    } else {
      this.updateSyncQueueLocalStorage(item);
    }
  }

  private updateSyncQueueLocalStorage(item: SyncQueueItem) {
    const items = this.getSyncQueueLocalStorage();
    const idx = items.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      items[idx] = item;
    } else {
      items.push(item);
    }
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
  }

  public async removeSyncQueueItem(itemId: string): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction('syncQueue', 'readwrite');
        tx.objectStore('syncQueue').delete(itemId);
      } catch (e) {}
    }
    const items = this.getSyncQueueLocalStorage().filter((i) => i.id !== itemId);
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(items));
  }

  public async retryQueueItem(itemId: string): Promise<boolean> {
    const items = await this.getAllSyncQueueItems();
    const item = items.find(i => i.id === itemId);
    if (!item) return false;

    item.status = 'PENDING';
    item.retry_count = 0;
    item.retryCount = 0;
    item.next_retry_at = undefined;
    item.nextRetryAt = undefined;
    item.last_error = undefined;
    item.lastError = undefined;
    item.processing_started_at = undefined;
    await this.updateSyncQueueItem(item);
    return true;
  }

  public async retryAllFailedQueueItems(): Promise<number> {
    const items = await this.getAllSyncQueueItems();
    let count = 0;
    for (const item of items) {
      if (item.status === 'FAILED_PERMANENT' || item.status === 'FAILED_RETRYABLE') {
        item.status = 'PENDING';
        item.retry_count = 0;
        item.retryCount = 0;
        item.next_retry_at = undefined;
        item.nextRetryAt = undefined;
        item.last_error = undefined;
        item.lastError = undefined;
        item.processing_started_at = undefined;
        await this.updateSyncQueueItem(item);
        count++;
      }
    }
    return count;
  }

  public async clearQueueItem(itemId: string): Promise<void> {
    await this.removeSyncQueueItem(itemId);
  }

  public async clearAllFailedQueueItems(): Promise<void> {
    const items = await this.getAllSyncQueueItems();
    for (const item of items) {
      if (item.status === 'FAILED_PERMANENT' || item.status === 'FAILED_RETRYABLE') {
        await this.removeSyncQueueItem(item.id);
      }
    }
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

  public async getQueueDiagnostics(): Promise<{
    total: number;
    pending: number;
    processing: number;
    failedRetryable: number;
    failedPermanent: number;
    oldestItemDate?: string;
  }> {
    const items = await this.getAllSyncQueueItems();
    let pending = 0;
    let processing = 0;
    let failedRetryable = 0;
    let failedPermanent = 0;
    let oldest: string | undefined;

    for (const item of items) {
      if (item.status === 'PENDING' || !item.status) pending++;
      else if (item.status === 'PROCESSING') processing++;
      else if (item.status === 'FAILED_RETRYABLE') failedRetryable++;
      else if (item.status === 'FAILED_PERMANENT') failedPermanent++;

      const dateStr = item.created_at || item.timestamp;
      if (dateStr && (!oldest || dateStr < oldest)) {
        oldest = dateStr;
      }
    }

    return {
      total: items.length,
      pending,
      processing,
      failedRetryable,
      failedPermanent,
      oldestItemDate: oldest
    };
  }

  // Helper to check local verified status
  public isConnectionVerified(): boolean {
    const verified = localStorage.getItem('micromate_connection_verified');
    const url = localStorage.getItem('micromate_apps_script_url');
    return Boolean(verified === 'true' && url && url.trim());
  }

  public getMaskedOwnerEmail(): string {
    return localStorage.getItem('micromate_owner_email_masked') || '';
  }

  public disconnectGateway(): void {
    localStorage.removeItem('micromate_connection_verified');
    localStorage.removeItem('micromate_owner_email_masked');
    localStorage.removeItem('micromate_verified_at');
    localStorage.removeItem('micromate_access_token');
  }

  // Revoke active session on server & local
  public async revokeCurrentSession(): Promise<{ success: boolean; message?: string; error?: string }> {
    const url = localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';

    if (url && token) {
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: JSON.stringify({ action: 'revokeSession', token })
        }).catch(() => null);
      } catch (e) {}
    }

    this.disconnectGateway();
    return { success: true, message: 'Sesi saat ini berhasil diputuskan.' };
  }

  // Fetch all active & historical device sessions from Google Sheets
  public async getRemoteSessions(): Promise<{ success: boolean; sessions?: DeviceSession[]; error?: string; message?: string }> {
    const url = localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';

    if (!url || !url.trim()) {
      return { success: false, error: 'NO_URL', message: 'Apps Script URL belum dimasukkan.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getSessions', token })
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.success && Array.isArray(json.sessions)) {
          return { success: true, sessions: json.sessions };
        }
      }

      // Proxy Fallback
      const proxyRes = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apps-Script-Url': url || ''
        },
        body: JSON.stringify({ action: 'getSessions', token })
      }).catch(() => null);

      if (proxyRes && proxyRes.ok) {
        const json = await proxyRes.json().catch(() => null);
        if (json && json.success && Array.isArray(json.sessions)) {
          return { success: true, sessions: json.sessions };
        }
      }

      return { success: false, error: 'FETCH_SESSIONS_FAILED', message: 'Gagal memuat daftar sesi dari Google Sheets.' };
    } catch (e: any) {
      return { success: false, error: 'NETWORK_ERROR', message: e?.message || 'Gagal memuat sesi perangkat.' };
    }
  }

  // Revoke a specific remote device session by hash
  public async revokeRemoteSession(targetSessionHash: string): Promise<{ success: boolean; message?: string; error?: string }> {
    const url = localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';

    if (!url || !url.trim()) {
      return { success: false, error: 'NO_URL', message: 'Apps Script URL belum dikonfigurasi.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'revokeRemoteSession', token, target_session_hash: targetSessionHash })
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.success) {
          return { success: true, message: json.message || 'Sesi perangkat berhasil diputuskan.' };
        }
      }

      // Proxy Fallback
      const proxyRes = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apps-Script-Url': url || ''
        },
        body: JSON.stringify({ action: 'revokeRemoteSession', token, target_session_hash: targetSessionHash })
      }).catch(() => null);

      if (proxyRes && proxyRes.ok) {
        const json = await proxyRes.json().catch(() => null);
        if (json && json.success) {
          return { success: true, message: json.message || 'Sesi perangkat berhasil diputuskan.' };
        }
      }

      return { success: false, error: 'REVOKE_FAILED', message: 'Gagal memutuskan sesi perangkat jarak jauh.' };
    } catch (e: any) {
      return { success: false, error: 'NETWORK_ERROR', message: e?.message || 'Gagal mengirim permintaan pencabutan sesi.' };
    }
  }

  // Gateway Action: identify (Get owner info & masked email)
  public async identifyGateway(targetUrl?: string): Promise<{
    success: boolean;
    emailMasked?: string;
    services?: { appsScript: boolean; googleSheets: boolean; googleDrive: boolean };
    error?: string;
    message?: string;
  }> {
    const url = targetUrl || localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';

    if (!url || !url.trim()) {
      return { success: false, error: 'NO_URL', message: 'Apps Script Web App URL belum dimasukkan.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'identify', token })
      }).catch(() => null);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json) return json;
      }

      // GET Fallback
      const getUrl = url.includes('?')
        ? `${url}&action=identify&token=${encodeURIComponent(token)}`
        : `${url}?action=identify&token=${encodeURIComponent(token)}`;
      const getRes = await fetch(getUrl, { method: 'GET' }).catch(() => null);
      if (getRes && getRes.ok) {
        const json = await getRes.json().catch(() => null);
        if (json) return json;
      }

      // Proxy Fallback
      const proxyRes = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apps-Script-Url': url || ''
        },
        body: JSON.stringify({ action: 'identify', token })
      }).catch(() => null);
      if (proxyRes && proxyRes.ok) {
        const json = await proxyRes.json().catch(() => null);
        if (json) return json;
      }

      return { success: false, error: 'CONNECTION_FAILED', message: 'Tidak dapat menghubungkan ke endpoint Apps Script URL.' };
    } catch (e: any) {
      return { success: false, error: 'NETWORK_ERROR', message: e?.message || 'Gagal terhubung ke Apps Script.' };
    }
  }

  // Gateway Action: requestOtp
  public async requestOtp(targetUrl?: string): Promise<{
    success: boolean;
    emailMasked?: string;
    expiresIn?: number;
    error?: string;
    message?: string;
    waitSeconds?: number;
  }> {
    const url = targetUrl || localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';

    if (!url || !url.trim()) {
      return { success: false, error: 'NO_URL', message: 'Apps Script Web App URL belum dimasukkan.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'requestOtp', token })
      }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        if (json && json.emailMasked) {
          localStorage.setItem('micromate_owner_email_masked', json.emailMasked);
        }
        return json;
      }

      // Proxy Fallback
      const proxyRes = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apps-Script-Url': url || ''
        },
        body: JSON.stringify({ action: 'requestOtp', token })
      }).catch(() => null);
      if (proxyRes && proxyRes.ok) {
        const json = await proxyRes.json().catch(() => null);
        if (json) {
          if (json.emailMasked) {
            localStorage.setItem('micromate_owner_email_masked', json.emailMasked);
          }
          return json;
        }
      }

      return { success: false, error: 'HTTP_ERROR', message: 'Gagal mengirim permintaan OTP ke Apps Script.' };
    } catch (e: any) {
      return { success: false, error: 'NETWORK_ERROR', message: e?.message || 'Network error saat meminta OTP.' };
    }
  }

  // Gateway Action: verifyOtp
  public async verifyOtp(otp: string, targetUrl?: string): Promise<{
    success: boolean;
    verified?: boolean;
    emailMasked?: string;
    error?: string;
    message?: string;
    attemptsRemaining?: number;
  }> {
    const url = targetUrl || localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';

    if (!url || !url.trim()) {
      return { success: false, error: 'NO_URL', message: 'Apps Script Web App URL belum dimasukkan.' };
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'verifyOtp', otp: otp.trim(), token })
      }).catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        if (json && json.success && json.verified) {
          localStorage.setItem('micromate_connection_verified', 'true');
          if (json.session_token) {
            localStorage.setItem('micromate_access_token', json.session_token);
          }
          if (json.emailMasked) {
            localStorage.setItem('micromate_owner_email_masked', json.emailMasked);
          }
          localStorage.setItem('micromate_verified_at', new Date().toISOString());
        }
        return json;
      }

      // Proxy Fallback
      const proxyRes = await fetch('/api/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Apps-Script-Url': url || ''
        },
        body: JSON.stringify({ action: 'verifyOtp', otp: otp.trim(), token })
      }).catch(() => null);
      if (proxyRes && proxyRes.ok) {
        const json = await proxyRes.json().catch(() => null);
        if (json) {
          if (json.success && json.verified) {
            localStorage.setItem('micromate_connection_verified', 'true');
            if (json.session_token) {
              localStorage.setItem('micromate_access_token', json.session_token);
            }
            if (json.emailMasked) {
              localStorage.setItem('micromate_owner_email_masked', json.emailMasked);
            }
            localStorage.setItem('micromate_verified_at', new Date().toISOString());
          }
          return json;
        }
      }

      return { success: false, error: 'HTTP_ERROR', message: 'Respon verifikasi OTP dari server gagal.' };
    } catch (e: any) {
      return { success: false, error: 'NETWORK_ERROR', message: e?.message || 'Gagal memverifikasi OTP.' };
    }
  }

  // Check Health status of Apps Script, Sheets, Drive, and Email Ownership
  public async checkHealth(targetUrl?: string): Promise<ServiceHealth> {
    const url = targetUrl || localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';
    const isVerified = this.isConnectionVerified();
    const maskedEmail = this.getMaskedOwnerEmail();
    const verifiedAt = localStorage.getItem('micromate_verified_at') || undefined;

    if (!url || !url.trim()) {
      return {
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        emailOwnership: false,
        connectionStatus: 'DISCONNECTED',
        errorMessage: 'Apps Script Web App URL belum dikonfigurasi'
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const healthUrl = url.includes('?') 
        ? `${url}&action=health&token=${encodeURIComponent(token)}` 
        : `${url}?action=health&token=${encodeURIComponent(token)}`;
      const res = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (res && res.ok) {
        const json = await res.json().catch(() => null);
        if (json && (json.status === 'ok' || json.success)) {
          const emailMask = json.emailMasked || maskedEmail;
          if (emailMask) {
            localStorage.setItem('micromate_owner_email_masked', emailMask);
          }
          return {
            appsScript: true,
            googleSheets: json.services?.googleSheets ?? true,
            googleDrive: json.services?.googleDrive ?? true,
            emailOwnership: isVerified,
            maskedEmail: emailMask,
            verifiedAt: verifiedAt,
            connectionStatus: isVerified ? 'VERIFIED' : 'CONNECTING',
            lastChecked: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          };
        }
      }

      // If GET failed or CORS restricted, attempt POST health probe
      const postRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'health', token })
      }).catch(() => null);

      if (postRes && postRes.ok) {
        const json = await postRes.json().catch(() => null);
        if (json && (json.status === 'ok' || json.success)) {
          const emailMask = json.emailMasked || maskedEmail;
          if (emailMask) {
            localStorage.setItem('micromate_owner_email_masked', emailMask);
          }
          return {
            appsScript: true,
            googleSheets: json.services?.googleSheets ?? true,
            googleDrive: json.services?.googleDrive ?? true,
            emailOwnership: isVerified,
            maskedEmail: emailMask,
            verifiedAt: verifiedAt,
            connectionStatus: isVerified ? 'VERIFIED' : 'CONNECTING',
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
          emailOwnership: isVerified,
          maskedEmail: maskedEmail,
          verifiedAt: verifiedAt,
          connectionStatus: isVerified ? 'VERIFIED' : 'CONNECTING',
          lastChecked: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        };
      }

      return {
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        emailOwnership: false,
        connectionStatus: 'ERROR',
        errorMessage: 'Respon dari Apps Script tidak valid'
      };
    } catch (err: any) {
      return {
        appsScript: false,
        googleSheets: false,
        googleDrive: false,
        emailOwnership: false,
        connectionStatus: 'ERROR',
        errorMessage: err?.message || 'Gagal terhubung ke Apps Script'
      };
    }
  }

  // Update Local Asset Document or Photo with Google Drive URL returned from Apps Script
  private async updateAssetDriveUrl(
    assetId: string,
    fileName: string,
    fileCategory: string,
    driveUrl: string,
    base64Data?: string,
    documentId?: string,
    driveFileId?: string,
    thumbnailUrl?: string
  ): Promise<void> {
    if (!assetId || !driveUrl) return;
    const asset = await this.getAssetByIdInternal(assetId);
    if (!asset) return;

    let updated = false;
    if (asset.documents && Array.isArray(asset.documents)) {
      for (const doc of asset.documents as any[]) {
        if (
          (documentId && doc.document_id === documentId) ||
          (fileName && (doc.name === fileName || doc.file_name === fileName)) ||
          (base64Data && (doc.file_url === base64Data || doc.local_file_ref === base64Data))
        ) {
          doc.file_url = driveUrl;
          doc.drive_url = driveUrl;
          if (driveFileId) doc.drive_file_id = driveFileId;
          if (thumbnailUrl) doc.thumbnail_url = thumbnailUrl;
          doc.sync_status = 'SYNCED';
          updated = true;
        }
      }
    }
    if (fileCategory === 'photo' || (base64Data && asset.photo_url === base64Data)) {
      asset.photo_url = driveUrl;
      updated = true;
    }

    if (updated) {
      await this.saveAssetToDB(asset);
    }
  }

  // Process Sync Queue with backend / Apps Script Gateway & Reconcile with Google Sheets (Phase 2D Engine)
  public async flushSyncQueue(): Promise<{ success: boolean; processed: number; failed: number; skipped: number; reason?: string }> {
    const url = localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';
    if (!url || !url.trim()) {
      return { success: false, processed: 0, failed: 0, skipped: 0, reason: 'NO_APPS_SCRIPT_URL' };
    }

    // Client Mutex Lock Check (prevent overlapping flush loops)
    const nowMs = Date.now();
    if (this.isFlushing && (nowMs - this.flushLockTimestamp < 30000)) {
      console.warn('[SyncEngine] Concurrent flushSyncQueue() blocked by client mutex.');
      return { success: false, processed: 0, failed: 0, skipped: 0, reason: 'CONCURRENT_MUTEX_LOCKED' };
    }

    this.isFlushing = true;
    this.flushLockTimestamp = Date.now();

    try {
      const queue = await this.getAllSyncQueueItems();
      const nowIso = new Date().toISOString();
      const nowTime = Date.now();

      // Stale lease recovery: items stuck in 'PROCESSING' for > 60s
      for (const item of queue) {
        if (item.status === 'PROCESSING') {
          const startedAt = item.processing_started_at ? new Date(item.processing_started_at).getTime() : 0;
          if (nowTime - startedAt > 60000) {
            item.status = 'PENDING';
            item.processing_started_at = undefined;
            await this.updateSyncQueueItem(item);
          }
        }
      }

      // Filter eligible items (PENDING, or FAILED_RETRYABLE with next_retry_at <= now)
      const eligibleItems = queue.filter(item => {
        if (item.status === 'FAILED_PERMANENT' || item.status === 'COMPLETED') return false;
        if (item.status === 'PENDING' || !item.status) return true;
        if (item.status === 'FAILED_RETRYABLE') {
          const nextRetry = item.next_retry_at || item.nextRetryAt;
          return !nextRetry || nextRetry <= nowIso;
        }
        return false;
      });

      // Strict FIFO sorting by created_at ASC
      eligibleItems.sort((a, b) => {
        const timeA = new Date(a.created_at || a.timestamp || 0).getTime();
        const timeB = new Date(b.created_at || b.timestamp || 0).getTime();
        return timeA - timeB;
      });

      let processedCount = 0;
      let failedCount = 0;
      const skippedCount = queue.length - eligibleItems.length;

      for (const item of eligibleItems) {
        // Mark status as PROCESSING with timestamp lease
        item.status = 'PROCESSING';
        item.processing_started_at = new Date().toISOString();
        await this.updateSyncQueueItem(item);

        let sent = false;
        let responseData: any = null;
        let errorMessage = '';
        let errorStatusCode: number | string = 0;

        const effectiveData = { ...(item.data || {}) };
        const targetAssetId = item.asset_id || effectiveData.asset_id;
        if ((item.action === 'saveAsset' || item.action === 'syncAsset') && targetAssetId) {
          const latestLocal = await this.getAssetByIdInternal(targetAssetId);
          if (latestLocal) {
            if (latestLocal.photo_url && !latestLocal.photo_url.startsWith('data:')) {
              effectiveData.photo_url = latestLocal.photo_url;
            }
            if (latestLocal.documents && Array.isArray(latestLocal.documents)) {
              effectiveData.documents = latestLocal.documents.map((d: any) => ({
                ...d,
                file_url: (d.file_url && !d.file_url.startsWith('data:')) ? d.file_url : (d.drive_url || ''),
                local_file_ref: undefined
              }));
            }
          }
        }

        const payloadWithToken = {
          ...item,
          data: effectiveData,
          mutation_id: item.mutation_id,
          mutationId: item.mutation_id,
          entity: item.entity,
          entity_id: item.entity_id,
          asset_id: item.asset_id,
          token
        };

        // 1. Direct fetch to Apps Script Web App
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payloadWithToken)
          });

          errorStatusCode = res.status;

          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json && (json.success === true || json.status === 'ok' || json.duplicated === true)) {
              sent = true;
              responseData = json;
            } else if (json && json.error) {
              errorMessage = json.error;
            }
          } else {
            errorMessage = `HTTP ${res.status}`;
          }
        } catch (e: any) {
          errorMessage = e?.message || 'Direct Apps Script fetch error';
        }

        // 2. Proxy Fallback if direct fetch failed
        if (!sent) {
          try {
            const proxyRes = await fetch('/api/exec', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Apps-Script-Url': url || ''
              },
              body: JSON.stringify(payloadWithToken)
            });

            errorStatusCode = proxyRes.status;

            if (proxyRes.ok) {
              const json = await proxyRes.json().catch(() => null);
              if (json && (json.success === true || json.status === 'ok' || json.duplicated === true)) {
                sent = true;
                responseData = json;
              } else if (json && json.error) {
                errorMessage = json.error;
              } else {
                errorMessage = 'Proxy endpoint tidak mengonfirmasi status sukses';
              }
            } else {
              errorMessage = `Proxy HTTP ${proxyRes.status}`;
            }
          } catch (e: any) {
            errorMessage = e?.message || 'Proxy fetch error';
          }
        }

        if (sent) {
          processedCount++;
          // If a file was uploaded and returned a drive url, update local asset (Invariants I-A06-4, I-A06-5)
          if (responseData && (responseData.file_url || responseData.drive_url) && item.data) {
            const driveUrl = responseData.drive_url || responseData.file_url;
            const driveFileId = responseData.drive_file_id || responseData.fileId;
            const thumbnailUrl = responseData.thumbnail_url;
            await this.updateAssetDriveUrl(
              item.data.asset_id,
              item.data.file_name,
              item.data.file_category,
              driveUrl,
              item.data.base64_data,
              item.data.document_id || item.entity_id,
              driveFileId,
              thumbnailUrl
            );
          }
          // If deletedAsset succeeded, clear local tombstone
          if (item.action === 'deleteAsset' && item.asset_id) {
            this.clearDeletedAssetTombstone(item.asset_id);
          }
          // Remove completed mutation from queue
          await this.removeSyncQueueItem(item.id);
        } else {
          failedCount++;
          const classification = this.classifySyncError(errorStatusCode, errorMessage);
          const currentRetry = (item.retry_count || item.retryCount || 0) + 1;
          const nowIsoAttempt = new Date().toISOString();

          item.retry_count = currentRetry;
          item.retryCount = currentRetry;
          item.last_attempt_at = nowIsoAttempt;
          item.lastAttemptAt = nowIsoAttempt;
          item.last_error = errorMessage || 'Sync mutation failed';
          item.lastError = item.last_error;
          item.error_type = classification.type;
          item.processing_started_at = undefined;

          if (!classification.isRetryable) {
            // Non-retryable error: Mark FAILED_PERMANENT immediately
            item.status = 'FAILED_PERMANENT';
            item.next_retry_at = undefined;
            item.nextRetryAt = undefined;
            console.warn(`[SyncEngine] Mutation ${item.id} (${item.mutation_id}) failed permanently: ${errorMessage}`);
          } else {
            // Retryable error: apply exponential backoff schedule (Attempt 1: 5s, 2: 15s, 3: 60s, 4: 120s, 5: 300s)
            if (currentRetry >= 5) {
              item.status = 'FAILED_PERMANENT';
              item.next_retry_at = undefined;
              item.nextRetryAt = undefined;
              console.warn(`[SyncEngine] Mutation ${item.id} (${item.mutation_id}) exceeded max retries (5). Marked FAILED_PERMANENT.`);
            } else {
              const delaySeconds = this.calculateBackoffDelaySeconds(currentRetry);
              const nextDate = new Date(Date.now() + delaySeconds * 1000).toISOString();
              item.status = 'FAILED_RETRYABLE';
              item.next_retry_at = nextDate;
              item.nextRetryAt = nextDate;
            }
          }

          await this.updateSyncQueueItem(item);
        }
      }

      // Reconcile with remote Google Sheets
      const pullRes = await this.pullFromGoogleSheets();

      return {
        success: (eligibleItems.length === 0 || processedCount > 0) && pullRes.success,
        processed: processedCount,
        failed: failedCount,
        skipped: skippedCount
      };
    } catch (err: any) {
      console.warn('[SyncEngine] Sync failed (offline or unhandled exception):', err);
      return { success: false, processed: 0, failed: 1, skipped: 0, reason: err?.message || 'CRITICAL_SYNC_ERROR' };
    } finally {
      this.isFlushing = false;
      this.flushLockTimestamp = 0;
    }
  }

  // Tarik & sinkronkan seluruh data aset dari Google Sheets ke IndexedDB & LocalStorage dengan Cloud Reconciliation
  public async pullFromGoogleSheets(): Promise<{ success: boolean; count: number; reconciledRemoved?: number; error?: string }> {
    const url = localStorage.getItem('micromate_apps_script_url');
    const token = localStorage.getItem('micromate_access_token') || '';
    if (!url || !url.trim()) {
      return { success: false, count: 0, error: 'Endpoint Google Apps Script belum dikonfigurasi.' };
    }

    let remoteAssets: Asset[] = [];
    let fetched = false;
    let lastError = 'Gagal menarik data dari Apps Script Web App.';

    // 1. Coba request langsung ke Apps Script Endpoint via POST
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({ action: 'getAllAssets', token })
      });
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json && json.success && Array.isArray(json.assets)) {
          remoteAssets = json.assets;
          fetched = true;
        } else if (json && (json.message || json.error)) {
          lastError = json.message || json.error;
        }
      } else {
        lastError = `HTTP Server Error: ${res.status}`;
      }
    } catch (e: any) {
      lastError = e?.message || 'Gagal terhubung langsung ke Apps Script';
      console.warn('Direct pull from Apps Script failed:', e);
    }

    // 2. Coba GET sebagai fallback jika POST terblokir CORS
    if (!fetched) {
      try {
        const getUrl = url.includes('?') 
          ? `${url}&action=getAllAssets&token=${encodeURIComponent(token)}` 
          : `${url}?action=getAllAssets&token=${encodeURIComponent(token)}`;
        const res = await fetch(getUrl, { method: 'GET' });
        if (res.ok) {
          const json = await res.json().catch(() => null);
          if (json && json.success && Array.isArray(json.assets)) {
            remoteAssets = json.assets;
            fetched = true;
          } else if (json && (json.message || json.error)) {
            lastError = json.message || json.error;
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
          headers: {
            'Content-Type': 'application/json',
            'X-Apps-Script-Url': url || ''
          },
          body: JSON.stringify({ action: 'getAllAssets', token })
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
      const localAssets = await this.getAllAssetsInternal();
      const syncQueue = await this.getAllSyncQueueItems();
      const tombstones = this.getDeletedAssetTombstones();
      
      // Map pending queue items by target asset_id
      const pendingQueueByAssetId = new Map<string, SyncQueueItem[]>();
      for (const item of syncQueue) {
        const isPending = item.status === 'PENDING' || item.status === 'PROCESSING' || item.status === 'FAILED_RETRYABLE';
        if (!isPending) continue;

        const id = item.asset_id || (item.data && (item.data.asset_id || item.data.assetId || item.data.id));
        if (id) {
          const list = pendingQueueByAssetId.get(id) || [];
          list.push(item);
          pendingQueueByAssetId.set(id, list);
        }
      }

      const remoteAssetIds = new Set<string>();
      for (let asset of remoteAssets) {
        if (!asset.workspace_id) {
          asset.workspace_id = INITIAL_WORKSPACE_ID;
        }
        if (!asset.asset_id) {
          asset.asset_id = 'ast_' + Math.random().toString(36).substring(2, 9);
        }
        remoteAssetIds.add(asset.asset_id);

        const pendingItems = pendingQueueByAssetId.get(asset.asset_id) || [];
        const existingLocal = localAssets.find((a) => a.asset_id === asset.asset_id);

        // Run through Canonical Conflict Resolution Engine (Phase 2E)
        const resolution = ConflictResolutionEngine.resolveAssetConflict(
          existingLocal,
          asset,
          pendingItems,
          tombstones
        );

        if (resolution.action === 'TOMBSTONE_DELETE') {
          // If tombstoned or deleted, ensure it is not resurrected locally
          if (existingLocal && !pendingItems.some(i => i.action === 'deleteAsset')) {
            await this.deleteAssetLocallyWithoutQueue(asset.asset_id);
          }
          continue;
        }

        if (resolution.action === 'KEEP_LOCAL') {
          // Local unsynced work or newer local timestamp preserved
          continue;
        }

        if (resolution.asset) {
          resolution.asset.workspace_id = resolution.asset.workspace_id || INITIAL_WORKSPACE_ID;
          if (!resolution.asset.photo_url && existingLocal?.photo_url) {
            resolution.asset.photo_url = existingLocal.photo_url;
          }
          await this.saveAssetToDB(resolution.asset);
        }
      }

      // Cloud Reconciliation: Remove local assets that do not exist in Google Sheets and have no pending local sync actions
      let reconciledRemoved = 0;
      if (remoteAssets.length > 0) {
        for (const localAsset of localAssets) {
          if (!remoteAssetIds.has(localAsset.asset_id)) {
            // If asset is not in cloud AND has no pending local queue items, it was deleted remotely
            const pendingItems = pendingQueueByAssetId.get(localAsset.asset_id) || [];
            if (pendingItems.length === 0 && !tombstones.has(localAsset.asset_id)) {
              await this.deleteAssetLocallyWithoutQueue(localAsset.asset_id);
              reconciledRemoved++;
            }
          }
        }
      }

      return { success: true, count: remoteAssets.length, reconciledRemoved };
    }

    return { success: false, count: 0, error: lastError };
  }

  // Check whether a valid, consistent persisted initialization state exists in storage
  public async hasValidPersistedState(): Promise<boolean> {
    try {
      const activeWorkspaceId = localStorage.getItem('micromate_active_workspace_id') || INITIAL_WORKSPACE_ID;
      const validWorkspaceId = this.validateWorkspaceId(activeWorkspaceId);
      const assets = await this.getAllAssets(validWorkspaceId);
      // Valid state requires at least one active non-deleted asset in the valid workspace
      return assets.length > 0;
    } catch {
      return false;
    }
  }

  // Export DB as JSON string
  public async exportJSON(workspaceId: string): Promise<string> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    const assets = await this.getAllAssets(validWorkspaceId);
    return JSON.stringify({
      version: '1.0',
      exported_at: new Date().toISOString(),
      workspace_id: validWorkspaceId,
      assets
    }, null, 2);
  }

  // Import JSON string into DB
  public async importJSON(jsonStr: string, workspaceId: string): Promise<boolean> {
    const validWorkspaceId = this.validateWorkspaceId(workspaceId);
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.assets && Array.isArray(parsed.assets)) {
        for (const asset of parsed.assets) {
          asset.workspace_id = validWorkspaceId;
          await this.saveAsset(asset, validWorkspaceId);
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
