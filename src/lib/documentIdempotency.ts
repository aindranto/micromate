/**
 * MICROMATE PHASE 3D-2: DOCUMENT IDEMPOTENCY & DEDUPLICATION ENGINE
 * 
 * Architectural Invariants:
 * 1. Strict Identity Disjointness:
 *    document_id (Business Entity) !== mutation_id (Operation Identity) !== drive_file_id (Cloud Object Identity)
 * 2. Deterministic & Immutable Mutation ID:
 *    Attempt 1..N uses identical mutation_id (e.g. MUT-DOCUMENT-UPLOAD-DOC-vario-160-001).
 *    No RETRY-1, RETRY-2 mutation suffixes.
 * 3. Server/Gateway Deduplication Contract:
 *    Lookup by mutation_id. If processed, return canonical result with drive_file_id & drive_url.
 *    Does NOT create duplicate Drive files on retry or replay.
 * 4. Operation-Level Deduplication:
 *    Deduplication is keyed by mutation_id, enabling metadata updates and upload operations on same document_id without collisions.
 * 5. Replay Invariant:
 *    N replays (1..100) yield EXACTLY 1 Document record and 1 canonical Drive object reference.
 * 6. ACK-Loss & Crash-After-Upload Recovery:
 *    Client recovers original drive_file_id and transitions to SYNCED without duplicate cloud writes.
 */

import { Document, DocumentSyncStatus } from '../types';

export interface DocumentUploadPayload {
  document_id: string;
  asset_id: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  base64_data?: string;
  local_file_ref?: string;
  metadata?: Record<string, any>;
}

export interface DocumentUploadResult {
  success: boolean;
  duplicated: boolean;
  mutation_id: string;
  document_id: string;
  drive_file_id: string;
  drive_url: string;
  thumbnail_url?: string;
  file_size: number;
  uploaded_at: string;
  message?: string;
}

export interface StoredProcessedMutation {
  mutation_id: string;
  operation_type: 'UPLOAD' | 'METADATA_UPDATE' | 'DELETE';
  document_id: string;
  result: DocumentUploadResult;
  processed_at: string;
  execution_count: number;
}

/**
 * Generates deterministic and immutable mutation ID for document operations
 */
export function generateDocumentUploadMutationId(documentId: string): string {
  if (!documentId || documentId.trim() === '') {
    throw new Error('document_id is required to generate upload mutation_id');
  }
  return `MUT-DOCUMENT-UPLOAD-${documentId.trim()}`;
}

export function generateDocumentMetadataMutationId(documentId: string, versionTag?: string): string {
  if (!documentId || documentId.trim() === '') {
    throw new Error('document_id is required to generate metadata mutation_id');
  }
  const tag = versionTag ? `-${versionTag}` : '';
  return `MUT-DOCUMENT-UPDATE-${documentId.trim()}${tag}`;
}

export function generateDocumentDeleteMutationId(documentId: string): string {
  if (!documentId || documentId.trim() === '') {
    throw new Error('document_id is required to generate delete mutation_id');
  }
  return `MUT-DOCUMENT-DELETE-${documentId.trim()}`;
}

/**
 * Generates mock/canonical Google Drive file ID deterministically for a document
 */
export function generateDeterministicDriveFileId(documentId: string): string {
  // Hash/derive a consistent 28-char Drive file ID from document_id
  let hash = 0;
  for (let i = 0; i < documentId.length; i++) {
    hash = (hash << 5) - hash + documentId.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0');
  return `1DRV_${documentId.replace(/[^a-zA-Z0-9]/g, '_')}_${hexHash}`.substring(0, 33);
}

/**
 * In-memory / Mock Gateway Deduplication Ledger for Document Operations
 * Simulates server-side idempotency store (Apps Script / Cloud Storage registry)
 */
export class DocumentDeduplicationGateway {
  private processedMutations: Map<string, StoredProcessedMutation> = new Map();
  private driveStorage: Map<string, { file_id: string; document_id: string; name: string; size: number }> = new Map();

  /**
   * Process an upload mutation with strict idempotency and deduplication
   */
  public async processUploadMutation(
    mutationId: string,
    payload: DocumentUploadPayload,
    options?: { simulateNetworkDropAfterUpload?: boolean }
  ): Promise<DocumentUploadResult> {
    if (!mutationId || !mutationId.startsWith('MUT-DOCUMENT-UPLOAD-')) {
      throw new Error(`Invalid document upload mutation_id format: ${mutationId}`);
    }
    if (!payload.document_id) {
      throw new Error('Payload document_id is missing');
    }

    // 1. Idempotency Check: Lookup by mutation_id
    const existing = this.processedMutations.get(mutationId);
    if (existing) {
      existing.execution_count += 1;
      // Return canonical result with duplicated: true and original drive references
      return {
        ...existing.result,
        duplicated: true,
        message: 'Mutation already processed. Returned existing canonical Drive object.',
      };
    }

    // 2. First Execution: Create physical Drive object
    const driveFileId = generateDeterministicDriveFileId(payload.document_id);
    const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view?usp=drivesdk`;
    const thumbnailUrl = `https://lh3.googleusercontent.com/d/${driveFileId}=s220`;
    const now = new Date().toISOString();

    // Persist to simulated Drive file registry
    this.driveStorage.set(driveFileId, {
      file_id: driveFileId,
      document_id: payload.document_id,
      name: payload.file_name,
      size: payload.file_size,
    });

    const result: DocumentUploadResult = {
      success: true,
      duplicated: false,
      mutation_id: mutationId,
      document_id: payload.document_id,
      drive_file_id: driveFileId,
      drive_url: driveUrl,
      thumbnail_url: thumbnailUrl,
      file_size: payload.file_size,
      uploaded_at: now,
    };

    // 3. Store processed mutation in gateway ledger
    this.processedMutations.set(mutationId, {
      mutation_id: mutationId,
      operation_type: 'UPLOAD',
      document_id: payload.document_id,
      result,
      processed_at: now,
      execution_count: 1,
    });

    // 4. Crash Simulation: Network drop or client crash right after cloud write
    if (options?.simulateNetworkDropAfterUpload) {
      throw new Error('Simulated network drop / client crash immediately after Google Drive write');
    }

    return result;
  }

  /**
   * Check if a mutation has already been processed
   */
  public hasMutation(mutationId: string): boolean {
    return this.processedMutations.has(mutationId);
  }

  /**
   * Get processed mutation record
   */
  public getMutation(mutationId: string): StoredProcessedMutation | undefined {
    return this.processedMutations.get(mutationId);
  }

  /**
   * Get count of physical objects in Drive storage
   */
  public getDriveFileCount(): number {
    return this.driveStorage.size;
  }

  /**
   * Get physical Drive object by file ID
   */
  public getDriveFile(fileId: string) {
    return this.driveStorage.get(fileId);
  }

  /**
   * Clear gateway ledger (for test isolation)
   */
  public clear(): void {
    this.processedMutations.clear();
    this.driveStorage.clear();
  }
}

/**
 * Client-Side Replay Reconciler for Document Entities
 */
export class DocumentReconciler {
  /**
   * Reconciles a document with a successful/duplicate upload result
   */
  public static reconcileUploadResult(
    document: Document,
    result: DocumentUploadResult
  ): Document {
    if (document.document_id !== result.document_id) {
      throw new Error(
        `Document ID mismatch during reconciliation: doc=${document.document_id}, res=${result.document_id}`
      );
    }

    return {
      ...document,
      sync_status: 'SYNCED',
      drive_file_id: result.drive_file_id,
      drive_url: result.drive_url,
      thumbnail_url: result.thumbnail_url || document.thumbnail_url,
      updated_at: result.uploaded_at || new Date().toISOString(),
    };
  }

  /**
   * Reconciles an array of documents when processing idempotent upload replays
   */
  public static reconcileDocumentList(
    documents: Document[],
    result: DocumentUploadResult
  ): Document[] {
    let found = false;
    const updated = documents.map((doc) => {
      if (doc.document_id === result.document_id) {
        found = true;
        return DocumentReconciler.reconcileUploadResult(doc, result);
      }
      return doc;
    });

    if (!found) {
      // If not present in list, synthesize canonical synced document
      const synthesized: Document = {
        document_id: result.document_id,
        asset_id: '',
        document_type: 'other',
        title: result.document_id,
        file_name: result.document_id,
        mime_type: 'application/octet-stream',
        file_size: result.file_size,
        sync_status: 'SYNCED',
        drive_file_id: result.drive_file_id,
        drive_url: result.drive_url,
        thumbnail_url: result.thumbnail_url,
        created_at: result.uploaded_at,
        updated_at: result.uploaded_at,
        deleted: false,
      };
      return [synthesized, ...documents];
    }

    return updated;
  }
}
