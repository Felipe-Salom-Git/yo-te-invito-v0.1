/**
 * Unit checks for public timed-event visibility (1:00 AM day-after, America/Argentina/Buenos_Aires).
 * Run: pnpm --filter api run test:event-visibility
 */

import {
  DEFAULT_EVENT_PUBLIC_TIMEZONE,
  getEventPublicVisibleUntil,
  getMinVisibleTimedEventStartAt,
  isEventPubliclyVisible,
  isTimedEventCategory,
  publicEventVisibilityWhere,
} from '../src/common/utils/event-public-visibility.util';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
}

const d = (iso: string) => new Date(iso);

assert(isTimedEventCategory('event'), 'event is timed');
assert(isTimedEventCategory(null), 'null category treated as event');
assert(!isTimedEventCategory('gastro'), 'gastro is not timed');
assert(!isTimedEventCategory('rental'), 'rental is not timed');

const eventStart = d('2026-05-20T22:00:00.000Z');
assert(
  isEventPubliclyVisible(eventStart, 'event', d('2026-05-21T02:00:00.000Z')),
  'visible before 1AM day-after cutoff',
);
assert(
  !isEventPubliclyVisible(eventStart, 'event', d('2026-05-22T06:00:00.000Z')),
  'hidden after grace period',
);
assert(
  isEventPubliclyVisible(eventStart, 'gastro', d('2026-05-22T06:00:00.000Z')),
  'non-timed category ignores startAt cutoff',
);

const until = getEventPublicVisibleUntil(eventStart);
assert(until.getTime() > eventStart.getTime(), 'visible-until after start');

const before1am = d('2026-06-10T00:30:00.000Z');
const minStart = getMinVisibleTimedEventStartAt(before1am);
assert(minStart instanceof Date, 'min visible start is a Date');

const where = publicEventVisibilityWhere(d('2026-06-15T12:00:00.000Z'));
assert(where.OR != null && Array.isArray(where.OR), 'visibility where has OR branches');

assert(
  DEFAULT_EVENT_PUBLIC_TIMEZONE === 'America/Argentina/Buenos_Aires' ||
    process.env.PUBLIC_EVENTS_TIMEZONE != null,
  'timezone configured',
);

console.log('OK: event-public-visibility checks passed');
