/**
 * Category gateway — editorial poster screen (post-splash).
 */

import {
  RENTAL_GATEWAY_DESCRIPTION,
  RENTAL_GATEWAY_IMAGE,
  RENTAL_GATEWAY_IMAGE_ALT,
} from '@/lib/rentals/publicCopy';

export type CategoryGatewayId = 'event' | 'gastro' | 'rental' | 'excursion';

export interface CategoryGatewayOption {
  id: CategoryGatewayId;
  title: string;
  description: string;
  /** Editorial tile image (object-cover) */
  imageSrc: string;
  imageAlt: string;
}

/** Configurable location line — accent suffix in UI */
export const CATEGORY_GATEWAY_LOCATION = 'BARILOCHE';

export const CATEGORY_GATEWAY_HEADLINE = '¿QUÉ QUERÉS HACER HOY?';

export const CATEGORY_GATEWAY_SUBTITLE_PREFIX =
  'ENCONTRÁ TODO LO QUE HAY PARA HACER';

export const CATEGORY_GATEWAY_OPTIONS: CategoryGatewayOption[] = [
  {
    id: 'event',
    title: 'EVENTOS',
    description: 'SHOWS, FIESTAS, RECITALES Y EXPERIENCIAS EN VIVO.',
    imageSrc:
      'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Concierto en vivo con luces de escenario',
  },
  {
    id: 'gastro',
    title: 'GASTRONOMÍA',
    description: 'RESTAURANTS, BARES, CAFETERÍAS Y LUGARES PARA DISFRUTAR.',
    imageSrc:
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Mesa de restaurante con platos y ambiente cálido',
  },
  {
    id: 'rental',
    title: 'EQUIPOS Y RENTALS',
    description: RENTAL_GATEWAY_DESCRIPTION,
    imageSrc: RENTAL_GATEWAY_IMAGE,
    imageAlt: RENTAL_GATEWAY_IMAGE_ALT,
  },
  {
    id: 'excursion',
    title: 'EXCURSIONES',
    description: 'AVENTURAS, RECORRIDOS Y EXPERIENCIAS ÚNICAS.',
    imageSrc:
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
    imageAlt: 'Montañas y lago, paisaje de aventura',
  },
];

export const CATEGORY_QUERY_PARAM = 'category';

export function isCategoryGatewayId(
  value: string | null | undefined,
): value is CategoryGatewayId {
  return (
    value === 'event' ||
    value === 'gastro' ||
    value === 'rental' ||
    value === 'excursion'
  );
}

/** Maps gateway category to the first relevant home rail id for scroll-into-view. */
export function getHomeRailIdForCategory(category: CategoryGatewayId): string {
  return category;
}

export function buildHomeHrefWithCategory(category: CategoryGatewayId): string {
  return `/home?${CATEGORY_QUERY_PARAM}=${category}`;
}

/** Category picker screen (navbar logo, direct navigation — no splash) */
export const CATEGORY_GATEWAY_PATH = '/categorias';

/** Gateway → category landing with subcategory carousels */
export function getCategoryGatewayHref(category: CategoryGatewayId): string {
  return `/categoria/${category}`;
}

export const SUBCATEGORY_QUERY_PARAM = 'subcategory';
