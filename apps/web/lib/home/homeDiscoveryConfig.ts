/**
 * Public home discovery — tabs, rails, and navigation (aligned with category gateway).
 */

import {
  getCategoryGatewayHref,
  type CategoryGatewayId,
} from '@/lib/home/categoryGatewayConfig';
import { RENTAL_PUBLIC_SUBTITLE } from '@/lib/rentals/publicCopy';

export const HOME_MAIN_CATEGORY_IDS: CategoryGatewayId[] = [
  'event',
  'gastro',
  'rental',
  'excursion',
];

export const HOME_DISCOVERY_TABS = [
  { id: 'event' as const, label: 'Eventos' },
  { id: 'gastro' as const, label: 'Gastronomía' },
  { id: 'rental' as const, label: 'Equipos y Rentals' },
  { id: 'excursion' as const, label: 'Excursiones' },
];

export type HomeRailId =
  | 'recommended'
  | 'trending'
  | 'newEvents'
  | 'nearYou'
  | 'event'
  | 'gastro'
  | 'rental'
  | 'excursion'
  | 'favorites'
  | 'paraVos';

export interface HomeRailDefinition {
  id: HomeRailId;
  title: string;
  subtitle: string;
  /** Ver más — categoría o explore */
  seeMoreHref?: string;
  seeMoreLabel?: string;
}

/** Editorial / cross-cutting rails (discovery + personalized) */
export const HOME_EDITORIAL_RAIL_DEFS: HomeRailDefinition[] = [
  {
    id: 'recommended',
    title: 'Más recomendados',
    subtitle: 'Mayor confianza según valoraciones verificadas',
    seeMoreHref: '/explore',
  },
  {
    id: 'trending',
    title: 'Lo más visto',
    subtitle: 'Según visitas recientes en la plataforma',
    seeMoreHref: '/explore',
  },
  {
    id: 'newEvents',
    title: 'Nuevos',
    subtitle: 'Recién publicados en la plataforma',
    seeMoreHref: '/explore',
  },
  {
    id: 'nearYou',
    title: 'Cerca de ti',
    subtitle: 'En tu ciudad preferida',
    seeMoreHref: '/explore',
  },
];

/** One rail per main category */
export const HOME_CATEGORY_RAIL_DEFS: HomeRailDefinition[] = [
  {
    id: 'event',
    title: 'Eventos',
    subtitle: 'Shows, fiestas y experiencias en vivo',
    seeMoreHref: getCategoryGatewayHref('event'),
  },
  {
    id: 'gastro',
    title: 'Gastronomía',
    subtitle: 'Restaurantes, bares y lugares para disfrutar',
    seeMoreHref: getCategoryGatewayHref('gastro'),
  },
  {
    id: 'rental',
    title: 'Equipos y Rentals',
    subtitle: RENTAL_PUBLIC_SUBTITLE,
    seeMoreHref: getCategoryGatewayHref('rental'),
  },
  {
    id: 'excursion',
    title: 'Excursiones',
    subtitle: 'Recorridos y experiencias al aire libre',
    seeMoreHref: getCategoryGatewayHref('excursion'),
  },
];

export function isHomeMainCategoryRail(id: string): id is HomeRailId {
  return (
    id === 'event' ||
    id === 'gastro' ||
    id === 'rental' ||
    id === 'excursion'
  );
}

export function mapPreferenceToRailId(cat: string): HomeRailId {
  if (cat === 'event') return 'recommended';
  if (isHomeMainCategoryRail(cat)) return cat;
  return 'recommended';
}
