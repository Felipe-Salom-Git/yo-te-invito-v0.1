'use client';

import {
  formatPublicRatingLabel,
  publicFaceFromTen,
  publicRatingAriaLabel,
} from '@/lib/reviews/ratingDisplay';
import { RatingFaceIcon } from '@/components/reviews/RatingFaceIcon';

/** Optional rating display for content cards. Renders nothing when no rating. */
export interface RatingBadgeProps {
  /** Average score on internal 1–10 scale. Displayed as /5. */
  ratingAvg?: number | null;
  /** Number of reviews. Optional for display. */
  ratingCount?: number;
  className?: string;
}

export function RatingBadge({ ratingAvg, ratingCount, className = '' }: RatingBadgeProps) {
  if (ratingAvg == null || ratingAvg <= 0) return null;

  const label = formatPublicRatingLabel(ratingAvg);
  if (!label) return null;
  const face = publicFaceFromTen(ratingAvg);

  const display =
    ratingCount != null && ratingCount > 0 ? `${label} (${ratingCount})` : label;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm ${className}`}
      aria-label={publicRatingAriaLabel(ratingAvg)}
    >
      {face ? <RatingFaceIcon level={face.level} className="h-3.5 w-3.5" /> : null}
      {display}
    </span>
  );
}
