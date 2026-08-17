import {
  CanonicalSignal,
  NotificationChannel,
  NotificationRecord,
  NotificationStatus,
  UserNotificationPreference,
  SignalSeverity
} from '../types';

/**
 * PHASE 6-1A & 6-1B: OUTREACH & NOTIFICATION INTELLIGENCE DOMAIN SERVICE
 * 
 * Invariants:
 * I-01: Notification MUST NOT mutate 3F state.
 * I-02: Notification MUST preserve delivery evidence (including signal_snapshot at queue time).
 * I-03: OBSOLETE (signal resolved dynamically) is distinct from CANCELLED (system/policy cancellation).
 * I-04: Deep-links MUST route through existing WorkflowExecutionGateway (no bypass).
 */

// In-memory data store for delivery evidence and scheduling state
const notificationStore = new Map<string, NotificationRecord>();
const preferencesStore = new Map<string, UserNotificationPreference>();

/**
 * Resets stores for unit test isolation
 */
export function clearOutreachStore(): void {
  notificationStore.clear();
  preferencesStore.clear();
}

/**
 * Retrieves a notification record by ID
 */
export function getNotificationRecord(notificationId: string): NotificationRecord | undefined {
  const record = notificationStore.get(notificationId);
  return record ? { ...record } : undefined;
}

/**
 * Lists all notification records in the store
 */
export function listNotificationRecords(): NotificationRecord[] {
  return Array.from(notificationStore.values()).map(r => ({ ...r }));
}

/**
 * Generates a deterministic deduplication lock key (I-02/Deduplication)
 */
export function generateDeduplicationKey(
  signalId: string,
  channel: NotificationChannel,
  recipient: string,
  cycleId?: string
): string {
  const base = `${signalId}:${channel}:${recipient}`;
  return cycleId ? `${base}:${cycleId}` : base;
}

/**
 * 6-1A-1: Queue a new Notification Record (I-02 Preservation of Snapshot)
 */
export function queueNotification(input: {
  notification_id?: string;
  signal: CanonicalSignal;
  channel: NotificationChannel;
  recipient_identity: string;
  scheduled_at: string;
  nowTimestamp?: string;
  deepLinkPayload?: Record<string, unknown>;
}): NotificationRecord {
  const nowIso = input.nowTimestamp || new Date().toISOString();
  const notificationId = input.notification_id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const dedupKey = generateDeduplicationKey(input.signal.signal_id, input.channel, input.recipient_identity);

  // Generate deep-link parameters ensuring standard gateway entry points (I-04)
  const deepLink = {
    action_code: input.signal.action_code,
    payload: {
      asset_id: input.signal.asset_id,
      trigger_signal_id: input.signal.signal_id,
      document_type: input.signal.signal_type.includes('DOCUMENT') ? 'stnk' : undefined, // example mapping
      action_code: input.signal.action_code,
      ...input.deepLinkPayload
    }
  };

  const record: NotificationRecord = {
    notification_id: notificationId,
    signal_id: input.signal.signal_id,
    signal_snapshot: JSON.parse(JSON.stringify(input.signal)), // Deep clone for immutability (I-02)
    action_code: input.signal.action_code,
    channel: input.channel,
    asset_id: input.signal.asset_id,
    recipient_identity: input.recipient_identity,
    status: 'QUEUED',
    created_at: nowIso,
    scheduled_at: input.scheduled_at,
    deduplication_key: dedupKey,
    attempt_count: 0,
    deep_link_action: deepLink
  };

  notificationStore.set(notificationId, record);
  return { ...record };
}

/**
 * 6-1A-2: Mark Notification as OBSOLETE (Underlying signal is no longer active - I-03)
 */
export function markNotificationObsolete(notificationId: string, nowTimestamp?: string): NotificationRecord {
  const record = notificationStore.get(notificationId);
  if (!record) {
    throw new Error(`Notification record ${notificationId} not found`);
  }
  
  const nowIso = nowTimestamp || new Date().toISOString();
  record.status = 'OBSOLETE';
  record.obsolete_at = nowIso;
  
  notificationStore.set(notificationId, record);
  return { ...record };
}

/**
 * 6-1A-3: Mark Notification as CANCELLED (Preempted by user preference or system policy before delivery - I-03)
 */
export function markNotificationCancelled(notificationId: string, nowTimestamp?: string): NotificationRecord {
  const record = notificationStore.get(notificationId);
  if (!record) {
    throw new Error(`Notification record ${notificationId} not found`);
  }
  
  const nowIso = nowTimestamp || new Date().toISOString();
  record.status = 'CANCELLED';
  record.cancelled_at = nowIso;
  
  notificationStore.set(notificationId, record);
  return { ...record };
}

/**
 * 6-1A-4: Update Notification Status (e.g. to DISPATCHED, FAILED, or READ)
 */
export function updateNotificationStatus(
  notificationId: string,
  status: NotificationStatus,
  options?: {
    deliveredAt?: string;
    failureReason?: string;
    incrementAttempts?: boolean;
  }
): NotificationRecord {
  const record = notificationStore.get(notificationId);
  if (!record) {
    throw new Error(`Notification record ${notificationId} not found`);
  }

  record.status = status;
  if (options?.deliveredAt) record.delivered_at = options.deliveredAt;
  if (options?.failureReason) record.failure_reason = options.failureReason;
  if (options?.incrementAttempts) record.attempt_count += 1;

  notificationStore.set(notificationId, record);
  return { ...record };
}

/**
 * --- PHASE 6-1B: POLICY & ORCHESTRATOR RULES ---
 */

/**
 * 6-1B-1: Notification Eligibility Checker based on Discovery Matrix
 */
export function isSignalEligibleForChannel(
  signalType: string,
  channel: NotificationChannel
): boolean {
  // Strict canonical matrix mapping
  switch (signalType) {
    case 'DOCUMENT_EXPIRED':
    case 'MAINTENANCE_OVERDUE':
      return channel === 'PUSH' || channel === 'EMAIL';
      
    case 'DOCUMENT_EXPIRING_SOON':
    case 'MAINTENANCE_DUE_SOON':
      return channel === 'PUSH' || channel === 'CALENDAR';
      
    case 'COST_TREND_INCREASE':
      // Low priority / digest only, no direct push/email/calendar
      return false;
      
    case 'DATA_INCOMPLETE':
    default:
      // Completely ineligible for external outreach
      return false;
  }
}

/**
 * 6-1B-2: Progressive Notification Cooldown Validator
 * Implements anti-spam intervals based on expiry distance
 */
export function validateProgressiveCooldown(options: {
  signalType: string;
  recipient: string;
  daysUntilExpiry: number;
  nowTimestamp: string;
}): boolean {
  if (options.signalType !== 'DOCUMENT_EXPIRING_SOON') {
    return true; // Simple cooldown only applies to progressive expiring warnings
  }

  const existingQueuedOrSent = listNotificationRecords().filter(
    r => r.recipient_identity === options.recipient &&
         r.signal_snapshot.signal_type === options.signalType &&
         (r.status === 'QUEUED' || r.status === 'DISPATCHED')
  );

  if (existingQueuedOrSent.length === 0) {
    return true; // First time is always eligible
  }

  // Find latest sent or queued date
  const lastTime = Math.max(
    ...existingQueuedOrSent.map(r => new Date(r.created_at).getTime())
  );
  
  const elapsedMs = new Date(options.nowTimestamp).getTime() - lastTime;
  const elapsedDays = elapsedMs / (1000 * 60 * 60 * 24);

  // Progressive rules:
  // H-90 to H-31: Max 1 per 30 days
  if (options.daysUntilExpiry > 30 && options.daysUntilExpiry <= 90) {
    return elapsedDays >= 30;
  }
  // H-30 to H-15: Max 1 per 14 days
  if (options.daysUntilExpiry > 14 && options.daysUntilExpiry <= 30) {
    return elapsedDays >= 14;
  }
  // H-14 to H-2: Max 1 per 5 days
  if (options.daysUntilExpiry > 1 && options.daysUntilExpiry <= 14) {
    return elapsedDays >= 5;
  }
  // H-1 to H-0: Max 1 per 24 hours (1 day)
  if (options.daysUntilExpiry <= 1) {
    return elapsedDays >= 1;
  }

  return true;
}

/**
 * 6-1B-3: Quiet Hours Check (HH:MM formats)
 */
export function isWithinQuietHours(
  timeString: string, // Format: "HH:MM"
  preference: UserNotificationPreference
): boolean {
  if (!preference.quiet_hours.enabled) {
    return false;
  }

  const [hours, minutes] = timeString.split(':').map(Number);
  const [startH, startM] = preference.quiet_hours.start_time.split(':').map(Number);
  const [endH, endM] = preference.quiet_hours.end_time.split(':').map(Number);

  const currentMinutes = hours * 60 + minutes;
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Crosses midnight (e.g. 22:00 to 07:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * 6-1B-4: Retrieve preferences for a user, or get safe default settings
 */
export function getUserPreferences(userId: string): UserNotificationPreference {
  const cached = preferencesStore.get(userId);
  if (cached) return { ...cached };

  // Strict safe defaults
  const defaults: UserNotificationPreference = {
    user_id: userId,
    channels: {
      push_enabled: true,
      email_enabled: true,
      calendar_enabled: true
    },
    severity_matrix: {
      CRITICAL: ['PUSH', 'EMAIL'],
      HIGH: ['PUSH', 'EMAIL'],
      MEDIUM: ['PUSH', 'CALENDAR'],
      LOW: [],
      INFO: []
    },
    quiet_hours: {
      enabled: true,
      start_time: '22:00',
      end_time: '07:00',
      timezone: 'Asia/Jakarta'
    },
    digest_mode: {
      enabled: false,
      frequency: 'WEEKLY'
    }
  };

  preferencesStore.set(userId, defaults);
  return defaults;
}

/**
 * Updates preferences for a user
 */
export function updateUserPreferences(userId: string, prefs: Partial<UserNotificationPreference>): UserNotificationPreference {
  const existing = getUserPreferences(userId);
  const updated = {
    ...existing,
    ...prefs,
    channels: prefs.channels ? { ...existing.channels, ...prefs.channels } : existing.channels,
    quiet_hours: prefs.quiet_hours ? { ...existing.quiet_hours, ...prefs.quiet_hours } : existing.quiet_hours,
    digest_mode: prefs.digest_mode ? { ...existing.digest_mode, ...prefs.digest_mode } : existing.digest_mode
  };
  preferencesStore.set(userId, updated);
  return updated;
}
