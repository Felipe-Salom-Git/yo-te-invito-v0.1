import type { CategoryBannerResolvedItem } from '@/repositories/interfaces';
import type { ContentCardItem } from '@/components/home/ContentCard';

/** Map public category banner rows to carousel cards (real publications). */
export function mapCategoryBannerToContentCard(
  item: CategoryBannerResolvedItem,
): ContentCardItem {
  return {
    id: item.eventId,
    title: item.title,
    description: item.description,
    startAt: item.startAt,
    city: item.city,
    venueName: item.venueName,
    coverImageUrl: item.coverImageUrl,
    category: item.category ?? undefined,
    subcategoryId: item.subcategoryId,
    subcategoryName: item.subcategoryName,
  };
}

export function mapCategoryBannersToContentCards(
  items: CategoryBannerResolvedItem[],
): ContentCardItem[] {
  return items.map(mapCategoryBannerToContentCard);
}
