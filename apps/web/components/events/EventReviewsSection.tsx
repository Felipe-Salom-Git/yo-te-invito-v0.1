'use client';

import type { PublicReviewCategory, PublicReviewItemV2 } from '@yo-te-invito/shared';
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { ReviewEmptyState } from '@/components/reviews/ReviewEmptyState';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import type { EntityType } from '@/lib/schemas/review';
import { publicReviewsPageSize } from '@/lib/query/reviews';

export interface EventReviewsSectionProps {
  eventId: string;
  tenantId: string;
  category: PublicReviewCategory;
  entityType: EntityType;
  reviews: PublicReviewItemV2[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSubmitReview: (values: ReviewFormSubmitPayload) => void;
  canSubmitReview?: boolean;
  isSubmittingReview: boolean;
  summary: {
    averageRating: number | null;
    validReviewCount: number;
    aspectAverages: Record<string, number> | null;
  };
  isLoading?: boolean;
  hideForm?: boolean;
}

export function EventReviewsSection({
  eventId,
  category,
  entityType,
  reviews,
  total,
  page,
  onPageChange,
  onSubmitReview,
  isSubmittingReview,
  summary,
  isLoading = false,
  hideForm = false,
  canSubmitReview = true,
}: EventReviewsSectionProps) {
  const totalPages = Math.ceil(total / publicReviewsPageSize);

  return (
    <section id="reviews" className="scroll-mt-24">
      <ReviewSummary
        averageRating={summary.averageRating}
        validReviewCount={summary.validReviewCount}
        aspectAverages={summary.aspectAverages}
        category={category}
      />

      {isLoading ? (
        <div className="mt-6 h-24 animate-pulse rounded-xl bg-bg-muted" />
      ) : reviews.length === 0 ? (
        <div className="mt-6">
          <ReviewEmptyState />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-border bg-bg-muted px-4 py-2 text-sm text-text-muted transition-colors hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page * publicReviewsPageSize >= total}
            className="rounded-lg border border-border bg-bg-muted px-4 py-2 text-sm text-text-muted transition-colors hover:bg-border disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      )}

      {!hideForm && (
        <div className="mt-8">
          <ReviewForm
            entityType={entityType}
            entityId={eventId}
            onSubmit={onSubmitReview}
            isSubmitting={isSubmittingReview}
            canSubmit={canSubmitReview}
          />
        </div>
      )}
    </section>
  );
}
