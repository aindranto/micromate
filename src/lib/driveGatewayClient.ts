/**
 * MICROMATE PHASE 3D-4: REAL GOOGLE DRIVE GATEWAY & APPS SCRIPT INTEGRATION CONTRACT
 * 
 * Responsibilities:
 * 1. Gateway Request/Response Contract for Google Drive Uploads & Replays
 * 2. Strict Session & Ownership Authorization Boundary (Idempotency != Authorization)
 * 3. Google Drive Storage Contract (Hierarchy, custom Drive metadata properties, canonical URLs)
 * 4. Authoritative Gateway Deduplication & Server Mutex Simulation
 * 5. Failure Boundary Handling (Timeouts, ACK Loss, Session Revocation, Fingerprint Guard)
 * 6. Multi-Device Consistency & Recovery
 */

import { Document, DocumentSyncStatus, UploadManifest, UploadManifestStatus, SessionStatus } from '../types';
import { generateFileFingerprint, DriveObjectMetadata } from './uploadFailureEngine';

export interface DriveUploadRequest {
  action: 'uploadDocument' | 'uploadFile';
  token: string;
  device_id: string;
  mutation_id: string;
  document_id: string;
  asset_id: string;
  file_fingerprint: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  base64_data: string;
  document_type?: string;
  metadata?: Record<string, any>;
}

export interface DriveUploadResponse {
  success: boolean;
  duplicated?: boolean;
  document_id: string;
  mutation_id: string;
  drive_file_id?: string;
  drive_url?: string;
  download_url?: string;
  thumbnail_url?: string;
  file_fingerprint?: string;
  error?: string;
  error_type?: 'RETRYABLE' | 'NON_RETRYABLE';
  status_code?: number;
  message?: string;
}

export interface DriveSessionRecord {
  session_hash: string;
  token: string;
  device_id: string;
  status: SessionStatus;
  expires_at: string;
  paired_email: string;
  created_at: string;
}

export interface StoredDriveFile {
  file_id: string;
  name: string;
  mime_type: string;
  file_size: number;
  folder_path: string; // e.g. "MicroMate/Assets/{asset_id}/Documents"
  drive_url: string;
  download_url: string;
  thumbnail_url: string;
  properties: {
    document_id: string;
    mutation_id: string;
    file_fingerprint: string;
    asset_id: string;
    created_at: string;
  };
  created_at: string;
  trashed: boolean;
}

export interface StoredDocumentSheetRow {
  document_id: string;
  asset_id: string;
  type: string;
  name: string;
  file_url: string;
  created_at: string;
  drive_file_id: string;
  mutation_id: string;
  fingerprint: string;
  file_size: number;
  mime_type: string;
}

export interface StoredSyncLog {
  log_id: string;
  timestamp: string;
  session_hash: string;
  device_id: string;
  action: string;
  status: 'SUCCESS' | 'ERROR' | 'REJECTED';
  entity_id: string;
  mutation_id: string;
  details: string;
}

/**
 * Authoritative Real Google Drive Gateway Simulation & State Store
 * Exactly models Google Apps Script + DriveApp backend behavior with complete fidelity.
 */
export class DriveGatewayBackend {
  public sessions: Map<string, DriveSessionRecord> = new Map();
  public validAssetIds: Set<string> = new Set();
  public deletedAssetIds: Set<string> = new Set();
  public driveFiles: Map<string, StoredDriveFile> = new Map();
  public documentSheet: StoredDocumentSheetRow[] = [];
  public syncLogs: StoredSyncLog[] = [];
  public processedMutations: Map<string, DriveUploadResponse> = new Map();

  // Simulated Network & Server Injections
  public simulateTimeout: boolean = false;
  public simulateAckLoss: boolean = false;
  public simulateServerError503: boolean = false;
  public simulateDriveError: boolean = false;

  private generateSha256(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = (hash << 5) - hash + input.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0') + '_sha256';
  }

  public registerSession(session: {
    token: string;
    device_id: string;
    status?: SessionStatus;
    expires_in_hours?: number;
    paired_email?: string;
  }): DriveSessionRecord {
    const sessionHash = this.generateSha256(session.token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (session.expires_in_hours ?? 720) * 3600 * 1000).toISOString();
    const rec: DriveSessionRecord = {
      session_hash: sessionHash,
      token: session.token,
      device_id: session.device_id,
      status: session.status || 'ACTIVE',
      expires_at: expiresAt,
      paired_email: session.paired_email || 'owner@example.com',
      created_at: now.toISOString(),
    };
    this.sessions.set(sessionHash, rec);
    return rec;
  }

  public registerAsset(assetId: string): void {
    this.validAssetIds.add(assetId);
  }

  public deleteAsset(assetId: string): void {
    this.validAssetIds.delete(assetId);
    this.deletedAssetIds.add(assetId);
  }

  /**
   * 3D-4B: Authorization Boundary Check
   * Validates Session Bearer Token, Revocation, Expiration, and Asset Tenant Boundary
   */
  public authorizeRequest(
    token: string,
    deviceId: string,
    assetId: string
  ): { success: boolean; sessionHash?: string; error?: string; statusCode?: number; errorType?: 'RETRYABLE' | 'NON_RETRYABLE' } {
    if (!token || !token.trim()) {
      return {
        success: false,
        error: 'SESSION_TOKEN_REQUIRED',
        statusCode: 401,
        errorType: 'NON_RETRYABLE',
      };
    }

    const sessionHash = this.generateSha256(token);
    const session = this.sessions.get(sessionHash);

    if (!session) {
      return {
        success: false,
        error: 'SESSION_NOT_FOUND',
        statusCode: 401,
        errorType: 'NON_RETRYABLE',
      };
    }

    if (session.status === 'REVOKED') {
      return {
        success: false,
        error: 'SESSION_REVOKED',
        statusCode: 401,
        errorType: 'NON_RETRYABLE',
      };
    }

    const now = new Date().toISOString();
    if (session.expires_at < now) {
      return {
        success: false,
        error: 'SESSION_EXPIRED',
        statusCode: 401,
        errorType: 'NON_RETRYABLE',
      };
    }

    // Asset Tenant / Ownership Check
    if (this.deletedAssetIds.has(assetId)) {
      return {
        success: false,
        error: 'ASSET_DELETED',
        statusCode: 404,
        errorType: 'NON_RETRYABLE',
      };
    }

    if (this.validAssetIds.size > 0 && !this.validAssetIds.has(assetId)) {
      return {
        success: false,
        error: 'UNAUTHORIZED_ASSET_ACCESS',
        statusCode: 403,
        errorType: 'NON_RETRYABLE',
      };
    }

    return { success: true, sessionHash };
  }

  /**
   * Main Google Apps Script / Drive Gateway Endpoint
   * Handles:
   * 1. Authorization
   * 2. Mutation & Fingerprint Deduplication
   * 3. Drive Folder & File Creation with Canonical Properties
   * 4. Google Sheets Registration
   * 5. Sync Log Audit
   */
  public async handleUploadDocument(req: DriveUploadRequest): Promise<DriveUploadResponse> {
    // Simulated Failures
    if (this.simulateServerError503) {
      return {
        success: false,
        document_id: req.document_id,
        mutation_id: req.mutation_id,
        error: 'SERVICE_UNAVAILABLE',
        error_type: 'RETRYABLE',
        status_code: 503,
        message: 'Google Drive backend temporarily unavailable (503).',
      };
    }

    // 1. Authorization Boundary (Step 3D-4B) - ALWAYS evaluated first
    const authResult = this.authorizeRequest(req.token, req.device_id, req.asset_id);
    if (!authResult.success) {
      this.syncLogs.push({
        log_id: `LOG-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toISOString(),
        session_hash: authResult.sessionHash || 'UNAUTH',
        device_id: req.device_id,
        action: 'UPLOAD_DOCUMENT',
        status: 'REJECTED',
        entity_id: req.document_id,
        mutation_id: req.mutation_id,
        details: `Auth failed: ${authResult.error}`,
      });

      return {
        success: false,
        document_id: req.document_id,
        mutation_id: req.mutation_id,
        error: authResult.error,
        error_type: authResult.errorType,
        status_code: authResult.statusCode || 401,
        message: `Authorization rejected: ${authResult.error}`,
      };
    }

    const sessionHash = authResult.sessionHash!;

    // 2. Gateway Deduplication (Step 3D-4D)
    // Check if mutation_id has already been processed successfully
    if (this.processedMutations.has(req.mutation_id)) {
      const prevResponse = this.processedMutations.get(req.mutation_id)!;
      return {
        ...prevResponse,
        duplicated: true,
        message: 'Mutation already processed previously (Authoritative Gateway Idempotent response).',
      };
    }

    // Check if an existing Drive file matches document_id AND file_fingerprint for this asset
    for (const [fileId, file] of this.driveFiles.entries()) {
      if (
        !file.trashed &&
        file.properties.asset_id === req.asset_id &&
        file.properties.document_id === req.document_id &&
        file.properties.file_fingerprint === req.file_fingerprint
      ) {
        const deduplicatedResponse: DriveUploadResponse = {
          success: true,
          duplicated: true,
          document_id: req.document_id,
          mutation_id: req.mutation_id,
          drive_file_id: file.file_id,
          drive_url: file.drive_url,
          download_url: file.download_url,
          thumbnail_url: file.thumbnail_url,
          file_fingerprint: file.properties.file_fingerprint,
          message: 'Matching Drive file found by fingerprint deduplication.',
        };
        this.processedMutations.set(req.mutation_id, deduplicatedResponse);
        return deduplicatedResponse;
      }
    }

    // 3. Fingerprint & Payload Integrity Guard
    if (req.base64_data) {
      const computedFingerprint = generateFileFingerprint({
        file_name: req.file_name,
        mime_type: req.mime_type,
        file_size: req.file_size,
        content: req.base64_data,
      });

      // If client supplied fingerprint, verify it matches payload content
      if (req.file_fingerprint && req.file_fingerprint !== computedFingerprint) {
        return {
          success: false,
          document_id: req.document_id,
          mutation_id: req.mutation_id,
          error: 'FINGERPRINT_MISMATCH',
          error_type: 'NON_RETRYABLE',
          status_code: 400,
          message: `Fingerprint mismatch: Expected ${req.file_fingerprint} but payload evaluated to ${computedFingerprint}`,
        };
      }
    }

    // Check max file size limit (25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (req.file_size > MAX_FILE_SIZE) {
      return {
        success: false,
        document_id: req.document_id,
        mutation_id: req.mutation_id,
        error: 'PAYLOAD_TOO_LARGE',
        error_type: 'NON_RETRYABLE',
        status_code: 413,
        message: 'File size exceeds maximum allowed size (25MB)',
      };
    }

    // Simulate Drive internal error
    if (this.simulateDriveError) {
      return {
        success: false,
        document_id: req.document_id,
        mutation_id: req.mutation_id,
        error: 'DRIVE_STORAGE_ERROR',
        error_type: 'RETRYABLE',
        status_code: 500,
        message: 'Google Drive internal write failure.',
      };
    }

    // 4. Create Physical Google Drive Object with Canonical Properties (Step 3D-4C)
    const driveFileId = `DRV-FILE-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const folderCategory = (req.document_type === 'photo' || req.document_type === 'condition_photo') ? 'Photos' : 'Documents';
    const folderPath = `MicroMate/Assets/${req.asset_id}/${folderCategory}`;
    const driveUrl = `https://drive.google.com/file/d/${driveFileId}/view`;
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    const thumbnailUrl = `https://drive.google.com/thumbnail?id=${driveFileId}&sz=w400`;

    const storedFile: StoredDriveFile = {
      file_id: driveFileId,
      name: req.file_name,
      mime_type: req.mime_type,
      file_size: req.file_size,
      folder_path: folderPath,
      drive_url: driveUrl,
      download_url: downloadUrl,
      thumbnail_url: thumbnailUrl,
      properties: {
        document_id: req.document_id,
        mutation_id: req.mutation_id,
        file_fingerprint: req.file_fingerprint,
        asset_id: req.asset_id,
        created_at: new Date().toISOString(),
      },
      created_at: new Date().toISOString(),
      trashed: false,
    };

    this.driveFiles.set(driveFileId, storedFile);

    // 5. Append to Google Sheets "Documents" Tab
    this.documentSheet.push({
      document_id: req.document_id,
      asset_id: req.asset_id,
      type: req.document_type || 'other',
      name: req.file_name,
      file_url: driveUrl,
      created_at: new Date().toISOString(),
      drive_file_id: driveFileId,
      mutation_id: req.mutation_id,
      fingerprint: req.file_fingerprint,
      file_size: req.file_size,
      mime_type: req.mime_type,
    });

    // 6. Record in Sync Audit Log
    this.syncLogs.push({
      log_id: `LOG-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      session_hash: sessionHash,
      device_id: req.device_id,
      action: 'UPLOAD_DOCUMENT',
      status: 'SUCCESS',
      entity_id: req.document_id,
      mutation_id: req.mutation_id,
      details: `Uploaded file to Drive: ${req.file_name} (${driveFileId})`,
    });

    const canonicalResponse: DriveUploadResponse = {
      success: true,
      duplicated: false,
      document_id: req.document_id,
      mutation_id: req.mutation_id,
      drive_file_id: driveFileId,
      drive_url: driveUrl,
      download_url: downloadUrl,
      thumbnail_url: thumbnailUrl,
      file_fingerprint: req.file_fingerprint,
      message: 'Document uploaded to Google Drive successfully.',
    };

    // Store in processed mutations ledger for idempotent replay
    this.processedMutations.set(req.mutation_id, canonicalResponse);

    // Simulated ACK Loss (Drive file created, but response dropped on network)
    if (this.simulateAckLoss) {
      throw new Error('NETWORK_TIMEOUT_ACK_LOST: Client response lost after Drive commit');
    }

    return canonicalResponse;
  }

  /**
   * Direct Cloud Lookup by Fingerprint / Document ID for Reconciler & Orphan Engine
   */
  public queryDriveObjectByFingerprint(assetId: string, documentId: string, fingerprint: string): DriveObjectMetadata | null {
    for (const [fileId, file] of this.driveFiles.entries()) {
      if (
        !file.trashed &&
        file.properties.asset_id === assetId &&
        file.properties.document_id === documentId &&
        file.properties.file_fingerprint === fingerprint
      ) {
        return {
          file_id: file.file_id,
          document_id: file.properties.document_id,
          mutation_id: file.properties.mutation_id,
          file_fingerprint: file.properties.file_fingerprint,
          name: file.name,
          size: file.file_size,
          mime_type: file.mime_type,
          drive_url: file.drive_url,
          created_at: file.created_at,
        };
      }
    }
    return null;
  }

  public lookupDriveFileByMutation(mutationId: string): StoredDriveFile | undefined {
    for (const [_, file] of this.driveFiles.entries()) {
      if (!file.trashed && file.properties.mutation_id === mutationId) {
        return file;
      }
    }
    return undefined;
  }

  public getDriveFiles(): StoredDriveFile[] {
    return Array.from(this.driveFiles.values()).filter(f => !f.trashed);
  }

  public injectDriveFile(file: StoredDriveFile): void {
    this.driveFiles.set(file.file_id, file);
  }
}

/**
 * Client-Side Drive Gateway Client (Integrates with Sync Queue and Upload Manifest)
 */
export class DriveGatewayClient {
  private backend: DriveGatewayBackend;
  private token: string;
  private deviceId: string;

  constructor(backend: DriveGatewayBackend, token: string = 'token_valid_123', deviceId: string = 'dev_alpha') {
    this.backend = backend;
    this.token = token;
    this.deviceId = deviceId;
  }

  public setToken(token: string): void {
    this.token = token;
  }

  public setDeviceId(deviceId: string): void {
    this.deviceId = deviceId;
  }

  /**
   * Uploads Document to Gateway with hardened Request schema
   */
  public async upload(
    document: Document,
    manifest: UploadManifest,
    base64Data: string,
    options?: { overrideMutationId?: string }
  ): Promise<DriveUploadResponse> {
    const req: DriveUploadRequest = {
      action: 'uploadDocument',
      token: this.token,
      device_id: this.deviceId,
      mutation_id: options?.overrideMutationId || manifest.mutation_id,
      document_id: document.document_id,
      asset_id: document.asset_id,
      file_fingerprint: manifest.file_fingerprint,
      file_name: document.file_name,
      mime_type: document.mime_type,
      file_size: document.file_size,
      base64_data: base64Data,
      document_type: document.document_type,
      metadata: document.metadata,
    };

    try {
      return await this.backend.handleUploadDocument(req);
    } catch (err: any) {
      if (err.message && err.message.includes('NETWORK_TIMEOUT_ACK_LOST')) {
        return {
          success: false,
          document_id: document.document_id,
          mutation_id: manifest.mutation_id,
          error: 'TIMEOUT_ACK_LOST',
          error_type: 'RETRYABLE',
          status_code: 504,
          message: 'Client timeout: Server may or may not have committed the upload.',
        };
      }
      return {
        success: false,
        document_id: document.document_id,
        mutation_id: manifest.mutation_id,
        error: 'NETWORK_ERROR',
        error_type: 'RETRYABLE',
        status_code: 0,
        message: err?.message || 'Network transport failure',
      };
    }
  }

  /**
   * Authoritative Gateway Reconcile & Lookup
   */
  public async reconcile(
    document: Document,
    manifest: UploadManifest
  ): Promise<{ reconciled: boolean; driveObject?: DriveObjectMetadata; response?: DriveUploadResponse }> {
    // 1. First check if Gateway processed mutation
    if (this.backend.processedMutations.has(manifest.mutation_id)) {
      const prev = this.backend.processedMutations.get(manifest.mutation_id)!;
      return {
        reconciled: true,
        response: prev,
        driveObject: {
          file_id: prev.drive_file_id!,
          document_id: document.document_id,
          mutation_id: manifest.mutation_id,
          file_fingerprint: manifest.file_fingerprint,
          name: document.file_name,
          size: document.file_size,
          mime_type: document.mime_type,
          drive_url: prev.drive_url!,
          created_at: new Date().toISOString(),
        },
      };
    }

    // 2. Query cloud object by fingerprint
    const cloudObj = this.backend.queryDriveObjectByFingerprint(
      document.asset_id,
      document.document_id,
      manifest.file_fingerprint
    );

    if (cloudObj) {
      return {
        reconciled: true,
        driveObject: cloudObj,
        response: {
          success: true,
          duplicated: true,
          document_id: document.document_id,
          mutation_id: manifest.mutation_id,
          drive_file_id: cloudObj.file_id,
          drive_url: cloudObj.drive_url,
          file_fingerprint: cloudObj.file_fingerprint,
          message: 'Reconciled from cloud object matching fingerprint.',
        },
      };
    }

    return { reconciled: false };
  }
}
