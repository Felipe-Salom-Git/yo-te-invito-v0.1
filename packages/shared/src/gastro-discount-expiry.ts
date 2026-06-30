/**
 * Gastro discount validity — inclusive calendar-day rules in Argentina local time.
 * Expiry on 2026-06-24 is valid through 2026-06-24 23:59:59 America/Argentina/Buenos_Aires.
 */

import type { GastroWeekday } from './schemas/gastro-discounts';
import { GASTRO_WEEKDAY_LABELS_ES } from './schemas/gastro-discounts';

export const GASTRO_DISCOUNT_TIMEZONE = 'America/Argentina/Buenos_Aires';

type ZonedParts = { year: number; month: number; day: number };

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
  };
}

function formatCalendarKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** UTC instant for 00:00:00 on a calendar day in the given IANA timezone */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const utcGuess = Date.UTC(year, month - 1, day, 12, 0, 0);
  const probe = new Date(utcGuess);
  const utcAsLocal = new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzAsLocal = new Date(probe.toLocaleString('en-US', { timeZone }));
  const offsetMs = tzAsLocal.getTime() - utcAsLocal.getTime();
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs);
}

/** Calendar date key (YYYY-MM-DD) for an instant in the gastro discount timezone */
export function getGastroDiscountCalendarKey(
  date: Date,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): string {
  const { year, month, day } = getZonedParts(date, timeZone);
  return formatCalendarKey(year, month, day);
}

/** End of local calendar day (23:59:59.999) for storage */
export function gastroDiscountEndOfDay(
  year: number,
  month: number,
  day: number,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): Date {
  const start = zonedMidnight(year, month, day, timeZone);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

/** Start of local calendar day (00:00:00.000) for storage */
export function gastroDiscountStartOfDay(
  year: number,
  month: number,
  day: number,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): Date {
  return zonedMidnight(year, month, day, timeZone);
}

/**
 * Normalize a discount expiry to end of its local calendar day (AR).
 * Accepts ISO datetime or YYYY-MM-DD date strings.
 */
export function normalizeGastroDiscountExpiryDate(
  input: string | Date,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): Date {
  if (typeof input === 'string') {
    const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      return gastroDiscountEndOfDay(
        Number(dateOnly[1]),
        Number(dateOnly[2]),
        Number(dateOnly[3]),
        timeZone,
      );
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid gastro discount expiry date');
  }
  const { year, month, day } = getZonedParts(d, timeZone);
  return gastroDiscountEndOfDay(year, month, day, timeZone);
}

/**
 * Normalize valid-from to start of local calendar day (AR).
 */
export function normalizeGastroDiscountValidFromDate(
  input: string | Date,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): Date {
  if (typeof input === 'string') {
    const dateOnly = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateOnly) {
      return gastroDiscountStartOfDay(
        Number(dateOnly[1]),
        Number(dateOnly[2]),
        Number(dateOnly[3]),
        timeZone,
      );
    }
  }
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) {
    throw new Error('Invalid gastro discount valid-from date');
  }
  const { year, month, day } = getZonedParts(d, timeZone);
  return gastroDiscountStartOfDay(year, month, day, timeZone);
}

/** True when the expiry calendar day is before today (local AR) */
export function isGastroDiscountExpired(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): boolean {
  if (!expiresAt) return false;
  const expiryKey = getGastroDiscountCalendarKey(expiresAt, timeZone);
  const todayKey = getGastroDiscountCalendarKey(now, timeZone);
  return expiryKey < todayKey;
}

/** True when valid-from calendar day is after today (local AR) */
export function isGastroDiscountNotYetActive(
  validFrom: Date | null | undefined,
  now: Date = new Date(),
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): boolean {
  if (!validFrom) return false;
  const fromKey = getGastroDiscountCalendarKey(validFrom, timeZone);
  const todayKey = getGastroDiscountCalendarKey(now, timeZone);
  return fromKey > todayKey;
}

/** Inclusive bounds for the local calendar day containing `now` */
export function getGastroDiscountLocalDayBounds(
  now: Date = new Date(),
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): { start: Date; end: Date } {
  const { year, month, day } = getZonedParts(now, timeZone);
  const start = gastroDiscountStartOfDay(year, month, day, timeZone);
  const end = gastroDiscountEndOfDay(year, month, day, timeZone);
  return { start, end };
}

const INTL_WEEKDAY_TO_GASTRO: Record<string, GastroWeekday> = {
  Monday: 'MONDAY',
  Tuesday: 'TUESDAY',
  Wednesday: 'WEDNESDAY',
  Thursday: 'THURSDAY',
  Friday: 'FRIDAY',
  Saturday: 'SATURDAY',
  Sunday: 'SUNDAY',
};

/** Weekday for an instant in the gastro discount timezone (AR). */
export function getGastroWeekdayFromDate(
  date: Date = new Date(),
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): GastroWeekday {
  const label = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
  }).format(date);
  return INTL_WEEKDAY_TO_GASTRO[label] ?? 'MONDAY';
}

export function getGastroWeekdayLabelEs(weekday: GastroWeekday): string {
  return GASTRO_WEEKDAY_LABELS_ES[weekday];
}

export type GastroDiscountValidityReason = 'EXPIRED' | 'NOT_VALID_TODAY' | 'INACTIVE';

export type GastroDiscountValidTodayInput = {
  validityMode?: 'DATE_RANGE' | 'WEEKLY_RECURRING' | null;
  validWeekday?: GastroWeekday | null;
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  discountDate?: Date | string | null;
  status?: string | null;
  now?: Date;
  timeZone?: string;
};

function toDateOrNull(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const INACTIVE_DISCOUNT_STATUSES = new Set([
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
  'PENDING_REVIEW',
  'COMMISSION_NEGOTIATION',
]);

/**
 * Whether a gastro discount parent row is redeemable today (AR local time).
 * Weekly recurring discounts ignore calendar expiry unless optional validTo is set.
 */
export function isGastroDiscountValidToday(
  input: GastroDiscountValidTodayInput,
): { valid: boolean; reason?: GastroDiscountValidityReason } {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? GASTRO_DISCOUNT_TIMEZONE;
  const status = input.status ?? 'ACTIVE';

  if (INACTIVE_DISCOUNT_STATUSES.has(status)) {
    return { valid: false, reason: 'INACTIVE' };
  }

  const validityMode = input.validityMode ?? 'DATE_RANGE';

  if (validityMode === 'WEEKLY_RECURRING') {
    if (!input.validWeekday) {
      return { valid: false, reason: 'INACTIVE' };
    }
    const todayWeekday = getGastroWeekdayFromDate(now, timeZone);
    if (todayWeekday !== input.validWeekday) {
      return { valid: false, reason: 'NOT_VALID_TODAY' };
    }
    const validFrom = toDateOrNull(input.validFrom);
    if (isGastroDiscountNotYetActive(validFrom, now, timeZone)) {
      return { valid: false, reason: 'INACTIVE' };
    }
    const expiresAt =
      toDateOrNull(input.validTo) ?? toDateOrNull(input.discountDate);
    if (isGastroDiscountExpired(expiresAt, now, timeZone)) {
      return { valid: false, reason: 'EXPIRED' };
    }
    return { valid: true };
  }

  const validFrom = toDateOrNull(input.validFrom);
  if (isGastroDiscountNotYetActive(validFrom, now, timeZone)) {
    return { valid: false, reason: 'INACTIVE' };
  }
  const expiresAt =
    toDateOrNull(input.validTo) ?? toDateOrNull(input.discountDate);
  if (isGastroDiscountExpired(expiresAt, now, timeZone)) {
    return { valid: false, reason: 'EXPIRED' };
  }
  return { valid: true };
}
