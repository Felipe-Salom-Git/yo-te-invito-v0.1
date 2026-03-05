# Backend Conventions — apps/api (NestJS)

## Non-Negotiable Rules
- Do not add libraries unless explicitly requested
- No massive refactors
- 1 feature = 1 commit
- Do not break compatibility (contracts, endpoints, shared schemas)
- Do not change Prisma schema unless necessary
- “Done” requires minimal smoke tests + no critical logs/errors

---

## Code Structure
- One module per domain
- Thin controllers
- Services hold business logic
- Data access via Prisma service/repository pattern
- Shared schemas/contracts imported from packages/shared

---

## Validation & Contracts
- Zod is mandatory for request validation in endpoints
- The canonical schema definitions live in packages/shared/schemas
- Controllers should validate and map inputs to service calls
- Response shapes should follow shared contracts

---

## Naming Conventions
- Status enums: UPPER_SNAKE_CASE in shared enums when exported broadly
- Endpoint paths: consistent, prefer versioned base path (e.g., /v1)
- Avoid ambiguous abbreviations in core entities

---

## Security
- RBAC on all sensitive routes
- Rate limiting (Redis V2) on:
  - auth endpoints
  - scanner validation/sync endpoints
  - order creation / purchase endpoints
- Sessions and refresh tokens:
  - rotate refresh tokens (recommended)
  - invalidate sessions by sessionId when needed

---

## Scanner Consistency Rules
Online validation (V1):
- Validate ticket in a DB transaction
- Mark ticket used atomically
- Always create a scan log record

Offline sync (V2):
- Queue scans client-side (IndexedDB)
- Sync via batch endpoint
- Record conflicts (already used elsewhere) and return conflict results

---

## Auditing Requirements
Audit logs must be created for:
- event approval/pause/cancel
- ticket revoke/refund (admin intervention)
- pricing/batch changes
- payout status changes
- platform configuration changes (fees, templates, terms)
- global admin actions affecting users or providers

Audit log should include:
- actorUserId
- action code (string)
- entityType and entityId
- before/after snapshots
- timestamp
- optional ip/userAgent

---

## Performance Baselines
Database indexes (recommended):
- tickets: (eventId, status), unique (qrHash)
- orders: (eventId, status)
- scan logs: (eventId, scannedAt)

Caching (V2):
- Home carousels cache key by tenant + filters
- Public event page cache key by eventId

---

## Jobs & Queues (V2)
BullMQ jobs for:
- emails
- PDF generation
- exports
- aggregated metrics

Rules:
- Idempotency via a stable jobKey to avoid duplicates
- Jobs should be retry-safe