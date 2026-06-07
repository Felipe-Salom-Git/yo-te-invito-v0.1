import type { CategoryEditorialBannerPublicItem } from '@/repositories/interfaces';
import type { HeroViewModel } from '@/lib/home/heroModel';
import { getCategoryLabel } from '@/lib/home/contentRoutes';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';

export function mapCategoryEditorialBannerToHeroModel(
  item: CategoryEditorialBannerPublicItem,
  category: CategoryGatewayId,
): HeroViewModel {
  const hasCta = !!(item.ctaHref && item.ctaLabel);
  const isExternal = hasCta && !item.ctaHref!.startsWith('/');

  return {
    id: item.id,
    title: item.title,
    description: item.subtitle,
    category: item.category,
    city: null,
    venueName: null,
    coverImageUrl: item.imageUrl,
    startAt: null,
    ratingAvg: null,
    ratingCount: 0,
    fromPrice: null,
    producerName: null,
    detailHref: hasCta ? item.ctaHref! : '#',
    primaryCtaLabel: hasCta ? item.ctaLabel! : 'Explorar',
    secondaryCtaLabel: 'Más información',
    categoryLabel: getCategoryLabel(category),
    ctaExternal: isExternal,
    hideSecondaryCta: !hasCta,
  };
}
