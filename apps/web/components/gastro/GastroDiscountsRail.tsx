'use client';

import { useRef, useState, useEffect } from 'react';
import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';
import { CategorySectionHeading } from '@/components/categories/CategorySectionHeading';
import { GastroDiscountPublicCard } from './GastroDiscountPublicCard';

export function GastroDiscountsRail({
  title,
  subtitle,
  discounts,
  isLoading,
}: {
  title: string;
  subtitle?: string;
  discounts: PublicGastroDiscountListItem[];
  isLoading?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 0);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  };

  useEffect(() => {
    updateScroll();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => ro.disconnect();
  }, [discounts.length, isLoading]);

  if (!isLoading && discounts.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-3 px-4 sm:px-6">
        <CategorySectionHeading title={title} subtitle={subtitle} />
      </div>
      {isLoading ? (
        <div className="flex gap-3 overflow-hidden px-4 sm:px-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[280px] w-[220px] shrink-0 animate-pulse rounded-xl bg-white/5 sm:w-[240px]"
            />
          ))}
        </div>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScroll}
            className="scrollbar-hide flex gap-3 overflow-x-auto px-4 pb-2 sm:px-6"
          >
            {discounts.map((d) => (
              <GastroDiscountPublicCard key={d.id} discount={d} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
