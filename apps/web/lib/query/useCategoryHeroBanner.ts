'use client';

import type { ContentMainCategory } from '@/repositories/interfaces';
import { useCategoryBanner } from './useCategoryBanner';
import { useCategoryEditorialBanner } from './useCategoryEditorialBanner';

/**
 * Public category hero: editorial banners render as a promotional hero block.
 * Event-based category banners stay available for a featured rail / hero fallback.
 */
export function useCategoryHeroBanner(category: ContentMainCategory) {
  const editorial = useCategoryEditorialBanner(category);
  const events = useCategoryBanner(category);

  const editorialItems = editorial.data?.data ?? [];
  const eventItems = events.data?.data ?? [];
  const hasEditorial = editorialItems.length > 0;

  return {
    source: hasEditorial ? ('editorial' as const) : ('events' as const),
    editorialItems,
    eventItems,
    isEditorialLoading: editorial.isLoading,
    isEventLoading: events.isLoading,
    isLoading: editorial.isLoading || (!hasEditorial && events.isLoading),
  };
}
