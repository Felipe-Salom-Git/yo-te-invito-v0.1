/**
 * Benefit commercial agreement domain helpers (timezone, overlap, historical lookup).
 */

import { GASTRO_DISCOUNT_TIMEZONE, getGastroDiscountCalendarKey } from './gastro-discount-expiry';

export const BENEFIT_VERTICALS = ['GASTRO', 'ACTIVITY'] as const;
export type BenefitVertical = (typeof BENEFIT_VERTICALS)[number];

/** validFrom and validTo are both inclusive on AR calendar dates. */
export const BENEFIT_AGREEMENT_DATE_BOUNDARY = 'inclusive-inclusive' as const;

export type BenefitAgreementDateRange = {
  validFromKey: string;
  validToKey: string | null;
};

export function benefitAgreementCalendarKeyFromInstant(
  instant: Date,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): string {
  return getGastroDiscountCalendarKey(instant, timeZone);
}

export function benefitAgreementRangesOverlap(
  aFromKey: string,
  aToKey: string | null,
  bFromKey: string,
  bToKey: string | null,
): boolean {
  const aEnd = aToKey ?? '9999-12-31';
  const bEnd = bToKey ?? '9999-12-31';
  return aFromKey <= bEnd && bFromKey <= aEnd;
}

export function isBenefitAgreementActiveOnDate(
  validFromKey: string,
  validToKey: string | null,
  onDateKey: string,
): boolean {
  if (onDateKey < validFromKey) return false;
  if (validToKey != null && onDateKey > validToKey) return false;
  return true;
}

export type BenefitAgreementLike = BenefitAgreementDateRange & { id?: string };

export function resolveBenefitAgreementAtDate<T extends BenefitAgreementLike>(
  agreements: T[],
  onInstant: Date,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): T | null {
  const onKey = benefitAgreementCalendarKeyFromInstant(onInstant, timeZone);
  const matches = agreements.filter((a) =>
    isBenefitAgreementActiveOnDate(a.validFromKey, a.validToKey, onKey),
  );
  if (matches.length === 0) return null;
  matches.sort((a, b) => b.validFromKey.localeCompare(a.validFromKey));
  return matches[0]!;
}

export function assertBenefitPartnerXor(
  vertical: BenefitVertical,
  gastroProfileId?: string | null,
  excursionOperatorId?: string | null,
): boolean {
  if (vertical === 'GASTRO') {
    return Boolean(gastroProfileId) && !excursionOperatorId;
  }
  return Boolean(excursionOperatorId) && !gastroProfileId;
}

/** Calendar day immediately before YYYY-MM-DD (AR keys, not instants). */
export function benefitAgreementPreviousCalendarDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map((p) => parseInt(p, 10));
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/**
 * G10 — agreement scope (derived, never persisted).
 * EN: DISCOUNT = GASTRO agreement of one GastroDiscount; PROFILE_LEGACY = pre-G10 GASTRO agreement of
 *     a GastroProfile (read-only history, never used for new pricing); OPERATOR = ACTIVITY agreement.
 * ES: DISCOUNT = contrato de un descuento; PROFILE_LEGACY = contrato del local previo a G10 (solo
 *     histórico, nunca se usa para pricing nuevo); OPERATOR = contrato de Actividades.
 */
export const BENEFIT_AGREEMENT_SCOPES = ['DISCOUNT', 'PROFILE_LEGACY', 'OPERATOR'] as const;
export type BenefitAgreementScope = (typeof BENEFIT_AGREEMENT_SCOPES)[number];

export type BenefitAgreementScopeFields = {
  vertical: BenefitVertical;
  gastroProfileId?: string | null;
  gastroDiscountId?: string | null;
  excursionOperatorId?: string | null;
};

export function resolveBenefitAgreementScope(row: BenefitAgreementScopeFields): BenefitAgreementScope {
  if (row.vertical === 'ACTIVITY') return 'OPERATOR';
  return row.gastroDiscountId ? 'DISCOUNT' : 'PROFILE_LEGACY';
}

export function isDiscountScopedGastroAgreement(row: BenefitAgreementScopeFields): boolean {
  return resolveBenefitAgreementScope(row) === 'DISCOUNT';
}

export function isLegacyGastroAgreement(row: BenefitAgreementScopeFields): boolean {
  return resolveBenefitAgreementScope(row) === 'PROFILE_LEGACY';
}

/** D-G10-10 — legacy profile-scoped rows cannot be closed, replaced or edited. */
export function isBenefitAgreementReadOnly(row: BenefitAgreementScopeFields): boolean {
  return isLegacyGastroAgreement(row);
}

/** Mirrors the SQL CHECKs + partner xor for any persisted row (legacy rows included). */
export function isBenefitAgreementScopeShapeValid(row: BenefitAgreementScopeFields): boolean {
  if (!assertBenefitPartnerXor(row.vertical, row.gastroProfileId, row.excursionOperatorId)) return false;
  if (row.vertical === 'ACTIVITY') return !row.gastroDiscountId;
  return true;
}

/**
 * Shape required to CREATE an agreement from G10 on: GASTRO needs profile + discount
 * (never a new legacy row); ACTIVITY keeps operator only.
 */
export function isNewBenefitAgreementScopeValid(row: BenefitAgreementScopeFields): boolean {
  if (!isBenefitAgreementScopeShapeValid(row)) return false;
  if (row.vertical === 'GASTRO') return Boolean(row.gastroDiscountId);
  return true;
}

/** Cross-table coherence (no SQL CHECK possible): agreement profile must equal discount profile. */
export function benefitAgreementMatchesDiscountProfile(
  agreementGastroProfileId: string | null | undefined,
  discountGastroProfileId: string | null | undefined,
): boolean {
  return Boolean(agreementGastroProfileId) && agreementGastroProfileId === discountGastroProfileId;
}

export function classifyBenefitAgreementVigency(
  validFromKey: string,
  validToKey: string | null,
  todayKey: string,
): 'FUTURE' | 'CURRENT' | 'PAST' {
  if (todayKey < validFromKey) return 'FUTURE';
  if (validToKey != null && todayKey > validToKey) return 'PAST';
  return 'CURRENT';
}
