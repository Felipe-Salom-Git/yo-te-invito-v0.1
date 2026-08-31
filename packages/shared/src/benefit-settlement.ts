/**
 * Benefit settlement domain — period keys, eligibility, status, money aggregation.
 */

import { z } from 'zod';
import {
  benefitAgreementCalendarKeyFromInstant,
  resolveBenefitAgreementAtDate,
  type BenefitAgreementLike,
  type BenefitVertical,
} from './benefit-commercial-agreements';
import { GASTRO_DISCOUNT_TIMEZONE, gastroDiscountEndOfDay, gastroDiscountStartOfDay } from './gastro-discount-expiry';
import { moneyCentsToString, parseMoneyCentsString } from './money/benefit-money';

export const BENEFIT_SETTLEMENT_PERIOD_KEY_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

export const benefitSettlementPeriodKeySchema = z
  .string()
  .regex(BENEFIT_SETTLEMENT_PERIOD_KEY_REGEX, 'periodKey must be YYYY-MM with month 01-12');

export type BenefitSettlementPeriodKey = z.infer<typeof benefitSettlementPeriodKeySchema>;

export const BENEFIT_VALIDATION_SOURCES = [
  'GASTRO_DISCOUNT_VALIDATION',
  'ACTIVITY_COUPON_VALIDATION',
] as const;
export type BenefitValidationSource = (typeof BENEFIT_VALIDATION_SOURCES)[number];

export const BENEFIT_SETTLEMENT_ALLOCATION_MODES = ['CASH', 'BARTER'] as const;
export type BenefitSettlementAllocationMode = (typeof BENEFIT_SETTLEMENT_ALLOCATION_MODES)[number];

export const BENEFIT_SETTLEMENT_STATUSES = [
  'OPEN',
  'PARTIALLY_ALLOCATED',
  'ALLOCATED',
  'CLOSED',
] as const;
export type BenefitSettlementStatus = (typeof BENEFIT_SETTLEMENT_STATUSES)[number];

/** validatedAt → YYYY-MM in Argentina calendar. */
export function getBenefitSettlementPeriodKey(
  instant: Date,
  timeZone: string = GASTRO_DISCOUNT_TIMEZONE,
): string {
  const calendarKey = benefitAgreementCalendarKeyFromInstant(instant, timeZone);
  return calendarKey.slice(0, 7);
}

export function benefitSettlementPeriodBounds(periodKey: string): { start: Date; end: Date } {
  const parsed = benefitSettlementPeriodKeySchema.safeParse(periodKey);
  if (!parsed.success) {
    throw new Error('invalid periodKey');
  }
  const [year, month] = periodKey.split('-').map((p) => parseInt(p, 10));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: gastroDiscountStartOfDay(year, month, 1),
    end: gastroDiscountEndOfDay(year, month, lastDay),
  };
}

/** Gastro: claim-based successful validation only (master QR excluded). */
export function isGastroValidationEligibleForSettlement(validation: {
  claimId: string | null;
}): boolean {
  return validation.claimId != null;
}

/** Activity: VALID result with claim only. */
export function isActivityValidationEligibleForSettlement(validation: {
  claimId: string | null;
  result: string;
}): boolean {
  return validation.claimId != null && validation.result === 'VALID';
}

export type SettlementAgreementCandidate = BenefitAgreementLike & {
  id: string;
  unitPriceCents: bigint;
  barterMultiplier: string;
  currency: string;
};

export function resolveSettlementAgreementForValidation<T extends BenefitAgreementLike>(
  agreements: T[],
  validatedAt: Date,
): T | null {
  return resolveBenefitAgreementAtDate(agreements, validatedAt);
}

export function deriveBenefitSettlementStatus(input: {
  status: BenefitSettlementStatus;
  allocatedUsageCount: number;
  pendingUsageCount: number;
}): BenefitSettlementStatus {
  if (input.status === 'CLOSED') return 'CLOSED';
  if (input.allocatedUsageCount === 0) return 'OPEN';
  if (input.pendingUsageCount === 0) return 'ALLOCATED';
  return 'PARTIALLY_ALLOCATED';
}

export function sumMoneyCentsBigInt(values: readonly bigint[]): string {
  let total = 0n;
  for (const v of values) {
    total += v;
  }
  return moneyCentsToString(total);
}

export function addMoneyCentsStrings(a: string, b: string): string {
  return moneyCentsToString(parseMoneyCentsString(a) + parseMoneyCentsString(b));
}

/** Allocation order: oldest validatedAt first, then validationId for stability. */
export function compareSettlementValidationOrder(
  a: { validatedAt: Date; validationId: string },
  b: { validatedAt: Date; validationId: string },
): number {
  const t = a.validatedAt.getTime() - b.validatedAt.getTime();
  if (t !== 0) return t;
  return a.validationId.localeCompare(b.validationId);
}

export function assertBenefitSettlementPartnerXor(
  vertical: BenefitVertical,
  gastroProfileId?: string | null,
  excursionOperatorId?: string | null,
): boolean {
  if (vertical === 'GASTRO') {
    return Boolean(gastroProfileId) && !excursionOperatorId;
  }
  return Boolean(excursionOperatorId) && !gastroProfileId;
}
