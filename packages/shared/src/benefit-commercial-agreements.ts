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

export function classifyBenefitAgreementVigency(
  validFromKey: string,
  validToKey: string | null,
  todayKey: string,
): 'FUTURE' | 'CURRENT' | 'PAST' {
  if (todayKey < validFromKey) return 'FUTURE';
  if (validToKey != null && todayKey > validToKey) return 'PAST';
  return 'CURRENT';
}
