/**
 * G8.7 — Unified Studio for discount + courtesy (behavioural, in-memory fake Prisma).
 *
 * One Studio, one renderer: `GastroDiscountTemplate` + `DiscountTemplateRenderer` serve PUBLIC
 * discounts and COURTESY_ONLY. A courtesy stores `value = 0`; its benefit is the campaign's
 * label, so the canonical `discountValue` binding must never render "0%" for it.
 *
 * Covers: benefit resolution (discount vs courtesy), "never 0%", shortCode + title visible,
 * individual claim QR (never the master token), template compatibility through the REAL
 * template service + `/me` + public claim view, canvas validations unchanged, and the
 * Studio route / admin route typo.
 *
 * Run: pnpm --filter api run test:gastro-courtesy-studio
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ForbiddenException } from '@nestjs/common';
import {
  DISCOUNT_VISUAL_PRESET_META,
  assertDiscountVisualCanonicalContent,
  buildGastroClaimVisualRenderContext,
  buildGastroDiscountStudioPreviewContext,
  buildGastroDiscountQrPayload,
  defaultDiscountVisualTemplateDesign,
  discountVisualPresetDesign,
  formatDiscountVisualBenefit,
  resolveCourtesyBenefitLabel,
  resolveDiscountVisualField,
  type DiscountVisualPresetId,
  type DiscountVisualRenderContext,
  type DiscountVisualTemplateElement,
} from '@yo-te-invito/shared';
import { FakeCourtesyDb, TENANT, errorOf, makeChecker, sendBody } from './lib/courtesy-fake-db';

const { check, state } = makeChecker();

/** What `DiscountTemplateRenderer` prints for every DYNAMIC layer. */
function renderedTexts(elements: DiscountVisualTemplateElement[], ctx: DiscountVisualRenderContext) {
  return elements
    .filter((e) => e.type === 'DYNAMIC' && e.fieldKey)
    .map((e) => resolveDiscountVisualField(e.fieldKey!, ctx));
}

function benefit() {
  console.log('\n=== Benefit resolution: discount vs courtesy ===\n');
  const base: DiscountVisualRenderContext = {
    gastroName: 'Local',
    discountTitle: 'Cena de cortesía',
    discountType: 'PERCENT',
    discountValue: 0,
    shortCode: 'ABC-123',
  };
  const publicCtx = { ...base, discountValue: 15 };
  check(resolveDiscountVisualField('discountValue', publicCtx) === '15%', 'discount PERCENT → formatDiscountVisualBenefit ("15%")');
  check(resolveDiscountVisualField('discountValue', { ...publicCtx, discountType: 'FIXED', discountValue: 5000 }) === '$5000', 'discount FIXED → "$5000"');
  check(
    resolveDiscountVisualField('discountValue', publicCtx) === formatDiscountVisualBenefit('PERCENT', 15),
    'public path is exactly the canonical formatter (unchanged)',
  );

  const courtesy = { ...base, visibility: 'COURTESY_ONLY', courtesyLabel: 'Postre de cortesía' };
  check(resolveDiscountVisualField('discountValue', courtesy) === 'Postre de cortesía', 'courtesy → courtesyLabel');
  check(resolveDiscountVisualField('discountValue', courtesy) !== '0%', 'courtesy never "0%"');
  check(resolveDiscountVisualField('discountValue', { ...base, courtesyLabel: '2x1 en tragos' }) === '2x1 en tragos', 'a context carrying courtesyLabel alone resolves the courtesy benefit');

  // Defence in depth: COURTESY_ONLY with a missing / zero-ish label must not print "0%".
  for (const label of [undefined, null, '', '   ', '0%', '0', '$0', ' $ 0 ']) {
    const out = resolveDiscountVisualField('discountValue', { ...base, visibility: 'COURTESY_ONLY', courtesyLabel: label });
    check(out !== '0%' && out !== '$0' && out !== '0' && out.length > 0, `COURTESY_ONLY + label ${JSON.stringify(label)} → "${out}" (never zero)`);
  }
  check(
    resolveDiscountVisualField('discountValue', { ...base, visibility: 'COURTESY_ONLY', courtesyLabel: null }) === 'Cena de cortesía',
    'missing label falls back to the title',
  );
  check(resolveCourtesyBenefitLabel(null, null) === 'Cortesía', 'last resort is a neutral "Cortesía"');
  check(
    resolveCourtesyBenefitLabel({ discountLabel: '0%', title: 'Cena para dos' }) === 'Cena para dos',
    'zero label skipped in favour of the campaign title',
  );
}

function builders() {
  console.log('\n=== Render context builders (claim + Studio preview) ===\n');
  const courtesyClaim = buildGastroClaimVisualRenderContext({
    locationName: 'Local A',
    title: 'Cena',
    claimType: 'COURTESY',
    discountType: 'PERCENT',
    discountValue: 0,
    discountLabel: '20% en cena',
    shortCode: 'K7M-428',
  });
  check(resolveDiscountVisualField('discountValue', courtesyClaim) === '20% en cena', 'courtesy claim ctx → campaign label');
  check(resolveDiscountVisualField('shortCode', courtesyClaim) === 'K7M-428', 'courtesy claim ctx → shortCode');
  check(resolveDiscountVisualField('discountTitle', courtesyClaim) === 'Cena', 'courtesy claim ctx → title');

  const publicClaim = buildGastroClaimVisualRenderContext({
    locationName: 'Local A',
    title: 'Promo',
    claimType: 'PUBLIC_REQUEST',
    discountType: 'PERCENT',
    discountValue: 10,
    discountLabel: null,
    shortCode: 'AAA-111',
  });
  check(resolveDiscountVisualField('discountValue', publicClaim) === '10%', 'public claim ctx → formatted value');
  const strayLabel = buildGastroClaimVisualRenderContext({
    locationName: 'L',
    title: 'T',
    claimType: 'PUBLIC_REQUEST',
    discountType: 'FIXED',
    discountValue: 300,
    discountLabel: 'ignored for non-courtesy',
  });
  check(resolveDiscountVisualField('discountValue', strayLabel) === '$300', 'a non-courtesy claim ignores any campaign label');

  const studioCourtesy = buildGastroDiscountStudioPreviewContext({
    gastroProfileName: 'Local A',
    title: 'Cena de cortesía',
    type: 'PERCENT',
    value: 0,
    visibility: 'COURTESY_ONLY',
    courtesyCampaign: { discountLabel: 'Postre de cortesía', title: 'Cena de cortesía' },
  });
  check(resolveDiscountVisualField('discountValue', studioCourtesy) === 'Postre de cortesía', 'Studio preview of a courtesy shows its label, not 0%');
  check(resolveDiscountVisualField('shortCode', studioCourtesy) === 'ABC-123', 'Studio preview shows the placeholder shortCode');
  const studioPublic = buildGastroDiscountStudioPreviewContext({
    title: 'Promo',
    type: 'FIXED',
    value: 2500,
    visibility: 'PUBLIC',
  });
  check(resolveDiscountVisualField('discountValue', studioPublic) === '$2500', 'Studio preview of a public discount unchanged');
  const studioNone = buildGastroDiscountStudioPreviewContext(undefined);
  check(resolveDiscountVisualField('discountValue', studioNone) === '20%', 'Studio preview while loading keeps the sample');
}

function canvasValidations() {
  console.log('\n=== Canvas validations are the same for both (not weakened) ===\n');
  const base = defaultDiscountVisualTemplateDesign();
  check(assertDiscountVisualCanonicalContent(base.elementsJson, base.qrZoneJson) === null, 'default design valid');
  for (const p of DISCOUNT_VISUAL_PRESET_META) {
    const d = discountVisualPresetDesign(p.id as DiscountVisualPresetId);
    check(assertDiscountVisualCanonicalContent(d.elementsJson, d.qrZoneJson) === null, `preset ${p.id} valid (courtesy and discount share presets)`);
    const ctx = buildGastroClaimVisualRenderContext({
      locationName: 'L',
      title: 'Cena',
      claimType: 'COURTESY',
      discountValue: 0,
      discountLabel: 'Postre',
      shortCode: 'ABC-123',
    });
    const texts = renderedTexts(d.elementsJson, ctx);
    check(texts.includes('Postre') && !texts.includes('0%'), `preset ${p.id}: courtesy renders benefit, never 0%`);
    check(texts.includes('ABC-123') || !d.elementsJson.some((e) => e.fieldKey === 'shortCode'), `preset ${p.id}: shortCode visible`);
  }
  const noBenefit = base.elementsJson.filter((e) => e.fieldKey !== 'discountValue');
  check(assertDiscountVisualCanonicalContent(noBenefit, base.qrZoneJson) !== null, 'benefit layer still mandatory');
  const noCode = base.elementsJson.filter((e) => e.fieldKey !== 'shortCode');
  check(assertDiscountVisualCanonicalContent(noCode, base.qrZoneJson) !== null, 'shortCode layer still mandatory');
  const noTitle = base.elementsJson.filter((e) => e.fieldKey !== 'discountTitle');
  check(assertDiscountVisualCanonicalContent(noTitle, base.qrZoneJson) !== null, 'title layer still mandatory');
  const tiny = base.elementsJson.map((e) => (e.fieldKey === 'discountValue' ? { ...e, w: 0.05 } : e));
  check(assertDiscountVisualCanonicalContent(tiny, base.qrZoneJson) !== null, 'min size still enforced');
  const faint = base.elementsJson.map((e) => (e.fieldKey === 'discountValue' ? { ...e, style: { ...e.style, opacity: 0.2 } } : e));
  check(assertDiscountVisualCanonicalContent(faint, base.qrZoneJson) !== null, 'min opacity still enforced');
  const offscreen = base.elementsJson.map((e) => (e.fieldKey === 'shortCode' ? { ...e, x: 0.99, y: 0.99 } : e));
  check(assertDiscountVisualCanonicalContent(offscreen, base.qrZoneJson) !== null, 'bounds still enforced');
}

async function courtesyThroughServices() {
  console.log('\n=== Courtesy: template service + /me + claim view (same template, claim QR) ===\n');
  const db = new FakeCourtesyDb();
  db.addProfile('prof-a');
  db.addProfile('prof-b');
  db.addOwner('owner-a', 'prof-a');
  db.addOwner('owner-b', 'prof-b');
  db.agreements.add('prof-a');
  db.addUser('u-a', 'a@example.com');
  const svc = db.build();
  const tpl = db.buildTemplateService();

  await svc.courtesy.sendCourtesy(TENANT, 'owner-a', 'GASTRO_OWNER', sendBody({ discountLabel: 'Postre de cortesía' }));
  const d = db.discounts[0]!;
  check(d.visibility === 'COURTESY_ONLY' && d.value === 0 && d.qrToken === null, 'courtesy: value 0, no master QR');

  // Same editor/service as a discount: owner edits the design of the courtesy.
  const design = discountVisualPresetDesign('premium');
  const saved = await tpl.upsert(TENANT, 'owner-a', 'GASTRO_OWNER', d.id, design as never);
  check(saved.template.gastroDiscountId === d.id && db.visualTemplates.length === 1, 'courtesy accepts a visual template (same GastroDiscountTemplate)');
  check((await tpl.get(TENANT, 'owner-a', 'GASTRO_OWNER', d.id)).template?.name === 'Premium', 'template readable for the courtesy');

  // Cross-profile: another local cannot edit it.
  const other = await errorOf(() => tpl.upsert(TENANT, 'owner-b', 'GASTRO_OWNER', d.id, design as never));
  check(other instanceof ForbiddenException, 'owner of Local B cannot edit the courtesy design of Local A');
  const bad = await errorOf(() =>
    tpl.upsert(TENANT, 'owner-a', 'GASTRO_OWNER', d.id, {
      ...design,
      elementsJson: design.elementsJson.filter((e) => e.fieldKey !== 'shortCode'),
    } as never),
  );
  check(bad !== null && /código corto|shortCode/i.test(bad.message), 'canonical validation applies to courtesies too (shortCode mandatory)');
  const ok = await errorOf(() => tpl.reset(TENANT, 'owner-a', 'GASTRO_OWNER', d.id));
  check(ok === null && db.visualTemplates.length === 0, 'reset ("restablecer diseño") works for a courtesy');
  await tpl.upsert(TENANT, 'owner-a', 'GASTRO_OWNER', d.id, design as never);

  await svc.admin.approve(TENANT, 'admin', 'ADMIN', 'prof-a', d.id);
  const mine = db.claims.find((c) => c.email === 'a@example.com')!;
  const me = (await svc.me.listForUser(TENANT, 'u-a')).data[0]!;
  check(me.type === 'COURTESY' && me.visualTemplate?.id === db.visualTemplates[0]!.id, '/me: courtesy claim carries the discount template');
  check(me.qrPayload === buildGastroDiscountQrPayload(d.id, mine.qrToken) && me.qrCode === mine.qrToken, '/me: renders the INDIVIDUAL claim QR');
  check(!me.qrPayload.includes('f'.repeat(24)) && d.qrToken === null, '/me: never a discount master QR (none exists)');
  check(me.shortCode === mine.shortCode, '/me: shortCode of the claim');
  check(me.discountValue === 0 && me.discountLabel === 'Postre de cortesía', '/me: raw value 0 + campaign label available');

  const ctx = buildGastroClaimVisualRenderContext({
    locationName: me.locationName,
    title: me.discountTitle ?? '',
    claimType: me.type,
    discountType: me.discountType,
    discountValue: me.discountValue,
    discountLabel: me.discountLabel,
    shortCode: me.shortCode,
  });
  const texts = renderedTexts(me.visualTemplate!.elementsJson, ctx);
  check(texts.includes('Postre de cortesía'), 'rendered coupon shows the courtesy benefit');
  check(!texts.some((t) => /^\$?0%?$/.test(t)), 'rendered coupon never shows 0 / 0% / $0');
  check(texts.includes(mine.shortCode), 'rendered coupon shows the claim shortCode');
  check(texts.includes('Cena de cortesía'), 'rendered coupon shows the title');

  const view = await svc.publicSvc.getClaimView(TENANT, mine.id, mine.accessToken);
  check(view.qrPayload === me.qrPayload && view.shortCode === mine.shortCode, 'claim view: same individual QR + shortCode');
  check(view.visualTemplate?.id === me.visualTemplate?.id && view.discountLabel === 'Postre de cortesía', 'claim view: template + label');
  const viewCtx = buildGastroClaimVisualRenderContext({
    locationName: view.locationName,
    title: view.discountTitle,
    claimType: view.type,
    discountType: view.discountType as 'PERCENT' | 'FIXED',
    discountValue: view.discountValue,
    discountLabel: view.discountLabel,
    shortCode: view.shortCode,
  });
  check(resolveDiscountVisualField('discountValue', viewCtx) === 'Postre de cortesía', 'claim view ctx renders the label');

  // Two recipients, one template, two different QRs / shortCodes.
  const [c1, c2] = db.claims;
  check(c1!.qrToken !== c2!.qrToken && c1!.shortCode !== c2!.shortCode, 'each recipient renders its own QR + shortCode on the shared template');
}

function routes() {
  console.log('\n=== Studio route + admin route typo ===\n');
  const root = join(__dirname, '..', '..', '..');
  const adminController = readFileSync(join(root, 'apps/api/src/modules/admin/admin.controller.ts'), 'utf8');
  const repo = readFileSync(join(root, 'apps/web/repositories/ApiRepository.ts'), 'utf8');

  const adminRoutes = [...adminController.matchAll(/@(Get|Put|Post|Patch|Delete)\('(gastronomicos\/[^']*)'\)/g)].map((m) => ({
    method: m[1]!.toUpperCase(),
    path: m[2]!,
  }));
  const toRegex = (p: string) => new RegExp('^' + p.replace(/:[A-Za-z]+/g, '[^/]+') + '$');
  const hasRoute = (method: string, url: string) =>
    adminRoutes.some((r) => r.method === method && toRegex(r.path).test(url));

  // Every `/admin/gastronomicos/${profileId}/<...>` call the web makes must exist in the API.
  const calls = [
    ...repo.matchAll(/\.(get|put|post|patch|delete)(?:<[^>`]*>)?\(\s*`\/admin\/(gastronomicos\/\$\{[^}]+\}[^`]*)`/g),
  ].map((m) => ({
    method: m[1]!.toUpperCase(),
    url: m[2]!.replace(/\$\{[^}]+\}/g, 'x'),
  }));
  check(calls.length > 5, `found ${calls.length} web calls under /admin/gastronomicos`);
  const missing = calls.filter((c) => !hasRoute(c.method, c.url));
  check(missing.length === 0, `every web call under /admin/gastronomicos maps to an API route (missing: ${JSON.stringify(missing)})`);

  const studio = calls.find((c) => c.url.endsWith('/visual-template') && c.method === 'GET');
  check(!!studio && /\/descuentos\//.test(studio.url) && hasRoute('GET', studio.url), 'admin Studio GET uses canonical "descuentos" and exists in the API (was a 404)');
  check(hasRoute('PUT', 'gastronomicos/x/descuentos/y/visual-template') && hasRoute('DELETE', 'gastronomicos/x/descuentos/y/visual-template'), 'PUT/DELETE visual-template under "descuentos"');
  check(hasRoute('GET', 'gastronomicos/x/discuentos/y/visual-template'), 'legacy "discuentos" alias kept for older clients');
  check(!/\/discuentos\//.test(repo), 'web no longer calls the "discuentos" typo');
  check(hasRoute('GET', 'gastronomicos/x/descuentos/y/operational-metrics') && hasRoute('GET', 'gastronomicos/x/descuentos/y/economic-metrics'), 'metrics routes exist under "descuentos"');
  check(hasRoute('GET', 'gastronomicos/x/descuentos') && hasRoute('POST', 'gastronomicos/x/descuentos'), 'list + create under "descuentos"');

  const gastroController = readFileSync(join(root, 'apps/api/src/modules/gastro/gastro.controller.ts'), 'utf8');
  check(/@Get\('discounts\/:id\/visual-template'\)/.test(gastroController) && /@Put\('discounts\/:id\/visual-template'\)/.test(gastroController), 'portal API: GET/PUT discounts/:id/visual-template');
  check(/`\/gastro\/discounts\/\$\{encodeURIComponent\(id\)\}\/visual-template`/.test(repo), 'portal web repository targets the same path (no id-prefix mismatch)');

  const studioPage = join(root, 'apps/web/app/(portal)/gastro/descuentos/[id]/qr-studio/page.tsx');
  check(existsSync(studioPage), 'Studio page exists at /gastro/descuentos/[id]/qr-studio (discount AND courtesy)');
  const detail = readFileSync(join(root, 'apps/web/components/gastro/GastroDiscountDetailContent.tsx'), 'utf8');
  const designBtn = detail.indexOf('qrStudioHref ?');
  const courtesyGate = detail.indexOf('editHref && !isCourtesy');
  check(designBtn > -1 && /Editar diseño/.test(detail), '"Editar diseño" action present');
  check(courtesyGate > -1 && !/qrStudioHref && !isCourtesy/.test(detail), 'plain "Editar" stays hidden for courtesies but "Editar diseño" is available');
  const detailPage = readFileSync(join(root, 'apps/web/app/(portal)/gastro/descuentos/[id]/page.tsx'), 'utf8');
  check(/qrStudioHref=\{`\/gastro\/descuentos\/\$\{id\}\/qr-studio/.test(detailPage), 'detail page links to the Studio route');
}

async function main() {
  benefit();
  builders();
  canvasValidations();
  await courtesyThroughServices();
  routes();

  if (state.failures > 0) {
    console.error(`\n${state.failures} check(s) failed`);
    process.exit(1);
  }
  console.log('\nAll G8.7 courtesy studio checks passed.\n');
}

main().catch((e) => {
  console.error('UNEXPECTED:', e);
  process.exit(1);
});
