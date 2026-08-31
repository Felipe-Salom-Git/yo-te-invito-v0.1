import { isGastroDiscountExpired } from './gastro-discount-expiry';

export type GastroDiscountLifecycleBucket =
  | 'ACTIVE'
  | 'PENDING'
  | 'FINISHED'
  | 'ARCHIVED';

export type GastroDiscountArchiveInput = {
  status: string;
  archivedAt?: Date | string | null;
  validityMode?: string | null;
  validTo?: Date | string | null;
  discountDate?: Date | string | null;
  hasPendingUpdate?: boolean;
  now?: Date;
};

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function isGastroDiscountDateExpired(input: GastroDiscountArchiveInput): boolean {
  const weekly = input.validityMode === 'WEEKLY_RECURRING';
  const expiresAt = toDate(input.validTo) ?? toDate(input.discountDate);
  if (weekly && !expiresAt) return false;
  return isGastroDiscountExpired(expiresAt, input.now ?? new Date());
}

export function canArchiveGastroDiscount(input: GastroDiscountArchiveInput): boolean {
  if (input.archivedAt) return false;
  if (['EXPIRED', 'CANCELLED', 'REJECTED'].includes(input.status)) return true;
  if (
    ['ACTIVE', 'APPROVED'].includes(input.status) &&
    isGastroDiscountDateExpired(input)
  ) {
    return true;
  }
  return false;
}

export function canUnarchiveGastroDiscount(input: GastroDiscountArchiveInput): boolean {
  return Boolean(input.archivedAt);
}

export function classifyGastroDiscountLifecycle(
  input: GastroDiscountArchiveInput,
): GastroDiscountLifecycleBucket {
  if (input.archivedAt) return 'ARCHIVED';
  if (
    input.hasPendingUpdate ||
    input.status === 'PENDING_REVIEW' ||
    input.status === 'COMMISSION_NEGOTIATION'
  ) {
    return 'PENDING';
  }
  if (
    input.status === 'EXPIRED' ||
    input.status === 'CANCELLED' ||
    input.status === 'REJECTED' ||
    isGastroDiscountDateExpired(input)
  ) {
    return 'FINISHED';
  }
  return 'ACTIVE';
}
