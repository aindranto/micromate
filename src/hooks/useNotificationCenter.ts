import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClientNotification, CanonicalSignal } from '../types';
import {
  listClientNotifications,
  transitionClientState,
  subscribeToNotificationStore
} from '../lib/clientNotificationService';
import { synchronizeClientNotifications } from '../lib/clientNotificationSync';
import { parseDeepLink } from '../lib/clientNotificationHandoff';
import { getNotificationPreferences } from '../lib/notificationPreferenceService';

/**
 * MICROMATE — PHASE 6-3A: NOTIFICATION CENTER CONTRACT (ADAPTOR PATTERN)
 * 
 * Boundary Checks:
 * 1. Read-Only Projection: This hook reads from the local store but does not define operational truth.
 * 2. Strict State Transitions: Marking read/opened triggers state updates in the store, never directly in the UI state.
 * 3. 3F Core Supremacy: Terminal states (e.g. OBSOLETE) are derived only from sync with active 3F signals.
 * 4. Reactive Preferences Filtering: Filters visual representation dynamically based on user settings.
 */
export function useNotificationCenter(userId?: string) {
  const [rawNotifications, setRawNotifications] = useState<ClientNotification[]>([]);
  const [preferences, setPreferences] = useState(() => getNotificationPreferences());

  // Reload notifications from database and sort by created_at descending
  const reload = useCallback(() => {
    const list = listClientNotifications(userId);
    // Sort so newest is on top
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setRawNotifications(sorted);
    setPreferences(getNotificationPreferences());
  }, [userId]);

  // Subscribe to store updates and custom preference storage events
  useEffect(() => {
    // Initial load
    reload();

    // Register subscription
    const unsubscribe = subscribeToNotificationStore(() => {
      reload();
    });

    // Register preference changed listener
    const handlePrefsChange = () => {
      setPreferences(getNotificationPreferences());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('micromate_notification_preferences_changed', handlePrefsChange);
      // Also fallback storage event for multi-tab sync
      window.addEventListener('storage', handlePrefsChange);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('micromate_notification_preferences_changed', handlePrefsChange);
        window.removeEventListener('storage', handlePrefsChange);
      }
    };
  }, [reload]);

  // Dynamically project filtered notifications based on active subscription preferences (6-3E-03 & 6-3E-04)
  const notifications = useMemo(() => {
    if (!preferences.globalEnabled) {
      return [];
    }

    return rawNotifications.filter((notif) => {
      const signalType = notif.signal_snapshot.signal_type;
      
      let categoryKey: keyof typeof preferences.categories | null = null;
      if (signalType === 'DOCUMENT_EXPIRING_SOON' || signalType === 'STNK_EXPIRY') {
        categoryKey = 'DOCUMENT_EXPIRING_SOON';
      } else if (signalType === 'DOCUMENT_EXPIRED') {
        categoryKey = 'DOCUMENT_EXPIRED';
      } else if (signalType === 'MAINTENANCE_OVERDUE' || signalType === 'SERVICE_OVERDUE') {
        categoryKey = 'MAINTENANCE_OVERDUE';
      } else if (signalType === 'COST_TREND_INCREASE') {
        categoryKey = 'COST_TREND_INCREASE';
      }

      if (!categoryKey) return true; // Keep uncategorized
      
      const channelPref = preferences.categories[categoryKey];
      return channelPref ? channelPref.inApp : true;
    });
  }, [rawNotifications, preferences]);

  // Derived presentation states (P-02: Ephemeral states)
  const unreadNotifications = useMemo(() => {
    return notifications.filter(n => n.client_state === 'UNREAD');
  }, [notifications]);

  const unreadCount = unreadNotifications.length;

  // Mark an individual notification as READ (P-03)
  const markAsRead = useCallback((notificationId: string) => {
    try {
      transitionClientState(notificationId, 'READ');
    } catch (err: any) {
      console.warn(`[Notification Center] Failed to mark as READ: ${err.message}`);
    }
  }, []);

  // Mark all unread notifications as READ (P-03)
  const markAllAsRead = useCallback(() => {
    const unreadIds = listClientNotifications(userId)
      .filter(n => n.client_state === 'UNREAD')
      .map(n => n.notification_id);

    unreadIds.forEach(id => {
      try {
        transitionClientState(id, 'READ');
      } catch (e) {}
    });
  }, [userId]);

  // Safely open notification and trigger client state update (OPENED)
  const openNotification = useCallback((notificationId: string) => {
    try {
      const updated = transitionClientState(notificationId, 'OPENED');
      return parseDeepLink(updated.action_binding.deep_link);
    } catch (err: any) {
      console.warn(`[Notification Center] Failed to open notification: ${err.message}`);
      return null;
    }
  }, []);

  // Synchronize notifications with active 3F signals to trigger OBSOLETE convergence (Pipeline 1)
  const syncWith3F = useCallback((activeSignals: CanonicalSignal[]) => {
    const ids = rawNotifications.map(n => n.notification_id);
    if (ids.length === 0) return;
    
    try {
      synchronizeClientNotifications(ids, activeSignals);
    } catch (err: any) {
      console.warn(`[Notification Center] Sync failed: ${err.message}`);
    }
  }, [rawNotifications]);

  return {
    notifications,
    unreadCount,
    unreadNotifications,
    markAsRead,
    markAllAsRead,
    openNotification,
    syncWith3F,
    reload,
    preferences
  };
}
