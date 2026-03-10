# Slice 14 — Ticket Revocation + Refund Safety Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- You must have:
  - A **Tenant** (id: `TENANT_ID`)
  - A **User** with role ADMIN or PRODUCER_OWNER or PRODUCER_STAFF (id: `USER_ID`)
  - An **Event** belonging to that tenant
  - A **Ticket** with `status: VALID` (id: `TICKET_ID`)

Replace `TENANT_ID`, `USER_ID`, `TICKET_ID` in the examples below.

Base URL: `http://localhost:3001`

---

## 1) Revoke ticket (success)

```bash
curl -s -X POST "http://localhost:3001/admin/tickets/TICKET_ID/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: USER_ID" \
  -d '{
    "reason": "REFUND",
    "note": "Customer request"
  }'
```

Expected: 200, JSON:
```json
{
  "ticketId": "TICKET_ID",
  "status": "REVOKED",
  "revokedAt": "...",
  "reason": "REFUND",
  "message": "Ticket revoked successfully"
}
```

---

## 2) Revoke ticket — idempotent (same payload, return 200)

After revoking once, call again with the same reason and note:

```bash
curl -s -X POST "http://localhost:3001/admin/tickets/TICKET_ID/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: USER_ID" \
  -d '{
    "reason": "REFUND",
    "note": "Customer request"
  }'
```

Expected: 200, same response shape with `message: "Ticket already revoked"`.

---

## 3) Revoke ticket — idempotent (same idempotencyKey, return 200)

```bash
curl -s -X POST "http://localhost:3001/admin/tickets/TICKET_ID/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: USER_ID" \
  -d '{
    "reason": "REFUND",
    "idempotencyKey": "revoke-abc-123"
  }'
```

Run twice. First: 200 with `message: "Ticket revoked successfully"`. Second: 200 with `message: "Ticket already revoked"`.

---

## 4) Revoke ticket — already revoked, different payload (409)

If ticket is already revoked with different reason/note, or no idempotency match:

```bash
curl -s -X POST "http://localhost:3001/admin/tickets/TICKET_ID/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: USER_ID" \
  -d '{
    "reason": "FRAUD",
    "note": "Different reason"
  }'
```

Expected: 409, `"code": "TICKET_ALREADY_REVOKED"`.

---

## 5) Revoke ticket — not found (404)

```bash
curl -s -X POST "http://localhost:3001/admin/tickets/nonexistent-ticket-id/revoke" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: USER_ID" \
  -d '{"reason": "REFUND"}'
```

Expected: 404, `"code": "TICKET_NOT_FOUND"`.

---

## 6) Validate returns revoked (scanner)

After revoking a ticket, the public validate endpoint should return 200 with `isValid: false` and `message: "revoked"` instead of throwing:

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "EVENT_ID",
    "qrPayload": "QR_PAYLOAD_OF_REVOKED_TICKET"
  }'
```

Expected: 200, JSON:
```json
{
  "isValid": false,
  "ticketId": "TICKET_ID",
  "ticketTypeName": "...",
  "message": "revoked"
}
```

---

## Allowed revocation reasons

- `REFUND`
- `FRAUD`
- `CUSTOMER_REQUEST`
- `DUPLICATE`
- `OTHER`
