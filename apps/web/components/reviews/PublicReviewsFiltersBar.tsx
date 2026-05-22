'use client';

import type { PublicReviewListFilters } from '@yo-te-invito/shared';
import {
  DEFAULT_PUBLIC_REVIEW_LIST_FILTERS,
  hasActivePublicReviewFilters,
  PUBLIC_REVIEW_REPLY_OPTIONS,
  PUBLIC_REVIEW_SORT_OPTIONS,
} from '@/lib/reviews/publicReviewListFilters';

const selectClass =
  'mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

type Props = {
  filters: PublicReviewListFilters;
  onChange: (next: PublicReviewListFilters) => void;
  className?: string;
};

export function PublicReviewsFiltersBar({ filters, onChange, className = '' }: Props) {
  const active = hasActivePublicReviewFilters(filters);

  return (
    <section
      className={`rounded-xl border border-border/80 bg-bg-muted/30 p-4 ${className}`}
      aria-label="Filtros de valoraciones"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Filtrar valoraciones</h3>
        {active ? (
          <button
            type="button"
            onClick={() => onChange(DEFAULT_PUBLIC_REVIEW_LIST_FILTERS)}
            className="text-xs font-medium text-accent hover:underline"
          >
            Limpiar
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block min-w-0 text-xs text-text-muted">
          Orden
          <select
            className={selectClass}
            value={filters.sort}
            onChange={(e) =>
              onChange({
                ...filters,
                sort: e.target.value as PublicReviewListFilters['sort'],
              })
            }
          >
            {PUBLIC_REVIEW_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-xs text-text-muted">
          Respuesta oficial
          <select
            className={selectClass}
            value={filters.replyFilter}
            onChange={(e) =>
              onChange({
                ...filters,
                replyFilter: e.target.value as PublicReviewListFilters['replyFilter'],
              })
            }
          >
            {PUBLIC_REVIEW_REPLY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-0 text-xs text-text-muted">
          Puntaje (1–10)
          <select
            className={selectClass}
            value={filters.overallRating ?? ''}
            onChange={(e) =>
              onChange({
                ...filters,
                overallRating: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          >
            <option value="">Cualquiera</option>
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={String(n)}>
                {n}/10
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
