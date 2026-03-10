# Slice 15 — Event Capacity Guard Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- You must have:
  - A **Tenant** (id: `TENANT_ID`)
  - An **Event** with `status: APPROVED`, `deletedAt: null`, `capacityTotal` set (e.g. 100)
  - At least one **TicketType** with `status: ACTIVE`, `capacityAvailable >= 1`
  - A **User** with role ADMIN or PRODUCER_OWNER/PRODUCER_STAFF for courtesies

Replace placeholders in the examples below.

Base URL: `http://localhost:3001`

---

## 1) Orders exceeding capacity (409)

Set event `capacityTotal` to a small value (e.g. 5). Ensure event already has tickets close to capacity. Create order for more seats than available:

```bash
curl -s -X POST "http://localhost:3001/public/orders?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "buyer": {
      "email": "buyer@example.com",
      "firstName": "Juan",
      "lastName": "Perez"
    },
    "items": [
      { "ticketTypeId": "TICKET_TYPE_ID", "quantity": 100 }
    ]
  }'
```

Expected: 409, `"code": "EVENT_CAPACITY_EXCEEDED"`, message includes used/capacity/requested.

---

## 2) Payment confirm exceeding capacity (409)

Create an order when capacity allows. Before confirming payment, add courtesies or other tickets until event is near capacity. Then confirm payment:

```bash
curl -s -X POST "http://localhost:3001/demo/payments/PAYMENT_ID/confirm?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 409, `"code": "EVENT_CAPACITY_EXCEEDED"` if usedSeats + orderTickets > capacityTotal.

---

## 3) Courtesies exceeding capacity (409)

With event at or near capacity:

```bash
curl -s -X POST "http://localhost:3001/events/EVENT_ID/courtesies" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: USER_ID" \
  -d '{
    "mode": "FREE_CAPACITY",
    "quantity": 999
  }'
```

Expected: 409, `"code": "EVENT_CAPACITY_EXCEEDED"`.

---

## 4) Revoke reduces usedSeats (capacity available again)

1. Create tickets until event is at capacity.
2. Revoke one or more tickets via `POST /admin/tickets/:ticketId/revoke`.
3. Create a new courtesy or order for the freed seats.

Expected: 200, new tickets created successfully (revoked tickets no longer count toward usedSeats).

---

## 5) Event with capacityTotal null — no guard

If event has `capacityTotal: null`, the guard does not run. Orders and courtesies proceed subject only to ticket-type capacity (for CONSUMES_BATCH) or no event-level limit (for FREE_CAPACITY).

```bash
# Set event.capacityTotal = null (e.g. via DB or seed), then create order
curl -s -X POST "http://localhost:3001/public/orders?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID_WITH_NULL_CAPACITY",
    "buyer": { "email": "x@x.com", "firstName": "X", "lastName": "X" },
    "items": [{ "ticketTypeId": "TICKET_TYPE_ID", "quantity": 1 }]
  }'
```

Expected: 201, order created (subject to ticket-type capacity).
