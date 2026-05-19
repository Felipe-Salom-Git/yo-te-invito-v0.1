'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { SUBCATEGORY_QUERY_PARAM } from '@/lib/home/categoryGatewayConfig';
import type { PublicSubcategorySummary } from '@/repositories/interfaces';
import { SubcategoryCard } from './SubcategoryCard';

export interface SubcategoryRailProps {
  category: CategoryGatewayId;
  items: PublicSubcategorySummary[];
  activeSlug?: string | null;
  isLoading?: boolean;
}

export function SubcategoryRail({
  category,
  items,
  activeSlug,
  isLoading = false,
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
  }, [items.length, isLoading]);

  const baseHref = `/categoria/${category}`;

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-end justify-between gap-3 px-4 sm:px-6">
        <div>
          <h2 className="text-lg font-black uppercase tracking-tight text-white sm:text-xl">
            Subcategorías
          </h2>
          <div className="mt-1.5 h-[3px] w-10 bg-accent" aria-hidden />
        </div>
        <Link
          href={baseHref}
          className={`text-xs font-semibold uppercase tracking-wide ${
            !activeSlug ? 'text-accent' : 'text-white/60 hover:text-white'
          }`}
        >
          Ver todas
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-2 overflow-hidden px-4 sm:px-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[168px] w-[132px] shrink-0 animate-pulse bg-white/10" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="px-4 text-sm text-white/60 sm:px-6">
          Todavía no hay subcategorías disponibles para esta categoría.
        </p>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScroll}
            className="scrollbar-hide flex gap-2 overflow-x-auto px-4 pb-1 sm:px-6"
          >
            {items.map((item) => {
              const href = `${baseHref}?${SUBCATEGORY_QUERY_PARAM}=${encodeURIComponent(item.slug)}`;
              return (
                <SubcategoryCard
                  key={item.id}
                  item={item}
                  href={href}
                  isActive={activeSlug === item.slug}
                />
              );
            })}
          </div>
          {canLeft && (
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
              className="absolute left-1 top-1/2 hidden -translate-y-1/2 rounded-full border border-white/20 bg-black/70 px-2 py-1 text-white sm:block"
            >
              ←
            </button>
          )}
          {canRight && (
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
      )}
    </section>
  );
}
