'use client';

import { useMemo } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import {
  CATEGORY_CAROUSEL_LIMIT,
  EVENT_FEATURED_SECTION,
  RECOMMENDED_SECTION,
  TOP_RATED_SECTION,
  RECENT_SECTION,
  featuredSortForCategory,
  sortFeaturedFallback,
  sortRecentItems,
} from '@/lib/categories/category-carousel.logic';
import { RECOMMENDED_LIST_MIN_VALID_REVIEWS } from '@yo-te-invito/shared';
import type { CategoryCarouselSection } from '@/lib/categories/category-page.types';
import type {
  EventSummary,
  PublicSubcategorySummary,
  Repositories,
} from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { isGastroDiscountsSubcategory } from '@/lib/gastro/discountsSubcategory';
import { useCategorySubcategories } from '@/lib/query/useCategorySubcategories';
import { useGastroPublishedDiscounts } from '@/lib/query/useGastroPublishedDiscounts';
import { categoryLandingKeys } from './keys';

const TENANT_FALLBACK = 'tenant-demo';

async function fetchCategoryList(
  repos: Repositories,
  tenantId: string,
  category: CategoryGatewayId,
  opts: {
    sort?: 'recent' | 'featured_rating' | 'featured_event' | 'recommended' | 'top_rated' | 'upcoming' | 'dateAsc';
    minValidReviews?: number;
    subcategorySlug?: string;
    limit?: number;
    hasTicketing?: boolean;
    excludeGeneralPublications?: boolean;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<EventSummary[]> {
  const res = await repos.events.list({
    tenantId,
    category,
    subcategorySlug: opts.subcategorySlug,
    sort: opts.sort,
    minValidReviews: opts.minValidReviews,
    limit: opts.limit ?? CATEGORY_CAROUSEL_LIMIT,
    page: 1,
    hasTicketing: opts.hasTicketing,
    excludeGeneralPublications: opts.excludeGeneralPublications,
    dateFrom: opts.dateFrom,
    dateTo: opts.dateTo,
  });
  return res.data;
}

function findActiveSubcategory(
  subcategories: PublicSubcategorySummary[],
  slug: string | null | undefined,
): PublicSubcategorySummary | undefined {
  const s = slug?.trim();
  if (!s) return undefined;
  return subcategories.find((x) => x.slug === s);
}

export function useCategoryCarousels(
  category: CategoryGatewayId,
  subcategorySlug?: string | null,
) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  const slug = subcategorySlug?.trim() || undefined;

  const { subcategories, isLoading: subcategoriesLoading } = useCategorySubcategories(category);

  const discountsSubcategoryMode =
    category === 'gastro' && isGastroDiscountsSubcategory(slug);

  const activeSubcategory = useMemo(
    () => findActiveSubcategory(subcategories, slug),
    [subcategories, slug],
  );

  const filterMode = !!activeSubcategory;

  const discountsQuery = useGastroPublishedDiscounts(
    undefined,
    category === 'gastro',
  );

  const filteredQuery = useQuery({
    queryKey: categoryLandingKeys.carousel(t, category, 'filtered', slug ?? ''),
    queryFn: () =>
      fetchCategoryList(repos, t, category, {
        subcategorySlug: slug,
        sort: 'upcoming',
      }),
    enabled: !!t && filterMode && !!slug,
  });

  const recommendedQuery = useQuery({
    queryKey: categoryLandingKeys.carousel(t, category, 'recommended', ''),
    queryFn: async () => {
      if (category === 'event') {
        return fetchCategoryList(repos, t, category, {
          sort: 'featured_event',
          hasTicketing: true,
          excludeGeneralPublications: true,
        });
      }
      const items = await fetchCategoryList(repos, t, category, {
        sort: 'recommended',
        minValidReviews: RECOMMENDED_LIST_MIN_VALID_REVIEWS,
      });
      if (items.length > 0) return items;
      return fetchCategoryList(repos, t, category, {
        sort: featuredSortForCategory(category),
      });
    },
    enabled: !!t && !filterMode,
  });

  const topRatedQuery = useQuery({
    queryKey: categoryLandingKeys.carousel(t, category, 'top-rated', ''),
    queryFn: () =>
      fetchCategoryList(repos, t, category, {
        sort: 'top_rated',
        minValidReviews: RECOMMENDED_LIST_MIN_VALID_REVIEWS,
      }),
    enabled: !!t && !filterMode && category !== 'event',
  });

  const recentQuery = useQuery({
    queryKey: categoryLandingKeys.carousel(t, category, 'recent', ''),
    queryFn: async () => {
      const items = await fetchCategoryList(repos, t, category, { sort: 'recent' });
      return sortRecentItems(items);
    },
    enabled: !!t && !filterMode,
  });

  const subcategoryQueries = useQueries({
    queries: subcategories.map((sub) => ({
      queryKey: categoryLandingKeys.carousel(t, category, 'sub', sub.slug),
      queryFn: () =>
        fetchCategoryList(repos, t, category, {
          subcategorySlug: sub.slug,
          sort: 'upcoming',
        }),
      enabled: !!t && !filterMode && subcategories.length > 0,
    })),
  });

  const sections: CategoryCarouselSection[] = useMemo(() => {
    if (filterMode && activeSubcategory && discountsSubcategoryMode) {
      return [];
    }

    if (filterMode && activeSubcategory) {
      const items = filteredQuery.data ?? [];
      if (!filteredQuery.isLoading && items.length === 0) return [];
      return [
        {
          id: `subcategory-${activeSubcategory.id}`,
          title: activeSubcategory.name,
          subtitle: activeSubcategory.description ?? undefined,
          items,
          isLoading: filteredQuery.isLoading,
        },
      ];
    }

    const out: CategoryCarouselSection[] = [];

    const recommendedItems = recommendedQuery.data ?? [];
    if (recommendedQuery.isLoading || recommendedItems.length > 0) {
      const meta =
        category === 'event' ? EVENT_FEATURED_SECTION : RECOMMENDED_SECTION;
      out.push({
        id: 'recommended',
        title: meta.title,
        subtitle: meta.subtitle,
        items: recommendedItems,
        isLoading: recommendedQuery.isLoading,
      });
    }

    if (category !== 'event') {
      const topRatedItems = topRatedQuery.data ?? [];
      if (topRatedQuery.isLoading || topRatedItems.length > 0) {
        out.push({
          id: 'top-rated',
          title: TOP_RATED_SECTION.title,
          subtitle: TOP_RATED_SECTION.subtitle,
          items: topRatedItems,
          isLoading: topRatedQuery.isLoading,
        });
      }
    }

    const recentItems = recentQuery.data ?? [];
    if (recentQuery.isLoading || recentItems.length > 0) {
      out.push({
        id: 'recent',
        title: RECENT_SECTION.title,
        subtitle: RECENT_SECTION.subtitle,
        items: recentItems,
        isLoading: recentQuery.isLoading,
      });
    }

    subcategories.forEach((sub, i) => {
      const q = subcategoryQueries[i];
      const items = q?.data ?? [];
      if (!q?.isLoading && items.length === 0) return;
      out.push({
        id: `subcategory-${sub.id}`,
        title: sub.name,
        subtitle: sub.description ?? undefined,
        items,
        isLoading: q?.isLoading ?? true,
      });
    });

    return out;
  }, [
    filterMode,
    activeSubcategory,
    filteredQuery.data,
    filteredQuery.isLoading,
    recommendedQuery.data,
    recommendedQuery.isLoading,
    topRatedQuery.data,
    topRatedQuery.isLoading,
    recentQuery.data,
    recentQuery.isLoading,
    subcategories,
    subcategoryQueries,
  ]);

  const isLoading =
    subcategoriesLoading ||
    (discountsSubcategoryMode
      ? discountsQuery.isLoading
      : filterMode
        ? filteredQuery.isLoading
        : recommendedQuery.isLoading ||
          topRatedQuery.isLoading ||
          recentQuery.isLoading ||
          subcategoryQueries.some((q) => q.isLoading));

  const visibleSections = sections.filter((s) => s.isLoading || s.items.length > 0);
  const isEmpty =
    !isLoading &&
    visibleSections.length === 0 &&
    !(discountsSubcategoryMode && (discountsQuery.isLoading || (discountsQuery.data?.data.length ?? 0) > 0));

  return {
    sections: visibleSections,
    isLoading,
    isEmpty,
    filterMode,
    activeSubcategory,
    subcategories,
    subcategoriesLoading,
    discountsSubcategoryMode,
    publishedDiscounts: discountsQuery.data?.data ?? [],
    publishedDiscountsLoading: discountsQuery.isLoading,
  };
}
