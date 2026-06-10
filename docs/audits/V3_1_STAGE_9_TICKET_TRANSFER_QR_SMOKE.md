# V3.1 Etapa 9 — QR y scanner transferencia (Slice 9.5)

**Fecha:** 2026-06-10

## Estrategia QR

**El QR cambia al aceptar:** se crea ticket destino con nuevo `qrPayload` (`generateTicketQrPayload`). Ticket origen queda `TRANSFERRED` con el QR anterior en BD.

| Fase | Emisor | Receptor | Scanner |
|------|--------|----------|---------|
| Antes de transferir | QR `VALID` | — | Acepta si `VALID` |
| Oferta pending | QR visible con overlay bloqueado; `TRANSFER_PENDING` | — | Rechaza (`invalid`) |
| Tras aceptar | Ticket origen `TRANSFERRED`; no en listado activo | Nuevo ticket `VALID` + nuevo QR | Orig. rechazado; dest. acepta |
| Screenshot QR viejo | Mismo payload posible | — | Backend valida **estado** del ticket por `qrPayload` |

## Código scanner

`ScannerService.validate`: rechaza `TRANSFER_PENDING` y `TRANSFERRED`. Offline sync: código `transferred`.

## UI

- `isTicketEntryBlocked`: pending/transferred/used/revoked.
- Impresión: banner «No válido para ingreso» si bloqueado.

## QA

- `smoke:user-portal` — rechazo `TRANSFER_PENDING`.
- Regresión: ticket `VALID` normal sin cambios.
