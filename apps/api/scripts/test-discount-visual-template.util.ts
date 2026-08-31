/**
 * Gastro discount visual template schema + bindings.
 * Run: pnpm --filter api run test:discount-visual-template
 */

import {
  assertDiscountVisualElementsSafe,
  assertVisualQrZoneSafe,
  defaultDiscountVisualTemplateDesign,
  discountVisualPresetDesign,
  discountVisualTemplateElementSchema,
  formatDiscountVisualBenefit,
  resolveDiscountVisualField,
  upsertGastroDiscountVisualTemplateDtoSchema,
  visualElementsHitQr,
  VISUAL_TEMPLATE_DEFAULT_QR_ZONE,
  compileDiscountVisualTemplateDesign,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

const validDyn = discountVisualTemplateElementSchema.safeParse({
  id: 'v1',
  type: 'DYNAMIC',
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.08,
  zIndex: 1,
  fieldKey: 'discountValue',
});
assert(validDyn.success, 'valid DYNAMIC discountValue');

const ticketKey = discountVisualTemplateElementSchema.safeParse({
  id: 'v2',
  type: 'DYNAMIC',
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.08,
  zIndex: 1,
  fieldKey: 'holderName',
});
assert(!ticketKey.success, 'rejects ticket-only fieldKey');

const dataUrl = discountVisualTemplateElementSchema.safeParse({
  id: 'img',
  type: 'IMAGE',
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.1,
  zIndex: 1,
  imageUrl: 'data:image/png;base64,aaaa',
});
assert(!dataUrl.success, 'rejects data URL images');

const httpImg = discountVisualTemplateElementSchema.safeParse({
  id: 'img2',
  type: 'LOGO',
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.1,
  zIndex: 1,
  imageUrl: 'http://example.com/logo.png',
});
assert(!httpImg.success, 'rejects http (non-https) images');

const httpsImg = discountVisualTemplateElementSchema.safeParse({
  id: 'img3',
  type: 'LOGO',
  x: 0.1,
  y: 0.1,
  w: 0.3,
  h: 0.1,
  zIndex: 1,
  imageUrl: 'https://cdn.example.com/logo.png',
});
assert(httpsImg.success, 'allows https logo');

const qrLayer = discountVisualTemplateElementSchema.safeParse({
  id: 'qr',
  type: 'QR',
  x: 0.2,
  y: 0.5,
  w: 0.4,
  h: 0.28,
  zIndex: 1,
});
assert(!qrLayer.success, 'rejects QR as element type');

const tooMuchText = discountVisualTemplateElementSchema.safeParse({
  id: 't',
  type: 'TEXT',
  x: 0.1,
  y: 0.1,
  w: 0.8,
  h: 0.1,
  zIndex: 1,
  content: 'x'.repeat(2001),
});
assert(!tooMuchText.success, 'rejects oversized text');

const fallback = defaultDiscountVisualTemplateDesign();
const upsert = upsertGastroDiscountVisualTemplateDtoSchema.safeParse(fallback);
assert(upsert.success, 'fallback default template validates');

for (const id of ['classic', 'minimal', 'premium', 'promo'] as const) {
  const p = upsertGastroDiscountVisualTemplateDtoSchema.safeParse(discountVisualPresetDesign(id));
  assert(p.success, `preset ${id} validates`);
}

const qrErr = assertVisualQrZoneSafe({ x: 0, y: 0, w: 0.1, h: 0.1 });
assert(qrErr != null, 'QR too small / on edge is unsafe');

assert(
  visualElementsHitQr([{ x: 0.22, y: 0.58, w: 0.5, h: 0.2 }], VISUAL_TEMPLATE_DEFAULT_QR_ZONE),
  'overlap detection works',
);

assert(
  formatDiscountVisualBenefit('PERCENT', 10) === '10%',
  'canonical PERCENT value',
);
assert(formatDiscountVisualBenefit('FIXED', 5000) === '$5000', 'canonical FIXED value');

const resolved = resolveDiscountVisualField('discountValue', {
  gastroName: 'Local',
  discountTitle: 'Promo',
  discountType: 'PERCENT',
  discountValue: 10,
});
assert(resolved === '10%', 'binding uses canonical value not free text');

const payloadText = assertDiscountVisualElementsSafe([
  {
    id: 'bad',
    type: 'TEXT',
    x: 0.1,
    y: 0.1,
    w: 0.8,
    h: 0.1,
    zIndex: 1,
    content: 'yti:gastro-discount:v1:abc:deadbeef',
  },
]);
assert(payloadText != null, 'rejects QR payload in free text');

const extraKey = upsertGastroDiscountVisualTemplateDtoSchema.safeParse({
  ...fallback,
  discountId: 'should-not-pass',
});
assert(!extraKey.success, 'strict() rejects discountId mass assignment');

const compiled = compileDiscountVisualTemplateDesign(fallback);
assert(compiled.qrZoneJson.w >= 0.18, 'compiled QR meets min size');

try {
  compileDiscountVisualTemplateDesign({
    ...fallback,
    elementsJson: [
      {
        id: 'cover',
        type: 'SHAPE',
        x: 0.22,
        y: 0.58,
        w: 0.5,
        h: 0.25,
        zIndex: 1,
      },
    ],
  });
  assert(false, 'overlap should throw');
} catch {
  assert(true, 'compile rejects QR overlap');
}

console.log('PASS: discount visual template schema');
