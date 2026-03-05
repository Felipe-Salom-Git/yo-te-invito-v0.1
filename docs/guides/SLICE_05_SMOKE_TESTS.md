# Slice 05 — Ticketing Core Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- You must have:
  - A **Tenant** (id: `TENANT_ID`)
  - An **Event** with `status: APPROVED`, `deletedAt: null`, belonging to that tenant (id: `EVENT_ID`)
  - At least one **TicketType** with `status: ACTIVE`, `deletedAt: null`, `capacityAvailable >= 1` (id: `TICKET_TYPE_ID`)

Replace `TENANT_ID`, `EVENT_ID`, `TICKET_TYPE_ID` in the examples below.

Base URL: `http://localhost:3001`

---

## 1) List ticket types (success)

```bash
curl -s "http://localhost:3001/public/events/EVENT_ID/ticket-types?tenantId=TENANT_ID"
```

Expected: 200, JSON array of ticket types for the event.

---

## 2) Create order (success)

```bash
curl -s -X POST "http://localhost:3001/public/orders?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "buyer": {
      "email": "buyer@example.com",
      "firstName": "Juan",
      "lastName": "Perez",
      "document": "12345678"
    },
    "items": [
      { "ticketTypeId": "TICKET_TYPE_ID", "quantity": 1 }
    ]
  }'
```

Expected: 201, order with `status: "PAID"`, tickets with `status: "VALID"` and `qrPayload`.

---

## 3) Create order — oversell (409 Conflict)

Request more tickets than available for a ticket type:

```bash
curl -s -X POST "http://localhost:3001/public/orders?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "buyer": {
      "email": "buyer2@example.com",
      "firstName": "Maria",
      "lastName": "Garcia"
    },
    "items": [
      { "ticketTypeId": "TICKET_TYPE_ID", "quantity": 99999 }
    ]
  }'
```

Expected: 409, `"code": "CONFLICT"`, message about insufficient availability.

---

## 4) Create order — draft event (404 Not Found)

Use an event with `status: DRAFT` (or non-existent event):

```bash
curl -s -X POST "http://localhost:3001/public/orders?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "DRAFT_OR_NONEXISTENT_EVENT_ID",
    "buyer": {
      "email": "buyer@example.com",
      "firstName": "Juan",
      "lastName": "Perez"
    },
    "items": [
      { "ticketTypeId": "TICKET_TYPE_ID", "quantity": 1 }
    ]
  }'
```

Expected: 404, `"code": "NOT_FOUND"`.

---

## 5) Get order by id (optional)

```bash
curl -s "http://localhost:3001/public/orders/ORDER_ID?tenantId=TENANT_ID"
```

Expected: 200, order with orderItems and tickets. Replace `ORDER_ID` with an id from a created order.
