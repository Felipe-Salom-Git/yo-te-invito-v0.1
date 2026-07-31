# V3.2 Slice 7 — Mini mapa lazy (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`

## Cambios

- `EventLocationModal`: iframe embed lazy (`buildPublicGoogleMapsEmbedSrc`) solo al abrir + CTA Google Maps.
- Sin mapas en carruseles / ContentPreviewModal (sin geo en listados).

## Validación

`pnpm --filter web run build`
