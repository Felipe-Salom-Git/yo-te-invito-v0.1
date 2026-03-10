'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { HeroViewModel } from '@/lib/home/heroModel';
import { mapFeaturedItemToHeroModel } from '@/lib/home/heroModel';

type FeaturedItem = {
  id: string;
  title: string;
  startAt?: string;
  city?: string | null;
  venueName?: string | null;
  coverImageUrl?: string | null;
  category?: string;
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  fromPrice?: number | null;
  producerName?: string | null;
};

export interface HomeHeroProps {
  /** Featured items for hero — from highlights/trending */
  featuredItems: FeaturedItem[];
  isLoading?: boolean;
}

function HeroBackground({ model }: { model: HeroViewModel }) {
  return (
    <div className="absolute inset-0">
      {model.coverImageUrl ? (
        <img
          src={model.coverImageUrl}
          alt=""
          className="h-full w-full object-cover object-center"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/40 via-black to-black">
          <span className="text-6xl opacity-60" aria-hidden>🎟️</span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
    </div>
  );
}

function HeroContent({ model }: { model: HeroViewModel }) {
  const dateLabel = model.startAt
    ? new Date(model.startAt).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;
  const locationLabel = model.city ?? model.venueName ?? null;

  return (
    <div className="max-w-2xl">
      <span className="text-xs font-medium uppercase tracking-wider text-accent">
        {model.categoryLabel}
      </span>
      <h1 className="mt-1 text-3xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-4xl md:text-5xl lg:text-6xl">
        {model.title}
      </h1>
      {(model.description || locationLabel || dateLabel) && (
        <p className="mt-3 max-w-lg text-base text-white/90 sm:text-lg md:text-xl line-clamp-2">
          {model.description ??
            [locationLabel, dateLabel].filter(Boolean).join(' · ')}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-white/80">
        {model.ratingAvg != null && model.ratingAvg > 0 && (
          <span className="text-accent">★ {model.ratingAvg.toFixed(1)}</span>
        )}
        {model.producerName && <span>{model.producerName}</span>}
        {model.fromPrice != null && model.fromPrice > 0 && (
          <span>Desde ${model.fromPrice.toLocaleString('es-AR')}</span>
        )}
      </div>
    </div>
  );
}

function HeroCTAGroup({
  model,
}: {
  model: HeroViewModel;
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-3 sm:gap-4">
      <Link
        href={model.detailHref}
        className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg shadow-lg shadow-accent/25 transition-all hover:bg-accent-hover hover:shadow-accent/40 sm:px-6 sm:py-3"
      >
        {model.primaryCtaLabel}
      </Link>
      <Link
        href="/explore"
        className="rounded-lg border border-white/40 bg-white/5 px-5 py-2.5 font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:px-6 sm:py-3"
      >
        {model.secondaryCtaLabel}
      </Link>
    </div>
  );
}

export function HomeHero({
  featuredItems,
  isLoading = false,
}: HomeHeroProps) {
  const [index, setIndex] = useState(0);
  const candidates = useMemo(
    () => featuredItems.slice(0, 6).map(mapFeaturedItemToHeroModel),
    [featuredItems]
  );
  const model = candidates[index] ?? null;

  const canPrev = index > 0;
  const canNext = index < candidates.length - 1;

  if (isLoading || candidates.length === 0) {
    return (
      <section className="relative h-[72vh] min-h-[520px] overflow-hidden bg-black md:min-h-[560px]">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-black" />
        <div className="relative flex h-full items-end px-4 pb-20 sm:px-6 md:px-10 md:pb-24 lg:px-16">
          <div className="max-w-2xl animate-pulse">
            <div className="h-4 w-24 rounded bg-white/10" />
            <div className="mt-4 h-10 w-3/4 rounded bg-white/10" />
            <div className="mt-3 h-6 w-1/2 rounded bg-white/10" />
            <div className="mt-8 flex gap-4">
              <div className="h-12 w-32 rounded-lg bg-white/10" />
              <div className="h-12 w-28 rounded-lg bg-white/10" />
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-bg to-transparent" />
      </section>
    );
  }

  return (
    <section className="relative h-[72vh] min-h-[520px] overflow-hidden bg-black md:min-h-[560px]">
      <AnimatePresence mode="wait">
        <motion.div
          key={model.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0"
        >
          <HeroBackground model={model} />
        </motion.div>
      </AnimatePresence>

      <div className="relative flex h-full items-end px-4 pb-20 sm:px-6 md:px-10 md:pb-24 lg:px-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <HeroContent model={model} />
            <HeroCTAGroup model={model} />
          </motion.div>
        </AnimatePresence>

        {/* Manual hero controls — only when multiple candidates */}
        {candidates.length > 1 && (
          <div className="absolute bottom-20 right-4 flex items-center gap-2 sm:bottom-24 sm:right-6 md:right-10 lg:right-16">
            <button
              type="button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={!canPrev}
              aria-label="Hero anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-black/50"
            >
              ←
            </button>
            <span className="text-xs text-white/70">
              {index + 1} / {candidates.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setIndex((i) => Math.min(candidates.length - 1, i + 1))
              }
              disabled={!canNext}
              aria-label="Hero siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition-colors hover:bg-white/20 disabled:opacity-30 disabled:hover:bg-black/50"
            >
              →
            </button>
          </div>
        )}
      </div>

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-bg to-transparent" />
    </section>
  );
}
