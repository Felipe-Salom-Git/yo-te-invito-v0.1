# Slice 17 — Order Expiration Worker Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- An order with `status: PENDING_PAYMENT` and `expiresAt` in the past

Base URL: `http://localhost:3001`

---

## 1) Trigger expire-orders job manually (dev)

The worker runs every 3 minutes via cron. To trigger it manually:

```bash
curl -s -X POST "http://localhost:3001/internal/jobs/expire-orders"
```

Expected: 200, JSON:
```json
{
  "expired": 2
}
```

---

## 2) Create pending order with past expiresAt → job expires it

1. Create an order via `POST /public/orders` (it gets `expiresAt` = now + 15 min by default).
2. Manually set `expiresAt` to the past in the DB (or wait 15+ min):
   ```sql
   UPDATE "Order" SET "expiresAt" = NOW() - INTERVAL '1 minute' WHERE id = 'ORDER_ID';
   ```
3. Call the job:
   ```bash
   curl -s -X POST "http://localhost:3001/internal/jobs/expire-orders"
   ```
4. Fetch the order: `GET /public/orders/ORDER_ID?tenantId=TENANT_ID`
   - Expected: `status: "EXPIRED"`, `expiredAt` set.

---

## 3) Payment attempt after expiry → ORDER_EXPIRED

1. Create an order.
2. Set `expiresAt` to the past in the DB (or run expire job if it's past expiry).
3. Attempt to create payment:
   ```bash
   curl -s -X POST "http://localhost:3001/public/orders/ORDER_ID/payments?tenantId=TENANT_ID" \
     -H "Content-Type: application/json" \
     -d '{"provider": "DEMO"}'
   ```
   Expected: 409, `"code": "ORDER_EXPIRED"`.

4. Attempt to confirm payment (if you have a payment for an expired order):
   ```bash
   curl -s -X POST "http://localhost:3001/demo/payments/PAYMENT_ID/confirm?tenantId=TENANT_ID" \
     -H "Content-Type: application/json" \
     -d '{}'
   ```
   Expected: 409, `"code": "ORDER_EXPIRED"`.

---

## 4) Stock release

1. Create an order for N tickets (capacityAvailable decremented).
2. Let it expire (manual DB update or run job after expiry).
3. Verify `TicketType.capacityAvailable` increased by N (stock released).
4. Create a new order for the same ticket type — should succeed (capacity freed).

---

## 5) Cron schedule

The job runs every **3 minutes** (`0 */3 * * * *`). Check logs for:
```
[OrderExpirationService] Expired 2 order(s)
```
