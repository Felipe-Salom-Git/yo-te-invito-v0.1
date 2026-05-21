# Slice 06 — Scanner Validation Core Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- From Slice 05 you need:
  - A **Tenant** (id: `TENANT_ID`)
  - An **Event** with `status: APPROVED`, `deletedAt: null` (id: `EVENT_ID`)
  - A valid **Order** with **Tickets** — use the ticket's `qrPayload` from a created order

Replace `TENANT_ID`, `EVENT_ID`, `QR_PAYLOAD` in the examples below.

Base URL: `http://localhost:3001`

---

## 1) Validate ticket (success — first scan)

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "QR_PAYLOAD"
  }'
```

Expected: 200, `{ "isValid": true, "ticketId": "...", "ticketTypeName": "...", "message": "VALID" }`

---

## 2) Validate ticket (already used — 409)

Scan the same `qrPayload` again:

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "QR_PAYLOAD"
  }'
```

Expected: 409, `"code": "CONFLICT"`, message about ticket already used.

---

## 3) Validate ticket — invalid event (404)

Use a non-existent or wrong-tenant event id:

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "NONEXISTENT_EVENT_ID",
    "qrPayload": "QR_PAYLOAD"
  }'
```

Expected: 404, `"code": "NOT_FOUND"`.

---

## 4) Validate ticket — ticket not found (404)

Valid event but unknown qrPayload:

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "unknown_qr_payload_xyz"
  }'
```

Expected: 404, `"code": "NOT_FOUND"`.

---

## 5) Optional: deviceId

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "QR_PAYLOAD",
    "deviceId": "scanner-door-1"
  }'
```

Expected: 200 (if first scan) or 409 (if already used).

---

## 6) Double-scan concurrency (manual)

Run two concurrent requests with the same `qrPayload` for a VALID ticket. One should return 200, the other 409. Both attempts appear in `TicketScan`.
