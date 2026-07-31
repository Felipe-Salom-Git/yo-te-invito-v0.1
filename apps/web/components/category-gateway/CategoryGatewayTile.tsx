'use client';

import { motion } from 'framer-motion';
import type { CategoryGatewayOption } from '@/lib/home/categoryGatewayConfig';
import { gatewayTileVariants } from './categoryGatewayMotion';

export interface CategoryGatewayTileProps {
  option: CategoryGatewayOption;
  onSelect: (id: CategoryGatewayOption['id']) => void;
  comingSoon?: boolean;
  /** When coming soon, ADMIN may still open the category. */
  allowPreview?: boolean;
}

export function CategoryGatewayTile({
  option,
  onSelect,
  comingSoon = false,
  allowPreview = false,
}: CategoryGatewayTileProps) {
  const locked = comingSoon && !allowPreview;

  return (
    <motion.button
      type="button"
      variants={gatewayTileVariants}
      onClick={() => {
        if (locked) return;
        onSelect(option.id);
      }}
      aria-label={
        comingSoon
          ? `${option.title}: Próximamente`
          : `${option.title}: ${option.description}`
      }
      aria-disabled={locked || undefined}
      className={`group relative h-full min-h-0 w-full touch-manipulation overflow-hidden bg-neutral-900 text-left transition-[filter] duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent ${
        locked
          ? 'cursor-default'
          : 'hover:brightness-110 active:brightness-95'
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src={option.imageSrc}
        alt={option.imageAlt}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ${
          locked ? 'scale-100 grayscale-[0.35]' : 'group-hover:scale-[1.02]'
        }`}
        loading="lazy"
        decoding="async"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15"
        aria-hidden
      />

      {comingSoon ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45">
          <span className="rounded border border-white/25 bg-black/55 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white">
            Próximamente
          </span>
        </div>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
        <h2 className="text-[0.8rem] font-black uppercase leading-none tracking-tight text-white sm:text-base md:text-lg">
          {option.title}
        </h2>
        <div
          className="mt-1 h-[2px] w-6 bg-accent transition-[width] duration-300 group-hover:w-8"
          aria-hidden
        />
        <p className="mt-1 line-clamp-3 text-[0.58rem] font-semibold uppercase leading-tight tracking-wide text-white/90 sm:line-clamp-2 sm:text-[0.62rem] md:text-[0.68rem]">
          {comingSoon ? 'Disponible pronto.' : option.description}
        </p>
      </div>
    </motion.button>
  );
}
