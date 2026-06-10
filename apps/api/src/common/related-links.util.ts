import {
  relatedLinkItemSchema,
  RELATED_LINKS_MAX,
  type RelatedLinkItem,
} from '@yo-te-invito/shared';

export function parseRelatedLinks(raw: unknown): RelatedLinkItem[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: RelatedLinkItem[] = [];
  for (const item of raw) {
    const parsed = relatedLinkItemSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
    if (out.length >= RELATED_LINKS_MAX) break;
  }
  return out.length > 0 ? out : null;
}

export function normalizeRelatedLinksForWrite(
  value: RelatedLinkItem[] | null | undefined,
): RelatedLinkItem[] | null {
  if (value == null) return null;
  const out: RelatedLinkItem[] = [];
  for (const item of value) {
    const parsed = relatedLinkItemSchema.safeParse(item);
    if (parsed.success) {
      out.push({
        ...parsed.data,
        title: parsed.data.title.trim(),
        url: parsed.data.url.trim(),
        sortOrder: parsed.data.sortOrder ?? out.length,
      });
    }
    if (out.length >= RELATED_LINKS_MAX) break;
  }
  return out.length > 0 ? out : null;
}
