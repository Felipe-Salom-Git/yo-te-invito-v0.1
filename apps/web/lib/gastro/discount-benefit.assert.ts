/**
 * G11.1 — Public discount publications never show a stale "0%" / "$0" benefit.
 * Run: pnpm --filter api run test:gastro-discount-benefit-label
 */
import { formatGastroDiscountBenefit } from './discount-status-ui';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(formatGastroDiscountBenefit({ type: 'PERCENT', value: 15 }) === '15%', 'PERCENT 15 → 15%');
assert(formatGastroDiscountBenefit({ type: 'FIXED', value: 5000 }) === '$5000', 'FIXED 5000 → $5000');
assert(formatGastroDiscountBenefit({ type: 'PERCENT', value: 0 }) === null, 'PERCENT 0 → no chip (never 0%)');
assert(formatGastroDiscountBenefit({ type: 'FIXED', value: 0 }) === null, 'FIXED 0 → no chip (never $0)');
assert(formatGastroDiscountBenefit({ type: 'PERCENT', value: -5 }) === null, 'negative value → no chip');
assert(formatGastroDiscountBenefit({ type: 'PERCENT', value: Number.NaN }) === null, 'NaN → no chip');

console.log('OK: gastro discount benefit label');
