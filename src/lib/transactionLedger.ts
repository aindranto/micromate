/**
 * MICROMATE PHASE 3C-5: CROSS-DOMAIN TRANSACTION LEDGER & REPLAY RECONCILER
 * 
 * Architectural Invariants:
 * 1. Business ID != Mutation ID (e.g. maintenance_id = maint_123, mutation_id = MUT-MAINT-CREATE-maint_123).
 * 2. Idempotency at Transaction Boundary: N replays (1, 5, 10, 100) yield EXACTLY 1 Maintenance, 1 Expense, 1 History, 1 Reminder.
 * 3. Partial Failure Reconciler: Can resume/heal from intermediate crash states (e.g. Maintenance✓, Expense✓, History✓, Reminder✗).
 * 4. Zero Re-duplication: Reconciling already-complete or partially-complete transactions never duplicates existing domain facts.
 * 5. Deterministic Audit & Ledger Status: PENDING | PROCESSING | COMPLETED | PARTIAL | FAILED_RETRYABLE | FAILED_PERMANENT.
 */

import { Asset, CrossDomainTransaction, TransactionStatus, TransactionStep, SyncEntity } from '../types';
import { CreateMaintenanceInput, executeRecordServiceTransaction } from './maintenanceDomain';

export interface StepEvaluationResult {
  step: TransactionStep;
  exists: boolean;
  entityId?: string;
  details?: string;
}

export interface ReconcileEvaluation {
  mutation_id: string;
  transaction_id: string;
  status: TransactionStatus;
  completed_steps: TransactionStep[];
  missing_steps: TransactionStep[];
  isFullyCommitted: boolean;
  stepEvaluations: Record<TransactionStep, StepEvaluationResult>;
}

export class CrossDomainTransactionLedger {
  private transactions: Map<string, CrossDomainTransaction> = new Map();

  constructor(initialTransactions: CrossDomainTransaction[] = []) {
    for (const tx of initialTransactions) {
      this.transactions.set(tx.mutation_id, tx);
    }
  }

  public getTransaction(mutationId: string): CrossDomainTransaction | undefined {
    return this.transactions.get(mutationId);
  }

  public getTransactionById(transactionId: string): CrossDomainTransaction | undefined {
    for (const tx of this.transactions.values()) {
      if (tx.transaction_id === transactionId) return tx;
    }
    return undefined;
  }

  public getAllTransactions(): CrossDomainTransaction[] {
    return Array.from(this.transactions.values());
  }

  public registerTransaction(tx: {
    transaction_id?: string;
    mutation_id: string;
    entity_type: SyncEntity;
    entity_id: string;
    asset_id: string;
    action: string;
    payload: any;
    status?: TransactionStatus;
    completed_steps?: TransactionStep[];
  }): CrossDomainTransaction {
    const existing = this.transactions.get(tx.mutation_id);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newTx: CrossDomainTransaction = {
      transaction_id: tx.transaction_id || `TXN-${tx.entity_type}-${tx.entity_id}`,
      mutation_id: tx.mutation_id,
      entity_type: tx.entity_type,
      entity_id: tx.entity_id,
      asset_id: tx.asset_id,
      action: tx.action,
      payload: tx.payload,
      status: tx.status || 'PENDING',
      completed_steps: tx.completed_steps || [],
      failed_steps: [],
      created_at: now,
      updated_at: now,
      reconciliation_count: 0,
    };

    this.transactions.set(tx.mutation_id, newTx);
    return newTx;
  }

  public updateTransactionStatus(
    mutationId: string,
    status: TransactionStatus,
    completedSteps?: TransactionStep[],
    failedStep?: { step: TransactionStep; error: string }
  ): CrossDomainTransaction | null {
    const tx = this.transactions.get(mutationId);
    if (!tx) return null;

    const now = new Date().toISOString();
    tx.status = status;
    tx.updated_at = now;
    if (completedSteps) {
      tx.completed_steps = Array.from(new Set([...tx.completed_steps, ...completedSteps]));
    }
    if (failedStep) {
      tx.failed_steps.push({
        step: failedStep.step,
        error: failedStep.error,
        timestamp: now,
      });
    }

    return tx;
  }
}

/**
 * REPLAY RECONCILER ENGINE
 * Pure, deterministic analysis and repair of cross-domain state.
 */
export class ReplayReconciler {
  /**
   * Evaluate what steps of a maintenance transaction have already been committed to an asset.
   */
  public static evaluateMaintenanceTransaction(
    asset: Asset,
    input: CreateMaintenanceInput,
    mutationId: string
  ): ReconcileEvaluation {
    const maintId = input.maintenance_id;
    const expectedExpenseId = `exp_maint_${maintId}`;
    const expectedReminderId = `rem_next_maint_${maintId}`;
    const transactionId = `TXN-MAINT-${maintId}`;

    // 1. Check Maintenance record
    const hasMaintenance = (asset.maintenance_records || []).some(
      (m) => m.maintenance_id === maintId
    );

    // 2. Check Linked Expense
    const hasExpense = (asset.expenses || []).some(
      (e) => e.expense_id === expectedExpenseId || (e.source_id === maintId && e.source_type === 'MAINTENANCE')
    );

    // 3. Check History event
    const hasHistory = (asset.history || []).some(
      (h) => (h.metadata?.maintenance_id === maintId || h.metadata?.mutation_id === mutationId) &&
             h.action === 'MAINTENANCE_RECORDED'
    );

    // 4. Check Next Service Reminder (if requested)
    let hasReminder = true;
    if (input.create_next_reminder) {
      hasReminder = (asset.reminders || []).some(
        (r) => r.reminder_id === expectedReminderId ||
               r.metadata?.source_maintenance_id === maintId || 
               r.metadata?.mutation_id === mutationId ||
               (r.type === 'maintenance' && r.notes?.includes(maintId))
      );
    }

    // 5. Check Vehicle projection (mileage)
    let isMileageUpdated = true;
    if (asset.category === 'vehicle' && typeof input.mileage === 'number') {
      const current = asset.vehicle_details?.current_mileage || 0;
      isMileageUpdated = current >= input.mileage;
    }

    const stepEvaluations: Record<TransactionStep, StepEvaluationResult> = {
      MAINTENANCE: { step: 'MAINTENANCE', exists: hasMaintenance, entityId: maintId },
      EXPENSE: { step: 'EXPENSE', exists: hasExpense, entityId: expectedExpenseId },
      HISTORY: { step: 'HISTORY', exists: hasHistory },
      REMINDER: { step: 'REMINDER', exists: hasReminder },
      VEHICLE_PROJECTION: { step: 'VEHICLE_PROJECTION', exists: isMileageUpdated },
      SYNC_MUTATION: { step: 'SYNC_MUTATION', exists: true },
    };

    const completed_steps: TransactionStep[] = [];
    const missing_steps: TransactionStep[] = [];

    const relevantSteps: TransactionStep[] = ['MAINTENANCE', 'EXPENSE', 'HISTORY'];
    if (input.create_next_reminder) relevantSteps.push('REMINDER');
    if (asset.category === 'vehicle' && typeof input.mileage === 'number') relevantSteps.push('VEHICLE_PROJECTION');

    for (const s of relevantSteps) {
      if (stepEvaluations[s].exists) {
        completed_steps.push(s);
      } else {
        missing_steps.push(s);
      }
    }

    const isFullyCommitted = missing_steps.length === 0;
    let status: TransactionStatus = 'PENDING';
    if (isFullyCommitted) {
      status = 'COMPLETED';
    } else if (completed_steps.length > 0) {
      status = 'PARTIAL';
    }

    return {
      mutation_id: mutationId,
      transaction_id: transactionId,
      status,
      completed_steps,
      missing_steps,
      isFullyCommitted,
      stepEvaluations,
    };
  }

  /**
   * Idempotently reconciles and heals an asset against a service transaction.
   * If already complete, returns the asset untouched (no duplicate records).
   * If partially complete, only adds the missing components.
   */
  public static reconcileMaintenanceTransaction(
    asset: Asset,
    input: CreateMaintenanceInput,
    options?: {
      mutationId?: string;
      performedBy?: string;
      allowOdometerCorrection?: boolean;
      correctionReason?: string;
    }
  ): {
    reconciledAsset: Asset;
    evaluation: ReconcileEvaluation;
    repairedSteps: TransactionStep[];
    isNoOp: boolean;
  } {
    const mutationId = options?.mutationId || `MUT-MAINT-CREATE-${input.maintenance_id}`;
    const evaluation = this.evaluateMaintenanceTransaction(asset, input, mutationId);

    // If completely committed, return NO-OP (strict idempotent invariant)
    if (evaluation.isFullyCommitted) {
      return {
        reconciledAsset: asset,
        evaluation,
        repairedSteps: [],
        isNoOp: true,
      };
    }

    // Execute canonical domain transaction calculation
    const canonicalResult = executeRecordServiceTransaction(asset, input, {
      performedBy: options?.performedBy,
      allowOdometerCorrection: options?.allowOdometerCorrection,
      correctionReason: options?.correctionReason,
    });

    const repairedSteps: TransactionStep[] = [];
    const updatedAsset: Asset = JSON.parse(JSON.stringify(asset));

    // 1. Repair Maintenance record if missing
    if (!evaluation.stepEvaluations.MAINTENANCE.exists) {
      updatedAsset.maintenance_records = [
        canonicalResult.maintenanceRecord,
        ...(updatedAsset.maintenance_records || []),
      ];
      repairedSteps.push('MAINTENANCE');
    }

    // 2. Repair Linked Expense if missing
    if (!evaluation.stepEvaluations.EXPENSE.exists) {
      updatedAsset.expenses = [
        canonicalResult.linkedExpense,
        ...(updatedAsset.expenses || []),
      ];
      repairedSteps.push('EXPENSE');
    }

    // 3. Repair History event if missing
    if (!evaluation.stepEvaluations.HISTORY.exists) {
      const historyWithMutation = {
        ...canonicalResult.historyEvent,
        metadata: {
          ...canonicalResult.historyEvent.metadata,
          mutation_id: mutationId,
        },
      };
      updatedAsset.history = [
        historyWithMutation,
        ...(updatedAsset.history || []),
      ];
      repairedSteps.push('HISTORY');
    }

    // 4. Repair Reminder if requested and missing
    if (input.create_next_reminder && !evaluation.stepEvaluations.REMINDER.exists && canonicalResult.nextReminder) {
      const reminderWithMutation = {
        ...canonicalResult.nextReminder,
        metadata: {
          ...canonicalResult.nextReminder.metadata,
          source_maintenance_id: input.maintenance_id,
          mutation_id: mutationId,
        },
      };
      updatedAsset.reminders = [
        reminderWithMutation,
        ...(updatedAsset.reminders || []),
      ];
      repairedSteps.push('REMINDER');
    }

    // 5. Repair Vehicle Projection (odometer) if needed
    if (
      asset.category === 'vehicle' && 
      typeof input.mileage === 'number' && 
      !evaluation.stepEvaluations.VEHICLE_PROJECTION.exists
    ) {
      if (updatedAsset.vehicle_details && canonicalResult.updatedAsset.vehicle_details) {
        updatedAsset.vehicle_details = {
          ...updatedAsset.vehicle_details,
          ...canonicalResult.updatedAsset.vehicle_details,
        };
      }
      repairedSteps.push('VEHICLE_PROJECTION');
    }

    updatedAsset.updated_at = new Date().toISOString();

    const postEvaluation = this.evaluateMaintenanceTransaction(updatedAsset, input, mutationId);

    return {
      reconciledAsset: updatedAsset,
      evaluation: postEvaluation,
      repairedSteps,
      isNoOp: false,
    };
  }
}
