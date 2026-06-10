# V3.1 Etapa 7 Slice 7.3 — Ticket Types per Occurrence Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.3 — Tipos de entrada por fecha  
**Estado:** OK (código + build)

---

## Backend

- `ProducerTicketTypesService`: `occurrenceId` en create; validación si evento multi-fecha.
- `ticketTypeResponseSchema` / `createTicketTypeDtoSchema` incluyen `occurrenceId`.
- `PublicTicketTypesService.list(eventId, occurrenceId?)` filtra por fecha.

---

## UI productora

- `TicketTypesEditor`: tabs por fecha en eventos multi-fecha.
- Create envía `occurrenceId` del tab activo.

---

## QA

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | OK |
| `smoke:v31-event-occurrences` assertTicketTypeMatchesOccurrence | OK |

**Manual:** crear tipos distintos por fecha; verificar stock separado.
