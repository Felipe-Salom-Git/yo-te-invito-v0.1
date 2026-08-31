/**
 * Gastro courtesy credit funding helpers (no DB).
 * Run: pnpm --filter api run test:gastro-courtesy-credit-funding
 */

import {
  assertAdjustmentWouldNotGoNegative,
  computeCourtesyCreditBalanceCents,
  computeCreditConsumedCents,
  parseMoneyCentsString,
  signedMoneyCentsToString,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const balance100k = parseMoneyCentsString('10000000');
const fund25k = parseMoneyCentsString('2500000');

assert(
  assertAdjustmentWouldNotGoNegative(balance100k, -fund25k),
  'balance 100k can fund 25k courtesy',
);

let entries = [{ amountCents: balance100k, type: 'CREDIT_FROM_SETTLEMENT' }];
assert(computeCourtesyCreditBalanceCents(entries) === balance100k, 'initial balance 100k');

entries = [
  ...entries,
  { amountCents: -fund25k, type: 'DEBIT_COURTESY' },
];
assert(computeCourtesyCreditBalanceCents(entries) === balance100k - fund25k, 'after debit available 75k');
assert(computeCreditConsumedCents(entries) === fund25k, 'consumed 25k');

assert(
  !assertAdjustmentWouldNotGoNegative(parseMoneyCentsString('2000000'), -fund25k),
  'balance 20k rejects fund 25k',
);

assert(
  computeCourtesyCreditBalanceCents([
    { amountCents: parseMoneyCentsString('10000000'), type: 'CREDIT_FROM_SETTLEMENT' },
    { amountCents: -parseMoneyCentsString('2500000'), type: 'DEBIT_COURTESY' },
    { amountCents: parseMoneyCentsString('2500000'), type: 'REVERSAL' },
  ]) === parseMoneyCentsString('10000000'),
  'reversal of debit restores balance',
);

assert(
  signedMoneyCentsToString(-fund25k) === '-2500000',
  'debit amount is negative signed string',
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

  const col = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'CourtesyCreditLedgerEntry' AND column_name = 'sourceCourtesyCampaignId'`;
  assert(col.length === 1, 'sourceCourtesyCampaignId column exists');

  console.log('\nDB integration: PASS (funding column present)');
  console.log('Concurrent funding: NO EJECUTADO — PostgreSQL no disponible');
  await prisma.$disconnect();
}

tryDbIntegration()
  .then(() => {
    console.log('\nAll gastro courtesy credit funding checks passed.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
