'use client';

import {
  REVIEW_ASPECT_LABELS_ES,
  type PublicReviewCategory,
} from '@yo-te-invito/shared';

export interface ReviewAspectBreakdownProps {
  category: PublicReviewCategory;
  aspectAverages: Record<string, number> | null | undefined;
  /** When true, labels reflect a single review's aspect scores (not aggregated averages). */
  perReview?: boolean;
}

export function ReviewAspectBreakdown({
  category,
  aspectAverages,
  perReview = false,
}: ReviewAspectBreakdownProps) {
  if (!aspectAverages || Object.keys(aspectAverages).length === 0) {
    return null;
  }

  const labels = REVIEW_ASPECT_LABELS_ES[category];

  return (
    <div>
      {perReview ? (
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          Aspectos valorados
        </p>
      ) : null}
    <div className="grid gap-3 sm:grid-cols-2">
      {Object.entries(aspectAverages).map(([key, avg]) => (
        <div
          key={key}
          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-bg/40 px-4 py-2.5"
        >
          <span className="text-sm text-text-muted">
            {labels[key] ?? key}
          </span>
          <span className="shrink-0 text-sm font-medium text-accent">
            {avg.toFixed(1)}
            <span className="text-text-muted font-normal"> /10</span>
          </span>
        </div>
      ))}
    </div>
    </div>
  );
}
