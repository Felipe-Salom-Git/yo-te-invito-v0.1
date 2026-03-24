'use client';

import type { ReviewItem } from '@/repositories/interfaces';

export interface ReviewCardProps {
  review: ReviewItem;
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
        <span className="font-medium text-accent">★ {review.score}</span>
        <span className="text-sm text-text-muted">{review.userName}</span>
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
    </article>
  );
}
