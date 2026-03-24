'use client';

import type { ReviewItem } from '@/repositories/interfaces';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { ReviewEmptyState } from '@/components/reviews/ReviewEmptyState';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import type { EntityType } from '@/lib/schemas/review';

export interface EventReviewsSectionProps {
  eventId: string;
  tenantId: string;
  entityType: EntityType;
  reviews: ReviewItem[];
  total: number;
  page: number;
  onPageChange: (page: number) => void;
  onSubmitReview: (values: { score: number; comment?: string }) => void;
  isSubmittingReview: boolean;
  /** Optional rating average from event for summary display */
  ratingAvg?: number | null;
  /** When true, hide the review form (e.g. when form is rendered full-width below) */
  hideForm?: boolean;
}

export function EventReviewsSection({
  eventId,
  tenantId,
  entityType,
  reviews,
  total,
  page,
  onPageChange,
  onSubmitReview,
  isSubmittingReview,
  ratingAvg,
  hideForm = false,
}: EventReviewsSectionProps) {
  const totalPages = Math.ceil(total / 10);

  return (
    <section id="reviews" className="scroll-mt-24">
      <ReviewSummary ratingAvg={ratingAvg} total={total} />

      {reviews.length === 0 ? (
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
            disabled={page * 10 >= total}
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
          />
        </div>
      )}
    </section>
  );
}
