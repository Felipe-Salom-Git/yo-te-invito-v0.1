import { BRAND_OG_IMAGE_ROUTE } from './brandAssets';

/** Default share image when a page has no custom cover (uses Next OG route, not intro splash). */
export const FALLBACK_OG_IMAGE = BRAND_OG_IMAGE_ROUTE;

export function summarize(text: unknown, maxLen = 160): string | null {
  if (typeof text !== 'string') return null;
  const cleaned = text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) : cleaned;
}

