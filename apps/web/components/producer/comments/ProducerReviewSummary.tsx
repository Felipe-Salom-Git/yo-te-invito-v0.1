'use client';

import type { ProducerManagedReviewSummary } from '@yo-te-invito/shared';

export function ProducerReviewSummary({ summary }: { summary: ProducerManagedReviewSummary }) {
  const max = Math.max(...Object.values(summary.distribution), 1);
  const stars = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

  return (
    <section className="rounded-xl border border-border bg-bg-muted p-6">
      <h2 className="text-lg font-semibold text-text">Valoración promedio</h2>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <span className="text-3xl font-bold text-accent">
          {summary.averageRating?.toFixed(1) ?? '—'}
          <span className="text-lg font-normal text-text-muted"> /10</span>
        </span>
        <span className="text-sm text-text-muted pb-1">
          Basado en {summary.totalReviews} valoración
          {summary.totalReviews === 1 ? '' : 'es'} de tus eventos
        </span>
      </div>
      {summary.totalReviews > 0 ? (
        <ul className="mt-6 max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {stars.map((star) => {
            const key = String(star) as keyof typeof summary.distribution;
            const count = summary.distribution[key];
            const width = Math.round((count / max) * 100);
            return (
              <li key={star} className="flex items-center gap-3 text-sm">
                <span className="w-10 shrink-0 text-right text-text-muted">{star}</span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-bg">
                  <div
                    className="h-full rounded bg-accent/70"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-8 text-right text-text-muted">{count}</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
