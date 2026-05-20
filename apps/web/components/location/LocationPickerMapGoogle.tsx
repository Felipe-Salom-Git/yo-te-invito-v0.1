'use client';

import { useEffect, useRef } from 'react';
import { Input } from '@/components/ui/Input';
import {
  extractProvinceCityFromComponents,
  type GoogleAutocomplete,
  type GoogleMap,
  type GoogleMarker,
} from './useGoogleMaps';
import type { LocationValue } from './location.types';

const DEFAULT_CENTER = { lat: -41.1335, lng: -71.3103 };

type Props = {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
  error?: string;
};

export function LocationPickerMapGoogle({ value, onChange, disabled, label, helperText, error }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mapInstance = useRef<GoogleMap | null>(null);
  const markerRef = useRef<GoogleMarker | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

  useEffect(() => {
    const g = window.google;
    if (!g?.maps || !mapRef.current) return;

    const initial = valueRef.current;
    const center =
      initial.lat != null && initial.lng != null
        ? { lat: initial.lat, lng: initial.lng }
        : DEFAULT_CENTER;

    const map = new g.maps.Map(mapRef.current, {
      center,
      zoom: initial.lat != null ? 15 : 6,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstance.current = map;

    const marker = new g.maps.Marker({
      map,
      position: initial.lat != null && initial.lng != null ? center : undefined,
      draggable: !disabled,
    });
    markerRef.current = marker;

    const patch = (patchValue: Partial<LocationValue>) => {
      onChangeRef.current({ ...valueRef.current, ...patchValue });
    };

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      if (!pos) return;
      const lat = pos.lat();
      const lng = pos.lng();
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location: pos }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const inferred = extractProvinceCityFromComponents(results[0].address_components);
          patch({
            lat,
            lng,
            address: results[0].formatted_address ?? valueRef.current.address,
            placeId: results[0].place_id ?? null,
            province: inferred.province || valueRef.current.province,
            city: inferred.city || valueRef.current.city,
          });
        } else {
          patch({ lat, lng });
        }
      });
    });

    g.maps.event.addListener(map, 'click', (e: { latLng?: { lat: () => number; lng: () => number } }) => {
      if (disabled || !e.latLng) return;
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition(e.latLng);
      const geocoder = new g.maps.Geocoder();
      geocoder.geocode({ location: e.latLng }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          const inferred = extractProvinceCityFromComponents(results[0].address_components);
          patch({
            lat,
            lng,
            address: results[0].formatted_address ?? valueRef.current.address,
            placeId: results[0].place_id ?? null,
            province: inferred.province || valueRef.current.province,
            city: inferred.city || valueRef.current.city,
          });
        } else {
          patch({ lat, lng });
        }
      });
    });

    if (searchRef.current && g.maps.places) {
      const ac = new g.maps.places.Autocomplete(searchRef.current, {
        fields: ['formatted_address', 'geometry', 'place_id', 'address_components'],
        componentRestrictions: { country: 'ar' },
      }) as GoogleAutocomplete;
      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        const lat = loc.lat();
        const lng = loc.lng();
        marker.setPosition(loc);
        map.setCenter(loc);
        map.setZoom(15);
        const inferred = extractProvinceCityFromComponents(place.address_components);
        patch({
          address: place.formatted_address ?? valueRef.current.address,
          lat,
          lng,
          placeId: place.place_id ?? null,
          province: inferred.province || valueRef.current.province,
          city: inferred.city || valueRef.current.city,
        });
      });
    }

    return () => {
      marker.setMap(null);
      mapInstance.current = null;
      markerRef.current = null;
    };
  }, [disabled]);

  useEffect(() => {
    const marker = markerRef.current;
    const map = mapInstance.current;
    if (!marker || !map || value.lat == null || value.lng == null) return;
    const pos = { lat: value.lat, lng: value.lng };
    marker.setPosition(pos);
    map.setCenter(pos);
  }, [value.lat, value.lng]);

  return (
    <div className="space-y-3">
      {label ? <p className="text-sm font-medium text-text">{label}</p> : null}
      <Input
        ref={searchRef}
        label="Buscar dirección"
        value={value.address}
        onChange={(e) => onChange({ ...value, address: e.target.value })}
        placeholder="Escribí una dirección o lugar"
        disabled={disabled}
        error={error}
      />
      <div
        ref={mapRef}
        className="h-[260px] w-full overflow-hidden rounded-lg border border-border bg-bg"
        aria-label="Mapa interactivo"
      />
      {value.lat != null && value.lng != null ? (
        <p className="text-xs text-accent">
          Pin: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </p>
      ) : (
        <p className="text-xs text-text-muted">Hacé clic en el mapa o buscá una dirección para colocar el pin.</p>
      )}
      {helperText ? <p className="text-xs text-text-muted">{helperText}</p> : null}
    </div>
  );
}
