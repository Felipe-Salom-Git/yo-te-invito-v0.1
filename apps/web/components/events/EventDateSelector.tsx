'use client';

import type { EventOccurrenceResponse } from '@yo-te-invito/shared';
import {
  formatOccurrenceShortLabel,
  occurrenceStatusLabel,
} from '@/lib/producer/event-occurrences';

export type OccurrenceAvailability = 'available' | 'sold_out' | 'paused';

export type EventDateSelectorProps = {
  occurrences: EventOccurrenceResponse[];
  selectedId: string | null;
  onSelect: (occurrenceId: string) => void;
  availabilityById?: Record<string, OccurrenceAvailability>;
  className?: string;
};

function availabilityLabel(status: OccurrenceAvailability): string {
  switch (status) {
    case 'available':
      return 'Disponible';
    case 'sold_out':
      return 'Agotado';
    case 'paused':
      return 'Pausado';
  }
}

function availabilityClass(status: OccurrenceAvailability, selected: boolean): string {
  if (selected) return 'border-accent bg-accent/15 text-text ring-1 ring-accent/40';
  switch (status) {
    case 'available':
      return 'border-border bg-bg hover:border-accent/50 text-text';
    case 'sold_out':
      return 'border-border/60 bg-bg-muted/40 text-text-muted opacity-75';
    case 'paused':
      return 'border-amber-500/30 bg-amber-500/5 text-text-muted';
  }
}

export function EventDateSelector({
  occurrences,
  selectedId,
  onSelect,
  availabilityById = {},
  className = '',
}: EventDateSelectorProps) {
  if (occurrences.length === 0) return null;

  const sorted = [...occurrences].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  );

  return (
    <section className={className} aria-label="Elegí la fecha del evento">
      <h2 className="text-lg font-semibold text-white">Elegí tu fecha</h2>
      <p className="mt-1 text-sm text-text-muted">
        Seleccioná la función antes de elegir entradas.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {sorted.map((occ) => {
          const avail =
            occ.status === 'PAUSED'
              ? 'paused'
              : (availabilityById[occ.id] ?? 'available');
          const selected = selectedId === occ.id;
          const disabled = avail === 'sold_out' || occ.status === 'CANCELLED';

          return (
            <button
              key={occ.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(occ.id)}
              className={`flex min-w-0 flex-1 flex-col rounded-xl border px-4 py-3 text-left transition-colors sm:min-w-[10rem] sm:flex-none ${availabilityClass(avail, selected)} disabled:cursor-not-allowed`}
            >
              <span className="text-sm font-medium">
                {formatOccurrenceShortLabel(occ.startAt)}
              </span>
              {occ.venueName ? (
                <span className="mt-0.5 truncate text-xs text-text-muted">{occ.venueName}</span>
              ) : null}
              <span
                className={`mt-2 inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                  avail === 'available'
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : avail === 'sold_out'
                      ? 'bg-red-500/15 text-red-400'
                      : 'bg-amber-500/15 text-amber-400'
                }`}
              >
                {occ.status !== 'ACTIVE'
                  ? occurrenceStatusLabel(occ.status)
                  : availabilityLabel(avail)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
