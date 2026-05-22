'use client';

import { useState } from 'react';
import type { ProducerReviewsSummary } from '@/repositories/interfaces';
import { ProducerRatingDistributionModal } from './ProducerRatingDistributionModal';

type Props = {
  summary: ProducerReviewsSummary;
};

export function ProducerRatingSummary({ summary }: Props) {
  const [open, setOpen] = useState(false);
  if (summary.totalReviews === 0) return null;

  const avg = summary.averageRating;

  return (
    <section className="mt-8 rounded-xl border border-border/80 bg-bg-muted/30 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-white sm:text-xl">Valoración promedio</h2>
      <p className="mt-1 text-sm text-text-muted">
        Basado en comentarios públicos de eventos publicados por esta productora.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        {avg != null && avg > 0 ? (
          <div className="flex items-baseline gap-1" aria-label={`Promedio ${avg.toFixed(1)} de 5`}>
            <span className="text-4xl font-bold tabular-nums text-white">
              {avg.toFixed(1)}
            </span>
            <span className="pb-1 text-base text-text-muted">/5</span>
          </div>
        ) : null}
        <p className="text-sm text-text-muted">
          {summary.totalReviews} valoración
          {summary.totalReviews === 1 ? '' : 'es'} de eventos
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
      >
        Ver distribución de puntajes
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
