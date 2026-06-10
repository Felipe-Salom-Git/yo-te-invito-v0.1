import type {
  CreateEventOccurrenceBody,
  EventOccurrenceResponse,
  EventOccurrenceStatus,
  EventOccurrenceWithStats,
} from '@yo-te-invito/shared';
import { isoToDatetimeLocalInput, localInputToIso } from '@/lib/producer/datetime-local';

export type { EventOccurrenceResponse, EventOccurrenceStatus, EventOccurrenceWithStats };

/** Local draft row while creating an event (before eventId exists). */
export type OccurrenceDraft = {
  localId: string;
  startAt: string;
  endAt?: string;
  venueName?: string | null;
  capacity?: number | null;
  status?: EventOccurrenceStatus;
};

export type EventDateMode = 'simple' | 'multi';

export function newOccurrenceDraft(partial?: Partial<OccurrenceDraft>): OccurrenceDraft {
  return {
    localId: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    startAt: '',
    endAt: '',
    venueName: null,
    capacity: null,
    status: 'ACTIVE',
    ...partial,
  };
}

export function formatOccurrenceDateTime(
  startAt: string,
  endAt?: string | null,
  options?: { weekday?: boolean },
): string {
  const start = new Date(startAt);
  if (Number.isNaN(start.getTime())) return startAt;
  const dateOpts: Intl.DateTimeFormatOptions = {
    weekday: options?.weekday ? 'short' : undefined,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  const startLabel = start.toLocaleString('es-AR', dateOpts);
  if (!endAt) return startLabel;
  const end = new Date(endAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    const endTime = end.toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return `${startLabel} – ${endTime}`;
  }
  return `${startLabel} – ${end.toLocaleString('es-AR', dateOpts)}`;
}

export function formatOccurrenceShortLabel(startAt: string): string {
  const d = new Date(startAt);
  if (Number.isNaN(d.getTime())) return startAt;
  return d.toLocaleString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function occurrenceStatusLabel(status: EventOccurrenceStatus): string {
  switch (status) {
    case 'ACTIVE':
      return 'Activa';
    case 'PAUSED':
      return 'Pausada';
    case 'CANCELLED':
      return 'Cancelada';
    default:
      return status;
  }
}

export function draftToCreateBody(
  draft: OccurrenceDraft,
  defaultVenue?: { venueName?: string | null; city?: string | null },
): CreateEventOccurrenceBody {
  return {
    startAt: localInputToIso(draft.startAt),
    endAt: draft.endAt ? localInputToIso(draft.endAt) : null,
    venueName: draft.venueName?.trim() || defaultVenue?.venueName || null,
    city: defaultVenue?.city ?? null,
    capacity: draft.capacity ?? null,
    status: draft.status ?? 'ACTIVE',
  };
}

export function occurrenceToDraft(occ: EventOccurrenceResponse): OccurrenceDraft {
  return {
    localId: occ.id,
    startAt: isoToDatetimeLocalInput(occ.startAt),
    endAt: occ.endAt ? isoToDatetimeLocalInput(occ.endAt) : '',
    venueName: occ.venueName ?? null,
    capacity: occ.capacity ?? null,
    status: occ.status,
  };
}

export function draftToUpdateBody(draft: OccurrenceDraft): import('@yo-te-invito/shared').UpdateEventOccurrenceBody {
  return {
    startAt: draft.startAt ? localInputToIso(draft.startAt) : undefined,
    endAt: draft.endAt ? localInputToIso(draft.endAt) : null,
    venueName: draft.venueName?.trim() || null,
    capacity: draft.capacity ?? null,
    status: draft.status,
  };
}

export function validateOccurrenceDraft(
  draft: OccurrenceDraft,
): { ok: true } | { ok: false; message: string } {
  if (!draft.startAt.trim()) {
    return { ok: false, message: 'La fecha y hora de inicio son obligatorias.' };
  }
  if (draft.endAt && new Date(draft.endAt) < new Date(draft.startAt)) {
    return { ok: false, message: 'La fecha de fin debe ser posterior al inicio.' };
  }
  return { ok: true };
}

export function validateOccurrenceDrafts(
  drafts: OccurrenceDraft[],
): { ok: true } | { ok: false; message: string } {
  if (drafts.length === 0) {
    return { ok: false, message: 'Agregá al menos una fecha para el evento.' };
  }
  for (const d of drafts) {
    const v = validateOccurrenceDraft(d);
    if (!v.ok) return v;
  }
  return { ok: true };
}

export function earliestDraftStartIso(drafts: OccurrenceDraft[]): string | null {
  const valid = drafts
    .filter((d) => d.startAt.trim())
    .map((d) => new Date(d.startAt).getTime())
    .filter((t) => !Number.isNaN(t));
  if (valid.length === 0) return null;
  return new Date(Math.min(...valid)).toISOString();
}
