import { ARGENTINA_PROVINCES } from './argentina-locations';
import type { LocationValue } from './location.types';

export function parseGeoCoord(raw: string | number | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number.parseFloat(String(raw).trim());
  return Number.isFinite(n) ? n : null;
}

export function isValidGeoCoord(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

export function cityLabelFromValue(cityValue: string): string {
  if (!cityValue) return '';
  for (const p of ARGENTINA_PROVINCES) {
    const c = p.cities.find((x) => x.value === cityValue);
    if (c) return c.label;
  }
  return cityValue;
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

export function locationValueFromEventFields(input: {
  city?: string | null;
  venueAddress?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}): LocationValue {
  const { province, city } = resolveProvinceCityFromCityLabel(input.city);
  return {
    address: input.venueAddress ?? '',
    province,
    city: city || '',
    lat: input.geoLat ?? null,
    lng: input.geoLng ?? null,
    placeId: null,
  };
}

export function eventFieldsFromLocationValue(value: LocationValue): {
  city: string | null;
  venueAddress: string | null;
  geoLat: number | null;
  geoLng: number | null;
} {
  const cityLabel = cityLabelFromValue(value.city) || value.city.trim();
  return {
    city: cityLabel || null,
    venueAddress: value.address.trim() || null,
    geoLat: isValidGeoCoord(value.lat) ? value.lat : null,
    geoLng: isValidGeoCoord(value.lng) ? value.lng : null,
  };
}

export function locationValueFromRentalLocation(input: {
  address?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}): LocationValue {
  return {
    address: input.address ?? '',
    province: '',
    city: '',
    lat: input.geoLat ?? null,
    lng: input.geoLng ?? null,
    placeId: null,
  };
}

/** Single atomic update when province changes (avoids stale spread wiping province). */
export function applyProvinceToLocationValue(value: LocationValue, province: string): LocationValue {
  if (!province) {
    return { ...value, province: '', city: '' };
  }
  const p = ARGENTINA_PROVINCES.find((x) => x.value === province);
  const keepCity = p?.cities.some((c) => c.value === value.city) ?? false;
  return { ...value, province, city: keepCity ? value.city : '' };
}

export function rentalLocationPayloadFromLocationValue(value: LocationValue): {
  address: string | null;
  geoLat: number | null;
  geoLng: number | null;
} {
  return {
    address: value.address.trim() || null,
    geoLat: isValidGeoCoord(value.lat) ? value.lat : null,
    geoLng: isValidGeoCoord(value.lng) ? value.lng : null,
  };
}

export function locationValueFromExcursionOperator(input: {
  address?: string | null;
  city?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}): LocationValue {
  const { province, city } = resolveProvinceCityFromCityLabel(input.city);
  return {
    address: input.address ?? '',
    province,
    city: city || '',
    lat: input.geoLat ?? null,
    lng: input.geoLng ?? null,
    placeId: null,
  };
}

export function excursionOperatorPayloadFromLocationValue(value: LocationValue): {
  address: string | null;
  city: string | null;
  geoLat: number | null;
  geoLng: number | null;
} {
  const cityLabel = cityLabelFromValue(value.city) || value.city.trim();
  return {
    address: value.address.trim() || null,
    city: cityLabel || null,
    geoLat: isValidGeoCoord(value.lat) ? value.lat : null,
    geoLng: isValidGeoCoord(value.lng) ? value.lng : null,
  };
}
