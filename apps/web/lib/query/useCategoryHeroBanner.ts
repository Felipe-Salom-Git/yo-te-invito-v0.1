'use client';

import type { ContentMainCategory } from '@/repositories/interfaces';
import { useCategoryBanner } from './useCategoryBanner';
import { useCategoryEditorialBanner } from './useCategoryEditorialBanner';

/**
 * Public category hero: editorial banners take priority; event banners are fallback.
 */
export function useCategoryHeroBanner(category: ContentMainCategory) {
  const editorial = useCategoryEditorialBanner(category);
  const events = useCategoryBanner(category);

  const editorialItems = editorial.data?.data ?? [];
  const hasEditorial = editorialItems.length > 0;

  return {
    source: hasEditorial ? ('editorial' as const) : ('events' as const),
    editorialItems: hasEditorial ? editorialItems : [],
    eventItems: hasEditorial ? [] : (events.data?.data ?? []),
    isLoading: editorial.isLoading || (!hasEditorial && events.isLoading),
  };
}
