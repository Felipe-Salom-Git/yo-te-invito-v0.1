'use client';

import { getGoogleMapsApiKey, useGoogleMaps } from './useGoogleMaps';
import { LocationPickerMapGoogle } from './LocationPickerMapGoogle';
import { LocationPickerMapFallback } from './LocationPickerMapFallback';
import type { LocationPickerMapProps } from './location.types';

export function LocationPickerMap(props: LocationPickerMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { ready, error } = useGoogleMaps();

  if (!apiKey || error) {
    return <LocationPickerMapFallback {...props} />;
  }

  if (!ready) {
    return (
      <div className="rounded-xl border border-border bg-bg-muted p-4">
        <p className="text-sm text-text-muted">Cargando mapa…</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-bg-muted p-4">
      <LocationPickerMapGoogle {...props} />
    </div>
  );
}
