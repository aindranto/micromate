/**
 * MICROMATE PHASE 3C-3: MAINTENANCE DOMAIN & HISTORICAL FACT ENGINE
 * 
 * Invariants & Core Capabilities:
 * 1. Historical Fact Engine: Service record creation triggers atomic domain mutations:
 *    - MaintenanceRecord creation (financials: subtotal, tax, discount, total cost)
 *    - Linked Expense creation (source_type = 'MAINTENANCE', source_id = maintenance_id)
 *    - AssetHistoryEvent creation (action = 'MAINTENANCE_RECORDED')
 *    - Odometer monotonicity enforcement (new_odometer >= current_odometer)
 *    - Vehicle details update (last_oil_change_date, last_service_mileage, next targets)
 *    - Next Maintenance Reminder generation/advancement (distance or date based)
 * 2. Idempotency & Deduplication: Immutable mutation_id per service transaction prevents duplicate Expense, History, or Reminders.
 * 3. Total Cost of Ownership (TCO) Single-Source of Truth: Expense linked via deterministic source_id prevents double counting.
 */

import { 
  Asset, 
  AssetHistoryEvent, 
  Expense, 
  MaintenanceItem, 
  MaintenanceRecord, 
  MaintenanceType, 
  Reminder, 
  VehicleDetails 
} from '../types';
import { normalizeDateStringToUtcYMD, calculateNextDueDate } from './reminderDomain';

export interface CreateMaintenanceInput {
  maintenance_id?: string;
  asset_id: string;
  type: MaintenanceType;
  date: string; // YYYY-MM-DD or ISO String
  title?: string;
  description?: string;
  mileage?: number; // Current odometer at service time
  subtotal?: number;
  tax?: number;
  discount?: number;
  cost?: number; // Total cost (if omitted, auto-calculated from subtotal + tax - discount)
  provider?: string; // Workshop / Bengkel / Service Center
  provider_name?: string;
  technician_name?: string;
  notes?: string;
  items?: MaintenanceItem[];
  // Next cycle forecast
  next_date?: string;
  next_mileage?: number;
  interval_km?: number; // e.g. 2000 km or 4000 km
  interval_days?: number; // e.g. 60 days or 180 days
  create_next_reminder?: boolean; // Whether to automatically schedule the next service reminder
}

export interface MaintenanceAtomicTransactionResult {
  maintenanceRecord: MaintenanceRecord;
  linkedExpense: Expense;
  historyEvent: AssetHistoryEvent;
  updatedAsset: Asset;
  nextReminder?: Reminder;
  odometerUpdated: boolean;
  previousOdometer?: number;
  newOdometer?: number;
}

export interface OdometerValidationResult {
  isValid: boolean;
  currentMileage: number;
  proposedMileage: number;
  errorMessage?: string;
}

/**
 * Validates Odometer monotonicity: new_odometer >= current_odometer
 * Allows bypass only if explicit allowCorrection flag is set.
 */
export function validateOdometerMonotonicity(
  currentMileage: number | undefined,
  proposedMileage: number | undefined,
  allowCorrection: boolean = false
): OdometerValidationResult {
  const current = currentMileage ?? 0;
  const proposed = proposedMileage ?? current;

  if (proposedMileage === undefined || proposedMileage === null) {
    return {
      isValid: true,
      currentMileage: current,
      proposedMileage: current,
    };
  }

  if (proposed < current && !allowCorrection) {
    return {
      isValid: false,
      currentMileage: current,
      proposedMileage: proposed,
      errorMessage: `Pembacaan odometer tidak boleh mundur. Odometer saat ini: ${current.toLocaleString('id-ID')} km, input baru: ${proposed.toLocaleString('id-ID')} km. Gunakan mode koreksi jika ingin melakukan penyesuaian histori.`,
    };
  }

  return {
    isValid: true,
    currentMileage: current,
    proposedMileage: proposed,
  };
}

/**
 * Calculates total cost deterministically:
 * Total = Subtotal (or sum of items) + Tax - Discount
 */
export function calculateMaintenanceCost(input: {
  subtotal?: number;
  tax?: number;
  discount?: number;
  cost?: number;
  items?: MaintenanceItem[];
}): {
  subtotal: number;
  tax: number;
  discount: number;
  totalCost: number;
} {
  let subtotal = input.subtotal ?? 0;
  
  if (input.items && input.items.length > 0 && subtotal === 0) {
    subtotal = input.items.reduce((sum, item) => sum + (item.cost || 0), 0);
  }

  const tax = Math.max(0, input.tax ?? 0);
  const discount = Math.max(0, input.discount ?? 0);
  
  let totalCost = 0;
  if (input.cost !== undefined && input.cost > 0 && subtotal === 0) {
    totalCost = input.cost;
    subtotal = totalCost;
  } else {
    totalCost = Math.max(0, subtotal + tax - discount);
  }

  return {
    subtotal,
    tax,
    discount,
    totalCost,
  };
}

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  routine_service: 'Servis Berkala / Tune Up',
  oil_change: 'Ganti Oli Mesin / Transmisi',
  tire: 'Rotasi / Ganti Ban',
  battery: 'Cek / Ganti Aki',
  brake: 'Servis Kampas & Minyak Rem',
  transmission: 'Servis Transmisi / CVT',
  ac: 'Cuci / Servis AC',
  repair: 'Perbaikan / Ganti Sparepart',
  custom: 'Servis Khusus',
};

/**
 * Atomic Domain Method: Process One Service Action
 * Atomically generates MaintenanceRecord, Linked Expense, AssetHistoryEvent, Odometer update, and Next Reminder.
 */
export function executeRecordServiceTransaction(
  asset: Asset,
  input: CreateMaintenanceInput,
  options?: {
    nowTimestamp?: string;
    allowOdometerCorrection?: boolean;
    correctionReason?: string;
    performedBy?: string;
  }
): MaintenanceAtomicTransactionResult {
  // Defensive deep clone validation to ensure strict atomic isolation
  const baseClone: Asset = JSON.parse(JSON.stringify(asset));

  const nowIso = options?.nowTimestamp || new Date().toISOString();
  const serviceDateYMD = normalizeDateStringToUtcYMD(input.date || nowIso);
  const maintenanceId = input.maintenance_id || `maint_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const expenseId = `exp_maint_${maintenanceId}`;
  const historyEventId = `evt_maint_${maintenanceId}`;

  // 1. Calculate Financials
  const { subtotal, tax, discount, totalCost } = calculateMaintenanceCost({
    subtotal: input.subtotal,
    tax: input.tax,
    discount: input.discount,
    cost: input.cost,
    items: input.items,
  });

  if (isNaN(totalCost) || totalCost < 0) {
    throw new Error(`Kalkulasi biaya servis tidak valid (Total: ${totalCost}). Transaksi dibatalkan.`);
  }

  // 2. Validate Odometer
  const currentMileage = baseClone.vehicle_details?.current_mileage;
  const odoValidation = validateOdometerMonotonicity(
    currentMileage,
    input.mileage,
    options?.allowOdometerCorrection
  );

  if (!odoValidation.isValid) {
    throw new Error(odoValidation.errorMessage);
  }

  // 3. Compute Forecast Targets (Next Service)
  let nextDate = input.next_date;
  let nextMileage = input.next_mileage;

  if (!nextMileage && input.interval_km && input.mileage) {
    nextMileage = input.mileage + input.interval_km;
  }
  if (!nextDate && input.interval_days) {
    const nextYmd = calculateNextDueDate(serviceDateYMD, 'custom_days', input.interval_days);
    if (nextYmd) nextDate = nextYmd;
  }

  // Default forecast if not explicitly supplied
  if (!nextDate && !nextMileage) {
    if (input.type === 'oil_change') {
      if (input.mileage) nextMileage = input.mileage + 2500; // Standard 2.500 km for motorcycle / 5.000 km
      nextDate = calculateNextDueDate(serviceDateYMD, 'custom_days', 60) || undefined; // 2 months
    } else if (input.type === 'routine_service') {
      if (input.mileage) nextMileage = input.mileage + 5000;
      nextDate = calculateNextDueDate(serviceDateYMD, 'custom_days', 120) || undefined; // 4 months
    } else if (input.create_next_reminder) {
      nextDate = calculateNextDueDate(serviceDateYMD, 'custom_days', 90) || undefined; // 3 months default
    }
  }

  const typeLabel = MAINTENANCE_TYPE_LABELS[input.type] || input.type;
  const serviceTitle = input.title || `${typeLabel} - ${baseClone.name}`;

  // 4. Construct Canonical MaintenanceRecord
  const maintenanceRecord: MaintenanceRecord = {
    maintenance_id: maintenanceId,
    asset_id: baseClone.asset_id,
    type: input.type,
    date: serviceDateYMD,
    title: serviceTitle,
    description: input.description || input.notes,
    mileage: input.mileage,
    subtotal,
    tax,
    discount,
    cost: totalCost,
    provider: input.provider || 'Bengkel / Service Center',
    technician_name: input.technician_name,
    notes: input.notes,
    items: input.items,
    expense_id: expenseId,
    next_date: nextDate,
    next_mileage: nextMileage,
    created_at: nowIso,
    updated_at: nowIso,
  };

  // 5. Construct Linked Expense (Deterministic single source of truth)
  const linkedExpense: Expense = {
    expense_id: expenseId,
    asset_id: baseClone.asset_id,
    type: input.type === 'repair' ? 'repair' : 'maintenance',
    amount: totalCost,
    date: serviceDateYMD,
    description: `${serviceTitle} (${maintenanceRecord.provider})`,
    source_type: 'MAINTENANCE',
    source_id: maintenanceId,
  };

  // 6. Construct Asset History Event
  const historyEvent: AssetHistoryEvent = {
    event_id: historyEventId,
    asset_id: baseClone.asset_id,
    asset_code: baseClone.asset_code,
    timestamp: serviceDateYMD,
    action: 'MAINTENANCE_RECORDED',
    field: 'Servis & Perawatan',
    old_value: currentMileage ? `${currentMileage.toLocaleString('id-ID')} km` : '-',
    new_value: input.mileage ? `${input.mileage.toLocaleString('id-ID')} km (Rp ${totalCost.toLocaleString('id-ID')})` : `Rp ${totalCost.toLocaleString('id-ID')}`,
    performed_by: options?.performedBy || input.provider || input.technician_name || 'Teknisi / Bengkel',
    notes: input.notes || `Perekaman riwayat ${typeLabel} di ${input.provider || 'Bengkel'}.`,
  };

  // 7. Update Cloned Asset In-Memory
  const updatedAsset: Asset = {
    ...baseClone,
    updated_at: nowIso,
    data_origin: 'local',
    maintenance_records: [...(baseClone.maintenance_records || [])],
    expenses: [...(baseClone.expenses || [])],
    history: [...(baseClone.history || [])],
    reminders: [...(baseClone.reminders || [])],
  };

  // Idempotent upsert MaintenanceRecord
  const existingMaintIdx = updatedAsset.maintenance_records.findIndex((m) => m.maintenance_id === maintenanceId);
  if (existingMaintIdx >= 0) {
    updatedAsset.maintenance_records[existingMaintIdx] = maintenanceRecord;
  } else {
    updatedAsset.maintenance_records.unshift(maintenanceRecord);
  }

  // Idempotent upsert Linked Expense (Avoid duplicate expenses)
  const existingExpIdx = updatedAsset.expenses.findIndex(
    (e) => e.expense_id === expenseId || (e.source_type === 'MAINTENANCE' && e.source_id === maintenanceId)
  );
  if (existingExpIdx >= 0) {
    updatedAsset.expenses[existingExpIdx] = linkedExpense;
  } else {
    updatedAsset.expenses.unshift(linkedExpense);
  }

  // Idempotent upsert History Event
  const existingHistIdx = updatedAsset.history.findIndex((h) => h.event_id === historyEventId);
  if (existingHistIdx >= 0) {
    updatedAsset.history[existingHistIdx] = historyEvent;
  } else {
    updatedAsset.history.unshift(historyEvent);
  }

  // 8. Vehicle Details & Odometer State Mutation (Projection cache update)
  let odometerUpdated = false;
  if (updatedAsset.vehicle_details && input.mileage !== undefined) {
    const prevOdo = updatedAsset.vehicle_details.current_mileage || 0;
    if (input.mileage > prevOdo || options?.allowOdometerCorrection) {
      updatedAsset.vehicle_details.current_mileage = input.mileage;
      odometerUpdated = true;
    }

    if (input.type === 'oil_change') {
      updatedAsset.vehicle_details.last_oil_change_date = serviceDateYMD;
      updatedAsset.vehicle_details.last_oil_change_mileage = input.mileage;
      if (nextMileage) {
        updatedAsset.vehicle_details.next_oil_change_mileage = nextMileage;
      }
    } else if (input.type === 'routine_service') {
      updatedAsset.vehicle_details.last_service_mileage = input.mileage;
      if (nextMileage) {
        updatedAsset.vehicle_details.next_service_mileage = nextMileage;
      }
    }
  }

  // 9. Next Service Reminder Generation (if requested or due date forecast exists)
  let nextReminder: Reminder | undefined = undefined;
  if (input.create_next_reminder !== false && (nextDate || nextMileage)) {
    const remDueDate = nextDate || calculateNextDueDate(serviceDateYMD, 'custom_days', 90) || serviceDateYMD;
    const reminderId = `rem_next_maint_${maintenanceId}`;

    nextReminder = {
      reminder_id: reminderId,
      asset_id: baseClone.asset_id,
      asset_name: baseClone.name,
      type: 'maintenance',
      title: `Jadwal ${typeLabel} Selanjutnya`,
      due_date: remDueDate,
      repeat_rule: input.interval_days ? 'custom_days' : 'once',
      custom_interval_days: input.interval_days,
      custom_interval_km: input.interval_km,
      status: 'pending',
      notes: nextMileage ? `Target Servis: ${nextMileage.toLocaleString('id-ID')} km (${typeLabel})` : undefined,
      created_at: nowIso,
      updated_at: nowIso,
    };

    // Idempotent upsert next reminder
    const existingRemIdx = updatedAsset.reminders.findIndex((r) => r.reminder_id === reminderId);
    if (existingRemIdx >= 0) {
      updatedAsset.reminders[existingRemIdx] = nextReminder;
    } else {
      updatedAsset.reminders.unshift(nextReminder);
    }
  }

  return {
    maintenanceRecord,
    linkedExpense,
    historyEvent,
    updatedAsset,
    nextReminder,
    odometerUpdated,
    previousOdometer: currentMileage,
    newOdometer: input.mileage,
  };
}

/**
 * Explicit Odometer Correction Operation:
 * Modifies vehicle mileage projection while preserving all historical service facts
 * and creating a first-class audit trail event.
 */
export function recordOdometerCorrection(
  asset: Asset,
  newMileage: number,
  reason: string,
  performedBy: string = 'User / Admin',
  nowTimestamp?: string
): { updatedAsset: Asset; historyEvent: AssetHistoryEvent } {
  if (!asset.vehicle_details) {
    throw new Error('Aset bukan merupakan kendaraan dan tidak memiliki pembacaan odometer.');
  }

  const nowIso = nowTimestamp || new Date().toISOString();
  const dateYMD = normalizeDateStringToUtcYMD(nowIso);
  const oldMileage = asset.vehicle_details.current_mileage || 0;
  const eventId = `evt_odo_corr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const historyEvent: AssetHistoryEvent = {
    event_id: eventId,
    asset_id: asset.asset_id,
    asset_code: asset.asset_code,
    timestamp: dateYMD,
    action: 'ODOMETER_CORRECTED',
    field: 'Odometer (Koreksi Histori)',
    old_value: `${oldMileage.toLocaleString('id-ID')} km`,
    new_value: `${newMileage.toLocaleString('id-ID')} km`,
    performed_by: performedBy,
    notes: `Koreksi Odometer: ${reason}`,
  };

  const updatedAsset: Asset = {
    ...asset,
    updated_at: nowIso,
    data_origin: 'local',
    vehicle_details: {
      ...asset.vehicle_details,
      current_mileage: newMileage,
    },
    history: [historyEvent, ...(asset.history || [])],
  };

  return {
    updatedAsset,
    historyEvent,
  };
}

/**
 * Reconstructs vehicle mileage & service projections from historical maintenance facts
 */
export function reconstructVehicleProjections(asset: Asset): Partial<VehicleDetails> {
  if (!asset.vehicle_details) return {};

  const activeRecords = (asset.maintenance_records || [])
    .filter((m) => !m.deleted)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let maxMileage = asset.vehicle_details.current_mileage || 0;
  let lastOilDate: string | undefined = undefined;
  let lastOilMileage: number | undefined = undefined;
  let nextOilMileage: number | undefined = undefined;
  let lastServiceMileage: number | undefined = undefined;
  let nextServiceMileage: number | undefined = undefined;

  for (const record of activeRecords) {
    if (record.mileage && record.mileage > maxMileage) {
      maxMileage = record.mileage;
    }
    if (record.type === 'oil_change') {
      lastOilDate = record.date;
      if (record.mileage) lastOilMileage = record.mileage;
      if (record.next_mileage) nextOilMileage = record.next_mileage;
    } else if (record.type === 'routine_service') {
      if (record.mileage) lastServiceMileage = record.mileage;
      if (record.next_mileage) nextServiceMileage = record.next_mileage;
    }
  }

  return {
    current_mileage: maxMileage,
    last_oil_change_date: lastOilDate,
    last_oil_change_mileage: lastOilMileage,
    next_oil_change_mileage: nextOilMileage,
    last_service_mileage: lastServiceMileage,
    next_service_mileage: nextServiceMileage,
  };
}
