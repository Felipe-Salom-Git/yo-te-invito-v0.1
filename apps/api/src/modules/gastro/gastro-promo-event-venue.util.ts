/**
 * G12.4 — Venue of a gastro promotional event: the local's own location or a custom one from the
 * modern location picker. The two modes never mix fields (no custom pin with the local address).
 * G12.4 — Ubicación del evento: la del local o una propia; los modos nunca se mezclan.
 */

export type PromoEventVenue = {
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  province: string | null;
  googlePlaceId: string | null;
  geoLat: number | null;
  geoLng: number | null;
};

type ProfileLocation = {
  displayName: string;
  address: string | null;
  city: string | null;
  province: string | null;
  googlePlaceId: string | null;
  geoLat: number | null;
  geoLng: number | null;
};

type VenueInput = {
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  province?: string | null;
  googlePlaceId?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
};

const clean = (v: string | null | undefined) => v?.trim() || null;

export function localVenue(profile: ProfileLocation): PromoEventVenue {
  return {
    venueName: profile.displayName,
    venueAddress: profile.address,
    city: profile.city,
    province: profile.province,
    googlePlaceId: profile.googlePlaceId,
    geoLat: profile.geoLat,
    geoLng: profile.geoLng,
  };
}

export function customVenue(input: VenueInput): PromoEventVenue {
  const hasPin = input.geoLat != null && input.geoLng != null;
  return {
    venueName: clean(input.venueName),
    venueAddress: clean(input.venueAddress),
    city: clean(input.city),
    province: clean(input.province),
    googlePlaceId: clean(input.googlePlaceId),
    geoLat: hasPin ? input.geoLat! : null,
    geoLng: hasPin ? input.geoLng! : null,
  };
}

/** Create: explicit flag wins; legacy clients (G12.2) → local unless a custom address was sent. */
export function resolveCreateUsesLocal(input: { useLocalLocation?: boolean; venueAddress?: string | null }): boolean {
  return input.useLocalLocation ?? !input.venueAddress?.trim();
}

/** True when the stored venue still equals the local's current location. */
export function venueMatchesLocal(venue: PromoEventVenue, profile: ProfileLocation): boolean {
  const local = localVenue(profile);
  return (
    (venue.venueAddress ?? null) === (local.venueAddress ?? null) &&
    (venue.city ?? null) === (local.city ?? null) &&
    (venue.province ?? null) === (local.province ?? null) &&
    (venue.geoLat ?? null) === (local.geoLat ?? null) &&
    (venue.geoLng ?? null) === (local.geoLng ?? null)
  );
}
