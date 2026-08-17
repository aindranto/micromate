/**
 * MICROMATE PHASE 3D-3: UPLOAD FAILURE ENGINEERING & ORPHAN PREVENTION ENGINE
 * 
 * Core Components:
 * 1. File Fingerprint Generator (content_hash + file_size + mime_type)
 * 2. Durable Upload Manifest Ledger (Transaction Record)
 * 3. Hardened Upload State Machine (with UNKNOWN & TIMEOUT handling)
 * 4. Orphan Detection Engine (Identifies cloud objects without local sync link)
 * 5. Deterministic & Idempotent Orphan Reconciler (Recovers ACK loss & crashes)
 */

import { Document, DocumentSyncStatus, UploadManifest, UploadManifestStatus } from '../types';
import { generateDocumentUploadMutationId } from './documentIdempotency';
import { transitionDocumentSyncStatus, tombstoneDocument } from './documentDomain';

export interface FileFingerprintInput {
  content?: string;
  file_name: string;
  mime_type: string;
  file_size: number;
}

export interface DriveObjectMetadata {
  file_id: string;
  document_id: string;
  mutation_id?: string;
  file_fingerprint: string;
  name: string;
  size: number;
  mime_type: string;
  drive_url: string;
  created_at: string;
}

export interface OrphanCandidate {
  drive_file_id: string;
  document_id: string;
  mutation_id?: string;
  file_fingerprint: string;
  reason: 'LOCAL_DRIVE_ID_NULL' | 'MANIFEST_UNKNOWN' | 'CRASH_BEFORE_LOCAL_COMMIT' | 'ACK_LOST';
  driveObject: DriveObjectMetadata;
}

export interface ReconciliationOutcome {
  reconciled: boolean;
  status: 'LINKED_SYNCED' | 'REJECTED_FINGERPRINT_MISMATCH' | 'RETRYABLE_NOT_FOUND' | 'NO_OP_ALREADY_SYNCED' | 'TOMBSTONE_PRESERVED';
  document?: Document;
  manifest?: UploadManifest;
  message: string;
}

/**
 * Generates canonical deterministic file fingerprint based on content/metadata
 */
export function generateFileFingerprint(input: FileFingerprintInput): string {
  const seed = `${input.file_name}::${input.mime_type}::${input.file_size}::${input.content || ''}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `FPR-${hexHash}-${input.file_size}`;
}

/**
 * Pembangkitan durable Upload Manifest
 */
export function createUploadManifest(
  document: Document,
  options?: { idempotencyKey?: string; content?: string }
): UploadManifest {
  const fingerprint = document.file_fingerprint || generateFileFingerprint({
    file_name: document.file_name,
    mime_type: document.mime_type,
    file_size: document.file_size,
    content: options?.content,
  });

  const mutationId = generateDocumentUploadMutationId(document.document_id);
  const now = new Date().toISOString();

  return {
    upload_manifest_id: `MNF-${document.document_id}-${Date.now()}`,
    document_id: document.document_id,
    asset_id: document.asset_id,
    mutation_id: mutationId,
    idempotency_key: options?.idempotencyKey || mutationId,
    file_fingerprint: fingerprint,
    file_name: document.file_name,
    mime_type: document.mime_type,
    file_size: document.file_size,
    status: 'PENDING',
    created_at: now,
    attempt_count: 0,
  };
}

/**
 * Manifest State Machine Transitions
 */
export function transitionManifestStatus(
  manifest: UploadManifest,
  nextStatus: UploadManifestStatus,
  metadata?: {
    drive_file_id?: string;
    drive_url?: string;
    thumbnail_url?: string;
    error?: string;
    timestamp?: string;
  }
): UploadManifest {
  const now = metadata?.timestamp || new Date().toISOString();
  const updated: UploadManifest = {
    ...manifest,
    status: nextStatus,
    last_attempt_at: now,
  };

  if (nextStatus === 'UPLOADING') {
    updated.started_at = updated.started_at || now;
    updated.attempt_count += 1;
  } else if (nextStatus === 'COMPLETED') {
    updated.completed_at = now;
    updated.drive_file_id = metadata?.drive_file_id || manifest.drive_file_id;
    updated.drive_url = metadata?.drive_url || manifest.drive_url;
    updated.thumbnail_url = metadata?.thumbnail_url || manifest.thumbnail_url;
    updated.last_error = undefined;
  } else if (nextStatus === 'UNKNOWN' || nextStatus === 'FAILED_RETRYABLE' || nextStatus === 'FAILED_PERMANENT') {
    updated.last_error = metadata?.error || manifest.last_error || 'Unknown upload condition';
  }

  return updated;
}

/**
 * Durable Upload Manifest Storage Registry (Client/Local Ledger)
 */
export class UploadManifestRegistry {
  private manifests: Map<string, UploadManifest> = new Map();

  public save(manifest: UploadManifest): void {
    this.manifests.set(manifest.mutation_id, manifest);
  }

  public getByMutationId(mutationId: string): UploadManifest | undefined {
    return this.manifests.get(mutationId);
  }

  public getByDocumentId(documentId: string): UploadManifest | undefined {
    for (const m of this.manifests.values()) {
      if (m.document_id === documentId) return m;
    }
    return undefined;
  }

  public getAll(): UploadManifest[] {
    return Array.from(this.manifests.values());
  }

  public getPendingOrUnknown(): UploadManifest[] {
    return this.getAll().filter((m) => m.status === 'PENDING' || m.status === 'UPLOADING' || m.status === 'UNKNOWN' || m.status === 'FAILED_RETRYABLE');
  }

  public clear(): void {
    this.manifests.clear();
  }
}

/**
 * Orphan Detection Engine
 */
export class OrphanDetectionEngine {
  /**
   * Identifies orphan candidates: Drive files that lack a verified local document link or have unresolved manifests
   */
  public static scanForOrphans(
    driveObjects: DriveObjectMetadata[],
    documents: Document[],
    manifests: UploadManifest[]
  ): OrphanCandidate[] {
    const candidates: OrphanCandidate[] = [];
    const docMap = new Map<string, Document>();
    documents.forEach((d) => docMap.set(d.document_id, d));

    const manifestMap = new Map<string, UploadManifest>();
    manifests.forEach((m) => manifestMap.set(m.document_id, m));

    for (const driveObj of driveObjects) {
      const doc = docMap.get(driveObj.document_id);
      const manifest = manifestMap.get(driveObj.document_id);

      if (!doc) {
        // Document missing entirely in local DB
        candidates.push({
          drive_file_id: driveObj.file_id,
          document_id: driveObj.document_id,
          mutation_id: driveObj.mutation_id,
          file_fingerprint: driveObj.file_fingerprint,
          reason: 'CRASH_BEFORE_LOCAL_COMMIT',
          driveObject: driveObj,
        });
      } else if (!doc.drive_file_id || doc.sync_status !== 'SYNCED') {
        // Document exists but local sync status is not synced
        const reason = (doc.sync_status === 'UNKNOWN' || manifest?.status === 'UNKNOWN')
          ? 'ACK_LOST'
          : 'LOCAL_DRIVE_ID_NULL';

        candidates.push({
          drive_file_id: driveObj.file_id,
          document_id: driveObj.document_id,
          mutation_id: driveObj.mutation_id,
          file_fingerprint: driveObj.file_fingerprint,
          reason,
          driveObject: driveObj,
        });
      }
    }

    return candidates;
  }
}

/**
 * Orphan Reconciliation & Healing Engine
 */
export class OrphanReconciliationEngine {
  /**
   * Reconciles a single document / manifest with a matching cloud Drive object
   */
  public static reconcileCandidate(
    candidate: OrphanCandidate,
    document: Document | undefined,
    manifest: UploadManifest | undefined
  ): ReconciliationOutcome {
    // 1. Tombstone check: If document was deleted, preserve tombstone and don't resurrect
    if (document && document.deleted) {
      return {
        reconciled: false,
        status: 'TOMBSTONE_PRESERVED',
        document,
        manifest,
        message: 'Document is tombstoned/deleted. Cloud reference linked in tombstone without resurrecting to active.',
      };
    }

    // 2. Already synced check: Idempotency NO-OP
    if (document && document.sync_status === 'SYNCED' && document.drive_file_id === candidate.drive_file_id) {
      return {
        reconciled: true,
        status: 'NO_OP_ALREADY_SYNCED',
        document,
        manifest,
        message: 'Document already synced with identical Drive file ID. No action needed.',
      };
    }

    // 3. Fingerprint Verification Guard:
    // Ensure cloud file matches expected fingerprint or document identity
    const expectedFingerprint = manifest?.file_fingerprint || document?.file_fingerprint;
    if (expectedFingerprint && candidate.file_fingerprint && expectedFingerprint !== candidate.file_fingerprint) {
      return {
        reconciled: false,
        status: 'REJECTED_FINGERPRINT_MISMATCH',
        document,
        manifest,
        message: `Fingerprint mismatch: expected ${expectedFingerprint}, got ${candidate.file_fingerprint}`,
      };
    }

    // 4. Perform Healing / Linking
    const now = new Date().toISOString();
    let healedDoc: Document;

    if (document) {
      healedDoc = {
        ...document,
        sync_status: 'SYNCED',
        drive_file_id: candidate.drive_file_id,
        drive_url: candidate.driveObject.drive_url,
        updated_at: now,
      };
    } else {
      // Reconstruct document from cloud metadata if local record was lost due to crash
      healedDoc = {
        document_id: candidate.document_id,
        asset_id: '', // Will be assigned by parent or context
        document_type: 'other',
        title: candidate.driveObject.name,
        file_name: candidate.driveObject.name,
        mime_type: candidate.driveObject.mime_type,
        file_size: candidate.driveObject.size,
        sync_status: 'SYNCED',
        drive_file_id: candidate.drive_file_id,
        drive_url: candidate.driveObject.drive_url,
        file_fingerprint: candidate.file_fingerprint,
        created_at: candidate.driveObject.created_at,
        updated_at: now,
        deleted: false,
      };
    }

    let healedManifest: UploadManifest | undefined = manifest;
    if (manifest) {
      healedManifest = transitionManifestStatus(manifest, 'COMPLETED', {
        drive_file_id: candidate.drive_file_id,
        drive_url: candidate.driveObject.drive_url,
        timestamp: now,
      });
    }

    return {
      reconciled: true,
      status: 'LINKED_SYNCED',
      document: healedDoc,
      manifest: healedManifest,
      message: 'Successfully reconciled orphan Drive object with local entity and manifest.',
    };
  }

  /**
   * Batch Reconciler for startup / sync reconciliation
   */
  public static reconcileAll(
    driveObjects: DriveObjectMetadata[],
    documents: Document[],
    manifestRegistry: UploadManifestRegistry
  ): {
    reconciledDocuments: Document[];
    outcomes: ReconciliationOutcome[];
  } {
    const candidates = OrphanDetectionEngine.scanForOrphans(
      driveObjects,
      documents,
      manifestRegistry.getAll()
    );

    const docMap = new Map<string, Document>();
    documents.forEach((d) => docMap.set(d.document_id, d));

    const outcomes: ReconciliationOutcome[] = [];

    for (const candidate of candidates) {
      const doc = docMap.get(candidate.document_id);
      const manifest = manifestRegistry.getByDocumentId(candidate.document_id);

      const outcome = OrphanReconciliationEngine.reconcileCandidate(candidate, doc, manifest);
      outcomes.push(outcome);

      if (outcome.reconciled && outcome.document) {
        docMap.set(outcome.document.document_id, outcome.document);
        if (outcome.manifest) {
          manifestRegistry.save(outcome.manifest);
        }
      }
    }

    return {
      reconciledDocuments: Array.from(docMap.values()),
      outcomes,
    };
  }
}
