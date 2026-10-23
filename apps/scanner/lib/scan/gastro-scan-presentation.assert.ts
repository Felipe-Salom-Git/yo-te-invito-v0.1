/**
 * G9.7 — Scanner result copy uses real statuses and never shows courtesy as 0%.
 * Run: pnpm --filter api run test:gastro-scan-presentation
 */
import { isZeroPercentBenefit, presentGastroDiscountScan } from './gastro-scan-presentation';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

assert(isZeroPercentBenefit('0%') && isZeroPercentBenefit('0 %'), 'zero percent detected');
assert(!isZeroPercentBenefit('Café de cortesía'), 'benefit text is not a percent');

const courtesy = presentGastroDiscountScan({
  status: 'VALID',
  title: 'Café',
  message: 'Podés entregar la cortesía.',
  discount: {
    id: 'd',
    title: 'Café',
    valueLabel: '0%',
    kind: 'COURTESY',
    shortCode: 'ABC-123',
    localName: 'Bar Norte',
  },
});
assert(courtesy.tone === 'ok' && courtesy.statusLabel === 'Válido', 'VALID is Válido');
assert(courtesy.kindLabel === 'Cortesía', 'courtesy kind');
assert(courtesy.benefit === null, 'courtesy hides 0%');
assert(courtesy.shortCode === 'ABC-123' && courtesy.localName === 'Bar Norte', 'short code and local');

const used = presentGastroDiscountScan({
  status: 'ALREADY_USED',
  title: 'Ya usado',
  message: 'Este código ya se validó.',
  discount: { id: 'd', title: '20%', valueLabel: '20%', kind: 'DISCOUNT' },
});
assert(used.tone === 'warn' && used.statusLabel === 'Ya usado', 'ALREADY_USED is a warning');
assert(used.benefit === '20%', 'discount percent stays');
assert(!used.statusLabel.includes('ALREADY_USED'), 'enum stays off the label');

const invalid = presentGastroDiscountScan({
  status: 'INVALID',
  title: 'No corresponde',
  message: 'El código no es de este local.',
});
assert(invalid.tone === 'error' && invalid.statusLabel === 'Inválido', 'INVALID');
assert(invalid.benefit === null && invalid.shortCode === null, 'no benefit without a discount');

console.log('OK: gastro scan presentation');
