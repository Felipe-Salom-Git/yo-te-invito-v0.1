'use client';

import type { ReviewDisputeDetail } from '@/repositories/interfaces';
import { formatPublicRatingLabel } from '@/lib/reviews/ratingDisplay';
import { AdminReviewDisputeStatusBadge } from './AdminReviewDisputeStatusBadge';
import {
  EVENT_CATEGORY_LABELS,
  REVIEW_DISPUTE_REASON_LABELS,
  formatAdminDateTime,
} from './admin-review-dispute-copy';

type Props = {
  dispute: ReviewDisputeDetail;
  selected: boolean;
  onSelect: () => void;
};

export function AdminReviewDisputeMobileCard({ dispute, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border p-4 text-left transition-colors ${
        selected
          ? 'border-accent/50 bg-accent/10'
          : 'border-border/80 bg-bg-muted/40 hover:border-accent/30'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-medium text-white">{dispute.producerDisplayName ?? 'Productora'}</p>
        <AdminReviewDisputeStatusBadge status={dispute.status} />
      </div>
      <p className="mt-1 text-sm text-accent">{dispute.eventTitle}</p>
      <p className="mt-1 text-xs text-text-muted">
        {EVENT_CATEGORY_LABELS[dispute.eventCategory]} ·{' '}
        {REVIEW_DISPUTE_REASON_LABELS[dispute.reasonType] ?? dispute.reasonType}
      </p>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
        <span>
          Autor: <span className="text-text">{dispute.reviewUserDisplayName}</span>
        </span>
        <span className="font-medium text-accent">
          {formatPublicRatingLabel(dispute.reviewOverallRating)}
        </span>
        <span>{formatAdminDateTime(dispute.createdAt)}</span>
      </div>
      {dispute.reviewComment ? (
        <p className="mt-2 line-clamp-2 text-sm text-text-muted">{dispute.reviewComment}</p>
      ) : null}
    </button>
  );
}
