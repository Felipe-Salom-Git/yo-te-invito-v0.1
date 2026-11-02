'use client';

import { HORIZONTAL_SCROLL_RAIL_CLASS } from '@/lib/ui/horizontalScrollClasses';
import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';
import { CategorySectionHeading } from '@/components/categories/CategorySectionHeading';
import { RailScrollArrows } from '@/components/ui/RailScrollArrows';
import { useHorizontalRailScroll } from '@/hooks/useHorizontalRailScroll';
import { GastroDiscountPublicCard } from './GastroDiscountPublicCard';

const RAIL_PAD = 'px-4 sm:px-6';

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
  const { scrollRef, canScrollLeft, canScrollRight, updateScrollState, scrollByDirection } =
    useHorizontalRailScroll(500, [discounts.length, isLoading]);

  if (!isLoading && discounts.length === 0) return null;

  return (
    <section className="mt-10">
      <div className={`mb-3 ${RAIL_PAD}`}>
        <CategorySectionHeading title={title} subtitle={subtitle} />
      </div>
      {isLoading ? (
        <div className={`flex gap-3 overflow-hidden ${RAIL_PAD}`}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[280px] w-[220px] shrink-0 animate-pulse rounded-xl bg-white/5 sm:w-[240px]"
            />
          ))}
        </div>
      ) : (
        <div className="relative">
          <RailScrollArrows
            label={title}
            canScrollLeft={canScrollLeft}
            canScrollRight={canScrollRight}
            onScroll={scrollByDirection}
            paddingClassName={RAIL_PAD}
          />
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className={`${HORIZONTAL_SCROLL_RAIL_CLASS} gap-3 pb-2 ${RAIL_PAD}`}
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
