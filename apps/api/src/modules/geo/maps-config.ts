/**
 * Server-side Google Geocoding API key (never expose to browser).
 * Falls back to GOOGLE_MAPS_API_KEY for local dev only.
 */
export function resolveGoogleGeocodingApiKey(): string | undefined {
  const server = process.env.GOOGLE_GEOCODING_API_KEY?.trim();
  if (server) return server;
  if (process.env.NODE_ENV !== 'production') {
    return process.env.GOOGLE_MAPS_API_KEY?.trim() || undefined;
  }
  return undefined;
}

export function isGeocodingConfigured(): boolean {
  return Boolean(resolveGoogleGeocodingApiKey());
}
