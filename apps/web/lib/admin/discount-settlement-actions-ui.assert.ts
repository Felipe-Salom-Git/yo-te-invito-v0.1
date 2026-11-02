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
  DISCOUNT_PAYMENT_COPY,
  SETTLE_VALIDATIONS_COPY,
  buildDiscountAssignmentRequest,
  buildDiscountPaymentBody,
  groupPendingByPeriod,
  parseReversalReason,
  payableSettlementOptions,
  previewSelection,
  selectableIds,
} from './discount-settlement-actions-ui';
import { describeTransferAttribution, settlementDiscountPayOptions } from './settlement-transfer-attribution-ui';

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

// ── D4 — register / reverse CASH payment ──
const line = (id: string, due: string, paid: string, outstanding: string) => ({
  settlementId: id,
  periodKey: '2026-11',
  discountCashDueCents: due,
  discountCashPaidCents: paid,
  discountCashRemainingCents: (BigInt(due) - BigInt(paid)).toString(),
  settlementCashOutstandingCents: outstanding,
});
const options = payableSettlementOptions([
  line('paid', '5000000', '5000000', '3000000'),
  line('open', '5000000', '3000000', '5000000'),
  line('capped', '3000000', '0', '500000'),
  line('barterOnly', '0', '0', '0'),
]);
assert(options.map((o) => o.settlementId).join(',') === 'open,capped', 'payable: only settlements with discount CASH due > paid');
assert(options[0]!.maxCents === '2000000' && !options[0]!.cappedBySettlement, 'payable: max = discount remaining (20.000)');
assert(options[1]!.maxCents === '500000' && options[1]!.cappedBySettlement, 'payable: max capped by settlement outstanding (legacy unattributed)');

const form = { amountCents: '2000000', date: '2026-11-25', reference: ' TRX-1 ', notes: '', proofUrl: 'https://bank.test/r.pdf' };
const okBody = buildDiscountPaymentBody(form, options[0]!, 'disc-A');
assert(okBody.ok && okBody.body.gastroDiscountId === 'disc-A' && okBody.body.amountCents === '2000000' && okBody.body.reference === 'TRX-1', 'register: body attributed to the discount');
assert(okBody.ok && okBody.body.currency === 'ARS' && okBody.body.proofUrl === 'https://bank.test/r.pdf', 'register: CASH ARS + proof URL');
assert(!buildDiscountPaymentBody({ ...form, amountCents: '2000100' }, options[0]!, 'disc-A').ok, 'register: amount over the discount balance blocked in UI');
assert(!buildDiscountPaymentBody({ ...form, amountCents: '0' }, options[0]!, 'disc-A').ok, 'register: zero amount blocked');
assert(!buildDiscountPaymentBody({ ...form, proofUrl: 'javascript:alert(1)' }, options[0]!, 'disc-A').ok, 'register: unsafe proof URL blocked');
assert(!buildDiscountPaymentBody(form, null, 'disc-A').ok, 'register: settlement required');
assert(!parseReversalReason('   ').ok && parseReversalReason(' monto erróneo ').ok, 'reversal: reason mandatory (trimmed)');

const registerModal = read('components/admin/gastro/AdminDiscountRegisterPaymentModal.tsx');
const reverseModal = read('components/admin/liquidaciones/ReverseTransferModal.tsx');
const paymentActions = read('components/admin/gastro/AdminDiscountPaymentActions.tsx');
assert(['settlementLabel', 'Monto', 'Fecha del pago', 'Referencia', 'Notas', 'Comprobante URL'].every((t) => registerModal.includes(t)), 'register modal: settlement, monto, fecha, referencia, notas, comprobante');
assert(registerModal.includes('remainingLabel') && registerModal.includes('buildDiscountPaymentBody'), 'register modal: shows discount CASH balance and validates max');
assert(!/BARTER|CANJE/.test(registerModal.replace(DISCOUNT_PAYMENT_COPY.mode, '')) && DISCOUNT_PAYMENT_COPY.mode.includes('CANJE no se paga'), 'register modal: CASH only (no «pago CANJE»)');
assert(reverseModal.includes('<textarea') && reverseModal.includes('parseReversalReason'), 'reversal modal: mandatory reason textarea');
assert(paymentActions.includes('payment.isActive ?') && paymentActions.includes('ReverseTransferModal'), 'reversal: only active payments, through the modal');
assert(!/window\.(confirm|prompt)/.test(registerModal + reverseModal + paymentActions), 'D4: no window.confirm / window.prompt');
const payHooks = read('lib/query/gastro-discount-settlement-actions.ts');
assert(/useRegisterDiscountPayment[\s\S]*invalidateDiscountEconomics/.test(payHooks) && /useReverseDiscountPayment[\s\S]*invalidateDiscountEconomics/.test(payHooks), 'register / reversal refresh economic-summary + settlement summary');

// ── D5 — settlement view attribution ──
const exact = describeTransferAttribution({ attribution: 'EXACT', discountTitle: 'Promo A', discountLocalName: 'Local A' }, 'GASTRO', 'Local A');
assert(exact.badge === 'EXACT' && exact.discountLabel === 'Promo A' && exact.localLabel === 'Local A', 'settlement: new GASTRO transfer → discount + local + EXACT');
const legacyView = describeTransferAttribution({ attribution: 'SETTLEMENT_LEVEL', discountTitle: null, discountLocalName: null }, 'GASTRO', 'Local A');
assert(legacyView.badge === 'SETTLEMENT_LEVEL' && legacyView.discountLabel === 'Pago legacy sin atribución', 'settlement: legacy transfer → «Pago legacy sin atribución» + SETTLEMENT_LEVEL');
assert(describeTransferAttribution({ attribution: 'SETTLEMENT_LEVEL', discountTitle: null, discountLocalName: null }, 'ACTIVITY', 'Op').badge === null, 'settlement: ACTIVITY transfers carry no attribution badge');
const payOptions = settlementDiscountPayOptions(
  [
    { gastroDiscountId: 'A', discountTitle: 'A', cashDueCents: '5000000', cashPaidCents: '5000000', cashRemainingCents: '0' },
    { gastroDiscountId: 'B', discountTitle: 'B', cashDueCents: '3000000', cashPaidCents: '1000000', cashRemainingCents: '2000000' },
  ],
  '500000',
);
assert(payOptions.length === 1 && payOptions[0]!.gastroDiscountId === 'B' && payOptions[0]!.maxCents === '500000' && payOptions[0]!.cappedBySettlement, 'settlement form: only discounts with CASH balance, capped by settlement outstanding');
const registerForm = read('components/admin/liquidaciones/SettlementRegisterTransferForm.tsx');
assert(registerForm.includes('gastroDiscountId: option.gastroDiscountId') && registerForm.includes('isGastro ?'), 'settlement form: GASTRO sends gastroDiscountId, ACTIVITY unchanged');
const transfersSection = read('components/admin/liquidaciones/SettlementCashTransfersSection.tsx');
const transfersTable = read('components/admin/liquidaciones/SettlementTransfersTable.tsx');
assert(transfersTable.includes('Descuento') && transfersTable.includes('Local') && transfersTable.includes('Referencia') && transfersTable.includes('Estado'), 'settlement table: Descuento, Local, Monto, Referencia, Estado');
assert(transfersSection.includes('ReverseTransferModal') && !/window\.(confirm|prompt)/.test(transfersSection + transfersTable + registerForm), 'settlement: reversal through the modal (no window.confirm / prompt)');

console.log('\nAll G10.D discount settlement action UI checks passed.');
