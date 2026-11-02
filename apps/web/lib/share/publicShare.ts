/**
 * G11.2 — Cross-vertical public share (events, gastro, discounts, activities, rentals, hotels,
 * publications). Extends the G9 gastro rules: public path only, never tenantId / query /
 * portal or admin routes. Only publication anchors (`#publicacion-<id>`) may carry a hash.
 * Compartir público cross-vertical: solo ruta pública, sin tenantId ni rutas de portal/admin.
 */

export type PublicShareKind =
  | 'place'
  | 'event'
  | 'discount'
  | 'activity'
  | 'rental'
  | 'hotel'
  | 'publication'
  | 'producer';

/** Public detail routes that may be shared. */
export const PUBLIC_SHARE_PATH_PREFIXES = [
  '/gastronomicos/',
  '/restaurants/',
  '/events/',
  '/descuentos/',
  '/excursiones/',
  '/rentals/',
  '/hoteles/',
  '/producers/',
] as const;

const PUBLICATION_ANCHOR_PATTERN = /^#publicacion-[A-Za-z0-9_-]+$/;

const SHARE_INTRO: Record<PublicShareKind, string> = {
  place: 'Mirá este lugar en Yo Te Invito:',
  event: 'Mirá este evento en Yo Te Invito:',
  discount: 'Mirá este descuento en Yo Te Invito:',
  activity: 'Mirá esta actividad en Yo Te Invito:',
  rental: 'Mirá este alquiler en Yo Te Invito:',
  hotel: 'Mirá este alojamiento en Yo Te Invito:',
  publication: 'Mirá esta publicación en Yo Te Invito:',
  producer: 'Mirá esta productora en Yo Te Invito:',
};

/** Anchor id of a gastro publication inside its public ficha. */
export function buildPublicationAnchorId(contentId: string): string {
  return `publicacion-${contentId.trim()}`;
}

/**
 * Absolute share URL from a public path. Query strings (e.g. `?tenantId=`) are always dropped;
 * a hash survives only when it is a publication anchor.
 */
export function buildPublicShareUrl(origin: string, path: string): string {
  const base = origin.trim().replace(/\/+$/, '');
  const hashIndex = path.indexOf('#');
  const rawHash = hashIndex >= 0 ? path.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? path.slice(0, hashIndex) : path;
  const pathname = withoutHash.split('?')[0]!.trim();
  const hash = PUBLICATION_ANCHOR_PATTERN.test(rawHash) ? rawHash : '';
  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${base}${normalized}${hash}`;
}

/** True only for a public detail URL without query and without a non-publication hash. */
export function isPublicShareUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.search !== '') return false;
    if (parsed.hash !== '' && !PUBLICATION_ANCHOR_PATTERN.test(parsed.hash)) return false;
    const path = parsed.pathname;
    if (path.startsWith('/admin/') || path.startsWith('/gastro/') || path.startsWith('/me/')) {
      return false;
    }
    return PUBLIC_SHARE_PATH_PREFIXES.some(
      (prefix) => path.startsWith(prefix) && path.length > prefix.length,
    );
  } catch {
    return false;
  }
}

/** Share kind for a discovery content category (`event`, `gastro`, `excursion`, `rental`, `hotel`). */
export function publicShareKindForCategory(category: string | null | undefined): PublicShareKind {
  switch ((category ?? 'event').toLowerCase()) {
    case 'gastro':
      return 'place';
    case 'excursion':
      return 'activity';
    case 'rental':
      return 'rental';
    case 'hotel':
      return 'hotel';
    default:
      return 'event';
  }
}

export function buildPublicShareMessage(kind: PublicShareKind, title: string, url: string): string {
  return `${SHARE_INTRO[kind]}\n${title.trim()}\n${url}`;
}
