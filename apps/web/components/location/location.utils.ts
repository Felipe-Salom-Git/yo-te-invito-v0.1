import { ARGENTINA_PROVINCES } from './argentina-locations';
import { cityLabelFromValue, provinceLabelFromValue } from '@yo-te-invito/shared';
import type { LocationValue } from './location.types';

/**
 * Event location field mapping (Maps 6):
 * - UI `LocationValue.address` → API `venueAddress` (dirección calle / Places)
 * - UI `LocationValue.city` + province select → API `city` (label) + `province` (slug)
 * - UI `LocationValue.placeId` → API `googlePlaceId`
 * - UI `LocationValue.lat/lng` → API `geoLat/geoLng` (opcional con fallback manual)
 * - Form `venueName` → API `venueName` (nombre del venue, independiente del mapa)
 */

export function parseGeoCoord(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export function isValidGeoCoord(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

function normalizeProvinceStored(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return provinceLabelFromValue(v) || v;
}

function normalizeCityStored(value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  return cityLabelFromValue(v) || v;
}

/** Match free-text city (from API) to normalized province/city values when possible. */
export function resolveProvinceCityFromCityLabel(cityLabel: string | null | undefined): {
  province: string;
  city: string;
} {
  const normalized = (cityLabel ?? '').trim().toLowerCase();
  if (!normalized) return { province: '', city: '' };

  for (const p of ARGENTINA_PROVINCES) {
    for (const c of p.cities) {
      if (
        c.label.toLowerCase() === normalized ||
        c.value.replace(/-/g, ' ') === normalized.replace(/-/g, ' ')
      ) {
        return { province: p.value, city: c.value };
      }
    }
  }
  return { province: '', city: '' };
}

function googlePlaceIdFromLocationValue(value: LocationValue): string | null {
  const id = value.placeId?.trim();
  return id || null;
}

function provinceFromLocationValue(value: LocationValue): string | null {
  const p = value.province.trim();
  return p || null;
}

export function validateLocationValue(
  value: LocationValue,
  opts: { requireAddress?: boolean; requireCoords?: boolean; requireCity?: boolean; requireProvince?: boolean } = {},
): string | null {
  if (opts.requireProvince && !value.province.trim()) return 'Seleccioná una provincia.';
  if (opts.requireCity && !value.city.trim()) return 'Seleccioná una ciudad.';
  if (opts.requireAddress && !value.address.trim()) return 'La dirección es obligatoria.';
  if (opts.requireCoords) {
    if (!isValidGeoCoord(value.lat) || !isValidGeoCoord(value.lng)) {
      return 'Seleccioná un punto en el mapa para definir la ubicación.';
    }
  }
  if (value.lat != null && !isValidGeoCoord(value.lat)) return 'Latitud inválida.';
  if (value.lng != null && !isValidGeoCoord(value.lng)) return 'Longitud inválida.';
  return null;
}

/** At least street address or city/venue text for presencial events (coords optional). */
export function hasPresencialLocationText(
  location: LocationValue,
  venueName?: string | null,
): boolean {
  if (location.address.trim()) return true;
  if (location.city.trim()) return true;
  if (venueName?.trim()) return true;
  return false;
}

/**
 * Validate presencial event/excursion location before publish.
 * Does not require coords or googlePlaceId — manual fallback is allowed.
 */
export function validatePresencialEventLocation(
  location: LocationValue,
  venueName?: string | null,
): string | null {
  const base = validateLocationValue(location);
  if (base) return base;
  if (!hasPresencialLocationText(location, venueName)) {
    return 'Indicá al menos una dirección, ciudad o nombre del lugar para eventos presenciales.';
  }
  return null;
}

/** Gastro portal: province + address required; coords optional (manual fallback). */
export function validateGastroLocationValue(value: LocationValue): string | null {
  return (
    validateLocationValue(value, {
      requireProvince: true,
      requireAddress: true,
    }) ??
    null
  );
}

/** Hotel portal: city + address required; coords optional (manual fallback). */
export function validateHotelLocationValue(value: LocationValue): string | null {
  return (
    validateLocationValue(value, {
      requireAddress: true,
      requireCity: true,
    }) ?? null
  );
}

/** Rental / excursion operator admin: optional location; validate coords if partially set. */
export function validateOptionalEntityLocation(value: LocationValue): string | null {
  return validateLocationValue(value);
}

export function locationValueFromEventFields(input: {
  city?: string | null;
  venueAddress?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  province?: string | null;
  googlePlaceId?: string | null;
}): LocationValue {
  const province = normalizeProvinceStored(input.province);
  const cityNorm = normalizeCityStored(input.city);
  const fromCity = province
    ? { province, city: resolveProvinceCityFromCityLabel(cityNorm).city || cityNorm }
    : resolveProvinceCityFromCityLabel(cityNorm);
  return {
    address: input.venueAddress ?? '',
    province: fromCity.province || province,
    city: fromCity.city || cityNorm,
    lat: input.geoLat ?? null,
    lng: input.geoLng ?? null,
    placeId: input.googlePlaceId ?? null,
  };
}

export function eventFieldsFromLocationValue(value: LocationValue): {
  city: string | null;
  venueAddress: string | null;
  geoLat: number | null;
  geoLng: number | null;
  province: string | null;
  googlePlaceId: string | null;
} {
  const cityLabel = normalizeCityStored(value.city);
  const provinceLabel = normalizeProvinceStored(value.province);
  return {
    city: cityLabel || null,
    venueAddress: value.address.trim() || null,
    geoLat: isValidGeoCoord(value.lat) ? value.lat : null,
    geoLng: isValidGeoCoord(value.lng) ? value.lng : null,
    province: provinceLabel || null,
    googlePlaceId: googlePlaceIdFromLocationValue(value),
  };
}

export function locationValueFromRentalLocation(input: {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  googlePlaceId?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}): LocationValue {
  const province = normalizeProvinceStored(input.province);
  const cityNorm = normalizeCityStored(input.city);
  const fromCity = province
    ? { province, city: resolveProvinceCityFromCityLabel(cityNorm).city || cityNorm }
    : resolveProvinceCityFromCityLabel(cityNorm);
  return {
    address: input.address ?? '',
    province: fromCity.province || province,
    city: fromCity.city || cityNorm,
    lat: input.geoLat ?? null,
    lng: input.geoLng ?? null,
    placeId: input.googlePlaceId ?? null,
  };
}

/** Single atomic update when province changes (avoids stale spread wiping province). */
export function applyProvinceToLocationValue(value: LocationValue, province: string): LocationValue {
  if (!province) {
    return { ...value, province: '', city: '', lat: null, lng: null, placeId: null };
  }
  if (province !== value.province) {
    return { ...value, province, city: '', lat: null, lng: null, placeId: null };
  }
  return { ...value, province };
}

export function rentalLocationPayloadFromLocationValue(value: LocationValue): {
  address: string | null;
  city: string | null;
  province: string | null;
  googlePlaceId: string | null;
  geoLat: number | null;
  geoLng: number | null;
} {
  const cityLabel = normalizeCityStored(value.city);
  const provinceLabel = normalizeProvinceStored(value.province);
  return {
    address: value.address.trim() || null,
    city: cityLabel || null,
    province: provinceLabel || null,
    googlePlaceId: googlePlaceIdFromLocationValue(value),
    geoLat: isValidGeoCoord(value.lat) ? value.lat : null,
    geoLng: isValidGeoCoord(value.lng) ? value.lng : null,
  };
}

export function locationValueFromExcursionOperator(input: {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  googlePlaceId?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}): LocationValue {
  const province = normalizeProvinceStored(input.province);
  const cityNorm = normalizeCityStored(input.city);
  const fromCity = province
    ? { province, city: resolveProvinceCityFromCityLabel(cityNorm).city || cityNorm }
    : resolveProvinceCityFromCityLabel(cityNorm);
  return {
    address: input.address ?? '',
    province: fromCity.province || province,
    city: fromCity.city || cityNorm,
    lat: input.geoLat ?? null,
    lng: input.geoLng ?? null,
    placeId: input.googlePlaceId ?? null,
  };
}

export function excursionOperatorPayloadFromLocationValue(value: LocationValue): {
  address: string | null;
  city: string | null;
  province: string | null;
  googlePlaceId: string | null;
  geoLat: number | null;
  geoLng: number | null;
} {
  const cityLabel = normalizeCityStored(value.city);
  const provinceLabel = normalizeProvinceStored(value.province);
  return {
    address: value.address.trim() || null,
    city: cityLabel || null,
    province: provinceLabel || null,
    googlePlaceId: googlePlaceIdFromLocationValue(value),
    geoLat: isValidGeoCoord(value.lat) ? value.lat : null,
    geoLng: isValidGeoCoord(value.lng) ? value.lng : null,
  };
}

export function gastroLocationPayloadFromLocationValue(value: LocationValue): {
  province: string;
  city: string;
  address: string;
  lat: number | null;
  lng: number | null;
  googlePlaceId: string | null;
} {
  return {
    province: normalizeProvinceStored(value.province),
    city: normalizeCityStored(value.city),
    address: value.address.trim(),
    lat: isValidGeoCoord(value.lat) ? value.lat : null,
    lng: isValidGeoCoord(value.lng) ? value.lng : null,
    googlePlaceId: googlePlaceIdFromLocationValue(value),
  };
}

export function hotelLocationPayloadFromLocationValue(value: LocationValue): {
  address: string;
  city: string;
  province?: string;
  lat: number | null;
  lng: number | null;
  googlePlaceId: string | null;
} {
  const province = value.province.trim();
  return {
    address: value.address.trim(),
    city: value.city.trim(),
    ...(province ? { province } : {}),
    lat: isValidGeoCoord(value.lat) ? value.lat : null,
    lng: isValidGeoCoord(value.lng) ? value.lng : null,
    googlePlaceId: googlePlaceIdFromLocationValue(value),
  };
}
