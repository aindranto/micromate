import { Asset, SyncQueueItem, MaintenanceRecord, Reminder, Document, AssetDocument, Expense } from '../types';

export type ConflictResolutionAction = 'APPLY_REMOTE' | 'KEEP_LOCAL' | 'TOMBSTONE_DELETE' | 'MERGE';

export interface ConflictResolutionResult {
  action: ConflictResolutionAction;
  asset: Asset | null;
  reason: string;
}

/**
 * MicroMate Multi-Device Conflict Resolution Engine (Phase 2E)
 * 
 * Rules:
 * 1. Tombstone Priority (DELETE > UPDATE): If an asset is tombstoned, soft-deleted, or has a pending delete mutation,
 *    it is permanently treated as DELETED. An update can NEVER resurrect a deleted asset.
 * 2. Pending Mutation Protection: If the local device has unsynced local mutations for this asset,
 *    local edits are preserved so remote pulls do not clobber offline user work.
 * 3. Server Authoritative / Version Timestamp Ordering: When reconciling without pending mutations,
 *    we compare remote `updated_at` against local `updated_at`. If remote is newer or equal, remote wins.
 * 4. Relational Sub-Record Union Merge: Sub-records (maintenance, reminders, documents, expenses)
 *    are merged by unique primary keys so concurrent additions from different devices are preserved.
 */
export class ConflictResolutionEngine {

  /**
   * Resolves conflict between a local asset state and an incoming remote asset state.
   */
  public static resolveAssetConflict(
    localAsset: Asset | undefined | null,
    remoteAsset: Asset,
    pendingMutations: SyncQueueItem[] = [],
    tombstones: Set<string> = new Set(),
    subRecordTombstones: Set<string> = new Set()
  ): ConflictResolutionResult {
    const assetId = remoteAsset.asset_id;

    // RULE 1: Tombstone Priority (DELETE > UPDATE)
    const isTombstoned = tombstones.has(assetId);
    const hasPendingDelete = pendingMutations.some(
      m => m.action === 'deleteAsset' && (m.asset_id === assetId || m.entity_id === assetId)
    );
    const isRemoteDeleted = remoteAsset.deleted === true || String(remoteAsset.status).toLowerCase() === 'disposed';

    if (isTombstoned || hasPendingDelete || isRemoteDeleted) {
      return {
        action: 'TOMBSTONE_DELETE',
        asset: null,
        reason: 'Tombstone priority: Asset is deleted locally or remotely. Deletion supersedes updates.'
      };
    }

    // If local asset does not exist, apply remote as fresh insert (filtering out deleted subrecords)
    if (!localAsset) {
      let resolvedPhoto = remoteAsset.photo_url;
      if (!resolvedPhoto && remoteAsset.documents && Array.isArray(remoteAsset.documents)) {
        const photoDoc = remoteAsset.documents.find((d: any) => 
          d.type === 'photo' || 
          d.type === 'image' || 
          (d.mime_type && d.mime_type.startsWith('image/')) ||
          (d.name && d.name.match(/\.(jpg|jpeg|png|webp)$/i))
        );
        if (photoDoc) {
          resolvedPhoto = (photoDoc as any).file_url || (photoDoc as any).drive_url || (photoDoc as any).thumbnail_url;
        }
      }

      return {
        action: 'APPLY_REMOTE',
        asset: {
          ...remoteAsset,
          photo_url: resolvedPhoto,
          workspace_id: remoteAsset.workspace_id || 'ws_primary',
          data_origin: 'synced',
          maintenance_records: this.filterActiveSubRecords(remoteAsset.maintenance_records || [], 'maintenance_id', subRecordTombstones),
          reminders: this.filterActiveSubRecords(remoteAsset.reminders || [], 'reminder_id', subRecordTombstones),
          documents: this.filterActiveSubRecords(remoteAsset.documents || [], 'document_id', subRecordTombstones),
          expenses: this.filterActiveSubRecords(remoteAsset.expenses || [], 'expense_id', subRecordTombstones)
        },
        reason: 'New remote asset accepted into local store.'
      };
    }

    // RULE 2: Pending Local Mutation Safeguard
    const hasPendingEdits = pendingMutations.some(
      m => (m.asset_id === assetId || m.entity_id === assetId) &&
           ['saveAsset', 'syncMaintenance', 'syncReminder', 'uploadFile', 'syncExpense'].includes(m.action)
    );

    if (hasPendingEdits) {
      return {
        action: 'KEEP_LOCAL',
        asset: localAsset,
        reason: 'Pending mutation safeguard: Local unsynced changes preserved over remote snapshot.'
      };
    }

    // Extract sub-record deletions from pending mutations
    const pendingSubDeletions = new Set<string>(subRecordTombstones);
    for (const m of pendingMutations) {
      if (m.action === 'deleteMaintenance' || m.action === 'deleteReminder' || m.action === 'deleteDocument' || m.action === 'deleteExpense') {
        if (m.entity_id) pendingSubDeletions.add(m.entity_id);
      }
    }

    // RULE 3 & 4: Timestamp Ordering + Sub-Record Union Merge (with Sub-record Tombstone Priority)
    const localTime = new Date(localAsset.updated_at || 0).getTime();
    const remoteTime = new Date(remoteAsset.updated_at || 0).getTime();

    // Merge sub-records cleanly by primary keys while respecting sub-record tombstones
    const mergedMaintenance = this.mergeSubRecords<MaintenanceRecord>(
      localAsset.maintenance_records || [],
      remoteAsset.maintenance_records || [],
      'maintenance_id',
      pendingSubDeletions
    );

    const mergedReminders = this.mergeSubRecords<Reminder>(
      localAsset.reminders || [],
      remoteAsset.reminders || [],
      'reminder_id',
      pendingSubDeletions
    );

    const mergedDocuments = this.mergeSubRecords<Document | AssetDocument>(
      localAsset.documents || [],
      remoteAsset.documents || [],
      'document_id',
      pendingSubDeletions
    );

    const mergedExpenses = this.mergeSubRecords<Expense>(
      localAsset.expenses || [],
      remoteAsset.expenses || [],
      'expense_id',
      pendingSubDeletions
    );

    // If remote is newer or equal, apply remote metadata with merged sub-records
    if (remoteTime >= localTime) {
      const merged: Asset = {
        ...localAsset,
        ...remoteAsset,
        workspace_id: remoteAsset.workspace_id || localAsset.workspace_id || 'ws_primary',
        data_origin: 'synced',
        maintenance_records: mergedMaintenance,
        reminders: mergedReminders,
        documents: mergedDocuments,
        expenses: mergedExpenses
      };
      if (!remoteAsset.photo_url && localAsset.photo_url) {
        merged.photo_url = localAsset.photo_url;
      } else if (!merged.photo_url && merged.documents && Array.isArray(merged.documents)) {
        const photoDoc = merged.documents.find((d: any) => 
          d.type === 'photo' || 
          d.type === 'image' || 
          (d.mime_type && d.mime_type.startsWith('image/')) ||
          (d.name && d.name.match(/\.(jpg|jpeg|png|webp)$/i))
        );
        if (photoDoc) {
          merged.photo_url = (photoDoc as any).file_url || (photoDoc as any).drive_url || (photoDoc as any).thumbnail_url;
        }
      }

      return {
        action: 'APPLY_REMOTE',
        asset: merged,
        reason: `Remote version is newer or equal (${remoteAsset.updated_at} >= ${localAsset.updated_at}).`
      };
    } else {
      // Local has a newer timestamp (cleanly synced earlier or higher timestamp)
      const merged: Asset = {
        ...remoteAsset,
        ...localAsset,
        workspace_id: localAsset.workspace_id || remoteAsset.workspace_id || 'ws_primary',
        maintenance_records: mergedMaintenance,
        reminders: mergedReminders,
        documents: mergedDocuments,
        expenses: mergedExpenses
      };
      if (!localAsset.photo_url && remoteAsset.photo_url) {
        merged.photo_url = remoteAsset.photo_url;
      }

      return {
        action: 'KEEP_LOCAL',
        asset: merged,
        reason: `Local version is newer (${localAsset.updated_at} > ${remoteAsset.updated_at}).`
      };
    }
  }

  /**
   * Filter out deleted sub-records based on tombstone set or deleted flag.
   */
  private static filterActiveSubRecords<T extends Record<string, any>>(
    list: T[],
    idKey: keyof T,
    tombstones: Set<string>
  ): T[] {
    return list.filter(item => {
      const id = String(item[idKey] || '');
      if (tombstones.has(id)) return false;
      if (item.deleted === true || String(item.deleted).toLowerCase() === 'true') return false;
      return true;
    });
  }

  /**
   * Helper to merge arrays of sub-records without duplicates, preserving newest version per ID,
   * while strictly preventing resurrection of deleted sub-records.
   */
  private static mergeSubRecords<T extends Record<string, any>>(
    localList: T[],
    remoteList: T[],
    idKey: keyof T,
    tombstones: Set<string> = new Set()
  ): T[] {
    const map = new Map<string, T>();

    for (const item of localList) {
      const id = String(item[idKey] || '');
      if (!id || tombstones.has(id)) continue;
      if (item.deleted === true || String(item.deleted).toLowerCase() === 'true') continue;
      map.set(id, item);
    }

    for (const item of remoteList) {
      const id = String(item[idKey] || '');
      if (!id || tombstones.has(id)) continue;
      if (item.deleted === true || String(item.deleted).toLowerCase() === 'true') continue;

      if (map.has(id)) {
        // Merge attributes, keeping existing non-empty file attributes if remote is empty
        const local = map.get(id)!;
        const merged: any = { ...local, ...item };
        if (!item.file_url && local.file_url) merged.file_url = local.file_url;
        if (!item.drive_url && local.drive_url) merged.drive_url = local.drive_url;
        if (!item.drive_file_id && local.drive_file_id) merged.drive_file_id = local.drive_file_id;
        if (!item.thumbnail_url && local.thumbnail_url) merged.thumbnail_url = local.thumbnail_url;
        if (!item.local_file_ref && local.local_file_ref) merged.local_file_ref = local.local_file_ref;
        if (!merged.drive_file_id) delete merged.drive_file_id;
        if (!merged.drive_url) delete merged.drive_url;
        map.set(id, merged);
      } else {
        map.set(id, item);
      }
    }

    return Array.from(map.values());
  }
}
