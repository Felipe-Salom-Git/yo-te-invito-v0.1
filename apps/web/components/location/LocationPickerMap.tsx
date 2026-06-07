'use client';

import { getGoogleMapsApiKey, useGoogleMaps } from './useGoogleMaps';
import { LocationPickerMapGoogle } from './LocationPickerMapGoogle';
import { LocationPickerMapFallback } from './LocationPickerMapFallback';
import type { LocationPickerMapProps } from './location.types';

export function LocationPickerMap(props: LocationPickerMapProps) {
  const apiKey = getGoogleMapsApiKey();
  const { ready, error } = useGoogleMaps();

  if (!apiKey) {
    return <LocationPickerMapFallback {...props} mapsLoadError={null} />;
  }

  if (error) {
    return <LocationPickerMapFallback {...props} mapsLoadError={error} />;
  }

  if (!ready) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-xl border border-border bg-bg-muted p-4">
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
