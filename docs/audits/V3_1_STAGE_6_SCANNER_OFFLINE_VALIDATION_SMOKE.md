# V3.1 Etapa 6 Slice 6.4 — Scanner offline validation

**Fecha:** 2026-06-10

## Flujo

1. Detectar offline (`navigator.onLine`)
2. Si hay snapshot → `scanOffline(eventId, qrPayload)`
3. Buscar ticket por `qrPayload` + `eventId` en IndexedDB
4. Marcar USED local + encolar en `scan_queue` con `syncStatus: pending`
5. Mostrar «Validación offline pendiente de sincronizar»

## Estados offline

| Estado | Resultado scan |
|--------|----------------|
| Sin snapshot | INVALID |
| QR válido VALID | OK + pendingSync |
| Ya USED local | ALREADY_USED |
| REVOKED / transfer | REVOKED / INVALID |
| Snapshot vencido | OK/INVALID + `staleSnapshot` warning |

## Cola local

`QueuedScan`: `localId`, `qrPayload`, `eventId`, `scannedAt`, `deviceId`, `syncStatus`.

## Pendiente Slice 6.5

Sync manual/al reconectar con backend idempotente.
