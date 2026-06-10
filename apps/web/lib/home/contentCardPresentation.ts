import { getCategoryLabel } from '@/lib/home/contentRoutes';
import {
  formatPublicEventDate,
  shouldShowPublicEventDate,
} from '@/lib/public/publicContentDates';
import { RENTAL_PUBLIC_CTA_LOCAL } from '@/lib/rentals/publicCopy';

/** Badge on public discovery cards (not section titles). */
export const RENTAL_CARD_BADGE = 'Alquiler';

/** Secondary line / hover CTA copy for rental product cards. */
export const RENTAL_CARD_CTA = RENTAL_PUBLIC_CTA_LOCAL.replace(/\.$/, '');

export function isRentalContent(item: { category?: string | null }): boolean {
  return item.category === 'rental';
}

/** Category chip on cards and preview — rental uses short “Alquiler”. */
export function getContentCardCategoryBadge(category?: string | null): string {
  if (category === 'rental') return RENTAL_CARD_BADGE;
  return getCategoryLabel(category ?? undefined);
}

const CATEGORIES_HIDE_GENERIC_WHEN_SUBCATEGORY = new Set(['event', 'gastro', 'excursion']);

/**
 * Primary badge on discovery cards — prefers useful subcategory over generic vertical label.
 */
export function getContentCardPrimaryBadge(item: {
  category?: string | null;
  subcategoryName?: string | null;
}): string | null {
  const category = item.category ?? null;
  const subcategory = item.subcategoryName?.trim();

  if (category === 'rental') return RENTAL_CARD_BADGE;
  if (subcategory) return subcategory;
  if (category && CATEGORIES_HIDE_GENERIC_WHEN_SUBCATEGORY.has(category)) return null;
  return category ? getCategoryLabel(category) : null;
}

/** Secondary chip — rental subcategory when primary is “Alquiler”. */
export function getContentCardSecondaryBadge(item: {
  category?: string | null;
  subcategoryName?: string | null;
}): string | null {
  if (item.category !== 'rental') return null;
  return item.subcategoryName?.trim() || null;
}

/** Location line: local (venueName) first for rentals; city/venue for other categories. */
export function getContentCardLocationLine(item: {
  category?: string | null;
  city?: string | null;
  venueName?: string | null;
}): string {
  if (isRentalContent(item)) {
    const local = item.venueName?.trim();
    const city = item.city?.trim();
    if (local && city && local !== city) return `${local} · ${city}`;
    return local || city || '—';
  }
  return item.city ?? item.venueName ?? '—';
}

/** Event date on cards — only for ticketing events (`startAt`), not creation/sync dates. */
export function getContentCardDateLabel(item: {
  category?: string | null;
  startAt?: string;
}): string | null {
  if (!shouldShowPublicEventDate(item.category)) return null;
  return formatPublicEventDate(item.startAt);
}

/** Long date for preview modal meta. */
export function getContentPreviewDateLabel(item: {
  category?: string | null;
  startAt?: string;
}): string | null {
  if (!shouldShowPublicEventDate(item.category)) return null;
  if (!item.startAt) return null;
  return new Date(item.startAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getContentPreviewShortDateLabel(item: {
  category?: string | null;
  startAt?: string;
}): string | null {
  if (!shouldShowPublicEventDate(item.category)) return null;
  if (!item.startAt) return null;
  return new Date(item.startAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  });
}

/** Preview modal location — local · city for rentals. */
export function getContentPreviewLocationLabel(item: {
  category?: string | null;
  city?: string | null;
  venueName?: string | null;
}): string | null {
  const line = getContentCardLocationLine(item);
  return line === '—' ? null : line;
}

/** Empty cover placeholder — avoid ticket/hotel cues on rentals. */
export function getContentCardPlaceholderEmoji(category?: string | null): string {
  if (category === 'rental') return '⛷️';
  return '🎟️';
}

/** Primary link CTA on preview modal. */
export function getContentPreviewPrimaryCta(category?: string | null): string {
  if (category === 'rental') return RENTAL_CARD_CTA;
  return 'Ver detalle';
}

/** Expanded card overlay quick CTA. */
export function getContentCardExpandedCta(category?: string | null): string {
  if (category === 'rental') return RENTAL_CARD_CTA;
  switch (category) {
    case 'gastro':
      return 'Ver detalle';
    case 'excursion':
      return 'Explorar';
    default:
      return 'Comprar';
  }
}
