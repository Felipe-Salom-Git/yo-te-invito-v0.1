# BACKEND CONTEXT — Yo Te Invito

Current state of `apps/api` as verified from the repository.

---

## 1. Stack

| Technology | Use |
|------------|-----|
| NestJS 10 | API framework |
| Prisma 5 | ORM |
| PostgreSQL | Database |
| Zod | Validation (`packages/shared`) |
| BullMQ + Redis | Jobs (email) |
| Resend | Email |

---

## 2. Architecture

```
HTTP → Controller (thin) → ZodValidationPipe → Service → Prisma → PostgreSQL
```

- Errors: `AllExceptionsFilter` (`statusCode`, `code`, `message`, `details`, …).
- Auth: JWT; dev `X-Dev-User-Id` when `NODE_ENV=development` or `DEV_AUTH_ENABLED=true`.
- RBAC: `RolesGuard` + `@RequireRole()`.

---

## 3. Rentals module

**Model `RentalLocation`**: name, address, `openingHours` (JSON), `openingHoursNote`, geo, `isActive`, products → `Event[]`.

**Products**: `Event` with `category: rental`, `rentalLocationId`, `subcategoryId`, `coverImageUrl` (header), `EventMedia` (gallery).

**Schemas** (`packages/shared`): `opening-hours.ts` (`RentalOpeningHours`: weekday / saturday / sunday + exceptions), `rental-locations.ts`.

**Admin endpoints** (`AdminRentalLocationsController`, role `ADMIN`):

| Method | Path |
|--------|------|
| GET | `/admin/rental-locations` |
| GET | `/admin/rental-locations/:id` |
| POST | `/admin/rental-locations` |
| PATCH | `/admin/rental-locations/:id` |
| DELETE | `/admin/rental-locations/:id` |
| POST | `/admin/rental-locations/:id/products` |
| PATCH | `/admin/rental-locations/:id/products/:productId` |

**Public event detail**: `GET /public/events/:id` includes nested `rentalLocation` (opening hours parsed via `parseRentalOpeningHours`).

**Service**: `RentalLocationsService` — CRUD locales, create/update products, image normalization (`rental-product-images.util.ts`).

---

## 4. Public API (summary)

| Path | Purpose |
|------|---------|
| `GET /public/events` | List (tenantId, category, city, dates, …) |
| `GET /public/events/search`, `/trending`, `/:id` | |
| `GET /public/events/:id/discounts` | Active gastro discounts |
| `GET /public/events/:eventId/ticket-types` | |
| `POST /public/orders`, payments, demo-confirm | |
| `GET /public/referrers`, `/slug/:slug`, `/association/:token` | |

---

## 5. Auth / Me / Producer / Admin

See previous full endpoint tables in git history; key groups:

- **Me**: tickets, orders, preferences, inbox create, commissions.
- **Producer**: events CRUD, metrics, ticket types, **ticket-template** PUT/GET/DELETE, referrers (associated, freelance, association link).
- **Admin**: event approval, users, applications, inbox resolve, config, payouts, hotel/referrer profile approval.
- **Hotel**: `GET /hotel/me`, `POST /profiles/hotel/apply`.
- **Scanner**: validate, scan, logs.
- **Gastro / Resale**: content, discounts, validations, listings.

---

## 6. Prisma model highlights

- **Tenant**, **User** (roles incl. `HOTEL_OWNER`, `GASTRO_OWNER`, …)
- **Event**, **EventMedia**, **ContentSubcategory**
- **RentalLocation** → rental products
- **TicketType**, **TicketTemplate**, **TicketBatch**, **Order**, **OrderItem**, **Payment**, **Ticket**
- **ReferrerProfile**, **ProducerReferrerRelationship**, **ReferralLink**, **ReferralAttribution**, **ReferralCommission**
- **GastroDiscount**, **GastroDiscountValidation**, **InboxItem**
- **HotelProfile**, memberships, **ProducerProfile**, **GastroProfile**
- **Review**, **CourtesyGrant**, **TicketScanLog**, **FraudSignal**, **Payout**, **AuditLog**, **PlatformConfig**

---

## 7. Demo scripts

| Script | Command |
|--------|---------|
| Base seed | `pnpm --filter api run demo:seed` |
| Curated content | `pnpm --filter api run demo:seed-curated` |
| Subcategories | `pnpm --filter api run demo:seed-subcategories` |
| **Cleanup demo** | `pnpm db:cleanup-demo` (dry-run default) |
| | `pnpm db:cleanup-demo -- --confirm` |
| | Optional: `--include-subcategories`, `--make-preserved-user-admin` |

**Cleanup** (`prisma/scripts/cleanup-demo.ts`):

- Preserves: `felipe.e.salom@gmail.com`, tenant, `PlatformConfig`, subcategories (unless flag).
- Deletes: all events (+ media, tickets, orders, …), rental locales, demo profiles, other users, inbox, audit logs.
- **Refuses `NODE_ENV=production`** unless `ALLOW_PRODUCTION_CLEANUP=true`.

---

## 8. Debt / risks

- Payments: demo only.
- Image uploads often data-URL in forms — no object storage yet.
- `fromPrice` / `producerName` may be missing from base list API.
- Run `prisma migrate deploy` + `prisma generate` after schema changes.

---

## 9. Backend slice guidance

1. Thin controllers; logic in services.
2. Zod from `packages/shared`.
3. Migrations for schema changes.
4. Document new response fields for frontend.

---

## References

- `docs/context/PROJECT_CONTEXT.md`
- `docs/context/FRONTEND_CONTEXT.md`
- `docs/api/ENDPOINTS.md`
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
- `apps/api/prisma/schema.prisma`
