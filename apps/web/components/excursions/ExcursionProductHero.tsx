'use client';

import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { getRentalHeroSummaryText } from '@/lib/rentals/rentalSummary';

type ExcursionProductHeroProps = {
  coverImageUrl?: string | null;
  title: string;
  summary?: string | null;
  description?: string | null;
  subcategoryName?: string | null;
  operatorName?: string | null;
  children?: React.ReactNode;
};

export function ExcursionProductHero({
  coverImageUrl,
  title,
  summary,
  description,
  subcategoryName,
  operatorName,
  children,
}: ExcursionProductHeroProps) {
  const heroSummary = getRentalHeroSummaryText(summary, description);

  const chips: string[] = [getCategoryLabel('excursion')];
  if (subcategoryName?.trim()) chips.push(subcategoryName.trim());
  if (operatorName?.trim()) chips.push(operatorName.trim());

  return (
    <section className="relative h-[40vh] min-h-[280px] overflow-hidden bg-black md:h-[50vh] md:min-h-[400px]">
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

      <div className="relative flex h-full flex-col justify-end px-4 pb-12 pt-16 sm:px-6 md:px-10 md:pb-16 lg:px-16">
        <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {heroSummary && (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/75 drop-shadow sm:text-lg">
            {heroSummary}
          </p>
        )}
        {chips.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((label) => (
              <span
                key={label}
                className="inline-flex rounded-full border border-white/25 bg-black/40 px-3 py-1 text-sm text-white/90 backdrop-blur-sm"
              >
                {label}
              </span>
            ))}
          </div>
        )}
        {children && <div className="mt-4 [&_a]:text-white/80 [&_p]:text-white/80">{children}</div>}
      </div>
    </section>
  );
}
