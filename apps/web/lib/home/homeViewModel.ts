/**
 * Home view model builder — normalizes home data for rendering.
 * Supports future rail reordering by strategy without changing UI.
 */

import type { EventSummary } from '@/repositories/interfaces';
import type { HomeStrategy, HomeStrategyPreferences } from './homeStrategy';

export interface HomeRail {
  id: string;
  title: string;
  subtitle: string;
  items: EventSummary[];
  isLoading: boolean;
}

export interface FeaturedTab {
  id: string;
  label: string;
}

export interface HomeViewModel {
  strategy: HomeStrategy;
  heroItems: EventSummary[];
  /** Category tabs for discovery path; empty for personalized */
  featuredTabs: FeaturedTab[];
  /** Hero items by tab id (event, gastro, excursion, rental); for discovery tabs */
  heroItemsByCategory: Record<string, EventSummary[]>;
  rails: HomeRail[];
  heroLoading: boolean;
}

export interface HomeViewModelInput {
  strategy: HomeStrategy;
  preferences: HomeStrategyPreferences | null;
  highlights: EventSummary[];
  trending: EventSummary[];
  recommendedGlobal: EventSummary[];
  nearYou: EventSummary[];
  newEvents: EventSummary[];
  gastro: EventSummary[];
  excursion: EventSummary[];
  rental: EventSummary[];
  hotel: EventSummary[];
  eventsLoading: boolean;
  carouselsLoading: boolean;
  /** Resolved event cards for /me/preferences favoriteEventIds */
  favoriteItems: EventSummary[];
  favoritesLoading: boolean;
}

const DISCOVERY_TABS: FeaturedTab[] = [
  { id: 'event', label: 'Eventos' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'hotel', label: 'Hoteles' },
  { id: 'excursion', label: 'Excursiones' },
  { id: 'rental', label: 'Alquileres' },
];

const CONTENT_CATEGORIES = ['gastro', 'hotel', 'excursion', 'rental'];

function isEventCategory(cat?: string): boolean {
  return !cat || cat === 'event' || !CONTENT_CATEGORIES.includes(cat);
}

/** Dedupes items by id, preserving order (trending first, then highlights). */
function dedupeFeatured(trending: EventSummary[], highlights: EventSummary[]): EventSummary[] {
  const seen = new Set<string>();
  const out: EventSummary[] = [];
  for (const item of [...trending, ...highlights]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function buildHeroItemsByCategory(input: HomeViewModelInput): Record<string, EventSummary[]> {
  const eventItems = dedupeFeatured(input.trending, input.highlights).filter((i) =>
    isEventCategory(i.category)
  );
  return {
    event: eventItems,
    gastro: input.gastro,
    hotel: input.hotel,
    excursion: input.excursion,
    rental: input.rental,
  };
}

const DEFAULT_RAILS: Omit<HomeRail, 'items' | 'isLoading'>[] = [
  { id: 'highlights', title: 'Destacados', subtitle: 'Los más populares esta semana' },
  { id: 'recommended', title: 'Más recomendados', subtitle: 'Mayor confianza según valoraciones verificadas' },
  { id: 'trending', title: 'Trending', subtitle: 'Lo que está sonando' },
  { id: 'nearYou', title: 'Cerca de ti', subtitle: 'En Buenos Aires' },
  { id: 'newEvents', title: 'Nuevos', subtitle: 'Recién agregados' },
  { id: 'gastro', title: 'Gastronomía', subtitle: 'Más recomendados en gastronomía' },
  { id: 'hotel', title: 'Hoteles', subtitle: 'Más recomendados en alojamiento' },
  { id: 'excursion', title: 'Excursiones', subtitle: 'Más recomendados en excursiones' },
  { id: 'rental', title: 'Alquileres', subtitle: 'Más recomendados en alquileres' },
];

function favoritesRail(input: HomeViewModelInput): HomeRail[] {
  if (input.favoriteItems.length === 0 && !input.favoritesLoading) return [];
  return [
    {
      id: 'favorites',
      title: 'Tus favoritos',
      subtitle: 'Eventos que guardaste',
      items: input.favoriteItems,
      isLoading: input.favoritesLoading,
    },
  ];
}

function buildRails(input: HomeViewModelInput): HomeRail[] {
  const cityLabel = input.preferences?.preferredCity?.trim() || 'Buenos Aires';
  const fav = favoritesRail(input);

  if (input.strategy === 'discovery') {
    const rails = DEFAULT_RAILS.map((r) => ({
      ...r,
      subtitle: r.id === 'nearYou' ? 'En Buenos Aires' : r.subtitle,
      items: getRailItems(input, r.id),
      isLoading: r.id === 'highlights' ? input.eventsLoading : input.carouselsLoading,
    }));
    return [...fav, ...rails];
  }

  // Path B — personalized: "Para vos" first, optionally reorder by preferredCategories
  const paraVosItems = input.nearYou.length > 0 ? input.nearYou : input.trending;
  const paraVos: HomeRail = {
    id: 'paraVos',
    title: 'Para vos',
    subtitle: `En ${cityLabel}`,
    items: paraVosItems,
    isLoading: input.carouselsLoading,
  };

  const prefs = input.preferences;
  const preferredCats = Array.isArray(prefs?.preferredCategories)
    ? prefs.preferredCategories.filter((c): c is string => typeof c === 'string')
    : [];

  const orderedRails = preferredCats.length > 0
    ? reorderRailsByPreference(DEFAULT_RAILS, preferredCats)
    : DEFAULT_RAILS;

  const rest = orderedRails.map((r) => ({
    ...r,
    subtitle: r.id === 'nearYou' ? `En ${cityLabel}` : r.subtitle,
    items: getRailItems(input, r.id),
    isLoading: r.id === 'highlights' ? input.eventsLoading : input.carouselsLoading,
  }));

  return [...fav, paraVos, ...rest];
}

function reorderRailsByPreference(
  rails: typeof DEFAULT_RAILS,
  preferredCats: string[]
): typeof DEFAULT_RAILS {
  const order: string[] = [];
  for (const cat of preferredCats) {
    const id = cat === 'event' ? 'highlights' : cat;
    if (rails.some((r) => r.id === id) && !order.includes(id)) order.push(id);
  }
  for (const r of rails) {
    if (!order.includes(r.id)) order.push(r.id);
  }
  return order
    .map((id) => rails.find((r) => r.id === id))
    .filter((r): r is (typeof DEFAULT_RAILS)[number] => !!r);
}

function getRailItems(input: HomeViewModelInput, id: string): EventSummary[] {
  switch (id) {
    case 'highlights':
      return input.highlights;
    case 'trending':
      return input.trending;
    case 'recommended':
      return input.recommendedGlobal;
    case 'nearYou':
      return input.nearYou;
    case 'newEvents':
      return input.newEvents;
    case 'gastro':
      return input.gastro;
    case 'hotel':
      return input.hotel;
    case 'excursion':
      return input.excursion;
    case 'rental':
      return input.rental;
    default:
      return [];
  }
}

/** Hero items: when personalized, prioritize nearYou (city-relevant) first */
function buildHeroItems(input: HomeViewModelInput): EventSummary[] {
  if (input.strategy !== 'personalized') {
    return dedupeFeatured(input.trending, input.highlights);
  }
  const nearFirst = input.nearYou.length > 0
    ? dedupeFeatured(input.nearYou, [...input.trending, ...input.highlights])
    : dedupeFeatured(input.trending, input.highlights);
  return nearFirst;
}

export function buildHomeViewModel(input: HomeViewModelInput): HomeViewModel {
  const heroItems = buildHeroItems(input);
  const heroLoading = input.eventsLoading || input.carouselsLoading;
  const heroItemsByCategory = buildHeroItemsByCategory(input);
  const featuredTabs = input.strategy === 'discovery' ? DISCOVERY_TABS : [];
  const rails = buildRails(input);

  return {
    strategy: input.strategy,
    heroItems,
    featuredTabs,
    heroItemsByCategory,
    rails,
    heroLoading,
  };
}
