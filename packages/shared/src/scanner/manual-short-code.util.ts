import { classifyQrScanPayload } from '../gastro-discount-qr';
import { shortTicketCode } from '../tickets/ticket-code.util';

/** Alphanumeric short codes (tickets: 8 chars; gastro claims: 6 chars). */
const SHORT_CODE_PATTERN = /^[A-Z0-9]{4,10}$/;

/** Trim, strip separators, uppercase — e.g. `k7m-428` → `K7M428`. */
export function normalizeManualShortCode(raw: string): string {
  return raw.trim().replace(/[-\s]/g, '').toUpperCase();
}

/** Human display with optional hyphen for 6-char gastro codes. */
export function formatManualShortCodeDisplay(normalized: string): string {
  if (normalized.length === 6) {
    return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
  }
  return normalized;
}

/** True when input looks like a manual short code (not a full QR payload). */
export function isManualShortCodeInput(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (classifyQrScanPayload(trimmed) !== 'unknown') return false;
  return SHORT_CODE_PATTERN.test(normalizeManualShortCode(trimmed));
}

/** Resolve a ticket QR payload from event-scoped tickets by short code. */
export function resolveTicketQrPayloadByShortCode(
  normalizedCode: string,
  tickets: ReadonlyArray<{ id: string; qrPayload: string }>,
): string | null {
  const matches = tickets.filter((t) => shortTicketCode(t.id) === normalizedCode);
  if (matches.length !== 1) return null;
  return matches[0]!.qrPayload;
}
