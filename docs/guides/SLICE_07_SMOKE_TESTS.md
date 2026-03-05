# Slice 07 — Order / Payment Separation Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- A **Tenant**, **Event** (APPROVED), and **TicketType** (ACTIVE, capacityAvailable >= 1) as in Slice 05

Base URL: `http://localhost:3001`

---

## 1) Create order — PENDING_PAYMENT, no tickets

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

Expected: 201, `status: "PENDING_PAYMENT"`, `tickets: []`, `orderItems[].tickets: []`. Save `ORDER_ID`.

---

## 2) Create payment — Slice 08

```bash
curl -s -X POST "http://localhost:3001/public/orders/ORDER_ID/payments?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{"provider": "DEMO"}'
```

Expected: 200, `paymentId`, `paymentUrl` (e.g. `/demo/payments/xxx`), `status: "CREATED"`. Save `PAYMENT_ID`.

---

## 3) Confirm payment — PAID and tickets issued

```bash
curl -s -X POST "http://localhost:3001/public/payments/PAYMENT_ID/demo-confirm?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 200, order with `status: "PAID"`, `tickets` array populated, each with `qrPayload` (format `yti:v1:` + hex) and `status: "VALID"`.

---

## 4) Confirm payment idempotent

Call demo-confirm again with the same `PAYMENT_ID`:

```bash
curl -s -X POST "http://localhost:3001/public/payments/PAYMENT_ID/demo-confirm?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: 200, same order (idempotent).

---

## 5) Scanner validation still works

Use a `qrPayload` from a paid order's ticket:

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "yti:v1:xxxx..."
  }'
```

Expected: 200 on first scan, 409 on second (already used).
