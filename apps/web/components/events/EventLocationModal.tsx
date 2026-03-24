'use client';

import { useEffect, useCallback } from 'react';
import { buildEventGoogleMapsHref } from '@/lib/events/maps';

export interface EventLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueName?: string | null;
  venueAddress?: string | null;
  city?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
}

export function EventLocationModal({
  isOpen,
  onClose,
  venueName,
  venueAddress,
  city,
  geoLat,
  geoLng,
}: EventLocationModalProps) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const mapsHref = buildEventGoogleMapsHref({
    geoLat,
    geoLng,
    venueAddress,
    venueName,
    city,
  });
  const hasLocation = venueName || venueAddress || city;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="location-modal-title"
    >
      <div
        className="absolute inset-0 bg-black/85 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-bg-muted p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="location-modal-title" className="text-lg font-semibold text-white">
            Ubicación
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-text-muted transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Cerrar"
          >
            <span className="text-xl leading-none">×</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {venueName && (
            <p className="font-medium text-white">{venueName}</p>
          )}
          {(venueAddress || city) && (
            <p className="text-sm text-text-muted">
              {[venueAddress, city].filter(Boolean).join(', ')}
            </p>
          )}
          {!hasLocation && (
            <p className="text-sm text-text-muted">No hay dirección cargada.</p>
          )}
        </div>

        <div className="mt-6">
          <a
            href={mapsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 font-semibold text-bg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-muted"
          >
            Abrir en Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
