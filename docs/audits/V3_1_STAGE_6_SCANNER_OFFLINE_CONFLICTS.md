# V3.1 Etapa 6 Slice 6.6 — Offline sync conflicts

**Fecha:** 2026-06-10

## Política V1 (backend fuente de verdad)

| Estado ticket online | Resultado sync |
|---------------------|----------------|
| VALID | `synced` → USED |
| USED (antes del scan offline) | `conflict` |
| USED (idempotente mismo localId) | `synced` |
| REVOKED | `revoked` |
| TRANSFER_* | `transferred` |
| No existe | `not_found` |
| Otro scope | `forbidden_scope` (vía assert previo) |

## UI

`OfflineConflictPanel` — motivo, código, fecha scan offline, mensaje sugerido.

Copy: «Revisá manualmente con organización» / «Esta entrada ya figuraba usada online».

## Historial

Conflictos permanecen en IndexedDB (`syncStatus: conflict`); no se borran al cerrar PWA.

## Pendiente Slice 6.7

Pulido visual estados en `ScannerConnectionStatus`.
