# Slice 12.2 — Audit Logging V1 — Smoke Tests

## Prerequisites

- API and Web app running
- Event with status DRAFT or PENDING
- Dev user with ADMIN role

## Test 1: Approving an event creates audit log

1. POST /admin/events/:eventId/approve with X-Dev-User-Id (ADMIN user).
2. Verify event status is now APPROVED.
3. Query AuditLog table (or GET /admin/audit-logs): there should be one row with action EVENT_APPROVED.

---

## Test 2: Before/after stored

1. Create/use an event with status DRAFT.
2. Approve it via POST /admin/events/:eventId/approve.
3. Fetch audit logs: the new entry should have before = { status: "DRAFT" } and after = { status: "APPROVED", publishedAt: "..." }.

---

## Test 3: Admin endpoint paginates logs

1. Create several audit log entries (approve multiple events).
2. GET /admin/audit-logs?page=1&limit=5

**Expected:** Returns 5 items, meta.total and meta.totalPages reflect full count.

3. GET with page=2

**Expected:** Returns next page of items.

---

## Test 4: Non-admin cannot access audit logs

1. GET /admin/audit-logs with X-Dev-User-Id of a user with role PRODUCER_OWNER.

**Expected:** 403 Forbidden.
