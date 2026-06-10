# V3.1 Etapa 7 — Eventos con múltiples fechas (cierre)

**Fecha:** 2026-06-10  
**Estado:** Cerrado con observaciones operativas

---

## 1. Objetivo de etapa

Soportar eventos con múltiples fechas/funciones end-to-end: modelo, productora, admin, público, checkout, tickets y scanner — manteniendo compatibilidad con eventos de una sola fecha.

---

## 2. Slices ejecutados

| Slice | Descripción | Doc smoke |
|-------|-------------|-----------|
| 7.1 | Modelo `EventOccurrence`, helpers, service base | `V3_1_STAGE_7_EVENT_OCCURRENCES_MODEL_SMOKE.md` |
| 7.2 | Productora CRUD fechas + `EventOccurrencesEditor` | `V3_1_STAGE_7_PRODUCER_OCCURRENCES_SMOKE.md` |
| 7.3 | Ticket types por occurrence | `V3_1_STAGE_7_OCCURRENCE_TICKET_TYPES_SMOKE.md` |
| 7.4 | Admin badge multi-fecha | `V3_1_STAGE_7_ADMIN_MULTI_DATE_EVENTS_SMOKE.md` |
| 7.5 | Selector fecha público | `V3_1_STAGE_7_PUBLIC_DATE_SELECTOR_SMOKE.md` |
| 7.6 | Checkout/cart con `occurrenceId` | `V3_1_STAGE_7_MULTI_DATE_CHECKOUT_SMOKE.md` |
| 7.7 | Tickets muestran fecha elegida | `V3_1_STAGE_7_MULTI_DATE_TICKETS_SMOKE.md` |
| 7.8 | Scanner valida occurrence | `V3_1_STAGE_7_MULTI_DATE_SCANNER_SMOKE.md` |
| 7.9 | Regresión evento simple | `V3_1_STAGE_7_SIMPLE_EVENT_REGRESSION.md` |
| 7.10 | Cierre etapa | este documento |

---

## 3. Modelo final

| Entidad | Multi-fecha | Legacy |
|---------|-------------|--------|
| `Event` | `startAt` = próxima fecha visible (sync) | Sin cambios |
| `EventOccurrence` | Fecha/función con venue/capacity propios | N/A |
| `TicketType` | `occurrenceId` requerido si evento multi-fecha | `occurrenceId = null` |
| `Order` / `OrderItem` | `occurrenceId` opcional/requerido | null |
| `Ticket` | `occurrenceId` desde order item | null → usa `Event.startAt` |
| `UserCartItem` | `occurrenceId` por ítem | null |

**Migraciones:** `20260617120000_event_occurrences`, `20260617130000_occurrence_checkout`

---

## 4. Compatibilidad legacy

- Eventos sin `EventOccurrence` → flujo single-date intacto.
- `TicketType.occurrenceId = null` en eventos legacy.
- Tickets legacy sin `occurrenceId` → display usa `Event.startAt`.
- Scanner sin selector de fecha → valida por evento como antes.

---

## 5–11. Flujos

- **Productora:** toggle simple/multi en wizard paso 2; `EventOccurrencesEditor`; ticket types agrupados por fecha.
- **Admin:** badge "Multi-fecha" en listado; `occurrenceCount` en API.
- **Público:** `EventDateSelector` en ficha; ticket types filtrados por fecha.
- **Checkout:** `occurrenceId` en cart/order; carrito agrupa por evento+fecha.
- **Tickets:** `occurrenceStartAt` en API y UI comprador.
- **Scanner:** `occurrenceId` en scan; resultado `WRONG_OCCURRENCE`.
- **Stock:** separado por `TicketType` ligado a occurrence.

---

## 12. QA ejecutado

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | OK |
| `npx nest build` (API) | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter scanner run build` | OK |
| `smoke:v31-event-occurrences` | OK (18 checks) |
| Migraciones deploy local | OK |

**Pendiente manual:** QA puerta completo multi-fecha en dispositivo; verificar `prisma generate` con dev server detenido (EPERM Windows).

---

## 13. Pendientes Etapa 8

- Cambio de fecha de entrada por usuario (§25.3)
- Reglas de aprobación/costo por fecha
- Emails con fecha de función
- Offline snapshot por occurrence (refinar si hay muchas fechas)

---

## 14. Comandos

```bash
pnpm --filter shared run build
cd apps/api && npx prisma migrate deploy && npx prisma generate
pnpm --filter api run smoke:v31-event-occurrences
pnpm --filter web run build
pnpm --filter scanner run build
```
