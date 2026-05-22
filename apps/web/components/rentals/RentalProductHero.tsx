'use client';

import {
  getContentCardCategoryBadge,
  getContentCardPlaceholderEmoji,
} from '@/lib/home/contentCardPresentation';
import { getRentalHeroSummaryText } from '@/lib/rentals/rentalSummary';

type RentalProductHeroProps = {
  coverImageUrl?: string | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  subcategoryName?: string | null;
  localName?: string | null;
  children?: React.ReactNode;
};

export function RentalProductHero({
  coverImageUrl,
  title,
  summary,
  description,
  subcategoryName,
  localName,
  children,
}: RentalProductHeroProps) {
  const heroSummary = getRentalHeroSummaryText(summary, description);

  const chips: string[] = [getContentCardCategoryBadge('rental')];
  if (subcategoryName?.trim()) chips.push(subcategoryName.trim());
  if (localName?.trim()) chips.push(localName.trim());

  return (
    <section className="relative h-[34vh] min-h-[220px] max-h-[360px] overflow-hidden bg-black sm:h-[40vh] sm:min-h-[260px] sm:max-h-none md:h-[50vh] md:min-h-[400px]">
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

      <div className="relative flex h-full flex-col justify-end px-4 pb-8 pt-14 sm:px-6 sm:pb-10 sm:pt-16 md:px-10 md:pb-16 lg:px-16">
        <h1 className="text-2xl font-bold leading-[1.15] text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.85)] sm:text-3xl sm:leading-tight md:text-4xl lg:text-5xl">
          {title}
        </h1>
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
