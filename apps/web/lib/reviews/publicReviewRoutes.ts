import type { PublicReviewCategory } from '@yo-te-invito/shared';

const TENANT_FALLBACK = 'tenant-demo';

/** Public detail path for a reviewed entity (includes tenant query). */
export function getPublicReviewEntityHref(
  category: PublicReviewCategory,
  entityId: string,
  tenantId: string = TENANT_FALLBACK,
): string {
  const q = `?tenantId=${encodeURIComponent(tenantId)}`;
  switch (category) {
    case 'gastro':
      return `/restaurants/${entityId}${q}`;
    case 'hotel':
      return `/hoteles/${entityId}${q}`;
    case 'excursion':
      return `/excursiones/${entityId}${q}`;
    case 'rental':
      return `/rentals/${entityId}${q}`;
    case 'event':
    default:
      return `/events/${entityId}${q}`;
  }
}

export const PUBLIC_REVIEW_CATEGORY_LABELS: Record<PublicReviewCategory, string> = {
  event: 'Evento',
  gastro: 'Gastronomía',
  rental: 'Equipos y rentals',
  excursion: 'Excursión',
  hotel: 'Hotel',
};
