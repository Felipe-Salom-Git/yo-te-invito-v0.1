'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Input } from '@/components';
import { LatLngMapPreview } from '@/components/admin/LatLngMapPreview';
import { getErrorMessage } from '@/lib/errors';
import { useRepositories } from '@/repositories/context';
import type { GeoContext } from '@yo-te-invito/shared';
import { cityLabelFromValue, provinceLabelFromValue } from '@yo-te-invito/shared';
import { getGoogleMapsApiKey, useGoogleMaps, type GoogleMap, type GoogleMarker } from './useGoogleMaps';
import type { LocationValue } from './location.types';

const DEFAULT_CENTER = { lat: -41.1335, lng: -71.3103 };

export type AddressMapPickerProps = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  context: GeoContext;
  disabled?: boolean;
  label?: string;
  error?: string;
  helperText?: string;
};

function fingerprint(value: Pick<LocationValue, 'address' | 'city' | 'province'>): string {
  return `${value.address}|${value.city}|${value.province}`.trim().toLowerCase();
}

function isValidCoord(n: number | null | undefined): n is number {
  return n != null && Number.isFinite(n);
}

type MapCanvasProps = {
  lat: number | null;
  lng: number | null;
  mapEpoch: number;
  disabled?: boolean;
  onPinMove: (lat: number, lng: number) => void;
};

function MapCanvas({ lat, lng, mapEpoch, disabled, onPinMove }: MapCanvasProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const onPinMoveRef = useRef(onPinMove);
  onPinMoveRef.current = onPinMove;

  const hasPin = isValidCoord(lat) && isValidCoord(lng);
  const center = hasPin ? { lat: lat!, lng: lng! } : DEFAULT_CENTER;

  useEffect(() => {
    const g = window.google;
    if (!g?.maps || !mapRef.current) return;

    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: hasPin ? 15 : 6,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstance.current = map;

    const marker = new g.maps.Marker({
      map,
      position: hasPin ? center : undefined,
      draggable: !disabled && hasPin,
    });
    markerRef.current = marker;

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      onPinMoveRef.current(pos.lat(), pos.lng());
    });

    g.maps.event.addListener(map, 'click', (e: { latLng?: { lat: () => number; lng: () => number } }) => {
      if (disabled || !e.latLng) return;
      marker.setPosition(e.latLng);
      marker.setDraggable(!disabled);
      onPinMoveRef.current(e.latLng.lat(), e.latLng.lng());
    });

    return () => {
      marker.setMap(null);
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, [disabled, mapEpoch]);

  useEffect(() => {
    const marker = markerRef.current;
    const map = mapInstance.current;
    if (!marker || !map || !hasPin) return;

    const pos = { lat: lat!, lng: lng! };
    marker.setPosition(pos);
    marker.setDraggable(!disabled);
    if (typeof map.panTo === 'function') {
      map.panTo(pos);
    } else {
      map.setCenter(pos);
    }
    map.setZoom(15);
  }, [disabled, hasPin, lat, lng]);

  return (
    <div
      ref={mapRef}
      className="h-[260px] w-full overflow-hidden rounded-lg border border-border bg-bg"
      aria-label="Mapa interactivo"
    />
  );
}

export function AddressMapPicker({
  value,
  onChange,
  context,
  disabled,
  label = 'Dirección y mapa',
  error,
  helperText,
}: AddressMapPickerProps) {
  const repos = useRepositories();
  const apiKey = getGoogleMapsApiKey();
  const { ready, error: mapsError } = useGoogleMaps();

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [manualAdjust, setManualAdjust] = useState(false);
  const [resolvedFingerprint, setResolvedFingerprint] = useState<string | null>(null);
  const [mapEpoch, setMapEpoch] = useState(0);

  const currentFingerprint = useMemo(() => fingerprint(value), [value]);
  const hasCoords = isValidCoord(value.lat) && isValidCoord(value.lng);
  const isStale =
    resolvedFingerprint != null &&
    hasCoords &&
    currentFingerprint !== resolvedFingerprint &&
    !manualAdjust;

  const handleResolve = useCallback(async () => {
    setResolveError(null);
    setStatusMessage(null);
    if (!value.address.trim() || !value.city.trim() || !value.province.trim()) {
      setResolveError('Completá provincia, ciudad y dirección para ubicar el pin.');
      return;
    }
    setResolving(true);
    try {
      const city = cityLabelFromValue(value.city) || value.city.trim();
      const province = provinceLabelFromValue(value.province) || value.province.trim();
      const result = await repos.geo.resolveAddress({
        address: value.address.trim(),
        city,
        province,
        country: 'Argentina',
        context,
      });

      const nextLat = result.lat;
      const nextLng = result.lng;
      if (!isValidCoord(nextLat) || !isValidCoord(nextLng)) {
        setResolveError('No pudimos obtener coordenadas válidas para esta dirección.');
        return;
      }

      onChange({
        ...value,
        lat: nextLat,
        lng: nextLng,
        placeId: result.placeId ?? value.placeId ?? null,
      });
      setResolvedFingerprint(currentFingerprint);
      setManualAdjust(false);
      setMapEpoch((n) => n + 1);
      setStatusMessage('Ubicación encontrada. Revisá el pin antes de guardar.');
    } catch (err) {
      const message = getErrorMessage(err);
      if (message.toLowerCase().includes('no configurado') || message.toLowerCase().includes('no disponible')) {
        setResolveError('No pudimos consultar Google Maps en este momento. Podés ajustar el pin manualmente.');
      } else if (message.toLowerCase().includes('encontrar') || message.toLowerCase().includes('ambigua')) {
        setResolveError('No pudimos ubicar esa dirección. Revisá los datos o ajustá el pin manualmente.');
      } else {
        setResolveError(message);
      }
    } finally {
      setResolving(false);
    }
  }, [context, currentFingerprint, onChange, repos.geo, value]);

  const handlePinMove = useCallback(
    (lat: number, lng: number) => {
      setManualAdjust(true);
      setStatusMessage('Moviste el pin manualmente. Se guardará esta ubicación ajustada.');
      onChange({ ...value, lat, lng });
    },
    [onChange, value],
  );

  const showGoogleMap = Boolean(apiKey) && ready && !mapsError;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-bg-muted p-4">
      {label ? <p className="text-sm font-medium text-text">{label}</p> : null}

      <Input
        label="Dirección / punto de encuentro"
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        placeholder="Calle y altura"
        disabled={disabled}
        error={error}
      />

      <Button
        type="button"
        variant="secondary"
        disabled={disabled || resolving}
        onClick={() => void handleResolve()}
      >
        {resolving ? 'Buscando ubicación…' : 'Ubicar en el mapa'}
      </Button>

      {resolveError ? <p className="text-sm text-red-400">{resolveError}</p> : null}
      {statusMessage && !isStale ? (
        <p className="text-sm text-accent">{statusMessage}</p>
      ) : null}
      {isStale ? (
        <p className="text-sm text-amber-400">
          La ubicación cambió. Tocá «Ubicar en el mapa» para actualizar el pin.
        </p>
      ) : null}
      {mapsError ? (
        <p className="text-xs text-amber-400">
          Mapa interactivo no disponible ({mapsError}). Podés ubicar por dirección y revisar la
          vista previa.
        </p>
      ) : null}

      {showGoogleMap ? (
        <MapCanvas
          lat={value.lat}
          lng={value.lng}
          mapEpoch={mapEpoch}
          disabled={disabled}
          onPinMove={handlePinMove}
        />
      ) : hasCoords ? (
        <LatLngMapPreview lat={String(value.lat)} lng={String(value.lng)} />
      ) : null}

      {hasCoords ? (
        <p className="text-xs text-text-muted">
          Pin: {value.lat!.toFixed(5)}, {value.lng!.toFixed(5)}
          {manualAdjust ? ' · ajustado manualmente' : ''}
        </p>
      ) : (
        <p className="text-xs text-text-muted">
          Completá la dirección y tocá «Ubicar en el mapa» para colocar el pin.
        </p>
      )}

      {helperText ? <p className="text-xs text-text-muted">{helperText}</p> : null}
    </div>
  );
}
