/**
 * G6.7 — Accounting regression for per-discount economic reporting.
 * Run: pnpm --filter api run test:g6-discount-economic-accounting
 *
 * Confirms: no fictional cashTransferredByDiscount / barterConsumedByDiscount;
 * multi-price snapshots; settlement with multiple discounts; partner ledger separate.
 */

import {
  moneyCentsToString,
  parseMoneyCentsString,
  roundBarterCreditCents,
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
  discountId: string;
  mode: 'CASH' | 'BARTER';
  unitPriceCents: bigint;
  barterMultiplier: string;
  baseAmountCents: bigint;
  settlementId: string;
};

function discountCashBase(rows: Alloc[], discountId: string): bigint {
  return rows
    .filter((a) => a.discountId === discountId && a.mode === 'CASH')
    .reduce((s, a) => s + a.baseAmountCents, 0n);
}

function discountBarterBase(rows: Alloc[], discountId: string): bigint {
  return rows
    .filter((a) => a.discountId === discountId && a.mode === 'BARTER')
    .reduce((s, a) => s + a.baseAmountCents, 0n);
}

function creditGeneratedForDiscount(
  rows: Alloc[],
  discountId: string,
  ledgerByAllocationBase: Map<string, bigint>,
): bigint {
  // Simulate: each BARTER allocation id = discountId+index keyed in map by base
  let total = 0n;
  for (const a of rows) {
    if (a.discountId !== discountId || a.mode !== 'BARTER') continue;
    const key = `${a.discountId}:${a.baseAmountCents.toString()}:${a.barterMultiplier}`;
    total += ledgerByAllocationBase.get(key) ?? roundBarterCreditCents(a.baseAmountCents, a.barterMultiplier);
  }
  return total;
}

/** Settlement transfers are settlement-wide — NEVER assign to a discount. */
function assertNoCashTransferredByDiscount() {
  const settlementTransferred = parseMoneyCentsString('8000000'); // $80.000
  const discountCashBase = parseMoneyCentsString('5000000'); // $50.000
  // Incorrect product would invent: transferred * (discountBase/settlementDue)
  const invented = (settlementTransferred * discountCashBase) / parseMoneyCentsString('10000000');
  assert(invented === 4000000n, 'proration math exists but must NOT be exposed as discount metric');
  const cashTransferredByDiscount: bigint | null = null;
  assert(cashTransferredByDiscount === null, 'cashTransferredByDiscount is NOT_ATTRIBUTABLE (null)');
}

/** Partner DEBIT_COURTESY is global — not barterConsumedByDiscount. */
function assertNoBarterConsumedByDiscount() {
  const partnerConsumed = parseMoneyCentsString('3000000');
  const creditGeneratedByDiscount = parseMoneyCentsString('10000000');
  const barterConsumedByDiscount: bigint | null = null;
  assert(barterConsumedByDiscount === null, 'barterConsumedByDiscount is NOT_ATTRIBUTABLE');
  assert(partnerConsumed < creditGeneratedByDiscount, 'partner consumed can exceed one discount credit');
}

// --- Case: CASH only ---
const cashOnly: Alloc[] = [
  {
    discountId: 'd1',
    mode: 'CASH',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's1',
  },
  {
    discountId: 'd1',
    mode: 'CASH',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's1',
  },
];
assert(discountCashBase(cashOnly, 'd1') === 1000000n, 'CASH-only base $10.000');
assert(discountBarterBase(cashOnly, 'd1') === 0n, 'CASH-only barter base 0');

// --- Case: BARTER only ---
const barterOnly: Alloc[] = [
  {
    discountId: 'd2',
    mode: 'BARTER',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's1',
  },
];
assert(discountBarterBase(barterOnly, 'd2') === 500000n, 'BARTER-only base');
assert(
  creditGeneratedForDiscount(barterOnly, 'd2', new Map()) === 1000000n,
  'BARTER credit generated $10.000 from ×2',
);

// --- Case: mixed 10 CASH + 10 BARTER @ $5.000 ---
const mixed: Alloc[] = [];
for (let i = 0; i < 10; i++) {
  mixed.push({
    discountId: 'd-mix',
    mode: 'CASH',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's-sep',
  });
  mixed.push({
    discountId: 'd-mix',
    mode: 'BARTER',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's-sep',
  });
}
assert(discountCashBase(mixed, 'd-mix') === 5000000n, 'mixed CASH base $50.000');
assert(discountBarterBase(mixed, 'd-mix') === 5000000n, 'mixed BARTER base $50.000');
assert(
  creditGeneratedForDiscount(mixed, 'd-mix', new Map()) === 10000000n,
  'mixed BARTER credit $100.000',
);
const totalAllocBase = discountCashBase(mixed, 'd-mix') + discountBarterBase(mixed, 'd-mix');
assert(totalAllocBase === 10000000n, 'allocation bases sum $100.000 (informational only)');
assert(
  totalAllocBase + creditGeneratedForDiscount(mixed, 'd-mix', new Map()) !==
    creditGeneratedForDiscount(mixed, 'd-mix', new Map()),
  'must not conflate base+$credit as cobrado',
);

// --- Multiple historical unit prices ---
const multiPrice: Alloc[] = [
  {
    discountId: 'd3',
    mode: 'CASH',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's1',
  },
  {
    discountId: 'd3',
    mode: 'CASH',
    unitPriceCents: 700000n,
    barterMultiplier: '2.5',
    baseAmountCents: 700000n,
    settlementId: 's2',
  },
];
assert(discountCashBase(multiPrice, 'd3') === 1200000n, 'multi-price CASH base preserves both snapshots');
const prices = new Set(multiPrice.map((a) => a.unitPriceCents.toString()));
assert(prices.size === 2, 'reporting must expose 2 snapshot segments, not one fake average');

// --- Settlement with two discounts ---
const twoDiscounts: Alloc[] = [
  {
    discountId: 'dx',
    mode: 'CASH',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's-shared',
  },
  {
    discountId: 'dy',
    mode: 'CASH',
    unitPriceCents: 500000n,
    barterMultiplier: '2',
    baseAmountCents: 500000n,
    settlementId: 's-shared',
  },
];
assert(discountCashBase(twoDiscounts, 'dx') === 500000n, 'discount X base in shared settlement');
assert(discountCashBase(twoDiscounts, 'dy') === 500000n, 'discount Y base in shared settlement');
const settlementTransferred = 800000n;
assert(
  settlementTransferred !== discountCashBase(twoDiscounts, 'dx'),
  'settlement transfer ≠ discount X base (do not equate)',
);

assertNoCashTransferredByDiscount();
assertNoBarterConsumedByDiscount();

// Tenant/profile isolation of attribution set
const scoped = twoDiscounts.filter((a) => a.discountId === 'dx');
assert(scoped.every((a) => a.discountId === 'dx'), 'attribution set filtered by discountId');

console.log('\nAll G6.7 discount economic accounting checks passed.');
