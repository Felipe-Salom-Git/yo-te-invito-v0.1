# V3.1 Etapa 7 Slice 7.9 — Simple Event Regression

**Fecha:** 2026-06-10  
**Slice:** 7.9 — Regresión evento single-date  
**Estado:** OK (automated); manual pendiente puerta

---

## Compatibilidad verificada

| Flujo | Comportamiento esperado |
|-------|-------------------------|
| Evento sin occurrences | Sin selector fecha; `isMultiDate = false` |
| Ticket types | `occurrenceId = null` |
| Checkout | Sin `occurrenceId` en order/ticket |
| Tickets comprador | Muestra `Event.startAt` |
| Scanner | Sin selector fecha; validación por evento |
| Smoke 7.1 legacy checks | 18/18 OK |

---

## Builds

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter shared run build` | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter scanner run build` | OK |
| `smoke:v31-event-occurrences` | OK |

**Manual recomendado:** flujo completo compra + scan en evento legacy existente.
