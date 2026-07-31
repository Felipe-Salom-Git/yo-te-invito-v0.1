'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import type { EventSummary } from '@/repositories/interfaces';
import { getContentDetailHref } from '@/lib/home/contentRoutes';
import {
  getContentCardPresentation,
  getContentCardPlaceholderEmoji,
  isExcursionContent,
  isGastroContent,
  isRentalContent,
  shouldEmphasizeCardRating,
} from '@/lib/home/contentCardPresentation';
import { formatPublicRatingLabel, publicFaceFromTen, publicRatingAriaLabel } from '@/lib/reviews/ratingDisplay';
import { ExpandedContentCardOverlay, type ContentCardMetadata } from './ExpandedContentCardOverlay';
import {
  CONTENT_CARD_MAX_VISIBLE_TAGS,
  ContentTagChips,
} from '@/components/content-tags/ContentTagChips';

export interface ContentCardItem extends EventSummary {
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  fromPrice?: number | null;
  producerName?: string | null;
  /** Excursion schedule fields — optional on list payloads */
  durationText?: string | null;
  departureTime?: string | null;
  availableDaysText?: string | null;
  scheduleNotes?: string | null;
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
  const isExcursion = isExcursionContent(item);
  const isGastro = isGastroContent(item);

  const presentation = getContentCardPresentation(item);
  const {
    primaryBadge,
    secondaryBadge,
    compactSummary,
    showRatingInCompact,
    showTagsInCompact,
  } = presentation;
  const ratingLabel = formatPublicRatingLabel(item.ratingAvg);
  const ratingFace = publicFaceFromTen(item.ratingAvg);
  const emphasizeRating = shouldEmphasizeCardRating(item);

  const detailHref = getContentDetailHref(item, tenantId);
  const metadata: ContentCardMetadata = {
    title: item.title,
    description: item.description,
    ratingAvg: item.ratingAvg,
    ratingCount: item.ratingCount,
    fromPrice: presentation.showPriceInHover ? item.fromPrice : null,
    producerName: item.producerName,
    venueName: item.venueName,
    city: item.city,
    detailHref,
    category: item.category,
    summary: item.summary,
    subcategoryName: item.subcategoryName,
    durationText: item.durationText,
    departureTime: item.departureTime,
    availableDaysText: item.availableDaysText,
    scheduleNotes: item.scheduleNotes,
    startAt: item.startAt,
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
          ? '0 24px 48px -12px rgba(0,0,0,0.9), 0 0 32px -6px rgba(22,163,74,0.18)'
          : '0 8px 24px -8px rgba(0,0,0,0.85)',
        borderColor: expanded ? 'rgba(22,163,74,0.4)' : undefined,
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
              isRental
                ? 'from-slate-800/90'
                : isGastro
                  ? 'from-amber-950/80'
                  : isExcursion
                    ? 'from-sky-950/70'
                    : 'from-emerald-900/80'
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

      <div
        className={`absolute inset-0 flex flex-col justify-end p-4 transition-opacity duration-200 md:duration-150 ${
          expanded ? 'opacity-0 md:pointer-events-none' : 'opacity-100'
        }`}
      >
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
        {compactSummary ? (
          <p className="mt-1.5 line-clamp-2 text-xs font-medium normal-case tracking-normal text-white/80">
            {compactSummary}
          </p>
        ) : null}
        {showRatingInCompact && ratingLabel && item.ratingAvg != null && item.ratingAvg > 0 ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`text-xs font-medium ${emphasizeRating ? 'text-amber-300' : 'text-accent'}`}
              aria-label={publicRatingAriaLabel(item.ratingAvg)}
            >
              {ratingFace ? <span aria-hidden>{ratingFace.glyph}</span> : null} {ratingLabel}
            </span>
          </div>
        ) : null}
        {showTagsInCompact && item.tags && item.tags.length > 0 ? (
          <ContentTagChips
            tags={item.tags}
            maxVisible={CONTENT_CARD_MAX_VISIBLE_TAGS}
            category={item.category}
            variant="muted"
            className="mt-2 opacity-90"
          />
        ) : null}
      </div>

      <div className="absolute inset-0 hidden md:block">
        <ExpandedContentCardOverlay
          metadata={metadata}
          presentation={presentation}
          isVisible={expanded}
        />
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
