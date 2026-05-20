import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { getCategoryGatewayHref } from '@/lib/home/categoryGatewayConfig';
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
    subtitle: 'Alquileres para moverte, equiparte y vivir la experiencia.',
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

export const CROSS_CATEGORY_DISCOVERY_HEADING = 'También podés descubrir';
export const CROSS_CATEGORY_DISCOVERY_SUBHEADING = 'Más para hacer en Bariloche';

export const CROSS_CATEGORY_EMPTY_EVENT_MESSAGE =
  'No hay eventos próximos disponibles por ahora.';

export interface CategoryLandingMeta {
  id: CategoryGatewayId;
  title: string;
  subtitle: string;
}

export const CATEGORY_LANDING_META: Record<CategoryGatewayId, CategoryLandingMeta> = {
  event: {
    id: 'event',
    title: 'EVENTOS',
    subtitle: 'Shows, fiestas y experiencias en vivo',
  },
  gastro: {
    id: 'gastro',
    title: 'GASTRONOMÍA',
    subtitle: 'Sabores y lugares para disfrutar',
  },
  rental: {
    id: 'rental',
    title: 'EQUIPOS Y RENTALS',
    subtitle: 'Movilidad, equipos y aventura',
  },
  excursion: {
    id: 'excursion',
    title: 'EXCURSIONES',
    subtitle: 'Recorridos y experiencias únicas',
  },
};

export function isCategoryLandingId(value: string): value is CategoryGatewayId {
  return value === 'event' || value === 'gastro' || value === 'rental' || value === 'excursion';
}

export function toContentMainCategory(id: CategoryGatewayId): ContentMainCategory {
  return id;
}
