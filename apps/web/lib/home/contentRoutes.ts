/**
 * Pure content route helpers — UI-agnostic.
 */

const TENANT_ID = 'tenant-demo';

export interface ContentItemForRoute {
  id: string;
  category?: string;
}

export function getContentDetailHref(
  item: ContentItemForRoute,
  tenantId?: string
): string {
  const tenant = tenantId ?? TENANT_ID;
  const base =
    item.category === 'gastro'
      ? '/restaurants'
      : item.category === 'hotel'
        ? '/hoteles'
        : item.category === 'excursion'
          ? '/excursiones'
          : item.category === 'rental'
            ? '/rentals'
            : '/events';
  return `${base}/${item.id}?tenantId=${tenant}`;
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
      return 'Reservar / consultar';
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
      return 'Alquileres que también te pueden gustar';
    default:
      return 'Eventos que también te pueden gustar';
  }
}

export function getSecondaryCtaLabel(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Ver restaurante';
    case 'hotel':
      return 'Ver hotel';
    case 'excursion':
      return 'Explorar';
    case 'rental':
      return 'Reservar';
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
      return 'Reservar';
    default:
      return 'Comprar entradas';
  }
}
