import {
  GASTRO_DISCOUNT_TIMEZONE,
  getGastroDiscountCalendarKey,
} from './gastro-discount-expiry';

export const EXPIRED_BENEFITS_DIGEST_KIND = 'EXPIRED_BENEFITS' as const;

/** Same IANA zone as gastro discount calendar rules. */
export const EXPIRED_BENEFITS_DIGEST_TIMEZONE = GASTRO_DISCOUNT_TIMEZONE;

export const EXPIRED_BENEFITS_DIGEST_CRON_PRODUCTION = '20 8 * * *';
export const EXPIRED_BENEFITS_DIGEST_CRON_DEVELOPMENT = '*/30 * * * *';

export function expiredBenefitsDigestKey(
  now: Date = new Date(),
  timeZone: string = EXPIRED_BENEFITS_DIGEST_TIMEZONE,
): string {
  return getGastroDiscountCalendarKey(now, timeZone);
}

export function shouldSendExpiredBenefitsDigest(input: {
  gastroExpiredCount: number;
  activityCouponExpiredCount: number;
}): boolean {
  return input.gastroExpiredCount + input.activityCouponExpiredCount > 0;
}

export function formatExpiredBenefitsDigestLines(
  titles: string[],
  limit = 12,
): { lines: string; extraCount: number } {
  const shown = titles.slice(0, limit);
  return {
    lines: shown.join('\n'),
    extraCount: Math.max(0, titles.length - shown.length),
  };
}
