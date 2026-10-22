/**
 * G5.5 — Allocation snapshots stay on historical agreement values after replace.
 * Run: pnpm --filter api run test:g5-agreement-allocation-snapshots
 *
 * Domain: BenefitCommercialAgreement is GastroProfile-scoped.
 * Allocations store unitPriceCents / barterMultiplier snapshots — never mutate retrospectively.
 */

import {
  moneyCentsToString,
  parseMoneyCentsString,
  resolveBenefitAgreementAtDate,
  roundBarterCreditCents,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type AllocationSnapshot = {
  agreementId: string;
  unitPriceCents: bigint;
  barterMultiplier: string;
  baseAmountCents: bigint;
};

/** Simulate Stage 9 allocate: copy agreement values into immutable snapshot. */
function allocateFromAgreement(agreement: {
  id: string;
  unitPriceCents: bigint;
  barterMultiplier: string;
}): AllocationSnapshot {
  return {
    agreementId: agreement.id,
    unitPriceCents: agreement.unitPriceCents,
    barterMultiplier: agreement.barterMultiplier,
    baseAmountCents: agreement.unitPriceCents,
  };
}

const agreementV1 = {
  id: 'agr-5k',
  validFromKey: '2026-01-01',
  validToKey: '2026-09-30',
  unitPriceCents: parseMoneyCentsString('500000'), // $5.000
  barterMultiplier: '2',
};

const agreementV2 = {
  id: 'agr-7k',
  validFromKey: '2026-10-01',
  validToKey: null as string | null,
  unitPriceCents: parseMoneyCentsString('700000'), // $7.000
  barterMultiplier: '2.5',
};

const historicalAlloc = allocateFromAgreement(agreementV1);
assert(
  moneyCentsToString(historicalAlloc.unitPriceCents) === '500000',
  'historical allocation snapshot = $5.000',
);
assert(historicalAlloc.barterMultiplier === '2', 'historical barterMultiplier = 2');
assert(
  roundBarterCreditCents(historicalAlloc.unitPriceCents, historicalAlloc.barterMultiplier) ===
    1000000n,
  'historical barter credit from snapshot $5.000 × 2',
);

const agreementsAfterReplace = [
  { ...agreementV1, validToKey: '2026-09-30' },
  agreementV2,
];

const midSep = new Date('2026-09-15T15:00:00.000Z');
const midOct = new Date('2026-10-15T15:00:00.000Z');

assert(
  resolveBenefitAgreementAtDate(agreementsAfterReplace, midSep)?.id === 'agr-5k',
  'validation in Sep still resolves to $5.000 agreement',
);
assert(
  resolveBenefitAgreementAtDate(agreementsAfterReplace, midOct)?.id === 'agr-7k',
  'validation in Oct resolves to $7.000 agreement',
);

const newAlloc = allocateFromAgreement(agreementV2);
assert(
  moneyCentsToString(newAlloc.unitPriceCents) === '700000',
  'new allocation snapshot = $7.000',
);
assert(newAlloc.barterMultiplier === '2.5', 'new barterMultiplier = 2.5');

// Retrospective mutation must NOT happen:
assert(
  moneyCentsToString(historicalAlloc.unitPriceCents) === '500000',
  'after replace, historical allocation still $5.000',
);
assert(historicalAlloc.barterMultiplier === '2', 'after replace, historical multiplier still 2');
assert(
  historicalAlloc.agreementId !== newAlloc.agreementId,
  'old and new allocations point to different agreements',
);

console.log('\nAll G5.5 agreement allocation snapshot checks passed.');
