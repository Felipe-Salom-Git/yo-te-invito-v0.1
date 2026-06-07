'use client';

import { Input } from '@/components/ui/Input';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { parseGeoCoord } from './location.utils';
import { getGoogleMapsApiKey } from './useGoogleMaps';
import type { LocationPickerMapProps } from './location.types';

export function LocationPickerMapFallback({
  value,
  onChange,
  disabled,
  label,
  helperText,
  error,
  mapsLoadError,
}: LocationPickerMapProps) {
  const showDevWarning =
    process.env.NODE_ENV === 'development' && !getGoogleMapsApiKey();

  const handleAddressChange = (address: string) => {
    onChange({ ...value, address });
  };

  const handleLatChange = (raw: string) => {
    onChange({ ...value, lat: parseGeoCoord(raw) });
  };

  const handleLngChange = (raw: string) => {
    onChange({ ...value, lng: parseGeoCoord(raw) });
  };

  const latStr = value.lat != null ? String(value.lat) : '';
  const lngStr = value.lng != null ? String(value.lng) : '';

  return (
    <div className="rounded-xl border border-border bg-bg-muted p-4 space-y-3">
      {label ? <p className="text-sm font-medium text-text">{label}</p> : null}
      {showDevWarning ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          Google Maps no está configurado (<code className="text-amber-100">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>).
          Podés cargar dirección y coordenadas manualmente.
        </p>
      ) : mapsLoadError ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          No se pudo cargar el mapa interactivo. Completá la dirección y las coordenadas manualmente.
        </p>
      ) : (
        <p className="text-xs text-text-muted">
          Mapa interactivo no disponible. Completá la dirección y, si tenés, las coordenadas.
        </p>
      )}
      <Input
        label="Dirección"
        value={value.address}
        onChange={(e) => handleAddressChange(e.target.value)}
        placeholder="Calle, número, referencia"
        disabled={disabled}
        error={error}
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Latitud (opcional)"
          type="number"
          step="any"
          value={latStr}
          onChange={(e) => handleLatChange(e.target.value)}
          placeholder="-41.1335"
          disabled={disabled}
        />
        <Input
          label="Longitud (opcional)"
          type="number"
          step="any"
          value={lngStr}
          onChange={(e) => handleLngChange(e.target.value)}
          placeholder="-71.3103"
          disabled={disabled}
        />
      </div>
      <LatLngMapPreview lat={latStr} lng={lngStr} />
      {helperText ? <p className="text-xs text-text-muted">{helperText}</p> : null}
    </div>
  );
}
