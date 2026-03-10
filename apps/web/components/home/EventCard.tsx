'use client';

import Link from 'next/link';
import type { EventSummary } from '@/repositories/interfaces';

const TENANT_ID = 'tenant-demo';

function getDetailHref(event: EventSummary): string {
  const base = event.category === 'gastro' ? '/restaurants'
    : event.category === 'excursion' ? '/excursiones'
    : event.category === 'rental' ? '/rentals'
    : '/events';
  return `${base}/${event.id}?tenantId=${TENANT_ID}`;
}

export interface EventCardProps {
  event: EventSummary & { description?: string | null };
}

export function EventCard({ event }: EventCardProps) {
  const dateLabel = event.startAt
    ? new Date(event.startAt).toLocaleDateString('es-AR')
    : '';
  const locationLabel = event.city ?? event.venueName ?? '—';
  const categoryLabel = event.category ?? undefined;
  const description = 'description' in event ? (event.description ?? '') : '';

  return (
    <Link
      href={getDetailHref(event)}
      className="group relative flex-shrink-0 w-[260px] h-[380px] overflow-hidden rounded-lg border border-border bg-bg-muted transition-all duration-300 ease-out hover:z-20 hover:scale-[1.08] hover:border-accent hover:shadow-xl hover:shadow-emerald-900/30"
    >
      {/* Image + gradient overlay */}
      <div className="absolute inset-0">
        {event.coverImageUrl ? (
          <img src={event.coverImageUrl} alt={event.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-900 to-black">
            <span className="text-5xl">🎉</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-85 group-hover:opacity-95 transition-opacity" />
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col justify-end p-4">
        {categoryLabel && (
          <div className="mb-1.5">
            <span className="rounded bg-accent/80 px-2 py-0.5 text-[11px] font-medium text-bg">
              {categoryLabel}
            </span>
          </div>
        )}

        <p className="line-clamp-2 text-sm font-semibold text-white group-hover:text-accent">
          {event.title}
        </p>

        <div className="mt-1.5 space-y-0.5 text-[12px] text-white/80">
          <p className="flex items-center gap-1.5">
            <span>📅</span>
            <span>{dateLabel}</span>
          </p>
          <p className="flex items-center gap-1.5 line-clamp-1">
            <span>📍</span>
            <span>{locationLabel}</span>
          </p>
        </div>

        <p className="mt-1.5 line-clamp-2 text-[12px] text-white/70 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          {description}
        </p>

        <button
          type="button"
          className="mt-2 w-full rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-bg opacity-0 transition-all group-hover:opacity-100 hover:bg-accent-hover"
        >
          Ver detalles
        </button>
      </div>
    </Link>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="flex shrink-0 flex-col overflow-hidden rounded-lg border border-border bg-bg-muted">
      <div className="h-32 w-44 animate-pulse bg-border" />
      <div className="p-2">
        <div className="h-4 w-32 animate-pulse rounded bg-border" />
        <div className="mt-2 h-3 w-24 animate-pulse rounded bg-border" />
      </div>
    </div>
  );
}
