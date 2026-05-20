'use client';

import { useState } from 'react';
import type { ProducerManagedReviewListItem, ReviewDisputeStatus } from '@/repositories/interfaces';
import { ReviewDisputeStatusBadge } from './ReviewDisputeStatusBadge';
import { ReviewDisputeModal } from './ReviewDisputeModal';

const OPEN: ReviewDisputeStatus[] = ['PENDING', 'IN_REVIEW'];

function Stars({ score }: { score: number }) {
  return (
    <span className="text-amber-400" aria-label={`${score} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= score ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

type Props = {
  review: ProducerManagedReviewListItem;
  filtersKey: string;
};

export function ProducerReviewCard({ review, filtersKey }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const [showDispute, setShowDispute] = useState(false);

  const hasOpenDispute = review.dispute && OPEN.includes(review.dispute.status);

  return (
    <article className="rounded-xl border border-border bg-bg-muted p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-text-muted">Evento</p>
          <p className="font-medium text-text">{review.eventTitle}</p>
        </div>
        <ReviewDisputeStatusBadge status={review.dispute?.status ?? null} />
      </header>

      <p className="mt-3 text-sm text-text-muted">
        <span className="text-text">{review.userDisplayName}</span>
        {' · '}
        {new Date(review.createdAt).toLocaleDateString('es-AR')}
      </p>

      <p className="mt-2 text-sm">
        Puntaje: <Stars score={review.score} />
      </p>

      {review.comment ? (
        <p className="mt-3 text-sm text-text-muted leading-relaxed">
          <span className="font-medium text-text">Comentario:</span>
          <br />
          &ldquo;{review.comment}&rdquo;
        </p>
      ) : null}

      {review.dispute?.adminNote ? (
        <p className="mt-3 rounded-lg border border-border/60 bg-bg px-3 py-2 text-xs text-text-muted">
          <span className="font-medium text-text">Resolución de administración:</span>{' '}
          {review.dispute.adminNote}
        </p>
      ) : null}

      <footer className="mt-4 flex flex-wrap gap-2">
        {!hasOpenDispute ? (
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="rounded-full border border-accent-muted bg-accent-surface/70 px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
          >
            Solicitar revisión
          </button>
        ) : null}
        {review.dispute ? (
          <button
            type="button"
            onClick={() => setShowDispute((v) => !v)}
            className="rounded-full border border-border px-4 py-2 text-sm text-text hover:border-accent"
          >
            {showDispute ? 'Ocultar solicitud' : 'Ver solicitud'}
          </button>
        ) : null}
        {hasOpenDispute ? (
          <span className="self-center text-xs text-text-muted">Solicitud enviada</span>
        ) : null}
      </footer>

      {showDispute && review.dispute ? (
        <p className="mt-3 text-xs text-text-muted">
          ID solicitud: {review.dispute.id} ·{' '}
          {new Date(review.dispute.createdAt).toLocaleString('es-AR')}
        </p>
      ) : null}

      <ReviewDisputeModal
        reviewId={review.id}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        filtersKey={filtersKey}
      />
    </article>
  );
}
