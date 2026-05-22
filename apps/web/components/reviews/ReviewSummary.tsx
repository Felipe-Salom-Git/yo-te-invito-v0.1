'use client';

import type { PublicReviewCategory } from '@yo-te-invito/shared';
import { ReviewAspectBreakdown } from './ReviewAspectBreakdown';

export interface ReviewSummaryProps {
  averageRating?: number | null;
  validReviewCount: number;
  aspectAverages?: Record<string, number> | null;
  category?: PublicReviewCategory;
  /** Section heading — defaults to Valoraciones */
  title?: string;
}

export function ReviewSummary({
  averageRating,
  validReviewCount,
  aspectAverages,
  category,
  title = 'Valoraciones',
}: ReviewSummaryProps) {
  const hasAverage = averageRating != null && averageRating > 0;
  const hasReviews = validReviewCount > 0;
  const hasAspects =
    category &&
    aspectAverages &&
    Object.keys(aspectAverages).length > 0;

  return (
    <header className="rounded-xl border border-border/80 bg-bg-muted/30 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-white sm:text-xl">{title}</h2>
          <p className="mt-1 text-sm text-text-muted">
            {hasReviews
              ? `${validReviewCount} reseña${validReviewCount === 1 ? '' : 's'} pública${validReviewCount === 1 ? '' : 's'}`
              : 'Aún no hay valoraciones públicas'}
          </p>
        </div>
        {hasAverage ? (
          <div
            className="flex shrink-0 items-baseline gap-1 self-start sm:self-auto"
            aria-label={`Promedio ${averageRating!.toFixed(1)} de 10`}
          >
            <span className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
              {averageRating!.toFixed(1)}
            </span>
            <span className="pb-1 text-base text-text-muted sm:text-lg">/10</span>
          </div>
        ) : null}
      </div>

      {hasAspects ? (
        <div className="mt-5 border-t border-border/60 pt-5">
          <ReviewAspectBreakdown
            category={category!}
            aspectAverages={aspectAverages}
          />
        </div>
      ) : null}
    </header>
  );
}
