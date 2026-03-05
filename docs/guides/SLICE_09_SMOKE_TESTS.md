# Slice 09 — Courtesy System — Smoke Tests

## Prerequisites

- API and Web app running
- Event with `capacityTotal` set (for FREE_CAPACITY)
- Event with ticket types that have `capacityAvailable` > 0 (for CONSUMES_BATCH)
- Dev user with ADMIN or PRODUCER_OWNER or PRODUCER_STAFF role

## Test 1: consumes_batch cannot exceed batch capacity

1. Open producer courtesies for an event: `/producer/events/{eventId}/courtesies`.
2. Enter Dev User ID, select mode **CONSUMES_BATCH**, choose a ticket type with e.g. 5 available.
3. Set quantity to **6** and submit.

**Expected:** Error `Quantity exceeds batch capacity (5 available)`.

4. Set quantity to **5** and submit.

**Expected:** Success, 5 courtesy tickets created.

---

## Test 2: free_capacity cannot exceed event capacity

1. Ensure the event has `capacityTotal` set (e.g. 100) and fewer than 100 tickets exist.
2. Open courtesies, select mode **FREE_CAPACITY**.
3. Set quantity to remaining + 1 (e.g. if 95 tickets exist, set 6).

**Expected:** Error `Quantity exceeds event capacity (X remaining)`.

4. Set quantity to remaining and submit.

**Expected:** Success.

---

## Test 3: Courtesy tickets scan like normal tickets

1. Create at least one courtesy ticket via the form.
2. Copy the returned `qrPayload` (or obtain it from the API response).
3. Open scanner `/door` (or use `POST /scanner/scan`).
4. Scan the courtesy ticket.

**Expected:** Result `OK`, same as a normal order ticket.

5. Scan the same ticket again.

**Expected:** Result `ALREADY_USED`.
