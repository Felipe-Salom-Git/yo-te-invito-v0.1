'use client';

import { motion } from 'framer-motion';
import type { CategoryGatewayOption } from '@/lib/home/categoryGatewayConfig';
import { gatewayTileVariants } from './categoryGatewayMotion';

export interface CategoryGatewayTileProps {
  option: CategoryGatewayOption;
  onSelect: (id: CategoryGatewayOption['id']) => void;
}

export function CategoryGatewayTile({ option, onSelect }: CategoryGatewayTileProps) {
  return (
    <motion.button
      type="button"
      variants={gatewayTileVariants}
      onClick={() => onSelect(option.id)}
      aria-label={`${option.title}: ${option.description}`}
      className="group relative h-full min-h-0 w-full overflow-hidden bg-neutral-900 text-left transition-[filter] duration-300 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent active:brightness-95"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <motion.img
        src={option.imageSrc}
        alt={option.imageAlt}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        loading="lazy"
        decoding="async"
      />

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"
        aria-hidden
      />

      <div className="absolute inset-x-0 bottom-0 p-2 sm:p-2.5">
        <h2 className="text-sm font-black uppercase leading-none tracking-tight text-white sm:text-base">
          {option.title}
        </h2>
        <div
          className="mt-1 h-[2px] w-6 bg-accent transition-[width] duration-300 group-hover:w-8"
          aria-hidden
        />
        <p className="mt-1 line-clamp-2 text-[0.55rem] font-semibold uppercase leading-tight tracking-wide text-white/85 sm:text-[0.6rem]">
          {option.description}
        </p>
      </div>
    </motion.button>
  );
}
