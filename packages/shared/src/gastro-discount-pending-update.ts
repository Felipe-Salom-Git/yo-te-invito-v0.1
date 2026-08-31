import { z } from 'zod';
import {
  getGastroDiscountCalendarKey,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
} from './gastro-discount-expiry';
import {
  gastroDiscountValidityModeSchema,
  gastroWeekdaySchema,
  type GastroDiscountUpdateInput,
  type GastroWeekday,
} from './schemas/gastro-discounts';

/** Allowlisted content fields for a pending published-content proposal. */
export const GASTRO_DISCOUNT_PENDING_UPDATE_KEYS = [
  'title',
  'summary',
  'detail',
  'imageUrls',
  'validityMode',
  'validWeekday',
  'validFrom',
  'validTo',
  'discountDate',
] as const;

export type GastroDiscountPendingUpdateKey =
  (typeof GASTRO_DISCOUNT_PENDING_UPDATE_KEYS)[number];

const isoOrNull = z.string().datetime().nullable();

export const gastroDiscountPendingUpdateSchema = z
  .object({
    title: z.string().max(200),
    summary: z.string().max(500),
    detail: z.string().max(5000),
    imageUrls: z.array(z.string().min(1).max(2_000_000)).max(30),
    validityMode: gastroDiscountValidityModeSchema,
    validWeekday: gastroWeekdaySchema.nullable(),
    validFrom: isoOrNull,
    validTo: isoOrNull,
    discountDate: isoOrNull,
  })
  .strict();

export type GastroDiscountPendingUpdatePayload = z.infer<
  typeof gastroDiscountPendingUpdateSchema
>;

export type GastroDiscountPublishedSnapshot = GastroDiscountPendingUpdatePayload;

export type MaterialDiscountChange = {
  field: GastroDiscountPendingUpdateKey;
  from: unknown;
  to: unknown;
};

const BLOCKED_PENDING_KEYS = new Set([
  'id',
  'tenantId',
  'gastroProfileId',
  'eventId',
  'createdAt',
  'updatedAt',
  'createdByUserId',
  'createdByOrigin',
  'status',
  'qrToken',
  'qrGeneratedAt',
  'code',
  'type',
  'value',
  'visibility',
  'adminNotes',
  'rejectionReason',
  'claims',
  'archivedAt',
  'pendingUpdate',
]);

export function shouldSubmitDiscountPendingEdit(status: string): boolean {
  return status === 'ACTIVE' || status === 'APPROVED';
}

function normalizeTitle(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function normalizeUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  return urls.filter((u): u is string => typeof u === 'string' && u.trim().length > 0);
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function calendarKeyOrNull(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return getGastroDiscountCalendarKey(d);
}

function urlsEqual(a: string[], b: string[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function datesEqual(a: string | null, b: string | null): boolean {
  return calendarKeyOrNull(a) === calendarKeyOrNull(b);
}

export function snapshotFromPublishedRow(row: {
  displayTitle?: string | null;
  summary?: string | null;
  detail?: string | null;
  submittedImageUrls?: unknown;
  validityMode?: string | null;
  validWeekday?: string | null;
  validFrom?: Date | string | null;
  validTo?: Date | string | null;
  discountDate?: Date | string | null;
}): GastroDiscountPublishedSnapshot {
  const validityMode =
    row.validityMode === 'WEEKLY_RECURRING' ? 'WEEKLY_RECURRING' : 'DATE_RANGE';
  const weekly = validityMode === 'WEEKLY_RECURRING';
  return {
    title: normalizeTitle(row.displayTitle),
    summary: normalizeTitle(row.summary),
    detail: normalizeTitle(row.detail),
    imageUrls: normalizeUrls(row.submittedImageUrls),
    validityMode,
    validWeekday: weekly
      ? ((row.validWeekday as GastroWeekday | null) ?? null)
      : null,
    validFrom: weekly ? null : toIsoOrNull(row.validFrom),
    validTo: weekly ? null : toIsoOrNull(row.validTo),
    discountDate: weekly ? null : toIsoOrNull(row.discountDate),
  };
}

export function applyDiscountUpdateToSnapshot(
  published: GastroDiscountPublishedSnapshot,
  body: GastroDiscountUpdateInput,
  normalizedDates?: {
    validFrom: Date | null;
    validTo: Date | null;
    discountDate: Date | null;
    validWeekday: GastroWeekday | null;
    validityMode: 'DATE_RANGE' | 'WEEKLY_RECURRING';
  },
): GastroDiscountPublishedSnapshot {
  const validityMode =
    normalizedDates?.validityMode ??
    body.validityMode ??
    published.validityMode;
  const weekly = validityMode === 'WEEKLY_RECURRING';

  const next: GastroDiscountPublishedSnapshot = {
    title: body.title !== undefined ? normalizeTitle(body.title) : published.title,
    summary:
      body.summary !== undefined ? normalizeTitle(body.summary) : published.summary,
    detail: body.detail !== undefined ? normalizeTitle(body.detail) : published.detail,
    imageUrls:
      body.imageUrls !== undefined ? normalizeUrls(body.imageUrls) : published.imageUrls,
    validityMode,
    validWeekday: weekly
      ? (normalizedDates?.validWeekday ??
        body.validWeekday ??
        published.validWeekday)
      : null,
    validFrom: weekly
      ? null
      : toIsoOrNull(normalizedDates?.validFrom ?? published.validFrom),
    validTo: weekly
      ? null
      : toIsoOrNull(normalizedDates?.validTo ?? published.validTo),
    discountDate: weekly
      ? null
      : toIsoOrNull(normalizedDates?.discountDate ?? published.discountDate),
  };
  return gastroDiscountPendingUpdateSchema.parse(next);
}

export function getMaterialDiscountChanges(
  published: GastroDiscountPublishedSnapshot,
  proposed: GastroDiscountPublishedSnapshot,
): MaterialDiscountChange[] {
  const changes: MaterialDiscountChange[] = [];
  if (published.title !== proposed.title) {
    changes.push({ field: 'title', from: published.title, to: proposed.title });
  }
  if (published.summary !== proposed.summary) {
    changes.push({ field: 'summary', from: published.summary, to: proposed.summary });
  }
  if (published.detail !== proposed.detail) {
    changes.push({ field: 'detail', from: published.detail, to: proposed.detail });
  }
  if (!urlsEqual(published.imageUrls, proposed.imageUrls)) {
    changes.push({
      field: 'imageUrls',
      from: published.imageUrls,
      to: proposed.imageUrls,
    });
  }
  if (published.validityMode !== proposed.validityMode) {
    changes.push({
      field: 'validityMode',
      from: published.validityMode,
      to: proposed.validityMode,
    });
  }
  if (published.validWeekday !== proposed.validWeekday) {
    changes.push({
      field: 'validWeekday',
      from: published.validWeekday,
      to: proposed.validWeekday,
    });
  }
  if (!datesEqual(published.validFrom, proposed.validFrom)) {
    changes.push({
      field: 'validFrom',
      from: published.validFrom,
      to: proposed.validFrom,
    });
  }
  if (!datesEqual(published.validTo, proposed.validTo)) {
    changes.push({
      field: 'validTo',
      from: published.validTo,
      to: proposed.validTo,
    });
  }
  if (!datesEqual(published.discountDate, proposed.discountDate)) {
    changes.push({
      field: 'discountDate',
      from: published.discountDate,
      to: proposed.discountDate,
    });
  }
  return changes;
}

export function hasMaterialDiscountChanges(
  published: GastroDiscountPublishedSnapshot,
  proposed: GastroDiscountPublishedSnapshot,
): boolean {
  return getMaterialDiscountChanges(published, proposed).length > 0;
}

export function buildPendingUpdatePayload(
  proposed: GastroDiscountPublishedSnapshot,
): GastroDiscountPendingUpdatePayload {
  const stripped: Record<string, unknown> = {};
  for (const key of GASTRO_DISCOUNT_PENDING_UPDATE_KEYS) {
    stripped[key] = proposed[key];
  }
  for (const key of Object.keys(stripped)) {
    if (BLOCKED_PENDING_KEYS.has(key)) {
      delete stripped[key];
    }
  }
  return gastroDiscountPendingUpdateSchema.parse(stripped);
}

export function parsePendingUpdate(value: unknown): GastroDiscountPendingUpdatePayload | null {
  if (value == null) return null;
  const parsed = gastroDiscountPendingUpdateSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function pendingUpdateToPublishedFields(payload: GastroDiscountPendingUpdatePayload): {
  displayTitle: string;
  summary: string;
  detail: string;
  displayDescription: string;
  submittedImageUrls: string[];
  validityMode: 'DATE_RANGE' | 'WEEKLY_RECURRING';
  validWeekday: GastroWeekday | null;
  validFrom: Date | null;
  validTo: Date | null;
  discountDate: Date | null;
} {
  const weekly = payload.validityMode === 'WEEKLY_RECURRING';
  if (weekly) {
    return {
      displayTitle: payload.title.trim(),
      summary: payload.summary.trim(),
      detail: payload.detail.trim(),
      displayDescription: payload.summary.trim(),
      submittedImageUrls: normalizeUrls(payload.imageUrls),
      validityMode: 'WEEKLY_RECURRING',
      validWeekday: payload.validWeekday,
      validFrom: null,
      validTo: null,
      discountDate: null,
    };
  }
  const validFrom = payload.validFrom
    ? normalizeGastroDiscountValidFromDate(payload.validFrom)
    : payload.discountDate
      ? normalizeGastroDiscountValidFromDate(payload.discountDate)
      : null;
  const validTo = payload.validTo
    ? normalizeGastroDiscountExpiryDate(payload.validTo)
    : payload.discountDate
      ? normalizeGastroDiscountExpiryDate(payload.discountDate)
      : null;
  const discountDate = payload.discountDate
    ? normalizeGastroDiscountExpiryDate(payload.discountDate)
    : validTo;
  return {
    displayTitle: payload.title.trim(),
    summary: payload.summary.trim(),
    detail: payload.detail.trim(),
    displayDescription: payload.summary.trim(),
    submittedImageUrls: normalizeUrls(payload.imageUrls),
    validityMode: 'DATE_RANGE',
    validWeekday: null,
    validFrom,
    validTo,
    discountDate,
  };
}
