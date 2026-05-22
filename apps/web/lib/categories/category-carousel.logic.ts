import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { RENTAL_PUBLIC_SUBTITLE } from '@/lib/rentals/publicCopy';
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
  title: 'Destacados en Eventos',
  subtitle: 'Shows, fiestas y recitales con ticketera en la plataforma',
} as const;

export const EVENT_UPCOMING_SECTION = {
  title: 'Próximos eventos',
  subtitle: 'Ordenados por fecha — lo que viene en Bariloche',
} as const;

export const EVENT_NEW_SECTION = {
  title: 'Nuevos eventos',
  subtitle: 'Recién publicados en la plataforma',
} as const;

export const RECENT_SECTION = {
  title: 'Recientes',
  subtitle: 'Últimos agregados',
} as const;

const CATEGORY_FEATURED_TITLES: Record<
  Exclude<CategoryGatewayId, 'event'>,
  { title: string; subtitle: string }
> = {
  gastro: {
    title: 'Destacados en Gastronomía',
    subtitle: 'Restaurantes, bares y lugares para disfrutar',
  },
  rental: {
    title: 'Destacados en Equipos y Rentals',
    subtitle: RENTAL_PUBLIC_SUBTITLE,
  },
  excursion: {
    title: 'Destacados en Excursiones',
    subtitle: 'Recorridos y experiencias al aire libre',
  },
};

export function getFeaturedSectionMeta(category: CategoryGatewayId): {
  title: string;
  subtitle: string;
} {
  if (category === 'event') return EVENT_FEATURED_SECTION;
  return CATEGORY_FEATURED_TITLES[category];
}

export function getRecentSectionMeta(category: CategoryGatewayId): {
  title: string;
  subtitle: string;
} {
  if (category === 'event') return EVENT_NEW_SECTION;
  return RECENT_SECTION;
}

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
