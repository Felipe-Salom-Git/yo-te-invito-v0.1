import type { Prisma } from '@prisma/client';

/** Bariloche / tenant default until per-tenant timezone exists */
export const DEFAULT_EVENT_PUBLIC_TIMEZONE =
  process.env.PUBLIC_EVENTS_TIMEZONE ?? 'America/Argentina/Buenos_Aires';

const NON_TIMED_EVENT_CATEGORIES = ['gastro', 'rental', 'excursion', 'hotel'] as const;

type ZonedParts = { year: number; month: number; day: number; hour: number };

function getZonedParts(date: Date, timeZone: string): ZonedParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour: pick('hour'),
  };
}

/** UTC instant for 00:00:00 on a calendar day in the given IANA timezone */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const utcGuess = Date.UTC(year, month - 1, day, 12, 0, 0);
  const probe = new Date(utcGuess);
  const utcAsLocal = new Date(probe.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzAsLocal = new Date(probe.toLocaleString('en-US', { timeZone }));
  const offsetMs = tzAsLocal.getTime() - utcAsLocal.getTime();
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - offsetMs);
}

function addCalendarDays(year: number, month: number, day: number, delta: number): ZonedParts {
  const d = new Date(Date.UTC(year, month - 1, day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), hour: 0 };
}

/** Timed events (category event / null) hide after 01:00 local on the day after startAt */
export function isTimedEventCategory(category: string | null | undefined): boolean {
  const c = (category ?? 'event').toLowerCase();
  return c === 'event';
}

export function getEventPublicVisibleUntil(
  startAt: Date,
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): Date {
  const { year, month, day } = getZonedParts(startAt, timeZone);
  const dayStart = zonedMidnight(year, month, day, timeZone);
  return new Date(dayStart.getTime() + 25 * 60 * 60 * 1000);
}

export function isEventPubliclyVisible(
  startAt: Date,
  category: string | null | undefined,
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): boolean {
  if (!isTimedEventCategory(category)) return true;
  return now.getTime() < getEventPublicVisibleUntil(startAt, timeZone).getTime();
}

/**
 * Lower bound for timed-event startAt still visible at `now` in local TZ.
 * Before 01:00 → include previous calendar day; from 01:00 → today only.
 */
export function getMinVisibleTimedEventStartAt(
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): Date {
  const { year, month, day, hour } = getZonedParts(now, timeZone);
  if (hour < 1) {
    const prev = addCalendarDays(year, month, day, -1);
    return zonedMidnight(prev.year, prev.month, prev.day, timeZone);
  }
  return zonedMidnight(year, month, day, timeZone);
}

/** Prisma filter: non-timed categories always visible; timed events respect 1AM rule */
export function publicEventVisibilityWhere(
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): Prisma.EventWhereInput {
  const minStartAt = getMinVisibleTimedEventStartAt(now, timeZone);
  return {
    OR: [
      { category: { in: [...NON_TIMED_EVENT_CATEGORIES] } },
      {
        AND: [
          { OR: [{ category: 'event' }, { category: null }] },
          { startAt: { gte: minStartAt } },
        ],
      },
    ],
  };
}

export function mergePublicEventVisibility(
  where: Prisma.EventWhereInput,
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): Prisma.EventWhereInput {
  return {
    AND: [where, publicEventVisibilityWhere(now, timeZone)],
  };
}
