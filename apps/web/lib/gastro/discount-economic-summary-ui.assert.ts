/**
 * G10.C4/C5 — web assertions for the per-discount economic summary UI (pure helpers + sources).
 * Run: pnpm --filter api run test:g10-discount-economic-summary-ui
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GastroDiscountEconomicSummary } from '@yo-te-invito/shared';
import { adminGastroKeys } from '../query/keys';
import {
  ECONOMIC_SUMMARY_COPY,
  describeEconomicHistoryEvent,
  eventActorLabel,
  resolveEconomicContractState,
  shouldWarnUnattributedPayments,
} from './discount-economic-summary-ui';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const webRoot = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(webRoot, rel), 'utf8');

type Summary = Pick<GastroDiscountEconomicSummary, 'discount' | 'agreement' | 'cash'>;
const base: Summary = {
  discount: { id: 'd', gastroProfileId: 'p', title: 'D', status: 'ACTIVE', visibility: 'PUBLIC', isCourtesy: false, settlementBillability: 'BILLABLE' },
  agreement: { current: null, history: [], legacyUsed: [] },
  cash: { usageCount: 0, generatedCents: '0', paidCents: '0', remainingCents: '0', remainingPrecision: 'EXACT', unattributedSettlementReceivedCents: '0' },
};

// ── Contract state ──
assert(resolveEconomicContractState(base) === 'NONE', 'contract: no CURRENT → NONE');
assert(
  resolveEconomicContractState({ ...base, discount: { ...base.discount, settlementBillability: 'FUNDED_COURTESY_NOT_BILLABLE' } }) === 'NOT_BILLABLE',
  'contract: funded courtesy → NOT_BILLABLE (no contract required)',
);
assert(
  resolveEconomicContractState({
    ...base,
    agreement: { ...base.agreement, current: { id: 'a', scope: 'DISCOUNT', unitPriceCents: '500000', currency: 'ARS', barterMultiplier: '2', validFrom: '2026-01-01', validTo: null, vigency: 'CURRENT', isOpen: true } },
  } as Summary) === 'CURRENT',
  'contract: CURRENT discount contract',
);

// ── Precision warning ──
assert(!shouldWarnUnattributedPayments(base), 'EXACT → no unattributed warning');
assert(shouldWarnUnattributedPayments({ ...base, cash: { ...base.cash, remainingPrecision: 'SETTLEMENT_LEVEL' } }), 'SETTLEMENT_LEVEL → unattributed warning');
assert(
  ECONOMIC_SUMMARY_COPY.unattributedWarning ===
    'Existen pagos del settlement sin atribución a un descuento. El pendiente mostrado no prorratea esos pagos.',
  'copy: unattributed warning text',
);
assert(ECONOMIC_SUMMARY_COPY.barterPartnerNote === 'El crédito pertenece al saldo general del local.', 'copy: barter credit belongs to the local');
assert(ECONOMIC_SUMMARY_COPY.adminTitle === 'Métricas económicas' && ECONOMIC_SUMMARY_COPY.gastroTitle === 'Contrato y liquidaciones', 'copy: section titles');

// ── Empty states (GASTRO wording) ──
assert(
  ECONOMIC_SUMMARY_COPY.noContractGastro ===
    'Este descuento todavía no tiene un contrato comercial cargado. Las validaciones no podrán liquidarse hasta que Administración lo configure.',
  'copy: GASTRO without contract',
);
assert(ECONOMIC_SUMMARY_COPY.noValidations === 'Todavía no hay validaciones para este descuento.', 'copy: no validations');
assert(ECONOMIC_SUMMARY_COPY.noSettlements === 'Todavía no hay liquidaciones asociadas a este descuento.', 'copy: no settlements');
assert(ECONOMIC_SUMMARY_COPY.noPayments === 'Todavía no hay pagos registrados para este descuento.', 'copy: no payments');

// ── History text ──
const event = {
  at: '2026-11-20T16:00:00.000Z',
  kind: 'PAYMENT_REGISTERED' as const,
  amountCents: '3000000',
  usageCount: null,
  settlementId: 's',
  periodKey: '2026-11',
  agreementId: null,
  replacedAgreementId: null,
  transferId: 't',
  reference: 'TRX-1',
  reason: null,
  effectiveDate: '2026-11-20',
};
const text = describeEconomicHistoryEvent(event, 'ARS');
assert(text.includes('ref. TRX-1') && text.includes('Noviembre 2026') && !text.includes('undefined'), 'history: payment line with reference + period');
assert(eventActorLabel(event) === null, 'history: GASTRO event has no actor');
assert(eventActorLabel({ ...event, actorLabel: 'Admin' }) === 'Admin', 'history: ADMIN event actor');
const alloc = describeEconomicHistoryEvent({ ...event, kind: 'ALLOCATED_CASH', usageCount: 10, amountCents: '5000000', reference: null }, 'ARS');
assert(alloc.startsWith('10 uso(s)'), 'history: allocation line with usage count');

// ── Query keys ──
const key = adminGastroKeys.economicSummary('p', 'd');
assert(key.join('|').includes('economic-summary') && adminGastroKeys.economicSummaries().every((k, i) => key[i] === k), 'keys: economic summary prefix invalidates every discount summary');

// ── Sources: read-only UI (G10.D owns writes), contract copy per discount ──
const view = ['DiscountEconomicSummaryView', 'DiscountEconomicContractBlock', 'DiscountEconomicFiguresBlocks', 'DiscountEconomicSettlementsTable', 'DiscountEconomicPaymentsTable', 'DiscountEconomicHistoryList']
  .map((f) => read(`components/gastro/economic-summary/${f}.tsx`))
  .join('\n');
const adminPanel = read('components/admin/gastro/AdminGastroDiscountEconomicSummaryPanel.tsx');
assert(!/Registrar pago|Revertir|useMutation/.test(view + adminPanel), 'UI: no register/reverse payment or mutation (G10.D)');
assert(!/creditConsumed/.test(view), 'UI: never shows credit consumed per discount');
assert(!/(agreement|tarifa|acuerdo) del local/i.test(view + adminPanel), 'UI: no "agreement/tarifa del local" copy');
assert(/isAdmin \? <th className="px-3 py-2">Comprobante<\/th>/.test(view), 'UI: proof column only for ADMIN payload');
assert(adminPanel.includes('#contrato-comercial'), 'ADMIN: missing contract links to the B3 contract panel');
const adminPage = read('app/(portal)/admin/gastronomicos/[profileId]/descuentos/[discountId]/page.tsx');
assert(adminPage.includes('AdminGastroDiscountEconomicSummaryPanel') && !adminPage.includes('EconomicMetricsPanel'), 'ADMIN page: G6 panel replaced by the economic summary');

console.log('\nAll G10.C economic summary UI checks passed.');
