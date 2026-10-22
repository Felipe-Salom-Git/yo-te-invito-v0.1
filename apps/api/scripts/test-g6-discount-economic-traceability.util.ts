/**
 * G6.1 — Discount → validation → allocation join (no invented discount FK).
 * Run: pnpm --filter api run test:g6-discount-economic-traceability
 */

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type Validation = { id: string; discountId: string; gastroProfileId: string };
type Allocation = {
  id: string;
  validationSource: string;
  validationId: string;
  mode: 'CASH' | 'BARTER';
};

function allocationsForDiscount(
  validations: Validation[],
  allocations: Allocation[],
  tenantDiscountId: string,
  gastroProfileId: string,
): Allocation[] {
  const validationIds = new Set(
    validations
      .filter((v) => v.discountId === tenantDiscountId && v.gastroProfileId === gastroProfileId)
      .map((v) => v.id),
  );
  return allocations.filter(
    (a) =>
      a.validationSource === 'GASTRO_DISCOUNT_VALIDATION' && validationIds.has(a.validationId),
  );
}

const validations: Validation[] = [
  { id: 'v1', discountId: 'd-a', gastroProfileId: 'local-a' },
  { id: 'v2', discountId: 'd-a', gastroProfileId: 'local-a' },
  { id: 'v3', discountId: 'd-b', gastroProfileId: 'local-a' },
  { id: 'v4', discountId: 'd-c', gastroProfileId: 'local-b' },
];

const allocations: Allocation[] = [
  { id: 'a1', validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: 'v1', mode: 'CASH' },
  { id: 'a2', validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: 'v2', mode: 'BARTER' },
  { id: 'a3', validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: 'v3', mode: 'CASH' },
  { id: 'a4', validationSource: 'GASTRO_DISCOUNT_VALIDATION', validationId: 'v4', mode: 'CASH' },
  {
    id: 'a5',
    validationSource: 'ACTIVITY_COUPON_VALIDATION',
    validationId: 'v1',
    mode: 'CASH',
  },
];

const forDa = allocationsForDiscount(validations, allocations, 'd-a', 'local-a');
assert(forDa.length === 2, 'discount A gets only its gastro validations');
assert(
  forDa.every((a) => a.id === 'a1' || a.id === 'a2'),
  'discount A allocation ids a1+a2',
);
assert(
  !forDa.some((a) => a.id === 'a5'),
  'ACTIVITY_COUPON_VALIDATION never attributed to gastro discount',
);

const forDb = allocationsForDiscount(validations, allocations, 'd-b', 'local-a');
assert(forDb.length === 1 && forDb[0]!.id === 'a3', 'discount B isolated on same profile');

const forDc = allocationsForDiscount(validations, allocations, 'd-c', 'local-b');
assert(forDc.length === 1 && forDc[0]!.id === 'a4', 'profile isolation: local-b discount C');

const cross = allocationsForDiscount(validations, allocations, 'd-a', 'local-b');
assert(cross.length === 0, 'wrong profileId → empty (no cross-profile leak)');

console.log('\nAll G6.1 discount economic traceability checks passed.');
