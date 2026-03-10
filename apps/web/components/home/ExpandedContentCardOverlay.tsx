'use client';

import { motion } from 'framer-motion';
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
}

export interface ExpandedContentCardOverlayProps {
  metadata: ContentCardMetadata;
  isVisible: boolean;
}

export function ExpandedContentCardOverlay({
  metadata,
  isVisible,
}: ExpandedContentCardOverlayProps) {
  const { title, description, ratingAvg, ratingCount, fromPrice, producerName, venueName, city } =
    metadata;

  return (
    <motion.div
      className="absolute inset-0 flex flex-col justify-end rounded-lg bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4"
      initial={false}
      animate={{
        opacity: isVisible ? 1 : 0,
      }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      aria-hidden={!isVisible}
    >
      {/* Metadata badges — rating, price */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <RatingBadge ratingAvg={ratingAvg} ratingCount={ratingCount} />
        <PriceBadge fromPrice={fromPrice} />
      </div>

      {/* Title */}
      <h3 className="line-clamp-2 text-sm font-semibold text-white drop-shadow-sm">
        {title}
      </h3>

      {/* Producer / venue / commerce */}
      <div className="mt-1">
        <ProducerMeta
          producerName={producerName}
          venueName={venueName}
          city={city}
        />
      </div>

      {/* Short description — 1–2 lines */}
      {description && (
        <motion.p
          className="mt-2 line-clamp-2 text-xs text-white/80"
          initial={false}
          animate={{ opacity: isVisible ? 1 : 0 }}
          transition={{ delay: 0.04, duration: 0.18 }}
        >
          {description}
        </motion.p>
      )}
    </motion.div>
  );
}
