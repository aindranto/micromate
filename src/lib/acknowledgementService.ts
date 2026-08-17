import { AcknowledgementRecord } from '../types';

/**
 * MICROMATE PHASE 5-3A: ACKNOWLEDGEMENT RECORD SERVICE (MODE B)
 * 
 * Boundary & Core Principles:
 * 1. Read-Only Domain Isolation: Does NOT mutate Assets, Maintenance, Reminders, or Documents.
 * 2. Signal Non-Mutation: Does NOT delete or alter 3F Attention Signals.
 * 3. Immutable Audit Trail: Records human review events with immutable IDs and timestamps.
 */

const acknowledgementStore = new Map<string, AcknowledgementRecord>();

/**
 * Clears the in-memory store (for test isolation)
 */
export function clearAcknowledgementStore(): void {
  acknowledgementStore.clear();
}

/**
 * Creates and stores an immutable AcknowledgementRecord
 */
export function recordAcknowledgement(
  input: Omit<AcknowledgementRecord, 'acknowledgement_id' | 'acknowledged_at' | 'acknowledged_by'> & {
    acknowledgement_id?: string;
    acknowledged_at?: string;
    acknowledged_by?: string;
  }
): AcknowledgementRecord {
  const nowIso = input.acknowledged_at || new Date().toISOString();
  const ackId = input.acknowledgement_id || `ACK-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

  const record: AcknowledgementRecord = {
    acknowledgement_id: ackId,
    signal_id: input.signal_id,
    asset_id: input.asset_id,
    action_code: input.action_code,
    source_record_id: input.source_record_id,
    acknowledged_by: input.acknowledged_by || 'USER_MANUAL',
    acknowledged_at: nowIso,
    note: input.note,
    metadata: input.metadata || {}
  };

  acknowledgementStore.set(record.acknowledgement_id, record);
  return record;
}

/**
 * Retrieves an acknowledgement record by ID
 */
export function getAcknowledgementById(id: string): AcknowledgementRecord | undefined {
  return acknowledgementStore.get(id);
}

/**
 * Retrieves all acknowledgement records for a given asset ID
 */
export function getAcknowledgementsForAsset(assetId: string): AcknowledgementRecord[] {
  return Array.from(acknowledgementStore.values()).filter(r => r.asset_id === assetId);
}

/**
 * Retrieves acknowledgement records associated with a specific 3F signal ID
 */
export function getAcknowledgementsForSignal(signalId: string): AcknowledgementRecord[] {
  return Array.from(acknowledgementStore.values()).filter(r => r.signal_id === signalId);
}

/**
 * Returns total count of recorded acknowledgements
 */
export function getAcknowledgementCount(): number {
  return acknowledgementStore.size;
}
