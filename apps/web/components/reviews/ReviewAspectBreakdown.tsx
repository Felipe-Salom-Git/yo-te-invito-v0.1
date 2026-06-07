'use client';

import {
  REVIEW_ASPECT_LABELS_ES,
  type PublicReviewCategory,
} from '@yo-te-invito/shared';
import { formatPublicRatingLabel } from '@/lib/reviews/ratingDisplay';

export interface ReviewAspectBreakdownProps {
  category: PublicReviewCategory;
  aspectAverages: Record<string, number> | null | undefined;
  /** When true, labels reflect a single review's aspect scores (not aggregated averages). */
  perReview?: boolean;
  compact?: boolean;
}

export function ReviewAspectBreakdown({
  category,
  aspectAverages,
  perReview = false,
  compact = false,
}: ReviewAspectBreakdownProps) {
  if (!aspectAverages || Object.keys(aspectAverages).length === 0) {
    return null;
  }

  const labels = REVIEW_ASPECT_LABELS_ES[category];

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        {perReview ? 'Aspectos valorados' : 'Promedio por aspecto'}
      </p>
      <div
        className={
          compact
            ? 'grid gap-2 sm:grid-cols-2'
            : 'grid gap-3 sm:grid-cols-2'
        }
      >
        {Object.entries(aspectAverages).map(([key, avg]) => (
          <div
            key={key}
            className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg/40 px-3 py-2 sm:px-4 sm:py-2.5"
          >
            <span className="min-w-0 text-sm text-text-muted">{labels[key] ?? key}</span>
            <span className="shrink-0 text-sm font-medium tabular-nums text-accent">
              {formatPublicRatingLabel(avg, { suffix: false })}
              <span className="font-normal text-text-muted"> /5</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
