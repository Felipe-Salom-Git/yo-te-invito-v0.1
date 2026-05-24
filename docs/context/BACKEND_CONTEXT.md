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

**Model `RentalLocation`**: name, address, `openingHours` (JSON), `openingHoursNote`, geo, `isActive`, contact (`contactPhone`, `whatsappPhone`, `contactEmail`, `websiteUrl`), products → `Event[]`.

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

**Public event detail**: `GET /public/events/:id` includes nested `rentalLocation` (opening hours parsed via `parseRentalOpeningHours`, `whatsappPhone` for public CTA).

**Service**: `RentalLocationsService` — CRUD locales, create/update products, image normalization (`rental-product-images.util.ts`).

---

## 4. Public API (summary)

| Path | Purpose |
|------|---------|
| `GET /public/events` | List (tenantId, category, city, dates, `sort=recommended\|top_rated`, `minValidReviews`) |
| `GET /public/events/recommended` | Carrusel ranking (recommended / top_rated) |
| `GET /public/events/search`, `/:id` | |
| `GET /public/events/trending` | Públicos visibles (`mergePublicEventVisibility`); orden: `viewCount` ↓, `rankingScore` ↓, `startAt` ↑, `createdAt` ↓ — ver `event-trending.util.ts`. Sin filtro mínimo de reviews (distinto de `/recommended`). |

**Visibilidad eventos vencidos (discovery):** `PublicEventsService.publicWhere()` aplica `event-public-visibility.util.ts` en **list, search, trending, recommended, detail, calendar month**. Eventos `event`/null: ocultos después de **01:00 del día siguiente** al `startAt` (TZ `America/Argentina/Buenos_Aires`). Gastro/rental/excursion/hotel no caducan por fecha en listados. Tests: `pnpm --filter api run test:event-visibility`.
| `GET /public/reviews/summary`, `GET /public/reviews` | Resumen + listado V2 por entidad; query: `sort` (`newest`/`highest`/`lowest`), `replyFilter`, `overallRating` (1–10) |
| `GET /public/users/:userId/review-profile`, `…/reviews` | Perfil comentarista; listado con mismos filtros públicos |
| `GET /public/events/:id/discounts` | Active gastro discounts |
| `GET /public/events/:eventId/ticket-types` | |
| `POST /public/orders`, payments, demo-confirm | |
| `GET /public/referrers`, `/slug/:slug`, `/association/:token` | |

---

## 5. Auth / Me / Producer / Admin

See previous full endpoint tables in git history; key groups:

- **Me (legacy)**: tickets, orders, inbox create, commissions; `GET /me/tickets/:id`, `PATCH /me/tickets/:id/reminder`.
- **Me portal V1** (`MePortalController`, `MeCartController`, …): `GET /me/dashboard`; `GET/PATCH /me/preferences` (portal, sin `favoriteEventIds`); `GET/PATCH /me/account`, `POST /me/account/change-password`; `GET /me/activity` (+ `/attended`, `/reviews`, `/transfers`); carrito `GET/POST/PATCH/DELETE /me/cart*`, `GET /me/cart/pending-orders`, `POST /me/cart/checkout`; `GET/POST/DELETE/PATCH /me/favorites*`; `GET/POST/DELETE/PATCH /me/expected-events*`; **gastro follows** `GET /me/gastro-follows`, `GET /me/gastro-follows/status?gastroProfileId=`, `POST /me/gastro-follows`, `DELETE /me/gastro-follows/:id`, `PATCH /me/gastro-follows/:id/notifications` (`MeGastroFollowsController`, `UserGastroFollowsService`); transferencias `POST /me/tickets/:ticketId/transfer-offers` (`recipientEmail`, `message`), `GET /me/ticket-transfer-offers/lookup/:token`, `POST .../reject`, `POST .../cancel`, `POST .../accept`, `GET /me/ticket-transfer-offers`; cron expiración `TicketTransferSchedulerService`; legacy `POST /tickets/:ticketId/transfer` → 410. **`GET /me/tickets/:id`** incluye `ticketTemplate` para render comprador. Schemas: `packages/shared/src/schemas/user-portal.ts`, `ticket-transfer-offer.ts`, `push-notifications.ts`.
- **Producer**: events CRUD, metrics, ticket types, **ticket-template** PUT/GET/DELETE, referrers (associated, freelance, association link); **profile** `GET/POST/PATCH /producer/profile` (GET puede devolver `null`); **slug** generado en servidor desde `displayName` con unicidad global (`producer-profile-slug.util.ts`, sufijos `-2`, …); **reseñas** `GET /producer/reviews` (filtros `replyFilter`, `disputeStatus` incl. `OPEN`, `publicStatus`, `sort` highest/lowest), `GET /producer/reviews/summary` (`unansweredCount`, `openDisputeCount`), `POST /producer/reviews/:id/reply`, `POST /producer/reviews/:id/dispute`, `GET /producer/review-disputes*`; valoraciones comerciales `commercial-reviews` (4 aspectos 1–10).
- **Admin**: event approval/reject (`AdminEventsService` → dispara notificaciones productor), users, applications, inbox resolve, config, payouts, hotel/referrer profile approval; **dashboard operativo** `GET /admin/dashboard` (`AdminDashboardService`: KPIs tenant + cola eventos `PENDING`); **listado eventos** `GET /admin/events` (`AdminEventsService.listForAdmin`, query Zod `adminEventsListQuerySchema`); **usuarios** `GET /admin/users` (`AdminUsersService.list`, `adminUsersListQuerySchema`: `q`, `role`, `emailVerified`, `createdFrom`/`createdTo`, `has*Profile`, `status`, paginación; respuesta `{ data, meta }` con resúmenes de perfiles); `PATCH /admin/users/:userId/role` bloquea `MASTER_USER_EMAIL`; **subcategorías** `GET/POST/PATCH/DELETE /admin/subcategories` y **`GET /subcategories/public`** (`SubcategoriesService`: CRUD `event|gastro|rental|excursion`; `category=hotel` en admin y público → `{ data: [], comingSoon: true }`; create/update/remove hotel → `403`); **auditoría** `GET /admin/audit-logs` (`AdminAuditService`, `auditLogsListQuerySchema`: `q`, `action`, `entityType`, `actorUserId`, `actorEmail`, fechas, paginación; `summary` + actor email); **disputas reseñas** `GET /admin/review-disputes` (query `status`, `category`, `q`; ítem enriquecido: reseña, autor, evento/categoría, productor, estado/rating review, fechas), `GET :id`, `POST :id/mark-in-review|accept|reject|resolve` (audit); **reseñas admin** `POST /admin/reviews/:id/reply|hide|restore` (audit en hide/restore). **Notificaciones reviews** (`ReviewNotificationsService`): kinds `REVIEW_RECEIVED`, `REVIEW_OFFICIAL_REPLY`, `REVIEW_DISPUTE_*`, `REVIEW_MODERATION_*` vía `UserNotificationsService.deliver` (idempotente; email/push best-effort). **Reporte reputación** `GET /admin/reviews/report`, `GET /admin/reviews/report/export` (`AdminReviewsReportService`; KPIs, promedios por vertical, señales, top disputas; CSV acotado).
- **Gastro**: `GET/POST /gastro/reviews*`, `POST /gastro/reviews/:id/reply` (requiere `ReviewsModule` import en `GastroModule`).
- **Hotel**: `GET /hotel/me`, **`PATCH /hotel/me`** (sync `publicEventId` + evento `category=hotel` si perfil ACTIVE), `POST /profiles/hotel/apply`; **`GET /public/hotel-locations/by-event/:eventId`**, `GET /public/hotel-locations/:id`; `GET /hotel/reviews*`, `POST /hotel/reviews/:id/reply`. Migraciones: `20260522180000_hotel_profile_editable_fields`, `20260522190000_hotel_public_event`.
- **Me**: `POST /me/reviews` (crear review V2 autenticado).
- **Scanner**: validate, scan, logs; tickets en transferencia (`TRANSFER_PENDING`, `TRANSFERRED`) → inválidos.
- **Gastro**: **content** (`GastroContent` — `GET/POST /gastro/events/:eventId/content`, `PATCH /gastro/content/:id`; estados draft/published/inactive; público en `GET /public/gastro-locations*` → `content[]`), discounts, validations.
- **Gastro público (ficha restaurante):** `GET /public/gastro-locations`, `/:id`, `by-event/:eventId` (perfil ACTIVE + `content[]` publicado + `contactEmail`); `GET /:id/discounts` (ACTIVE/APPROVED). Gastro **no** aplica caducidad por fecha de evento en listados (`event-public-visibility.util.ts`).
- **QR descuentos v1:** `buildGastroDiscountQrPayload` en `@yo-te-invito/shared` — `yti:gastro-discount:v1:<discountId>:<token>`; emisión en `POST /public/gastro-discounts/:id/claim` (token por `GastroDiscountClaim`) y al aprobar ticket (`GastroDiscount.qrToken`). Validación puerta: `POST /scanner/gastro-discounts/validate` (`ScannerGastroDiscountService`) — roles SCANNER/ADMIN/GASTRO_OWNER; idempotencia por `claimId`. Doc: `docs/gastro/GASTRO_DISCOUNT_QR.md`. Tests (Slice 9 QA OK): `test:gastro-discount-qr`, `test:gastro-discount-scan` (API + `DEV_AUTH_ENABLED` o dev).
- **Bloque Gastro/Hoteles V2 (cerrado 2026-05-22):** gastro operativo (contenido, QR, scanner, dashboard, follows); hotel discovery Próximamente + portal `PATCH /hotel/me` + API pública `GET /public/hotel-locations*`; subcategorías `category=hotel` → `{ data: [], comingSoon: true }` (admin CRUD hotel → `403`). Auditoría: `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`.
- **Portal gastro dashboard:** `GET /gastro/dashboard` (KPIs, alertas, validaciones recientes); `GET /gastro/validations` paginado con filtros `discountId`, `from`, `to` — scope por perfil del dueño (`GastroDashboardService`).
- **Gastro follows + alertas:** `UserGastroFollow`; al activar descuento (`ACTIVE`) → `GastroFollowDiscountAlertsService` + kind `FOLLOWED_GASTRO_NEW_DISCOUNT` (idempotente, throttling). Doc: `docs/gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md`.
- **Gastro reviews V2:** `GET /gastro/reviews/summary`, `GET /gastro/reviews`, `POST /gastro/reviews/:id/reply` — `ReviewDisputesService` (sin duplicar motor de reviews).
- **Transferencia personal**: `TicketTransferOffer` — sin marketplace `/resale/*` (eliminado `20260605120000_remove_resale_marketplace`).
- **Notificaciones usuario**: `GET/PATCH /me/notifications`, `POST .../mark-all-read` (`UserNotificationsService`, `NotificationsSchedulerService`, Resend email).
  - **Entrega unificada** `deliver()`: canales `IN_APP`, `EMAIL`, `PUSH` (log idempotente `NotificationDeliveryLog`).
  - **Kinds:** `TICKET_REMINDER_24H`, `FAVORITE_EVENT_SOON`, `EXPECTED_EVENT_SOON`, `TRANSFER_OFFER_PENDING`, `REVIEW_PENDING`, `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`, **`EVENT_APPROVED_BY_ADMIN`**, **`EVENT_REJECTED_BY_ADMIN`**, **`REVIEW_RECEIVED`**, **`REVIEW_OFFICIAL_REPLY`**, **`REVIEW_DISPUTE_CREATED`**, **`REVIEW_DISPUTE_ACCEPTED`**, **`REVIEW_DISPUTE_REJECTED`**, **`REVIEW_MODERATION_HIDDEN`**, **`REVIEW_MODERATION_RESTORED`**.
  - **Productor evento admin:** `ProducerEventStatusNotificationsService` (hook en `approveEvent` / `rejectEvent`); no falla moderación si email/push fallan; preferencia `notifyProducerEventStatus` en `User.preferences`.
  - **Reviews/disputas:** `ReviewNotificationsService` (crear reseña, réplica oficial, disputa, hide/restore); preferencias `notifyManagedReviews`, `notifyReviewEngagement`; email/push best-effort.
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
- **UserCart**, **UserCartItem**, **UserFavorite**, **UserExpectedEvent**, **UserGastroFollow**, **UserPushSubscription**
- **UserNotification**, **NotificationDeliveryLog** (`NotificationChannel`: `IN_APP`, `EMAIL`, `PUSH`)
- **Referidos V2:** **ReferrerProfile**, **ProducerReferrerRelationship**, **ReferralLink**, **ReferralAttribution**, **ReferralCommercialProposal**, **ReferralCommercialAgreement**, **ReferralCommission** (`CONFIRMED` / `MARKED_AS_PAID`), **ReferralPaymentRequest** — liquidación externa (sin custodia). Doc: `docs/referrals/REFERRALS_V2.md`
- **GastroDiscount**, **GastroDiscountValidation**, **InboxItem** (kind incl. `REVIEW_DISPUTE_REQUEST`)
- **HotelProfile** (`galleryUrls`, `geoLat`/`geoLng`, `whatsappPhone`, `amenities`, `publicEventId`), memberships, **GastroContent**, **ProducerProfile**, **GastroProfile**
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
| Restaurar ADMIN + portales maestro | `pnpm --filter api run user:restore-master` (idempotente; luego **logout/login** en web) |
| Inspeccionar usuario | `pnpm --filter api run user:inspect -- <email>` |
| Inspeccionar cuenta | `pnpm --filter api run user:inspect -- <email> [--verify-password <pass>]` |
| Reset / verificar email | `user:reset-password`, `user:verify-email` |
| Probar login API | `user:test-login` (con `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD`) |
| Debug gastro descuentos | `pnpm --filter api run debug:gastro-discounts` |
| Test QR payload gastro (unit) | `pnpm --filter api run test:gastro-discount-qr` |
| Test scanner gastro (API dev) | `pnpm --filter api run test:gastro-discount-scan` |
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
| Referidos V2 | `pnpm --filter api run smoke:referrals` | Requiere `SMOKE_PRODUCER_EMAIL` + `SMOKE_REFERRER_EMAIL`; órdenes/comisiones si hay evento APPROVED |

**Tests util (sin BD):** `test:referral-proposals`, `test:referral-commission`, `test:referral-payment-requests`.

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

## 8. Legal Admin — cerrado (2026-05-24, Slices 1–8)

**Estado:** módulo técnico listo para producción; **contenido** de cada documento sigue placeholder hasta redacción legal.

**Models:** `LegalDocument`, `LegalDocumentVersion`, `UserLegalAcceptance` — migración `20260524120000_legal_documents`.

**Modules:** `apps/api/src/modules/legal/` (`LegalDocumentsService`, `AdminLegalDocumentsController`, `PublicLegalDocumentsController`, `MeLegalService` + `MeLegalController` en `me/`).

### Endpoints

| Method | Path | Auth | Notes |
|--------|------|------|-------|
| GET | `/admin/legal-documents` | ADMIN | Lista + `publishedVersion` / `draftVersion` |
| GET | `/admin/legal-documents/:key` | ADMIN | Detalle |
| GET | `/admin/legal-documents/:key/versions` | ADMIN | Historial |
| PATCH | `/admin/legal-documents/:key` | ADMIN | Metadata + flags requerido |
| POST | `/admin/legal-documents/:key/draft` | ADMIN | Borrador (no edita PUBLISHED in-place) |
| POST | `/admin/legal-documents/:key/publish` | ADMIN | Publica; archiva PUBLISHED anterior (una sola vigente) |
| GET | `/public/legal/requirements` | Público | Requeridos por `context` + `profileType` + `documentVersionId` |
| GET | `/public/legal/:slug` | Público | Solo PUBLIC + PUBLISHED; INTERNAL/DRAFT → 404 |
| GET | `/me/legal/requirements` | Usuario | Pendientes por contexto |
| POST | `/me/legal/accept` | Usuario | `{ documentVersionIds, context }` — idempotente |
| GET | `/me/legal/acceptances` | Usuario | Historial |

**Seguridad:** `RolesGuard` + `Role.ADMIN` en admin; aceptación rechaza INTERNAL y no-PUBLISHED; tenant isolation.

**AuditAction:** `LEGAL_DOCUMENT_CREATED`, `LEGAL_DOCUMENT_UPDATED`, `LEGAL_DOCUMENT_DRAFT_SAVED`, `LEGAL_DOCUMENT_PUBLISHED`, `LEGAL_DOCUMENT_ARCHIVED`.

**Shared:** `packages/shared` — `constants/legal-documents.ts`, `schemas/legal-documents.ts`, `schemas/me-legal.ts`.

**Seed:** `pnpm --filter api run seed:legal-documents` (catálogo idempotente) · `pnpm --filter api run seed:legal-content` (Markdown `docs/legal/` → DRAFT; `--dry-run`, `--force`, `--publish` opcional).

**Smokes:** `pnpm --filter api run smoke:legal` | `test:legal-documents` | `test:me-legal-acceptance`. Requiere API + `DEV_AUTH_ENABLED=true` (o JWT) y usuario ADMIN para tests admin.

**Docs:** `docs/legal/LEGAL_ADMIN_MODULE.md`, `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`, `docs/audits/LEGAL_ADMIN_AUDIT.md`. UI: `FRONTEND_CONTEXT.md` §8e.

**Pendiente:** redacción legal; bloqueos duros portal; disclaimers hardcoded → documentos publicados.

---

## 9. Debt / risks

- Payments: demo only.
- Image uploads often data-URL in forms (límite Zod ~2M chars por URL); web comprime en `RentalProductImagesForm` — object storage pendiente.
- Public list `EventSummary` includes `fromPrice` (min active ticket/batch price, major units) and `producerName` (`ProducerProfile.displayName`, ACTIVE only) — see `public-event-summary.util.ts`.
- Run `prisma migrate deploy` + `prisma generate` after schema changes.

---

## 10. Backend slice guidance

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
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`
- `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`
- `docs/audits/LEGAL_ADMIN_AUDIT.md`
- `docs/gastro/GASTRO_DISCOUNT_QR.md`, `docs/hotel/HOTEL_E2E.md`