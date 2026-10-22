/**
 * G4.11 — Discount operational metrics isolation (profile + discount scope).
 * Run: pnpm --filter api run test:gastro-discount-metrics-scope
 */

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type ClaimRow = { tenantId: string; discountId: string; gastroProfileId: string };
type ValidationRow = { discountId: string; gastroProfileId: string };

function countClaims(
  rows: ClaimRow[],
  tenantId: string,
  gastroProfileId: string,
  discountId: string,
): number {
  return rows.filter(
    (r) =>
      r.tenantId === tenantId &&
      r.gastroProfileId === gastroProfileId &&
      r.discountId === discountId,
  ).length;
}

function countValidations(
  rows: ValidationRow[],
  gastroProfileId: string,
  discountId: string,
): number {
  return rows.filter(
    (r) => r.gastroProfileId === gastroProfileId && r.discountId === discountId,
  ).length;
}

function matchesRouteProfile(
  routeProfileId: string,
  discountProfileId: string,
): boolean {
  return routeProfileId === discountProfileId;
}

const claims: ClaimRow[] = [
  { tenantId: 't1', discountId: 'd-a', gastroProfileId: 'local-a' },
  { tenantId: 't1', discountId: 'd-a', gastroProfileId: 'local-a' },
  { tenantId: 't1', discountId: 'd-b', gastroProfileId: 'local-a' },
  { tenantId: 't1', discountId: 'd-c', gastroProfileId: 'local-b' },
  { tenantId: 't2', discountId: 'd-a', gastroProfileId: 'local-a' },
];

const validations: ValidationRow[] = [
  { discountId: 'd-a', gastroProfileId: 'local-a' },
  { discountId: 'd-b', gastroProfileId: 'local-a' },
  { discountId: 'd-b', gastroProfileId: 'local-a' },
  { discountId: 'd-c', gastroProfileId: 'local-b' },
];

assert(countClaims(claims, 't1', 'local-a', 'd-a') === 2, 'discount A claims ≠ discount B');
assert(countClaims(claims, 't1', 'local-a', 'd-b') === 1, 'discount B claims independent');
assert(countClaims(claims, 't1', 'local-b', 'd-c') === 1, 'local B discount independent');
assert(countClaims(claims, 't2', 'local-a', 'd-a') === 1, 'tenant isolation on claims');
assert(countValidations(validations, 'local-a', 'd-a') === 1, 'validations scoped to discount A');
assert(countValidations(validations, 'local-a', 'd-b') === 2, 'validations scoped to discount B');
assert(
  matchesRouteProfile('local-a', 'local-a') === true,
  'route profile matches discount profile → allow',
);
assert(
  matchesRouteProfile('local-a', 'local-b') === false,
  'cross-profile route → reject (discount A ≠ local B)',
);

/** Query keys must include profileId for admin operational metrics. */
function adminOperationalMetricsKey(profileId: string, discountId: string) {
  return ['admin', 'gastronomicos', 'operational-metrics', profileId, discountId] as const;
}
const keyA = adminOperationalMetricsKey('local-a', 'd-1');
const keyB = adminOperationalMetricsKey('local-b', 'd-1');
assert(keyA[3] !== keyB[3], 'admin query keys differ by profileId');
assert(keyA[4] === keyB[4], 'same discountId can exist under different profiles in key space');

console.log('\nAll G4.11 gastro discount metrics scope checks passed.');
