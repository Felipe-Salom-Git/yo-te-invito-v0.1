'use client';

import type { ProducerManagedReviewSummary } from '@/repositories/interfaces';

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400 text-xl" aria-hidden>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= Math.round(value) ? '★' : '☆'}</span>
      ))}
    </span>
  );
}

export function ProducerReviewSummary({ summary }: { summary: ProducerManagedReviewSummary }) {
  const max = Math.max(...Object.values(summary.distribution), 1);

  return (
    <section className="rounded-xl border border-border bg-bg-muted p-6">
      <h2 className="text-lg font-semibold text-text">Valoración promedio</h2>
      <div className="mt-4 flex flex-wrap items-end gap-4">
        <Stars value={summary.averageRating ?? 0} />
        <span className="text-3xl font-bold text-text">
          {summary.averageRating?.toFixed(1) ?? '—'}
        </span>
        <span className="text-sm text-text-muted pb-1">
          Basado en {summary.totalReviews} comentario
          {summary.totalReviews === 1 ? '' : 's'} de tus eventos
        </span>
      </div>
      {summary.totalReviews > 0 ? (
        <ul className="mt-6 space-y-2">
          {([5, 4, 3, 2, 1] as const).map((star) => {
            const count = summary.distribution[String(star) as '1' | '2' | '3' | '4' | '5'];
            const width = Math.round((count / max) * 100);
            return (
              <li key={star} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 text-text-muted">
                  {star} estrella{star === 1 ? '' : 's'}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded bg-bg">
                  <div
                    className="h-full rounded bg-amber-400/80"
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
