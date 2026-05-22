import Link from 'next/link';
import { Badge } from '@/components';
import type { EventSummary } from '@/repositories/interfaces';

interface ProductoraEventCardProps {
  event: EventSummary;
  ticketsSold?: number;
  /** Formatted revenue string; omit to hide sales line until metrics load */
  revenue?: string;
  viewCount?: number;
  favoriteCount?: number;
  expectedCount?: number;
  statusLabel?: string;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'muted' }> = {
  APPROVED: { label: 'Publicado', variant: 'accent' },
  PENDING: { label: 'Pendiente', variant: 'default' },
  DRAFT: { label: 'Borrador', variant: 'muted' },
  PAUSED: { label: 'Pausado', variant: 'muted' },
  CANCELLED: { label: 'Cancelado', variant: 'muted' },
};

export function ProductoraEventCard({
  event,
  ticketsSold,
  revenue,
  viewCount,
  favoriteCount,
  expectedCount,
  statusLabel,
}: ProductoraEventCardProps) {
  const showSales = ticketsSold !== undefined || revenue !== undefined;
  const showEngagement =
    viewCount !== undefined || favoriteCount !== undefined || expectedCount !== undefined;
  const status = (event.status ?? 'DRAFT').toUpperCase();
  const { label: statusText, variant } = statusMap[status] ?? { label: status, variant: 'muted' };
  const displayStatus = statusLabel ?? statusText;
  const venue = event.venueName ?? event.city ?? '—';
  const date = new Date(event.startAt).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link
      href={`/producer/events/${event.id}`}
      className="block rounded-lg border border-border bg-bg-muted p-4 transition hover:border-accent hover:bg-bg"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-text truncate">{event.title}</h3>
            <Badge variant={variant}>{displayStatus}</Badge>
          </div>
          <p className="mt-1 text-sm text-text-muted">{venue} · {date}</p>
          {showSales ? (
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-text-muted">
              {ticketsSold !== undefined ? <span>{ticketsSold} vendidos</span> : null}
              {revenue !== undefined ? (
                <span className="font-medium text-accent">${revenue}</span>
              ) : null}
            </div>
          ) : null}
          {showEngagement ? (
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-text-muted">
              {viewCount !== undefined ? <span>{viewCount} vistas</span> : null}
              {favoriteCount !== undefined ? <span>{favoriteCount} favoritos</span> : null}
              {expectedCount !== undefined ? <span>{expectedCount} lo esperan</span> : null}
            </div>
          ) : null}
        </div>
        <span className="shrink-0 text-sm text-accent">Gestionar →</span>
      </div>
    </Link>
  );
}
