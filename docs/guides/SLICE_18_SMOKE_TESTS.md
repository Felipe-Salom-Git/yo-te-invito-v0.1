# Slice 18 — Ticket Transfer Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- A **Ticket** with:
  - `status: VALID`
  - `usedAt: null`
  - `revokedAt: null`
  - `ownerUserId` set to a User in the same tenant
- Two **Users** (owner and recipient) in the same tenant

To set owner on a ticket (for testing):
```sql
UPDATE "Ticket" SET "ownerUserId" = 'USER_A_ID' WHERE id = 'TICKET_ID';
```

Base URL: `http://localhost:3001`

---

## 1) Transfer ticket (success)

```bash
curl -s -X POST "http://localhost:3001/tickets/TICKET_ID/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: OWNER_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID"}'
```

Expected: 200, JSON:
```json
{
  "ticketId": "TICKET_ID",
  "fromUserId": "OWNER_USER_ID",
  "toUserId": "RECIPIENT_USER_ID",
  "transferredAt": "2025-03-05T...",
  "message": "Ticket transferred successfully"
}
```

Verify: ticket now has `ownerUserId = RECIPIENT_USER_ID`.

---

## 2) Idempotent transfer (same idempotencyKey)

Run the transfer twice with the same `idempotencyKey`:

```bash
curl -s -X POST "http://localhost:3001/tickets/TICKET_ID/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: OWNER_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID", "idempotencyKey": "transfer-xyz-123"}'
```

Second call (after first succeeded, now owner is RECIPIENT): would fail 403 (not owner). To test idempotency: first call as owner, second call as same owner with same idempotencyKey — but after first call owner changed. So: use a fresh ticket, call twice with idempotencyKey. First: 200. Second: 200 with "Ticket already transferred" (same result).

---

## 3) Fails if used (409)

Set ticket `usedAt`:
```sql
UPDATE "Ticket" SET "usedAt" = NOW() WHERE id = 'TICKET_ID';
```

```bash
curl -s -X POST "http://localhost:3001/tickets/TICKET_ID/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: OWNER_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID"}'
```

Expected: 409, `"code": "TICKET_NOT_TRANSFERABLE"`, message "Ticket has already been used".

---

## 4) Fails if revoked (409)

Set ticket status to REVOKED:
```sql
UPDATE "Ticket" SET status = 'REVOKED', "revokedAt" = NOW() WHERE id = 'TICKET_ID';
```

```bash
curl -s -X POST "http://localhost:3001/tickets/TICKET_ID/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: OWNER_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID"}'
```

Expected: 409, `"code": "TICKET_NOT_TRANSFERABLE"`.

---

## 5) Fails if not owner (403)

Call with a user who is not the ticket owner:

```bash
curl -s -X POST "http://localhost:3001/tickets/TICKET_ID/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: OTHER_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID"}'
```

Expected: 403, `"code": "FORBIDDEN"`, "You are not the ticket owner".

---

## 6) Fails if no owner (403)

Call for a ticket with `ownerUserId` null:

```bash
curl -s -X POST "http://localhost:3001/tickets/TICKET_NO_OWNER_ID/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: SOME_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID"}'
```

Expected: 403, "Ticket has no owner".

---

## 7) Ticket not found (404)

```bash
curl -s -X POST "http://localhost:3001/tickets/nonexistent-ticket-id/transfer" \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: OWNER_USER_ID" \
  -d '{"toUserId": "RECIPIENT_USER_ID"}'
```

Expected: 404, `"code": "TICKET_NOT_FOUND"`.
