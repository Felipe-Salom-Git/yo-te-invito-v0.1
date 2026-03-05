# Slice 12 — Event Discovery & Search — Smoke Tests

## Prerequisites

- API running
- Approved events in DB (some with titles, cities, dates, ratings)

## Test 1: Search by text works

1. Create an event with title "Fiesta Electronica 2025".
2. GET /public/events/search?tenantId=xxx&q=fiesta

**Expected:** Event appears in results.

3. GET with q=xyz999 (no matching title)

**Expected:** Empty results.

---

## Test 2: City filter works

1. GET /public/events/search?tenantId=xxx&city=Buenos%20Aires

**Expected:** Only events with city "Buenos Aires".

---

## Test 3: Date range filter works

1. GET /public/events/search?tenantId=xxx&dateFrom=2025-01-01T00:00:00.000Z&dateTo=2025-12-31T23:59:59.999Z

**Expected:** Only events with startAt in 2025.

---

## Test 4: Pagination works

1. Ensure there are more than 5 events.
2. GET /public/events/search?tenantId=xxx&page=1&limit=5

**Expected:** 5 events, meta.total >= 5, meta.totalPages computed.

3. GET with page=2&limit=5

**Expected:** Next 5 events.

---

## Test 5: minRating filter works

1. Create events with different ratingAvg (e.g. 3.5, 4.2).
2. GET /public/events/search?tenantId=xxx&minRating=4

**Expected:** Only events with ratingAvg >= 4.

---

## Test 6: Trending endpoint

1. GET /public/events/trending?tenantId=xxx&limit=5

**Expected:** Events ordered by ratingAvg DESC, ratingCount DESC (only events with at least one review).
