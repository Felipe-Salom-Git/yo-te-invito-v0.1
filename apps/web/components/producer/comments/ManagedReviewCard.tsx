'use client';

import { useState } from 'react';
import type {
  ProducerManagedReviewListItem,
  PublicReviewReply,
  ReviewDisputeStatus,
} from '@yo-te-invito/shared';
import type { QueryKey } from '@tanstack/react-query';
import { ReviewAspectBreakdown } from '@/components/reviews/ReviewAspectBreakdown';
import { ReviewReply } from '@/components/reviews/ReviewReply';
import { ReviewReplyModal } from '@/components/reviews/ReviewReplyModal';
import type { ManagedReviewsScope } from '@/components/reviews/ManagedReviewsCommentsPage';
import { ReviewDisputeStatusBadge } from './ReviewDisputeStatusBadge';
import { ReviewDisputeModal } from './ReviewDisputeModal';
import { ReviewPublicStatusBadge } from './ReviewPublicStatusBadge';

const OPEN: ReviewDisputeStatus[] = ['PENDING', 'IN_REVIEW'];

const REPLY_LABELS: Record<PublicReviewReply['authorType'], string> = {
  PRODUCER: 'Tu productora',
  GASTRO_OWNER: 'Tu establecimiento',
  HOTEL_OWNER: 'Tu hotel',
  PLATFORM_ADMIN: 'Plataforma',
};

const EVENT_HEADER: Record<ManagedReviewsScope, string> = {
  producer: 'Evento',
  gastro: 'Establecimiento',
  hotel: 'Alojamiento',
};

type Props = {
  review: ProducerManagedReviewListItem;
  scope: ManagedReviewsScope;
  allowDisputes: boolean;
  filtersKey: string;
  replyFn: (reviewId: string, body: { body: string }) => Promise<{ ok: true }>;
  invalidateQueryKey: QueryKey;
};

export function ManagedReviewCard({
  review,
  scope,
  allowDisputes,
  filtersKey,
  replyFn,
  invalidateQueryKey,
}: Props) {
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const hasOpenDispute =
    allowDisputes && review.dispute && OPEN.includes(review.dispute.status);

  const authorType = review.replyAuthorType ?? (scope === 'gastro' ? 'GASTRO_OWNER' : scope === 'hotel' ? 'HOTEL_OWNER' : 'PRODUCER');

  const publicReply = review.officialReply?.trim()
    ? {
        body: review.officialReply,
        authorType,
        authorDisplayName: REPLY_LABELS[authorType],
        createdAt: review.replyUpdatedAt ?? review.createdAt,
        updatedAt: review.replyUpdatedAt,
      }
    : null;

  return (
    <article className="rounded-xl border border-border bg-bg-muted p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-text-muted">{EVENT_HEADER[scope]}</p>
          <p className="font-medium text-text">{review.eventTitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewPublicStatusBadge status={review.status} />
          {allowDisputes ? (
            <ReviewDisputeStatusBadge status={review.dispute?.status ?? null} />
          ) : null}
        </div>
      </header>

      <p className="mt-3 text-sm text-text-muted">
        <span className="text-text">{review.userDisplayName}</span>
        {' · '}
        {new Date(review.createdAt).toLocaleDateString('es-AR')}
      </p>

      <p className="mt-2 text-sm">
        Puntaje general:{' '}
        <span className="font-semibold text-accent">
          {review.overallRating}
          <span className="font-normal text-text-muted"> /10</span>
        </span>
      </p>

      {review.aspectRatings && Object.keys(review.aspectRatings).length > 0 ? (
        <div className="mt-3">
          <ReviewAspectBreakdown
            category={review.eventCategory}
            aspectAverages={review.aspectRatings}
            perReview
          />
        </div>
      ) : null}

      {review.comment ? (
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          <span className="font-medium text-text">Comentario:</span>
          <br />
          &ldquo;{review.comment}&rdquo;
        </p>
      ) : null}

      {publicReply ? <ReviewReply reply={publicReply} /> : null}

      {review.dispute?.adminNote ? (
        <p className="mt-3 rounded-lg border border-border/60 bg-bg px-3 py-2 text-xs text-text-muted">
          <span className="font-medium text-text">Resolución de administración:</span>{' '}
          {review.dispute.adminNote}
        </p>
      ) : null}

      <footer className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setReplyModalOpen(true)}
          className="rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent"
        >
          {review.officialReply ? 'Editar respuesta' : 'Responder'}
        </button>
        {allowDisputes && !hasOpenDispute ? (
          <button
            type="button"
            onClick={() => setDisputeModalOpen(true)}
            className="rounded-full border border-accent-muted bg-accent-surface/70 px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
          >
            Solicitar revisión
          </button>
        ) : null}
        {allowDisputes && hasOpenDispute ? (
          <span className="self-center text-xs text-text-muted">Solicitud de revisión abierta</span>
        ) : null}
        {allowDisputes && review.dispute ? (
          <button
            type="button"
            onClick={() => setShowDispute((v) => !v)}
            className="rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent"
          >
            {showDispute ? 'Ocultar solicitud' : 'Ver solicitud'}
          </button>
        ) : null}
      </footer>

      {showDispute && review.dispute ? (
        <p className="mt-3 text-xs text-text-muted">
          ID solicitud: {review.dispute.id} ·{' '}
          {new Date(review.dispute.createdAt).toLocaleString('es-AR')}
        </p>
      ) : null}

      {allowDisputes ? (
        <ReviewDisputeModal
          reviewId={review.id}
          open={disputeModalOpen}
          onClose={() => setDisputeModalOpen(false)}
          filtersKey={filtersKey}
        />
      ) : null}
      <ReviewReplyModal
        reviewId={review.id}
        open={replyModalOpen}
        onClose={() => setReplyModalOpen(false)}
        existingReply={review.officialReply}
        replyFn={replyFn}
        invalidateQueryKey={invalidateQueryKey}
      />
    </article>
  );
}
