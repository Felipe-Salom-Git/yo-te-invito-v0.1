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
  mapDiscountVisualTemplateRow,
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

function withoutField(
  design: ReturnType<typeof defaultDiscountVisualTemplateDesign>,
  key: 'discountValue' | 'shortCode' | 'discountTitle',
) {
  return {
    ...design,
    elementsJson: design.elementsJson.filter((e) => e.fieldKey !== key),
  };
}

try {
  compileDiscountVisualTemplateDesign(withoutField(fallback, 'discountValue'));
  assert(false, 'missing discountValue should throw');
} catch {
  assert(true, 'template without discountValue rejected');
}

try {
  compileDiscountVisualTemplateDesign(withoutField(fallback, 'shortCode'));
  assert(false, 'missing shortCode should throw');
} catch {
  assert(true, 'template without shortCode rejected');
}

try {
  compileDiscountVisualTemplateDesign(withoutField(fallback, 'discountTitle'));
  assert(false, 'missing discountTitle should throw');
} catch {
  assert(true, 'template without discountTitle rejected');
}

try {
  compileDiscountVisualTemplateDesign({
    ...fallback,
    qrZoneJson: { x: 0.4, y: 0.4, w: 0.14, h: 0.14 },
  });
  assert(false, 'tiny QR should throw');
} catch {
  assert(true, 'template without scannable QR rejected');
}

const freeTextOk = compileDiscountVisualTemplateDesign({
  ...fallback,
  elementsJson: [
    ...fallback.elementsJson,
    {
      id: 't-cta',
      type: 'TEXT',
      x: 0.08,
      y: 0.48,
      w: 0.84,
      h: 0.06,
      zIndex: 8,
      content: '¡Te esperamos!',
      style: { fontSize: 12, color: '#a3a3a3', textAlign: 'center' },
    },
  ],
});
assert(freeTextOk.elementsJson.some((e) => e.content === '¡Te esperamos!'), 'free text + canonical PASS');

const fakeCode = fallback.elementsJson.map((e) =>
  e.fieldKey === 'shortCode' ? { ...e, content: 'FAKE-999' } : e,
);
const compiledFake = compileDiscountVisualTemplateDesign({ ...fallback, elementsJson: fakeCode });
assert(
  compiledFake.elementsJson.every((e) => e.fieldKey !== 'shortCode' || !e.content),
  'compile strips unused content on DYNAMIC (shortCode not persistable as text)',
);
assert(
  resolveDiscountVisualField('shortCode', {
    gastroName: 'Local',
    discountTitle: 'Promo',
    discountType: 'PERCENT',
    discountValue: 10,
    shortCode: 'K7M428',
  }) === 'K7M428',
  'shortCode always from claim context, not template content',
);

const payloadOverride = upsertGastroDiscountVisualTemplateDtoSchema.safeParse({
  ...fallback,
  qrPayload: 'yti:gastro-discount:v1:x:token',
  shortCode: 'OVERRIDE',
});
assert(!payloadOverride.success, 'template cannot represent QR payload or shortCode override');

for (const id of ['classic', 'minimal', 'premium', 'promo'] as const) {
  compileDiscountVisualTemplateDesign(discountVisualPresetDesign(id));
  assert(true, `preset ${id} compiles with required canonical fields`);
}

try {
  compileDiscountVisualTemplateDesign({
    ...fallback,
    elementsJson: fallback.elementsJson.map((e) =>
      e.fieldKey === 'discountValue' ? { ...e, style: { ...e.style, opacity: 0 } } : e,
    ),
  });
  assert(false, 'hidden discountValue should throw');
} catch {
  assert(true, 'canonical discountValue cannot be opacity 0');
}

try {
  compileDiscountVisualTemplateDesign({
    ...fallback,
    elementsJson: [
      ...fallback.elementsJson,
      {
        id: 'cover-value',
        type: 'SHAPE',
        x: 0.08,
        y: 0.11,
        w: 0.84,
        h: 0.1,
        zIndex: 99,
      },
    ],
  });
  assert(false, 'covering discountValue should throw');
} catch {
  assert(true, 'layer covering canonical discountValue rejected');
}

const mappedOk = mapDiscountVisualTemplateRow({
  id: 'tpl1',
  tenantId: 't1',
  gastroDiscountId: 'd1',
  name: fallback.name,
  canvasWidth: fallback.canvasWidth,
  canvasHeight: fallback.canvasHeight,
  backgroundType: fallback.backgroundType,
  backgroundValue: fallback.backgroundValue,
  elementsJson: fallback.elementsJson,
  qrZoneJson: fallback.qrZoneJson,
  version: 1,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
});
assert(mappedOk != null, 'valid stored template maps');

const mappedLegacy = mapDiscountVisualTemplateRow({
  id: 'tpl2',
  tenantId: 't1',
  gastroDiscountId: 'd1',
  name: 'old',
  canvasWidth: 320,
  canvasHeight: 560,
  backgroundType: 'SOLID',
  backgroundValue: '#000',
  elementsJson: fallback.elementsJson.filter((e) => e.fieldKey !== 'discountValue'),
  qrZoneJson: fallback.qrZoneJson,
  version: 1,
  createdAt: '2026-08-31T00:00:00.000Z',
  updatedAt: '2026-08-31T00:00:00.000Z',
});
assert(mappedLegacy == null, 'legacy template without discountValue → fallback null');

console.log('PASS: discount visual template schema');
