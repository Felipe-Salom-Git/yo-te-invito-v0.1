'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ContentMainCategory } from '@/repositories/interfaces';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { mapEventSummariesToCategoryBannerItems } from '@/lib/categories/categoryBannerCards';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { categoryLandingKeys } from './keys';
import { useCategoryBanner } from './useCategoryBanner';
import { useCategoryEditorialBanner } from './useCategoryEditorialBanner';

const TENANT_ID = 'tenant-demo';
const PUBLICATION_HERO_LIMIT = 5;

function toGatewayCategory(category: ContentMainCategory): CategoryGatewayId {
  if (category === 'gastro' || category === 'rental' || category === 'excursion') {
    return category;
  }
  return 'event';
}

/**
 * Public category hero: editorial block on top; real publication banners always available below.
 */
export function useCategoryHeroBanner(category: ContentMainCategory) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const gatewayCategory = toGatewayCategory(category);

  const editorial = useCategoryEditorialBanner(category);
  const events = useCategoryBanner(category);

  const editorialItems = editorial.data?.data ?? [];
  const bannerEventItems = events.data?.data ?? [];
  const hasEditorial = editorialItems.length > 0;

  const publicationFallback = useQuery({
    queryKey: categoryLandingKeys.carousel(t, gatewayCategory, 'hero-publications', ''),
    queryFn: async () => {
      const res = await repos.events.list({
        tenantId: t,
        category: gatewayCategory,
        sort: 'recent',
        limit: PUBLICATION_HERO_LIMIT,
        page: 1,
      });
      return res.data;
    },
    enabled: !!t && hasEditorial && bannerEventItems.length === 0,
  });

  const eventItems = useMemo(() => {
    if (bannerEventItems.length > 0) {
      return bannerEventItems.slice(0, PUBLICATION_HERO_LIMIT);
    }
    if (!hasEditorial) {
      return bannerEventItems;
    }
    return mapEventSummariesToCategoryBannerItems(publicationFallback.data ?? []).slice(
      0,
      PUBLICATION_HERO_LIMIT,
    );
  }, [bannerEventItems, hasEditorial, publicationFallback.data]);

  const isPublicationLoading =
    events.isLoading || (hasEditorial && bannerEventItems.length === 0 && publicationFallback.isLoading);

  return {
    source: hasEditorial ? ('editorial' as const) : ('events' as const),
    editorialItems,
    eventItems,
    isEditorialLoading: editorial.isLoading,
    isEventLoading: isPublicationLoading,
    isLoading: editorial.isLoading || (!hasEditorial && isPublicationLoading),
  };
}
