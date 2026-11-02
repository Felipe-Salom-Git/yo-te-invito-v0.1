import { formatManualShortCodeDisplay, normalizeManualShortCode } from '@yo-te-invito/shared';

/**
 * Display form of a gastro claim short code (`ABC123` → `ABC-123`), same as the claim email.
 * Null when the claim has no code (legacy claims).
 */
export function formatGastroClaimShortCodeDisplay(code: string | null | undefined): string | null {
  const normalized = code ? normalizeManualShortCode(code) : '';
  return normalized ? formatManualShortCodeDisplay(normalized) : null;
}
