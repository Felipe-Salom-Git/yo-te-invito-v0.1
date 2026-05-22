'use client';

import { getCategoryLabel } from '@/lib/home/contentRoutes';

type Props = {
  coverImageUrl?: string | null;
  logoUrl?: string | null;
  title: string;
  description?: string | null;
  starCategory?: number | null;
  city?: string | null;
  children?: React.ReactNode;
};

export function HotelPublicHero({
  coverImageUrl,
  logoUrl,
  title,
  description,
  starCategory,
  city,
  children,
}: Props) {
  const chips: string[] = [getCategoryLabel('hotel')];
  if (starCategory != null) chips.push(`${starCategory}★`);
  if (city?.trim()) chips.push(city.trim());

  return (
    <section className="relative h-[40vh] min-h-[280px] overflow-hidden bg-black md:h-[50vh] md:min-h-[400px]">
      {coverImageUrl ? (
        <img
          src={coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800/60 via-black to-black">
          <span className="text-7xl opacity-35" aria-hidden>
            🏨
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      <div className="relative flex h-full flex-col justify-end px-4 pb-12 pt-16 sm:px-6 md:px-10 md:pb-16 lg:px-16">
        {logoUrl?.trim() ? (
          <div className="mb-4 h-14 w-14 overflow-hidden rounded-full border-2 border-white/30 bg-bg-muted shadow-lg sm:h-16 sm:w-16">
            <img src={logoUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
          {title}
        </h1>
        {description?.trim() ? (
          <p className="mt-2 max-w-2xl text-base leading-relaxed text-white/75 drop-shadow sm:text-lg line-clamp-3">
            {description.trim()}
          </p>
        ) : null}
        {chips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {chips.map((label) => (
              <span
                key={label}
                className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm"
              >
                {label}
              </span>
            ))}
          </div>
        ) : null}
        {children ? <div className="mt-4">{children}</div> : null}
      </div>
    </section>
  );
}
