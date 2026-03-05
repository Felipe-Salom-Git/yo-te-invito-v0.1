# Slice 08.3 — Scanner Offline Mode — Smoke Tests

## Prerequisites

- API and Scanner app running
- Event with valid tickets
- Dev user with SCANNER role

## Test 1: Offline scan valid ticket → allowed

1. Open `/door`.
2. Enter Event ID, Dev User ID.
3. **Preload tickets** (requires internet).
4. Turn off network (DevTools → Network → Offline).
5. Enter a valid QR payload that was preloaded.
6. Click **SCAN TICKET**.

**Expected:** Result `OK`, ticket marked used locally, item added to scan queue.

---

## Test 2: Offline double scan → already_used

1. Continue from Test 1 (still offline).
2. Scan the same QR payload again.

**Expected:** Result `ALREADY_USED`.

---

## Test 3: Internet restored → queue syncs

1. Continue from Test 1 and 2 (scan queue has items).
2. Restore network.
3. Wait up to 30 seconds or trigger sync by going online.

**Expected:** Queued count decreases to 0 as items are sent to `POST /scanner/scan`.

---

## Test 4: Online scan (unchanged)

1. Online.
2. Enter Event ID, Dev User ID, valid QR payload.
3. Scan (no preload required).

**Expected:** `OK` via API directly.
