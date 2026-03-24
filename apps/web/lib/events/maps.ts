/**
 * Pure Google Maps URL helpers — UI-agnostic.
 */

/**
 * Build a Google Maps URL from coordinates.
 * Returns null if coordinates are invalid.
 */
export function buildGoogleMapsHrefFromCoordinates(
  lat: number | null | undefined,
  lng: number | null | undefined
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

/**
 * Build a Google Maps search URL from address/city/venue.
 * Uses query string search when coordinates are not available.
 */
export function buildGoogleMapsHrefFromAddress(
  address?: string | null,
  city?: string | null,
  venueName?: string | null
): string {
  const parts = [address, venueName, city].filter(Boolean).map(String);
  const query = parts.length > 0 ? parts.join(', ') : 'Argentina';
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

/**
 * Build Google Maps embed iframe src (no API key).
 * Prefers coordinates; falls back to address query.
 */
export function buildGoogleMapsEmbedSrc(event: {
  geoLat?: number | null;
  geoLng?: number | null;
  venueAddress?: string | null;
  venueName?: string | null;
  city?: string | null;
}): string | null {
  const coords = buildGoogleMapsHrefFromCoordinates(event.geoLat, event.geoLng);
  if (coords) return coords + '&output=embed';
  const parts = [event.venueAddress, event.venueName, event.city].filter(Boolean).map(String);
  if (parts.length === 0) return null;
  const q = encodeURIComponent(parts.join(', '));
  return `https://www.google.com/maps?q=${q}&output=embed`;
}

/**
 * Get the best available Google Maps URL for an event.
 * Prefers coordinates; falls back to address-based search.
 */
export function buildEventGoogleMapsHref(event: {
  geoLat?: number | null;
  geoLng?: number | null;
  venueAddress?: string | null;
  venueName?: string | null;
  city?: string | null;
}): string {
  const coordsHref = buildGoogleMapsHrefFromCoordinates(event.geoLat, event.geoLng);
  if (coordsHref) return coordsHref;
  return buildGoogleMapsHrefFromAddress(
    event.venueAddress,
    event.city,
    event.venueName
  );
}
