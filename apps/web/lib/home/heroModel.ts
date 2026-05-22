/**
 * Hero view model — maps featured content to hero display.
 * Keeps presentational logic out of components.
 */

export type HeroContentType = 'event' | 'gastro' | 'hotel' | 'excursion' | 'rental';

export interface HeroViewModel {
  id: string;
  title: string;
  description: string | null;
  category: HeroContentType | string;
  city: string | null;
  venueName: string | null;
  coverImageUrl: string | null;
  startAt: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  fromPrice: number | null;
  producerName: string | null;
  detailHref: string;
  primaryCtaLabel: string;
  secondaryCtaLabel: string;
  categoryLabel: string;
}

type FeaturedItem = {
  id: string;
  title: string;
  startAt?: string;
  city?: string | null;
  venueName?: string | null;
  coverImageUrl?: string | null;
  category?: string;
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  fromPrice?: number | null;
  producerName?: string | null;
};

const TENANT_ID = 'tenant-demo';

function getDetailHref(item: FeaturedItem): string {
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
  return `${base}/${item.id}?tenantId=${TENANT_ID}`;
}

function getCtaLabels(category?: string): { primary: string; secondary: string } {
  switch (category) {
    case 'gastro':
      return { primary: 'Ver detalle', secondary: 'Más información' };
    case 'hotel':
      return { primary: 'Ver hotel', secondary: 'Reservar' };
    case 'excursion':
      return { primary: 'Explorar', secondary: 'Ver categoría' };
    case 'rental':
      return { primary: 'Consultar disponibilidad', secondary: 'Ver detalle' };
    default:
      return { primary: 'Comprar entrada', secondary: 'Más información' };
  }
}

function getCategoryLabel(category?: string): string {
  switch (category) {
    case 'gastro':
      return 'Gastronomía';
    case 'hotel':
      return 'Hotel';
    case 'excursion':
      return 'Excursión';
    case 'rental':
      return 'Alquiler';
    default:
      return 'Evento';
  }
}

export function mapFeaturedItemToHeroModel(item: FeaturedItem): HeroViewModel {
  const { primary: primaryCtaLabel, secondary: secondaryCtaLabel } = getCtaLabels(item.category);
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? null,
    category: (item.category as HeroContentType) ?? 'event',
    city: item.city ?? null,
    venueName: item.venueName ?? null,
    coverImageUrl: item.coverImageUrl ?? null,
    startAt: item.startAt ?? null,
    ratingAvg: item.ratingAvg ?? null,
    ratingCount: item.ratingCount ?? 0,
    fromPrice: item.fromPrice ?? null,
    producerName: item.producerName ?? null,
    detailHref: getDetailHref(item),
    primaryCtaLabel,
    secondaryCtaLabel,
    categoryLabel: getCategoryLabel(item.category),
  };
}
