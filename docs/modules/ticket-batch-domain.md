# Ticket batch domain (TicketType + TicketBatch)

## Purpose

- **TicketType**: base product (e.g. VIP, Popular) with total pool `capacityTotal` / `capacityAvailable`.
- **TicketBatch**: ordered “tanda” under a type: window (`startAt`/`endAt`), `baseQuantity`, `rolloverQuantity`, `effectiveQuantity`, `reservedQuantity` (pending orders), `soldCount`, `price`, `status`.

## Business flow (summary)

- **Reconcile** (`TicketBatchService.reconcileTicketType`): time-expired batches → `CLOSED`, remainder rolls into the next batch’s `rolloverQuantity` / `effectiveQuantity`; `ACTIVE` with no stock → `SOLD_OUT`; eligible `SCHEDULED` → `ACTIVE`.
- **Active batch** (`pickActiveBatch`): first batch with remaining stock, not past `endAt`, not blocked by an earlier batch that still has stock in its window (sequential tandas; next can open early if the previous sold out).
- **Checkout**: reserve on batch (`reservedQuantity`) + decrement type `capacityAvailable`; on pay, `confirmReservedAsSold`; on order expiry, `releaseReservation` + restore type capacity.
- **Courtesies (CONSUMES_BATCH)**: `consumeFromActiveBatch` + decrement type capacity; tickets get `ticketBatchId`.

## Key files

| Area | Path |
|------|------|
| Prisma | `apps/api/prisma/schema.prisma`, migration `20260327130000_ticket_batch_domain_v2` |
| Domain service | `apps/api/src/ticketing/ticket-batch.service.ts` |
| Module | `apps/api/src/ticketing/ticketing.module.ts` |
| Shared Zod / types | `packages/shared/src/schemas/ticketing.ts` |

## API

- **Public** `GET /public/events/:eventId/ticket-types` — reconciles, returns list with **active batch** price/dates/`capacityAvailable`/`activeTicketBatchId`.
- **Producer** `GET /producer/events/:eventId/ticket-types` — list with full `batches` + `activeTicketBatchId`.
- **Producer** `POST` / `PATCH` — `batches` optional on create; on update, replacing `batches` is allowed only if no orders and no sold capacity for the type.

## Dependencies

- `TicketingModule` is imported by `PublicModule`, `ProducerModule`, `PublicPaymentsModule`, `OrderExpirationModule`, `CourtesiesModule`.

## Edge cases / risks

- Reconcile runs on some reads (public/producer/courtesy list) to persist rollovers — acceptable for small N per event; consider a cron later for high traffic.
- Admin ticket revoke does not restore batch/type capacity (unchanged legacy behavior).
