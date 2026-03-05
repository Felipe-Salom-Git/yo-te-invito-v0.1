/**
 * Read the yti_ref referral cookie.
 * Use this when creating orders to pass referralCode.
 */
export function getReferralCode(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/yti_ref=([^;]+)/);
  return match ? decodeURIComponent(match[1]!.trim()) : null;
}
