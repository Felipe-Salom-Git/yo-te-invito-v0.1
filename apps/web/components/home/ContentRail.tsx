'use client';

import Link from 'next/link';
import { HORIZONTAL_SCROLL_RAIL_CLASS } from '@/lib/ui/horizontalScrollClasses';
import { motion } from 'framer-motion';
import type { EventSummary } from '@/repositories/interfaces';
import { CategorySectionHeading } from '@/components/categories/CategorySectionHeading';
import { RailScrollArrows } from '@/components/ui/RailScrollArrows';
import { useHorizontalRailScroll } from '@/hooks/useHorizontalRailScroll';
import { ContentCard, type ContentCardItem } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';

export interface ContentRailProps {
  title: string;
  subtitle?: string;
  /** Category landing pages use Subcategorías-style headings */
  headingVariant?: 'home' | 'category';
  items: EventSummary[];
  isLoading?: boolean;
  /** Anchor id for scroll-into-view (e.g. category gateway deep link) */
  sectionId?: string;
  /** When provided, cards open preview on click instead of navigating (homepage mode) */
  onCardClick?: (item: ContentCardItem) => void;
  /** Optional link shown next to the title (e.g. cross-category discovery) */
  seeMoreHref?: string;
  seeMoreLabel?: string;
  /** Shown when there are no items and not loading (e.g. empty event rail) */
  emptyMessage?: string;
}

export function ContentRail({
  title,
  subtitle,
  items,
  isLoading = false,
  sectionId,
  onCardClick,
  seeMoreHref,
  seeMoreLabel = 'Ver más',
  emptyMessage,
  headingVariant = 'home',
}: ContentRailProps) {
  const isCategoryHeading = headingVariant === 'category';
  const railPad = isCategoryHeading ? 'px-4 sm:px-6' : 'px-4 sm:px-6 lg:px-8';
  const { scrollRef, canScrollLeft, canScrollRight, updateScrollState, scrollByDirection } =
    useHorizontalRailScroll(400, [items.length, isLoading]);

  const railHeading = isCategoryHeading ? (
    <CategorySectionHeading title={title} subtitle={subtitle} />
  ) : (
    <div>
      <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h2>
      <div className="mt-2 h-[3px] w-12 rounded-full bg-accent" aria-hidden />
      {subtitle ? <p className="mt-2 text-sm text-text-muted">{subtitle}</p> : null}
    </div>
  );

  if (items.length === 0 && !isLoading) {
    if (emptyMessage) {
      return (
        <section id={sectionId} className={`relative mt-10 scroll-mt-24 ${railPad}`}>
          <div className="mb-4 flex items-end justify-between gap-3">
            {railHeading}
            {seeMoreHref && (
              <Link
                href={seeMoreHref}
                className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent hover:text-white"
              >
                {seeMoreLabel}
              </Link>
            )}
          </div>
          <p className="text-sm text-white/60">{emptyMessage}</p>
        </section>
      );
    }
    return null;
  }

  return (
    <motion.section
      id={sectionId}
      className="relative mt-10 scroll-mt-24 overflow-visible first:mt-0"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      <div className={`mb-4 flex items-end justify-between gap-3 ${railPad}`}>
        {railHeading}
        {seeMoreHref && (
          <Link
            href={seeMoreHref}
            className="shrink-0 text-xs font-bold uppercase tracking-wider text-accent hover:text-white"
          >
            {seeMoreLabel}
          </Link>
        )}
      </div>

      {/* Scroll container with edge fades */}
      <div className="relative">
        {/* Left edge fade — black → transparent, no pointer block */}
        <div
          className={`pointer-events-none absolute left-0 top-0 z-20 h-full w-20 bg-gradient-to-r from-bg via-bg/60 to-transparent transition-opacity duration-300 ${
            canScrollLeft ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden
        />
        {/* Right edge fade — cinematic catalog feel */}
        <div
          className={`pointer-events-none absolute right-0 top-0 z-20 h-full w-20 bg-gradient-to-l from-bg via-bg/60 to-transparent transition-opacity duration-300 ${
            canScrollRight || items.length > 0 ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden
        />

        {/* Scroll arrows — aligned with rail padding, z-50 above cards */}
        <RailScrollArrows
          label={title}
          canScrollLeft={canScrollLeft}
          canScrollRight={canScrollRight}
          onScroll={scrollByDirection}
          paddingClassName={railPad}
        />

        {/* Cards row — extra side padding to reduce edge overlap with arrows */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className={`${HORIZONTAL_SCROLL_RAIL_CLASS} gap-5 py-4 pb-8 ${railPad}`}
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <ContentCardSkeleton key={i} />
            ))
          ) : (
            items.map((ev) => (
              <ContentCard
                key={ev.id}
                item={ev as ContentCardItem}
                onClick={onCardClick ? () => onCardClick(ev as ContentCardItem) : undefined}
              />
            ))
          )}
        </div>
      </div>
    </motion.section>
  );
}
