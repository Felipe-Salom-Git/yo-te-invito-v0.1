import type { CategoryBannerResolvedItem } from '@/repositories/interfaces';
import type { HeroViewModel } from '@/lib/home/heroModel';
import {
  getCategoryLabel,
  getContentDetailHref,
  getPrimaryCtaLabel,
} from '@/lib/home/contentRoutes';

export function mapCategoryBannerToHeroModel(
  item: CategoryBannerResolvedItem,
  tenantId?: string,
): HeroViewModel {
  const category = item.category ?? 'event';
  return {
    id: item.eventId,
    title: item.title,
    description: item.description,
    category,
    city: item.city,
    venueName: item.venueName,
    coverImageUrl: item.coverImageUrl,
    startAt: item.startAt,
    ratingAvg: null,
    ratingCount: 0,
    fromPrice: null,
    producerName: item.subcategoryName ?? null,
    detailHref: getContentDetailHref({ id: item.eventId, category }, tenantId),
    primaryCtaLabel: getPrimaryCtaLabel(category),
    secondaryCtaLabel: 'Más información',
    categoryLabel: getCategoryLabel(category),
  };
}
