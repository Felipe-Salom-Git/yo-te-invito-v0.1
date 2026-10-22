/**
 * G7.10.9 — default create location is Río Negro / San Carlos de Bariloche (editable labels).
 * Run after build: node packages/shared/dist/location/gastro-create-defaults.assert.js
 */
import {
  ARGENTINA_PROVINCES,
  DEFAULT_GASTRO_CREATE_CITY_LABEL,
  DEFAULT_GASTRO_CREATE_PROVINCE_LABEL,
  defaultGastroCreateLocationFields,
} from './argentina-locations';

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const fields = defaultGastroCreateLocationFields();
assert(fields.province === 'Río Negro', 'province label');
assert(fields.city === 'San Carlos de Bariloche', 'city label');
assert(
  fields.province === DEFAULT_GASTRO_CREATE_PROVINCE_LABEL,
  'province const match',
);
assert(fields.city === DEFAULT_GASTRO_CREATE_CITY_LABEL, 'city const match');

const catalogProvince = ARGENTINA_PROVINCES.find((p) => p.label === fields.province);
assert(catalogProvince != null, 'province exists in catalog fallback');
assert(
  catalogProvince!.cities.some((c) => c.label === fields.city),
  'city exists under Río Negro in catalog fallback',
);

console.log('OK: gastro create defaults Bariloche');
