'use client';

import { buildEventGoogleMapsHref, buildGoogleMapsEmbedSrc } from '@/lib/events/maps';

export interface EventLocationSectionProps {
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  /** When true, section fills available height (e.g. when aligned with reviews) */
  fillHeight?: boolean;
}

export function EventLocationSection({
  venueName,
  venueAddress,
  city,
  geoLat,
  geoLng,
  fillHeight,
}: EventLocationSectionProps) {
  const hasAny = venueName || venueAddress || city || (geoLat != null && geoLng != null);
  if (!hasAny) return null;

  const mapsHref = buildEventGoogleMapsHref({
    geoLat,
    geoLng,
    venueAddress,
    venueName,
    city,
  });
  const embedSrc = buildGoogleMapsEmbedSrc({
    geoLat,
    geoLng,
    venueAddress,
    venueName,
    city,
  });

  return (
    <section className={`${fillHeight ? 'flex h-full min-h-[280px] flex-col' : 'mt-10'}`}>
      <h2 className="text-lg font-semibold text-white mb-3">Ubicación</h2>
      <div className={`rounded-xl border border-border bg-bg-muted/50 overflow-hidden ${fillHeight ? 'flex-1 min-h-0 flex flex-col' : ''}`}>
        <div className="p-5">
          {venueName && (
            <p className="font-medium text-white">{venueName}</p>
          )}
          {(venueAddress || city) && (
            <p className="mt-1 text-sm text-text-muted">
              {[venueAddress, city].filter(Boolean).join(', ')}
            </p>
          )}
          {embedSrc && (
            <div className={`mt-4 w-full overflow-hidden rounded-lg border border-border/80 ${fillHeight ? 'flex-1 min-h-[200px]' : 'aspect-video'}`}>
              <iframe
                src={embedSrc}
                title="Ubicación en el mapa"
                className="h-full w-full border-0"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-bg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
          >
            Abrir en Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}
