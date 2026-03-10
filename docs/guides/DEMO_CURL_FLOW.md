# Full Demo cURL Flow

End-to-end flow: discovery → buy demo → my tickets → QR view → door scan → metrics.

**Prerequisites:**
- API running: `pnpm dev:api` with `DEV_AUTH_ENABLED=true`, `NODE_ENV=development`
- Demo seed run: `pnpm run demo:seed` (from apps/api)
- Replace placeholders from seed output

**Base URL:** `http://localhost:3001`

---

## 1) GET /me (as USER/buyer)

```bash
curl -s "http://localhost:3001/me" -H "X-Dev-User-Id: BUYER_USER_ID"
```

Expected: `{ "id": "...", "tenantId": "demo-tenant", "email": "buyer@demo.local", "role": "USER", "status": "ACTIVE", "firstName": "Buyer", "lastName": "Demo" }`

---

## 2) List events / event details / ticket types

```bash
# List events
curl -s "http://localhost:3001/public/events?tenantId=demo-tenant"

# Event detail
curl -s "http://localhost:3001/public/events/demo-event?tenantId=demo-tenant"

# Ticket types
curl -s "http://localhost:3001/public/events/demo-event/ticket-types?tenantId=demo-tenant"
```

---

## 3) Create order as buyer (use buyer@demo.local for ownership)

```bash
curl -s -X POST "http://localhost:3001/public/orders?tenantId=demo-tenant" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "demo-event",
    "buyer": {
      "email": "buyer@demo.local",
      "firstName": "Buyer",
      "lastName": "Demo"
    },
    "items": [
      { "ticketTypeId": "demo-tt-general", "quantity": 1 }
    ]
  }'
```

Save `id` from response (order ID).

---

## 4) Create payment + confirm demo

```bash
# Create payment (replace ORDER_ID)
curl -s -X POST "http://localhost:3001/public/orders/ORDER_ID/payments?tenantId=demo-tenant" \
  -H "Content-Type: application/json" \
  -d '{"provider": "DEMO"}'
```

Save `paymentId` from response.

```bash
# Confirm demo payment (replace PAYMENT_ID)
curl -s -X POST "http://localhost:3001/public/payments/PAYMENT_ID/demo-confirm?tenantId=demo-tenant" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Expected: order with `status: "PAID"` and tickets array with `qrPayload` values.

---

## 5) GET /me/tickets (show QR payload)

```bash
curl -s "http://localhost:3001/me/tickets" -H "X-Dev-User-Id: BUYER_USER_ID"
```

Expected: `{ "tickets": [ { "ticketId": "...", "status": "VALID", "qrPayload": "yti:v1:...", "event": {...}, "ticketType": {...} } ] }`

Copy `qrPayload` for door scan.

---

## 6) Door scan (SCANNER user)

```bash
curl -s -X POST "http://localhost:3001/scanner/scan" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: SCANNER_USER_ID" \
  -d '{
    "eventId": "demo-event",
    "qrPayload": "yti:v1:YOUR_TICKET_QR_PAYLOAD"
  }'
```

Expected: `{ "result": "OK", "ticketId": "...", "ticketTypeName": "General" }`

---

## 7) Metrics (confirm scanCount / totalScans)

```bash
# Event metrics
curl -s "http://localhost:3001/producer/events/demo-event/metrics" \
  -H "X-Dev-User-Id: PRODUCER_USER_ID"

# Platform metrics
curl -s "http://localhost:3001/admin/platform/metrics" \
  -H "X-Dev-User-Id: ADMIN_USER_ID"
```

Expected: `scanCount` and `totalScans` ≥ 1 after OK scan.
