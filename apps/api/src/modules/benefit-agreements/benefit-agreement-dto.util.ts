import type { BenefitCommercialAgreement } from '@prisma/client';
import {
  benefitAgreementCalendarKeyFromInstant,
  classifyBenefitAgreementVigency,
  moneyCentsToString,
  resolveBenefitAgreementAtDate,
  resolveBenefitAgreementScope,
  type BenefitCommercialAgreementDto,
} from '@yo-te-invito/shared';

export type AgreementRow = BenefitCommercialAgreement & {
  gastroProfile?: { displayName: string } | null;
  gastroDiscount?: { displayTitle: string | null } | null;
  excursionOperator?: { name: string } | null;
};

export function todayAgreementKey(): string {
  return benefitAgreementCalendarKeyFromInstant(new Date());
}

export function agreementRowToDto(row: AgreementRow, todayKey: string): BenefitCommercialAgreementDto {
  const validFromKey = benefitAgreementCalendarKeyFromInstant(row.validFrom);
  const validToKey = row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null;
  return {
    id: row.id,
    tenantId: row.tenantId,
    vertical: row.vertical,
    gastroProfileId: row.gastroProfileId,
    gastroDiscountId: row.gastroDiscountId,
    excursionOperatorId: row.excursionOperatorId,
    scope: resolveBenefitAgreementScope(row),
    derivedFromAgreementId: row.derivedFromAgreementId,
    partnerDisplayName: row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
    discountTitle: row.gastroDiscount?.displayTitle ?? null,
    unitPriceCents: moneyCentsToString(row.unitPriceCents),
    barterMultiplier: row.barterMultiplier.toString(),
    currency: row.currency,
    validFrom: validFromKey,
    validTo: validToKey,
    vigency: classifyBenefitAgreementVigency(validFromKey, validToKey, todayKey),
    isOpen: row.validTo == null,
    notes: row.notes,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Vigency-based pick (inclusive AR calendar), never "latest created". Rows must share one scope. */
export function pickApplicableAgreement(
  rows: AgreementRow[],
  todayKey: string,
  onInstant: Date,
): BenefitCommercialAgreementDto | null {
  const likes = rows.map((row) => ({
    id: row.id,
    validFromKey: benefitAgreementCalendarKeyFromInstant(row.validFrom),
    validToKey: row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null,
  }));
  const match = resolveBenefitAgreementAtDate(likes, onInstant);
  if (!match) return null;
  const row = rows.find((r) => r.id === match.id);
  return row ? agreementRowToDto(row, todayKey) : null;
}

export function agreementAuditSnapshot(row: BenefitCommercialAgreement) {
  return {
    vertical: row.vertical,
    scope: resolveBenefitAgreementScope(row),
    gastroProfileId: row.gastroProfileId,
    gastroDiscountId: row.gastroDiscountId,
    excursionOperatorId: row.excursionOperatorId,
    unitPriceCents: moneyCentsToString(row.unitPriceCents),
    barterMultiplier: row.barterMultiplier.toString(),
    validFrom: benefitAgreementCalendarKeyFromInstant(row.validFrom),
    validTo: row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null,
  };
}

export function parseAgreementDateKey(key: string): [number, number, number] {
  const [y, m, d] = key.split('-').map((p) => parseInt(p, 10));
  return [y, m, d];
}
