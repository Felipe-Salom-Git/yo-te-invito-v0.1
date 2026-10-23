/**
 * G8.11 — Courtesy accounting (operator decision D1).
 *
 * EN: A courtesy funded with Courtesy Credit (a DEBIT_COURTESY ledger entry whose
 *     sourceCourtesyCampaignId is the campaign) already consumed value the partner generated
 *     before. Its validations are operational usage only: never CASH, never BARTER, never new
 *     credit. A non-funded courtesy is billable like any other claim validation.
 * ES: Una cortesía financiada con Courtesy Credit ya consumió valor generado por el partner.
 *     Sus validaciones son uso operativo, no facturable (ni CASH, ni BARTER, ni crédito nuevo).
 *     Una cortesía no financiada es facturable como cualquier validación con claim.
 *
 * Trace: validation → discount → courtesyCampaign (1:1) → courtesyCreditDebit (0..1).
 */

import { isGastroValidationEligibleForSettlement } from './benefit-settlement';

export type GastroSettlementValidationContext = {
  claimId: string | null;
  discount: {
    tenantId: string;
    gastroProfileId: string | null;
    visibility: string;
    courtesyCampaign: {
      id: string;
      courtesyCreditDebit: { id: string; type: string } | null;
    } | null;
  };
};

export const GASTRO_SETTLEMENT_INELIGIBILITY_REASONS = [
  'NO_CLAIM',
  'OUT_OF_SCOPE',
  'ALREADY_ALLOCATED',
  'FUNDED_COURTESY',
] as const;
export type GastroSettlementIneligibilityReason =
  (typeof GASTRO_SETTLEMENT_INELIGIBILITY_REASONS)[number];

export type GastroSettlementBenefitKind = 'DISCOUNT' | 'COURTESY';

export type GastroSettlementEligibility =
  | { eligible: true; kind: GastroSettlementBenefitKind }
  | { eligible: false; reason: GastroSettlementIneligibilityReason };

export function isGastroCourtesyDiscount(
  discount: Pick<GastroSettlementValidationContext['discount'], 'visibility' | 'courtesyCampaign'>,
): boolean {
  return discount.courtesyCampaign != null || discount.visibility === 'COURTESY_ONLY';
}

/** Funding is decided by the ledger debit only (not by visibility): conservative vs double monetization. */
export function isGastroCourtesyFundedByCredit(
  discount: Pick<GastroSettlementValidationContext['discount'], 'courtesyCampaign'>,
): boolean {
  return discount.courtesyCampaign?.courtesyCreditDebit?.type === 'DEBIT_COURTESY';
}

/** Canonical settlement eligibility for one Gastro validation (discovery, allocate, reporting). */
export function resolveGastroValidationSettlementEligibility(
  validation: GastroSettlementValidationContext,
  scope: { tenantId: string; gastroProfileId: string; alreadyAllocated?: boolean },
): GastroSettlementEligibility {
  if (!isGastroValidationEligibleForSettlement(validation)) {
    return { eligible: false, reason: 'NO_CLAIM' };
  }
  if (
    validation.discount.tenantId !== scope.tenantId ||
    validation.discount.gastroProfileId !== scope.gastroProfileId
  ) {
    return { eligible: false, reason: 'OUT_OF_SCOPE' };
  }
  if (scope.alreadyAllocated) {
    return { eligible: false, reason: 'ALREADY_ALLOCATED' };
  }
  if (isGastroCourtesyFundedByCredit(validation.discount)) {
    return { eligible: false, reason: 'FUNDED_COURTESY' };
  }
  return {
    eligible: true,
    kind: isGastroCourtesyDiscount(validation.discount) ? 'COURTESY' : 'DISCOUNT',
  };
}

/** Per-discount billability (G6): funded courtesy = operational usage, NOT billable usage. */
export const GASTRO_DISCOUNT_SETTLEMENT_BILLABILITIES = [
  'BILLABLE',
  'FUNDED_COURTESY_NOT_BILLABLE',
] as const;
export type GastroDiscountSettlementBillability =
  (typeof GASTRO_DISCOUNT_SETTLEMENT_BILLABILITIES)[number];

export const FUNDED_COURTESY_NOT_BILLABLE_LABEL = 'Cortesía financiada con crédito · No facturable';

export function describeFundedCourtesyUsage(count: number): string {
  return count === 1
    ? '1 uso de cortesía financiada con crédito: uso operativo, no facturable (no se asigna a CASH ni BARTER).'
    : `${count} usos de cortesías financiadas con crédito: uso operativo, no facturable (no se asignan a CASH ni BARTER).`;
}

export function resolveGastroDiscountSettlementBillability(
  discount: Pick<GastroSettlementValidationContext['discount'], 'courtesyCampaign'>,
): GastroDiscountSettlementBillability {
  return isGastroCourtesyFundedByCredit(discount) ? 'FUNDED_COURTESY_NOT_BILLABLE' : 'BILLABLE';
}
