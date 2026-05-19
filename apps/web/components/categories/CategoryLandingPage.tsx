'use client';

import { useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { CATEGORY_LANDING_META } from '@/lib/categories/categoryLandingConfig';
import { usePublicSubcategories } from '@/lib/query/subcategories';
import { useCategoryLandingRails } from '@/lib/query/categoryLanding';
import { ContentRail } from '@/components/home/ContentRail';
import type { ContentCardItem } from '@/components/home/ContentCard';
import { ContentPreviewModal } from '@/components/home/ContentPreviewModal';
import { SubcategoryRail } from './SubcategoryRail';
import { CrossCategoryRails } from './CrossCategoryRails';

export interface CategoryLandingPageProps {
  category: CategoryGatewayId;
  subcategorySlug?: string | null;
}

export function CategoryLandingPage({ category, subcategorySlug }: CategoryLandingPageProps) {
  const meta = CATEGORY_LANDING_META[category];
  const { data: subcategories = [], isLoading: subLoading } = usePublicSubcategories(category);
  const rails = useCategoryLandingRails(category, subcategorySlug);

  const [previewItem, setPreviewItem] = useState<ContentCardItem | null>(null);
  const openPreview = useCallback((item: ContentCardItem) => setPreviewItem(item), []);
  const closePreview = useCallback(() => setPreviewItem(null), []);

  const similarItems = useMemo(() => {
    if (!previewItem) return [];
    const all: ContentCardItem[] = [];
    rails.forEach((r) => r.items.forEach((i) => all.push(i as ContentCardItem)));
    return all.filter((i) => i.category === previewItem.category);
  }, [previewItem, rails]);

  const handleCardClick = useCallback(
    (item: ContentCardItem) => openPreview(item),
    [openPreview],
  );

  return (
    <div className="min-h-screen bg-black pb-12 text-white">
      <header className="border-b border-white/10 px-4 pb-6 pt-8 sm:px-6 md:px-10">
        <Link href="/" className="text-xs font-medium uppercase tracking-widest text-white/50 hover:text-accent">
          &larr; Inicio
        </Link>
        <h1 className="gateway-poster-title mt-4 text-3xl sm:text-4xl md:text-5xl">{meta.title}</h1>
        <p className="mt-2 max-w-xl text-sm text-white/70 sm:text-base">{meta.subtitle}</p>
        {subcategorySlug && (
          <p className="mt-2 text-xs font-bold uppercase tracking-wider text-accent">
            Filtrando: {subcategories.find((s) => s.slug === subcategorySlug)?.name ?? subcategorySlug}
          </p>
        )}
      </header>

      <SubcategoryRail
        category={category}
        items={subcategories}
        activeSlug={subcategorySlug}
        isLoading={subLoading}
      />

      <div className="mt-8 w-full overflow-visible">
        {rails.map((rail) => (
          <ContentRail
            key={rail.id}
            sectionId={`rail-${rail.id}`}
            title={rail.title}
            subtitle={rail.subtitle}
            items={rail.items}
            isLoading={rail.isLoading}
            onCardClick={handleCardClick}
          />
        ))}
      </div>

      <CrossCategoryRails selectedCategory={category} onCardClick={handleCardClick} />

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
