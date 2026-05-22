'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import { CATEGORY_LANDING_META } from '@/lib/categories/categoryLandingConfig';
import type { CategoryBannerResolvedItem } from '@/repositories/interfaces';
import { mapCategoryBannerToHeroModel } from '@/lib/categories/categoryBannerModel';
import type { HeroViewModel } from '@/lib/home/heroModel';

/** Más bajo que el hero de home: deja filtros + primer carrusel visibles sin scroll. */
const HERO_HEIGHT =
  'relative h-[34vh] min-h-[220px] max-h-[320px] overflow-hidden bg-black sm:min-h-[240px] sm:max-h-[340px] md:max-h-[360px]';

const HERO_CONTENT_PAD = 'px-4 pb-10 sm:px-6 sm:pb-12 md:px-10 md:pb-14 lg:px-16';

export interface CategoryHeroBannerProps {
  category: CategoryGatewayId;
  items: CategoryBannerResolvedItem[];
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
          <span className="text-4xl opacity-60" aria-hidden>
            ✦
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 to-black/35" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/45 to-transparent" />
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
      <h1 className="mt-0.5 text-2xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] sm:text-3xl md:text-4xl">
        {model.title}
      </h1>
      {(model.description || locationLabel || dateLabel) && (
        <p className="mt-2 max-w-lg text-sm text-white/90 line-clamp-1 sm:text-base">
          {model.description ??
            [locationLabel, dateLabel].filter(Boolean).join(' · ')}
        </p>
      )}
      {model.producerName && (
        <p className="mt-1.5 hidden text-xs font-medium uppercase tracking-wider text-white/70 sm:block">
          {model.producerName}
        </p>
      )}
    </div>
  );
}

function HeroCTAs({ model }: { model: HeroViewModel }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2 sm:mt-4 sm:gap-3">
      <Link
        href={model.detailHref}
        className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-md transition-all hover:bg-accent-hover sm:px-5 sm:py-2.5"
      >
        {model.primaryCtaLabel}
      </Link>
      <Link
        href={model.detailHref}
        className="hidden rounded-lg border border-white/40 bg-white/5 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:inline-flex sm:px-5 sm:py-2.5"
      >
        {model.secondaryCtaLabel}
      </Link>
    </div>
  );
}

function CategoryHeroEmpty({ category }: { category: CategoryGatewayId }) {
  const meta = CATEGORY_LANDING_META[category];
  return (
    <section className={HERO_HEIGHT}>
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/25 via-black to-black" />
      <div className={`relative flex h-full flex-col justify-end ${HERO_CONTENT_PAD}`}>
        <Link
          href="/"
          className="mb-3 text-xs font-medium uppercase tracking-widest text-white/50 hover:text-accent"
        >
          &larr; Inicio
        </Link>
        <span className="text-xs font-medium uppercase tracking-wider text-accent">
          {meta.title}
        </span>
        <h1 className="gateway-poster-title mt-1 text-2xl text-white sm:text-3xl">
          {meta.title}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/70 line-clamp-2">{meta.subtitle}</p>
        <p className="mt-2 text-xs text-white/50 sm:text-sm">
          Próximamente vas a encontrar novedades en esta categoría.
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-bg to-transparent" />
    </section>
  );
}

function CategoryHeroBannerSlider({
  models,
  index,
  onIndexChange,
}: {
  models: HeroViewModel[];
  index: number;
  onIndexChange: (next: number) => void;
}) {
  const canPrev = index > 0;
  const canNext = index < models.length - 1;

  return (
    <div className="absolute bottom-12 right-4 z-10 flex items-center gap-2 sm:bottom-14 sm:right-6 md:right-10 lg:right-16">
      <button
        type="button"
        onClick={() => onIndexChange(Math.max(0, index - 1))}
        disabled={!canPrev}
        aria-label="Anterior"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
      >
        ←
      </button>
      <span className="text-xs text-white/70">
        {index + 1} / {models.length}
      </span>
      <button
        type="button"
        onClick={() => onIndexChange(Math.min(models.length - 1, index + 1))}
        disabled={!canNext}
        aria-label="Siguiente"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-black/50 text-white transition-colors hover:bg-white/20 disabled:opacity-30"
      >
        →
      </button>
    </div>
  );
}

export function CategoryHeroBanner({ category, items, isLoading }: CategoryHeroBannerProps) {
  const meta = CATEGORY_LANDING_META[category];
  const models = useMemo(
    () => items.slice(0, 5).map((item) => mapCategoryBannerToHeroModel(item)),
    [items],
  );
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const model = models[index] ?? null;

  useEffect(() => {
    setIndex(0);
  }, [category, items]);

  useEffect(() => {
    if (models.length <= 1 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % models.length);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [models.length, paused]);

  const handleDotClick = useCallback((i: number) => setIndex(i), []);

  if (isLoading) {
    return (
      <section className={HERO_HEIGHT}>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-black to-black" />
        <div className={`relative flex h-full items-end ${HERO_CONTENT_PAD}`}>
          <div className="max-w-2xl animate-pulse">
            <div className="h-3 w-20 rounded bg-white/10" />
            <div className="mt-3 h-8 w-3/4 rounded bg-white/10" />
            <div className="mt-2 h-4 w-1/2 rounded bg-white/10" />
          </div>
        </div>
      </section>
    );
  }

  if (!model) {
    return <CategoryHeroEmpty category={category} />;
  }

  return (
    <section
      className={HERO_HEIGHT}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={model.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0"
        >
          <HeroBackground model={model} />
        </motion.div>
      </AnimatePresence>

      <div className="absolute left-0 right-0 top-3 z-10 px-4 sm:top-4 sm:px-6 md:px-10 lg:px-16">
        <Link
          href="/"
          className="text-[10px] font-medium uppercase tracking-widest text-white/60 hover:text-accent sm:text-xs"
        >
          &larr; Inicio
        </Link>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-accent/90 sm:mt-2 sm:text-xs">
          {meta.title}
        </p>
      </div>

      <div className={`relative flex h-full items-end ${HERO_CONTENT_PAD}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={model.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.25 }}
          >
            <HeroContent model={model} />
            <HeroCTAs model={model} />
          </motion.div>
        </AnimatePresence>

        {models.length > 1 && (
          <CategoryHeroBannerSlider models={models} index={index} onIndexChange={setIndex} />
        )}
      </div>

      {models.length > 1 && (
        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-2 sm:bottom-4">
          {models.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-label={`Ir al banner ${i + 1}`}
              onClick={() => handleDotClick(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-8 bg-accent' : 'w-3 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-bg to-transparent sm:h-24" />
    </section>
  );
}
