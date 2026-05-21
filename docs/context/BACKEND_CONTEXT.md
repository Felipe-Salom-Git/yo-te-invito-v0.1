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
| web-push | Web Push (VAPID; opcional si faltan keys) |

---

## 2. Architecture

```
HTTP → Controller (thin) → ZodValidationPipe → Service → Prisma → PostgreSQL
```

- Errors: `AllExceptionsFilter` (`statusCode`, `code`, `message`, `details`, …).
- Auth: JWT; dev `X-Dev-User-Id` when `NODE_ENV=development` or `DEV_AUTH_ENABLED=true`. Tras validar JWT, `JwtOrDevAuthGuard` comprueba que el usuario exista en BD (401 si fue borrado, p. ej. tras cleanup).
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
| `GET /public/events` | List (tenantId, category, city, dates, `sort=recommended\|top_rated`, `minValidReviews`) |
| `GET /public/events/recommended` | Carrusel ranking (recommended / top_rated) |
| `GET /public/events/search`, `/trending`, `/:id` | |
| `GET /public/reviews/summary`, `GET /public/reviews` | Resumen + listado V2 por entidad |
| `GET /public/users/:userId/review-profile`, `…/reviews` | Perfil comentarista |
| `GET /public/events/:id/discounts` | Active gastro discounts |
| `GET /public/events/:eventId/ticket-types` | |
| `POST /public/orders`, payments, demo-confirm | |
| `GET /public/referrers`, `/slug/:slug`, `/association/:token` | |

---

## 5. Auth / Me / Producer / Admin

See previous full endpoint tables in git history; key groups:

- **Me (legacy)**: tickets, orders, inbox create, commissions; `GET /me/tickets/:id`, `PATCH /me/tickets/:id/reminder`.
- **Me portal V1** (`MePortalController`, `MeCartController`, …): `GET /me/dashboard`; `GET/PATCH /me/preferences` (portal, sin `favoriteEventIds`); `GET/PATCH /me/account`, `POST /me/account/change-password`; `GET /me/activity` (+ `/attended`, `/reviews`, `/transfers`); carrito `GET/POST/PATCH/DELETE /me/cart*`, `GET /me/cart/pending-orders`, `POST /me/cart/checkout`; `GET/POST/DELETE/PATCH /me/favorites*`; `GET/POST/DELETE/PATCH /me/expected-events*`; transferencias `POST /me/tickets/:ticketId/transfer-offers` (`recipientEmail`, `message`), `GET /me/ticket-transfer-offers/lookup/:token`, `POST .../reject`, `POST .../cancel`, `POST .../accept`, `GET /me/ticket-transfer-offers`; cron expiración `TicketTransferSchedulerService`; legacy `POST /tickets/:ticketId/transfer` → 410. Schemas: `packages/shared/src/schemas/user-portal.ts`, `ticket-transfer-offer.ts`.
- **Producer**: events CRUD, metrics, ticket types, **ticket-template** PUT/GET/DELETE, referrers (associated, freelance, association link); **profile** `GET/POST/PATCH /producer/profile` (GET puede devolver `null`); **reseñas** `GET /producer/reviews`, `GET /producer/reviews/summary`, `POST /producer/reviews/:id/reply`, `POST /producer/reviews/:id/dispute`, `GET /producer/review-disputes*`; valoraciones comerciales `commercial-reviews` (4 aspectos 1–10).
- **Admin**: event approval, users, applications, inbox resolve, config, payouts, hotel/referrer profile approval; **disputas** `GET/POST /admin/review-disputes/:id`; **reseñas** `POST /admin/reviews/:id/reply|hide|restore`.
- **Gastro**: `GET/POST /gastro/reviews*`, `POST /gastro/reviews/:id/reply` (requiere `ReviewsModule` import en `GastroModule`).
- **Hotel**: `GET /hotel/me`, `POST /profiles/hotel/apply`; `GET /hotel/reviews*`, `POST /hotel/reviews/:id/reply`.
- **Me**: `POST /me/reviews` (crear review V2 autenticado).
- **Scanner**: validate, scan, logs; tickets en transferencia (`TRANSFER_PENDING`, `TRANSFERRED`) → inválidos.
- **Gastro**: content, discounts, validations.
- **Transferencia personal**: `TicketTransferOffer` — sin marketplace `/resale/*` (eliminado `20260605120000_remove_resale_marketplace`).
- **Notificaciones usuario**: `GET/PATCH /me/notifications`, `POST .../mark-all-read` (`UserNotificationsService`, `NotificationsSchedulerService`, Resend email).
  - **Entrega unificada** `deliver()`: canales `IN_APP`, `EMAIL`, `PUSH` (log idempotente `NotificationDeliveryLog`).
  - **Kinds:** `TICKET_REMINDER_24H`, `FAVORITE_EVENT_SOON`, `EXPECTED_EVENT_SOON`, `TRANSFER_OFFER_PENDING`, `REVIEW_PENDING`.
  - **Push:** `WebPushService` (`web-push`, VAPID); `GET/POST/DELETE /me/push-subscriptions`, `GET /config`, `POST /test` (`UserPushSubscriptionsService`).
  - **Preferencias push** en `User.preferences` (portal): `pushAlertsEnabled`, `notifyUpcomingEvents`, `notifyTransferOffers`, etc. — ver `user-portal-preferences.util.ts` + `shouldSendPushForKind`.
  - **Alertas inteligentes:** transfer al crear oferta; cron reviews; publicación evento → `EventPublicationAlertsService` (approve admin, publicaciones generales, rental/excursion APPROVED); kinds `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`; throttling `SMART_ALERTS_MAX_PER_USER_HOUR` (default 5).
- **Seguir productoras**: `GET/POST/DELETE/PATCH /me/producer-follows*`, `GET /me/recommendations`.

### Scripts eliminados (2026)

| Antes | Estado |
|-------|--------|
| `demo:seed`, `demo:load`, `demo-seed-curated` | Archivos borrados |
| `cleanup-demo.ts` | Reemplazado por `cleanup-content.ts` |
| `check-user`, `debug-login`, `test-login-api` | Fusionados en `user:inspect`, `user:test-login` |
| `db:reset` | Renombrado `db:reset-dangerous` |
| Módulo `resale` | Eliminado del API |

---

## 6. Prisma model highlights

- **Tenant**, **User** (roles incl. `HOTEL_OWNER`, `GASTRO_OWNER`, …)
- **Event**, **EventMedia**, **ContentSubcategory**
- **RentalLocation** → rental products
- **TicketType**, **TicketTemplate**, **TicketBatch**, **Order**, **OrderItem**, **Payment**, **Ticket** (`TRANSFER_PENDING`, `TRANSFERRED`; **TicketTransferOffer**)
- **UserCart**, **UserCartItem**, **UserFavorite**, **UserExpectedEvent**, **UserPushSubscription**
- **UserNotification**, **NotificationDeliveryLog** (`NotificationChannel`: `IN_APP`, `EMAIL`, `PUSH`)
- **ReferrerProfile**, **ProducerReferrerRelationship**, **ReferralLink**, **ReferralAttribution**, **ReferralCommission**
- **GastroDiscount**, **GastroDiscountValidation**, **InboxItem** (kind incl. `REVIEW_DISPUTE_REQUEST`)
- **HotelProfile**, memberships, **ProducerProfile**, **GastroProfile**
- **Review** (V2: `overallRating`, `aspectRatings` JSON, `publicStatus`, `officialReply`, `replyAuthorType`), **ReviewDisputeRequest**, **CommercialRelationshipReview** (aspectos B2B JSON)
- **Event**: `bayesianRating`, `rankingScore` (cache; `ReviewRankingService` al crear/ocultar/restaurar reviews)
- **CourtesyGrant**, **TicketScanLog**, **FraudSignal**, **Payout**, **AuditLog** (acciones review-dispute), **PlatformConfig**

---

## 7. Dev scripts (API)

Manual de comandos: **`docs/guides/DEVELOPER_SCRIPTS_GUIDE.md`**. Inventario técnico: **`docs/dev/SCRIPTS.md`**. Smokes: **`docs/guides/SMOKE_TESTS_GUIDE.md`**. Regla: **pago demo sí, datos demo automáticos no** — ver `docs/guides/DEMO_REMOVAL.md`.

### Estructura / catálogo

| Script | Command |
|--------|---------|
| Subcategorías (idempotente, sin usuarios) | `pnpm --filter api run seed:subcategories` |
| Restaurar ADMIN + portales maestro | `pnpm --filter api run user:restore-master` |
| Inspeccionar cuenta | `pnpm --filter api run user:inspect -- <email> [--verify-password <pass>]` |
| Reset / verificar email | `user:reset-password`, `user:verify-email` |
| Probar login API | `user:test-login` (con `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD`) |
| Debug gastro descuentos | `pnpm --filter api run debug:gastro-discounts` |
| Debug admin gastro API | `pnpm --filter api run debug:admin-api -- --profile-id <id>` |
| Migración prefs portal (one-shot) | `pnpm --filter api run migrate:user-portal-preferences` (+ `-- --confirm`) |

### Smokes HTTP (`apps/api/scripts/`, `lib/smoke-auth.ts`)

Requieren API `:3001` + **`SMOKE_USER_EMAIL`** + **`SMOKE_USER_PASSWORD`** (sin `@demo.local`).

| Script | Command | Persistencia |
|--------|---------|--------------|
| API health | `pnpm --filter api run smoke:api` | Mínima |
| Reviews V2 | `pnpm --filter api run smoke:reviews` | Reviews `[smoke-test]` — cleanup auto |
| Portal `/me` | `pnpm --filter api run smoke:user-portal` | Usuarios `@smoke.yo-te-invito.test`; cleanup auto |
| Notificaciones | `pnpm --filter api run smoke:notifications` | `e2e-demo:*` — cleanup auto |
| Producer follows | `pnpm --filter api run smoke:producer-follows` | Borra follow al final |

**Cleanup smoke:** tras cada smoke (salvo `SMOKE_SKIP_CLEANUP=1`); manual: `pnpm --filter api run smoke:cleanup` / `-- --confirm`. Implementación: `scripts/lib/smoke-cleanup.ts`.

**Destructivo (opcional):** `SMOKE_ALLOW_DESTRUCTIVE=1` en `smoke:user-portal` para test de aceptar transferencia (mueve ticket del usuario principal).

### Variables Web Push (API)

| Variable | Uso |
|----------|-----|
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Clave pública VAPID |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `WEB_PUSH_CONTACT_EMAIL` | `mailto:` para `web-push.setVapidDetails` |

Opcional cron: `NOTIFICATIONS_CRON_ENABLED=false`, `NOTIFICATION_REMINDER_HOURS`, `NOTIFICATION_REMINDER_TOLERANCE_HOURS`.

| Variable | Uso |
|----------|-----|
| `SMART_ALERTS_MAX_PER_USER_HOUR` | Máx. alertas de publicación (productora + intereses) por usuario/hora (default `5`) |

### Base de datos (raíz / prisma)

| Script | Command |
|--------|---------|
| **Cleanup tenant** | `pnpm db:cleanup-content` (dry-run) |
| | `pnpm db:cleanup-content -- --confirm` |
| | `--make-preserved-user-admin`, `--include-subcategories` |
| **Reset total** | `pnpm db:reset-dangerous -- --confirm` |

**Cleanup content** (`prisma/scripts/cleanup-content.ts`):

- Preserves: `felipe.e.salom@gmail.com`, tenant, `PlatformConfig`, subcategories (unless flag).
- Deletes: events, orders, tickets, profiles, other users, inbox, etc. Does **not** re-seed demo data.
- Blocks `NODE_ENV=production` unless `ALLOW_PRODUCTION_CLEANUP=true`.

**Eliminados (no usar):** `demo:seed`, `demo:load`, `demo:seed-curated`, `db:reset`, `smoke` (sin sufijo), `smoke:reviews-v2`.

---

## 8. Debt / risks

- Payments: demo only.
- Image uploads often data-URL in forms (límite Zod ~2M chars por URL); web comprime en `RentalProductImagesForm` — object storage pendiente.
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
- `docs/reviews/REVIEWS_V2.md`
- `docs/guides/SMOKE_TESTS_GUIDE.md`
