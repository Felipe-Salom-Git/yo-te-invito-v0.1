import type { AdminEventListItem } from '@/repositories/interfaces';

/** G12.2 — Owner of an admin event row: producer, gastro local (promo event) or platform. */
export function AdminEventOwnerCell({ event }: { event: AdminEventListItem }) {
  if (event.ownerKind === 'GASTRO') {
    return (
      <div className="space-y-0.5">
        <span className="inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
          Local gastronómico
        </span>
        <p className="text-text">{event.gastroProfileName ?? '—'}</p>
        {event.createdByName ? <p className="text-xs">Owner: {event.createdByName}</p> : null}
      </div>
    );
  }
  return <span>{event.producerName ?? '—'}</span>;
}
