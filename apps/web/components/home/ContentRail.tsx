'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventSummary } from '@/repositories/interfaces';
import { ContentCard, type ContentCardItem } from './ContentCard';
import { ContentCardSkeleton } from './ContentCardSkeleton';

export interface ContentRailProps {
  title: string;
  subtitle?: string;
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
}: ContentRailProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(
      el.scrollLeft < el.scrollWidth - el.clientWidth - 1
    );
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: dir === 'left' ? -400 : 400,
      behavior: 'smooth',
    });
    setTimeout(updateScrollState, 350);
  };

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items.length, isLoading]);

  if (items.length === 0 && !isLoading) {
    if (emptyMessage) {
      return (
        <section id={sectionId} className="relative mt-10 scroll-mt-24 px-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">{title}</h2>
              <div className="mt-2 h-[3px] w-12 rounded-full bg-accent" aria-hidden />
              {subtitle && <p className="mt-2 text-sm text-text-muted">{subtitle}</p>}
            </div>
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
      <div className="mb-4 flex items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-white md:text-2xl">
            {title}
          </h2>
          <div className="mt-2 h-[3px] w-12 rounded-full bg-accent" aria-hidden />
          {subtitle && (
            <p className="mt-2 text-sm text-text-muted">{subtitle}</p>
          )}
        </div>
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
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-50 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg/95 text-text-muted shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-accent/50 hover:bg-bg hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:pointer-events-none disabled:opacity-0 sm:h-12 sm:w-12"
            aria-label={`Scroll ${title} left`}
          >
            <span className="text-xl">←</span>
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg/95 text-text-muted shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-accent/50 hover:bg-bg hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:pointer-events-none disabled:opacity-0 sm:h-12 sm:w-12"
            aria-label={`Scroll ${title} right`}
          >
            <span className="text-xl">→</span>
          </button>
        </div>

        {/* Cards row — extra side padding to reduce edge overlap with arrows */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-5 overflow-x-auto overflow-y-visible px-4 py-4 pb-8 sm:px-6 lg:px-8 scrollbar-hide"
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
