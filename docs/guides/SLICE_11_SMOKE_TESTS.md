# Slice 11 — Reviews V1 — Smoke Tests

## Prerequisites

- API and Web app running
- Approved event
- Dev user (any role) for creating reviews

## Test 1: Score validation works

1. POST /events/:eventId/reviews with score 0.

**Expected:** Validation error (score must be between 1 and 5).

2. POST with score 6.

**Expected:** Validation error.

3. POST with score 3.

**Expected:** Success, review created.

---

## Test 2: Duplicate reviews prevented

1. Create a review for an event as user A (X-Dev-User-Id: userA).
2. Try to create another review for the same event as user A.

**Expected:** Conflict error: "You have already reviewed this event".

3. Create a review as user B for the same event.

**Expected:** Success (different user).

---

## Test 3: Reviews paginate

1. Create more than 20 reviews for an event.
2. GET /public/events/:id/reviews?tenantId=xxx&page=1&limit=10

**Expected:** Returns 10 reviews, total reflects full count.

3. GET with page=2

**Expected:** Returns next 10 reviews.

---

## Test 4: Event rating updated

1. Create a review with score 5.
2. Fetch event detail: GET /public/events/:id?tenantId=xxx

**Expected:** ratingAvg = 5, ratingCount = 1.

3. Create another review with score 3.

**Expected:** ratingAvg = 4, ratingCount = 2.
