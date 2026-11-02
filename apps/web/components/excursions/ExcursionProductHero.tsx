'use client';

import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { getRentalHeroSummaryText } from '@/lib/rentals/rentalSummary';
import { PUBLIC_DETAIL_HERO_CONTENT_CLASS, PUBLIC_DETAIL_HERO_SECTION_CLASS } from '@/lib/ui/publicHeroLayout';

type ExcursionProductHeroProps = {
  coverImageUrl?: string | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  subcategoryName?: string | null;
  operatorName?: string | null;
  /** Rendered right under the title (share action). */
  titleAction?: React.ReactNode;
  children?: React.ReactNode;
};

export function ExcursionProductHero({
  coverImageUrl,
  title,
  summary,
  description,
  subcategoryName,
  operatorName,
  titleAction,
  children,
}: ExcursionProductHeroProps) {
  const heroSummary = getRentalHeroSummaryText(summary, description);

  const subcategory = subcategoryName?.trim() ?? null;
  const operator = operatorName?.trim() ?? null;

  return (
    <section className={PUBLIC_DETAIL_HERO_SECTION_CLASS}>
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sky-900/40 via-black to-black">
          <span className="text-8xl opacity-40" aria-hidden>
            🏔️
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      <div className={PUBLIC_DETAIL_HERO_CONTENT_CLASS}>
        <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {titleAction ? <div className="mt-3">{titleAction}</div> : null}
        {heroSummary && (
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/85 drop-shadow sm:text-lg md:max-w-3xl">
            {heroSummary}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {subcategory ? (
            <span className="inline-flex rounded-full bg-accent/90 px-3 py-1 text-sm font-medium text-bg">
              {subcategory}
            </span>
          ) : (
            <span className="inline-flex rounded-full border border-white/25 bg-black/40 px-3 py-1 text-sm text-white/90 backdrop-blur-sm">
              {getCategoryLabel('excursion')}
            </span>
          )}
          {operator ? (
            <span className="text-sm text-white/70">
              por <span className="font-medium text-white">{operator}</span>
            </span>
          ) : null}
        </div>
        {children && <div className="mt-4 [&_a]:text-white/80 [&_p]:text-white/80">{children}</div>}
      </div>
    </section>
  );
}
