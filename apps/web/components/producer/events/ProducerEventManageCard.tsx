'use client';

import Link from 'next/link';
import { Badge, Button } from '@/components';
import { EventModeBadge } from '@/components/producer/events/EventModeBadge';
import { deriveEventModeFromEvent } from '@/lib/producer/event-mode';
import {
  EVENT_STATUS_BADGE_VARIANT,
  EVENT_STATUS_LABELS,
} from '@/lib/domainLabels';
import { getContentDetailHref } from '@/lib/home/contentRoutes';
import {
  hintForProducerEvent,
  interestRatePercent,
} from '@/lib/producer/producer-event-filters';
import type { EventSummary } from '@/repositories/interfaces';

export type ProducerEventEngagementMetrics = {
  viewCount?: number;
  favoriteCount?: number;
  expectedCount?: number;
};

type Props = {
  event: EventSummary;
  engagement?: ProducerEventEngagementMetrics;
};

function MetricChip({ label, value }: { label: string; value: string | number }) {
  return (
    <span className="rounded-md border border-border/60 bg-bg/50 px-2 py-1 text-xs text-text-muted">
      <span className="text-text-muted">{label}</span>{' '}
      <span className="font-medium tabular-nums text-text">{value}</span>
    </span>
  );
}

export function ProducerEventManageCard({ event, engagement }: Props) {
  const status = (event.status ?? 'DRAFT').toUpperCase();
  const statusLabel = EVENT_STATUS_LABELS[status] ?? status;
  const variant = EVENT_STATUS_BADGE_VARIANT[status] ?? 'muted';
  const hint = hintForProducerEvent(event);
  const venue = event.venueName ?? event.city ?? '—';
  const date = new Date(event.startAt).toLocaleString('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const views = engagement?.viewCount;
  const favorites = engagement?.favoriteCount;
  const expected = engagement?.expectedCount;
  const rate =
    views != null && favorites != null && expected != null
      ? interestRatePercent(views, favorites, expected)
      : null;
  const showEngagement =
    views !== undefined || favorites !== undefined || expected !== undefined;
  const canViewPublic = status === 'APPROVED';
  const publicHref = canViewPublic
    ? getContentDetailHref({ id: event.id, category: event.category })
    : null;

  return (
    <article className="overflow-hidden rounded-xl border border-border/80 bg-bg-muted/50 shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-lg border border-border/60 bg-bg sm:h-auto sm:w-32">
          {event.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full min-h-[7rem] items-center justify-center text-xs text-text-muted">
              Sin imagen
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-base font-semibold text-text">
              {event.title}
            </h3>
            <Badge variant={variant}>{statusLabel}</Badge>
            <EventModeBadge
              mode={deriveEventModeFromEvent(event)}
              hasActiveTicketing={event.isTicketingEnabled}
            />
          </div>
          <p className="mt-1 text-sm text-text-muted">
            {venue} · {date}
          </p>

          {hint ? (
            <p
              className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                hint.tone === 'warning'
                  ? 'border border-amber-500/30 bg-amber-500/10 text-amber-200/90'
                  : 'border border-border/60 bg-bg/40 text-text-muted'
              }`}
            >
              {hint.message}
            </p>
          ) : null}

          {showEngagement ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {views !== undefined ? (
                <MetricChip label="Vistas" value={views} />
              ) : null}
              {favorites !== undefined ? (
                <MetricChip label="Favoritos" value={favorites} />
              ) : null}
              {expected !== undefined ? (
                <MetricChip label="Lo esperan" value={expected} />
              ) : null}
              {rate != null ? (
                <MetricChip label="Interés" value={`${rate}%`} />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border/60 bg-bg/30 px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={`/producer/events/${event.id}`} className="sm:mr-auto">
          <Button size="sm">Gestionar</Button>
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/producer/events/${event.id}/edit`}>
            <Button size="sm" variant="outline">
              Editar
            </Button>
          </Link>
          {!event.isGeneralPublication ? (
            <Link href={`/producer/events/${event.id}`}>
              <Button size="sm" variant="outline">
                Entradas
              </Button>
            </Link>
          ) : null}
          <Link href={`/producer/events/${event.id}/courtesies`}>
            <Button size="sm" variant="outline">
              Cortesías
            </Button>
          </Link>
          <Link href={`/producer/events/${event.id}/referrals`}>
            <Button size="sm" variant="outline">
              Referidos
            </Button>
          </Link>
          {publicHref ? (
            <a href={publicHref} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                Ver público
              </Button>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
