/**
 * G4.11 — activityByDay series boundaries for discount metrics (AR timezone).
 * Run: pnpm --filter api run test:gastro-discount-metrics-days
 */

import {
  GASTRO_DISCOUNT_TIMEZONE,
  getGastroDiscountCalendarKey,
  gastroDiscountStartOfDay,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

function shiftCalendarDays(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const utc = Date.UTC(y, m - 1, d + deltaDays);
  const dt = new Date(utc);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

const tz = GASTRO_DISCOUNT_TIMEZONE;
const todayKey = '2026-10-22';
const start30Key = shiftCalendarDays(todayKey, -29);
assert(start30Key === '2026-09-23', '30-day window start');

const start30 = gastroDiscountStartOfDay(2026, 9, 23, tz);
assert(getGastroDiscountCalendarKey(start30, tz) === '2026-09-23', 'series start stays on local date');

type Event = { at: Date; kind: 'claim' | 'validation' };
const events: Event[] = [
  { at: gastroDiscountStartOfDay(2026, 9, 22, tz), kind: 'claim' }, // day before window
  { at: gastroDiscountStartOfDay(2026, 9, 23, tz), kind: 'claim' },
  { at: gastroDiscountStartOfDay(2026, 10, 1, tz), kind: 'claim' },
  { at: gastroDiscountStartOfDay(2026, 10, 1, tz), kind: 'validation' },
  { at: gastroDiscountStartOfDay(2026, 10, 22, tz), kind: 'validation' },
];

const byDay = new Map<string, { claims: number; validations: number }>();
for (let i = 0; i < 30; i++) {
  byDay.set(shiftCalendarDays(start30Key, i), { claims: 0, validations: 0 });
}

for (const e of events) {
  const key = getGastroDiscountCalendarKey(e.at, tz);
  const bucket = byDay.get(key);
  if (!bucket) continue;
  if (e.kind === 'claim') bucket.claims += 1;
  else bucket.validations += 1;
}

assert(byDay.size === 30, 'exactly 30 day buckets');
assert(!byDay.has('2026-09-22'), 'day before window has no bucket');
assert((byDay.get('2026-09-23')?.claims ?? 0) === 1, 'claim on window start counted');
assert((byDay.get('2026-10-01')?.claims ?? 0) === 1, 'claim mid-window');
assert((byDay.get('2026-10-01')?.validations ?? 0) === 1, 'validation mid-window');
assert((byDay.get('2026-10-22')?.validations ?? 0) === 1, 'validation on today');
assert(
  getGastroDiscountCalendarKey(events[0]!.at, tz) === '2026-09-22',
  'pre-window event maps to 2026-09-22 and is excluded',
);

console.log('\nAll G4.11 gastro discount metrics day checks passed.');
