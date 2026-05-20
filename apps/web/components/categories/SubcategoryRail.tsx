'use client';

import type { ReactNode } from 'react';
import { useRef, useState, useEffect } from 'react';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { SUBCATEGORY_QUERY_PARAM } from '@/lib/home/categoryGatewayConfig';
import type { PublicSubcategorySummary } from '@/repositories/interfaces';
import { CategorySectionHeading } from './CategorySectionHeading';
import { SubcategoryCard } from './SubcategoryCard';
import { SubcategoryFilterChip } from './SubcategoryFilterChip';

export interface SubcategoryRailProps {
  category: CategoryGatewayId;
  items: PublicSubcategorySummary[];
  activeSlug?: string | null;
  isLoading?: boolean;
  /** Controles alineados a la derecha, misma fila que los chips */
  trailing?: ReactNode;
}

const SKELETON_CHIP_CLASS =
  'h-[84px] w-[108px] shrink-0 animate-pulse border border-white/10 bg-white/5 sm:h-[88px] sm:w-[116px]';

export function SubcategoryRail({
  category,
  items,
  activeSlug,
  isLoading = false,
  trailing,
}: SubcategoryRailProps) {
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
  }, [items.length, isLoading, trailing]);

  const baseHref = `/categoria/${category}`;
  const allActive = !activeSlug?.trim();

  return (
    <section className="mt-3 sm:mt-4">
      <div className="mb-2 px-4 sm:px-6">
        <CategorySectionHeading title="Subcategorías" />
      </div>

      {isLoading ? (
        <div className="flex gap-2 overflow-hidden px-4 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={SKELETON_CHIP_CLASS} />
          ))}
        </div>
      ) : items.length === 0 && !trailing ? (
        <p className="px-4 text-sm text-white/60 sm:px-6">
          Todavía no hay subcategorías disponibles para esta categoría.
        </p>
      ) : (
        <div className="flex items-center gap-3 px-4 pb-1 sm:px-6">
          <div className="relative min-w-0 flex-1">
            <div
              ref={scrollRef}
              onScroll={updateScroll}
              className="scrollbar-hide flex gap-2 overflow-x-auto"
            >
              <SubcategoryFilterChip
                href={baseHref}
                title="Todos"
                subtitle="Ver todo"
                isActive={allActive}
              />

              {items.map((item) => {
                const isActive = activeSlug === item.slug;
                const href = isActive
                  ? baseHref
                  : `${baseHref}?${SUBCATEGORY_QUERY_PARAM}=${encodeURIComponent(item.slug)}`;
                return (
                  <SubcategoryCard
                    key={item.id}
                    item={item}
                    href={href}
                    isActive={isActive}
                  />
                );
              })}
            </div>
            {canLeft && !trailing && (
              <button
                type="button"
                aria-label="Anterior"
                onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
                className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-white sm:block"
              >
                ←
              </button>
            )}
            {canRight && !trailing && (
              <button
                type="button"
                aria-label="Siguiente"
                onClick={() => scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
                className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-white sm:block"
              >
                →
              </button>
            )}
          </div>
          {trailing ? <div className="flex shrink-0 flex-col items-end gap-2">{trailing}</div> : null}
        </div>
      )}
    </section>
  );
}
