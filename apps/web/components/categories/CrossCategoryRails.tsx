'use client';

import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import {
  CROSS_CATEGORY_DISCOVERY_HEADING,
  CROSS_CATEGORY_DISCOVERY_SUBHEADING,
  CROSS_CATEGORY_EMPTY_EVENT_MESSAGE,
} from '@/lib/categories/categoryLandingConfig';
import { CategorySectionHeading } from '@/components/categories/CategorySectionHeading';
import { useCrossCategoryRails } from '@/lib/query/categoryLanding';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';

export interface CrossCategoryRailsProps {
  selectedCategory: CategoryGatewayId;
  onCardClick?: (item: ContentCardItem) => void;
}

export function CrossCategoryRails({
  selectedCategory,
  onCardClick,
}: CrossCategoryRailsProps) {
  const rails = useCrossCategoryRails(selectedCategory);
  const anyLoading = rails.some((r) => r.isLoading);
  const anyContent = rails.some((r) => r.items.length > 0);

  if (!anyLoading && !anyContent) {
    return null;
  }

  return (
    <section className="mt-14 border-t border-white/10 pt-10">
      <div className="px-4 sm:px-6">
        <CategorySectionHeading
          title={CROSS_CATEGORY_DISCOVERY_HEADING}
          subtitle={CROSS_CATEGORY_DISCOVERY_SUBHEADING}
        />
      </div>

      <div className="mt-6 space-y-2">
        {rails.map((rail) => (
          <ContentRail
            key={rail.category}
            sectionId={`cross-${rail.category}`}
            title={rail.title}
            subtitle={rail.subtitle}
            items={rail.items}
            isLoading={rail.isLoading}
            onCardClick={onCardClick}
            seeMoreHref={rail.href}
            seeMoreLabel="Ver más"
            headingVariant="category"
            emptyMessage={
              rail.category === 'event' ? CROSS_CATEGORY_EMPTY_EVENT_MESSAGE : undefined
            }
          />
        ))}
      </div>
    </section>
  );
}
