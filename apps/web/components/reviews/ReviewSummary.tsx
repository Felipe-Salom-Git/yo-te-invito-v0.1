'use client';

export interface ReviewSummaryProps {
  ratingAvg?: number | null;
  total: number;
}

export function ReviewSummary({ ratingAvg, total }: ReviewSummaryProps) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <h2 className="text-xl font-semibold text-white">Valoraciones</h2>
      {ratingAvg != null && ratingAvg > 0 && (
        <span className="text-accent font-medium">★ {ratingAvg.toFixed(1)}</span>
      )}
      <p className="text-sm text-text-muted">
        {total > 0
          ? `${total} reseña${total === 1 ? '' : 's'}`
          : 'Aún no hay valoraciones'}
      </p>
    </div>
  );
}
