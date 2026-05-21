'use client';

import type { PublicReviewCategory } from '@yo-te-invito/shared';
import { ReviewAspectBreakdown } from './ReviewAspectBreakdown';

export interface ReviewSummaryProps {
  averageRating?: number | null;
  validReviewCount: number;
  aspectAverages?: Record<string, number> | null;
  category?: PublicReviewCategory;
}

export function ReviewSummary({
  averageRating,
  validReviewCount,
  aspectAverages,
  category,
}: ReviewSummaryProps) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-3">
        <h2 className="text-xl font-semibold text-white">Valoraciones</h2>
        {averageRating != null && averageRating > 0 && (
          <span className="font-medium text-accent">
            {averageRating.toFixed(1)}
            <span className="text-sm text-text-muted"> /10</span>
          </span>
        )}
        <p className="text-sm text-text-muted">
          {validReviewCount > 0
            ? `${validReviewCount} reseña${validReviewCount === 1 ? '' : 's'}`
            : 'Aún no hay valoraciones'}
        </p>
      </div>
      {category && (
        <ReviewAspectBreakdown
          category={category}
          aspectAverages={aspectAverages}
        />
      )}
    </div>
  );
}
