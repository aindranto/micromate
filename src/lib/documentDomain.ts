/**
 * MICROMATE PHASE 3D-1: DOCUMENT DOMAIN & LIFECYCLE ENGINE
 * 
 * Canonical Responsibilities:
 * 1. Document Entity Factory & Validation (Strict separation of metadata and binary payload).
 * 2. Immutable Identifier Isolation:
 *    document_id !== mutation_id !== drive_file_id
 * 3. Lifecycle State Machine:
 *    LOCAL_ONLY ➔ QUEUED ➔ UPLOADING ➔ SYNCED
 *                                   ↘ FAILED_RETRYABLE ➔ UPLOADING
 *                                   ↘ FAILED_PERMANENT
 * 4. Tombstone Deletion Contract (soft deletion, no physical destroy in normal operation).
 * 5. Deterministic Document Domain Operations.
 */

import { Document, DocumentType, DocumentSyncStatus, Asset } from '../types';

export interface CreateDocumentInput {
  document_id?: string;
  asset_id: string;
  document_type: DocumentType;
  title: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  file_fingerprint?: string;
  local_file_ref?: string;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface UpdateDocumentMetadataInput {
  title?: string;
  document_type?: DocumentType;
  metadata?: Record<string, any>;
  updated_at?: string;
}

export interface TransitionDocumentSyncStateInput {
  sync_status: DocumentSyncStatus;
  drive_file_id?: string;
  drive_url?: string;
  thumbnail_url?: string;
  updated_at?: string;
}

/**
 * Validates document metadata input
 */
export function validateDocumentInput(input: CreateDocumentInput): { valid: boolean; error?: string } {
  if (!input.asset_id || input.asset_id.trim() === '') {
    return { valid: false, error: 'Asset ID is required for document association' };
  }
  if (!input.title || input.title.trim() === '') {
    return { valid: false, error: 'Document title is required' };
  }
  if (!input.file_name || input.file_name.trim() === '') {
    return { valid: false, error: 'File name is required' };
  }
  if (!input.mime_type || input.mime_type.trim() === '') {
    return { valid: false, error: 'MIME type is required' };
  }
  if (typeof input.file_size !== 'number' || input.file_size < 0) {
    return { valid: false, error: 'Valid non-negative file size is required' };
  }
  return { valid: true };
}

/**
 * Generates canonical document ID before any upload or queue operation
 */
export function generateDocumentId(assetId: string, customPrefix?: string): string {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  const prefix = customPrefix || 'DOC';
  return `${prefix}-${assetId.replace(/^ast_/, '')}-${timestamp}-${randomSuffix}`;
}

/**
 * Creates a canonical Document entity in the initial LOCAL_ONLY state
 */
export function createCanonicalDocument(input: CreateDocumentInput): Document {
  const validation = validateDocumentInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid Document Input: ${validation.error}`);
  }

  const now = input.created_at || new Date().toISOString();
  const documentId = input.document_id || generateDocumentId(input.asset_id);

  return {
    document_id: documentId,
    asset_id: input.asset_id,
    document_type: input.document_type || 'other',
    title: input.title.trim(),
    file_name: input.file_name.trim(),
    mime_type: input.mime_type.trim(),
    file_size: input.file_size,
    sync_status: 'LOCAL_ONLY', // Initial canonical lifecycle state
    file_fingerprint: input.file_fingerprint,
    local_file_ref: input.local_file_ref,
    metadata: input.metadata || {},
    created_at: now,
    updated_at: now,
    deleted: false,
  };
}

/**
 * State Transition Guard Matrix
 */
const VALID_LIFECYCLE_TRANSITIONS: Record<DocumentSyncStatus, DocumentSyncStatus[]> = {
  LOCAL_ONLY: ['QUEUED', 'UPLOADING', 'FAILED_PERMANENT'],
  QUEUED: ['UPLOADING', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'LOCAL_ONLY'],
  UPLOADING: ['SYNCED', 'UNKNOWN', 'FAILED_RETRYABLE', 'FAILED_PERMANENT'],
  UNKNOWN: ['SYNCED', 'UPLOADING', 'FAILED_RETRYABLE', 'FAILED_PERMANENT', 'QUEUED'],
  FAILED_RETRYABLE: ['UPLOADING', 'QUEUED', 'FAILED_PERMANENT'],
  FAILED_PERMANENT: ['LOCAL_ONLY', 'QUEUED'], // Manual user retry reset
  SYNCED: ['QUEUED', 'UPLOADING'], // Re-sync or update metadata to cloud
};

/**
 * Transitions a document's sync state according to the formal lifecycle state machine
 */
export function transitionDocumentSyncStatus(
  document: Document,
  transition: TransitionDocumentSyncStateInput
): Document {
  const currentStatus = document.sync_status;
  const nextStatus = transition.sync_status;

  const allowedTransitions = VALID_LIFECYCLE_TRANSITIONS[currentStatus] || [];
  if (currentStatus !== nextStatus && !allowedTransitions.includes(nextStatus)) {
    throw new Error(
      `Illegal Document Sync State Transition: Cannot transition from ${currentStatus} to ${nextStatus}`
    );
  }

  const now = transition.updated_at || new Date().toISOString();

  return {
    ...document,
    sync_status: nextStatus,
    drive_file_id: transition.drive_file_id !== undefined ? transition.drive_file_id : document.drive_file_id,
    drive_url: transition.drive_url !== undefined ? transition.drive_url : document.drive_url,
    thumbnail_url: transition.thumbnail_url !== undefined ? transition.thumbnail_url : document.thumbnail_url,
    updated_at: now,
  };
}

/**
 * Updates document business metadata (title, category, tags)
 */
export function updateDocumentMetadata(
  document: Document,
  input: UpdateDocumentMetadataInput
): Document {
  if (document.deleted) {
    throw new Error('Cannot update metadata of a deleted/tombstoned document');
  }

  const now = input.updated_at || new Date().toISOString();

  return {
    ...document,
    title: input.title !== undefined && input.title.trim() !== '' ? input.title.trim() : document.title,
    document_type: input.document_type || document.document_type,
    metadata: input.metadata ? { ...document.metadata, ...input.metadata } : document.metadata,
    updated_at: now,
  };
}

/**
 * Applies a Tombstone Delete to a document (Preserves record with deleted: true)
 */
export function tombstoneDocument(document: Document, deletedAt?: string): Document {
  const now = deletedAt || new Date().toISOString();
  return {
    ...document,
    deleted: true,
    updated_at: now,
  };
}

/**
 * Restores a tombstoned document back to active status
 */
export function restoreDocument(document: Document, restoredAt?: string): Document {
  const now = restoredAt || new Date().toISOString();
  return {
    ...document,
    deleted: false,
    updated_at: now,
  };
}

/**
 * Filters documents for a specific asset excluding tombstoned items
 */
export function getActiveDocumentsForAsset(asset: Asset): Document[] {
  if (!asset.documents || !Array.isArray(asset.documents)) {
    return [];
  }
  return (asset.documents as any[])
    .filter((doc) => !doc.deleted)
    .map(normalizeToCanonicalDocument);
}

/**
 * Normalizes legacy AssetDocument or canonical Document into full canonical Document representation
 */
export function normalizeToCanonicalDocument(doc: any): Document {
  if (!doc) throw new Error('Cannot normalize null document');

  const now = new Date().toISOString();
  return {
    document_id: doc.document_id || `DOC-LEGACY-${Date.now()}`,
    asset_id: doc.asset_id || '',
    document_type: doc.document_type || doc.type || 'other',
    title: doc.title || doc.name || 'Dokumen Tanpa Judul',
    file_name: doc.file_name || doc.name || 'file',
    mime_type: doc.mime_type || 'application/pdf',
    file_size: typeof doc.file_size === 'number' ? doc.file_size : 0,
    sync_status: doc.sync_status || (doc.drive_url || doc.file_url ? 'SYNCED' : 'LOCAL_ONLY'),
    drive_file_id: doc.drive_file_id,
    drive_url: doc.drive_url || doc.file_url,
    thumbnail_url: doc.thumbnail_url,
    local_file_ref: doc.local_file_ref,
    metadata: doc.metadata || {},
    created_at: doc.created_at || now,
    updated_at: doc.updated_at || doc.created_at || now,
    deleted: !!doc.deleted,
  };
}

/**
 * Resolves the primary actionable URL for viewing/opening a document.
 * Precedence: drive_url -> legacy file_url -> local_file_ref (if URL) -> empty string
 */
export function getDocumentPrimaryUrl(doc: any): string {
  if (!doc) return '';
  if (doc.drive_url && typeof doc.drive_url === 'string' && doc.drive_url.trim()) {
    return doc.drive_url.trim();
  }
  if (doc.file_url && typeof doc.file_url === 'string' && doc.file_url.trim()) {
    return doc.file_url.trim();
  }
  if (doc.local_file_ref && typeof doc.local_file_ref === 'string' && (doc.local_file_ref.startsWith('data:') || doc.local_file_ref.startsWith('blob:') || doc.local_file_ref.startsWith('http'))) {
    return doc.local_file_ref.trim();
  }
  return '';
}

/**
 * Resolves the visual preview/thumbnail URL for rendering gallery images or document cards.
 * Precedence: thumbnail_url -> primaryUrl -> empty string
 */
export function getDocumentPreviewUrl(doc: any): string {
  if (!doc) return '';
  if (doc.thumbnail_url && typeof doc.thumbnail_url === 'string' && doc.thumbnail_url.trim()) {
    return doc.thumbnail_url.trim();
  }
  return getDocumentPrimaryUrl(doc);
}

/**
 * Resolves a human-readable title for a document.
 */
export function getDocumentDisplayTitle(doc: any): string {
  if (!doc) return 'Dokumen';
  return doc.title || doc.file_name || doc.name || 'Dokumen Aset';
}

/**
 * Resolves the normalized category/type for presentation badges.
 */
export function getDocumentDisplayType(doc: any): string {
  if (!doc) return 'other';
  return doc.document_type || doc.type || 'other';
}

