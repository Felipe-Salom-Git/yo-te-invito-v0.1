import Link from 'next/link';
import { Badge } from '@/components';
import type { EventSummary } from '@/repositories/interfaces';

interface ProductoraEventCardProps {
  event: EventSummary;
  ticketsSold?: number;
  revenue?: string;
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
  ticketsSold = 0,
  revenue = '0',
  statusLabel,
}: ProductoraEventCardProps) {
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
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-text-muted">
            <span>{ticketsSold} vendidos</span>
            <span className="text-accent font-medium">${revenue}</span>
          </div>
        </div>
        <span className="shrink-0 text-sm text-accent">Gestionar →</span>
      </div>
    </Link>
  );
}
