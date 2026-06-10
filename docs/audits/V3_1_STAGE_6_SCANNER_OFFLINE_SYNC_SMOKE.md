# V3.1 Etapa 6 Slice 6.5 — Scanner offline sync

**Fecha:** 2026-06-10

## Endpoint

`POST /scanner/offline-validations/sync`

Payload: `snapshotVersion`, `contentId`, `contentType: EVENT`, `validations[]` con `localId`, `qrPayload`, `scannedAt`, `deviceId`.

## Idempotencia

- `deviceId` en `TicketScanLog` = `offline:{localId}`
- Reintento misma `localId` → `synced` sin duplicar scan

## Respuesta por ítem

`synced` | `already_used` | `not_found` | `conflict` | `rejected` | `revoked` | `transferred`

## UX Scanner

- Botón «Sincronizar pendientes» (manual V1)
- Resumen: X sincronizadas, Y conflictos, Z errores
- No auto-sync silencioso en V1

## Pendiente Slice 6.6

Política de conflictos documentada en UI dedicada.
