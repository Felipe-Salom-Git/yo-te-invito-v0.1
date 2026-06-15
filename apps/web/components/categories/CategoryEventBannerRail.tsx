'use client';

import type { CategoryBannerResolvedItem } from '@/repositories/interfaces';
import { FEATURED_SECTION } from '@/lib/categories/category-carousel.logic';
import { mapCategoryBannersToContentCards } from '@/lib/categories/categoryBannerCards';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';

export interface CategoryEventBannerRailProps {
  items: CategoryBannerResolvedItem[];
  isLoading?: boolean;
  onCardClick?: (item: ContentCardItem) => void;
}

/**
 * Featured publications from category banners when editorial hero is active above.
 */
export function CategoryEventBannerRail({
  items,
  isLoading,
  onCardClick,
}: CategoryEventBannerRailProps) {
  if (!isLoading && items.length === 0) return null;

  return (
    <ContentRail
      sectionId="rail-category-event-banners"
      title={FEATURED_SECTION.title}
      subtitle={FEATURED_SECTION.subtitle}
      items={mapCategoryBannersToContentCards(items)}
      isLoading={!!isLoading}
      onCardClick={onCardClick}
      headingVariant="category"
    />
  );
}
