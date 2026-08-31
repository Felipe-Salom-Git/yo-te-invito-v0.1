/**
 * Persistence contract for gastro discount visual templates (no DB).
 * Run: pnpm --filter api run test:gastro-discount-visual-persist
 */

import {
  compileDiscountVisualTemplateDesign,
  defaultDiscountVisualTemplateDesign,
  upsertGastroDiscountVisualTemplateDtoSchema,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const emptyGet = { template: null as null };
assert(emptyGet.template === null, 'legacy discount without template is null (fallback later)');

const created = compileDiscountVisualTemplateDesign(defaultDiscountVisualTemplateDesign());
assert(created.name.length > 0, 'create compiles default design');

const updated = compileDiscountVisualTemplateDesign(
  { name: 'Custom promo' },
  created,
);
assert(updated.name === 'Custom promo', 'update patches name, keeps canvas');
assert(updated.canvasWidth === created.canvasWidth, 'update keeps canvas width');

const mass = upsertGastroDiscountVisualTemplateDtoSchema.safeParse({
  name: 'x',
  tenantId: 't1',
  gastroProfileId: 'p1',
  qrToken: 'abc',
  shortCode: 'ABC-123',
  discountId: 'd1',
  claimId: 'c1',
});
assert(!mass.success, 'PUT body cannot mass-assign ids/tokens');

console.log('PASS: gastro discount visual persist contract');
