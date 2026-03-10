'use client';

import { useRef, useState, useEffect } from 'react';
import type { EventSummary } from '@/repositories/interfaces';
import { EventCard, EventCardSkeleton } from '@/components/home/EventCard';

export type CarouselProps = {
  title: string;
  items: EventSummary[];
  isLoading?: boolean;
};

export function Carousel({ title, items, isLoading }: CarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
    setTimeout(updateScrollState, 300);
  };

  useEffect(() => {
    updateScrollState();
  }, [items.length, isLoading]);

  if (items.length === 0 && !isLoading) return null;

  return (
    <section className="relative mt-8 overflow-visible">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      <div className="relative mt-3 overflow-visible">
        {/* Arrows centered on the sides of the container with smooth hover */}
        <div className="pointer-events-none absolute inset-y-0 left-0 right-0 z-10 flex items-center justify-between px-0">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg/90 text-text-muted shadow-md transition-all duration-200 hover:scale-110 hover:border-accent hover:bg-bg hover:text-accent disabled:opacity-30"
            aria-label="Scroll left"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg/90 text-text-muted shadow-md transition-all duration-200 hover:scale-110 hover:border-accent hover:bg-bg hover:text-accent disabled:opacity-30"
            aria-label="Scroll right"
          >
            →
          </button>
        </div>
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-4 overflow-x-auto overflow-y-visible py-6 scrollbar-hide"
        >
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <EventCardSkeleton key={i} />
            ))
          ) : (
            items.map((ev) => <EventCard key={ev.id} event={ev} />)
          )}
        </div>
      </div>
    </section>
  );
}
