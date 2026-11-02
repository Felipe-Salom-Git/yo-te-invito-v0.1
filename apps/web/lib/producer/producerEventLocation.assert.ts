/**
 * G12.4 — Producer event location: modern picker rules (per field) for new events / edited
 * locations; untouched legacy events keep saving; drafts may omit the location.
 * Run: pnpm --filter api run test:event-location
 */
import { locationValueFromEventFields } from '@/components/location/location.utils';
import { EMPTY_LOCATION_VALUE, type LocationValue } from '@/components/location/location.types';
import {
  PRODUCER_LOCATION_ERROR_KEYS,
  buildUpdatePayload,
  eventDetailToFormData,
  isLocationValueChanged,
  producerLocationFieldErrors,
  validateProducerEventLocation,
  validateProducerEventSubmit,
} from './producer-event-form.utils';
import { validateProducerEventWizardStep2 } from './producer-event-wizard';

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
  placeId: 'pl-1',
};

// New event (create): modern minimum once any field is used.
const partial = validateProducerEventLocation({ ...EMPTY_LOCATION_VALUE, address: 'Mitre 250' }, null, { publishing: false, strict: true });
assert(Boolean(partial.province && partial.city) && !partial.venueAddress, 'new event: partial location → province / city errors on their fields');
assert(Object.keys(validateProducerEventLocation(EMPTY_LOCATION_VALUE, null, { publishing: false, strict: true })).length === 0, 'draft without any location still allowed');
assert(
  Object.keys(validateProducerEventLocation(EMPTY_LOCATION_VALUE, null, { publishing: true, strict: true })).length === 3,
  'publishing a new event requires province + city + address',
);
assert(Object.keys(validateProducerEventLocation(FULL, null, { publishing: true, strict: true })).length === 0, 'complete modern location passes');
const halfPin = validateProducerEventLocation({ ...FULL, lng: null }, null, { publishing: false, strict: false });
assert(Boolean(halfPin[PRODUCER_LOCATION_ERROR_KEYS.map]), 'half-set pin is always rejected (map error)');

// Inline mapping (errors next to each field, never all on Provincia).
const inline = producerLocationFieldErrors({ province: 'p', city: 'c', venueAddress: 'a', locationMap: 'm' });
assert(inline.province === 'p' && inline.city === 'c' && inline.address === 'a' && inline.map === 'm', 'flat errors → per-field picker errors');

// Step 2 of the wizard uses the same rule.
const form = eventDetailToFormData({ title: 'Show', startAt: '2026-12-10T22:00:00.000Z', status: 'DRAFT' });
const step2 = validateProducerEventWizardStep2(form, { ...EMPTY_LOCATION_VALUE, city: 'Bariloche' });
assert(!step2.ok && Boolean(step2.errors.province) && Boolean(step2.errors.venueAddress), 'wizard step 2: incomplete location blocks with field errors');

// Legacy edit: text-only city, no province / pin → opens and saves while untouched.
const legacyEvent = { title: 'Legacy', startAt: '2026-12-10T22:00:00.000Z', status: 'APPROVED', city: 'Bariloche', venueAddress: null, venueName: 'Teatro', geoLat: null, geoLng: null };
const legacyLocation = locationValueFromEventFields(legacyEvent);
assert(legacyLocation.city === 'Bariloche' && legacyLocation.lat === null, 'legacy event loads its stored fields (no pin)');
const legacyForm = eventDetailToFormData(legacyEvent);
assert(!isLocationValueChanged(legacyLocation, locationValueFromEventFields(legacyEvent)), 'untouched legacy location is detected as unchanged');
assert(validateProducerEventSubmit(legacyForm, legacyLocation, { strictLocation: false }).ok, 'untouched legacy approved event saves (previous rule)');
const touched = { ...legacyLocation, address: 'Nueva 1' };
assert(isLocationValueChanged(touched, legacyLocation), 'editing the location is detected');
const touchedResult = validateProducerEventSubmit(legacyForm, touched, { strictLocation: true });
assert(!touchedResult.ok && Boolean(touchedResult.errors.province), 'edited legacy location must meet the modern minimum');

// lat / lng preserved through the update payload.
const payload = buildUpdatePayload(eventDetailToFormData({ ...legacyEvent, status: 'DRAFT' }), FULL, '');
assert(payload.geoLat === FULL.lat && payload.geoLng === FULL.lng && payload.googlePlaceId === 'pl-1', 'update payload keeps lat / lng / placeId');
assert(payload.province === 'Río Negro' && payload.venueAddress === 'Mitre 250', 'update payload keeps province / address');

console.log('OK: producer event location');
