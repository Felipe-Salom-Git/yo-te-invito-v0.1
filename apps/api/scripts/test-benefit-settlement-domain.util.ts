/**
 * Benefit settlement domain helpers (no DB).
 * Run: pnpm --filter api run test:benefit-settlement-domain
 */

import {
  addMoneyCentsStrings,
  benefitSettlementPeriodBounds,
  benefitSettlementPeriodKeySchema,
  compareSettlementValidationOrder,
  deriveBenefitSettlementStatus,
  getBenefitSettlementPeriodKey,
  isActivityValidationEligibleForSettlement,
  isGastroValidationEligibleForSettlement,
  LEGACY_INT32_MAX_CENTS,
  moneyCentsToString,
  parseMoneyCentsString,
  resolveBenefitAgreementAtDate,
  resolveSettlementAgreementForValidation,
  sumMoneyCentsBigInt,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(isGastroValidationEligibleForSettlement({ claimId: 'c1' }), 'gastro with claim eligible');
assert(!isGastroValidationEligibleForSettlement({ claimId: null }), 'gastro master QR excluded');

assert(
  isActivityValidationEligibleForSettlement({ claimId: 'c1', result: 'VALID' }),
  'activity VALID eligible',
);
assert(
  !isActivityValidationEligibleForSettlement({ claimId: 'c1', result: 'EXPIRED' }),
  'activity non-VALID excluded',
);
assert(
  !isActivityValidationEligibleForSettlement({ claimId: null, result: 'VALID' }),
  'activity without claim excluded',
);

const augEndUtc = new Date('2026-09-01T02:59:59.000Z');
assert(getBenefitSettlementPeriodKey(augEndUtc) === '2026-08', 'AR period boundary august');

const sepStartUtc = new Date('2026-09-01T03:00:00.000Z');
assert(getBenefitSettlementPeriodKey(sepStartUtc) === '2026-09', 'AR period boundary september');

assert(benefitSettlementPeriodKeySchema.safeParse('2026-08').success, 'valid period key');
assert(!benefitSettlementPeriodKeySchema.safeParse('2026-13').success, 'reject month 13');
assert(!benefitSettlementPeriodKeySchema.safeParse('08/2026').success, 'reject slash format');

const bounds = benefitSettlementPeriodBounds('2026-08');
assert(bounds.start < bounds.end, 'period bounds ordered');

const agreements = [
  {
    id: 'a-aug',
    validFromKey: '2026-08-01',
    validToKey: '2026-08-15',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    currency: 'ARS',
  },
  {
    id: 'a-sep-part',
    validFromKey: '2026-08-16',
    validToKey: null,
    unitPriceCents: 600000n,
    barterMultiplier: '2',
    currency: 'ARS',
  },
];

const earlyAug = new Date('2026-08-10T15:00:00.000Z');
const lateAug = new Date('2026-08-20T15:00:00.000Z');
assert(
  resolveSettlementAgreementForValidation(agreements, earlyAug)?.id === 'a-aug',
  'historical agreement early august',
);
assert(
  resolveSettlementAgreementForValidation(agreements, lateAug)?.id === 'a-sep-part',
  'historical agreement late august different price',
);

const mixedTotal = sumMoneyCentsBigInt([500000n, 600000n, 500000n]);
assert(mixedTotal === '1600000', 'multiple agreement prices summed as bigint strings');

const large = '3000000000';
assert(parseMoneyCentsString(large) > LEGACY_INT32_MAX_CENTS, 'large cents beyond Int32');
assert(
  addMoneyCentsStrings(large, '100') === moneyCentsToString(parseMoneyCentsString(large) + 100n),
  'add money strings',
);

assert(
  deriveBenefitSettlementStatus({
    status: 'OPEN',
    allocatedUsageCount: 0,
    pendingUsageCount: 5,
  }) === 'OPEN',
  'status open',
);
assert(
  deriveBenefitSettlementStatus({
    status: 'OPEN',
    allocatedUsageCount: 3,
    pendingUsageCount: 2,
  }) === 'PARTIALLY_ALLOCATED',
  'status partial',
);
assert(
  deriveBenefitSettlementStatus({
    status: 'PARTIALLY_ALLOCATED',
    allocatedUsageCount: 5,
    pendingUsageCount: 0,
  }) === 'ALLOCATED',
  'status allocated',
);
assert(
  deriveBenefitSettlementStatus({
    status: 'CLOSED',
    allocatedUsageCount: 5,
    pendingUsageCount: 0,
  }) === 'CLOSED',
  'status closed preserved',
);

const order = [
  { validatedAt: new Date('2026-08-02'), validationId: 'b' },
  { validatedAt: new Date('2026-08-01'), validationId: 'z' },
  { validatedAt: new Date('2026-08-01'), validationId: 'a' },
].sort(compareSettlementValidationOrder);
assert(order[0]!.validationId === 'a', 'oldest first tie-break id');

async function tryDbIntegration() {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
  } catch (err) {
    console.log('\nDB integration: NO EJECUTADO — PostgreSQL no disponible');
    console.log(String(err));
    return;
  }

  const indexes = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'BenefitSettlement'
      AND indexname IN (
        'BenefitSettlement_tenant_gastro_period_key',
        'BenefitSettlement_tenant_activity_period_key'
      )`;
  assert(indexes.length === 2, 'partial unique settlement indexes exist');

  const allocationUnique = await prisma.$queryRaw<Array<{ indexname: string }>>`
    SELECT indexname FROM pg_indexes
    WHERE tablename = 'BenefitSettlementUsageAllocation'
      AND indexname = 'BenefitSettlementUsageAllocation_validationSource_validationId_key'`;
  assert(allocationUnique.length === 1, 'validation allocation unique index exists');

  console.log('\nDB integration: PASS (indexes present)');
  await prisma.$disconnect();
}

tryDbIntegration()
  .then(() => {
    console.log('\nAll benefit settlement domain checks passed.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
