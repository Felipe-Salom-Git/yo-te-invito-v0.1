# V3.1 Etapa 6 Slice 6.3 — Scanner offline snapshot

**Fecha:** 2026-06-10

## Endpoint

`GET /scanner/events/:eventId/snapshot` — rol SCANNER, scope cuenta padre.

Respuesta: `snapshotId`, `version`, `generatedAt`, `expiresAt` (48h), `contentId`, `contentType`, `eventTitle`, `tickets[]` con `ticketId`, `status`, `buyerName`, `ticketType`, `code`, `qrPayload`.

## Storage local (PWA)

| Aspecto | Valor |
|---------|--------|
| Motor | **IndexedDB** `ScannerOfflineDB` v2 |
| Stores | `tickets_store`, `snapshot_meta`, `scan_queue` |
| Meta | evento, versión, fecha descarga, cantidad |

## Datos guardados

- Metadatos snapshot por evento
- Tickets con `qrPayload` (necesario para validación offline futura — solo en dispositivo autenticado)
- No se guarda en `localStorage` datos de negocio masivos

## Riesgos documentados

- Dispositivo perdido → listado con QRs en IndexedDB sin cifrado V1
- Listado puede quedar desactualizado → `expiresAt` + aviso UI
- Reemplazo requiere confirmación

## UI Scanner

- «Guardar listado offline»
- Estado: cantidad, fecha, evento
- «Borrar listado local»
- Advertencia operativa antes del evento

## Pendiente Slice 6.4

Validación offline contra snapshot con estados pendientes.
