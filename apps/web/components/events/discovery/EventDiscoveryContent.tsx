'use client';

import { useState, useCallback, useMemo } from 'react';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { useCategoryCarousels } from '@/lib/query/useCategoryCarousels';
import { useEventsByDate } from '@/lib/query/useEventDiscovery';
import type { EventDiscoveryView } from '@/lib/events/discovery/types';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';
import { ContentPreviewModal } from '@/components/home/ContentPreviewModal';
import { SubcategoryRail } from '@/components/categories/SubcategoryRail';
import { CrossCategoryRails } from '@/components/categories/CrossCategoryRails';
import { CategoryHeroBanner } from '@/components/categories/CategoryHeroBanner';
import { useCategoryBanner } from '@/lib/query/useCategoryBanner';
import { toContentMainCategory } from '@/lib/categories/categoryLandingConfig';
import { EventDiscoveryViewToggle } from './EventDiscoveryViewToggle';
import { EventDateGroupedView } from './EventDateGroupedView';
import { EventCalendarModal } from './EventCalendarModal';

export function EventDiscoveryContent({
  subcategorySlug,
}: {
  subcategorySlug?: string | null;
}) {
  const category: CategoryGatewayId = 'event';
  const [view, setView] = useState<EventDiscoveryView>('carousels');
  const [calendarOpen, setCalendarOpen] = useState(false);

  const carousel = useCategoryCarousels(category, subcategorySlug);
  const dateQuery = useEventsByDate(subcategorySlug, view === 'date');

  const { data: bannerData, isLoading: bannerLoading } = useCategoryBanner(
    toContentMainCategory(category),
  );

  const [previewItem, setPreviewItem] = useState<ContentCardItem | null>(null);
  const openPreview = useCallback((item: ContentCardItem) => setPreviewItem(item), []);
  const closePreview = useCallback(() => setPreviewItem(null), []);

  const poolForSimilar = useMemo(() => {
    const all: ContentCardItem[] = [];
    carousel.sections.forEach((s) => s.items.forEach((i) => all.push(i as ContentCardItem)));
    (dateQuery.data ?? []).forEach((i) => all.push(i as ContentCardItem));
    return all;
  }, [carousel.sections, dateQuery.data]);

  const similarItems = useMemo(() => {
    if (!previewItem) return [];
    return poolForSimilar.filter(
      (i) => i.id !== previewItem.id && (i.category ?? 'event') === (previewItem.category ?? 'event'),
    );
  }, [previewItem, poolForSimilar]);

  const handleCardClick = useCallback(
    (item: ContentCardItem) => openPreview(item),
    [openPreview],
  );

  const dateViewLoading =
    view === 'date' && (dateQuery.isPending || dateQuery.isLoading || dateQuery.isFetching);

  const dateViewEmpty =
    view === 'date' &&
    !dateViewLoading &&
    !dateQuery.isError &&
    (dateQuery.data?.length ?? 0) === 0;

  const carouselsEmpty =
    view === 'carousels' && carousel.isEmpty && !carousel.isLoading;

  return (
    <div className="min-h-screen bg-black pb-12 text-white">
      <CategoryHeroBanner
        category={category}
        items={bannerData?.data ?? []}
        isLoading={bannerLoading}
      />

      {carousel.filterMode && carousel.activeSubcategory && (
        <p className="border-b border-white/10 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-accent sm:px-6 md:px-10">
          Filtrando: {carousel.activeSubcategory.name}
        </p>
      )}

      <SubcategoryRail
        category={category}
        items={carousel.subcategories}
        activeSlug={subcategorySlug}
        isLoading={carousel.subcategoriesLoading}
        trailing={
          <EventDiscoveryViewToggle
            view={view}
            onChange={setView}
            onOpenCalendar={() => setCalendarOpen(true)}
          />
        }
      />

      <div id="category-content" className="mt-4 w-full overflow-visible sm:mt-5">
        {view === 'carousels' ? (
          carouselsEmpty ? (
            <p className="px-4 text-center text-sm text-white/60 sm:px-6">
              No hay contenido disponible en esta categoría por ahora.
            </p>
          ) : (
            carousel.sections.map((section) => (
              <ContentRail
                key={section.id}
                sectionId={`rail-${section.id}`}
                title={section.title}
                subtitle={section.subtitle}
                items={section.items}
                isLoading={section.isLoading}
                onCardClick={handleCardClick}
                headingVariant="category"
              />
            ))
          )
        ) : view === 'date' ? (
          dateViewLoading ? (
            <EventDateGroupedView events={[]} isLoading onCardClick={handleCardClick} />
          ) : dateQuery.isError ? (
            <p className="px-4 text-center text-sm text-red-400 sm:px-6">
              No se pudieron cargar los eventos. Intentá de nuevo.
            </p>
          ) : dateViewEmpty ? (
            <p className="px-4 text-center text-sm text-white/60 sm:px-6">
              No hay eventos en las próximas fechas.
            </p>
          ) : (
            <EventDateGroupedView
              events={dateQuery.data ?? []}
              isLoading={false}
              onCardClick={handleCardClick}
            />
          )
        ) : null}
      </div>

      {!carousel.filterMode && (
        <CrossCategoryRails selectedCategory={category} onCardClick={handleCardClick} />
      )}

      <EventCalendarModal
        open={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        subcategorySlug={subcategorySlug}
      />

      <ContentPreviewModal
        isOpen={previewItem !== null}
        onClose={closePreview}
        item={previewItem}
        similarItems={similarItems}
        onSelectItem={setPreviewItem}
      />
    </div>
  );
}
