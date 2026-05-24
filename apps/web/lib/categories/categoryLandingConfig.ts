import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { getCategoryGatewayHref } from '@/lib/home/categoryGatewayConfig';
import {
  RENTAL_PUBLIC_SUBTITLE,
  RENTAL_PUBLIC_TAGLINE,
} from '@/lib/rentals/publicCopy';
import type { ContentMainCategory } from '@/repositories/interfaces';

export const CATEGORY_GATEWAY_IDS: CategoryGatewayId[] = [
  'event',
  'gastro',
  'rental',
  'excursion',
];

export interface CrossCategoryRailMeta {
  category: CategoryGatewayId;
  title: string;
  subtitle: string;
  href: string;
}

export const CROSS_CATEGORY_RAIL_META: Record<CategoryGatewayId, CrossCategoryRailMeta> = {
  event: {
    category: 'event',
    title: 'Eventos destacados',
    subtitle: 'Shows, fiestas y experiencias en vivo.',
    href: getCategoryGatewayHref('event'),
  },
  gastro: {
    category: 'gastro',
    title: 'Gastronomía destacada',
    subtitle: 'Restaurantes, bares y lugares para disfrutar.',
    href: getCategoryGatewayHref('gastro'),
  },
  rental: {
    category: 'rental',
    title: 'Equipos y Rentals destacados',
    subtitle: RENTAL_PUBLIC_SUBTITLE,
    href: getCategoryGatewayHref('rental'),
  },
  excursion: {
    category: 'excursion',
    title: 'Excursiones destacadas',
    subtitle: 'Aventuras, recorridos y paisajes para descubrir.',
    href: getCategoryGatewayHref('excursion'),
  },
};

export function getCrossCategoryRails(
  selected: CategoryGatewayId,
): CrossCategoryRailMeta[] {
  return CATEGORY_GATEWAY_IDS.filter((id) => id !== selected).map(
    (id) => CROSS_CATEGORY_RAIL_META[id],
  );
}

export const CROSS_CATEGORY_DISCOVERY_HEADING = 'Más para hacer';
export const CROSS_CATEGORY_DISCOVERY_SUBHEADING = 'Otras categorías en Bariloche';

export const CROSS_CATEGORY_EMPTY_EVENT_MESSAGE =
  'No hay eventos próximos disponibles por ahora.';

export interface CategoryLandingMeta {
  id: CategoryGatewayId;
  title: string;
  subtitle: string;
  editorialDescription: string;
}

export const CATEGORY_LANDING_META: Record<CategoryGatewayId, CategoryLandingMeta> = {
  event: {
    id: 'event',
    title: 'EVENTOS',
    subtitle: 'Shows, fiestas y experiencias en vivo',
    editorialDescription:
      'Fiestas, recitales, teatro y festivales. Filtrá por subcategoría o explorá por fecha.',
  },
  gastro: {
    id: 'gastro',
    title: 'GASTRONOMÍA',
    subtitle: 'Restaurantes, bares y lugares para disfrutar',
    editorialDescription:
      'Restaurants, bares, cafeterías y experiencias gastronómicas en la ciudad.',
  },
  rental: {
    id: 'rental',
    title: 'EQUIPOS Y RENTALS',
    subtitle: RENTAL_PUBLIC_SUBTITLE,
    editorialDescription: RENTAL_PUBLIC_TAGLINE,
  },
  excursion: {
    id: 'excursion',
    title: 'EXCURSIONES',
    subtitle: 'Aventuras, recorridos y experiencias únicas',
    editorialDescription:
      'Recorridos guiados, aventuras y experiencias al aire libre en la región.',
  },
};

/** Ver todo en explore con filtros de categoría (y subcategoría opcional). */
export function getCategoryExploreHref(
  category: CategoryGatewayId,
  opts?: { subcategoryId?: string; city?: string },
): string {
  const params = new URLSearchParams();
  params.set('category', category);
  if (opts?.subcategoryId?.trim()) {
    params.set('subcategoryId', opts.subcategoryId.trim());
  }
  if (opts?.city?.trim()) {
    params.set('city', opts.city.trim());
  }
  return `/explore?${params.toString()}`;
}

export function isCategoryLandingId(value: string): value is CategoryGatewayId {
  return value === 'event' || value === 'gastro' || value === 'rental' || value === 'excursion';
}

export function toContentMainCategory(id: CategoryGatewayId): ContentMainCategory {
  return id;
}
