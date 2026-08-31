/**
 * Benefit settlement transfer / cash collection helpers (no DB).
 * Run: pnpm --filter api run test:benefit-settlement-transfers
 */

import {
  assertTransferWouldNotOverpay,
  computeCashDueCents,
  computeCashOutstandingCents,
  computeCashReceivedCents,
  deriveCashCollectionStatus,
  LEGACY_INT32_MAX_CENTS,
  moneyCentsToString,
  parseMoneyCentsString,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const cashAllocations = [
  { mode: 'CASH', baseAmountCents: 500000n },
  { mode: 'CASH', baseAmountCents: 500000n },
  { mode: 'BARTER', baseAmountCents: 500000n },
];

assert(computeCashDueCents(cashAllocations) === 1000000n, 'cash due from CASH allocations only');
assert(
  computeCashDueCents([{ mode: 'BARTER', baseAmountCents: 999999n }]) === 0n,
  'BARTER excluded from cash due',
);

const transfersPartial = [
  { amountCents: 200000n, reversedAt: null },
  { amountCents: 100000n, reversedAt: new Date() },
];
assert(computeCashReceivedCents(transfersPartial) === 200000n, 'reversed transfer excluded');

const due = 5000000n;
let received = 0n;
assert(deriveCashCollectionStatus(due, received) === 'PENDING', 'pending when due and zero received');

received = 2000000n;
assert(
  deriveCashCollectionStatus(due, received) === 'PARTIALLY_RECEIVED',
  'partially received',
);
assert(
  computeCashOutstandingCents(due, received) === 3000000n,
  'outstanding after partial',
);

received = 5000000n;
assert(deriveCashCollectionStatus(due, received) === 'RECEIVED', 'received when equal');
assert(computeCashOutstandingCents(due, received) === 0n, 'zero outstanding when fully received');

assert(deriveCashCollectionStatus(0n, 0n) === 'NONE', 'none when no cash due');

assert(
  assertTransferWouldNotOverpay(5000000n, 4000000n, 1000000n),
  'exact outstanding transfer allowed',
);
assert(
  !assertTransferWouldNotOverpay(5000000n, 4000000n, 1000001n),
  'overpayment rejected',
);

// Multiple partial transfers → RECEIVED
{
  const due = 5000000n;
  const t1 = 2000000n;
  const t2 = 3000000n;
  let received = 0n;
  assert(assertTransferWouldNotOverpay(due, received, t1), 'first partial allowed');
  received += t1;
  assert(deriveCashCollectionStatus(due, received) === 'PARTIALLY_RECEIVED', 'after first partial');
  assert(assertTransferWouldNotOverpay(due, received, t2), 'second partial completes due');
  received += t2;
  assert(deriveCashCollectionStatus(due, received) === 'RECEIVED', 'fully received after two transfers');
  assert(computeCashOutstandingCents(due, received) === 0n, 'zero outstanding when fully paid');
}

// Reversal simulation
{
  const due = 5000000n;
  const transfers = [{ amountCents: 5000000n, reversedAt: null as Date | null }];
  assert(deriveCashCollectionStatus(due, computeCashReceivedCents(transfers)) === 'RECEIVED', 'before reverse');
  transfers[0].reversedAt = new Date();
  assert(deriveCashCollectionStatus(due, computeCashReceivedCents(transfers)) === 'PENDING', 'after reverse');
  assert(computeCashOutstandingCents(due, computeCashReceivedCents(transfers)) === due, 'outstanding back to due');
}

// CLOSED settlement does not imply RECEIVED (independent dimensions)
assert(
  deriveCashCollectionStatus(5000000n, 0n) === 'PENDING',
  'CLOSED settlement can still have PENDING cash collection',
);

const largeDue = parseMoneyCentsString('6000000000');
assert(largeDue > LEGACY_INT32_MAX_CENTS, 'large due beyond Int32');
assert(
  moneyCentsToString(largeDue - 1000000n) === '5999000000',
  'large outstanding subtraction as bigint string',
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
    SELECT tablename FROM pg_tables WHERE tablename = 'BenefitSettlementTransfer'`;
  assert(table.length === 1, 'BenefitSettlementTransfer table exists');

  console.log('\nDB integration: PASS (transfer table present)');
  console.log('Concurrency overpayment: NO EJECUTADO — requires dedicated integration script');
  await prisma.$disconnect();
}

tryDbIntegration()
  .then(() => {
    console.log('\nAll benefit settlement transfer checks passed.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
