'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  getCategoryGatewayHref,
  CATEGORY_GATEWAY_OPTIONS,
} from '@/lib/home/categoryGatewayConfig';

/**
 * Quick entry to main category landings (4 pillars, no hotels).
 * Hidden below `md`: hero tabs already provide category navigation on mobile.
 */
export function HomeCategoryStrip() {
  return (
    <nav
      className="mx-4 mb-2 mt-2 hidden md:block sm:mx-6 lg:mx-8"
      aria-label="Explorar por categoría"
    >
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-text-muted">
        Explorar por categoría
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {CATEGORY_GATEWAY_OPTIONS.map((opt) => (
          <Link
            key={opt.id}
            href={getCategoryGatewayHref(opt.id)}
            className="group rounded-lg border border-white/10 bg-white/[0.04] px-3 py-3 transition-colors hover:border-accent/50 hover:bg-accent/10"
          >
            <motion.span
              className="block text-sm font-semibold text-white group-hover:text-accent"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              {opt.title}
            </motion.span>
            <span className="mt-1 block text-[10px] leading-snug text-white/50 line-clamp-2">
              {opt.description.split('.')[0]}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
