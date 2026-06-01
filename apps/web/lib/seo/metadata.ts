export const FALLBACK_OG_IMAGE = '/brand/logo_2.png';

export function summarize(text: unknown, maxLen = 160): string | null {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

