'use client';

import { useEffect, useState } from 'react';
import { ARGENTINA_PROVINCES } from './argentina-locations';

type GoogleMapsNamespace = {
  maps: {
    Map: new (el: HTMLElement, opts: object) => GoogleMap;
    Marker: new (opts: object) => GoogleMarker;
    Geocoder: new () => GoogleGeocoder;
    LatLng: new (lat: number, lng: number) => object;
    event: {
      addListener: (
        instance: object,
        event: string,
        fn: (e: { latLng?: { lat: () => number; lng: () => number } }) => void,
      ) => void;
    };
    places: {
      Autocomplete: new (input: HTMLInputElement, opts?: object) => GoogleAutocomplete;
    };
  };
};

type GoogleMap = { setCenter: (c: object) => void; setZoom: (z: number) => void };
type GoogleMarker = {
  setPosition: (p: object) => void;
  getPosition: () => { lat: () => number; lng: () => number } | null;
  setMap: (m: GoogleMap | null) => void;
  addListener: (event: string, fn: () => void) => void;
};
type GoogleGeocoder = {
  geocode: (
    req: { location?: object },
    cb: (results: GoogleGeocodeResult[] | null, status: string) => void,
  ) => void;
};
type GoogleGeocodeResult = {
  formatted_address?: string;
  place_id?: string;
  address_components?: { long_name: string; short_name: string; types: string[] }[];
};
type GoogleAutocomplete = {
  addListener: (event: string, fn: () => void) => void;
  getPlace: () => {
    formatted_address?: string;
    geometry?: { location?: { lat: () => number; lng: () => number } };
    place_id?: string;
    address_components?: { long_name: string; types: string[] }[];
  };
};

declare global {
  interface Window {
    google?: GoogleMapsNamespace;
    __ytiGoogleMapsLoad?: Promise<void>;
  }
}

const MAPS_CALLBACK = '__ytiGoogleMapsReady';

export function getGoogleMapsApiKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  return key?.trim() || undefined;
}

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.google?.maps) return Promise.resolve();
  if (window.__ytiGoogleMapsLoad) return window.__ytiGoogleMapsLoad;

  window.__ytiGoogleMapsLoad = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-yti-google-maps]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')));
      return;
    }

    (window as unknown as Record<string, () => void>)[MAPS_CALLBACK] = () => resolve();

    const script = document.createElement('script');
    script.dataset.ytiGoogleMaps = '1';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&callback=${MAPS_CALLBACK}`;
    script.onerror = () => reject(new Error('Google Maps failed to load'));
    document.head.appendChild(script);
  });

  return window.__ytiGoogleMapsLoad;
}

export function useGoogleMaps(): { ready: boolean; error: string | null } {
  const apiKey = getGoogleMapsApiKey();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  return { ready: !!apiKey && ready, error };
}

export function extractProvinceCityFromComponents(
  components: { long_name: string; types: string[] }[] | undefined,
): { province: string; city: string } {
  if (!components?.length) return { province: '', city: '' };

  let provinceName = '';
  let cityName = '';

  for (const c of components) {
    if (c.types.includes('administrative_area_level_1')) provinceName = c.long_name;
    if (c.types.includes('locality')) cityName = c.long_name;
    else if (!cityName && c.types.includes('administrative_area_level_2')) cityName = c.long_name;
  }

  const { province, city } = resolveProvinceCityFromGoogleNames(provinceName, cityName);
  return { province, city };
}

function resolveProvinceCityFromGoogleNames(
  provinceName: string,
  cityName: string,
): { province: string; city: string } {
  const pNorm = provinceName.toLowerCase();
  const cNorm = cityName.toLowerCase();

  for (const p of ARGENTINA_PROVINCES) {
    if (p.label.toLowerCase().includes(pNorm) || pNorm.includes(p.label.toLowerCase().slice(0, 8))) {
      for (const c of p.cities) {
        if (c.label.toLowerCase() === cNorm || cNorm.includes(c.label.toLowerCase().slice(0, 6))) {
          return { province: p.value, city: c.value };
        }
      }
      return { province: p.value, city: '' };
    }
  }
  return { province: '', city: '' };
}

export type { GoogleMap, GoogleMarker, GoogleGeocoder, GoogleGeocodeResult, GoogleAutocomplete, GoogleMapsNamespace };
