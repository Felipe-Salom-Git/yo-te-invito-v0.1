/**
 * Pure content route helpers — UI-agnostic.
 */

import { RENTAL_RELATED_SECTION_TITLE } from '@/lib/rentals/publicCopy';

export const DEFAULT_PUBLIC_TENANT_ID = 'tenant-demo';

export interface ContentItemForRoute {
  /** Event/public listing id (discovery). For gastro this is publicEventId. */
  id: string;
  category?: string;
  /** GastroProfile.id — use canonical /gastronomicos when set explicitly. */
  gastroProfileId?: string | null;
}

function appendTenantQuery(path: string, tenantId?: string): string {
  if (!tenantId || tenantId === DEFAULT_PUBLIC_TENANT_ID) return path;
  return `${path}?tenantId=${encodeURIComponent(tenantId)}`;
}

/**
 * Public detail href for discovery cards and related content.
 * Gastro discovery (Event.id = publicEventId) → /restaurants/[id].
 * Gastro canonical profile → /gastronomicos/[gastroProfileId].
 */
export function getContentDetailHref(
  item: ContentItemForRoute,
  tenantId?: string,
): string {
  const category = (item.category ?? 'event').toLowerCase();

  if (category === 'gastro') {
    if (item.gastroProfileId) {
      return appendTenantQuery(`/gastronomicos/${item.gastroProfileId}`, tenantId);
    }
    return appendTenantQuery(`/restaurants/${item.id}`, tenantId);
  }

  const base =
    category === 'hotel'
      ? '/hoteles'
      : category === 'excursion'
        ? '/excursiones'
        : category === 'rental'
          ? '/rentals'
          : '/events';

  return appendTenantQuery(`${base}/${item.id}`, tenantId);
}

export function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Gastronomía';
    case 'hotel':
      return 'Hotel';
    case 'excursion':
      return 'Excursión';
    case 'rental':
      return 'Equipos y Rentals';
    default:
      return 'Evento';
  }
}

export function getPrimaryCtaLabel(category?: string): string {
  return 'Ver detalle';
}

/** CTA label for place/event detail hero (primary action) */
export function getPlaceHeroCtaLabel(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Reservar';
    case 'hotel':
      return 'Ver detalle';
    case 'excursion':
      return 'Explorar';
    case 'rental':
      return 'Consultar disponibilidad';
    default:
      return 'Comprar entradas';
  }
}

/** Related section title for detail pages */
export function getRelatedSectionTitle(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Restaurantes que también te pueden gustar';
    case 'hotel':
      return 'Hoteles que también te pueden interesar';
    case 'excursion':
      return 'Excursiones que también te pueden gustar';
    case 'rental':
      return RENTAL_RELATED_SECTION_TITLE;
    default:
      return 'Eventos que también te pueden gustar';
  }
}

export function getSecondaryCtaLabel(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Ver restaurante';
    case 'hotel':
      return 'Ver detalle';
    case 'excursion':
      return 'Explorar';
    case 'rental':
      return 'Consultar disponibilidad';
    default:
      return 'Comprar';
  }
}

/** Contextual secondary CTA for preview modal (Comprar entradas, Reservar, Explorar) */
export function getSecondaryCtaLabelForModal(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Reservar';
    case 'hotel':
      return 'Ver detalle';
    case 'excursion':
      return 'Explorar';
    case 'rental':
      return 'Consultar disponibilidad';
    default:
      return 'Comprar entradas';
  }
}
