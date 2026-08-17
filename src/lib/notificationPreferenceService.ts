import { NotificationPreferences, NotificationChannelPreference } from '../types';

/**
 * Generates the contract-compliant default opt-in notification preference matrix.
 * By default, in-app notifications are enabled, while browserPush and email are opt-in.
 */
export function generateDefaultPreferences(): NotificationPreferences {
  const isNotificationSupported = typeof window !== 'undefined' && 'Notification' in window;
  let browserPermission: 'default' | 'granted' | 'denied' | 'unsupported' = 'unsupported';
  
  if (isNotificationSupported) {
    const perm = window.Notification.permission;
    if (perm === 'granted' || perm === 'denied' || perm === 'default') {
      browserPermission = perm;
    } else {
      browserPermission = 'default';
    }
  }

  return {
    globalEnabled: true,
    browserPermissionState: browserPermission,
    categories: {
      DOCUMENT_EXPIRING_SOON: { inApp: true, browserPush: false, email: false },
      DOCUMENT_EXPIRED: { inApp: true, browserPush: false, email: false },
      MAINTENANCE_OVERDUE: { inApp: true, browserPush: false, email: false },
      COST_TREND_INCREASE: { inApp: true, browserPush: false, email: false }
    }
  };
}

const STORAGE_KEY = 'micromate_notification_preferences';

/**
 * Retrieves the persisted notification preferences from localStorage.
 * Automatically falls back to default settings with robust error recovery.
 */
export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === 'undefined') {
    return generateDefaultPreferences();
  }

  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) {
    const defaultPrefs = generateDefaultPreferences();
    // Persist default preferences so it's initialized on first load
    saveNotificationPreferences(defaultPrefs);
    return defaultPrefs;
  }

  try {
    const parsed = JSON.parse(data);
    const defaults = generateDefaultPreferences();
    
    // Defensive deep merge to prevent breaks in case schemas evolve
    const merged: NotificationPreferences = {
      globalEnabled: typeof parsed.globalEnabled === 'boolean' ? parsed.globalEnabled : defaults.globalEnabled,
      browserPermissionState: parsed.browserPermissionState || defaults.browserPermissionState,
      categories: { ...defaults.categories }
    };

    if (parsed.categories) {
      const keys: Array<keyof NotificationPreferences['categories']> = [
        'DOCUMENT_EXPIRING_SOON',
        'DOCUMENT_EXPIRED',
        'MAINTENANCE_OVERDUE',
        'COST_TREND_INCREASE'
      ];
      
      for (const key of keys) {
        if (parsed.categories[key]) {
          merged.categories[key] = {
            inApp: typeof parsed.categories[key].inApp === 'boolean' ? parsed.categories[key].inApp : defaults.categories[key].inApp,
            browserPush: typeof parsed.categories[key].browserPush === 'boolean' ? parsed.categories[key].browserPush : defaults.categories[key].browserPush,
            email: typeof parsed.categories[key].email === 'boolean' ? parsed.categories[key].email : defaults.categories[key].email
          };
        }
      }
    }

    // Always update current browser permission state dynamically in case user adjusted it via browser settings
    const isNotificationSupported = 'Notification' in window;
    if (isNotificationSupported) {
      const perm = window.Notification.permission;
      if (perm === 'granted' || perm === 'denied' || perm === 'default') {
        merged.browserPermissionState = perm;
      }
    } else {
      merged.browserPermissionState = 'unsupported';
    }

    return merged;
  } catch (error) {
    console.error('Failed to parse notification preferences, falling back to defaults:', error);
    return generateDefaultPreferences();
  }
}

/**
 * Persists modified notification preferences into local localStorage.
 */
export function saveNotificationPreferences(prefs: NotificationPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Dispatch a custom storage event so other open tabs/contexts can listen and adapt in real-time
    window.dispatchEvent(new Event('micromate_notification_preferences_changed'));
  } catch (error) {
    console.error('Failed to save notification preferences:', error);
  }
}

/**
 * Requests browser push permission safely with graceful iframe fallback.
 */
export async function requestBrowserPushPermission(): Promise<'default' | 'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    // Standard request permission
    const permission = await window.Notification.requestPermission();
    return permission as any;
  } catch (error) {
    console.warn(
      'Notification.requestPermission call failed. This is expected inside sandboxed iframes. Falling back gracefully.',
      error
    );
    // Return the current permission status as-is (often "denied" or "default" inside sandbox)
    const current = window.Notification.permission;
    if (current === 'granted' || current === 'denied' || current === 'default') {
      return current;
    }
    return 'unsupported';
  }
}
