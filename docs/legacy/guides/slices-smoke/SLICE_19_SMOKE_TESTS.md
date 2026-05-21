# Slice 19 — Fraud Protection (Basic) Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- An **Event** with id `EVENT_ID`, tenantId `TENANT_ID`
- A **User** with ADMIN role for fraud-signals endpoint

Base URL: `http://localhost:3001`

---

## 1) Validate endpoint captures IP/UA

Each call to `POST /scanner/validate` stores `ipAddress` and `userAgent` in TicketScan (from request headers).

```bash
curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
  -H "Content-Type: application/json" \
  -H "User-Agent: TestScanner/1.0" \
  -H "X-Forwarded-For: 192.168.1.100" \
  -d '{"eventId": "EVENT_ID", "qrPayload": "some-payload"}'
```

Check DB: `TicketScan` rows have `ipAddress` and `userAgent` populated (admin-only visibility).

---

## 2) Spam validate to trigger SCAN_RATE_BURST

Send many validate requests in quick succession (same device/IP). Default threshold: 20 scans in 10 seconds.

```bash
for i in $(seq 1 25); do
  curl -s -X POST "http://localhost:3001/scanner/validate?tenantId=TENANT_ID" \
    -H "Content-Type: application/json" \
    -d "{\"eventId\": \"EVENT_ID\", \"qrPayload\": \"fake-$i\"}" &
done
wait
```

Then trigger the fraud detection job:

```bash
curl -s -X POST "http://localhost:3001/internal/jobs/fraud-detection"
```

Expected: `{"signalsCreated": 1}` or more.

---

## 3) Trigger job manually

```bash
curl -s -X POST "http://localhost:3001/internal/jobs/fraud-detection"
```

Expected: 200, `{"signalsCreated": N}`.

---

## 4) List fraud signals (admin)

```bash
curl -s "http://localhost:3001/admin/events/EVENT_ID/fraud-signals" \
  -H "X-Dev-User-Id: ADMIN_USER_ID"
```

Expected: 200, paginated response with `data` array of FraudSignal items (signalType, deviceId, ipAddress, scanCount, windowStart, windowEnd, etc.).

---

## 5) Fraud signals with date range

```bash
curl -s "http://localhost:3001/admin/events/EVENT_ID/fraud-signals?from=2025-03-01T00:00:00Z&to=2025-03-06T23:59:59Z&page=1&limit=10" \
  -H "X-Dev-User-Id: ADMIN_USER_ID"
```

---

## 6) Cron schedule

The fraud detection job runs every **3 minutes** (`0 */3 * * * *`). Check logs for:
```
[FraudDetectionService] Created N fraud signal(s)
```

---

## Detection rules (env overrides)

| Rule | Default threshold | Env var |
|------|-------------------|---------|
| SCAN_RATE_BURST | 20 scans in 10s per device/IP | FRAUD_SCAN_RATE_THRESHOLD |
| REPEATED_VALID_SCAN | >3 valid scans for same ticket in 5m | FRAUD_REPEATED_VALID_THRESHOLD |
| INVALID_BURST | ≥30 invalid in 1m, ratio ≥0.9 | FRAUD_INVALID_BURST_COUNT, FRAUD_INVALID_BURST_RATIO |
