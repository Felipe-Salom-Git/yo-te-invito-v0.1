/**
 * Referral attribution cookie + query param ?ref= on checkout.
 */

const COOKIE_NAME = 'yti_ref';
const COOKIE_DAYS = 30;

export function setReferralCodeCookie(code: string): void {
  if (typeof document === 'undefined') return;
  const maxAge = COOKIE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(code.trim())}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/**
 * Read the yti_ref referral cookie.
 * Use when creating orders to pass referralCode (with ?ref= on checkout as primary).
 */
export function getReferralCode(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/yti_ref=([^;]+)/);
  return match ? decodeURIComponent(match[1]!.trim()) : null;
}
