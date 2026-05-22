'use client';

import type { PublicReviewCategory } from '@yo-te-invito/shared';
import type { ReviewDisputeStatus } from '@/repositories/interfaces';
import type { AdminReviewDisputeFiltersState } from '@/lib/admin/admin-review-dispute-filters';
import { hasActiveAdminReviewDisputeFilters } from '@/lib/admin/admin-review-dispute-filters';
import { EVENT_CATEGORY_LABELS } from './admin-review-dispute-copy';

const selectClass =
  'mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

type Props = {
  draft: AdminReviewDisputeFiltersState;
  onDraftChange: (next: AdminReviewDisputeFiltersState) => void;
  onApply: () => void;
  onClear: () => void;
};

export function AdminReviewDisputeFilters({
  draft,
  onDraftChange,
  onApply,
  onClear,
}: Props) {
  const active = hasActiveAdminReviewDisputeFilters(draft);

  return (
    <section className="mt-6 rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Filtros</h3>
        {active ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-accent hover:underline"
          >
            Limpiar
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-text-muted">
          Estado de disputa
          <select
            className={selectClass}
            value={draft.status}
            onChange={(e) =>
              onDraftChange({
                ...draft,
                status: e.target.value as ReviewDisputeStatus | '',
              })
            }
          >
            <option value="">Todas</option>
            <option value="PENDING">Pendiente</option>
            <option value="IN_REVIEW">En revisión</option>
            <option value="ACCEPTED">Aceptada</option>
            <option value="REJECTED">Rechazada</option>
            <option value="RESOLVED">Resuelta</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
        </label>
        <label className="block text-xs text-text-muted">
          Vertical
          <select
            className={selectClass}
            value={draft.category}
            onChange={(e) =>
              onDraftChange({
                ...draft,
                category: e.target.value as PublicReviewCategory | '',
              })
            }
          >
            <option value="">Todas</option>
            {(Object.keys(EVENT_CATEGORY_LABELS) as PublicReviewCategory[]).map((c) => (
              <option key={c} value={c}>
                {EVENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-text-muted sm:col-span-2">
          Buscar (evento, productora o mensaje)
          <input
            type="search"
            className={selectClass}
            value={draft.q}
            placeholder="Mínimo 2 caracteres"
            onChange={(e) => onDraftChange({ ...draft, q: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onApply();
            }}
          />
        </label>
      </div>
      <div className="mt-3">
        <button
          type="button"
          onClick={onApply}
          className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
        >
          Aplicar filtros
        </button>
      </div>
    </section>
  );
}
