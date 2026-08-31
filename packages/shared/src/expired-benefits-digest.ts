export const EXPIRED_BENEFITS_DIGEST_KIND = 'EXPIRED_BENEFITS' as const;

export function expiredBenefitsDigestKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
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
