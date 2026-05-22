'use client';

import type { ProducerManagedReviewSummary } from '@yo-te-invito/shared';
import type { ManagedReviewsScope } from '@/components/reviews/ManagedReviewsCommentsPage';

const SUBTITLE: Record<ManagedReviewsScope, string> = {
  producer: 'de tus eventos',
  gastro: 'de tu establecimiento',
  hotel: 'de tu alojamiento',
};

type Props = {
  summary: ProducerManagedReviewSummary;
  scope: ManagedReviewsScope;
};

export function ManagedReviewSummary({ summary, scope }: Props) {
  const max = Math.max(...Object.values(summary.distribution), 1);
  const stars = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;
  const showProducerStats = scope === 'producer';

  return (
    <section className="rounded-xl border border-border bg-bg-muted p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-text">Resumen de valoraciones</h2>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <span className="text-3xl font-bold text-accent">
          {summary.averageRating?.toFixed(1) ?? '—'}
          <span className="text-lg font-normal text-text-muted"> /10</span>
        </span>
        <span className="pb-1 text-sm text-text-muted">
          {summary.totalReviews} valoración
          {summary.totalReviews === 1 ? '' : 'es'} {SUBTITLE[scope]}
        </span>
      </div>

      {showProducerStats &&
      (summary.unansweredCount != null || summary.openDisputeCount != null) ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {summary.unansweredCount != null && summary.unansweredCount > 0 ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200/90">
              {summary.unansweredCount} sin responder
            </span>
          ) : null}
          {summary.openDisputeCount != null && summary.openDisputeCount > 0 ? (
            <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-200/90">
              {summary.openDisputeCount} disputa
              {summary.openDisputeCount === 1 ? '' : 's'} abierta
            </span>
          ) : null}
          {summary.unansweredCount === 0 && summary.openDisputeCount === 0 ? (
            <span className="text-xs text-text-muted">Sin pendientes de respuesta ni disputas abiertas</span>
          ) : null}
        </div>
      ) : null}

      {summary.totalReviews > 0 ? (
        <ul className="mt-6 max-h-56 space-y-1.5 overflow-y-auto pr-1 sm:max-h-64">
          {stars.map((star) => {
            const key = String(star) as keyof typeof summary.distribution;
            const count = summary.distribution[key];
            const width = Math.round((count / max) * 100);
            return (
              <li key={star} className="flex items-center gap-2 text-sm sm:gap-3">
                <span className="w-8 shrink-0 text-right text-text-muted sm:w-10">{star}</span>
                <div className="h-2 min-w-0 flex-1 overflow-hidden rounded bg-bg">
                  <div
                    className="h-full rounded bg-accent/70 transition-all"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-text-muted sm:w-8">{count}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-text-muted">
          Cuando recibas valoraciones, vas a ver el promedio y la distribución acá.
        </p>
      )}
    </section>
  );
}
