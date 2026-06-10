# V3.1 Etapa 9 — Restricciones transferencia (Slice 9.3)

**Fecha:** 2026-06-10

## Helper centralizado

`TicketTransferEligibilityService` (`apps/api/src/modules/tickets/ticket-transfer-eligibility.service.ts`)

- `evaluate` / `evaluateWithPendingDateChange` — crear oferta.
- `assertAcceptableSource` — aceptar oferta.
- `assertTransferable` — lanza con códigos `ErrorCode`.

## Block reasons (`TICKET_TRANSFER_BLOCK_REASON`)

| Reason | ErrorCode |
|--------|-----------|
| NOT_OWNER | NOT_TICKET_OWNER |
| TICKET_ALREADY_USED | TICKET_ALREADY_USED |
| TICKET_REVOKED | TICKET_REVOKED |
| TICKET_EXPIRED | TICKET_EXPIRED |
| TRANSFER_ALREADY_PENDING | TRANSFER_ALREADY_PENDING |
| EVENT_CANCELLED / OCCURRENCE_CLOSED / DATE_CHANGE_PENDING | TICKET_NOT_TRANSFERABLE |

## Smoke

```bash
pnpm --filter api run smoke:v31-ticket-transfer-restrictions
```

Valida reglas unitarias (owner, used, event past) + templates email registrados.

## QA negativo esperado (manual)

- Ticket usado → 409 `TICKET_ALREADY_USED`
- Ticket revocado → `TICKET_REVOKED`
- Evento pasado → `TICKET_EXPIRED`
- Oferta pendiente → `TRANSFER_ALREADY_PENDING`
- Cambio de fecha pending → `TICKET_NOT_TRANSFERABLE`
