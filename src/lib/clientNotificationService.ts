import {
  ClientNotification,
  ClientNotificationState,
  CanonicalSignal
} from '../types';

/**
 * PHASE 6-2A: CLIENT NOTIFICATION CONTRACT & LOCAL STATE HANDLER
 * 
 * Invariants:
 * I-06-01: Client State Cannot Resolve Operational Truth (opened/read !== resolved)
 * I-06-02: Client State Is Idempotent (transitions to same state do nothing)
 * I-06-03: OPENED Does Not Mean Executed (deep link triggers modal, not mutation)
 * I-06-04: OBSOLETE Is Derived From Canonical Truth (derived from signal resolution)
 * I-06-05: CANCELLED Has Explicit Actor (distinct from OBSOLETE)
 * I-06-06: Deep Link Is Data, Not Execution (no direct mutation call)
 */

// In-memory store for Client Notifications
const clientNotificationStore = new Map<string, ClientNotification>();

type StoreSubscriber = () => void;
const subscribers = new Set<StoreSubscriber>();

/**
 * Subscribes to changes in the Client Notification store.
 * Returns an unsubscribe function.
 */
export function subscribeToNotificationStore(sub: StoreSubscriber): () => void {
  subscribers.add(sub);
  return () => {
    subscribers.delete(sub);
  };
}

function notifySubscribers(): void {
  subscribers.forEach(sub => sub());
}

/**
 * Resets the local store for isolated unit tests
 */
export function clearClientNotificationStore(): void {
  clientNotificationStore.clear();
  notifySubscribers();
}

/**
 * Registers a projected ClientNotification record
 */
export function registerClientNotification(notification: ClientNotification): ClientNotification {
  const cloned = JSON.parse(JSON.stringify(notification)) as ClientNotification;
  clientNotificationStore.set(cloned.notification_id, cloned);
  notifySubscribers();
  return { ...cloned };
}

/**
 * Retrieves a client notification by ID
 */
export function getClientNotification(notificationId: string): ClientNotification | undefined {
  const item = clientNotificationStore.get(notificationId);
  return item ? { ...item } : undefined;
}

/**
 * Lists client notifications, optionally filtering by user ID
 */
export function listClientNotifications(userId?: string): ClientNotification[] {
  const list = Array.from(clientNotificationStore.values());
  if (userId) {
    return list.filter(n => n.user_id === userId).map(n => ({ ...n }));
  }
  return list.map(n => ({ ...n }));
}

/**
 * State Transition Guard representing the strict state machine flow (Phase 6-2A Test Gates)
 */
export function transitionClientState(
  notificationId: string,
  nextState: ClientNotificationState,
  options?: {
    reason?: string;
    actor?: string;
    nowTimestamp?: string;
  }
): ClientNotification {
  const item = clientNotificationStore.get(notificationId);
  if (!item) {
    throw new Error(`ClientNotification ${notificationId} not found`);
  }

  const currentState = item.client_state;
  const nowIso = options?.nowTimestamp || new Date().toISOString();

  // I-06-02: Idempotent transitions (no-op, same state)
  if (currentState === nextState) {
    return { ...item };
  }

  // ILLEGAL TRANSITIONS:
  // Cannot escape CANCELLED or OBSOLETE once they are in terminal presentation state
  if (currentState === 'CANCELLED' && nextState === 'OPENED') {
    throw new Error(`Illegal Transition: Cannot open a CANCELLED client notification`);
  }
  if (currentState === 'OBSOLETE' && nextState === 'OPENED') {
    throw new Error(`Illegal Transition: Cannot open an OBSOLETE client notification`);
  }
  if (currentState === 'CANCELLED' && nextState === 'READ') {
    throw new Error(`Illegal Transition: Cannot mark READ a CANCELLED client notification`);
  }
  if (currentState === 'OBSOLETE' && nextState === 'READ') {
    throw new Error(`Illegal Transition: Cannot mark READ an OBSOLETE client notification`);
  }

  // Transition validation logic
  const updated: ClientNotification = {
    ...item,
    client_state: nextState,
    state_updated_at: nowIso
  };

  // I-06-05: Explicit provenance for CANCELLED
  if (nextState === 'CANCELLED') {
    updated.cancel_reason = options?.reason || 'User opted out';
    updated.cancel_actor = options?.actor || 'user';
  }

  // I-06-04: Explicit reason for OBSOLETE
  if (nextState === 'OBSOLETE') {
    updated.cancel_reason = options?.reason || 'Canonical 3F signal no longer active';
    updated.cancel_actor = 'system';
  }

  clientNotificationStore.set(notificationId, updated);
  notifySubscribers();
  return { ...updated };
}

/**
 * Checks a client notification against current active canonical signals to derive OBSOLETE status (I-06-04)
 */
export function synchronizeObsoleteState(
  notificationId: string,
  activeSignals: CanonicalSignal[],
  nowTimestamp?: string
): ClientNotification {
  const item = clientNotificationStore.get(notificationId);
  if (!item) {
    throw new Error(`ClientNotification ${notificationId} not found`);
  }

  // If the triggering signal is no longer active in the list of current signals, transition to OBSOLETE
  const signalId = item.signal_snapshot.signal_id;
  const isSignalStillActive = activeSignals.some(sig => sig.signal_id === signalId);

  if (!isSignalStillActive && item.client_state !== 'OBSOLETE' && item.client_state !== 'CANCELLED') {
    return transitionClientState(notificationId, 'OBSOLETE', {
      reason: `Canonical signal ${signalId} is no longer active in Attention Engine`,
      actor: 'system',
      nowTimestamp
    });
  }

  return { ...item };
}
