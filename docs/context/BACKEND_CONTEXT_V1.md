# BACKEND CONTEXT V1 — Yo Te Invito

Describes the **real current state** of the backend as verified from the repository.

---

## 1. Backend Stack

| Technology | Use |
|------------|-----|
| NestJS 10 | API framework |
| Prisma 5 | ORM |
| PostgreSQL | Database |
| Zod | Request validation (schemas in `packages/shared`) |
| BullMQ | Job queues (email, etc.) |
| Resend | Email delivery |
| ioredis | Redis for queues |

---

## 2. Architecture

```
HTTP Request
    ↓
Controller (thin)
    ↓
ZodValidationPipe (packages/shared schemas)
    ↓
Service (business logic)
    ↓
PrismaService / other services
    ↓
PostgreSQL
```

- **Validation**: Zod schemas in `packages/shared`; `ZodValidationPipe` in controllers.
- **Auth**: `DevAuthGuard` (X-Dev-User-Id in dev); JWT via `auth/login`. `RolesGuard` + `@RequireRole()` for RBAC.
- **Errors**: Standard shape via `AllExceptionsFilter` (`statusCode`, `code`, `message`, `details`, `timestamp`, `path`).

---

## 3. Implemented Modules / Endpoints

### Public (no auth)

| Path | Purpose |
|------|---------|
| `GET /public/events` | List events (tenantId, page, limit, city, category, dateFrom, dateTo) |
| `GET /public/events/search` | Search events |
| `GET /public/events/trending` | Trending events (requires ratingCount > 0) |
| `GET /public/events/:id` | Event detail |
| `GET /public/events/:eventId/ticket-types` | Ticket types for event |
| `GET /public/events/:id/reviews` | Reviews for event |
| `POST /public/orders` | Create order |
| `GET /public/orders/:orderId` | Order detail |
| `POST /public/orders/:orderId/payments` | Create payment |
| `POST /public/payments/:paymentId/demo-confirm` | Demo payment confirmation |
| `GET /public/referral/:code` | Lookup referral by code |
| `GET /public/producers/:id` | Producer detail |

### Auth

| Path | Purpose |
|------|---------|
| `POST /auth/login` | Login (email, password, tenantId) |
| `POST /auth/register` | Register user |
| `POST /auth/apply-role` | Apply role (post-registration) |
| `GET /auth/verify-email` | Verify email token |
| `POST /auth/google` | Google OAuth |

### Protected (Bearer / X-Dev-User-Id)

| Path | Purpose |
|------|---------|
| `GET /me` | Current user |
| `GET /me/tickets` | User tickets |
| `GET /me/orders` | User orders |
| `GET /me/preferences` | User preferences |
| `PATCH /me/preferences` | Update preferences |
| `GET /me/referral-links` | User referral links |
| `GET /me/commissions` | User commissions |
| `POST /me/commissions/request` | Request commission payout |

### Producer

| Path | Purpose |
|------|---------|
| `GET /producer/events` | Producer events |
| `GET /producer/events/:eventId` | Event detail |
| `POST /producer/events` | Create event |
| `PATCH /producer/events/:eventId` | Update event |
| `GET /producer/events/:eventId/tickets` | Event tickets |
| `GET /producer/events/:eventId/metrics` | Event metrics |
| `POST /producer/events/:eventId/ticket-types` | Create ticket type |
| `PATCH /producer/events/:eventId/ticket-types/:id` | Update ticket type |
| `GET /producer/referrers` | Referrers |
| `GET /producer/payouts` | Payouts |
| `POST /producer/payouts` | Create payout |
| `GET /producer/events/:eventId/payouts` | Event payouts |

### Admin

| Path | Purpose |
|------|---------|
| `GET /admin/events` | All events (approval queue, filters) |
| `POST /admin/events/:eventId/approve` | Approve event |
| `POST /admin/tickets/:ticketId/revoke` | Revoke ticket |
| `GET /admin/events/:eventId/fraud-signals` | Fraud signals |
| `GET /admin/platform/metrics` | Platform metrics |
| `GET /admin/audit-logs` | Audit logs |
| `GET /admin/applications` | Role applications |
| `POST /admin/applications/:id/approve` | Approve application |
| `POST /admin/applications/:id/reject` | Reject application |
| `GET /admin/users` | Users |
| `POST /admin/users/referrer` | Create referrer |
| `PATCH /admin/users/:userId/role` | Update user role |
| `GET /admin/config` | Platform config |
| `PATCH /admin/config` | Update config |
| `GET /admin/payouts` | Payouts |
| `PATCH /admin/payouts/:id` | Update payout |
| `POST /admin/commissions/:id/confirm` | Confirm commission |

### Events (domain)

| Path | Purpose |
|------|---------|
| `POST /events/:eventId/referral-links` | Create referral link |
| `GET /events/:eventId/referral-links` | List referral links |
| `PUT /events/:eventId/referrals` | Update referrals |
| `POST /events/:eventId/reviews` | Create review |
| `POST /events/:eventId/courtesies` | Create courtesy |
| `GET /events/:eventId/ticket-types` | List ticket types |
| `GET /events/:eventId/courtesies` | List courtesies |

### Tickets / Scanner / Other

| Path | Purpose |
|------|---------|
| `POST /tickets/:ticketId/transfer` | Transfer ticket |
| `POST /scanner/validate` | Validate ticket (single) |
| `POST /scanner/scan` | Scan ticket (door) |
| `GET /scanner/events/:eventId/tickets` | Event tickets for scanner |
| `GET /scanner/events/:eventId/logs` | Scan logs |
| `POST /internal/jobs/expire-orders` | Expire orders (cron) |
| `POST /internal/jobs/fraud-detection` | Fraud detection job |
| `GET /health` | Health check |

### Gastro / Resale

| Path | Purpose |
|------|---------|
| `GET /gastro/events/:eventId/content` | Gastro content |
| `POST /gastro/events/:eventId/content` | Create content |
| `PATCH /gastro/content/:id` | Update content |
| `GET /gastro/events/:eventId/discounts` | Discounts |
| `POST /gastro/events/:eventId/discounts` | Create discount |
| `PATCH /gastro/discounts/:id` | Update discount |
| `GET /gastro/validations` | Validations |
| `POST /gastro/validations` | Create validation |
| `GET /resale/listings/active` | Active listings |
| `GET /resale/listings/:id` | Listing detail |
| `GET /resale/events/:eventId/listings` | Event listings |
| `POST /resale/listings` | Create listing |
| `POST /resale/listings/:id/purchase` | Purchase listing |

---

## 4. Data Model (Prisma)

### Core entities

- **Tenant** — Multi-tenant isolation
- **User** — Role (ADMIN, PRODUCER_OWNER, PRODUCER_STAFF, GASTRO_OWNER, REFERRER, SCANNER, USER)
- **Event** — category (event | gastro | excursion | rental), status (DRAFT, PENDING, APPROVED, PAUSED, CANCELLED)
- **TicketType** — Price, capacity, sales window
- **Order** — Status (PENDING_PAYMENT, PAID, CANCELLED, EXPIRED, REFUNDED)
- **Ticket** — Status (VALID, USED, REVOKED), qrPayload
- **Review** — score, comment
- **ReferralLink**, **ReferralAttribution**, **ReferralCommission**
- **CourtesyGrant**
- **TicketScanLog**
- **AuditLog**
- **Payout**, **Payment**
- **RoleApplication**
- **PlatformConfig**
- **FraudSignal**
- **EventMedia**

---

## 5. Auth / Tenancy / Security

- **Auth**: JWT from `auth/login` or `X-Dev-User-Id` in development.
- **DevAuthGuard**: Only when `NODE_ENV === 'development'` or `DEV_AUTH_ENABLED === 'true'`.
- **Multi-tenant**: `tenantId` required; isolation via Prisma `where`.
- **RBAC**: `RolesGuard` + `@RequireRole(Role.ADMIN)` etc.

---

## 6. API Readiness for Frontend

- **Public events, search, trending, detail**: Implemented; list/search may not return `fromPrice` or `producerName` unless extended (curated seed does).
- **Orders, ticket types, checkout**: Implemented; payment is demo.
- **Reviews**: Implemented.
- **Referrals, courtesies, payouts**: Implemented.
- **Resale**: Endpoints exist; frontend integration status may vary.

---

## 7. Backend Debt / Risks / Gaps

- **Payments**: Demo flow only; no real provider integration.
- **fromPrice in list**: Not part of base Event select; curated seed may extend responses.
- **Rate limiting**: Documented in conventions; Redis may be required for production.
- **Email**: Uses BullMQ + Resend; queue depends on Redis.

---

## 8. Guidance for Future Backend Slices

1. Keep controllers thin; logic in services.
2. Use schemas from `packages/shared`; do not duplicate.
3. Add migrations for Prisma changes; avoid breaking existing data.
4. Preserve error shape and auth/role guards.
5. Extend API responses via explicit selects; document new fields for frontend.
