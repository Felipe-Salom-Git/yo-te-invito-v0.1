/**
 * Courtesy credit ledger helpers (no DB).
 * Run: pnpm --filter api run test:courtesy-credit-ledger
 */

import {
  assertAdjustmentWouldNotGoNegative,
  assertLedgerAmountSignForType,
  assertReversalWouldNotGoNegative,
  computeBarterCreditFromAllocation,
  computeCourtesyCreditBalanceCents,
  detectBarterCreditDrift,
  LEGACY_INT32_MAX_CENTS,
  roundBarterCreditCents,
  signedMoneyCentsToString,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(
  computeBarterCreditFromAllocation({
    baseAmountCents: 500000n,
    barterMultiplier: '2.0000',
  }) === 1000000n,
  'BARTER allocation 5k base x2 = 10k credit',
);

assert(roundBarterCreditCents(500000n, '1.5000') === 750000n, 'multiplier 1.5');
assert(roundBarterCreditCents(500000n, '2.5000') === 1250000n, 'multiplier 2.5 half-up');
assert(roundBarterCreditCents(1n, '2.5000') === 3n, 'half-up boundary on tiny cents');

const largeBase = 3_000_000_000n;
assert(
  roundBarterCreditCents(largeBase, '2') > LEGACY_INT32_MAX_CENTS,
  'large credit beyond Int32',
);

assert(assertLedgerAmountSignForType('CREDIT_FROM_SETTLEMENT', 100000n), 'credit positive');
assert(!assertLedgerAmountSignForType('CREDIT_FROM_SETTLEMENT', -100000n), 'credit cannot be negative');
assert(assertLedgerAmountSignForType('REVERSAL', -100000n), 'reversal negative');
assert(assertLedgerAmountSignForType('ADJUSTMENT', -50000n), 'adjustment can be negative');

let balance = 0n;
balance = computeCourtesyCreditBalanceCents([{ amountCents: 1000000n }]);
assert(balance === 1000000n, 'balance after +100k pesos credit');
balance = computeCourtesyCreditBalanceCents([
  { amountCents: 1000000n },
  { amountCents: 500000n },
]);
assert(balance === 1500000n, 'balance after second credit');
balance = computeCourtesyCreditBalanceCents([
  { amountCents: 1000000n },
  { amountCents: 500000n },
  { amountCents: -200000n },
]);
assert(balance === 1300000n, 'balance after -20k adjustment');

assert(assertAdjustmentWouldNotGoNegative(1300000n, -200000n), 'adjustment within balance allowed');
assert(!assertAdjustmentWouldNotGoNegative(100000n, -200000n), 'adjustment below zero rejected');
assert(assertReversalWouldNotGoNegative(1000000n, 1000000n), 'full reversal allowed');
assert(!assertReversalWouldNotGoNegative(500000n, 1000000n), 'reversal causing negative rejected');

const driftNone = detectBarterCreditDrift({
  barterAllocations: [
    {
      id: 'a1',
      mode: 'BARTER',
      baseAmountCents: 500000n,
      barterMultiplier: '2',
    },
  ],
  creditEntries: [
    {
      id: 'e1',
      type: 'CREDIT_FROM_SETTLEMENT',
      amountCents: 1000000n,
      sourceAllocationId: 'a1',
    },
  ],
});
assert(driftNone.length === 0, 'no drift when credit matches allocation');

const driftMissing = detectBarterCreditDrift({
  barterAllocations: [{ id: 'a1', mode: 'BARTER', baseAmountCents: 500000n, barterMultiplier: '2' }],
  creditEntries: [],
});
assert(
  driftMissing.some((d) => d.kind === 'ALLOCATION_WITHOUT_CREDIT'),
  'drift detects allocation without credit',
);

const driftDuplicate = detectBarterCreditDrift({
  barterAllocations: [{ id: 'a1', mode: 'BARTER', baseAmountCents: 500000n, barterMultiplier: '2' }],
  creditEntries: [
    { id: 'e1', type: 'CREDIT_FROM_SETTLEMENT', amountCents: 1000000n, sourceAllocationId: 'a1' },
    { id: 'e2', type: 'CREDIT_FROM_SETTLEMENT', amountCents: 1000000n, sourceAllocationId: 'a1' },
  ],
});
assert(driftDuplicate.some((d) => d.kind === 'DUPLICATE_CREDIT'), 'drift detects duplicate credit');

assert(
  signedMoneyCentsToString(-250000n) === '-250000',
  'signed negative amount string',
);

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

  const table = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE tablename = 'CourtesyCreditLedgerEntry'`;
  assert(table.length === 1, 'CourtesyCreditLedgerEntry table exists');

  console.log('\nDB integration: PASS (ledger table present)');
  console.log('Concurrent materialization: NO EJECUTADO — requires dedicated integration script');
  await prisma.$disconnect();
}

tryDbIntegration()
  .then(() => {
    console.log('\nAll courtesy credit ledger checks passed.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
