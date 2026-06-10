/** Minimal event fields for occurrence compatibility helpers. */
export type EventOccurrenceCompatEvent = {
  startAt: Date;
  endAt?: Date | null;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  province?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
};

export type EventOccurrenceLike = {
  id: string;
  startAt: Date;
  endAt?: Date | null;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  province?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
  sortOrder: number;
};

const PUBLIC_OCCURRENCE_STATUSES = ['ACTIVE'] as const;

/** True when the event has at least one occurrence row (multi-date mode). */
export function isMultiDateEvent(occurrences: readonly unknown[] | null | undefined): boolean {
  return (occurrences?.length ?? 0) > 0;
}

/** Legacy single-date events: no occurrences → use Event.startAt and venue fields. */
export function resolveEventDisplayStartAt(
  event: EventOccurrenceCompatEvent,
  occurrences: readonly EventOccurrenceLike[] | null | undefined,
  now: Date = new Date(),
): Date {
  if (!isMultiDateEvent(occurrences)) {
    return event.startAt;
  }
  const next = resolveNextVisibleOccurrence(occurrences!, now);
  return next?.startAt ?? occurrences![0]!.startAt;
}

/** Next future ACTIVE occurrence by startAt, then sortOrder. Falls back to earliest if all past. */
export function resolveNextVisibleOccurrence(
  occurrences: readonly EventOccurrenceLike[],
  now: Date = new Date(),
  options?: { includePaused?: boolean },
): EventOccurrenceLike | null {
  if (occurrences.length === 0) return null;

  const allowed: EventOccurrenceLike['status'][] = options?.includePaused
    ? ['ACTIVE', 'PAUSED']
    : [...PUBLIC_OCCURRENCE_STATUSES];

  const eligible = occurrences.filter((o) =>
    (allowed as readonly string[]).includes(o.status),
  );
  if (eligible.length === 0) return null;

  const sorted = [...eligible].sort(
    (a, b) =>
      a.startAt.getTime() - b.startAt.getTime() ||
      a.sortOrder - b.sortOrder ||
      a.id.localeCompare(b.id),
  );

  const future = sorted.find((o) => o.startAt.getTime() >= now.getTime());
  return future ?? sorted[sorted.length - 1] ?? null;
}

/** Effective venue/city for display: occurrence overrides when multi-date. */
export function resolveEventDisplayVenue(
  event: EventOccurrenceCompatEvent,
  occurrence: EventOccurrenceLike | null | undefined,
): {
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  province: string | null;
  geoLat: number | null;
  geoLng: number | null;
} {
  if (!occurrence) {
    return {
      venueName: event.venueName ?? null,
      venueAddress: event.venueAddress ?? null,
      city: event.city ?? null,
      province: event.province ?? null,
      geoLat: event.geoLat ?? null,
      geoLng: event.geoLng ?? null,
    };
  }
  return {
    venueName: occurrence.venueName ?? event.venueName ?? null,
    venueAddress: occurrence.venueAddress ?? event.venueAddress ?? null,
    city: occurrence.city ?? event.city ?? null,
    province: occurrence.province ?? event.province ?? null,
    geoLat: occurrence.geoLat ?? event.geoLat ?? null,
    geoLng: occurrence.geoLng ?? event.geoLng ?? null,
  };
}

/** Suggested Event.startAt when syncing from occurrences (next visible or earliest). */
export function deriveEventStartAtFromOccurrences(
  occurrences: readonly EventOccurrenceLike[],
  now: Date = new Date(),
): Date | null {
  if (occurrences.length === 0) return null;
  const next = resolveNextVisibleOccurrence(occurrences, now, { includePaused: true });
  if (next) return next.startAt;
  const sorted = [...occurrences].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return sorted[0]?.startAt ?? null;
}
