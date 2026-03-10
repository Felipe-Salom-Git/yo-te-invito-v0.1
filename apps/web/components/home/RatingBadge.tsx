'use client';

/** Optional rating display for content cards. Renders nothing when no rating. */
export interface RatingBadgeProps {
  /** Average score (e.g. 4.5). Only rendered when defined and > 0. */
  ratingAvg?: number | null;
  /** Number of reviews. Optional for display. */
  ratingCount?: number;
  className?: string;
}

export function RatingBadge({ ratingAvg, ratingCount, className = '' }: RatingBadgeProps) {
  if (ratingAvg == null || ratingAvg <= 0) return null;

  const label = ratingCount != null && ratingCount > 0
    ? `${ratingAvg.toFixed(1)} (${ratingCount})`
    : ratingAvg.toFixed(1);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-sm ${className}`}
      aria-label={`Valoración: ${label}`}
    >
      <span className="text-accent" aria-hidden>★</span>
      {label}
    </span>
  );
}
