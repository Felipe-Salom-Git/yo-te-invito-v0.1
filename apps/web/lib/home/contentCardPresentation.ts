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

export const EXCURSION_CARD_CTA = 'Ver experiencia';

export function isEventContent(item: { category?: string | null }): boolean {
  const c = item.category;
  return !c || c === 'event';
}

export function isExcursionContent(item: { category?: string | null }): boolean {
  return item.category === 'excursion';
}

export function isGastroContent(item: { category?: string | null }): boolean {
  return item.category === 'gastro';
}

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

/** Event poster date block — month label + day number. */
export function getEventCardDateParts(startAt?: string | null): {
  monthLabel: string;
  dayLabel: string;
  weekdayShort?: string;
} | null {
  if (!startAt) return null;
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return null;
  return {
    monthLabel: d.toLocaleDateString('es-AR', { month: 'short' }),
    dayLabel: String(d.getDate()),
    weekdayShort: d.toLocaleDateString('es-AR', { weekday: 'short' }),
  };
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

  if (isEventContent(item)) {
    const venue = item.venueName?.trim();
    const city = item.city?.trim();
    if (venue && city && venue !== city) return `${venue} · ${city}`;
    return venue || city || '—';
  }

  return item.city?.trim() || item.venueName?.trim() || '—';
}

/** One-line excursion schedule hint for discovery cards (V3.1 Etapa 12). */
export function getExcursionCardScheduleLine(item: {
  durationText?: string | null;
  departureTime?: string | null;
  availableDaysText?: string | null;
  scheduleNotes?: string | null;
}): string | null {
  const duration = item.durationText?.trim();
  const departure = item.departureTime?.trim();
  const days = item.availableDaysText?.trim();
  if (duration && departure) return `${duration} · Salida ${departure}`;
  if (duration) return duration;
  if (departure) return `Salida ${departure}`;
  if (days) return days;
  const notes = item.scheduleNotes?.trim();
  if (notes && notes.length <= 48) return notes;
  return null;
}

/** Third metadata line on cards — operator, producer, excursion schedule hint, rental CTA. */
export function getContentCardMetaLine(item: {
  category?: string | null;
  producerName?: string | null;
  venueName?: string | null;
  summary?: string | null;
  durationText?: string | null;
  departureTime?: string | null;
  availableDaysText?: string | null;
  scheduleNotes?: string | null;
}): string | null {
  if (isRentalContent(item)) return RENTAL_CARD_CTA;

  if (isExcursionContent(item)) {
    const scheduleLine = getExcursionCardScheduleLine(item);
    if (scheduleLine) return scheduleLine;
    const operator = item.venueName?.trim() || item.producerName?.trim();
    if (operator) return operator;
    const summary = item.summary?.trim();
    if (summary && summary.length <= 48) return summary;
    return EXCURSION_CARD_CTA;
  }

  if (isGastroContent(item)) return null;

  if (isEventContent(item) && item.producerName?.trim()) {
    return item.producerName.trim();
  }

  return null;
}

/** Whether to show ticket price chip on the card. */
export function shouldShowContentCardPrice(item: {
  category?: string | null;
  fromPrice?: number | null;
}): boolean {
  if (isRentalContent(item) || isExcursionContent(item) || isGastroContent(item)) {
    return false;
  }
  return item.fromPrice != null && item.fromPrice > 0;
}

/** Whether rating chip is primary for this vertical (gastro). */
export function shouldEmphasizeCardRating(item: { category?: string | null }): boolean {
  return isGastroContent(item);
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
  if (category === 'gastro') return '🍽️';
  if (category === 'excursion') return '🏔️';
  return '🎟️';
}

/** Primary link CTA on preview modal. */
export function getContentPreviewPrimaryCta(category?: string | null): string {
  if (category === 'rental') return RENTAL_CARD_CTA;
  if (category === 'excursion') return EXCURSION_CARD_CTA;
  return 'Ver detalle';
}

/** Expanded card overlay quick CTA. */
export function getContentCardExpandedCta(category?: string | null): string {
  if (category === 'rental') return RENTAL_CARD_CTA;
  switch (category) {
    case 'gastro':
      return 'Ver local';
    case 'excursion':
      return EXCURSION_CARD_CTA;
    default:
      return 'Comprar';
  }
}
