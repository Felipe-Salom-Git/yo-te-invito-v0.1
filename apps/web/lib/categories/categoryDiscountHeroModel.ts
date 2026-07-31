import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';
import type { HeroViewModel } from '@/lib/home/heroModel';

/** Map a published gastro discount into a category hero slide. */
export function mapGastroDiscountToHeroModel(
  item: PublicGastroDiscountListItem,
): HeroViewModel {
  const title = item.title?.trim() || 'Descuento';
  const summary = item.summary?.trim() || null;
  return {
    id: `discount:${item.id}`,
    title,
    description: summary,
    category: 'gastro',
    city: item.locationCity,
    venueName: item.locationName,
    coverImageUrl: item.headerImageUrl,
    startAt: item.validFrom ?? item.discountDate,
    ratingAvg: null,
    ratingCount: 0,
    fromPrice: null,
    producerName: item.locationName,
    detailHref: `/descuentos/${item.id}`,
    primaryCtaLabel: 'Ver descuento',
    secondaryCtaLabel: 'Ver local',
    categoryLabel: 'Descuento',
    hideSecondaryCta: true,
  };
}
