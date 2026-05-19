'use client';

/**
 * Map preview without Google API key (OpenStreetMap embed).
 * Set NEXT_PUBLIC_MAP_PREVIEW=0 to hide in environments that block iframes.
 */
export function LatLngMapPreview({ lat, lng }: { lat: string; lng: string }) {
  if (typeof process.env.NEXT_PUBLIC_MAP_PREVIEW === 'string' && process.env.NEXT_PUBLIC_MAP_PREVIEW === '0') {
    return null;
  }
  const latN = Number.parseFloat(lat);
  const lngN = Number.parseFloat(lng);
  if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
  const delta = 0.03;
  const bbox = `${lngN - delta},${latN - delta},${lngN + delta},${latN + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${latN}%2C${lngN}`;
  return (
    <div className="mt-3 space-y-1">
      <p className="text-xs text-text-muted">Vista previa (OpenStreetMap)</p>
      <div className="overflow-hidden rounded-lg border border-border">
        <iframe title="Mapa" width="100%" height={220} src={src} className="border-0" loading="lazy" />
      </div>
      <a
        href={`https://www.openstreetmap.org/?mlat=${latN}&mlon=${lngN}#map=16/${latN}/${lngN}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-accent hover:underline"
      >
        Abrir en mapa
      </a>
    </div>
  );
}
