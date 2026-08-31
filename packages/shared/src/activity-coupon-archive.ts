import { isGastroDiscountDateExpired } from './gastro-discount-archive';

export type ActivityCouponLifecycleBucket = 'ACTIVE' | 'PENDING' | 'FINISHED' | 'ARCHIVED';

export type ActivityCouponArchiveInput = {
  status: string;
  archivedAt?: Date | string | null;
  validityMode?: string | null;
  validTo?: Date | string | null;
  couponDate?: Date | string | null;
  now?: Date;
};

export function canArchiveActivityCoupon(input: ActivityCouponArchiveInput): boolean {
  if (input.archivedAt) return false;
  if (['EXPIRED', 'CANCELLED', 'REJECTED'].includes(input.status)) return true;
  if (
    ['ACTIVE', 'APPROVED'].includes(input.status) &&
    isGastroDiscountDateExpired({
      status: input.status,
      validityMode: input.validityMode,
      validTo: input.validTo,
      discountDate: input.couponDate,
      now: input.now,
    })
  ) {
    return true;
  }
  return false;
}

export function canUnarchiveActivityCoupon(input: ActivityCouponArchiveInput): boolean {
  return Boolean(input.archivedAt);
}

export function classifyActivityCouponLifecycle(
  input: ActivityCouponArchiveInput,
): ActivityCouponLifecycleBucket {
  if (input.archivedAt) return 'ARCHIVED';
  if (input.status === 'PENDING_REVIEW') return 'PENDING';
  if (
    input.status === 'EXPIRED' ||
    input.status === 'CANCELLED' ||
    input.status === 'REJECTED' ||
    isGastroDiscountDateExpired({
      status: input.status,
      validityMode: input.validityMode,
      validTo: input.validTo,
      discountDate: input.couponDate,
      now: input.now,
    })
  ) {
    return 'FINISHED';
  }
  return 'ACTIVE';
}
