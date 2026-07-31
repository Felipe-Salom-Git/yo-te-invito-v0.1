'use client';

import { motion } from 'framer-motion';
import {
  getContentCardLocationLine,
  getContentCardMetaLine,
  getContentPreviewShortDateLabel,
  getExcursionCardScheduleLine,
  type ContentCardPresentation,
} from '@/lib/home/contentCardPresentation';
import { RatingBadge } from './RatingBadge';
import { PriceBadge } from './PriceBadge';
import { ProducerMeta } from './ProducerMeta';

export interface ContentCardMetadata {
  title: string;
  description?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  fromPrice?: number | null;
  producerName?: string | null;
  venueName?: string | null;
  city?: string | null;
  detailHref: string;
  category?: string;
  summary?: string | null;
  subcategoryName?: string | null;
  durationText?: string | null;
  departureTime?: string | null;
  availableDaysText?: string | null;
  scheduleNotes?: string | null;
  startAt?: string;
}

export interface ExpandedContentCardOverlayProps {
  metadata: ContentCardMetadata;
  presentation: ContentCardPresentation;
  isVisible: boolean;
}

function hoverDescription(metadata: ContentCardMetadata): string | null {
  const description = metadata.description?.trim();
  if (description) return description;
  const summary = metadata.summary?.trim();
  if (summary) return summary;
  return null;
}

export function ExpandedContentCardOverlay({
  metadata,
  presentation,
  isVisible,
}: ExpandedContentCardOverlayProps) {
  const {
    title,
    ratingAvg,
    ratingCount,
    fromPrice,
    producerName,
    venueName,
    city,
    category,
    durationText,
    departureTime,
    availableDaysText,
    scheduleNotes,
    startAt,
  } = metadata;

  const locationLine = getContentCardLocationLine({ category, venueName, city });
  const scheduleLine = getExcursionCardScheduleLine({
    durationText,
    departureTime,
    availableDaysText,
    scheduleNotes,
  });
  const metaLine = getContentCardMetaLine({
    category,
    producerName,
    venueName,
    summary: metadata.summary,
    description: metadata.description,
    subcategoryName: metadata.subcategoryName,
    city,
    durationText,
    departureTime,
    availableDaysText,
    scheduleNotes,
  });
  const dateLabel = presentation.showDateInHover
    ? getContentPreviewShortDateLabel({ category, startAt })
    : null;
  const description = hoverDescription(metadata);
  const showLocation =
    presentation.showLocationInHover && locationLine && locationLine !== '—';

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-end rounded-lg bg-gradient-to-t from-black/95 via-black/75 to-transparent p-4"
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      aria-hidden={!isVisible}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <RatingBadge ratingAvg={ratingAvg} ratingCount={ratingCount} />
        {presentation.showPriceInHover ? (
          <PriceBadge fromPrice={fromPrice} />
        ) : null}
        {dateLabel ? (
          <span className="rounded border border-white/20 bg-black/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            {dateLabel}
          </span>
        ) : null}
      </div>

      <h3 className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">
        {title}
      </h3>

      <div className="mt-1 space-y-0.5">
        {showLocation ? (
          <p className="text-xs text-white/80">{locationLine}</p>
        ) : null}
        {presentation.showProducerInHover && producerName ? (
          <ProducerMeta producerName={producerName} className="mt-0.5" />
        ) : null}
        {presentation.showScheduleInHover && scheduleLine ? (
          <p className="text-[11px] text-accent/90">{scheduleLine}</p>
        ) : null}
        {presentation.vertical === 'rental' && metaLine ? (
          <p className="text-[11px] text-accent/90">{metaLine}</p>
        ) : null}
      </div>

      {description ? (
        <motion.p
          className="mt-2 line-clamp-2 text-xs text-white/80"
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ delay: 0.04, duration: 0.18 }}
        >
          {description}
        </motion.p>
      ) : null}

      <span className="mt-3 inline-block w-fit rounded-md bg-accent/90 px-3 py-1.5 text-xs font-medium text-bg">
        {presentation.ctaLabel}
      </span>
    </motion.div>
  );
}
