# V3.1 Etapa 6 Slice 6.1 — Ticket list PDF smoke

**Fecha:** 2026-06-10  
**Estado:** Implementado

## Decisión QR/token en PDF

**No incluir QR completo** en la primera versión del listado PDF.

| Incluido | No incluido |
|----------|-------------|
| Código corto (`shortTicketCode` — últimos 8 alfanuméricos del ticketId) | Payload QR completo |
| Sufijo parcial del QR (`…últimos 6 chars`) | Imagen QR |
| Comprador, tipo, estado, validación | Tokens reutilizables para duplicar tickets |

**Motivo:** reduce riesgo de filtración y evita que el PDF sea un duplicado masivo de tickets. El PDF es control administrativo; la validación oficial sigue siendo QR en puerta.

## Endpoints

| Método | Ruta | Roles |
|--------|------|-------|
| GET | `/producer/events/:eventId/tickets/export.pdf` | ADMIN, PRODUCER_OWNER, PRODUCER_STAFF (evento propio) |
| GET | `/scanner/events/:eventId/tickets/export.pdf` | SCANNER (cuenta activa, evento de cuenta padre) |

## Contenido PDF

- Marca Yo Te Invito
- Nombre y fecha del evento
- Fecha/hora de generación
- Tabla: tipo, comprador, estado, código, validación, ref. parcial
- Pie: «Listado de control interno» + «No reemplaza la validación QR del sistema»

## Auditoría

`AuditAction.TICKET_LIST_EXPORTED` — actor, evento, `ticketCount`, `source` (`producer` | `scanner`).

## UI

| Pantalla | Componente |
|----------|------------|
| `/producer/events/[eventId]` | `TicketListPdfDownload` |
| Scanner PWA `/door` | botón «Descargar listado PDF» (evento seleccionado) |

## QA

| Caso | Resultado esperado |
|------|-------------------|
| Productora descarga su evento | PDF OK |
| Evento sin entradas | 400 `NO_TICKETS` |
| PDF legible | Header `%PDF` |
| Audit log | `TICKET_LIST_EXPORTED` |

## Comandos

```bash
pnpm --filter shared run build
pnpm --filter api run build   # nest build si prisma generate bloqueado por dev server
pnpm --filter web run build
pnpm --filter api run smoke:v31-ticket-list-pdf
```

## Pendiente Slice 6.2

Endurecer matriz de permisos y smoke negativo completo.
