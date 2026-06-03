/**
 * Event-scoped Google Maps URL helpers.
 * @deprecated Prefer `@/lib/maps` — these re-export the shared public-location API.
 */
import {
  buildGoogleMapsHrefFromAddress,
  buildGoogleMapsHrefFromCoordinates,
  buildPublicGoogleMapsEmbedSrc,
  buildPublicGoogleMapsHref,
  type PublicLocationFields,
} from '@/lib/maps';

export { buildGoogleMapsHrefFromCoordinates, buildGoogleMapsHrefFromAddress };

export function buildGoogleMapsEmbedSrc(event: {
  geoLat?: number | null;
  geoLng?: number | null;
  venueAddress?: string | null;
  venueName?: string | null;
  city?: string | null;
}): string | null {
  return buildPublicGoogleMapsEmbedSrc({
    geoLat: event.geoLat,
    geoLng: event.geoLng,
    address: event.venueAddress,
    venueName: event.venueName,
    city: event.city,
  });
}

export function buildEventGoogleMapsHref(event: {
  geoLat?: number | null;
  geoLng?: number | null;
  venueAddress?: string | null;
  venueName?: string | null;
  city?: string | null;
}): string {
  return buildPublicGoogleMapsHref({
    geoLat: event.geoLat,
    geoLng: event.geoLng,
    address: event.venueAddress,
    venueName: event.venueName,
    city: event.city,
  } satisfies PublicLocationFields);
}
