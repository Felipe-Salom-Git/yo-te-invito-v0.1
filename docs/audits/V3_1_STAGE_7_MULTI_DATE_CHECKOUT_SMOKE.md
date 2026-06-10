# V3.1 Etapa 7 Slice 7.6 — Multi-Date Checkout Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.6 — Checkout con fecha seleccionada  
**Estado:** OK (código + build)

---

## Migración

- `20260617130000_occurrence_checkout`: `occurrenceId` en `Order`, `OrderItem`, `Ticket`, `UserCartItem`.

---

## Backend

- `assertOrderOccurrenceValid()` valida occurrence vs ticket types.
- `PublicOrdersService`, `UserCartService`, `OrderFulfillmentService` persisten `occurrenceId`.
- Carrito agrupa por `eventId:occurrenceId`.
- `createOrderDtoSchema`: `occurrenceId` opcional (requerido lógicamente en multi-fecha).

---

## UI

- `EventPurchaseCard` + `useAddToCart` envían `occurrenceId`.

---

## QA

| Check | Resultado |
|-------|-----------|
| Migración deploy local | OK |
| `npx nest build` | OK |

**Manual:** compra multi-fecha; orden y tickets con `occurrenceId` correcto.
