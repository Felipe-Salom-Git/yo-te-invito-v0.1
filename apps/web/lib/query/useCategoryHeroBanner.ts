'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { isGastroDiscountValidToday } from '@yo-te-invito/shared';
import type { ContentMainCategory } from '@/repositories/interfaces';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { mapEventSummariesToCategoryBannerItems } from '@/lib/categories/categoryBannerCards';
import { mapGastroDiscountToHeroModel } from '@/lib/categories/categoryDiscountHeroModel';
import type { HeroViewModel } from '@/lib/home/heroModel';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { categoryLandingKeys } from './keys';
import { useCategoryBanner } from './useCategoryBanner';
import { useCategoryEditorialBanner } from './useCategoryEditorialBanner';
import { useGastroPublishedDiscounts } from './useGastroPublishedDiscounts';

const TENANT_ID = 'tenant-demo';
const PUBLICATION_HERO_LIMIT = 5;
const DISCOUNT_HERO_LIMIT = 3;

function toGatewayCategory(category: ContentMainCategory): CategoryGatewayId {
  if (category === 'gastro' || category === 'rental' || category === 'excursion') {
    return category;
  }
  return 'event';
}

/**
 * Public category hero: one playlist — editorials + publication banners (+ gastro discounts).
 */
export function useCategoryHeroBanner(category: ContentMainCategory) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const gatewayCategory = toGatewayCategory(category);
  const isGastro = gatewayCategory === 'gastro';

  const editorial = useCategoryEditorialBanner(category);
  const events = useCategoryBanner(category);
  const discountsQuery = useGastroPublishedDiscounts(undefined, isGastro);

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

  const discountItems: HeroViewModel[] = useMemo(() => {
    if (!isGastro) return [];
    const rows = discountsQuery.data?.data ?? [];
    return rows
      .filter((d) =>
        isGastroDiscountValidToday({
          status: 'ACTIVE',
          validityMode: d.validityMode,
          validWeekday: d.validWeekday,
          validFrom: d.validFrom,
          validTo: d.validTo,
          discountDate: d.discountDate,
        }).valid,
      )
      .slice(0, DISCOUNT_HERO_LIMIT)
      .map(mapGastroDiscountToHeroModel);
  }, [discountsQuery.data?.data, isGastro]);

  const isPublicationLoading =
    events.isLoading || (hasEditorial && bannerEventItems.length === 0 && publicationFallback.isLoading);

  return {
    source: hasEditorial ? ('editorial' as const) : ('events' as const),
    editorialItems,
    eventItems,
    discountItems,
    isEditorialLoading: editorial.isLoading,
    isEventLoading: isPublicationLoading,
    isLoading:
      editorial.isLoading || isPublicationLoading || (isGastro && discountsQuery.isLoading),
  };
}
