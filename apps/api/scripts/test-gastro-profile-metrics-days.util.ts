/**
 * G4.3 — Calendar day bucketing for profile views (AR timezone helpers).
 * Run: pnpm --filter api run test:gastro-profile-metrics-days
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
const sample = new Date('2026-10-22T15:30:00.000Z');
const key = getGastroDiscountCalendarKey(sample, tz);
assert(/^\d{4}-\d{2}-\d{2}$/.test(key), 'calendar key format');

const start = gastroDiscountStartOfDay(2026, 10, 22, tz);
assert(start instanceof Date, 'start of day is Date');
assert(getGastroDiscountCalendarKey(start, tz) === '2026-10-22', 'start of day stays on same local date');

assert(shiftCalendarDays('2026-10-22', -6) === '2026-10-16', '7-day window start');
assert(shiftCalendarDays('2026-10-22', -29) === '2026-09-23', '30-day window start');

const buckets = new Map<string, number>();
for (let i = 0; i < 30; i++) buckets.set(shiftCalendarDays('2026-09-23', i), 0);
assert(buckets.size === 30, '30 day buckets');
assert(buckets.has('2026-10-22') && buckets.has('2026-09-23'), 'window endpoints present');

console.log('\nAll G4.3 gastro profile metrics day checks passed.');
