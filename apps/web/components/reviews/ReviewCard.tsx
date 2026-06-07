'use client';

import Link from 'next/link';
import type { PublicReviewItemV2 } from '@yo-te-invito/shared';
import { UserReviewBadge } from './UserReviewBadge';
import { ReviewReply } from './ReviewReply';
import { ReviewAspectBreakdown } from './ReviewAspectBreakdown';
import {
  getPublicReviewEntityHref,
  PUBLIC_REVIEW_CATEGORY_LABELS,
} from '@/lib/reviews/publicReviewRoutes';
import {
  formatPublicRatingLabel,
  publicRatingAriaLabel,
} from '@/lib/reviews/ratingDisplay';

export interface ReviewCardProps {
  review: PublicReviewItemV2;
  /** Show link to the reviewed entity (e.g. on /users/[userId]). */
  showEntityContext?: boolean;
  tenantId?: string;
}

export function ReviewCard({
  review,
  showEntityContext = false,
  tenantId,
}: ReviewCardProps) {
  const dateLabel = new Date(review.createdAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const hasAspects =
    review.aspectRatings && Object.keys(review.aspectRatings).length > 0;

  return (
    <article className="min-w-0 rounded-xl border border-border/80 bg-bg-muted/50 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <div
          className="flex shrink-0 items-center justify-center rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 sm:w-[4.5rem] sm:flex-col sm:px-2"
          aria-label={publicRatingAriaLabel(review.overallRating)}
        >
          <span className="text-2xl font-bold tabular-nums text-accent sm:text-3xl">
            {formatPublicRatingLabel(review.overallRating, { suffix: false })}
          </span>
          <span className="text-xs text-text-muted sm:mt-0.5">/5</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {review.isVerified ? (
              <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent">
                Verificada
              </span>
            ) : null}
            <Link
              href={`/users/${review.author.userId}`}
              className="text-sm font-medium text-white transition-colors hover:text-accent"
            >
              {review.author.displayName}
            </Link>
            <UserReviewBadge tier={review.author.reviewerTier} />
            <time className="text-xs text-text-muted/70" dateTime={review.createdAt}>
              {dateLabel}
            </time>
          </div>

          {showEntityContext && review.entityTitle ? (
            <p className="mt-2 text-xs text-text-muted">
              <span className="text-text-muted/80">
                {PUBLIC_REVIEW_CATEGORY_LABELS[review.category]} ·{' '}
              </span>
              <Link
                href={getPublicReviewEntityHref(
                  review.category,
                  review.entityId,
                  tenantId,
                )}
                className="font-medium text-accent hover:underline"
              >
                {review.entityTitle}
              </Link>
            </p>
          ) : null}

          {review.title ? (
            <p className="mt-2 font-medium text-white">{review.title}</p>
          ) : null}
          {review.comment ? (
            <p className="mt-2 text-sm leading-relaxed text-text-muted break-words">
              {review.comment}
            </p>
          ) : null}

          {hasAspects ? (
            <div className="mt-4">
              <ReviewAspectBreakdown
                category={review.category}
                aspectAverages={review.aspectRatings}
                perReview
                compact
              />
            </div>
          ) : null}

          {review.reply ? <ReviewReply reply={review.reply} /> : null}
        </div>
      </div>
    </article>
  );
}
