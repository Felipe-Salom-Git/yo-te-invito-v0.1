'use client';

import Image from 'next/image';
import type { EventFormData } from '@/lib/schemas/event';
import type { LocationValue } from '@/components/location';
import { EVENT_STATUS_LABELS } from '@/lib/domainLabels';
import { mapProducerFormStatusToApi } from '@/lib/producer/producer-event-form.utils';

type Props = {
  form: EventFormData;
  location: LocationValue;
  modeLabel?: string;
};

function formatWhen(startAt: string, endAt?: string) {
  if (!startAt) return 'Fecha por definir';
  try {
    const start = new Date(startAt);
    const line = start.toLocaleString('es-AR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    if (endAt) {
      const end = new Date(endAt);
      if (!Number.isNaN(end.getTime())) {
        return `${line} → ${end.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
      }
    }
    return line;
  } catch {
    return startAt;
  }
}

function placeLine(form: EventFormData, location: LocationValue) {
  const parts = [
    form.venueName?.trim(),
    location.city?.trim() || form.city?.trim(),
    location.address?.trim() || form.venueAddress?.trim(),
  ].filter(Boolean);
  return parts.length ? parts.join(' · ') : 'Ubicación por definir';
}

export function ProducerEventFormPreview({ form, location, modeLabel }: Props) {
  const statusKey = mapProducerFormStatusToApi(form.status);
  const statusLabel = EVENT_STATUS_LABELS[statusKey] ?? statusKey;

  return (
    <div className="rounded-xl border border-border bg-bg p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Vista previa
      </p>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-muted">
        {form.coverImageUrl ? (
          <div className="relative aspect-[16/9] w-full bg-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={form.coverImageUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center text-sm text-text-muted">
            Sin imagen
          </div>
        )}
        <div className="p-3">
          <p className="line-clamp-2 font-semibold text-text">
            {form.title.trim() || 'Título del evento'}
          </p>
          {form.summary?.trim() ? (
            <p className="mt-1 line-clamp-2 text-xs text-text-muted">{form.summary}</p>
          ) : null}
          <p className="mt-2 text-xs text-text-muted">{formatWhen(form.startAt, form.endAt)}</p>
          <p className="mt-1 text-xs text-text-muted">{placeLine(form, location)}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
              {statusLabel}
            </span>
            {modeLabel ? (
              <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                {modeLabel}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
