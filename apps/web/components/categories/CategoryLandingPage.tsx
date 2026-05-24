'use client';

import { useMemo, useState, useCallback } from 'react';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { useCategoryCarousels } from '@/lib/query/useCategoryCarousels';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';
import { ContentPreviewModal } from '@/components/home/ContentPreviewModal';
import { SubcategoryRail } from './SubcategoryRail';
import { CrossCategoryRails } from './CrossCategoryRails';
import { CategoryHeroBanner } from './CategoryHeroBanner';
import { CategoryLandingEditorial } from './CategoryLandingEditorial';
import { useCategoryBanner } from '@/lib/query/useCategoryBanner';
import { toContentMainCategory } from '@/lib/categories/categoryLandingConfig';
import { RENTAL_CATEGORY_EMPTY_MESSAGE } from '@/lib/rentals/publicCopy';
import { RentalProviderContactCta } from '@/components/rentals/RentalProviderContactCta';
import { GastroDiscountsRail } from '@/components/gastro/GastroDiscountsRail';
import { EventDiscoveryContent } from '@/components/events/discovery/EventDiscoveryContent';

export interface CategoryLandingPageProps {
  category: CategoryGatewayId;
  subcategorySlug?: string | null;
}

export function CategoryLandingPage({ category, subcategorySlug }: CategoryLandingPageProps) {
  if (category === 'event') {
    return <EventDiscoveryContent subcategorySlug={subcategorySlug} />;
  }

  const {
    sections,
    isEmpty,
    filterMode,
    activeSubcategory,
    subcategories,
    subcategoriesLoading,
    discountsSubcategoryMode,
    publishedDiscounts,
    publishedDiscountsLoading,
  } = useCategoryCarousels(category, subcategorySlug);

  const { data: bannerData, isLoading: bannerLoading } = useCategoryBanner(
    toContentMainCategory(category),
  );

  const [previewItem, setPreviewItem] = useState<ContentCardItem | null>(null);
  const openPreview = useCallback((item: ContentCardItem) => setPreviewItem(item), []);
  const closePreview = useCallback(() => setPreviewItem(null), []);

  const similarItems = useMemo(() => {
    if (!previewItem) return [];
    const all: ContentCardItem[] = [];
    sections.forEach((s) => s.items.forEach((i) => all.push(i as ContentCardItem)));
    return all.filter((i) => i.category === previewItem.category);
  }, [previewItem, sections]);

  const handleCardClick = useCallback(
    (item: ContentCardItem) => openPreview(item),
    [openPreview],
  );

  return (
    <div className="min-h-screen bg-black pb-12 text-white">
      <CategoryHeroBanner
        category={category}
        items={bannerData?.data ?? []}
        isLoading={bannerLoading}
      />

      <CategoryLandingEditorial category={category} />

      {filterMode && activeSubcategory && (
        <p className="border-b border-white/10 px-4 py-2 text-center text-xs font-bold uppercase tracking-wider text-accent sm:px-6 md:px-10">
          Filtrando: {activeSubcategory.name}
        </p>
      )}

      <SubcategoryRail
        category={category}
        items={subcategories}
        activeSlug={subcategorySlug}
        isLoading={subcategoriesLoading}
      />

      <div id="category-content" className="mt-4 w-full overflow-visible sm:mt-5">
        {discountsSubcategoryMode ? (
          <GastroDiscountsRail
            title="Descuentos"
            subtitle="Reclamá tu código QR gratis y usalo en el local"
            discounts={publishedDiscounts}
            isLoading={publishedDiscountsLoading}
          />
        ) : null}

        {!discountsSubcategoryMode &&
        category === 'gastro' &&
        (publishedDiscountsLoading || publishedDiscounts.length > 0) ? (
          <GastroDiscountsRail
            title="Descuentos disponibles"
            subtitle="Beneficios gratis — reclamá tu QR por email"
            discounts={publishedDiscounts}
            isLoading={publishedDiscountsLoading}
          />
        ) : null}

        {discountsSubcategoryMode && !publishedDiscountsLoading && publishedDiscounts.length === 0 ? (
          <p className="px-4 text-center text-sm text-white/60 sm:px-6">
            No hay descuentos publicados por ahora.
          </p>
        ) : null}

        {discountsSubcategoryMode ? null : isEmpty ? (
          <p className="px-4 text-center text-sm text-white/60 sm:px-6">
            {category === 'rental'
              ? RENTAL_CATEGORY_EMPTY_MESSAGE
              : 'No hay contenido disponible en esta categoría por ahora.'}
          </p>
        ) : (
          sections.map((section) => (
            <ContentRail
              key={section.id}
              sectionId={`rail-${section.id}`}
              title={section.title}
              subtitle={section.subtitle}
              items={section.items}
              isLoading={section.isLoading}
              onCardClick={handleCardClick}
              seeMoreHref={section.seeMoreHref}
              seeMoreLabel={section.seeMoreLabel}
              headingVariant="category"
            />
          ))
        )}
      </div>

      {category === 'rental' ? (
        <div className="mt-8 px-4 sm:px-6 md:px-10 lg:px-12">
          <RentalProviderContactCta variant="dark" />
        </div>
      ) : null}

      {!filterMode && <CrossCategoryRails selectedCategory={category} onCardClick={handleCardClick} />}

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
