/**
 * MICROMATE PHASE 3D-5: DOCUMENT PRESENTATION & CAPABILITY MAPPER
 * Pure functional projection layer separating Domain entities from Presentation Components.
 * 
 * Invariants:
 * 1. 7 Canonical UI Categories
 * 2. Centralized Presentation State Mapping (Zero scattered if/else on sync_status in JSX)
 * 3. Action Capability Mapping (Strictly disables Drive URL actions if not SYNCED)
 * 4. Filter & Search Purity (Pure functions, zero domain mutations)
 * 5. Metadata Mutation vs Content Upload Separation
 */

import { Document, DocumentType, DocumentSyncStatus } from '../types';

export type UICategoryKey = 
  | 'ALL'
  | 'REGISTRATION'
  | 'WARRANTY'
  | 'INVOICE'
  | 'MANUAL'
  | 'INSURANCE'
  | 'PHOTO'
  | 'OTHER';

export interface UICategoryDefinition {
  key: UICategoryKey;
  label: string;
  badgeLabel: string;
  iconName: string;
  colorTheme: string;
  types: DocumentType[];
}

export const UI_CATEGORIES: UICategoryDefinition[] = [
  {
    key: 'REGISTRATION',
    label: 'Registrasi & Legal',
    badgeLabel: 'Legalitas',
    iconName: 'FileBadge2',
    colorTheme: 'blue',
    types: ['stnk', 'bpkb', 'registration']
  },
  {
    key: 'WARRANTY',
    label: 'Garansi',
    badgeLabel: 'Garansi',
    iconName: 'ShieldCheck',
    colorTheme: 'emerald',
    types: ['warranty']
  },
  {
    key: 'INVOICE',
    label: 'Faktur & Nota',
    badgeLabel: 'Nota & Kwitansi',
    iconName: 'Receipt',
    colorTheme: 'amber',
    types: ['invoice', 'purchase_receipt', 'service_receipt']
  },
  {
    key: 'MANUAL',
    label: 'Buku Petunjuk',
    badgeLabel: 'Buku Manual',
    iconName: 'BookOpen',
    colorTheme: 'violet',
    types: ['manual']
  },
  {
    key: 'INSURANCE',
    label: 'Asuransi',
    badgeLabel: 'Polis Asuransi',
    iconName: 'Umbrella',
    colorTheme: 'teal',
    types: ['insurance']
  },
  {
    key: 'PHOTO',
    label: 'Foto Kondisi',
    badgeLabel: 'Dokumentasi Foto',
    iconName: 'Camera',
    colorTheme: 'indigo',
    types: ['condition_photo', 'photo']
  },
  {
    key: 'OTHER',
    label: 'Lainnya',
    badgeLabel: 'Dokumen',
    iconName: 'FileText',
    colorTheme: 'slate',
    types: ['other']
  }
];

export interface DocumentPresentationState {
  label: string;
  description: string;
  badgeStyle: string; // Tailwind class string
  iconName: string;
  tone: 'neutral' | 'info' | 'progress' | 'warning' | 'success' | 'danger';
  isLoading: boolean;
  canRetry: boolean;
}

export interface DocumentActionCapabilities {
  canViewLocal: boolean;
  canViewCloud: boolean;
  canDownload: boolean;
  canEditMetadata: boolean;
  canDelete: boolean;
  canRetryUpload: boolean;
  primaryAction: 'view' | 'retry' | 'wait' | 'none';
}

export type DocumentSortOption = 'NEWEST' | 'OLDEST' | 'NAME_ASC' | 'NAME_DESC' | 'SIZE_DESC';

/**
 * Maps Document entity to its Canonical UI Category Definition
 */
export function getDocumentCategory(document: Document | { document_type: DocumentType }): UICategoryDefinition {
  const docType = document.document_type || 'other';
  const found = UI_CATEGORIES.find(cat => cat.types.includes(docType));
  return found || UI_CATEGORIES[6]; // Fallback to OTHER (Lainnya)
}

/**
 * Maps sync status to Human-friendly presentation state without exposing internal jargon
 */
export function getDocumentPresentationState(document: Document): DocumentPresentationState {
  const status: DocumentSyncStatus = document.sync_status || 'LOCAL_ONLY';

  switch (status) {
    case 'LOCAL_ONLY':
      return {
        label: 'Tersimpan Lokal',
        description: 'Tersimpan di perangkat, menunggu sinkronisasi cloud.',
        badgeStyle: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
        iconName: 'HardDrive',
        tone: 'warning',
        isLoading: false,
        canRetry: false
      };
    case 'QUEUED':
      return {
        label: 'Dalam Antrean',
        description: 'Menunggu giliran upload ke Google Drive.',
        badgeStyle: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
        iconName: 'Clock',
        tone: 'info',
        isLoading: false,
        canRetry: false
      };
    case 'UPLOADING':
      return {
        label: 'Mengunggah…',
        description: 'Sedang mentransfer berkas ke Google Drive.',
        badgeStyle: 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800/60',
        iconName: 'Loader2',
        tone: 'progress',
        isLoading: true,
        canRetry: false
      };
    case 'UNKNOWN':
      return {
        label: 'Memeriksa Status…',
        description: 'Koneksi terputus saat upload. Sistem sedang memverifikasi integritas di Google Drive.',
        badgeStyle: 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800/60',
        iconName: 'HelpCircle',
        tone: 'warning',
        isLoading: true,
        canRetry: false
      };
    case 'SYNCED':
      return {
        label: 'Tersimpan di Cloud',
        description: 'Tersimpan aman di Google Drive & terdaftar di Google Sheets.',
        badgeStyle: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
        iconName: 'CheckCircle2',
        tone: 'success',
        isLoading: false,
        canRetry: false
      };
    case 'FAILED_RETRYABLE':
      return {
        label: 'Gagal Diunggah',
        description: document.last_error || 'Gagal tersambung ke server. Klik Coba Lagi untuk mengulang.',
        badgeStyle: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
        iconName: 'AlertTriangle',
        tone: 'danger',
        isLoading: false,
        canRetry: true
      };
    case 'FAILED_PERMANENT':
      return {
        label: 'Tidak Dapat Diunggah',
        description: document.last_error || 'Berkas melebihi batas ukuran (25MB) atau format tidak diizinkan.',
        badgeStyle: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        iconName: 'XCircle',
        tone: 'neutral',
        isLoading: false,
        canRetry: false
      };
    default:
      return {
        label: 'Menunggu',
        description: 'Status dokumen tidak diketahui.',
        badgeStyle: 'bg-gray-100 text-gray-700 border-gray-200',
        iconName: 'File',
        tone: 'neutral',
        isLoading: false,
        canRetry: false
      };
  }
}

/**
 * Capability Mapper: Authoritatively governs which user interactions are valid
 */
export function getDocumentActionCapabilities(document: Document): DocumentActionCapabilities {
  const hasLocal = !!document.local_file_ref;
  const isSynced = document.sync_status === 'SYNCED' && !!document.drive_file_id && !!document.drive_url;
  const isRetryable = document.sync_status === 'FAILED_RETRYABLE';
  const isUploading = document.sync_status === 'UPLOADING' || document.sync_status === 'UNKNOWN';

  let primaryAction: 'view' | 'retry' | 'wait' | 'none' = 'none';
  if (isRetryable) {
    primaryAction = 'retry';
  } else if (isUploading) {
    primaryAction = 'wait';
  } else if (hasLocal || isSynced) {
    primaryAction = 'view';
  }

  return {
    canViewLocal: hasLocal,
    canViewCloud: isSynced,
    canDownload: hasLocal || isSynced,
    canEditMetadata: !document.deleted,
    canDelete: !document.deleted,
    canRetryUpload: isRetryable,
    primaryAction
  };
}

/**
 * Pure Functional Document Filter
 * Zero mutation side-effects.
 */
export function filterDocuments(
  documents: Document[],
  options: {
    categoryKey?: UICategoryKey;
    searchQuery?: string;
    includeDeleted?: boolean;
  }
): Document[] {
  const { categoryKey = 'ALL', searchQuery = '', includeDeleted = false } = options;
  const trimmedQuery = searchQuery.trim().toLowerCase();

  return documents.filter((doc) => {
    // 1. Tombstone filtering
    if (!includeDeleted && doc.deleted) {
      return false;
    }
    if (includeDeleted && !doc.deleted) {
      return false;
    }

    // 2. Category matching
    if (categoryKey !== 'ALL') {
      const catDef = UI_CATEGORIES.find(c => c.key === categoryKey);
      if (catDef && !catDef.types.includes(doc.document_type)) {
        return false;
      }
    }

    // 3. Search query matching
    if (trimmedQuery) {
      const matchTitle = doc.title?.toLowerCase().includes(trimmedQuery);
      const matchFileName = doc.file_name?.toLowerCase().includes(trimmedQuery);
      const matchNotes = doc.notes?.toLowerCase().includes(trimmedQuery);
      const matchTags = doc.tags?.some(t => t.toLowerCase().includes(trimmedQuery));
      if (!matchTitle && !matchFileName && !matchNotes && !matchTags) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Pure Functional Document Sorter
 * Zero mutation side-effects.
 */
export function sortDocuments(documents: Document[], sortBy: DocumentSortOption = 'NEWEST'): Document[] {
  const copied = [...documents];

  switch (sortBy) {
    case 'NEWEST':
      return copied.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case 'OLDEST':
      return copied.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    case 'NAME_ASC':
      return copied.sort((a, b) => (a.title || a.file_name).localeCompare(b.title || b.file_name));
    case 'NAME_DESC':
      return copied.sort((a, b) => (b.title || b.file_name).localeCompare(a.title || a.file_name));
    case 'SIZE_DESC':
      return copied.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
    default:
      return copied;
  }
}

/**
 * Format bytes to readable string (e.g. "1.4 MB", "350 KB")
 */
export function formatDocumentFileSize(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
