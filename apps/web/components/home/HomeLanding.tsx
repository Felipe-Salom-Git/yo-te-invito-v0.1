'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ContentPreviewModal } from '@/components/home/ContentPreviewModal';
import { ContentRail } from '@/components/home/ContentRail';
import { HomeHero } from '@/components/home/HomeHero';
import type { ContentCardItem } from '@/components/home/ContentCard';
import { useMe } from '@/hooks/useMe';
import { usePreferences } from '@/hooks/usePreferences';
import { useTenant } from '@/hooks/useTenant';
import {
  getHomeRailIdForCategory,
  type CategoryGatewayId,
} from '@/lib/home/categoryGatewayConfig';
import { resolveHomeStrategy } from '@/lib/home/homeStrategy';
import { buildHomeViewModel } from '@/lib/home/homeViewModel';
import { useEventsList } from '@/lib/query/events';
import { useHomeCarousels } from '@/lib/query/home';
import { useRepositories } from '@/repositories/context';

const TENANT_ID = 'tenant-demo';

export interface HomeLandingProps {
  /** Category from gateway (?category=) — focuses hero tab and scrolls to rail */
  initialCategory?: CategoryGatewayId | null;
}

export function HomeLanding({ initialCategory = null }: HomeLandingProps) {
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;
  const { isAuthenticated } = useMe();
  const { preferences } = usePreferences();
  const repos = useRepositories();

  const { data: eventsData, isLoading: eventsLoading } = useEventsList(t, 1, 8);
  const highlights = eventsData?.data ?? [];

  const preferredCity = preferences?.preferredCity?.trim() || null;

  const {
    trending,
    recommendedGlobal,
    nearYou,
    newEvents,
    gastro,
    hotel,
    excursion,
    rental,
    isLoading: carouselsLoading,
  } = useHomeCarousels({ preferredCity });

  const favoriteIds = preferences?.favoriteEventIds ?? [];
  const { data: favoriteEvents = [], isLoading: favoritesLoading } = useQuery({
    queryKey: ['home', 'favorites', t, favoriteIds.join('|')],
    queryFn: async () => {
      const capped = favoriteIds.slice(0, 24);
      const results = await Promise.all(
        capped.map((id) => repos.events.getDetail(id, t)),
      );
      return results.filter((e): e is NonNullable<typeof e> => !!e);
    },
    enabled: isAuthenticated && favoriteIds.length > 0,
  });

  const strategy = useMemo(
    () => resolveHomeStrategy({ isAuthenticated, preferences }),
    [isAuthenticated, preferences]
  );

  const [previewItem, setPreviewItem] = useState<ContentCardItem | null>(null);
  const isPreviewOpen = previewItem !== null;
  const openPreview = useCallback((item: ContentCardItem) => setPreviewItem(item), []);
  const closePreview = useCallback(() => setPreviewItem(null), []);
  const selectPreviewItem = useCallback((item: ContentCardItem) => setPreviewItem(item), []);

  const viewModel = useMemo(
    () =>
      buildHomeViewModel({
        strategy,
        preferences,
        highlights,
        trending,
        recommendedGlobal,
        nearYou,
        newEvents,
        gastro,
        hotel,
        excursion,
        rental,
        eventsLoading,
        carouselsLoading,
        favoriteItems: favoriteEvents,
        favoritesLoading,
      }),
    [
      strategy,
      preferences,
      highlights,
      trending,
      recommendedGlobal,
      nearYou,
      newEvents,
      gastro,
      hotel,
      excursion,
      rental,
      eventsLoading,
      carouselsLoading,
      favoriteEvents,
      favoritesLoading,
    ]
  );

  const similarItems = useMemo(() => {
    if (!previewItem) return [];
    const cat = previewItem.category;
    const allItems: ContentCardItem[] = [];
    viewModel.rails.forEach((r) => {
      r.items.forEach((i) => allItems.push(i as ContentCardItem));
    });
    const byCategory = allItems.filter((i) => {
      if (!cat) return !i.category || i.category === 'event';
      return i.category === cat;
    });
    const seen = new Set<string>();
    return byCategory.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  }, [previewItem, viewModel.rails]);

  const focusRailId = initialCategory ? getHomeRailIdForCategory(initialCategory) : null;

  useEffect(() => {
    if (!focusRailId || viewModel.heroLoading) return;
    const el = document.getElementById(`rail-${focusRailId}`);
    if (!el) return;
    const timer = window.setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 400);
    return () => window.clearTimeout(timer);
  }, [focusRailId, viewModel.heroLoading]);

  return (
    <div className="min-h-screen bg-black">
      <HomeHero
        featuredItems={viewModel.heroItems}
        featuredTabs={viewModel.featuredTabs}
        heroItemsByCategory={viewModel.heroItemsByCategory}
        initialTabId={initialCategory}
        isLoading={viewModel.heroLoading}
      />

      <div className="w-full overflow-visible px-0 py-8 md:py-12">
        {viewModel.rails.map((rail) => (
          <ContentRail
            key={rail.id}
            sectionId={`rail-${rail.id}`}
            title={rail.title}
            subtitle={rail.subtitle}
            items={rail.items}
            isLoading={rail.isLoading}
            onCardClick={openPreview}
          />
        ))}
      </div>

      <ContentPreviewModal
        isOpen={isPreviewOpen}
        onClose={closePreview}
        item={previewItem}
        similarItems={similarItems}
        onSelectItem={selectPreviewItem}
      />
    </div>
  );
}

