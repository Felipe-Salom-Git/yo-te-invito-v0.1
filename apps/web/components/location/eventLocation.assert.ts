/**
 * G12.4 — Modern location (gastro locals, gastro promo events, producer events): one validator with
 * per-field errors, one mapping to the persisted Event / GastroProfile fields.
 * Run: pnpm --filter api run test:event-location
 */
import {
  MODERN_LOCATION_REQUIREMENTS,
  eventFieldsFromLocationValue,
  firstLocationFieldError,
  hasLocationFieldErrors,
  locationValueFromEventFields,
  validateGastroLocationValue,
  validateLocationFields,
} from './location.utils';
import { EMPTY_LOCATION_VALUE, type LocationValue } from './location.types';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log('OK:', msg);
}

const FULL: LocationValue = {
  province: 'Río Negro',
  city: 'San Carlos de Bariloche',
  address: 'Mitre 250',
  lat: -41.1335,
  lng: -71.3103,
  placeId: 'place-1',
};

// Shared validator — per-field errors.
const empty = validateLocationFields(EMPTY_LOCATION_VALUE, MODERN_LOCATION_REQUIREMENTS);
assert(Boolean(empty.province && empty.city && empty.address), 'empty → province, city and address errors on their own fields');
assert(!empty.map, 'coords stay optional (manual fallback)');
assert(!hasLocationFieldErrors(validateLocationFields(FULL)), 'complete location → no errors');
const noCity = validateLocationFields({ ...FULL, city: '' });
assert(noCity.city && !noCity.province, 'missing city is reported on Ciudad, not on Provincia');
const halfPin = validateLocationFields({ ...FULL, lat: -41.1, lng: null });
assert(Boolean(halfPin.map), 'half-set coordinates → map error');
assert(
  validateGastroLocationValue({ ...FULL, city: '' }) === 'Seleccioná una ciudad.',
  'gastro local validator now matches the API minimum (city required)',
);
assert(firstLocationFieldError({}) === null, 'no errors → null');

// Persisted mapping (Event: venueAddress / city / province / geoLat / geoLng / googlePlaceId).
const persisted = eventFieldsFromLocationValue(FULL);
assert(
  persisted.venueAddress === 'Mitre 250' && persisted.city === 'San Carlos de Bariloche' && persisted.province === 'Río Negro',
  'address / city / province map to Event columns',
);
assert(persisted.geoLat === -41.1335 && persisted.geoLng === -71.3103 && persisted.googlePlaceId === 'place-1', 'lat / lng / placeId preserved');
const roundTrip = locationValueFromEventFields(persisted);
assert(roundTrip.lat === FULL.lat && roundTrip.lng === FULL.lng && roundTrip.address === FULL.address, 'edit pre-loads the saved pin and address');

console.log('OK: event location (shared validator + mapping)');
