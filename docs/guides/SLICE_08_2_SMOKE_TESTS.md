# Slice 08.2 — Scanner V1 Online Smoke Tests

## Prerequisites

- API running (`pnpm dev:api`)
- Migrations applied (`pnpm db:migrate`)
- A **Tenant**, **Event** (APPROVED), and a **User** with role SCANNER
- A paid order with a valid ticket (qrPayload)

Base URL: `http://localhost:3001`

---

## Authentication

POST /scanner/scan requires:

- Header: `X-Dev-User-Id: USER_ID` (user must have SCANNER role)
- `DEV_AUTH_ENABLED=true` and `NODE_ENV=development` (or dev mode)

---

## 1) Scan valid ticket → OK

```bash
curl -s -X POST "http://localhost:3001/scanner/scan" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: SCANNER_USER_ID" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "yti:v1:..."
  }'
```

Expected: 200, `{ "result": "OK", "ticketId": "...", "ticketTypeName": "..." }`

---

## 2) Scan again → ALREADY_USED

Scan the same qrPayload a second time.

Expected: 200, `{ "result": "ALREADY_USED", "ticketId": "...", "ticketTypeName": "..." }`

---

## 3) Invalid QR → INVALID

```bash
curl -s -X POST "http://localhost:3001/scanner/scan" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: SCANNER_USER_ID" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "unknown-qr-xyz"
  }'
```

Expected: 200, `{ "result": "INVALID" }`

---

## 4) Revoked ticket → REVOKED

First revoke a ticket (update in DB: `Ticket.status = 'REVOKED'`), then scan its qrPayload.

Expected: 200, `{ "result": "REVOKED", "ticketId": "...", "ticketTypeName": "..." }`
