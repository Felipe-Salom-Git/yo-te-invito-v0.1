import {
  buildSettlementDetailHref,
  parseSettlementDetailFromDiscountId,
  buildDiscountSettlementHref,
  buildSettlementGenerateBody,
  parseSettlementGenerateContext,
  resolveGeneratePartnerOptions,
} from './settlement-generate-context';
import { resolveSettlementPartnerOptions } from './settlement-partner-options';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const gastroRows = [
  { id: 'profile-a', displayName: 'Local A' },
  { id: 'profile-b', displayName: 'Local B' },
];

// Discount A belongs to Profile A → click «Liquidar»
const href = buildDiscountSettlementHref({ gastroProfileId: 'profile-a', discountId: 'discount-a' });
const ctx = parseSettlementGenerateContext(new URL(href, 'https://x.test').searchParams);

assert(ctx.open, 'generate panel opens');
assert(ctx.vertical === 'GASTRO', 'vertical GASTRO');
assert(ctx.partnerId === 'profile-a', 'partner A preselected');
assert(ctx.locked, 'vertical/partner readonly from discount');
assert(ctx.fromDiscountId === 'discount-a', 'discount kept as navigation context');

const options = resolveGeneratePartnerOptions(
  resolveSettlementPartnerOptions(ctx.vertical, gastroRows, []),
  ctx,
);
assert(options.length === 1 && options[0]?.id === 'profile-a', 'only partner A offered');
assert(!options.some((o) => o.id === 'profile-b'), 'no partner B');

// Body = partner + period only (no Settlement → Discount relation)
const body = buildSettlementGenerateBody(ctx.vertical, ctx.partnerId, '2026-10');
assert(
  JSON.stringify(body) ===
    JSON.stringify({ vertical: 'GASTRO', periodKey: '2026-10', gastroProfileId: 'profile-a' }),
  'generate body is partner + period',
);
assert(!('discountId' in body) && !('fromDiscountId' in body), 'discount never sent to settlement');

// General flow unchanged: manual partner selection
const general = parseSettlementGenerateContext(new URLSearchParams(''));
assert(!general.open && !general.locked && general.partnerId === '', 'general flow not preselected');
assert(
  resolveGeneratePartnerOptions(resolveSettlementPartnerOptions('GASTRO', gastroRows, []), general)
    .length === 2,
  'general flow lists all partners',
);

// Partner filter params without discount context do not lock the form
const filterOnly = parseSettlementGenerateContext(
  new URLSearchParams('vertical=GASTRO&partnerId=profile-b'),
);
assert(!filterOnly.locked && filterOnly.partnerId === '', 'list filters alone do not lock generate');

// Unknown partner (e.g. not in active catalog) still stays scoped to the discount's own profile
const missing = resolveGeneratePartnerOptions([], { locked: true, partnerId: 'profile-a' });
assert(missing.length === 1 && missing[0]?.id === 'profile-a', 'fallback keeps own partner');

const activity = buildSettlementGenerateBody('ACTIVITY', 'op-1', '2026-10');
assert('excursionOperatorId' in activity && !('gastroProfileId' in activity), 'activity body xor');

// G7.12.10 — context reaches the detail as focus only
const detailHref = buildSettlementDetailHref('set-1', ctx.fromDiscountId);
assert(detailHref === '/admin/liquidaciones/set-1?fromDiscountId=discount-a', 'detail keeps discount context');
assert(buildSettlementDetailHref('set-1', null) === '/admin/liquidaciones/set-1', 'general detail href');
assert(
  parseSettlementDetailFromDiscountId(new URL(detailHref, 'https://x.test').searchParams) === 'discount-a',
  'detail parses focus discount',
);
assert(parseSettlementDetailFromDiscountId(new URLSearchParams('')) === null, 'no focus by default');

console.log('OK: contextual settlement from discount (GASTRO + own partner, partner+period body)');
