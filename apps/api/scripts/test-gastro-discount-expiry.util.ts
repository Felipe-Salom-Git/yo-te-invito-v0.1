/**
 * Unit tests for gastro discount inclusive expiry (no API/DB).
 * Run: pnpm --filter api run test:gastro-discount-expiry
 */

import {
  gastroDiscountEndOfDay,
  getGastroDiscountCalendarKey,
  getGastroDiscountLocalDayBounds,
  GASTRO_DISCOUNT_TIMEZONE,
  isGastroDiscountExpired,
  isGastroDiscountNotYetActive,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

function main() {
  console.log('=== Gastro discount expiry (shared) ===\n');

  const tz = GASTRO_DISCOUNT_TIMEZONE;
  const expiry = normalizeGastroDiscountExpiryDate('2026-06-24');
  const expiryKey = getGastroDiscountCalendarKey(expiry, tz);
  assert(expiryKey === '2026-06-24', 'normalize date-only → calendar 2026-06-24');

  const middayExpiry = normalizeGastroDiscountExpiryDate(
    new Date('2026-06-24T15:00:00.000Z'),
  );
  assert(
    getGastroDiscountCalendarKey(middayExpiry, tz) === '2026-06-24',
    'normalize instant → same calendar day',
  );

  const morningOnExpiryDay = new Date();
  const todayExpiry = normalizeGastroDiscountExpiryDate(morningOnExpiryDay);
  assert(
    !isGastroDiscountExpired(todayExpiry, morningOnExpiryDay),
    'expires today → not expired during today',
  );

  const nextDay = new Date(gastroDiscountEndOfDay(2026, 6, 24, tz).getTime() + 60_000);
  assert(isGastroDiscountExpired(expiry, nextDay), 'after end of expiry day → expired');

  const validFrom = normalizeGastroDiscountValidFromDate('2026-06-25');
  assert(
    isGastroDiscountNotYetActive(validFrom, new Date('2026-06-24T18:00:00.000Z')),
    'valid from tomorrow → not yet active today',
  );

  const { start, end } = getGastroDiscountLocalDayBounds(new Date());
  assert(start.getTime() <= end.getTime(), 'local day bounds ordered');

  console.log('\nAll gastro discount expiry unit checks passed.');
}

main();
