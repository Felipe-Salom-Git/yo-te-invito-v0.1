'use client';

import type { ProducerReviewsSummary } from '@/repositories/interfaces';

type Props = {
  open: boolean;
  onClose: () => void;
  distribution: ProducerReviewsSummary['distribution'];
  total: number;
};

export function ProducerRatingDistributionModal({ open, onClose, distribution, total }: Props) {
  if (!open) return null;

  const rows = ([5, 4, 3, 2, 1] as const).map((score) => {
    const count = distribution[score];
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return { score, count, pct };
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-text">Distribución de puntajes</h3>
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.score} className="flex items-center gap-3 text-sm">
              <span className="w-20 shrink-0 text-text-muted">{row.score} estrellas</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-bg-muted">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="w-8 text-right text-text-muted">{row.count}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg border border-border py-2 text-sm text-text hover:border-accent"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
