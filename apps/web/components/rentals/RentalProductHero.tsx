'use client';

import {
  getContentCardCategoryBadge,
  getContentCardPlaceholderEmoji,
} from '@/lib/home/contentCardPresentation';
import { getRentalHeroSummaryText } from '@/lib/rentals/rentalSummary';
import {
  PUBLIC_RENTAL_HERO_CONTENT_CLASS,
  PUBLIC_RENTAL_HERO_SECTION_CLASS,
} from '@/lib/ui/publicHeroLayout';

type RentalProductHeroProps = {
  coverImageUrl?: string | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  subcategoryName?: string | null;
  localName?: string | null;
  /** Rendered right under the title on every breakpoint (share action). */
  titleAction?: React.ReactNode;
  children?: React.ReactNode;
};

export function RentalProductHero({
  coverImageUrl,
  title,
  summary,
  description,
  subcategoryName,
  localName,
  titleAction,
  children,
}: RentalProductHeroProps) {
  const heroSummary = getRentalHeroSummaryText(summary, description);

  const chips: string[] = [getContentCardCategoryBadge('rental')];
  if (subcategoryName?.trim()) chips.push(subcategoryName.trim());
  if (localName?.trim()) chips.push(localName.trim());

  return (
    <section className={PUBLIC_RENTAL_HERO_SECTION_CLASS}>
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/90 via-black to-black">
          <span className="text-8xl opacity-40" aria-hidden>
            {getContentCardPlaceholderEmoji('rental')}
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/80 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent md:from-black/70 md:via-black/30" />

      <div className={PUBLIC_RENTAL_HERO_CONTENT_CLASS}>
        <h1 className="text-2xl font-bold leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-3xl sm:leading-tight md:text-4xl lg:text-5xl">
          {title}
        </h1>
        {titleAction ? <div className="mt-2 sm:mt-3">{titleAction}</div> : null}
        {heroSummary && (
          <p className="mt-2 max-w-2xl line-clamp-3 text-sm leading-relaxed text-white/85 drop-shadow sm:line-clamp-none sm:text-base md:text-lg">
            {heroSummary}
          </p>
        )}
        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 sm:mt-4 sm:gap-2">
            {chips.map((label) => (
              <span
                key={label}
                className="inline-flex max-w-full truncate rounded-full border border-white/25 bg-black/50 px-2.5 py-0.5 text-xs text-white/90 backdrop-blur-sm sm:px-3 sm:py-1 sm:text-sm"
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {children && (
          <div className="mt-3 hidden sm:mt-4 sm:block [&_a]:text-white/80 [&_p]:text-white/80">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
