'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventSummary } from '@/repositories/interfaces';
import { getContentDetailHref } from '@/lib/home/contentRoutes';
import {
  getContentCardDateLabel,
  getContentCardPrimaryBadge,
  getContentCardSecondaryBadge,
  getContentCardLocationLine,
  getContentCardPlaceholderEmoji,
  isRentalContent,
  RENTAL_CARD_CTA,
} from '@/lib/home/contentCardPresentation';
import { formatPublicRatingLabel, publicRatingAriaLabel } from '@/lib/reviews/ratingDisplay';
import { ExpandedContentCardOverlay, type ContentCardMetadata } from './ExpandedContentCardOverlay';
import { PriceBadge } from './PriceBadge';
import { ProducerMeta } from './ProducerMeta';

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

  const isRental = isRentalContent(item);
  const dateLabel = getContentCardDateLabel(item);
  const locationLabel = getContentCardLocationLine(item);
  const primaryBadge = getContentCardPrimaryBadge(item);
  const secondaryBadge = getContentCardSecondaryBadge(item);
  const ratingLabel = formatPublicRatingLabel(item.ratingAvg);

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
    [onClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (onClick && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick(e as unknown as React.MouseEvent);
      }
    },
    [onClick],
  );

  const cardContent = (
    <motion.article
      className="relative h-[188px] w-[280px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-[0_8px_24px_-8px_rgba(0,0,0,0.85)] sm:h-[208px] sm:w-[300px] md:h-[228px] md:w-[320px]"
      initial={false}
      animate={{
        scale: expanded ? 1.04 : 1,
        zIndex: expanded ? 20 : 0,
        boxShadow: expanded
          ? '0 24px 48px -12px rgba(0,0,0,0.9), 0 0 32px -6px rgba(34,197,94,0.18)'
          : '0 8px 24px -8px rgba(0,0,0,0.85)',
        borderColor: expanded ? 'rgba(34,197,94,0.4)' : undefined,
      }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <motion.div
        className="absolute inset-0 overflow-hidden"
        animate={{ scale: expanded ? 1.08 : 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {item.coverImageUrl ? (
          <img
            src={item.coverImageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center bg-gradient-to-br to-black ${
              isRental ? 'from-slate-800/90' : 'from-emerald-900/80'
            }`}
          >
            <span className="text-5xl opacity-70" aria-hidden>
              {getContentCardPlaceholderEmoji(item.category)}
            </span>
          </div>
        )}
      </motion.div>

      <div
        className={`absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/15 transition-opacity duration-200 ${
          expanded ? 'opacity-95' : 'opacity-88'
        }`}
        aria-hidden
      />

      {dateLabel ? (
        <div className="absolute left-3 top-3 z-10 flex flex-col items-center rounded-md border border-white/20 bg-black/70 px-2.5 py-1.5 text-center shadow-lg backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
            {new Date(item.startAt!).toLocaleDateString('es-AR', { month: 'short' })}
          </span>
          <span className="text-lg font-bold leading-none text-white tabular-nums">
            {new Date(item.startAt!).getDate()}
          </span>
        </div>
      ) : null}

      {item.gastroPromoImageUrl ? (
        <div className="absolute right-3 top-3 z-10 h-14 w-14 overflow-hidden rounded-lg border border-white/25 shadow-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.gastroPromoImageUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div
        className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-200 md:duration-150 ${
          expanded ? 'opacity-0 md:pointer-events-none' : 'opacity-100'
        }`}
      >
        {item.gastroPromoLabel ? (
          <span className="mb-2 w-fit max-w-[90%] rounded border border-amber-400/35 bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium leading-tight text-amber-50 line-clamp-1">
            Cupón · {item.gastroPromoLabel}
          </span>
        ) : null}
        <div className="mb-2 flex max-w-full flex-wrap gap-1.5">
          {primaryBadge ? (
            <span className="w-fit max-w-[90%] truncate rounded border border-white/20 bg-black/45 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white/90">
              {primaryBadge}
            </span>
          ) : null}
          {secondaryBadge ? (
            <span className="w-fit max-w-[85%] truncate rounded border border-white/15 bg-black/35 px-2 py-0.5 text-[10px] text-white/75">
              {secondaryBadge}
            </span>
          ) : null}
        </div>
        <h3 className="gateway-poster-title line-clamp-2 text-[0.95rem] font-bold leading-snug text-white sm:text-base">
          {item.title}
        </h3>
        <p className="mt-1.5 truncate text-xs font-medium uppercase tracking-wide text-white/75">
          {locationLabel}
        </p>
        {isRental ? (
          <p className="mt-1 text-[11px] font-medium text-accent/90">{RENTAL_CARD_CTA}</p>
        ) : item.producerName ? (
          <ProducerMeta producerName={item.producerName} className="mt-1" />
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PriceBadge fromPrice={isRental ? null : item.fromPrice} />
          {ratingLabel && item.ratingAvg != null && item.ratingAvg > 0 ? (
            <span
              className="text-xs font-medium text-accent"
              aria-label={publicRatingAriaLabel(item.ratingAvg)}
            >
              ★ {ratingLabel}
            </span>
          ) : null}
        </div>
      </div>

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

  return (
    <Link href={detailHref} {...commonProps}>
      {cardContent}
    </Link>
  );
}
