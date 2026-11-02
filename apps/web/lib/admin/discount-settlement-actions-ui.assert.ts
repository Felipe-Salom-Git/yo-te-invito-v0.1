/**
 * G10.D3–D5 — web assertions for discount CASH / CANJE assignment, payments and settlement attribution.
 * Run: pnpm --filter api run test:g10-discount-settlement-actions-ui
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GastroDiscountPendingValidation } from '@yo-te-invito/shared';
import { adminGastroKeys } from '../query/keys';
import {
  BLOCKED_REASON_LABEL,
  SETTLE_VALIDATIONS_COPY,
  buildDiscountAssignmentRequest,
  groupPendingByPeriod,
  previewSelection,
  selectableIds,
} from './discount-settlement-actions-ui';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const webRoot = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(webRoot, rel), 'utf8');

const row = (id: string, over: Partial<GastroDiscountPendingValidation> = {}): GastroDiscountPendingValidation => ({
  validationId: id,
  validatedAt: '2026-11-02T15:00:00.000Z',
  periodKey: '2026-11',
  pricingStatus: 'PRICED',
  agreementId: 'ag',
  unitPriceCents: '500000',
  barterMultiplier: '2',
  currency: 'ARS',
  claimShortCode: 'ABCD',
  claimEmail: 'u@test',
  settlementId: 's11',
  settlementStatus: 'OPEN',
  allocatable: true,
  blockedReason: null,
  ...over,
});
const missing = { pricingStatus: 'MISSING_AGREEMENT' as const, agreementId: null, unitPriceCents: null, barterMultiplier: null, currency: null, allocatable: false, blockedReason: 'MISSING_AGREEMENT' as const };

// ── D3 — grouping and explicit selection ──
const rows = [
  row('a1'),
  row('a2'),
  row('m1', missing),
  row('o1', { periodKey: '2026-10', settlementId: null, settlementStatus: null }),
];
const groups = groupPendingByPeriod(rows);
assert(groups.length === 2 && groups[0]!.periodKey === '2026-11' && groups[1]!.periodKey === '2026-10', 'groups: one per period, newest first');
const nov = groups[0]!;
assert(nov.rows.length === 3 && nov.allocatableCount === 2, 'groups: MISSING_AGREEMENT row kept visible (not hidden), not counted as allocatable');
assert(selectableIds(nov).join(',') === 'a1,a2', 'selection: only priced rows selectable (missing disabled)');
assert(BLOCKED_REASON_LABEL.MISSING_AGREEMENT === 'Sin contrato vigente para la fecha de validación', 'copy: missing agreement');

const selected = new Set(['a1', 'm1', 'o1']);
const cashReq = buildDiscountAssignmentRequest(nov, selected, 'CASH', 'disc-A');
assert(cashReq?.settlementId === 's11' && cashReq.periodKey === '2026-11', 'CASH: targets the period settlement');
assert(JSON.stringify(cashReq?.body) === JSON.stringify({ mode: 'CASH', validationIds: ['a1'], gastroDiscountId: 'disc-A' }), 'CASH: explicit validationIds of THIS period only (missing + other period dropped), discount-scoped');
assert(!('count' in (cashReq?.body ?? {})), 'CASH: never uses count');
const barterReq = buildDiscountAssignmentRequest(nov, new Set(['a1', 'a2']), 'BARTER', 'disc-A');
assert(barterReq?.body.mode === 'BARTER' && barterReq.body.validationIds?.length === 2, 'CANJE: allocation mode BARTER with explicit ids');
const oct = groups[1]!;
assert(buildDiscountAssignmentRequest(oct, new Set(['o1']), 'CASH', 'disc-A')?.settlementId === null, 'no settlement yet → null (generate before allocate)');
assert(buildDiscountAssignmentRequest(nov, new Set(['m1']), 'CASH', 'disc-A') === null, 'only blocked rows selected → no request');

const cashPreview = previewSelection(nov, new Set(['a1', 'a2', 'm1']), 'CASH');
assert(cashPreview.count === 2 && cashPreview.baseCents === '1000000' && cashPreview.creditCents === null, 'preview CASH: base only');
const barterPreview = previewSelection(nov, new Set(['a1', 'a2']), 'BARTER');
assert(barterPreview.baseCents === '1000000' && barterPreview.creditCents === '2000000', 'preview CANJE: base × multiplier');

const key = adminGastroKeys.discountPendingValidations('p', 'd');
assert(adminGastroKeys.discountPendingValidationsAll().every((k, i) => key[i] === k), 'keys: pending list prefix invalidates every discount');

// ── D3 sources ──
const hooks = read('lib/query/gastro-discount-settlement-actions.ts');
assert(hooks.includes('adminBenefitSettlements.generate') && hooks.indexOf('generate') < hooks.indexOf('allocate(settlementId'), 'hooks: generate settlement if needed, then allocate');
assert(hooks.includes('economicSummaries()') && hooks.includes('adminBenefitSettlementsKeys.all'), 'hooks: refresh economic summary + settlement views');
assert(!/count\s*:/.test(hooks), 'hooks: no count-based allocation from the discount UI');
const section = read('components/admin/gastro/AdminDiscountSettleValidationsSection.tsx');
const table = read('components/admin/gastro/AdminDiscountPendingPeriodTable.tsx');
const assignModal = read('components/admin/gastro/AdminDiscountAssignModal.tsx');
assert(section.includes('!query.data.billable') && section.includes('fundedCourtesy'), 'funded courtesy: no CASH / CANJE actions');
assert(table.includes('disabled={disabled || !row.allocatable}') && table.includes('BLOCKED_REASON_LABEL'), 'table: blocked rows disabled with reason');
assert(table.includes('assignCash') && table.includes('assignBarter'), 'table: «Asignar a CASH» / «Asignar a CANJE»');
assert(assignModal.includes('liquidateAs') && assignModal.includes('type="radio"'), 'modal: «Liquidar como: CASH / CANJE»');
assert(SETTLE_VALIDATIONS_COPY.barterOption.includes('No es una transferencia'), 'copy: CANJE is not a payment');
assert(!/window\.(confirm|prompt)/.test(section + table + assignModal), 'D3: no window.confirm / window.prompt');
const settlementHooks = read('lib/query/benefit-settlements.ts');
assert(settlementHooks.includes('economicSummaries()'), 'settlement page mutations also refresh discount summaries');

console.log('\nAll G10.D discount settlement action UI checks passed.');
