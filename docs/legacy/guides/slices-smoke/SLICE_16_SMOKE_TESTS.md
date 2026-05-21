# Slice 16 — Event Sales Metrics Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- You must have:
  - A **Tenant**
  - An **Event** belonging to that tenant
  - A **User** with role ADMIN or PRODUCER_OWNER or PRODUCER_STAFF

Replace `TENANT_ID`, `USER_ID`, `EVENT_ID` in the examples below.

Base URL: `http://localhost:3001`

---

## 1) Get event metrics (success)

```bash
curl -s "http://localhost:3001/producer/events/EVENT_ID/metrics" \
  -H "X-Dev-User-Id: USER_ID"
```

Expected: 200, JSON:
```json
{
  "ticketsSold": 10,
  "courtesyCount": 2,
  "revenue": "15000.00",
  "currency": "ARS",
  "scanCount": 5
}
```

- **ticketsSold**: count of tickets for event with status != REVOKED
- **courtesyCount**: count of CourtesyGrant records for event
- **revenue**: sum of Order.totalAmount for paid orders (status PAID)
- **scanCount**: count of TicketScan with isValid=true for event

---

## 2) Event not found (404)

```bash
curl -s "http://localhost:3001/producer/events/nonexistent-event-id/metrics" \
  -H "X-Dev-User-Id: USER_ID"
```

Expected: 404, `"code": "EVENT_NOT_FOUND"`.

---

## 3) Forbidden (403)

Call without `X-Dev-User-Id` or with a user that lacks ADMIN/PRODUCER_OWNER/PRODUCER_STAFF role:

```bash
curl -s "http://localhost:3001/producer/events/EVENT_ID/metrics"
```

Expected: 401 Unauthorized (no auth header).

---

## 4) Verify metric definitions

1. Create an order, pay it → ticketsSold and revenue increase.
2. Create courtesies → courtesyCount increases; ticketsSold increases if courtesies create tickets.
3. Scan tickets (scanner validate with isValid outcome) → scanCount increases.
4. Revoke a ticket → ticketsSold decreases (REVOKED excluded).
