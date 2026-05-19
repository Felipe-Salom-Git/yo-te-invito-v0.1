'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventSummary } from '@/repositories/interfaces';
import { getContentDetailHref } from '@/lib/home/contentRoutes';
import { ExpandedContentCardOverlay, type ContentCardMetadata } from './ExpandedContentCardOverlay';

export interface ContentCardItem extends EventSummary {
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  fromPrice?: number | null;
  producerName?: string | null;
}

export interface ContentCardProps {
  item: ContentCardItem;
  /** When provided, card opens preview on click instead of navigating (homepage mode) */
  onClick?: (e: React.MouseEvent) => void;
  /** Optional tenant for detail links; uses default when omitted */
  tenantId?: string;
}

export function ContentCard({ item, onClick, tenantId }: ContentCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const expanded = isHovered || isFocused;

  const handleBlur = useCallback(() => setIsFocused(false), []);
  const handleFocus = useCallback(() => setIsFocused(true), []);

  const dateLabel = item.startAt
    ? new Date(item.startAt).toLocaleDateString('es-AR')
    : '';
  const locationLabel = item.city ?? item.venueName ?? '—';

  const detailHref = getContentDetailHref(item, tenantId);
  const metadata: ContentCardMetadata = {
    title: item.title,
    description: item.description,
    ratingAvg: item.ratingAvg,
    ratingCount: item.ratingCount,
    fromPrice: item.fromPrice,
    producerName: item.producerName,
    venueName: item.venueName,
    city: item.city,
    detailHref,
    category: item.category,
  };

  const commonProps = {
    className: 'group/card block flex-shrink-0 outline-none',
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
    onFocus: handleFocus,
    onBlur: handleBlur,
  };

  const handleCardClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onClick?.(e);
    },
    [onClick]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent);
      }
    },
    [onClick]
  );

  const cardContent = (
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

        {item.gastroPromoImageUrl ? (
          <div className="absolute right-3 top-3 z-10 h-16 w-16 overflow-hidden rounded-lg border border-white/25 shadow-md">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.gastroPromoImageUrl} alt="" className="h-full w-full object-cover" />
          </div>
        ) : null}

        {/* Base content: visible when collapsed on desktop, always on mobile */}
        <div
          className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-200 md:duration-150 ${
            expanded ? 'opacity-0 md:pointer-events-none' : 'opacity-100'
          }`}
        >
          {item.gastroPromoLabel ? (
            <span className="mb-1.5 w-fit max-w-[90%] rounded border border-amber-400/45 bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium leading-tight text-amber-50 line-clamp-2">
              Cupón · {item.gastroPromoLabel}
            </span>
          ) : null}
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
  );

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        {...commonProps}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
      >
        {cardContent}
      </div>
    );
  }

  return <Link href={detailHref} {...commonProps}>{cardContent}</Link>;
}
