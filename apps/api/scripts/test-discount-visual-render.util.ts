/**
 * Discount visual renderer bindings (no DOM).
 * Run: pnpm --filter api run test:discount-visual-render
 */

import {
  defaultDiscountVisualTemplateDesign,
  resolveDiscountVisualField,
  DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const design = defaultDiscountVisualTemplateDesign();
assert(design.qrZoneJson.w >= 0.18 && design.qrZoneJson.h >= 0.18, 'fallback has scannable QR zone');
assert(
  design.elementsJson.some((e) => e.type === 'DYNAMIC' && e.fieldKey === 'discountValue'),
  'fallback binds canonical discountValue',
);
assert(
  design.elementsJson.some((e) => e.type === 'DYNAMIC' && e.fieldKey === 'shortCode'),
  'fallback shows shortCode as dynamic field',
);

const ctx = {
  ...DISCOUNT_VISUAL_STUDIO_PREVIEW_CONTEXT,
  discountType: 'PERCENT' as const,
  discountValue: 10,
  shortCode: 'K7M428',
};
assert(resolveDiscountVisualField('discountValue', ctx) === '10%', 'render uses real 10% not free text');
assert(resolveDiscountVisualField('shortCode', ctx) === 'K7M428', 'shortCode comes from claim context');
assert(
  resolveDiscountVisualField('gastroName', { ...ctx, gastroName: 'Mi Restó' }) === 'Mi Restó',
  'gastro name from profile',
);

const payloadText = design.elementsJson.find((e) => e.type === 'TEXT')?.content ?? '';
assert(!/yti:gastro-discount/i.test(payloadText), 'fallback TEXT does not store QR payload');
assert(
  !design.elementsJson.some((e) => (e.content ?? '').includes('K7M428')),
  'template does not persist a resolved shortCode',
);

console.log('PASS: discount visual render bindings');
