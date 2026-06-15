# V3.1 Etapa 15 — Pulido operativo entradas/scanner (cierre)

**Fecha:** 2026-06-15  
**Rama:** `feat/v1-s03-api-foundation`

## Resumen

Etapa operativa para puerta y productora: modal de resultado de escaneo, listado enriquecido de entradas en portal productor, y listado operativo en Scanner PWA con estado y hora de validación.

---

## Slice 15.1 — Modal resultado de escaneo

### Frontend (`apps/scanner`)

- Nuevo componente `ScanResultModal.tsx`.
- `DoorScannerClient` abre el modal automáticamente tras cada scan de entrada.
- Estados visuales: OK, ya usada, inválida, fecha incorrecta, revocada/transferida, offline, error de conexión.
- Cierre: botón, Escape, tap fuera; auto-cierre ~2,5 s solo en OK.
- Historial de escaneos se mantiene debajo del scanner.

### Backend

- `POST /scanner/scan` enriquecido con `eventTitle`, `holderName`, `occurrenceLabel`, `scannedAt`, `firstScannedAt`, `ticketStatus`.

### Schema shared

- `scanResponseSchema` ampliado con campos opcionales de contexto.

---

## Slice 15.2 — Listado productora

### Endpoint

`GET /producer/events/:eventId/tickets`

**Auth:** ADMIN, PRODUCER_OWNER, PRODUCER_STAFF (evento propio).

**Query opcional:** `page`, `limit`, `status`, `occurrenceId`, `q`, `referrer` (`true`|`false`), `scanned` (`true`|`false`).

**Respuesta:** `{ tickets[], pagination, kpis }`

Por ticket:

| Campo | Descripción |
|-------|-------------|
| `shortCode` | Código corto |
| `buyerName` / `buyerEmail` | Comprador |
| `ticketTypeName` | Tipo |
| `occurrenceLabel` | Función multi-fecha |
| `status` | VALID, USED, REVOKED, TRANSFER_PENDING, TRANSFERRED |
| `issuedAt` | Emisión/compra |
| `priceCents` | Precio unitario |
| `referral` | viaReferral, referrerName, referralCode |
| `scan` | scanned, scannedAt, scannedByLabel, scanCount |

**KPIs:** total, used, available, viaReferral, transferredOrRevoked.

### Frontend (`apps/web`)

- Sección **Entradas vendidas** en `/producer/events/[eventId]`.
- Componente `ProducerEventTicketsPanel`: KPIs, filtros, tabla desktop, cards mobile, paginación.
- Link a PDF existente (`TicketListPdfDownload`).
- Empty state: *"Todavía no hay entradas emitidas para este evento."*

### Servicio

- `EventTicketListService` en `apps/api/src/modules/tickets/event-ticket-list.service.ts`.

---

## Slice 15.3 — Listado scanner

### Endpoint

`GET /scanner/events/:eventId/tickets`

**Auth:** SCANNER (cuenta activa, evento de cuenta padre).

**Query:** `occurrenceId`, `q`, `status`, `scanned`.

**Respuesta:** `{ tickets[], total }` — sin datos de pago.

Campos por ticket: `ticketId`, `shortCode`, `qrPayload`, `holderName`, `ticketTypeName`, `occurrenceLabel`, `status`, `scannedAt`, `scannedBy`, `scanCount`, `lastScanResult`.

### Frontend (`apps/scanner`)

- Menú operativo → **Listado de entradas**.
- `ScannerTicketListPanel`: búsqueda, filtros (todas/usadas/no usadas/revocadas/transferidas), filtro por función, refresh manual.
- Indicador de snapshot offline cuando no hay red.

### Compatibilidad offline

- `GET /scanner/events/:eventId/snapshot` sin cambios.
- Preload offline sigue vía snapshot, no vía listado JSON.

---

## Estados soportados

| Estado | Productora | Scanner listado | Modal scan |
|--------|------------|-----------------|------------|
| VALID | Sí | Sí | OK |
| USED | Sí | Sí | ALREADY_USED |
| REVOKED | Sí | Sí | REVOKED |
| TRANSFER_PENDING | Sí | Sí | Inválida (transferencia pendiente) |
| TRANSFERRED | Sí | Sí | Inválida (transferida) |
| WRONG_OCCURRENCE | — | — | Sí (multi-fecha) |

---

## QA ejecutado (build local)

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | OK |
| `pnpm --filter api run build` | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter scanner run build` | OK |

### QA manual pendiente en VPS

- Modal scan: OK / duplicado / inválido / fecha incorrecta / mobile.
- Productora: empty state, multi-fecha, referido, escaneado, permisos.
- Scanner listado: filtros, refresh post-scan, multi-fecha, scope otra cuenta.
- Offline snapshot + sync sin regresión.

---

## Pendientes

- Smoke automatizado dedicado `event-ticket-list` (opcional).
- Export CSV productora (fuera de scope).
- Mostrar email en listado scanner solo si producto lo requiere (hoy solo nombre).

---

## Deploy

Tras merge/pull en VPS:

```bash
git pull
pnpm --filter shared run build
pnpm --filter api run build && pm2 restart yti-api
pnpm --filter web run build && pm2 restart yti-web
pnpm --filter scanner run build && pm2 restart yti-scanner
```

**Recomendación:** redeployar y continuar QA manual de puerta con evento real multi-fecha y venta por referido.
