import { hasPublicLocationForMapLink } from '@/lib/maps';
import type { EventDetail } from '@yo-te-invito/shared';

type ExcursionOperatorLocation = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
};

export type ResolvedExcursionPublicLocation = {
  venueName: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  geoLat: number | null;
  geoLng: number | null;
  hasLocation: boolean;
  /** True when event-level fields are used instead of operator fallback */
  usesEventLocation: boolean;
};

function eventHasOwnLocation(event: Pick<
  EventDetail,
  'venueAddress' | 'city' | 'geoLat' | 'geoLng'
>): boolean {
  return hasPublicLocationForMapLink({
    address: event.venueAddress,
    city: event.city,
    venueName: null,
    geoLat: event.geoLat,
    geoLng: event.geoLng,
  });
}

export function resolveExcursionPublicLocation(
  event: Pick<
    EventDetail,
    'venueName' | 'venueAddress' | 'city' | 'province' | 'geoLat' | 'geoLng'
  >,
  operator?: ExcursionOperatorLocation | null,
): ResolvedExcursionPublicLocation {
  const usesEventLocation = eventHasOwnLocation(event);

  const address = usesEventLocation
    ? (event.venueAddress ?? null)
    : (operator?.address ?? event.venueAddress ?? null);
  const city = usesEventLocation
    ? (event.city ?? null)
    : (operator?.city ?? event.city ?? null);
  const province = usesEventLocation
    ? (event.province ?? null)
    : (operator?.province ?? event.province ?? null);
  const geoLat = usesEventLocation
    ? (event.geoLat ?? null)
    : (operator?.geoLat ?? event.geoLat ?? null);
  const geoLng = usesEventLocation
    ? (event.geoLng ?? null)
    : (operator?.geoLng ?? event.geoLng ?? null);
  const venueName = operator?.name ?? event.venueName ?? null;

  const hasLocation = hasPublicLocationForMapLink({
    address,
    city,
    venueName,
    geoLat,
    geoLng,
  });

  return {
    venueName,
    address,
    city,
    province,
    geoLat,
    geoLng,
    hasLocation,
    usesEventLocation,
  };
}

export function formatExcursionLocationLabel(
  location: Pick<ResolvedExcursionPublicLocation, 'address' | 'city' | 'province'>,
): string | null {
  const parts = [location.address?.trim(), location.city?.trim(), location.province?.trim()].filter(
    Boolean,
  );
  return parts.length > 0 ? parts.join(', ') : null;
}
