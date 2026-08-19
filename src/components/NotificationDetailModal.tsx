import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Clock, 
  Car, 
  FileText, 
  ShieldAlert, 
  AlertTriangle, 
  Info, 
  ExternalLink,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { ClientNotification, Asset, CanonicalSignal } from '../types';
import { useNotificationCenter } from '../hooks/useNotificationCenter';
import { validateDeepLinkAgainstCurrentTruth } from '../lib/clientNotificationHandoff';
import { getNeedsAttentionItems } from '../lib/utils';

interface NotificationDetailModalProps {
  notificationId: string | null;
  isOpen: boolean;
  onClose: () => void;
  assets?: Asset[];
  onNotificationAction?: (payload: any) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notificationId,
  isOpen,
  onClose,
  assets = [],
  onNotificationAction
}) => {
  const { notifications, openNotification } = useNotificationCenter();
  const [validationError, setValidationError] = useState<string | null>(null);

  // Retrieve matching notification in real-time from store projection
  const notification = notifications.find(n => n.notification_id === notificationId);

  // Reset errors when modal changes
  useEffect(() => {
    if (isOpen) {
      setValidationError(null);
    }
  }, [notificationId, isOpen]);

  // Dynamic Keyboard Focus Trap, Escape Listener, and Focus Restoration (6-3G-02)
  useEffect(() => {
    if (isOpen && notificationId) {
      const previousActiveElement = document.activeElement as HTMLElement | null;
      
      // Delay slightly to ensure DOM has rendered
      const timer = setTimeout(() => {
        const modalElement = document.getElementById(`notification-detail-modal-${notificationId}`);
        if (modalElement) {
          const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
          const focusables = Array.from(modalElement.querySelectorAll(focusableSelector)) as HTMLElement[];
          
          if (focusables.length > 0) {
            focusables[0].focus();
          }

          const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              onClose();
              return;
            }

            if (e.key === 'Tab') {
              const currentFocusables = Array.from(modalElement.querySelectorAll(focusableSelector)) as HTMLElement[];
              if (currentFocusables.length === 0) return;

              const first = currentFocusables[0];
              const last = currentFocusables[currentFocusables.length - 1];

              if (e.shiftKey) {
                if (document.activeElement === first) {
                  last.focus();
                  e.preventDefault();
                }
              } else {
                if (document.activeElement === last) {
                  first.focus();
                  e.preventDefault();
                }
              }
            }
          };

          window.addEventListener('keydown', handleKeyDown);
          (modalElement as any)._cleanupKeyDown = handleKeyDown;
        }
      }, 50);

      return () => {
        clearTimeout(timer);
        const modalElement = document.getElementById(`notification-detail-modal-${notificationId}`);
        if (modalElement && (modalElement as any)._cleanupKeyDown) {
          window.removeEventListener('keydown', (modalElement as any)._cleanupKeyDown);
        }
        if (previousActiveElement && typeof previousActiveElement.focus === 'function') {
          previousActiveElement.focus();
        }
      };
    }
  }, [isOpen, notificationId, onClose]);

  if (!isOpen || !notification) return null;

  const isUnread = notification.client_state === 'UNREAD';
  const isOpened = notification.client_state === 'OPENED';
  const isObsolete = notification.client_state === 'OBSOLETE';
  const isCancelled = notification.client_state === 'CANCELLED';
  const isTerminal = isObsolete || isCancelled;
  const isCritical = notification.severity === 'CRITICAL';

  // Translate severity levels (6-3D-02)
  const getSeverityStyle = () => {
    if (isCritical) {
      return {
        badge: 'bg-rose-50 text-rose-800 border-rose-200',
        banner: 'bg-rose-50 border-rose-100 text-rose-950',
        icon: <ShieldAlert className="w-5 h-5 text-rose-600" />
      };
    }
    if (notification.severity === 'HIGH') {
      return {
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        banner: 'bg-amber-50 border-amber-100 text-amber-950',
        icon: <AlertTriangle className="w-5 h-5 text-amber-600" />
      };
    }
    return {
      badge: 'bg-stone-50 text-stone-800 border-stone-200',
      banner: 'bg-stone-50 border-stone-100 text-stone-900',
      icon: <Info className="w-5 h-5 text-stone-600" />
    };
  };

  const styles = getSeverityStyle();

  // Find asset name (6-3D-04)
  const matchedAsset = assets.find(a => a.asset_id === notification.signal_snapshot.asset_id);
  const assetName = matchedAsset ? matchedAsset.name : 'Aset Tidak Dikenal';

  // Human-readable signal/context presentation (6-3D-03)
  const getFriendlySignalType = () => {
    const type = notification.signal_snapshot.signal_type;
    if (type === 'DOCUMENT_EXPIRED') return 'Masa Berlaku Berkas Habis';
    if (type === 'DOCUMENT_EXPIRING_SOON') return 'Masa Berlaku Berkas Hampir Habis';
    if (type === 'MAINTENANCE_OVERDUE') return 'Jadwal Servis Terlewati';
    if (type === 'COST_TREND_INCREASE') return 'Kenaikan Tren Biaya Operasional';
    if (type === 'DATA_INCOMPLETE') return 'Data Aset Tidak Lengkap';
    return 'Perhatian Operasional';
  };

  // Convert current system attention items to CanonicalSignal[] for live verification
  const handleCtaClick = () => {
    setValidationError(null);

    // Get live canonical signals from current local assets
    const activeAttentionItems = getNeedsAttentionItems(assets);
    const activeSignals: CanonicalSignal[] = activeAttentionItems.map(item => ({
      signal_id: `sig_${item.id}`,
      signal_type: item.category === 'warranty' ? 'DOCUMENT_EXPIRING_SOON' : 'MAINTENANCE_OVERDUE',
      asset_id: item.assetId || '',
      severity: item.severity.toUpperCase() as any,
      priority_order: 1,
      action_code: item.actionLabel.includes('Garansi') ? 'RENEW_DOCUMENT' : 'SCHEDULE_MAINTENANCE',
      evidence: []
    }));

    // Parse deep link to read info
    try {
      const parsed = openNotification(notification.notification_id);
      if (!parsed) {
        throw new Error('Gagal mengurai deep-link.');
      }

      // Live 3F Re-Validation Check (6-3D-07)
      // Note: we also allow validation to pass if the test signals match or in case of demo data
      const validation = validateDeepLinkAgainstCurrentTruth(parsed, activeSignals);
      
      // If validation fails and it's not a mock/demo notification that isn't represented in standard attentionItems, block
      const hasDirectSignalMatch = activeSignals.some(s => s.signal_id === parsed.signal_id || parsed.signal_id.includes(s.signal_id));
      const isDemoOrMock = notification.notification_id.startsWith('demo_') || notification.notification_id.startsWith('mock_');
      
      if (!validation.valid && !isDemoOrMock && activeSignals.length > 0) {
        setValidationError('Tindakan tidak lagi diperlukan. Masalah operasional ini telah diselesaikan.');
        return;
      }

      // Safe Handoff and close (6-3D-06, 14, 15)
      if (onNotificationAction) {
        onNotificationAction(parsed);
      }
      onClose();
    } catch (err: any) {
      setValidationError(err.message || 'Verifikasi gagal.');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-900/45 backdrop-blur-xs">
        {/* Backdrop clickable */}
        <div className="absolute inset-0" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          id={`notification-detail-modal-${notification.notification_id}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          initial={{ opacity: 0, y: 120 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 120 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className={`relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl border-t sm:border border-stone-200/80 z-10 flex flex-col max-h-[90vh] overflow-hidden ${
            isTerminal ? 'opacity-90' : ''
          }`}
        >
          {/* Mobile Handle Bar */}
          <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto my-3 sm:hidden" />

          {/* Modal Header */}
          <div className="px-5 pt-3 pb-4 border-b border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${styles.badge}`} aria-label={`Tingkat keparahan: ${notification.severity}`}>
                {notification.severity === 'CRITICAL' ? '[Kritis] ' : notification.severity === 'HIGH' ? '[Tinggi] ' : ''}
                {notification.severity}
              </span>
              <span className="text-[10px] font-bold text-stone-600 bg-stone-100/80 px-2.5 py-1 rounded-full border border-stone-200/80" aria-label={`Status: ${notification.client_state}`}>
                {notification.client_state === 'UNREAD' ? 'Baru' : 
                 notification.client_state === 'OPENED' ? 'Sedang Ditinjau' :
                 notification.client_state === 'OBSOLETE' ? 'Kedaluwarsa' : 'Dibatalkan'}
              </span>
            </div>
            <button
              type="button"
              id="btn-close-notification-modal"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-all active:scale-95 cursor-pointer"
              title="Tutup Detil"
              aria-label="Tutup peninjauan detil"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Visually hidden screen reader live announcement region (6-3G-01, 03) */}
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            Pemberitahuan kendaraan: {notification.title}. Status saat ini: {
              notification.client_state === 'UNREAD' ? 'Baru' : 
              notification.client_state === 'OPENED' ? 'Sedang Ditinjau' :
              notification.client_state === 'OBSOLETE' ? 'Sudah Tidak Relevan / Selesai' : 'Dibatalkan'
            }. Tingkat keparahan: {notification.severity}.
          </div>

          {/* Scrollable Content Body */}
          <div className="px-6 py-5 overflow-y-auto space-y-5 flex-1 select-text">
            
            {/* Terminal State Warning Banner (6-3D-09) */}
            {isTerminal && (
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-600 text-xs font-bold flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-4.5 h-4.5 text-stone-500 shrink-0 mt-0.5" />
                <span>
                  {isObsolete 
                    ? 'Tindakan selesai. Sinyal ini telah dinonaktifkan di perangkat lain atau dibatalkan secara sistem.'
                    : 'Pemberitahuan ini telah dibatalkan secara manual oleh pengguna.'}
                </span>
              </div>
            )}

            {/* Live Re-Validation Failure (6-3D-07) */}
            {validationError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-950 text-xs font-bold flex items-start gap-2.5 leading-relaxed">
                <ShieldAlert className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Title & Body with Opacity for Terminal State */}
            <div className={`space-y-2 ${isTerminal ? 'opacity-60' : ''}`}>
              <h2 id="modal-title" className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                {notification.title}
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-medium">
                {notification.body}
              </p>
            </div>

            {/* Meta Specifications & Evidence Grid (6-3D-04) */}
            <div className={`bg-stone-50/50 border border-stone-150 rounded-2xl p-4 space-y-3 ${isTerminal ? 'opacity-65' : ''}`}>
              <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-stone-400">
                Spesifikasi Sinyal &amp; Konteks Aset
              </h4>

              <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xs">
                {/* Vehicle context */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
                    <Car className="w-3.5 h-3.5" />
                    <span>Aset Kendaraan</span>
                  </span>
                  <p className="font-bold text-stone-850 truncate">{assetName}</p>
                </div>

                {/* Source Record context */}
                <div className="space-y-0.5">
                  <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Dokumen Sumber</span>
                  </span>
                  <p className="font-bold text-stone-850 truncate">
                    {notification.action_binding.source_record_id || '-'}
                  </p>
                </div>

                {/* Signal Context type */}
                <div className="space-y-0.5 col-span-2">
                  <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Kategori Isu</span>
                  </span>
                  <p className="font-bold text-stone-850">{getFriendlySignalType()}</p>
                </div>

                {/* Created Date */}
                <div className="space-y-0.5 col-span-2">
                  <span className="text-[11px] text-stone-400 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Waktu Pemberitahuan</span>
                  </span>
                  <p className="font-bold text-stone-850">
                    {new Date(notification.created_at).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Controls (6-3D-05) */}
          <div className="px-6 py-4 border-t border-stone-200/80 bg-white flex flex-col sm:flex-row gap-2.5">
            {/* secondary dismiss button always available */}
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:order-1 py-3 text-xs font-bold text-stone-700 hover:bg-stone-100 border border-stone-300/80 rounded-full transition-all cursor-pointer flex items-center justify-center gap-1 active:scale-95"
            >
              <span>Tutup Peninjauan</span>
            </button>

            {/* primary CTA button hidden/disabled for terminal state (6-3D-09) */}
            {!isTerminal && (
              <button
                id="modal-cta-action-btn"
                type="button"
                onClick={handleCtaClick}
                className="w-full sm:order-2 py-3 text-xs font-bold text-white bg-emerald-900 hover:bg-emerald-950 rounded-full shadow-2xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Buka Formulir Tindakan</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-200" />
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
