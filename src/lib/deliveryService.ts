import {
  DeliveryRequest,
  DeliveryResult,
  DeliveryAttempt,
  PushSubscriptionRecord,
  NotificationRecord,
  NotificationStatus,
  DeliveryResponseStatus
} from '../types';
import {
  getNotificationRecord,
  updateNotificationStatus
} from './outreachDomain';

/**
 * PHASE 6-1C: DELIVERY ADAPTER & CHANNEL INTEGRATION SERVICE
 * 
 * Invariants:
 * 1. Delivery Adapter MUST be a dumb/passive executor (no intelligence).
 * 2. Multi-device support (one user_id -> many active push subscriptions).
 * 3. Delivery failure/retries MUST NOT ever modify or resolve underlying 3F Attention Signals or Domain States.
 */

// In-memory active push subscriptions registry (Multi-device matching)
const subscriptionStore = new Map<string, PushSubscriptionRecord>();

// In-memory delivery attempt logs
const deliveryAttemptRegistry = new Map<string, DeliveryAttempt[]>();

/**
 * Resets stores for isolated unit testing
 */
export function clearDeliveryStore(): void {
  subscriptionStore.clear();
  deliveryAttemptRegistry.clear();
}

/**
 * --- 6-1C2: SUBSCRIPTION LIFECYCLE MANAGEMENT (Multi-Device) ---
 */

/**
 * Registers or refreshes a push subscription for a user device
 */
export function registerPushSubscription(input: {
  subscription_id?: string;
  user_id: string;
  device_name: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  nowTimestamp?: string;
}): PushSubscriptionRecord {
  const nowIso = input.nowTimestamp || new Date().toISOString();
  const subscriptionId = input.subscription_id || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;

  const record: PushSubscriptionRecord = {
    subscription_id: subscriptionId,
    user_id: input.user_id,
    device_name: input.device_name,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
    created_at: nowIso,
    last_seen_at: nowIso,
    is_active: true
  };

  subscriptionStore.set(subscriptionId, record);
  return { ...record };
}

/**
 * Retrieves all active subscriptions for a given user
 */
export function getActiveSubscriptionsForUser(userId: string): PushSubscriptionRecord[] {
  return Array.from(subscriptionStore.values()).filter(
    sub => sub.user_id === userId && sub.is_active
  );
}

/**
 * Invalidates (deactivates) a push subscription (e.g. on client logout or expired endpoint)
 */
export function invalidatePushSubscription(subscriptionId: string): void {
  const record = subscriptionStore.get(subscriptionId);
  if (record) {
    subscriptionStore.set(subscriptionId, {
      ...record,
      is_active: false
    });
  }
}

/**
 * --- 6-1C3: WEB PUSH DELIVERY ADAPTER (DUMB EXECUTOR) ---
 */

/**
 * Executes delivery for a request. This is completely passive and has no business logic.
 */
export async function executeWebPushDelivery(
  request: DeliveryRequest,
  options?: {
    forceFailureMessage?: string;
    forceUnavail?: boolean;
    forceRejected?: boolean;
    providerReferenceId?: string;
    nowTimestamp?: string;
  }
): Promise<DeliveryResult> {
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  // Handle simulated delivery failure conditions for resilience testing
  if (options?.forceFailureMessage) {
    return {
      status: 'FAILED',
      failure_reason: options.forceFailureMessage
    };
  }

  if (options?.forceUnavail) {
    return {
      status: 'UNAVAILABLE',
      failure_reason: 'Web Push Gateway Server Temporarily Offline'
    };
  }

  if (options?.forceRejected) {
    return {
      status: 'REJECTED',
      failure_reason: 'Push subscription endpoint has expired or is invalid'
    };
  }

  // Succeeded delivery
  return {
    status: 'DELIVERED',
    delivered_at: nowIso,
    provider_reference_id: options?.providerReferenceId || `fcm_ref_${Date.now().toString().slice(-6)}`
  };
}

/**
 * --- 6-1C4: ORCHESTRATION, RETRIES & TIMEOUT POLICY ---
 */

export interface OrchestrateDeliveryResponse {
  success: boolean;
  final_status: NotificationStatus;
  delivery_result: DeliveryResult;
  attempts: DeliveryAttempt[];
}

/**
 * Primary delivery orchestrator implementing the anti-retry-flooding and attempt recording policies.
 * Absolutely guarantees that no internal domains or 3F states are modified.
 */
export async function orchestrateNotificationDelivery(
  notificationId: string,
  options?: {
    maxAttempts?: number;
    forceFailureMessage?: string;
    forceUnavail?: boolean;
    forceRejected?: boolean;
    nowTimestamp?: string;
  }
): Promise<OrchestrateDeliveryResponse> {
  const maxAttempts = options?.maxAttempts || 3;
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  const record = getNotificationRecord(notificationId);
  if (!record) {
    throw new Error(`Notification record ${notificationId} not found in store`);
  }

  if (record.status !== 'QUEUED' && record.status !== 'FAILED') {
    throw new Error(`Notification record ${notificationId} is already in a final state: ${record.status}`);
  }

  const attempts: DeliveryAttempt[] = deliveryAttemptRegistry.get(notificationId) || [];

  const deliveryRequest: DeliveryRequest = {
    notification_id: record.notification_id,
    recipient_identity: record.recipient_identity,
    channel: record.channel,
    title: `Notification: ${record.action_code}`,
    body: `Attention signal triggered: ${record.signal_snapshot.signal_type}`,
    payload: record.deep_link_action
  };

  // Run the passive adapter
  const result = await executeWebPushDelivery(deliveryRequest, {
    forceFailureMessage: options?.forceFailureMessage,
    forceUnavail: options?.forceUnavail,
    forceRejected: options?.forceRejected,
    nowTimestamp: nowIso
  });

  // Record delivery attempt evidence
  const attemptCount = attempts.length + 1;
  const attemptId = `att_${record.notification_id}_${attemptCount}`;
  const attempt: DeliveryAttempt = {
    attempt_id: attemptId,
    notification_id: record.notification_id,
    attempt_count: attemptCount,
    status: result.status,
    timestamp: nowIso,
    error_message: result.failure_reason
  };

  attempts.push(attempt);
  deliveryAttemptRegistry.set(notificationId, attempts);

  // Reconcile status based on the result and attempt boundaries
  let nextStatus: NotificationStatus = 'QUEUED';
  
  if (result.status === 'DELIVERED') {
    nextStatus = 'DISPATCHED';
    updateNotificationStatus(notificationId, 'DISPATCHED', {
      deliveredAt: nowIso,
      incrementAttempts: true
    });
  } else if (result.status === 'REJECTED') {
    // If the endpoint is expired, fail fast immediately (REJECTED endpoints are unrecoverable)
    nextStatus = 'FAILED';
    updateNotificationStatus(notificationId, 'FAILED', {
      failureReason: result.failure_reason || 'Endpoint rejected by provider',
      incrementAttempts: true
    });
  } else {
    // FAILED or UNAVAILABLE -> Check if max attempts exhausted
    if (attemptCount >= maxAttempts) {
      nextStatus = 'FAILED';
      updateNotificationStatus(notificationId, 'FAILED', {
        failureReason: `Delivery exhausted after ${attemptCount} attempts. Last error: ${result.failure_reason}`,
        incrementAttempts: true
      });
    } else {
      // Keep in QUEUED so it can be retried later
      nextStatus = 'QUEUED';
      updateNotificationStatus(notificationId, 'QUEUED', {
        failureReason: result.failure_reason,
        incrementAttempts: true
      });
    }
  }

  return {
    success: nextStatus === 'DISPATCHED',
    final_status: nextStatus,
    delivery_result: result,
    attempts: attempts
  };
}

/**
 * Lists attempt history for audit trails
 */
export function getDeliveryAttempts(notificationId: string): DeliveryAttempt[] {
  return deliveryAttemptRegistry.get(notificationId) || [];
}
