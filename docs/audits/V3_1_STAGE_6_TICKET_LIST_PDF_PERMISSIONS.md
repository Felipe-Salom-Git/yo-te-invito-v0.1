# V3.1 Etapa 6 Slice 6.2 — Ticket list PDF permissions

**Fecha:** 2026-06-10

## Matriz de permisos final

| Rol | Puede descargar PDF | Condición |
|-----|---------------------|-----------|
| ADMIN | Sí | Evento del tenant; ownership vía `producerId` o rol admin |
| PRODUCER_OWNER / PRODUCER_STAFF | Sí | Solo eventos donde `event.producerId === userId` |
| SCANNER | Sí | Cuenta activa + `parentProfileType=PRODUCER` + `event.producerProfileId === parentProfileId` |
| GASTRO_OWNER | No | Scope PDF solo eventos productora (no descuentos gastro en V1) |
| USER | No | `FORBIDDEN` |
| REFERRER | No | Sin endpoint |
| HOTEL_OWNER | No | Sin endpoint |

## Checks backend

- `assertProducerCanExport` — tenant + ownership o ADMIN
- `assertScannerCanExport` — `requireActiveAccountForScanning` + scope evento
- Scanner inactivo → `SCANNER_INACTIVE` (403)
- Evento ajeno / inexistente → `FORBIDDEN` / `NOT_FOUND`
- Sin entradas → `NO_TICKETS` (400)

## Frontend

- Botón PDF productora solo en detalle evento (portal productor autenticado)
- Scanner: botón solo con evento seleccionado y usuario scanner configurado
- Errores vía toast (web) / mensaje inline (scanner)

## Smoke

`pnpm --filter api run smoke:v31-ticket-list-pdf-permissions`

Casos: USER bloqueado, productora B bloqueada en evento A, scanner vinculado OK, scanner inactivo bloqueado, evento inexistente.

## Pendiente Slice 6.3

Snapshot offline estructurado en PWA.
