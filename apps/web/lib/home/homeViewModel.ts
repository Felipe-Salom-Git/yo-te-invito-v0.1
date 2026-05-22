/**
 * Home view model builder — normalizes home data for rendering.
 */

import type { EventSummary } from '@/repositories/interfaces';
import type { HomeStrategy, HomeStrategyPreferences } from './homeStrategy';
import {
  HOME_CATEGORY_RAIL_DEFS,
  HOME_DISCOVERY_TABS,
  HOME_EDITORIAL_RAIL_DEFS,
  mapPreferenceToRailId,
  type HomeRailDefinition,
  type HomeRailId,
} from './homeDiscoveryConfig';

export interface HomeRail extends HomeRailDefinition {
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
  featuredTabs: FeaturedTab[];
  heroItemsByCategory: Record<string, EventSummary[]>;
  rails: HomeRail[];
  heroLoading: boolean;
  showHotelsComingSoon: boolean;
}

export interface HomeViewModelInput {
  strategy: HomeStrategy;
  preferences: HomeStrategyPreferences | null;
  highlights: EventSummary[];
  trending: EventSummary[];
  recommendedGlobal: EventSummary[];
  nearYou: EventSummary[];
  newEvents: EventSummary[];
  eventCategory: EventSummary[];
  gastro: EventSummary[];
  excursion: EventSummary[];
  rental: EventSummary[];
  eventsLoading: boolean;
  carouselsLoading: boolean;
  favoriteItems: EventSummary[];
  favoritesLoading: boolean;
}

const CONTENT_CATEGORIES = ['gastro', 'hotel', 'excursion', 'rental'];

function isEventCategory(cat?: string): boolean {
  return !cat || cat === 'event' || !CONTENT_CATEGORIES.includes(cat);
}

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
    isEventCategory(i.category),
  );
  return {
    event: eventItems.length > 0 ? eventItems : input.eventCategory,
    gastro: input.gastro,
    rental: input.rental,
    excursion: input.excursion,
  };
}

function getRailItems(input: HomeViewModelInput, id: HomeRailId): EventSummary[] {
  switch (id) {
    case 'recommended':
      return input.recommendedGlobal;
    case 'trending':
      return input.trending;
    case 'nearYou':
      return input.nearYou;
    case 'newEvents':
      return input.newEvents;
    case 'event':
      return input.eventCategory;
    case 'gastro':
      return input.gastro;
    case 'excursion':
      return input.excursion;
    case 'rental':
      return input.rental;
    case 'favorites':
      return input.favoriteItems;
    case 'paraVos': {
      return input.nearYou.length > 0 ? input.nearYou : input.trending;
    }
    default:
      return [];
  }
}

function railLoading(id: HomeRailId, input: HomeViewModelInput): boolean {
  if (id === 'favorites') return input.favoritesLoading;
  if (id === 'nearYou' || id === 'paraVos') return input.carouselsLoading;
  if (id === 'recommended' || id === 'trending' || id === 'newEvents') {
    return input.carouselsLoading;
  }
  if (id === 'event' || id === 'gastro' || id === 'excursion' || id === 'rental') {
    return input.carouselsLoading;
  }
  return input.eventsLoading;
}

function buildRail(def: HomeRailDefinition, input: HomeViewModelInput, cityLabel: string): HomeRail {
  const subtitle =
    def.id === 'nearYou' || def.id === 'paraVos'
      ? `En ${cityLabel}`
      : def.subtitle;
  return {
    ...def,
    subtitle,
    items: getRailItems(input, def.id),
    isLoading: railLoading(def.id, input),
  };
}

function reorderRailDefs(
  defs: HomeRailDefinition[],
  preferredCats: string[],
): HomeRailDefinition[] {
  const order: HomeRailId[] = [];
  for (const cat of preferredCats) {
    const id = mapPreferenceToRailId(cat);
    if (defs.some((d) => d.id === id) && !order.includes(id)) order.push(id);
  }
  for (const d of defs) {
    if (!order.includes(d.id)) order.push(d.id);
  }
  return order
    .map((id) => defs.find((d) => d.id === id))
    .filter((d): d is HomeRailDefinition => !!d);
}

function buildDiscoveryRails(input: HomeViewModelInput, cityLabel: string): HomeRail[] {
  const editorial = HOME_EDITORIAL_RAIL_DEFS.map((d) => buildRail(d, input, cityLabel));
  const category = HOME_CATEGORY_RAIL_DEFS.map((d) => buildRail(d, input, cityLabel));
  return [...editorial, ...category].filter((r) => r.isLoading || r.items.length > 0);
}

function buildPersonalizedRails(input: HomeViewModelInput, cityLabel: string): HomeRail[] {
  const fav =
    input.favoriteItems.length > 0 || input.favoritesLoading
      ? [
          buildRail(
            {
              id: 'favorites',
              title: 'Tus favoritos',
              subtitle: 'Lo que guardaste',
            },
            input,
            cityLabel,
          ),
        ]
      : [];

  const paraVos = buildRail(
    {
      id: 'paraVos',
      title: 'Para vos',
      subtitle: `En ${cityLabel}`,
      seeMoreHref: '/explore',
    },
    input,
    cityLabel,
  );

  const prefs = input.preferences;
  const preferredCats = Array.isArray(prefs?.preferredCategories)
    ? prefs.preferredCategories.filter(
        (c): c is string => typeof c === 'string' && c !== 'hotel',
      )
    : [];

  const editorialOrdered = reorderRailDefs(HOME_EDITORIAL_RAIL_DEFS, preferredCats);
  const categoryOrdered = reorderRailDefs(HOME_CATEGORY_RAIL_DEFS, preferredCats);

  const rest = [...editorialOrdered, ...categoryOrdered]
    .filter((d) => d.id !== 'nearYou')
    .map((d) => buildRail(d, input, cityLabel));

  return [...fav, paraVos, ...rest].filter((r) => r.isLoading || r.items.length > 0);
}

function buildHeroItems(input: HomeViewModelInput): EventSummary[] {
  if (input.strategy !== 'personalized') {
    return dedupeFeatured(input.trending, input.highlights);
  }
  return input.nearYou.length > 0
    ? dedupeFeatured(input.nearYou, [...input.trending, ...input.highlights])
    : dedupeFeatured(input.trending, input.highlights);
}

export function buildHomeViewModel(input: HomeViewModelInput): HomeViewModel {
  const cityLabel = input.preferences?.preferredCity?.trim() || 'Bariloche';
  const heroItems = buildHeroItems(input);
  const heroLoading = input.eventsLoading || input.carouselsLoading;
  const heroItemsByCategory = buildHeroItemsByCategory(input);
  const featuredTabs =
    input.strategy === 'discovery' ? [...HOME_DISCOVERY_TABS] : [];
  const rails =
    input.strategy === 'discovery'
      ? buildDiscoveryRails(input, cityLabel)
      : buildPersonalizedRails(input, cityLabel);

  return {
    strategy: input.strategy,
    heroItems,
    featuredTabs,
    heroItemsByCategory,
    rails,
    heroLoading,
    showHotelsComingSoon: true,
  };
}
