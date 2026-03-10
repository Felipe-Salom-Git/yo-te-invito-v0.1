'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventSummary } from '@/repositories/interfaces';
import { ExpandedContentCardOverlay, type ContentCardMetadata } from './ExpandedContentCardOverlay';

const TENANT_ID = 'tenant-demo';

function getDetailHref(event: EventSummary): string {
  const base =
    event.category === 'gastro'
      ? '/restaurants'
      : event.category === 'excursion'
        ? '/excursiones'
        : event.category === 'rental'
          ? '/rentals'
          : '/events';
  return `${base}/${event.id}?tenantId=${TENANT_ID}`;
}

export interface ContentCardItem extends EventSummary {
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  fromPrice?: number | null;
  producerName?: string | null;
}

export interface ContentCardProps {
  item: ContentCardItem;
}

export function ContentCard({ item }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const expanded = isHovered || isFocused;

  const handleBlur = useCallback(() => setIsFocused(false), []);
  const handleFocus = useCallback(() => setIsFocused(true), []);

  const dateLabel = item.startAt
    ? new Date(item.startAt).toLocaleDateString('es-AR')
    : '';
  const locationLabel = item.city ?? item.venueName ?? '—';

  const metadata: ContentCardMetadata = {
    title: item.title,
    description: item.description,
    ratingAvg: item.ratingAvg,
    ratingCount: item.ratingCount,
    fromPrice: item.fromPrice,
    producerName: item.producerName,
    venueName: item.venueName,
    city: item.city,
  };

  return (
    <Link
      href={getDetailHref(item)}
      className="group/card block flex-shrink-0 outline-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <motion.article
        className="relative h-[180px] w-[280px] overflow-hidden rounded-lg border border-border/80 bg-bg-muted shadow-lg sm:h-[200px] sm:w-[320px] md:h-[220px] md:w-[360px]"
        initial={false}
        animate={{
          scale: expanded ? 1.05 : 1,
          zIndex: expanded ? 20 : 0,
          boxShadow: expanded
            ? '0 20px 40px -12px rgba(0,0,0,0.75), 0 8px 20px -6px rgba(0,0,0,0.5), 0 0 24px -4px rgba(34,197,94,0.2)'
            : '0 4px 12px -4px rgba(0,0,0,0.4)',
          borderColor: expanded ? 'rgba(34,197,94,0.45)' : undefined,
        }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {/* Image container with zoom on hover */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          animate={{ scale: expanded ? 1.12 : 1 }}
          transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {item.coverImageUrl ? (
            <img
              src={item.coverImageUrl}
              alt={item.title}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900/80 to-black">
              <span className="text-5xl opacity-70" aria-hidden>
                🎟️
              </span>
            </div>
          )}
        </motion.div>

        {/* Default gradient overlay (always present) */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent transition-opacity duration-200 ${
            expanded ? 'opacity-90' : 'opacity-75'
          }`}
          aria-hidden
        />

        {/* Base content: visible when collapsed on desktop, always on mobile */}
        <div
          className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-200 md:duration-150 ${
            expanded ? 'opacity-0 md:pointer-events-none' : 'opacity-100'
          }`}
        >
          {item.category && (
            <span className="mb-1.5 w-fit rounded bg-accent/90 px-2 py-0.5 text-[11px] font-medium text-bg">
              {item.category}
            </span>
          )}
          <p className="line-clamp-2 text-sm font-semibold text-white">
            {item.title}
          </p>
          <div className="mt-1 flex items-center gap-3 text-[12px] text-white/80">
            <span>{dateLabel}</span>
            <span className="truncate">{locationLabel}</span>
          </div>
          {item.ratingAvg != null && item.ratingAvg > 0 && (
            <p className="mt-1 text-xs text-accent">★ {item.ratingAvg.toFixed(1)}</p>
          )}
        </div>

        {/* Expanded overlay (desktop hover/focus only) */}
        <div className="absolute inset-0 hidden md:block">
          <ExpandedContentCardOverlay metadata={metadata} isVisible={expanded} />
        </div>
      </motion.article>
    </Link>
  );
}
