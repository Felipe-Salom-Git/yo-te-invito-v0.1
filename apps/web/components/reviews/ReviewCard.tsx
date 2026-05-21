'use client';

import Link from 'next/link';
import type { PublicReviewItemV2 } from '@yo-te-invito/shared';
import { UserReviewBadge } from './UserReviewBadge';
import { ReviewReply } from './ReviewReply';

export interface ReviewCardProps {
  review: PublicReviewItemV2;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const dateLabel = new Date(review.createdAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <article className="rounded-xl border border-border/80 bg-bg-muted/50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-accent">
          {review.overallRating}
          <span className="text-sm font-normal text-text-muted"> /10</span>
        </span>
        {review.isVerified && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
            Verificada
          </span>
        )}
        <Link
          href={`/users/${review.author.userId}`}
          className="text-sm text-white hover:text-accent transition-colors"
        >
          {review.author.displayName}
        </Link>
        <UserReviewBadge tier={review.author.reviewerTier} />
        <span className="text-xs text-text-muted/70">{dateLabel}</span>
      </div>

      {review.title && (
        <p className="mt-2 font-medium text-white">{review.title}</p>
      )}
      {review.comment && (
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          {review.comment}
        </p>
      )}

      {review.reply && <ReviewReply reply={review.reply} />}
    </article>
  );
}
