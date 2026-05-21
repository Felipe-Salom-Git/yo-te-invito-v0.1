import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import type { EventSummary } from '@/repositories/interfaces';

export const CATEGORY_CAROUSEL_LIMIT = 12;

export const FEATURED_SECTION = {
  title: 'Destacados',
  subtitle: 'Lo mejor de la categoría',
} as const;

export const RECOMMENDED_SECTION = {
  title: 'Más recomendados',
  subtitle: 'Mayor confianza según valoraciones verificadas',
} as const;

export const TOP_RATED_SECTION = {
  title: 'Mejor puntuados',
  subtitle: 'Promedio más alto con suficientes reseñas',
} as const;

export const EVENT_FEATURED_SECTION = {
  title: 'Destacados',
  subtitle: 'Eventos con ticketera — comprá entradas en la plataforma',
} as const;

export const RECENT_SECTION = {
  title: 'Recientes',
  subtitle: 'Últimos agregados',
} as const;

/**
 * Client-side fallback when API omits `createdAt` on list items.
 * TODO(api): remove once all list endpoints always return createdAt.
 */
export function sortRecentItems(items: EventSummary[]): EventSummary[] {
  const withCreated = items.filter((e) => e.createdAt);
  if (withCreated.length > 0) {
    return [...withCreated].sort(
      (a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime(),
    );
  }
  return [...items].sort(
    (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
  );
}

/**
 * Client-side fallback for featured when rating fields are missing.
 * TODO(api): prefer sort=featured_rating / featured_event on GET /public/events.
 */
export function sortFeaturedFallback(
  category: CategoryGatewayId,
  items: EventSummary[],
): EventSummary[] {
  if (category === 'event') {
    return [...items].sort((a, b) => {
      const tickA = a.isTicketingEnabled ? 1 : 0;
      const tickB = b.isTicketingEnabled ? 1 : 0;
      if (tickB !== tickA) return tickB - tickA;
      const rA = a.ratingAvg ?? 0;
      const rB = b.ratingAvg ?? 0;
      if (rB !== rA) return rB - rA;
      const cA = a.ratingCount ?? 0;
      const cB = b.ratingCount ?? 0;
      if (cB !== cA) return cB - cA;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  }
  return [...items].sort((a, b) => {
    const rA = a.ratingAvg ?? 0;
    const rB = b.ratingAvg ?? 0;
    if (rB !== rA) return rB - rA;
    const cA = a.ratingCount ?? 0;
    const cB = b.ratingCount ?? 0;
    if (cB !== cA) return cB - cA;
    return new Date(b.startAt).getTime() - new Date(a.startAt).getTime();
  });
}

export function featuredSortForCategory(
  category: CategoryGatewayId,
): 'featured_event' | 'featured_rating' {
  return category === 'event' ? 'featured_event' : 'featured_rating';
}

/** Ranking-based carousel for verticals with public reviews */
export function recommendedSortForCategory(
  category: CategoryGatewayId,
): 'recommended' | 'featured_event' {
  return category === 'event' ? 'featured_event' : 'recommended';
}
