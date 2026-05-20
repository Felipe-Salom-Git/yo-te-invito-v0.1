import type { EventSummary } from '@/repositories/interfaces';

/** One horizontal carousel block on a category landing page. */
export type CategoryCarouselSection = {
  id: string;
  title: string;
  subtitle?: string;
  items: EventSummary[];
  isLoading: boolean;
};

export type CategoryCarouselMode = 'all' | 'subcategory_only';
