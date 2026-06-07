import type { PublicReviewCategory } from '@yo-te-invito/shared';
import { getContentDetailHref } from '@/lib/home/contentRoutes';

/** Public detail path for a reviewed entity. */
export function getPublicReviewEntityHref(
  category: PublicReviewCategory,
  entityId: string,
  tenantId?: string,
): string {
  return getContentDetailHref({ id: entityId, category }, tenantId);
}

export const PUBLIC_REVIEW_CATEGORY_LABELS: Record<PublicReviewCategory, string> = {
  event: 'Evento',
  gastro: 'Gastronomía',
  rental: 'Equipos y rentals',
  excursion: 'Excursión',
  hotel: 'Hotel',
};
