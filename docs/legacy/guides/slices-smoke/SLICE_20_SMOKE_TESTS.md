# Slice 20 — Platform Metrics (Admin) Smoke Tests

## Prerequisites

- API running (`pnpm dev:api` or `pnpm dev`)
- Migrations applied (`pnpm db:migrate`)
- A **User** with role ADMIN

Base URL: `http://localhost:3001`

---

## 1) Get platform metrics (success)

```bash
curl -s "http://localhost:3001/admin/platform/metrics" \
  -H "X-Dev-User-Id: ADMIN_USER_ID"
```

Expected: 200, JSON:
```json
{
  "totalEvents": 5,
  "activeEvents": 2,
  "ticketsSold": 150,
  "totalReviews": 12,
  "totalScans": 80
}
```

- **totalEvents**: count(Event) where deletedAt is null
- **activeEvents**: status=APPROVED, startAt >= now, deletedAt null
- **ticketsSold**: count(Ticket) excluding REVOKED
- **totalReviews**: count(Review)
- **totalScans**: count(TicketScan) where isValid=true

---

## 2) Forbidden (403)

Call without auth or with non-ADMIN user:

```bash
curl -s "http://localhost:3001/admin/platform/metrics"
```

Expected: 401 Unauthorized.
