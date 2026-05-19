/**
 * Public web URLs for referral attribution (Phase 3).
 * Sale links point to checkout with ?ref= so orders receive referralCode even without cookie.
 */

export function webAppBaseUrl(): string {
  return (process.env.WEB_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** Direct checkout URL for a referral code (primary link shared by producers/referrers). */
export function referralCheckoutUrl(
  eventId: string,
  tenantId: string,
  referralCode: string,
): string {
  const base = webAppBaseUrl();
  const q = new URLSearchParams();
  q.set('tenantId', tenantId);
  q.set('ref', referralCode);
  return `${base}/checkout/${encodeURIComponent(eventId)}?${q.toString()}`;
}
