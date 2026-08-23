/**
 * Opening-hours overnight + overlap helpers.
 * Run: pnpm --filter api run test:opening-hours
 */

import {
  createEmptyGastroWeeklyOpeningHours,
  createEmptyRentalOpeningHours,
  gastroWeeklyOpeningHoursSchema,
  hasOverlappingOpeningHourRanges,
  isOvernightInterval,
  isValidOpeningHoursRange,
  normalizeTimeRange,
  rentalOpeningHoursSchema,
  sanitizeRentalOpeningHours,
  validateGastroWeeklyOpeningHoursForSubmit,
  validateRentalOpeningHoursForSubmit,
} from '@yo-te-invito/shared';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error('FAIL:', msg);
    process.exit(1);
  }
  console.log('OK:', msg);
}

assert(normalizeTimeRange('12:00', '16:00')?.endMinutes === 16 * 60, 'same-day 12→16');
assert(normalizeTimeRange('20:00', '00:00')?.endMinutes === 24 * 60, 'overnight 20→00 → end 1440');
assert(normalizeTimeRange('20:00', '02:00')?.endMinutes === 26 * 60, 'overnight 20→02 → end 1560');
assert(normalizeTimeRange('12:00', '12:00') == null, 'equal range invalid');

assert(isValidOpeningHoursRange('12:00', '16:00'), 'valid same-day');
assert(isValidOpeningHoursRange('20:00', '00:00'), 'valid 20→00');
assert(isValidOpeningHoursRange('20:00', '02:00'), 'valid 20→02');
assert(isValidOpeningHoursRange('22:30', '03:00'), 'valid 22:30→03');
assert(!isValidOpeningHoursRange('12:00', '12:00'), 'invalid equal');

assert(isOvernightInterval({ open: '20:00', close: '00:00' }), '20→00 overnight');
assert(isOvernightInterval({ open: '20:00', close: '02:00' }), '20→02 overnight');
assert(!isOvernightInterval({ open: '12:00', close: '16:00' }), '12→16 not overnight');
assert(!isOvernightInterval({ open: '12:00', close: '12:00' }), 'equal is not overnight');

assert(
  !hasOverlappingOpeningHourRanges([
    { open: '12:00', close: '16:00' },
    { open: '20:00', close: '00:00' },
  ]),
  'lunch + overnight dinner no overlap',
);
assert(
  !hasOverlappingOpeningHourRanges([
    { open: '12:00', close: '16:00' },
    { open: '16:00', close: '20:00' },
  ]),
  'contiguous ranges allowed',
);
assert(
  hasOverlappingOpeningHourRanges([
    { open: '12:00', close: '16:00' },
    { open: '15:00', close: '18:00' },
  ]),
  'same-day overlap rejected',
);
assert(
  hasOverlappingOpeningHourRanges([
    { open: '20:00', close: '02:00' },
    { open: '23:00', close: '01:00' },
  ]),
  'overnight overlap rejected',
);

const simple = createEmptyRentalOpeningHours();
simple.weekday = {
  isOpen: true,
  ranges: [
    { open: '12:00', close: '16:00' },
    { open: '20:00', close: '00:00' },
  ],
};
assert(rentalOpeningHoursSchema.safeParse(simple).success, 'simple schema accepts overnight multi');
assert(validateRentalOpeningHoursForSubmit(simple) == null, 'simple submit ok');
const sanitized = sanitizeRentalOpeningHours(simple);
assert(
  sanitized.weekday.ranges.some((r) => r.open === '20:00' && r.close === '00:00'),
  'sanitize keeps overnight',
);

const equalBad = createEmptyRentalOpeningHours();
equalBad.weekday = { isOpen: true, ranges: [{ open: '12:00', close: '12:00' }] };
assert(!rentalOpeningHoursSchema.safeParse(equalBad).success, 'simple rejects equal');
assert(
  validateRentalOpeningHoursForSubmit(equalBad)?.includes('diferente'),
  'equal message Spanish',
);

const weekly = createEmptyGastroWeeklyOpeningHours();
weekly.monday = [
  { open: '12:00', close: '16:00' },
  { open: '20:00', close: '00:00' },
];
weekly.friday = [{ open: '20:00', close: '02:00' }];
assert(gastroWeeklyOpeningHoursSchema.safeParse(weekly).success, 'weekly accepts overnight multi');
assert(validateGastroWeeklyOpeningHoursForSubmit(weekly) == null, 'weekly submit ok');

weekly.monday = [
  { open: '12:00', close: '16:00' },
  { open: '15:00', close: '18:00' },
];
assert(!gastroWeeklyOpeningHoursSchema.safeParse(weekly).success, 'weekly rejects overlap');
assert(
  validateGastroWeeklyOpeningHoursForSubmit(weekly)?.includes('superpone'),
  'weekly overlap Spanish',
);

weekly.monday = [{ open: '20:00', close: '20:00' }];
assert(!gastroWeeklyOpeningHoursSchema.safeParse(weekly).success, 'weekly rejects equal');

console.log('\nOK: opening-hours overnight matrix passed');
