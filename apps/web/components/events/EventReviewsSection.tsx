'use client';

import type {
  PublicReviewCategory,
  PublicReviewItemV2,
  PublicReviewListFilters,
} from '@yo-te-invito/shared';
import { QueryError } from '@/components/ui/QueryError';
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { ReviewSummary } from '@/components/reviews/ReviewSummary';
import { ReviewEmptyState, type ReviewEmptyVariant } from '@/components/reviews/ReviewEmptyState';
import { ReviewCard } from '@/components/reviews/ReviewCard';
import { ReviewListSkeleton } from '@/components/reviews/ReviewListSkeleton';
import { ReviewPagination } from '@/components/reviews/ReviewPagination';
import { PublicReviewsFiltersBar } from '@/components/reviews/PublicReviewsFiltersBar';
import { hasActivePublicReviewFilters } from '@/lib/reviews/publicReviewListFilters';
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
  filters: PublicReviewListFilters;
  onFiltersChange: (filters: PublicReviewListFilters) => void;
  onSubmitReview: (values: ReviewFormSubmitPayload) => void;
  canSubmitReview?: boolean;
  isSubmittingReview: boolean;
  summary: {
    averageRating: number | null;
    validReviewCount: number;
    aspectAverages: Record<string, number> | null;
  };
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  hideForm?: boolean;
}

function resolveEmptyVariant(
  reviews: PublicReviewItemV2[],
  validReviewCount: number,
  isError: boolean,
  filtersActive: boolean,
): ReviewEmptyVariant {
  if (isError) return 'unavailable';
  if (reviews.length > 0) return 'none';
  if (filtersActive) return 'no-public';
  if (validReviewCount > 0) return 'no-public';
  return 'none';
}

export function EventReviewsSection({
  eventId,
  category,
  entityType,
  reviews,
  total,
  page,
  onPageChange,
  filters,
  onFiltersChange,
  onSubmitReview,
  isSubmittingReview,
  summary,
  isLoading = false,
  isError = false,
  onRetry,
  hideForm = false,
  canSubmitReview = true,
}: EventReviewsSectionProps) {
  const filtersActive = hasActivePublicReviewFilters(filters);
  const showFilters = (summary.validReviewCount > 0 || total > 0) && !isError;
  const emptyVariant = resolveEmptyVariant(
    reviews,
    summary.validReviewCount,
    isError,
    filtersActive,
  );

  return (
    <section id="reviews" className="min-w-0 scroll-mt-24">
      <ReviewSummary
        averageRating={summary.averageRating}
        validReviewCount={summary.validReviewCount}
        aspectAverages={summary.aspectAverages}
        category={category}
      />

      {showFilters ? (
        <PublicReviewsFiltersBar
          className="mt-6"
          filters={filters}
          onChange={onFiltersChange}
        />
      ) : null}

      {isError ? (
        <div className="mt-6">
          <QueryError
            message="No pudimos cargar las valoraciones."
            onRetry={onRetry}
          />
        </div>
      ) : isLoading ? (
        <ReviewListSkeleton />
      ) : reviews.length === 0 ? (
        <div className="mt-6">
          <ReviewEmptyState
            variant={emptyVariant}
            message={
              filtersActive
                ? 'Ninguna valoración coincide con estos filtros'
                : undefined
            }
            submessage={
              filtersActive
                ? 'Probá cambiar el orden, el puntaje o el filtro de respuesta oficial'
                : undefined
            }
          />
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      )}

      {!isError && !isLoading && total > 0 ? (
        <ReviewPagination
          page={page}
          total={total}
          pageSize={publicReviewsPageSize}
          onPageChange={onPageChange}
        />
      ) : null}

      {!hideForm && !isError ? (
        <div className="mt-8 border-t border-border/60 pt-8">
          <ReviewForm
            entityType={entityType}
            entityId={eventId}
            onSubmit={onSubmitReview}
            isSubmitting={isSubmittingReview}
            canSubmit={canSubmitReview}
          />
        </div>
      ) : null}
    </section>
  );
}
