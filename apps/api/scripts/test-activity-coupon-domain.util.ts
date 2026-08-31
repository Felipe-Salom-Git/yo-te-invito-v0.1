/**
 * Domain helpers + Zod contracts for Activity Coupons (no DB).
 * Run: pnpm --filter api run test:activity-coupon-domain
 */

import {
  ACTIVITY_COUPON_EVENT_CATEGORY,
  activityCouponCreateSchema,
  canArchiveActivityCoupon,
  classifyActivityCouponLifecycle,
  initialStatusForActivityCouponOrigin,
  isEventCategoryEligibleForActivityCoupon,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(ACTIVITY_COUPON_EVENT_CATEGORY === 'excursion', 'technical category remains excursion');
assert(isEventCategoryEligibleForActivityCoupon('excursion'), 'excursion eligible');
assert(isEventCategoryEligibleForActivityCoupon('EXCURSION'), 'excursion case-insensitive');
assert(!isEventCategoryEligibleForActivityCoupon('gastro'), 'reject gastro');
assert(!isEventCategoryEligibleForActivityCoupon('event'), 'reject event');
assert(!isEventCategoryEligibleForActivityCoupon('rental'), 'reject rental');
assert(!isEventCategoryEligibleForActivityCoupon('hotel'), 'reject hotel');
assert(!isEventCategoryEligibleForActivityCoupon(null), 'reject null category');

assert(initialStatusForActivityCouponOrigin('ADMIN') === 'ACTIVE', 'ADMIN creates ACTIVE');
assert(
  initialStatusForActivityCouponOrigin('OPERATOR') === 'PENDING_REVIEW',
  'OPERATOR creates PENDING_REVIEW',
);

const baseCreate = {
  eventId: 'cltestevent000001',
  title: 'Promo rafting',
  summary: '20% off',
  detail: 'Presentá el QR',
  type: 'PERCENT' as const,
  value: 20,
  validityMode: 'DATE_RANGE' as const,
  validFrom: '2026-09-01',
  validTo: '2026-12-31',
};

assert(activityCouponCreateSchema.safeParse(baseCreate).success, 'create DATE_RANGE ok');
assert(
  !activityCouponCreateSchema.safeParse({ ...baseCreate, type: 'PERCENT', value: 0 }).success,
  'reject percent 0',
);
assert(
  !activityCouponCreateSchema.safeParse({ ...baseCreate, type: 'PERCENT', value: 150 }).success,
  'reject percent > 100',
);
assert(
  activityCouponCreateSchema.safeParse({ ...baseCreate, type: 'FIXED', value: 5000 }).success,
  'fixed value ok',
);
assert(
  !activityCouponCreateSchema.safeParse({
    ...baseCreate,
    validFrom: '2026-12-31',
    validTo: '2026-09-01',
  }).success,
  'reject inverted dates',
);
assert(
  !activityCouponCreateSchema.safeParse({
    ...baseCreate,
    validityMode: 'WEEKLY_RECURRING',
    validFrom: undefined,
    validTo: undefined,
  }).success,
  'weekly requires weekday',
);
assert(
  activityCouponCreateSchema.safeParse({
    ...baseCreate,
    validityMode: 'WEEKLY_RECURRING',
    validWeekday: 'SATURDAY',
    validFrom: undefined,
    validTo: undefined,
  }).success,
  'weekly saturday ok',
);
assert(
  !activityCouponCreateSchema.safeParse({
    ...baseCreate,
    extra: true,
  }).success,
  'create schema strict() rejects extra keys',
);
assert(
  !activityCouponCreateSchema.safeParse({
    ...baseCreate,
    imageUrls: ['http://insecure.example/a.png'],
  }).success,
  'reject http image',
);
assert(
  activityCouponCreateSchema.safeParse({
    ...baseCreate,
    imageUrls: ['https://cdn.example/a.png'],
  }).success,
  'https image ok',
);

assert(
  canArchiveActivityCoupon({ status: 'EXPIRED' }),
  'archive expired',
);
assert(
  !canArchiveActivityCoupon({ status: 'ACTIVE', validTo: '2099-12-31' }),
  'cannot archive live future coupon',
);
assert(classifyActivityCouponLifecycle({ status: 'PENDING_REVIEW' }) === 'PENDING', 'pending bucket');
assert(classifyActivityCouponLifecycle({ status: 'ACTIVE', archivedAt: new Date() }) === 'ARCHIVED', 'archived bucket');

console.log('\nAll activity coupon domain checks passed.');
