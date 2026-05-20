'use client';

import { useState } from 'react';
import type { ProducerReviewsSummary } from '@/repositories/interfaces';
import { ProducerRatingDistributionModal } from './ProducerRatingDistributionModal';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= Math.round(value) ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

type Props = {
  summary: ProducerReviewsSummary;
};

export function ProducerRatingSummary({ summary }: Props) {
  const [open, setOpen] = useState(false);
  if (summary.totalReviews === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-border bg-bg-muted p-5">
      <h2 className="text-lg font-semibold text-text">Valoración promedio</h2>
      <p className="mt-1 text-sm text-text-muted">
        Basado en comentarios de eventos publicados por esta productora.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <Stars value={summary.averageRating ?? 0} />
        <span className="text-2xl font-bold text-text">
          {summary.averageRating?.toFixed(1) ?? '—'}
        </span>
        <span className="text-sm text-text-muted">
          Basado en {summary.totalReviews} valoración
          {summary.totalReviews === 1 ? '' : 'es'} de eventos
        </span>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-full border border-accent-muted bg-accent-surface/70 px-4 py-2 text-sm font-medium text-accent-soft hover:bg-accent-surface"
      >
        Ver puntajes
      </button>
      <ProducerRatingDistributionModal
        open={open}
        onClose={() => setOpen(false)}
        distribution={summary.distribution}
        total={summary.totalReviews}
      />
    </section>
  );
}
