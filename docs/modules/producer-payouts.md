# Producer Payouts Module

## Purpose
Allows producers to request payouts of collected revenue for their events.

## Data Flow
- UI (`/producer/payouts`) → `usePayoutsByProducer`, `useCreatePayout` → `PayoutsRepo` → LocalDB / API

## Key Files
- `apps/web/app/(portal)/producer/payouts/page.tsx` — List and request payouts
- `apps/web/components/producer/PayoutRequestForm.tsx` — Form (amount, bank info)
- `apps/web/repositories/interfaces.ts` — `PayoutRequest`, `PayoutsRepo`
- `apps/web/lib/schemas/payout.ts` — Zod validation

## Repository Interface
- `listByProducer(producerId)` — All payout requests for producer
- `listByEvent(eventId)` — Payout requests for one event
- `create(input)` — Create new payout request (status: REQUESTED)

## LocalStorage
- Collection: `payoutRequests`
- Indexes: tenantId, eventId, producerId
