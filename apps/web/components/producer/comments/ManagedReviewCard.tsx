'use client';

import { useState } from 'react';
import Link from 'next/link';
import type {
  ProducerManagedReviewListItem,
  PublicReviewReply,
  ReviewDisputeReasonType,
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

const DISPUTE_REASON_LABELS: Record<ReviewDisputeReasonType, string> = {
  UNFAIR_RATING: 'Calificación injusta',
  OFFENSIVE: 'Comentario ofensivo',
  FALSE_INFORMATION: 'Información falsa',
  WRONG_EVENT: 'No corresponde al evento',
  OTHER: 'Otro',
};

type Props = {
  review: ProducerManagedReviewListItem;
  scope: ManagedReviewsScope;
  allowDisputes: boolean;
  filtersKey: string;
  replyFn: (reviewId: string, body: { body: string }) => Promise<{ ok: true }>;
  invalidateQueryKey: QueryKey;
  summaryQueryKey: QueryKey;
  replyAuthorLabel: string;
};

export function ManagedReviewCard({
  review,
  scope,
  allowDisputes,
  filtersKey,
  replyFn,
  invalidateQueryKey,
  summaryQueryKey,
  replyAuthorLabel,
}: Props) {
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [replyModalOpen, setReplyModalOpen] = useState(false);
  const [showDisputeDetail, setShowDisputeDetail] = useState(false);

  const hasOpenDispute =
    allowDisputes && review.dispute && OPEN.includes(review.dispute.status);
  const hasReply = Boolean(review.officialReply?.trim());

  const authorType =
    review.replyAuthorType ??
    (scope === 'gastro' ? 'GASTRO_OWNER' : scope === 'hotel' ? 'HOTEL_OWNER' : 'PRODUCER');

  const publicReply = hasReply
    ? {
        body: review.officialReply!,
        authorType,
        authorDisplayName: REPLY_LABELS[authorType],
        createdAt: review.replyUpdatedAt ?? review.createdAt,
        updatedAt: review.replyUpdatedAt,
      }
    : null;

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-bg-muted p-4 sm:p-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-text-muted">{EVENT_HEADER[scope]}</p>
          {scope === 'producer' ? (
            <Link
              href={`/producer/events/${review.eventId}`}
              className="font-medium text-text hover:text-accent"
            >
              {review.eventTitle}
            </Link>
          ) : (
            <p className="font-medium text-text">{review.eventTitle}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <ReviewPublicStatusBadge status={review.status} />
          {allowDisputes ? (
            <ReviewDisputeStatusBadge status={review.dispute?.status ?? null} />
          ) : null}
        </div>
      </header>

      <p className="mt-3 text-sm text-text-muted">
        <span className="font-medium text-text">{review.userDisplayName}</span>
        {' · '}
        {new Date(review.createdAt).toLocaleString('es-AR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })}
      </p>

      {review.title?.trim() ? (
        <p className="mt-2 text-sm font-medium text-text">{review.title}</p>
      ) : null}

      <p className="mt-2 text-sm">
        Puntaje general:{' '}
        <span className="font-semibold text-accent">
          {review.overallRating}
          <span className="font-normal text-text-muted"> /10</span>
        </span>
      </p>

      {review.aspectRatings && Object.keys(review.aspectRatings).length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <ReviewAspectBreakdown
            category={review.eventCategory}
            aspectAverages={review.aspectRatings}
            perReview
          />
        </div>
      ) : null}

      {review.comment ? (
        <blockquote className="mt-3 border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-text-muted">
          {review.comment}
        </blockquote>
      ) : (
        <p className="mt-3 text-sm italic text-text-muted">Sin comentario escrito</p>
      )}

      {publicReply ? (
        <div className="mt-4">
          <ReviewReply reply={publicReply} />
        </div>
      ) : null}

      {review.dispute?.adminNote ? (
        <p className="mt-3 rounded-lg border border-border/60 bg-bg px-3 py-2 text-xs text-text-muted">
          <span className="font-medium text-text">Resolución de administración:</span>{' '}
          {review.dispute.adminNote}
        </p>
      ) : null}

      {showDisputeDetail && review.dispute ? (
        <div className="mt-3 rounded-lg border border-border/80 bg-bg px-3 py-3 text-xs text-text-muted">
          <p>
            <span className="font-medium text-text">Solicitud:</span>{' '}
            {DISPUTE_REASON_LABELS[review.dispute.reasonType]}
          </p>
          <p className="mt-1">
            Estado: <ReviewDisputeStatusBadge status={review.dispute.status} />
          </p>
          <p className="mt-1">
            Enviada:{' '}
            {new Date(review.dispute.createdAt).toLocaleString('es-AR')}
          </p>
        </div>
      ) : null}

      <footer className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setReplyModalOpen(true)}
          className="w-full rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent sm:w-auto"
        >
          {hasReply ? 'Editar respuesta' : 'Responder'}
        </button>
        {allowDisputes && !hasOpenDispute ? (
          <button
            type="button"
            onClick={() => setDisputeModalOpen(true)}
            className="w-full rounded-full border border-accent-muted bg-accent-surface/70 px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface sm:w-auto"
          >
            Solicitar revisión
          </button>
        ) : null}
        {allowDisputes && hasOpenDispute ? (
          <p className="text-xs text-amber-200/90 sm:self-center">
            Ya hay una solicitud abierta — no podés crear otra hasta que administración la resuelva.
          </p>
        ) : null}
        {allowDisputes && review.dispute ? (
          <button
            type="button"
            onClick={() => setShowDisputeDetail((v) => !v)}
            className="w-full rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent sm:w-auto"
          >
            {showDisputeDetail ? 'Ocultar solicitud' : 'Ver solicitud'}
          </button>
        ) : null}
        {scope === 'producer' ? (
          <Link
            href={`/events/${review.eventId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center text-xs text-accent hover:underline sm:ml-auto sm:w-auto sm:self-center"
          >
            Ver en ficha pública
          </Link>
        ) : null}
      </footer>

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
        summaryQueryKey={summaryQueryKey}
        authorLabel={replyAuthorLabel}
      />
    </article>
  );
}
