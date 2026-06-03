/**
 * Shared helpers for public “Ver ubicación” — coords-first, address fallback.
 * Used by event, gastro, hotel, rental, excursion and (text-only) producer pages.
 */

export type PublicLocationFields = {
  address?: string | null;
  city?: string | null;
  province?: string | null;
  venueName?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  country?: string | null;
};

export function buildGoogleMapsHrefFromCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string | null {
  if (
    lat == null ||
    lng == null ||
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    Number.isNaN(lat) ||
    Number.isNaN(lng)
  ) {
    return null;
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lng)}`;
}

export function buildGoogleMapsHrefFromAddress(
  address?: string | null,
  city?: string | null,
  venueName?: string | null,
  country?: string | null,
): string {
  const parts = [address, venueName, city, country].filter(Boolean).map(String);
  const query = parts.length > 0 ? parts.join(', ') : 'Argentina';
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

/** True when the public UI can show address text or open a map link. */
export function hasPublicLocationData(fields: PublicLocationFields): boolean {
  if (buildGoogleMapsHrefFromCoordinates(fields.geoLat, fields.geoLng)) return true;
  if (fields.address?.trim()) return true;
  if (fields.city?.trim()) return true;
  if (fields.venueName?.trim()) return true;
  if (fields.country?.trim()) return true;
  return false;
}

/** Map button / modal — needs coords or a searchable address/city (not country alone). */
export function hasPublicLocationForMapLink(fields: PublicLocationFields): boolean {
  if (buildGoogleMapsHrefFromCoordinates(fields.geoLat, fields.geoLng)) return true;
  if (fields.address?.trim()) return true;
  if (fields.city?.trim()) return true;
  if (fields.venueName?.trim()) return true;
  return false;
}

export function buildPublicGoogleMapsHref(fields: PublicLocationFields): string {
  const coordsHref = buildGoogleMapsHrefFromCoordinates(fields.geoLat, fields.geoLng);
  if (coordsHref) return coordsHref;
  return buildGoogleMapsHrefFromAddress(
    fields.address,
    fields.city,
    fields.venueName,
    fields.country,
  );
}

export function buildPublicGoogleMapsEmbedSrc(fields: PublicLocationFields): string | null {
  const coords = buildGoogleMapsHrefFromCoordinates(fields.geoLat, fields.geoLng);
  if (coords) return `${coords}&output=embed`;
  const parts = [fields.address, fields.venueName, fields.city].filter(Boolean).map(String);
  if (parts.length === 0) return null;
  const q = encodeURIComponent(parts.join(', '));
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

/** Textual region for producer profiles (city/country only — no exact map). */
export function formatProducerLocationText(city?: string | null, country?: string | null): string | null {
  const parts = [city?.trim(), country?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}
