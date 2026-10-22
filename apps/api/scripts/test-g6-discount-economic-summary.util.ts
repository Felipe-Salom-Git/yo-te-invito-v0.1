/**
 * G6.2 — Economic summary aggregation from allocation snapshots (no CURRENT rewrite).
 * Run: pnpm --filter api run test:g6-discount-economic-summary
 */

import {
  moneyCentsToString,
  parseMoneyCentsString,
  sumMoneyCentsBigInt,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

type Alloc = {
  mode: 'CASH' | 'BARTER';
  agreementId: string;
  unitPriceCents: string;
  barterMultiplier: string;
  baseAmountCents: string;
  currency: string;
};

function summarize(allocations: Alloc[]) {
  const cash = allocations.filter((a) => a.mode === 'CASH');
  const barter = allocations.filter((a) => a.mode === 'BARTER');
  const segments = new Map<string, { usageCount: number; base: bigint; modes: Set<string> }>();
  for (const a of allocations) {
    const key = `${a.agreementId}:${a.unitPriceCents}:${a.barterMultiplier}`;
    let s = segments.get(key);
    if (!s) {
      s = { usageCount: 0, base: 0n, modes: new Set() };
      segments.set(key, s);
    }
    s.usageCount += 1;
    s.base += BigInt(a.baseAmountCents);
    s.modes.add(a.mode);
  }
  return {
    cashUsageCount: cash.length,
    cashBase: sumMoneyCentsBigInt(cash.map((a) => BigInt(a.baseAmountCents))),
    barterUsageCount: barter.length,
    barterBase: sumMoneyCentsBigInt(barter.map((a) => BigInt(a.baseAmountCents))),
    segmentCount: segments.size,
    segments: [...segments.entries()].map(([key, s]) => ({ key, ...s, base: moneyCentsToString(s.base) })),
  };
}

const mixed: Alloc[] = [
  {
    mode: 'CASH',
    agreementId: 'agr-5k',
    unitPriceCents: '500000',
    barterMultiplier: '2',
    baseAmountCents: '500000',
    currency: 'ARS',
  },
  {
    mode: 'CASH',
    agreementId: 'agr-5k',
    unitPriceCents: '500000',
    barterMultiplier: '2',
    baseAmountCents: '500000',
    currency: 'ARS',
  },
  {
    mode: 'BARTER',
    agreementId: 'agr-5k',
    unitPriceCents: '500000',
    barterMultiplier: '2',
    baseAmountCents: '500000',
    currency: 'ARS',
  },
  {
    mode: 'CASH',
    agreementId: 'agr-7k',
    unitPriceCents: '700000',
    barterMultiplier: '2.5',
    baseAmountCents: '700000',
    currency: 'ARS',
  },
];

const s = summarize(mixed);
assert(s.cashUsageCount === 3, 'CASH usage count');
assert(s.barterUsageCount === 1, 'BARTER usage count');
assert(s.cashBase === '1700000', 'CASH base = 500k+500k+700k');
assert(s.barterBase === '500000', 'BARTER base from snapshot');
assert(s.segmentCount === 2, 'multiple historical unit prices → 2 segments (not a fake single price)');
assert(
  parseMoneyCentsString(s.cashBase) + parseMoneyCentsString(s.barterBase) === 2200000n,
  'bases sum for check only — UI must NOT show as total cobrado',
);

console.log('\nAll G6.2 discount economic summary checks passed.');
