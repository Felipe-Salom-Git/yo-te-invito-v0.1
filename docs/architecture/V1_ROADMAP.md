# Yo Te Invito — V1 Roadmap (IA-Optimized) — 12 Slices
Timezone: America/Argentina/Salta
Goal: Ship a functional V1 with clean architecture, predictable modules, and zero invariant violations.
Rule: 1 slice = 1 branch = 1 merge to main (atomic).

---

## Global V1 Principles
- API first for each vertical slice: contracts + Zod schemas in `packages/shared`.
- Keep V1 "demo payment" (no real gateway), but design boundaries to upgrade to V2.
- Scanner validation must be backend-atomic (transaction).
- No refactors unless strictly required by the slice.

---

# Slice 00 — Repo Baseline & Docs Lock-in (Pre-Bootstrap)
**Objective**
- Ensure `/docs` is the single source of truth and matches the intended Nx + Next + Nest + Prisma stack.

**Deliverables**
- `docs/context/PROJECT_CONTEXT.md` (summary of purpose + apps)
- `docs/rules/PROJECT_RULES.md` (your rules, normalized)
- `docs/architecture/SYSTEM_OVERVIEW.md` (high-level flow + boundaries)
- `docs/architecture/V1_ROADMAP.md` (this roadmap copied in)
- `docs/architecture/FOLDER_STRUCTURE.md` (expected layout)

**Smoke**
- Docs exist and are consistent (no references to old stacks).

---

# Slice 01 — Monorepo Bootstrap (Nx + pnpm) + Local Dev Environment
**Objective**
- Create Nx workspace and base apps/packages with runnable dev scripts.

**Deliverables**
- Nx + pnpm workspace configured
- `apps/web` (Next App Router)
- `apps/scanner` (Next App Router, PWA-ready shell)
- `apps/api` (NestJS)
- `packages/shared` (TS package)
- `docker-compose.yml` with Postgres (Redis commented optional)
- `.env.example` for each app
- pnpm scripts: dev:* + db:* utilities

**Smoke**
- `pnpm -w install`
- `pnpm dev:api` runs health endpoint
- `pnpm dev:web` boots homepage
- `pnpm dev:scanner` boots door shell route

---

# Slice 02 — Prisma Core: Tenant + User + RBAC + Seed
**Objective**
- Establish identity base and RBAC primitives.

**Deliverables**
- Prisma schema: Tenant, User
- Enums: Role, UserStatus
- `packages/shared`: Role/UserStatus enums + Zod schemas
- Seed script: create default Tenant + ADMIN user
- API: `/health` + `/internal/version` (optional)

**Smoke**
- `pnpm db:migrate`
- `pnpm db:seed`
- Prisma Studio shows tenant/admin

---

# Slice 03 — API Foundation Patterns (Zod Validation + Error Shape + Auth Stub)
**Objective**
- Standardize controller/service/repo pattern and validation.

**Deliverables**
- Zod validation middleware/pipe pattern for Nest endpoints
- Standard API error response shape
- Auth stub:
  - For V1 dev: allow `X-Dev-User-Id` header OR a simple token
  - Guard that resolves User + role (for protected endpoints)
- Docs: `docs/backend/API_CONVENTIONS.md`

**Smoke**
- Protected endpoint rejects missing auth in prod mode, allows dev mode as specified
- Zod rejects invalid input consistently

---

# Slice 04 — Events: Prisma + Public Read API + Web Listing
**Objective**
- First real vertical slice (public discovery).

**Deliverables**
- Prisma: Event, EventMedia (+ soft delete fields)
- API:
  - `GET /public/events` (pagination, filters: city, dateFrom/dateTo, status=approved)
  - `GET /public/events/:id` (detail)
- `packages/shared`: Zod schemas for queries + responses
- Web:
  - `/events` list (TanStack Query)
  - `/events/[id]` detail

**Smoke**
- Seed creates 2–3 events
- Web list loads, detail loads
- Pagination returns stable shape

---

# Slice 05 — Producer Profile: Public Pages + Basic Admin/Owner CRUD (Minimal)
**Objective**
- Introduce producers as event owners.

**Deliverables**
- Prisma: ProducerProfile
- API:
  - `GET /public/producers/:slug`
  - minimal protected CRUD for producer owner/admin:
    - `POST /producers`
    - `PATCH /producers/:id`
- Web:
  - public producer page
  - minimal dashboard page skeleton for producer owner

**Smoke**
- Producer page renders events by producer
- Protected routes require proper role

---

# Slice 06 — Ticket Catalog: TicketType + TicketBatch (Tandas) + Invariants
**Objective**
- Implement ticket selling structure with non-negotiable batch rules.

**Deliverables**
- Prisma: TicketType, TicketBatch
- Service rules:
  - sequential batches per type
  - only ONE active batch per TicketType
  - scheduled/active/closed status transitions
- API (protected producer):
  - `POST /events/:eventId/ticket-types`
  - `POST /ticket-types/:ticketTypeId/batches`
  - `POST /batches/:batchId/activate` (ensures no other active)
- Web (producer dashboard minimal):
  - manage ticket types + batches UI (basic forms)

**Smoke**
- Attempt to activate second batch fails with clear error
- Listing shows active batch only

---

# Slice 07 — Orders (Demo Paid) + Order Items + Ticket Issuance (QR rules)
**Objective**
- Create purchase flow without real payments.

**Deliverables**
- Prisma: Order, OrderItem, Ticket
- Invariants:
  - QR not regenerated (immutable qrPayload/qrHash once created)
  - sale origin not editable (ref)
- API:
  - `POST /checkout/create` (draft order)
  - `POST /checkout/confirm-demo-payment` (marks paid + issues tickets)
  - `GET /me/orders`
  - `GET /me/tickets`
- Web:
  - event purchase UI (select qty per ticket type)
  - "My Tickets" page (shows QR)

**Smoke**
- Confirm demo payment issues correct ticket count
- Tickets have qrPayload + qrHash set once

---

# Slice 08 — Scanner V1 Online: Door Mode UI + Atomic Scan Endpoint
**Objective**
- Real door workflow (online validation).

**Deliverables**
- Prisma: TicketScanLog
- API (protected scanner role):
  - `POST /scanner/scan`
    - Input: qrPayload OR qrHash
    - Transaction: validate ticket status + mark used + log scan
    - Results: ok | already_used | invalid | revoked
- Scanner app:
  - `/door` UI (big buttons, instant feedback)
  - scan input stub (camera integration optional later; allow manual paste)
  - scan history list (last 20)

**Smoke**
- Same ticket scanned twice returns already_used
- usedAt is set and immutable after used
- scan logs recorded

---

# Slice 09 — Courtesy System: Grants + Capacity Rules
**Objective**
- Implement courtesy tickets respecting the two courtesy modes.

**Deliverables**
- Prisma: CourtesyGrant
- API (producer/admin):
  - `POST /events/:eventId/courtesies` with mode:
    - consumes_batch: decreases availability from active batch
    - free_capacity: affects event capacity only (no batch consumption)
- Ticket issuance for courtesies (creates Ticket records with orderId nullable or special)
- Web (producer dashboard):
  - courtesy form + list

**Smoke**
- consumes_batch cannot exceed remaining batch qty
- free_capacity cannot exceed remaining event capacity
- courtesy tickets scan like normal tickets

---

# Slice 10 — Referrals V1: Links + Attribution (Immutable origin)
**Objective**
- Track sale origin through referral links.

**Deliverables**
- Prisma: ReferralLink, ReferralAttribution
- Invariant: sale origin not editable once attributed
- API:
  - `POST /events/:eventId/referral-links`
  - `GET /r/:code` redirect/landing that sets attribution cookie
  - checkout uses attribution if present
- Web:
  - referral landing page
  - producer/referrer basic view of attributed orders count

**Smoke**
- Attribution persists through checkout
- Origin cannot be changed after order is paid

---

# Slice 11 — Reviews V1 (Simple) + Public Display
**Objective**
- Basic rating system for events/producers/gastro (start with events).

**Deliverables**
- Prisma: Review
- API:
  - `POST /events/:eventId/reviews`
  - `GET /public/events/:id/reviews`
- Web:
  - event detail: list reviews + create review (authenticated user)

**Smoke**
- Validation on score ranges
- Public reviews paginate

---

# Slice 12 — Audit Logging V1 + Admin Minimal Panel (Critical Actions Only)
**Objective**
- Introduce audit trail for sensitive actions from day one.

**Deliverables**
- Prisma: AuditLog
- API:
  - audit helper in services
  - log actions: EVENT_APPROVED, TICKET_REVOKED (stub), PAYOUT_STATUS_CHANGED (stub)
  - `GET /admin/audit-logs` (paginated)
- Web:
  - admin page: audit log table (basic)

**Smoke**
- Performing a logged action creates AuditLog row with before/after snapshots

---

## Optional V1.5 (Only if time permits)
- Scanner offline snapshot + IndexedDB queue (V2-ish)
- Email sending via Resend for order confirmation (queue later)
- Exports (CSV) via simple endpoint (jobs later)

---

# Definition of Done (per slice)
1) Compiles (web/scanner/api)
2) Smoke tests executed (commands listed in PR)
3) No invariant violations introduced
4) Zod validation present for new endpoints
5) Docs updated/created if module is important
6) Changes are minimal and scoped

---

# Recommended Branch Naming
- feat/v1-s00-docs-lockin
- feat/v1-s01-bootstrap
- feat/v1-s02-prisma-core
- feat/v1-s03-api-foundation
- feat/v1-s04-events-public
- feat/v1-s05-producers
- feat/v1-s06-ticket-catalog
- feat/v1-s07-orders-demo
- feat/v1-s08-scanner-online
- feat/v1-s09-courtesies
- feat/v1-s10-referrals
- feat/v1-s11-reviews
- feat/v1-s12-audit-logs