# Slice 08 — Payment System Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- A **Tenant**, **Event** (APPROVED), and **TicketType** (ACTIVE, capacityAvailable >= 1) as in Slice 05

Base URL: `http://localhost:3001`

---

## 1) Create order

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
      { "ticketTypeId": "TICKET_TYPE_ID", "quantity": 1 }
    ]
  }'
```

Expected: 201, `status: "PENDING_PAYMENT"`. Save `ORDER_ID`.

---

## 2) Create payment

```bash
curl -s -X POST "http://localhost:3001/public/orders/ORDER_ID/payments?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"provider": "DEMO"}'
```

Expected: 200, `status: "CREATED"`, `paymentId`, `paymentUrl`. Save `PAYMENT_ID` (from paymentId or extract from paymentUrl).

---

## 3) Confirm payment

```bash
curl -s -X POST "http://localhost:3001/public/payments/PAYMENT_ID/demo-confirm?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 200, `payment.status` = APPROVED, `order.status` = PAID, tickets emitted.

---

## 4) Scanner validation

Use `qrPayload` from a ticket in the confirmed order:

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "yti:v1:..."
  }'
```

Expected: 200 on first scan, 409 on second (already used).
