# V3.1 Etapa 7 Slice 7.7 — Multi-Date Tickets Display Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.7 — Tickets muestran fecha elegida  
**Estado:** OK (código + build)

---

## API

- `MeService.mapTicketRow()`: `occurrenceStartAt`, `occurrenceVenueName`.
- Schema `meTicketItemSchema` / `userCartItemSchema` con campos de occurrence.

---

## UI comprador

- `buyer-ticket-fields.ts`, `DefaultBuyerTicket`, `MeTicketListCard` muestran fecha de función.
- Legacy sin `occurrenceId` → usa `Event.startAt`.

---

## QA

| Check | Resultado |
|-------|-----------|
| `pnpm --filter web run build` | OK |

**Manual:** ticket multi-fecha muestra fecha/horario de la función comprada.
