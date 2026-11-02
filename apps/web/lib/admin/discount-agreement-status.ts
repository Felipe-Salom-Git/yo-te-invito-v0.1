import type {
  BenefitCommercialAgreementDiscountHistoryResponse,
  BenefitCommercialAgreementDto,
} from '@yo-te-invito/shared';

/** G10.B — contract state of ONE discount, as shown in its detail. */
export type DiscountAgreementState = 'CURRENT' | 'UPCOMING' | 'EXPIRED' | 'NONE' | 'NOT_BILLABLE';

export const DISCOUNT_AGREEMENT_STATE_LABEL: Record<DiscountAgreementState, string> = {
  CURRENT: 'Vigente',
  UPCOMING: 'Próximo',
  EXPIRED: 'Vencido',
  NONE: 'Sin contrato',
  NOT_BILLABLE: 'No requiere contrato',
};

const ALERT_STATUSES = new Set(['ACTIVE', 'APPROVED']);

export function resolveDiscountAgreementState(
  data: Pick<BenefitCommercialAgreementDiscountHistoryResponse, 'billable' | 'current' | 'history'>,
): DiscountAgreementState {
  if (!data.billable) return 'NOT_BILLABLE';
  if (data.current) return 'CURRENT';
  if (data.history.some((a) => a.vigency === 'FUTURE')) return 'UPCOMING';
  if (data.history.length > 0) return 'EXPIRED';
  return 'NONE';
}

/** Never hidden: an operating, billable discount without CURRENT contract cannot be settled. */
export function shouldWarnMissingDiscountAgreement(
  data: Pick<BenefitCommercialAgreementDiscountHistoryResponse, 'billable' | 'current' | 'discountStatus'>,
): boolean {
  return data.billable && !data.current && ALERT_STATUSES.has(data.discountStatus);
}

/** Next row that can be opened: none open now and none scheduled with an open end. */
export function canCreateDiscountAgreement(history: BenefitCommercialAgreementDto[]): boolean {
  return !history.some((a) => a.isOpen);
}

/** Rows of THIS discount that can still be closed (legacy rows are never writable). */
export function isDiscountAgreementClosable(a: BenefitCommercialAgreementDto): boolean {
  return a.scope === 'DISCOUNT' && a.isOpen;
}
