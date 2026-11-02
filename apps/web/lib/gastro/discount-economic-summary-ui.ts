import {
  BENEFIT_CASH_COLLECTION_STATUS_LABEL,
  BENEFIT_SETTLEMENT_STATUS_LABEL,
  formatBenefitMoneyCents,
  formatBenefitSettlementPeriodLabel,
  type BenefitCashCollectionStatus,
  type BenefitSettlementStatus,
  type GastroDiscountEconomicHistoryKind,
  type GastroDiscountEconomicSummary,
} from '@yo-te-invito/shared';

/**
 * G10.C — copy and view-model helpers for the per-discount economic summary (pure, no React).
 * Shared by ADMIN ("Métricas económicas") and GASTRO ("Contrato y liquidaciones").
 */

export const ECONOMIC_SUMMARY_COPY = {
  adminTitle: 'Métricas económicas',
  gastroTitle: 'Contrato y liquidaciones',
  noContractAdmin: 'Sin contrato comercial vigente',
  noContractGastro:
    'Este descuento todavía no tiene un contrato comercial cargado. Las validaciones no podrán liquidarse hasta que Administración lo configure.',
  notBillable: 'Cortesía financiada con canje: sus usos no son facturables y no requiere contrato comercial.',
  noValidations: 'Todavía no hay validaciones para este descuento.',
  noSettlements: 'Todavía no hay liquidaciones asociadas a este descuento.',
  noPayments: 'Todavía no hay pagos registrados para este descuento.',
  noHistory: 'Todavía no hay movimientos económicos para este descuento.',
  unattributedWarning:
    'Existen pagos del settlement sin atribución a un descuento. El pendiente mostrado no prorratea esos pagos.',
  barterPartnerNote: 'El crédito pertenece al saldo general del local.',
  partnerBalanceLabel: 'Saldo general del local',
  cashCreditSeparation: 'CASH y crédito de canje son magnitudes separadas: nunca se suman como un total cobrado.',
} as const;

export const ECONOMIC_PRECISION_LABEL: Record<string, string> = {
  EXACT: 'Exacto',
  SETTLEMENT_LEVEL: 'Nivel liquidación',
  PARTNER_LEVEL: 'Nivel local',
  PARTNER_LEVEL_LEGACY: 'Contrato del local (legacy)',
};

export const ECONOMIC_HISTORY_KIND_LABEL: Record<GastroDiscountEconomicHistoryKind, string> = {
  AGREEMENT_CREATED: 'Contrato creado',
  AGREEMENT_CLOSED: 'Contrato cerrado',
  AGREEMENT_REPLACED: 'Contrato reemplazado',
  ALLOCATED_CASH: 'Usos asignados a CASH',
  ALLOCATED_BARTER: 'Usos asignados a canje',
  CREDIT_MATERIALIZED: 'Crédito de canje generado',
  PAYMENT_REGISTERED: 'Pago registrado',
  PAYMENT_REVERSED: 'Pago revertido',
};

export type EconomicContractState = 'CURRENT' | 'NONE' | 'NOT_BILLABLE';

export function resolveEconomicContractState(
  summary: Pick<GastroDiscountEconomicSummary, 'discount' | 'agreement'>,
): EconomicContractState {
  if (summary.discount.settlementBillability === 'FUNDED_COURTESY_NOT_BILLABLE') return 'NOT_BILLABLE';
  return summary.agreement.current ? 'CURRENT' : 'NONE';
}

export function shouldWarnUnattributedPayments(summary: Pick<GastroDiscountEconomicSummary, 'cash'>): boolean {
  return summary.cash.remainingPrecision === 'SETTLEMENT_LEVEL';
}

export function formatAgreementVigency(a: { validFrom: string; validTo: string | null }): string {
  return `${a.validFrom} → ${a.validTo ?? 'sin fecha de fin'}`;
}

export function settlementStatusLabel(status: string): string {
  return BENEFIT_SETTLEMENT_STATUS_LABEL[status as BenefitSettlementStatus] ?? status;
}

export function collectionStatusLabel(status: string): string {
  return BENEFIT_CASH_COLLECTION_STATUS_LABEL[status as BenefitCashCollectionStatus] ?? status;
}

export function periodLabel(periodKey: string | null): string {
  return periodKey ? formatBenefitSettlementPeriodLabel(periodKey) : '—';
}

type HistoryEvent = GastroDiscountEconomicSummary['history'][number];

/** One readable line per persisted fact (never invents amounts). */
export function describeEconomicHistoryEvent(event: HistoryEvent, currency: string): string {
  const money = event.amountCents ? formatBenefitMoneyCents(event.amountCents, currency) : null;
  const period = event.periodKey ? ` · ${periodLabel(event.periodKey)}` : '';
  switch (event.kind) {
    case 'AGREEMENT_CREATED':
      return `Vigente desde ${event.effectiveDate ?? '—'}`;
    case 'AGREEMENT_REPLACED':
      return `Nuevo contrato desde ${event.effectiveDate ?? '—'} (el anterior se cerró el día previo)`;
    case 'AGREEMENT_CLOSED':
      return `Vigente hasta ${event.effectiveDate ?? '—'}`;
    case 'ALLOCATED_CASH':
    case 'ALLOCATED_BARTER':
      return `${event.usageCount ?? 0} uso(s) · base ${money ?? '—'}${period}`;
    case 'CREDIT_MATERIALIZED':
      return `${money ?? '—'} al saldo general del local${period}`;
    case 'PAYMENT_REGISTERED':
      return `${money ?? '—'}${event.reference ? ` · ref. ${event.reference}` : ''}${period}`;
    case 'PAYMENT_REVERSED':
      return `${money ?? '—'}${event.reason ? ` · motivo: ${event.reason}` : ''}${period}`;
  }
}

export function eventActorLabel(event: HistoryEvent): string | null {
  return 'actorLabel' in event ? event.actorLabel : null;
}
