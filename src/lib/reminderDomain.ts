/**
 * MicroMate Reminder Domain & Lifecycle Contract (Phase 3C-1)
 *
 * Core Principles:
 * 1. Canonical Reminder Type with strict lifecycle states: PENDING -> DUE / OVERDUE -> COMPLETED / DISMISSED
 * 2. Deterministic Recurrence Engine (ONCE, DAILY, WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUALLY, ANNUAL, CUSTOM)
 *    calculated without browser timezone shift or local clock drift.
 * 3. Idempotent mutations & duplicate execution safeguards (MUT-REM-...).
 * 4. Thin UI / Domain Methods pattern (UI interacts via high-level domain operations).
 */

import { Reminder, ReminderDerivedState, ReminderRepeatRule, ReminderStatus, ReminderType } from '../types';

export interface CreateReminderInput {
  reminder_id?: string;
  asset_id?: string;
  asset_name?: string;
  type: ReminderType;
  title: string;
  due_date: string; // Format: YYYY-MM-DD or ISO String
  repeat_rule?: ReminderRepeatRule | string;
  custom_interval_days?: number;
  custom_interval_km?: number;
  notes?: string;
}

export interface UpdateReminderInput {
  title?: string;
  type?: ReminderType;
  due_date?: string;
  repeat_rule?: ReminderRepeatRule | string;
  custom_interval_days?: number;
  custom_interval_km?: number;
  notes?: string;
  status?: ReminderStatus;
}

export interface ReminderLifecycleEvaluation {
  canonicalStatus: ReminderStatus; // 'pending' | 'completed' | 'dismissed'
  displayStatus: ReminderDerivedState; // 'upcoming' | 'due_today' | 'overdue' | 'completed' | 'dismissed'
  daysRemaining: number;
  isActionable: boolean;
}

/**
 * Normalizes legacy repeat rule strings into canonical ReminderRepeatRule values.
 * e.g. 'none' -> 'once', 'annual' -> 'annually', 'custom' -> 'custom_days'
 */
export function normalizeRepeatRule(ruleInput?: string): ReminderRepeatRule {
  if (!ruleInput) return 'once';
  const clean = ruleInput.toLowerCase().trim();
  if (clean === 'none' || clean === 'once') return 'once';
  if (clean === 'annual' || clean === 'annually') return 'annually';
  if (clean === 'daily') return 'daily';
  if (clean === 'weekly') return 'weekly';
  if (clean === 'monthly') return 'monthly';
  if (clean === 'quarterly') return 'quarterly';
  if (clean === 'semi_annually') return 'semi_annually';
  if (clean === 'custom' || clean === 'custom_days') return 'custom_days';
  if (clean === 'custom_km') return 'custom_km';
  return 'once';
}

/**
 * Normalizes any date string into pure UTC date representation (YYYY-MM-DD)
 * to prevent browser timezone offsets.
 */
export function normalizeDateStringToUtcYMD(dateInput: string | Date): string {
  if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      return dateInput;
    }
    const parsed = new Date(dateInput);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
    return dateInput.substring(0, 10);
  }
  return dateInput.toISOString().split('T')[0];
}

/**
 * Deterministic Date Arithmetic Helper (Pure Calendar Calculation)
 * Avoids any locale or timezone dependency.
 */
export function addDaysToYMD(ymd: string, days: number): string {
  const [yearStr, monthStr, dayStr] = ymd.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1;
  const day = parseInt(dayStr, 10);

  const utcDate = new Date(Date.UTC(year, month, day));
  utcDate.setUTCDate(utcDate.getUTCDate() + days);

  return utcDate.toISOString().split('T')[0];
}

/**
 * Adds months to a YYYY-MM-DD string with correct month-end clamping
 * (e.g. 2026-01-31 + 1 month -> 2026-02-28, 2024-02-29 + 1 year -> 2025-02-28).
 */
export function addMonthsToYMD(ymd: string, monthsToAdd: number): string {
  const [yearStr, monthStr, dayStr] = ymd.split('-');
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // 0-indexed
  const originalDay = parseInt(dayStr, 10);

  month += monthsToAdd;
  year += Math.floor(month / 12);
  month = ((month % 12) + 12) % 12;

  // Determine last day of the target month in UTC
  const lastDayOfTargetMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const safeDay = Math.min(originalDay, lastDayOfTargetMonth);

  const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${year}-${pad(month + 1)}-${pad(safeDay)}`;
}

/**
 * Calculates the next deterministic due date based on recurrence rules.
 * Returns null if the rule is non-recurring ('once').
 */
export function calculateNextDueDate(
  currentDueDate: string,
  repeatRule: ReminderRepeatRule | string,
  customIntervalDays?: number,
  referenceBaseDate?: string
): string | null {
  const canonicalRule = normalizeRepeatRule(repeatRule);
  const baseDateYMD = normalizeDateStringToUtcYMD(referenceBaseDate || currentDueDate);

  switch (canonicalRule) {
    case 'once':
      return null;

    case 'daily':
      return addDaysToYMD(baseDateYMD, 1);

    case 'weekly':
      return addDaysToYMD(baseDateYMD, 7);

    case 'monthly':
      return addMonthsToYMD(baseDateYMD, 1);

    case 'quarterly':
      return addMonthsToYMD(baseDateYMD, 3);

    case 'semi_annually':
      return addMonthsToYMD(baseDateYMD, 6);

    case 'annually':
      return addMonthsToYMD(baseDateYMD, 12);

    case 'custom_days':
      const days = customIntervalDays && customIntervalDays > 0 ? customIntervalDays : 30;
      return addDaysToYMD(baseDateYMD, days);

    case 'custom_km':
      // KM-based reminders do not advance on date alone unless explicit interval given
      return customIntervalDays ? addDaysToYMD(baseDateYMD, customIntervalDays) : null;

    default:
      return null;
  }
}

/**
 * Pure Presentation Helper: Evaluates Reminder Status deterministically against a reference date (default: today UTC)
 * UI must use this derived evaluation instead of calculating offsets or dates in React components.
 */
export function getReminderPresentationState(
  reminder: Reminder,
  referenceDateInput?: string
): ReminderLifecycleEvaluation {
  const refYMD = normalizeDateStringToUtcYMD(referenceDateInput || new Date().toISOString());
  const dueYMD = normalizeDateStringToUtcYMD(reminder.due_date);

  if (reminder.status === 'completed') {
    return {
      canonicalStatus: 'completed',
      displayStatus: 'completed',
      daysRemaining: 0,
      isActionable: false,
    };
  }

  if (reminder.status === 'dismissed') {
    return {
      canonicalStatus: 'dismissed',
      displayStatus: 'dismissed',
      daysRemaining: 0,
      isActionable: false,
    };
  }

  // Calculate day difference
  const [refY, refM, refD] = refYMD.split('-').map(Number);
  const [dueY, dueM, dueD] = dueYMD.split('-').map(Number);

  const refUtcMs = Date.UTC(refY, refM - 1, refD);
  const dueUtcMs = Date.UTC(dueY, dueM - 1, dueD);
  const msPerDay = 86400000;
  const daysRemaining = Math.round((dueUtcMs - refUtcMs) / msPerDay);

  let displayStatus: ReminderDerivedState = 'upcoming';
  if (daysRemaining < 0) {
    displayStatus = 'overdue';
  } else if (daysRemaining === 0) {
    displayStatus = 'due_today';
  } else {
    displayStatus = 'upcoming';
  }

  return {
    canonicalStatus: 'pending',
    displayStatus,
    daysRemaining,
    isActionable: true,
  };
}

export const evaluateReminderLifecycle = getReminderPresentationState;

/**
 * Factory for creating a canonical Reminder object with full metadata.
 */
export function createCanonicalReminder(
  input: CreateReminderInput,
  nowTimestamp?: string
): Reminder {
  const nowIso = nowTimestamp || new Date().toISOString();
  const cleanDueDate = normalizeDateStringToUtcYMD(input.due_date);
  const rule: ReminderRepeatRule = normalizeRepeatRule(input.repeat_rule);

  const nextDue = calculateNextDueDate(cleanDueDate, rule, input.custom_interval_days);

  return {
    reminder_id: input.reminder_id || `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    asset_id: input.asset_id,
    asset_name: input.asset_name,
    type: input.type,
    title: input.title.trim(),
    due_date: cleanDueDate,
    repeat_rule: rule,
    status: 'pending',
    next_due_at: nextDue || undefined,
    notes: input.notes?.trim() || undefined,
    custom_interval_days: input.custom_interval_days,
    custom_interval_km: input.custom_interval_km,
    created_at: nowIso,
    updated_at: nowIso,
  };
}

/**
 * Transitions a Reminder to COMPLETED state.
 * If the reminder is recurring, advances due_date deterministically or generates next cycle.
 */
export function completeReminderState(
  reminder: Reminder,
  options?: {
    completedAt?: string;
    nowTimestamp?: string;
  }
): {
  updatedReminder: Reminder;
  isRecurring: boolean;
  previousCycleDueDate: string;
} {
  const nowIso = options?.nowTimestamp || new Date().toISOString();
  const completedAtIso = options?.completedAt || nowIso;
  const previousCycleDueDate = reminder.due_date;
  const canonicalRule = normalizeRepeatRule(reminder.repeat_rule);

  const isRecurring = canonicalRule !== 'once';

  if (!isRecurring) {
    // Terminal completion for one-time reminder
    return {
      updatedReminder: {
        ...reminder,
        repeat_rule: 'once',
        status: 'completed',
        last_completed_at: completedAtIso,
        updated_at: nowIso,
      },
      isRecurring: false,
      previousCycleDueDate,
    };
  }

  // Recurring Reminder: Advance canonical due_date deterministically from current due_date
  const nextDueDate = calculateNextDueDate(
    reminder.due_date,
    canonicalRule,
    reminder.custom_interval_days
  ) || addMonthsToYMD(reminder.due_date, 1);

  const followingDue = calculateNextDueDate(
    nextDueDate,
    canonicalRule,
    reminder.custom_interval_days
  );

  return {
    updatedReminder: {
      ...reminder,
      repeat_rule: canonicalRule,
      status: 'pending', // Re-arms to pending for the next cycle
      due_date: nextDueDate, // Canonical scheduling field
      last_completed_at: completedAtIso,
      next_due_at: followingDue || undefined,
      updated_at: nowIso,
    },
    isRecurring: true,
    previousCycleDueDate,
  };
}

/**
 * Transitions a Reminder to DISMISSED state (Terminal dismissal).
 */
export function dismissReminderState(
  reminder: Reminder,
  nowTimestamp?: string
): Reminder {
  const nowIso = nowTimestamp || new Date().toISOString();
  return {
    ...reminder,
    status: 'dismissed',
    updated_at: nowIso,
  };
}
