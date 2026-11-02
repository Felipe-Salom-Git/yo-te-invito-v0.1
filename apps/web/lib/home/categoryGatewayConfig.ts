/**
 * Category gateway — editorial poster screen (post-splash).
 */

import {
  EXCURSION_PUBLIC_GATEWAY_DESCRIPTION,
  EXCURSION_PUBLIC_GATEWAY_TITLE,
} from '@/lib/categories/excursionPublicCopy';
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
  /** CSS `object-position` — portrait covers are cropped to landscape tiles on desktop. */
  imagePosition?: string;
}

/** G11.2 — official home covers (`apps/web/public/home/covers`). */
export const HOME_COVER_IMAGES = {
  event: '/home/covers/eventos.jpg',
  excursion: '/home/covers/actividades.jpg',
  rental: RENTAL_GATEWAY_IMAGE,
} as const;

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
    imageSrc: HOME_COVER_IMAGES.event,
    imageAlt: 'Público frente a un escenario al atardecer, con montañas y lago de fondo',
    imagePosition: '50% 62%',
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
    imagePosition: '50% 45%',
  },
  {
    id: 'excursion',
    title: EXCURSION_PUBLIC_GATEWAY_TITLE,
    description: EXCURSION_PUBLIC_GATEWAY_DESCRIPTION,
    imageSrc: HOME_COVER_IMAGES.excursion,
    imageAlt: 'Catamarán en el lago y tirolesa entre los bosques de Bariloche',
    imagePosition: '50% 50%',
  },
];

/** Official cover (src + framing) for events / activities / rentals; null for other categories. */
export function getCategoryCoverImage(
  category: CategoryGatewayId,
): { src: string; position: string } | null {
  if (!(category in HOME_COVER_IMAGES)) return null;
  const option = CATEGORY_GATEWAY_OPTIONS.find((o) => o.id === category);
  if (!option) return null;
  return { src: option.imageSrc, position: option.imagePosition ?? '50% 50%' };
}

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
