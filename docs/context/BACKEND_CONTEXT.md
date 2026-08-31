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
| BullMQ + Redis | Jobs — colas `emails` (transaccional) y `campaign-emails` (marketing) |
| Resend / SMTP (Nodemailer) | Email vía `MailProvider` (`MAIL_PROVIDER` = `resend` o `smtp`; ver `docs/emails/EMAILS_ARCHITECTURE.md`) |
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

**Límites de contenido V3.1 (Slice 4):** `constants/content-limits.ts` — `PUBLIC_SUMMARY_MAX_LENGTH` (500), `PUBLIC_SUBTITLE_MAX_LENGTH` (400), helpers `trimToPublicSummary` / `trimToPublicSubtitle`; usados en schemas events/rentals/excursions/gastro + servicios API defensivos.

**Links externos V3.1 (Slice 6):** migración `20260610120000_external_links_gastro_excursion`; `schemas/external-links.ts` + `entity-social-links.util.ts`; gastro local/admin y operador excursión exponen `websiteUrl`, `bookingUrl`, `menuUrl` (gastro), `socialLinks` JSON (instagram/facebook/tiktok/youtube/externalUrl).

**Horarios excursión V3.1 (Slice 7):** migración `20260611120000_excursion_schedule_fields`; campos texto en `Event` (`excursionDepartureTime`, `excursionDurationText`, `excursionAvailableDaysText`, `excursionScheduleNotes`, `excursionMeetingPoint`); `schemas/excursion-schedule.ts`; CRUD producto en `ExcursionOperatorsService`; detalle público `GET /public/events/:id` incluye `excursionSchedule`; ubicación por producto opcional vía campos geo/address existentes en `Event` (fallback operador en web).

**Stabilization V3.1 (Slice 7.5):** smoke `pnpm --filter api run smoke:v31-stabilization` — verifica columnas Slice 6+7+8 (`EventSubcategory`) y roundtrip efímero; doc `docs/audits/V3_1_SLICE_7_5_STABILIZATION_SMOKE.md`. Deploy: aplicar migraciones `20260610120000_*`, `20260611120000_*`, `20260612120000_event_subcategories` antes de API/web.

**Subcategorías múltiples V3.1 (Slice 8 fase 1):** tabla `EventSubcategory`; excursiones aceptan `subcategoryIds` + `subcategoryId` principal; filtros públicos OR legacy/adicionales; solo categoría `excursion` en formularios/UI.

**Admin archivar V3.1 (Slice 9):** `AdminContentLifecycleService` — `POST /admin/events/:id/pause|restore`, `POST /admin/rental-locations/:id/deactivate|activate`, `POST /admin/excursion-operators/:id/deactivate|activate`; gastro `PATCH .../status` con audit; público filtra padres inactivos (`public-content-availability.util.ts`). Doc: `V3_1_SLICE_9_ADMIN_ARCHIVE_SMOKE.md`.

**Banners editoriales V3.1 (Slice 10):** `CategoryEditorialBanner` + `CategoryEditorialBannersService` — `GET/POST /admin/category-editorial-banners`, `PATCH /admin/category-editorial-banners/:id`, `POST .../reorder`; público `GET /public/category-editorial-banners`. Audit: `CATEGORY_EDITORIAL_BANNER_*`. Convive con `CategoryBannerItem` (eventos). Migración `20260614120000_category_editorial_banners`. Doc: `V3_1_SLICE_10_CATEGORY_BANNERS_SMOKE.md`.

**Validación DB V3.1 (Slice 8.5):** smoke `pnpm --filter api run smoke:v31-subcategories` — schema junction, create/edit/sync, filtro secundaria, `subcategories[]` en detalle; doc `docs/audits/V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md`. Ejecutar junto con `smoke:v31-stabilization` tras `prisma migrate deploy` local.

**QA pre-deploy V3.1 (Slice 14):** 5 migraciones (`20260610120000` … `20260614120000`) aplicadas; smokes `smoke:v31-stabilization`, `smoke:v31-subcategories`, `smoke:v31-admin-archive`, `smoke:v31-category-banners` — todos exit 0 (HTTP admin opcional con API levantada). Deploy VPS: `prisma migrate deploy` antes de restart; doc `docs/audits/V3_1_PRE_DEPLOY_QA_CLOSING.md`.

**Hotfix admin gastro discovery (post-V3.1):** `AdminGastroLocationsService.syncActiveProfilePublicEvent` — activar/editar local ACTIVE siempre sincroniza `publicEventId` + `Event` `category=gastro` `APPROVED`; `public-content-availability.util.ts` oculta gastro si `gastroProfilePublic.status !== ACTIVE`. Smoke: `smoke:v31-admin-gastro-discovery`; doc `V3_1_HOTFIX_ADMIN_GASTRO_DISCOVERY_SMOKE.md`.

**V3.1 Etapa 10 — Horarios gastro avanzados (cerrada 2026-06-10):** `GastroProfile.openingHoursMode` (`simple`|`weekly`) + `openingHoursWeekly` JSONB; convive con `openingHours` (rental) + `openingHoursNote`. Schemas: `gastro-weekly-opening-hours.ts`; helpers `gastro-profile-fields.util.ts`; público `PublicGastroLocationsService`. Smoke: `smoke:v31-gastro-weekly-hours`. Doc cierre: `docs/audits/V3_1_STAGE_10_GASTRO_HOURS_CLOSING.md`; checklist §27.1–27.2.

**Hotfix horarios overnight (2026-08-30, `920c5d7`):** rangos `close < open` cruzan medianoche (`20:00→00:00`, `20:00→02:00`); solapamiento normalizado; `GastroLocalForm` muestra errores de horarios bajo fieldset horarios (no Provincia). Test: `pnpm --filter api run test:opening-hours`. Doc: `docs/audits/V3_2_HOTFIX_GASTRO_OVERNIGHT_HOURS_CLOSING.md`.

**V3.1 Etapa 11 — Legales pendientes (cerrada con observaciones 2026-06-10):** `LegalAcceptanceContext.EVENT_PUBLICATION` + `UserLegalAcceptance.eventId`; `EventPublicationLegalService`; `GET/POST /producer/events/:eventId/legal/*`; bloqueo `producer-events-crud` al pasar `DRAFT → PENDING` (`LEGAL_ACCEPTANCE_REQUIRED` / `LEGAL_DOCUMENT_NOT_PUBLISHED`). Migración `20260610130000_event_publication_legal_acceptance`. Smokes: `smoke:v31-event-publication-legal`, `smoke:legal`. Doc: `docs/audits/V3_1_STAGE_11_LEGAL_CLOSING.md`. **Pendiente cliente:** publicar `producer_terms` y resto docs en `/admin/legales`.

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
| `GET /public/events` | List (tenantId, category, city, dates, `sort=recommended\|top_rated`, `minValidReviews`); Optional JWT — ADMIN ve coming-soon |
| `GET /public/events/recommended` | Carrusel ranking (recommended / top_rated) |
| `GET /public/events/search`, `/:id` | Search multi-campo (`title`/`summary`/`tags`/productora/…); detail |
| `GET /public/events/suggestions` | Suggest liviano (`q` mín. 2, `limit`≤12) — V3.2 Slice 5 |
| `GET /public/events/trending` | Públicos visibles (`mergePublicEventVisibility`); orden: `viewCount` ↓, `rankingScore` ↓, `startAt` ↑, `createdAt` ↓ — ver `event-trending.util.ts`. Sin filtro mínimo de reviews (distinto de `/recommended`). |

**Visibilidad eventos vencidos (discovery):** `PublicEventsService.publicWhere()` aplica `event-public-visibility.util.ts` en **list, search, suggestions, trending, recommended, detail, calendar month**. Eventos `event`/null: ocultos después de **01:00 del día siguiente** al `startAt` (TZ `America/Argentina/Buenos_Aires`). Gastro/rental/excursion/hotel no caducan por fecha en listados. Tests: `pnpm --filter api run test:event-visibility`.

**V3.2 categoría Próximamente:** `packages/shared/src/category-availability.ts` — `event`/`gastro` = `comingSoon`; `publicWhere` excluye categorías denegadas según JWT (`getDeniedComingSoonCategories`). Preview: ADMIN (ambas); `PRODUCER_OWNER`/`PRODUCER_STAFF` → event; `GASTRO_OWNER` → gastro. Portales comerciales no se bloquean.

**V3.3 — Actividades (copy público):** el label de producto es **Actividades**; el identificador técnico permanece **`excursion`** (`Event.category`, filtros API, rutas `/excursiones`, `/categoria/excursion`). No renombrar sin migración transversal planificada. Sin cambios de backend en Etapa 1 V3.3.

**V3.3 Etapa 2 — Avatar usuario:** persistencia en `User.preferences.avatarUrl` (`MeAccountService`); helper `readUserAvatarUrl()` en shared; upload `POST /uploads/public-image` scope `user` + `purpose=profile` (solo propio `userId`); reviews/perfil público exponen `avatarUrl` desde preferences; **sin** endpoint `/me/avatar` dedicado. **No** confundir con `ReferrerProfile.avatarUrl`.
| `GET /public/reviews/summary`, `GET /public/reviews` | Resumen + listado V2 por entidad; query: `sort` (`newest`/`highest`/`lowest`), `replyFilter`, `overallRating` (1–10) |
| `GET /public/users/:userId/review-profile`, `…/reviews` | Perfil comentarista; listado con mismos filtros públicos |
| `GET /public/events/:id/discounts` | Active gastro discounts |
| `GET /public/events/:eventId/ticket-types` | |
| `POST /public/orders`, payments, demo-confirm | |
| `GET /public/referrers`, `/slug/:slug`, `/association/:token` | |
| `GET /public/platform-config?tenantId=` | Contacto institucional público (footer); sin auth; no expone `categories` ni campos admin |
| `GET /public/legal/:slug`, `GET /public/legal/requirements` | Documentos legales publicados |

---

## 5. Auth / Me / Producer / Admin

**Registro V2 (`AuthController`, `AuthService`, `ProfileRegistrationService`, `LegalSignupService`):**

| Method | Path | Notas |
|--------|------|--------|
| POST | `/auth/register` | `profileType` (`USER` \| `PRODUCER` \| `GASTRO` \| `HOTEL` \| `REFERRER`), `profileData` según `profile-onboarding.ts`; asigna `User.role` vía `mapSignupProfileTypeToRole`; valida `signupLegalAcceptance` server-side (`assertSignupAcceptanceComplete`: generales + términos del perfil antes de crear usuario; `400 LEGAL_ACCEPTANCE_REQUIRED` si faltan); perfiles comerciales **ACTIVE** al crear; email duplicado → `409`; respuesta sin JWT; envía `AUTH_VERIFY_EMAIL` |
| GET | `/public/legal/requirements` | SIGNUP + `profileType`: USER → `terms_general` + `privacy_policy`; comerciales → + `producer_terms` / `gastro_terms` / `hotel_terms` / `referrer_terms` (flags `isRequiredForSignup`) |
| POST | `/auth/login` | Rechaza credenciales válidas si `emailVerified` es null → `401` `EMAIL_NOT_VERIFIED` (excepto `MASTER_USER_EMAIL`); JWT/session role resuelve membresía comercial si `User.role=USER` (legacy) |
| POST | `/auth/resend-verification-email` | Público; email normalizado; respuesta genérica (anti-enumeración); emite `AUTH_VERIFY_EMAIL` solo si existe y no está verificado; invalida token anterior; TTL 24h; rate limit in-memory 3/15min por email y 10/15min por IP (`AUTH_EMAIL_VERIFICATION_RESEND_CLOSING.md`) |
| GET | `/auth/verify-email?token=` | Marca `emailVerified` y elimina token; token ausente/vencido/usado → `INVALID_TOKEN`/`EXPIRED_TOKEN` con copy unificado |
| POST | `/profiles/*/apply` | Usuario logueado sin perfil (p. ej. gastro en `/cuenta/solicitar-gastro`) |

Schemas signup/apply: `packages/shared/src/schemas/profile-onboarding.ts` (`gastroProfileToPersistInput`, `hotelProfileToPersistInput`, …). Catálogo provincias/ciudades (labels en persist): `packages/shared/src/location/argentina-locations.ts`.

See previous full endpoint tables in git history; key groups:

- **Me (legacy)**: tickets, orders, inbox create, commissions; `GET /me/tickets/:id`, `PATCH /me/tickets/:id/reminder`.
- **Me portal V1** (`MePortalController`, `MeCartController`, …): `GET /me/dashboard`; `GET/PATCH /me/preferences` (portal, sin `favoriteEventIds`); `GET/PATCH /me/account`, `POST /me/account/change-password`; `GET /me/activity` (+ `/attended`, `/reviews`, `/transfers`); carrito `GET/POST/PATCH/DELETE /me/cart*`, `GET /me/cart/pending-orders`, `POST /me/cart/checkout`; `GET/POST/DELETE/PATCH /me/favorites*`; `GET/POST/DELETE/PATCH /me/expected-events*`; **gastro follows** `GET /me/gastro-follows`, `GET /me/gastro-follows/status?gastroProfileId=`, `POST /me/gastro-follows`, `DELETE /me/gastro-follows/:id`, `PATCH /me/gastro-follows/:id/notifications` (`MeGastroFollowsController`, `UserGastroFollowsService`); transferencias `POST /me/tickets/:ticketId/transfer-offers` (`recipientEmail`, `message`), `GET /me/ticket-transfer-offers/lookup/:token`, `POST .../reject`, `POST .../cancel`, `POST .../accept`, `GET /me/ticket-transfer-offers`; cron expiración `TicketTransferSchedulerService`; legacy `POST /tickets/:ticketId/transfer` → 410. **`GET /me/tickets/:id`** incluye `ticketTemplate` para render comprador. Schemas: `packages/shared/src/schemas/user-portal.ts`, `ticket-transfer-offer.ts`, `push-notifications.ts`.
- **Producer**: events CRUD, metrics, ticket types, **ticket-template** PUT/GET/DELETE, referrers (associated, freelance, association link); **profile** `GET/POST/PATCH /producer/profile` (GET puede devolver `null`); **slug** generado en servidor desde `displayName` con unicidad global (`producer-profile-slug.util.ts`, sufijos `-2`, …); **reseñas** `GET /producer/reviews` (filtros `replyFilter`, `disputeStatus` incl. `OPEN`, `publicStatus`, `sort` highest/lowest), `GET /producer/reviews/summary` (`unansweredCount`, `openDisputeCount`), `POST /producer/reviews/:id/reply`, `POST /producer/reviews/:id/dispute`, `GET /producer/review-disputes*`; valoraciones comerciales `commercial-reviews` (4 aspectos 1–10).
- **Admin**: event approval/reject (`AdminEventsService` → dispara notificaciones productor), users, applications, inbox resolve, config, payouts, hotel/referrer profile approval; **dashboard operativo** `GET /admin/dashboard` (`AdminDashboardService`: KPIs tenant + cola eventos `PENDING`); **listado eventos** `GET /admin/events` (`AdminEventsService.listForAdmin`, query Zod `adminEventsListQuerySchema`); **usuarios** `GET /admin/users` (`AdminUsersService.list`, `adminUsersListQuerySchema`: `q`, `role`, `emailVerified`, `createdFrom`/`createdTo`, `has*Profile`, `status`, paginación; respuesta `{ data, meta }` con resúmenes de perfiles); `PATCH /admin/users/:userId/role` bloquea `MASTER_USER_EMAIL`; **delete seguro** `GET /admin/users/:userId/delete-preflight` + `DELETE /admin/users/:userId` (`AdminUsersService.getDeletePreflight` / `deleteUser`, util `admin-user-delete.util.ts`: blockers publicaciones/órdenes/tickets/pagos/reviews/scanner; 409 `USER_DELETE_BLOCKED`; audit `ADMIN_USER_DELETED` / `ADMIN_USER_DELETE_BLOCKED`; regla de oro: publicaciones activas bloquean); **deep delete** `GET/DELETE /admin/deep-delete/:entityType/:entityId` (`AdminDeepDeleteService`, `admin-deep-delete-preflight.util.ts`: USER/PRODUCER/GASTRO/HOTEL/EVENT/RENTAL_LOCATION/EXCURSION_OPERATOR; conserva historial crítico; audit `ADMIN_DEEP_DELETE_EXECUTED`; migración `20260623140000`; doc `ADMIN_DEEP_DELETE_AUDIT.md`); **subcategorías** `GET/POST/PATCH/DELETE /admin/subcategories` y **`GET /subcategories/public`** (`SubcategoriesService`: CRUD `event|gastro|rental|excursion`; `category=hotel` en admin y público → `{ data: [], comingSoon: true }`; create/update/remove hotel → `403`); **auditoría** `GET /admin/audit-logs` (`AdminAuditService`, `auditLogsListQuerySchema`: `q`, `action`, `entityType`, `actorUserId`, `actorEmail`, fechas, paginación; `summary` + actor email); **disputas reseñas** `GET /admin/review-disputes` (query `status`, `category`, `q`; ítem enriquecido: reseña, autor, evento/categoría, productor, estado/rating review, fechas), `GET :id`, `POST :id/mark-in-review|accept|reject|resolve` (audit); **reseñas admin** `POST /admin/reviews/:id/reply|hide|restore` (audit en hide/restore). **Notificaciones reviews** (`ReviewNotificationsService`): kinds `REVIEW_RECEIVED`, `REVIEW_OFFICIAL_REPLY`, `REVIEW_DISPUTE_*`, `REVIEW_MODERATION_*` vía `UserNotificationsService.deliver` (idempotente; email/push best-effort). **Reporte reputación** `GET /admin/reviews/report`, `GET /admin/reviews/report/export` (`AdminReviewsReportService`; KPIs, promedios por vertical, señales, top disputas; CSV acotado).
- **Gastro**: `GET/POST /gastro/reviews*`, `POST /gastro/reviews/:id/reply` (requiere `ReviewsModule` import en `GastroModule`).
- **Hotel**: `GET /hotel/me`, **`PATCH /hotel/me`** (sync `publicEventId` + evento `category=hotel` si perfil ACTIVE), `POST /profiles/hotel/apply`; **`GET /public/hotel-locations/by-event/:eventId`**, `GET /public/hotel-locations/:id` (solo `ACTIVE`); `GET /hotel/reviews*`, `POST /hotel/reviews/:id/reply`. **Admin archivar (V3.1 Etapa 12):** `GET /admin/hotel-profiles`, `POST .../:id/suspend|activate` (`HOTEL_PROFILE_SUSPENDED`/`ACTIVATED` audit); sync evento `PAUSED`/`APPROVED`. Migraciones: `20260522180000_hotel_profile_editable_fields`, `20260522190000_hotel_public_event`, `20260610140000_stage_12_hotel_audit_related_links` (`relatedLinks` JSON en Event/GastroProfile).
- **Me**: `POST /me/reviews` (crear review V2 autenticado).
- **Scanner**: validate, scan, logs; tickets en transferencia (`TRANSFER_PENDING`, `TRANSFERRED`) → inválidos.
- **Scanner ownership (V3.1 Etapa 5 — cerrada 2026-06-10):** modelo `ScannerAccount` (`apps/api/src/modules/scanner-accounts/`). Portales: `POST/PATCH/reset` en `/producer/scanners`, `/gastro/scanners`. **V3.3 Etapa 3:** creación scanner con `username` + password (`email: null`); login PWA por `identifier` (username o email legacy); `User.username` global unique; `User.email` nullable en DB. Bypass `emailVerified` **solo** `Role.SCANNER` (`198fc38`) — ya no por `email == null` genérico ni `emailVerified` falso al crear. PWA/API: `GET /scanner/account`, `GET /scanner/scan-targets`, `POST /scanner/scan`, `GET /scanner/events/:id/tickets`, `POST /scanner/gastro-discounts/validate`, `POST /scanner/activity-coupons/validate` — scope vía `assertScannerCanAccessEvent` / `assertScannerCanAccessGastroDiscount` / `assertScannerCanAccessActivityCoupon` (`canScannerAccessActivityCoupon`: tenant + `EXCURSION_OPERATOR` + `coupon.excursionOperatorId === parentProfileId` + `Event.category === excursion`). Util: `password.util.ts`. Smokes: `pnpm --filter api run smoke:v31-scanner-accounts`, `smoke:v31-scanner-scope`. Docs: `docs/audits/V3_1_STAGE_5_CLOSING.md`, `V3_3_STAGE_3_SCANNER_V3_CLOSING.md`, `V3_3_SCANNER_USERNAME_AUTH.md`.
- **Scanner short codes (V3.3 Etapa 3 + Etapa 7):** `ScannerShortCodeService` — tickets vía `shortTicketCode` (8 chars, scope evento); gastro vía `GastroDiscountClaim.shortCode` (6 chars, lookup → `buildGastroDiscountQrPayload`); actividades vía `ActivityCouponClaim.shortCode` (6 chars, lookup **solo** esa tabla → payload `yti:activity-coupon:v1:`). Nunca buscar Gastro + Activity y devolver la primera coincidencia. Util `manual-short-code.util.ts`. Regla: short code ≠ token QR. Migración `20260831120000_gastro_claim_short_code` (+ `CREATE EXTENSION IF NOT EXISTS pgcrypto`).
- **Scanner username auth (V3.3 Etapa 3):** migración `20260831130000_user_scanner_username` — `User.email DROP NOT NULL`, `User.username` UNIQUE. Auth `POST /auth/login` acepta `identifier` o `email` legacy. Doc: `V3_3_SCANNER_USERNAME_AUTH.md`.
- **Scanner PDF + offline (V3.1 Etapa 6 — cerrada 2026-06-10):** `TicketListExportService` — `GET /producer/events/:eventId/tickets/export.pdf`, `GET /scanner/events/:eventId/tickets/export.pdf`, `GET /scanner/events/:eventId/snapshot`, `POST /scanner/offline-validations/sync`. PDF sin QR completo (código corto + sufijo). Audit `TICKET_LIST_EXPORTED`. Scanner inactivo → `SCANNER_INACTIVE`. Smokes: `smoke:v31-ticket-list-pdf`, `smoke:v31-ticket-list-pdf-permissions`. Doc: `docs/audits/V3_1_STAGE_6_SCANNER_OFFLINE_CLOSING.md`.
- **Scanner operativo jornada (2026-06-15 — cerrado funcionalmente):** hotfixes PWA `apps/scanner`: login + menú operativo (`0ad9564`); validación contra fecha seleccionada (`0317a17`); PDF export — fix import CJS `pdfkit` (`ea09816`, `12058e1`); targets vía `GET /scanner/scan-targets` (sin `GET /public/events/:id`); selector oculta eventos vencidos (corte 1 AM AR); modal resultado (`d7dc305`); listado entradas + hora escaneo (`b22b5ef`); escaneo manual por botón, no loop automático (`8bf56a3`); pantalla dividida setup vs escaneo, modal sin auto-cierre (`cbc4866`); gastro portal scanners — fallback `parentProfileId` (`84707cd`). QA extendida en puerta real/mobile opcional.
- **Geocoding server-side (Etapa GEO — 2026-06-15 + Georef 2026-06-23):** módulo `apps/api/src/modules/geo/`:
  - `GET /geo/provinces` — público; `GeoRefService` → Georef Argentina; cache 24h
  - `GET /geo/localities?province=...` — público; cache 12h; **dedupe por nombre normalizado** (`normalizeLocalityKey`)
  - `POST /geo/resolve-address` — JWT; Google Geocoding API; body acepta campos separados + opcional `query` precompuesta; `composeFullAddress()`; log sanitizado; cache 15 min; rate limit 30/min/usuario; audit `GEO_ADDRESS_RESOLVED`
  - Env: `GOOGLE_GEOCODING_API_KEY` (fallback dev `GOOGLE_MAPS_API_KEY`)
  - Schemas: `packages/shared/src/schemas/geo.ts` (+ `composeFullAddress`, `query` opcional)
  - Contextos resolve: `EVENT`, `GASTRO`, `RENTAL_LOCATION`, `EXCURSION_OPERATOR`, `EXCURSION_MEETING_POINT`
  - Hotfixes 2026-06-23: dedupe localidades (`ea53f72`); calle/altura en query geocoding (`5353ae2`)
  - Docs: `GEO_MAPS_STAGE_CLOSING.md`, `GEO_ADDRESS_MAP_PIN_CLOSING.md`
  - **Cerrado prod 2026-06-23:** key Geocoding IP-restricted en Google Cloud + VPS, migrate deploy, QA Bariloche + «Ubicar en el mapa»
- **Gastro**: **content** (`GastroContent` — `GET/POST /gastro/events/:eventId/content`, `PATCH /gastro/content/:id`; estados draft/published/inactive; público en `GET /public/gastro-locations*` → `content[]`). Ownership: `GastroContentService` exige membresía activa del perfil salvo `ADMIN`. Discounts, validations.
- **Gastro público (ficha restaurante):** `GET /public/gastro-locations`, `/:id`, `by-event/:eventId` (perfil ACTIVE + `content[]` publicado + `contactEmail`); `GET /:id/discounts` (ACTIVE/APPROVED). Gastro **no** aplica caducidad por fecha de evento en listados (`event-public-visibility.util.ts`).
- **QR descuentos v1:** `buildGastroDiscountQrPayload` en `@yo-te-invito/shared` — `yti:gastro-discount:v1:<discountId>:<token>`; emisión en `POST /public/gastro-discounts/:id/claim` (token por `GastroDiscountClaim`) y al aprobar ticket (`GastroDiscount.qrToken`). Validación puerta: `POST /scanner/gastro-discounts/validate` (`ScannerGastroDiscountService`) — roles SCANNER/ADMIN/GASTRO_OWNER; **hotfix 2026-06-23:** claim-first; parent redeemable `ACTIVE`/`APPROVED`; idempotencia por `claimId`; **V2:** vencimiento inclusivo AR, uso único por claim. **V2.1 (2026-06-23):** `validityMode` `DATE_RANGE`|`WEEKLY_RECURRING` + `validWeekday`; `isGastroDiscountValidToday`; scanner `NOT_VALID_TODAY`; admin KPI claims `USED`. **V2.2 (2026-06-23):** eliminado límite 1 cupón/día; `GET /gastro/discounts/:id/summary`, `PATCH .../status`; admin `GET/PATCH /admin/gastro-discount-tickets/:discountId/summary|status`; `GastroDiscountMetricsService`. **Hotfix Fecha/Rango (2026-06-23):** `DATE_RANGE` con `validFrom`/`validTo` (YYYY-MM-DD); normalización inicio/fin día AR en `gastro-portal-discounts.service`; legacy `discountDate` en lectura. Doc: `GASTRO_QR_COURTESIES_AUDIT.md`, `ADMIN_GASTRO_SCANNER_HOTFIX_AUDIT.md`. Tests: `test:gastro-discount-expiry`, `test:gastro-discount-qr`, `test:gastro-discount-scan`.
- **Gastro descuentos QR cortesía (2026-06-15 + V2 2026-06-23):** modelo `GastroCourtesyCampaign`, claims extendidos (`type`, `source`, `status`, `expiresAt`, `visibility: COURTESY_ONLY`). Endpoints: `POST /gastro/discounts/courtesy/send`, `GET /gastro/discounts/courtesy/recipients-preview`, `GET /me/gastro-discounts`, `GET /public/gastro-discounts/claims/:id`; claim público `POST /public/gastro-discounts/:id/claim`; emails `GASTRO_DISCOUNT_QR_REQUESTED`, `GASTRO_DISCOUNT_QR_COURTESY` — CTA principal claim `/descuentos/reclamo/:claimId?token=...` (`GastroDiscountClaimEmailService`). **V2.1:** `sendTemplateResult` con error detallado; respuesta cortesía `{ requestedCount, createdCount, sentCount, failedCount, failures[], emailConfigured }`; link fallback en HTML. Migración `20260615120000_gastro_courtesy_discount_claims` + `20260625120000_gastro_discount_weekly_recurrence`. Pendiente: QA manual staging/prod.
- **Bloque Gastro/Hoteles V2 (cerrado 2026-05-22):** gastro operativo (contenido, QR, scanner, dashboard, follows); hotel discovery Próximamente + portal `PATCH /hotel/me` + API pública `GET /public/hotel-locations*`; subcategorías `category=hotel` → `{ data: [], comingSoon: true }` (admin CRUD hotel → `403`). Auditoría: `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`.
- **Portal gastro dashboard:** `GET /gastro/dashboard` (KPIs, alertas, validaciones recientes); `GET /gastro/validations` paginado con filtros `discountId`, `from`, `to` — scope por perfil del dueño (`GastroDashboardService`).
- **V3.3 Etapa 4 — Gastro multi-local + approval (cerrada 2026-08-31):** sin modelos Prisma nuevos; `User` → N `UserGastroMembership` → N `GastroProfile` (cada uno = propuesta/local independiente). **`GastroOwnershipService`** (`gastro-ownership.service.ts`): `listManagedProfiles`, `listOperationalProfiles`, `assertCanManageProfile` (portal: DRAFT/PENDING/ACTIVE), `assertCanOperateProfile` (ACTIVE), `resolveManagedProfileId` / `resolveOperationalProfileId`, `resolveCreateProfileId` (1 ACTIVE auto, N exige explícito). Endpoints: `GET /gastro/locations`, `POST /gastro/locations` (`copyFromProfileId` → snapshot ubicación: provincia, ciudad, dirección, lat/lng, `googlePlaceId`; contactos: teléfono, email, `menuUrl`, `websiteUrl`, `bookingUrl`, `socialLinks` — **no** copia imágenes/galería). `GET/PATCH /gastro/local?profileId=`. Approval: registro + local adicional → `PENDING`; `POST /admin/profiles/gastro/:id/approve` → `ACTIVE` + sync `publicEventId`; reject → `REJECTED`; discovery solo ACTIVE. **Descuentos:** list/create scoped por `profileId` navegación; detalle/editar/status/metrics por `discountId` → `GastroDiscount.gastroProfileId` (`assertOwnDiscount`). **Scanner:** `parentProfileId` intacto; picker portal si N perfiles. Deuda: `ScannerAccountsService.getManagedGastroProfileIds` duplica ownership (no bloqueante). Notificaciones approval de perfil → **cerradas Etapa 5 (A9)**. Test: `pnpm --filter api run test:gastro-multi-local`. Docs: `V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md`, `V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md`.
- **V3.3 Etapa 5 — Descuentos Gastro V3 (cerrada 2026-08-31):** publicado `ACTIVE`/`APPROVED` + `pendingUpdate` JSON opcional (allowlist server-side, Zod `.strict()`). No `GastroDiscountVersion`. Campos materiales: `title`, `summary`, `detail`, `imageUrls`, **`type`**, **`value`**, `validityMode`, `validWeekday`, `validFrom`, `validTo`, `discountDate`. Pending **nunca** toca `id`/`tenantId`/`gastroProfileId`/`status`/`qrToken`/`createdAt`/origin/creator/claims/validations. Approve: promoción transaccional; reject: pending cleared, publicado intacto. Claims/QR/shortCode/validations/metrics en el mismo `discountId`. Scanner sigue `ACTIVE`\|`APPROVED`. **Prisma:** `pendingUpdate`, `pendingUpdateSubmittedAt`, `pendingUpdateSubmittedByUserId`, `archivedAt`, `createdByOrigin` (`GASTRO`\|`ADMIN`), `createdByUserId`; FKs `onDelete: SetNull`; Deep Delete intacto. Migración `20260831140000_gastro_discount_v3_lifecycle` (**no aplicada localmente**). **Expiry:** `GastroDiscountExpiryService` (helper AR); DATE_RANGE vencido → `EXPIRED`; WEEKLY sin `validTo` no vence; cron dev `*/15`, prod `5 * * * *`; `GASTRO_DISCOUNT_EXPIRY_CRON_ENABLED` ON salvo `"false"` (`apps/api/.env.example`). **Archive:** `archivedAt` soft; UI Activos/Pendientes/Vencidos/Archivados. **Admin create:** `POST /admin/gastronomicos/:profileId/descuentos` — `GastroProfile` ACTIVE + `publicEventId`; `status=ACTIVE`, `createdByOrigin=ADMIN`; audit `ADMIN_GASTRO_DISCOUNT_CREATED`. Portal gastro: `PENDING_REVIEW` + `GASTRO`. **Notificaciones** (`GastroLifecycleNotificationsService`): `GASTRO_DISCOUNT_PENDING_REVIEW` / `APPROVED_BY_ADMIN` / `REJECTED_BY_ADMIN` / `EXPIRED`, `GASTRO_PROFILE_APPROVED_BY_ADMIN` / `REJECTED_BY_ADMIN`; create/edit vía `referenceKey` `:create`/`:edit`; expiry `gastro-discount-expired:{discountId}` + `NotificationDeliveryLog`. Digest admin expired → **Etapa 8**. Tests PASS: `test:gastro-discount-expiry`, `pending-edit`, `edit-moderation`, `archive`, `origin`, `lifecycle-notifications`. `test:gastro-discount-scan` **NO EJECUTADO**. Docs: `V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md`, `V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md`.
- **V3.3 Etapa 6 — QR Studio (cerrada 2026-08-31):** presentación visual del cupón, **sin** cambiar payload/claim/scanner/`pendingUpdate`. **Prisma** `GastroDiscountTemplate` 1:0..1 (`gastroDiscountId` `@unique`; discount `onDelete: Cascade`; creator/updater `SetNull`). Migración `20260831150000_gastro_discount_visual_template` (**no aplicada localmente**). **No** se reutilizó modelo `TicketTemplate`. Schema shared: `upsertGastroDiscountVisualTemplateDtoSchema` `.strict()`; compile `compileDiscountVisualTemplateDesign` (QR min 0.18, margen 0.04, sin overlap; canónicos visibles `discountValue`/`discountTitle`/`shortCode`; borra `content` de DYNAMIC). Mapping inválido → `null` → fallback. **Ownership:** `discountId` → `gastroProfileId` → `GastroOwnershipService.assertCanOperateProfile`; Admin `Role.ADMIN` + `profileId` de ruta debe coincidir; tenant JWT. **Endpoints:** `GET/PUT/DELETE /gastro/discounts/:id/visual-template`; `GET/PUT/DELETE /admin/gastronomicos/:profileId/descuentos/:discountId/visual-template`. **AuditLog:** `GASTRO_DISCOUNT_TEMPLATE_CREATED` / `UPDATED` / `RESET`. **GCS:** `POST /uploads/public-image` scope `gastro`, `entityId` = `GastroProfile.id`, purposes `gallery`/`logo`, HTTPS. Tests PASS: `test:ticket-template-schema`, `test:discount-visual-template`, `test:gastro-discount-visual-persist`, `test:discount-visual-render`, `test:gastro-discount-qr`, `test:scanner-manual-short-code`. Docs: `V3_3_STAGE_6_QR_STUDIO_AUDIT.md`, `V3_3_STAGE_6_QR_STUDIO_CLOSING.md`.
- **V3.3 Etapa 7 — Actividades + Cupones QR (cerrada 2026-08-31):** `GastroDiscount` ≠ `ActivityCoupon`; no hay `GenericCoupon`. Primitives compartidos: QR payload/`classifyQrScanPayload`, short-code normalize/display, `formatCouponVisualBenefit`, helpers DATE_RANGE/WEEKLY, `computeActivityCouponMetrics`, `shouldSendActivityCouponClaimEmail`, notification engine. **Prisma:** `ActivityCoupon` (`tenantId`, `eventId`, `excursionOperatorId`, `code`, `title`, `summary`, `detail`, `type`, `value`, `validityMode`, `validWeekday`, `validFrom`, `validTo`, `couponDate`, `imageUrls`, `status`, `rejectionReason`, `pendingUpdate`, `pendingUpdateSubmittedAt`, `archivedAt`, `createdByOrigin`, `createdByUserId`); `ActivityCouponClaim` (`qrToken`, `accessToken`, `shortCode` unique, `@@unique([couponId, email])`); `ActivityCouponValidation` (`claimId` unique opcional). **Sin** FK a `EventOccurrence`. Guard `isEventCategoryEligibleForActivityCoupon` — solo `excursion` (create, getRow, public get/claim/me, scanner, targets). **Ownership V1:** `Role.ADMIN` only; actor comercial `ExcursionOperator`; producto `Event(category=excursion)`. Create → `ACTIVE`; edit in-place. **Claim:** 1 por `(couponId, email)`; duplicate ACTIVE reutiliza; USED/EXPIRED no re-emite. QR exacto `yti:activity-coupon:v1:<couponId>:<token>`. Short code display `XXX-XXX`; lookup **solo** `ActivityCouponClaim` (tenant check post-`findUnique`). **Scanner:** `POST /scanner/activity-coupons/validate`; `ScannerAccount.parentProfileType = EXCURSION_OPERATOR`, `parentProfileId = ExcursionOperator.id`; scope **operator-wide**; helper `canScannerAccessActivityCoupon` / `assertScannerCanAccessActivityCoupon`. Resultados `VALID`/`INVALID`/`EXPIRED`/`INACTIVE`/`NOT_VALID_TODAY`/`ALREADY_USED`. Tenant isolation en coupon/claim/scanner/shortCode. **Expiry:** `ActivityCouponExpiryService`; cron dev `*/15 * * * *`, prod `10 * * * *`; skip si `ACTIVITY_COUPON_EXPIRY_CRON_ENABLED === "false"`. Archive soft `archivedAt`. Metrics issued/used/unused/validations/useRate. Claim EMAIL `ACTIVITY_COUPON_QR` (si email != null) + IN_APP `ACTIVITY_COUPON_CLAIMED`. Servicios: `ActivityCouponsService`, `ActivityCouponExpiryService`, `ActivityCouponClaimEmailService`, `ScannerActivityCouponService`. Endpoints admin `/admin/excursion-operators/:operatorId/activity-coupons`; public `/public/activity-coupons`; me `/me/activity-coupons`. Migraciones `20260831160000_activity_coupon_domain` + `20260831170000_activity_coupon_claimed_notification` (**no aplicadas localmente** — P1001). Tests PASS: `test:activity-coupon-domain|ownership|claim|qr|metrics|scan` (`scan` = dispatch/unit ≠ DB). Docs: `V3_3_STAGE_7_ACTIVITY_COUPONS_AUDIT.md`, `V3_3_STAGE_7_ACTIVITY_COUPONS_CLOSING.md`. Hardening `a494274`.
- **V3.3 Etapa 8 — Campañas Email / WhatsApp (cerrada 2026-08-31):** **transactional ≠ marketing** — `EmailQueueService` / cola `emails` + `UserNotificationsService` para notificaciones de dominio; campañas usan `AdminCampaign` + `AdminCampaignDelivery` + cola `campaign-emails` (`CampaignEmailQueueService`). **Consent:** `UserMarketingPreference` — `emailOptIn`/`whatsappOptIn` independientes; sin fila → no elegible; usuarios existentes sin opt-in por defecto; sin backfill. **Unsubscribe:** token 64 hex (`emailUnsubscribeToken`); `GET /public/marketing/unsubscribe` → `previewUnsubscribeByToken` (read-only); `POST` → `unsubscribeByToken` (idempotente). **Campañas:** `AdminCampaign` (DRAFT→SENDING atómico→COMPLETED|PARTIAL|FAILED|CANCELLED); `AdminCampaignDelivery` `@@unique([campaignId,userId,channel])`; `userId` `onDelete: SetNull`. Audience: `ALL_ELIGIBLE`|`CITY`|`FAVORITE_CATEGORY`|`CONTENT_CLAIMANTS`; preview estima, send reevalúa. Content types: `GASTRO_DISCOUNT`|`ACTIVITY_COUPON`|`EVENT`|`EXCURSION` (no tipo `ACTIVITY` duplicado). Eligibility server-side; beneficio canónico `formatCouponVisualBenefit`. Worker revalida user ACTIVE, email verified, `emailOptIn`, content elegible, `cancelRequestedAt` → `SKIPPED`/`CANCELLED_BY_ADMIN`; `SENT` no-op. Queue config: `attempts: 3`, backoff exponencial 4s, `limiter max: 4/1000ms`, `concurrency: 2`, `jobId: campaign-delivery:{deliveryId}`. Template `ADMIN_CAMPAIGN` vía `EmailService`/`MailProvider` existente; sin tracking pixel/open/click. **WhatsApp:** `canSendWhatsAppCampaign()` → false; `NOT CONFIGURED — provider pending`. **Digest operativo:** `AdminExpiredBenefitsDigestService` — cron prod `20 8 * * *` TZ `America/Argentina/Buenos_Aires` (`EXPIRED_BENEFITS_DIGEST_TIMEZONE`); dev `*/30 * * * *`; idempotencia `AdminOperationalDigestLog` + digest key calendario AR; flag `ADMIN_EXPIRED_BENEFITS_DIGEST_CRON_ENABLED` (omitida/`true` ON, `"false"` OFF). **Audit:** `CAMPAIGN_SEND_REQUESTED`; `CAMPAIGN_COMPLETED` desde worker **diferido** (requiere actorId). Migraciones `20260831180000_user_marketing_preference`, `20260831190000_admin_campaign_domain`, `20260831200000_admin_operational_digest_log` (**no aplicadas localmente**). Tests PASS: `test:marketing-preferences`, `test:admin-campaign-domain`, `test:admin-campaign-delivery`, `test:admin-expired-benefits-digest`. Docs: `V3_3_STAGE_8_CAMPAIGNS_AUDIT.md`, `V3_3_STAGE_8_CAMPAIGNS_CLOSING.md`. Hardening `39a8a0b`.
- **Nullable email hardening (pre-cierre Etapa 4):** `apps/api/src/common/user-contact.util.ts` — `userDisplayLabel`, `userPrimaryContact`, `requireUserEmail`, `ticketOwnershipOrClauses`, `orderOwnershipOrClauses`, `ticketBuyerDisplayName`; skip email delivery si `email == null`; **nunca** fabricar emails para Scanner. Shared: `MeAccount.email` nullable (`user-portal.ts`).
- **Gastro follows + alertas:** `UserGastroFollow`; al activar descuento (`ACTIVE`) → `GastroFollowDiscountAlertsService` + kind `FOLLOWED_GASTRO_NEW_DISCOUNT` (idempotente, throttling). Doc: `docs/gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md`.
- **Gastro reviews V2:** `GET /gastro/reviews/summary`, `GET /gastro/reviews`, `POST /gastro/reviews/:id/reply` — `ReviewDisputesService` (sin duplicar motor de reviews).
- **Admin gastro locations (Slices 2–5, cerrado 2026-06-02):** `POST /admin/gastronomicos`, `PATCH /admin/gastronomicos/:profileId`, `PATCH /admin/gastronomicos/:profileId/status` — `AdminGastroLocationsService` + `GastroPublicEventSyncService` (`publish: false` / no ACTIVE evita sync en alta; suspender → evento `PAUSED`, `publicEventId` intacto). `GET /admin/gastronomicos/:profileId` — detalle edición. Schemas `packages/shared`. Smoke: `docs/audits/ADMIN_GASTRO_LOCATIONS_AUDIT.md` § Slice 5.
- **Transferencia personal**: `TicketTransferOffer` — sin marketplace `/resale/*` (eliminado `20260605120000_remove_resale_marketplace`).
- **Notificaciones usuario**: `GET/PATCH /me/notifications`, `POST .../mark-all-read` (`UserNotificationsService`, `NotificationsSchedulerService`, email vía `EmailQueueService` → `EmailService` → `MailProvider`).
  - **Emails (Slices 2–10, PROD OK):** `MailProvider` (`MAIL_PROVIDER=smtp` en VPS DonWeb); registry **38** templates. Legacy activo: `renderOrderConfirmationEmail` (checkout), payouts en `email-templates.ts`; gastro QR inline — **bloque pagos/facturación pendiente**. Smokes `smoke:email`, `smoke:email-template` validados local y VPS. Doc: `docs/emails/EMAILS_CLOSING_AUDIT.md` (§0 validación prod).
  - **Entrega unificada** `deliver()`: canales `IN_APP`, `EMAIL`, `PUSH` (log idempotente `NotificationDeliveryLog`).
  - **Kinds:** `TICKET_REMINDER_24H`, `FAVORITE_EVENT_SOON`, `EXPECTED_EVENT_SOON`, `TRANSFER_OFFER_PENDING`, `REVIEW_PENDING`, `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`, **`EVENT_APPROVED_BY_ADMIN`**, **`EVENT_REJECTED_BY_ADMIN`**, **`REVIEW_RECEIVED`**, **`REVIEW_OFFICIAL_REPLY`**, **`REVIEW_DISPUTE_CREATED`**, **`REVIEW_DISPUTE_ACCEPTED`**, **`REVIEW_DISPUTE_REJECTED`**, **`REVIEW_MODERATION_HIDDEN`**, **`REVIEW_MODERATION_RESTORED`**, **`GASTRO_DISCOUNT_PENDING_REVIEW`**, **`GASTRO_DISCOUNT_APPROVED_BY_ADMIN`**, **`GASTRO_DISCOUNT_REJECTED_BY_ADMIN`**, **`GASTRO_DISCOUNT_EXPIRED`**, **`GASTRO_PROFILE_APPROVED_BY_ADMIN`**, **`GASTRO_PROFILE_REJECTED_BY_ADMIN`**, **`ACTIVITY_COUPON_CLAIMED`**.
  - **Productor evento admin:** `ProducerEventStatusNotificationsService` (hook en `approveEvent` / `rejectEvent`); no falla moderación si email/push fallan; preferencia `notifyProducerEventStatus` en `User.preferences`.
  - **Reviews/disputas:** `ReviewNotificationsService` (crear reseña, réplica oficial, disputa, hide/restore); preferencias `notifyManagedReviews`, `notifyReviewEngagement`; email/push best-effort.
  - **Push:** `WebPushService` (`web-push`, VAPID); `GET/POST/DELETE /me/push-subscriptions`, `GET /config`, `POST /test` (`UserPushSubscriptionsService`).
  - **Preferencias push** en `User.preferences` (portal): `pushAlertsEnabled`, `notifyUpcomingEvents`, `notifyTransferOffers`, etc. — ver `user-portal-preferences.util.ts` + `shouldSendPushForKind`.
  - **Alertas inteligentes:** transfer al crear oferta; cron reviews; publicación evento → `SmartAlertsPreparedService` / `EventPublicationAlertsService`; kinds `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`; cron favorito/esperado; gastro `FOLLOWED_GASTRO_NEW_DISCOUNT`; templates email Slice 8 (`smart-alert-email-template.util.ts`); throttling `SMART_ALERTS_MAX_PER_USER_HOUR` (default 5).
  - **Emails operaciones (Slice 9):** `OperationalAlertsEmailService` → `MAIL_OPERATIONS_TO`; `ADMIN_NEW_EVENT_PENDING` al enviar evento a revisión; `ADMIN_STORAGE_UPLOAD_FAILED` en fallo GCS; `ADMIN_EMAIL_DELIVERY_FAILED` en cola (anti-loop `ADMIN_*`).
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
- **EventOccurrence** (V3.1 Etapa 7 — cerrada 2026-06-10): fechas/funciones multi-fecha; `TicketType.occurrenceId` opcional (`null` = legacy single-date). `Order`/`OrderItem`/`Ticket`/`UserCartItem.occurrenceId` (migración `20260617130000_occurrence_checkout`). Helpers: `packages/shared/src/event-occurrences/compat.ts`. Service: `EventOccurrencesService`. Producer CRUD: `GET/POST/PATCH/DELETE /producer/events/:eventId/occurrences`. Checkout: `assertOrderOccurrenceValid()` en `event-occurrence-order.util.ts`. Scanner: `WRONG_OCCURRENCE` si ticket no coincide con fecha escaneada. Smoke: `smoke:v31-event-occurrences`. Doc cierre: `V3_1_STAGE_7_MULTI_DATE_EVENTS_CLOSING.md`.
- **TicketTransferOffer** (V3.1 Etapa 9 — cerrada 2026-06-10): transferencia personal entre usuarios. `TicketTransferEligibilityService`, `TicketTransferOfferService`, cron `TicketTransferSchedulerService`. Endpoints `/me/tickets/:id/transfer-offers`, `/me/ticket-transfer-offers/*`. Emails `TICKET_TRANSFER_*` (incl. EXPIRED). Scanner rechaza `TRANSFER_PENDING`/`TRANSFERRED`. Smoke: `smoke:v31-ticket-transfer-flow`, `smoke:user-portal`. Doc: `docs/audits/V3_1_STAGE_9_TICKET_TRANSFER_CLOSING.md`, `docs/user/TICKET_TRANSFER.md`.
- **TicketDateChangeRequest** (V3.1 Etapa 8 — cerrada 2026-06-10): cambio de fecha usuario en eventos multi-fecha. Modelo + migración `20260618120000_ticket_date_change`. Services: `TicketDateChangeEligibilityService`, `TicketDateChangeService`, `TicketDateChangeNotificationsService`. Endpoints: `GET/POST /me/tickets/:id/date-change-*`, `GET /producer/events/:eventId/date-change-requests`, `POST /producer/date-change-requests/:id/approve|reject`. Auditoría: `TICKET_DATE_CHANGE_*`. Política: `docs/tickets/TICKET_DATE_CHANGE_POLICY.md`. Smoke: `smoke:v31-ticket-date-change`. QR sin regenerar (`yti:v1:`).
- **UserCart**, **UserCartItem**, **UserFavorite**, **UserExpectedEvent**, **UserGastroFollow**, **UserPushSubscription**
- **UserNotification**, **NotificationDeliveryLog** (`NotificationChannel`: `IN_APP`, `EMAIL`, `PUSH`)
- **Referidos V2:** **ReferrerProfile**, **ProducerReferrerRelationship**, **ReferralLink**, **ReferralAttribution**, **ReferralCommercialProposal**, **ReferralCommercialAgreement**, **ReferralCommission** (`CONFIRMED` / `MARKED_AS_PAID`), **ReferralPaymentRequest** — liquidación externa (sin custodia). Emails transaccionales Slice 7: `ReferralEmailsService` → `REFERRAL_*` templates (`enqueueTemplate`). Doc: `docs/referrals/REFERRALS_V2.md`, `docs/emails/EMAIL_MATRIX.md` §6
- **GastroDiscount**, **GastroDiscountValidation**, **InboxItem** (kind incl. `REVIEW_DISPUTE_REQUEST`). **Etapa 5:** `pendingUpdate` JSON, `archivedAt`, `createdByOrigin` (`GASTRO`\|`ADMIN`), `createdByUserId`; FKs creator/submitter `onDelete: SetNull`. **Etapa 6:** **GastroDiscountTemplate** (`gastroDiscountId` `@unique`, 1:0..1; `onDelete: Cascade` al descuento).
- **ActivityCoupon**, **ActivityCouponClaim**, **ActivityCouponValidation** (Etapa 7). Cadena `Event(category=excursion)` → N coupon → N claim → 0..1 validation (`claimId` `@unique`). **Sin** FK a `EventOccurrence`. Claim unique `(couponId, email)`; `shortCode`/`qrToken`/`accessToken` unique. Isolation siempre por `tenantId`.
- **UserMarketingPreference** (Etapa 8): consent EMAIL/WA por canal; `emailUnsubscribeToken` unique 64 hex; sin fila = no elegible campaña.
- **AdminCampaign**, **AdminCampaignDelivery** (Etapa 8): lifecycle DRAFT→SENDING→terminal; delivery `@@unique([campaignId,userId,channel])`; `userId` `onDelete: SetNull`.
- **AdminOperationalDigestLog** (Etapa 8): idempotencia digest operativo admin (vencidos).
- **HotelProfile** (`galleryUrls`, `geoLat`/`geoLng`, `province`, `googlePlaceId`, `whatsappPhone`, `amenities`, `publicEventId`), memberships, **GastroContent**, **ProducerProfile**, **GastroProfile** (`province`, `googlePlaceId`)
- **Event**, **GastroProfile**, **HotelProfile**, **RentalLocation**, **ExcursionOperator**: `address`, coords, `province`, `googlePlaceId` (Maps 5, nullable); `city` en RentalLocation — **prod OK 2026-06-01**
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
| Test activity coupon domain | `pnpm --filter api run test:activity-coupon-domain` |
| Test activity coupon ownership/category | `pnpm --filter api run test:activity-coupon-ownership` |
| Test activity coupon claim | `pnpm --filter api run test:activity-coupon-claim` |
| Test activity coupon QR namespace | `pnpm --filter api run test:activity-coupon-qr` |
| Test activity coupon metrics | `pnpm --filter api run test:activity-coupon-metrics` |
| Test activity coupon scanner dispatch | `pnpm --filter api run test:activity-coupon-scan` (PASS = unit/dispatch; **≠** DB integration) |
| Test visual template schema/canonical | `pnpm --filter api run test:discount-visual-template` |
| Test visual persist contract | `pnpm --filter api run test:gastro-discount-visual-persist` |
| Test visual render bindings | `pnpm --filter api run test:discount-visual-render` |
| Test ticket template regression | `pnpm --filter api run test:ticket-template-schema` |
| Test scanner gastro (API dev) | `pnpm --filter api run test:gastro-discount-scan` (**NO EJECUTADO** — PostgreSQL no disponible) |
| Test pending edit / re-approval | `pnpm --filter api run test:gastro-discount-pending-edit` |
| Test admin moderate edit | `pnpm --filter api run test:gastro-discount-edit-moderation` |
| Test archive / histórico | `pnpm --filter api run test:gastro-discount-archive` |
| Test origin ADMIN/GASTRO | `pnpm --filter api run test:gastro-discount-origin` |
| Test lifecycle notifications | `pnpm --filter api run test:gastro-lifecycle-notifications` |
| Test expiry materialize | `pnpm --filter api run test:gastro-discount-expiry` |
| Test marketing preferences / unsubscribe | `pnpm --filter api run test:marketing-preferences` |
| Test admin campaign domain | `pnpm --filter api run test:admin-campaign-domain` |
| Test admin campaign delivery | `pnpm --filter api run test:admin-campaign-delivery` |
| Test expired benefits digest | `pnpm --filter api run test:admin-expired-benefits-digest` |
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
| Storage upload GCS | `pnpm --filter api run smoke:storage-upload` | ADMIN + GCS env; **PASS prod 2026-05-31** |
| Storage upload auth | `pnpm --filter api run smoke:storage-upload-auth` | USER 403; prod: `SMOKE_NON_ADMIN_*` — **PASS prod 2026-05-31** |
| Storage global smoke | `pnpm --filter api run smoke:storage-global` | Matriz vertical + 403/400; opcional fixtures reales — §22 |
| Maps location smoke | `pnpm --filter api run smoke:maps-location` | Read-only; entidades con address/coords/placeId — audit §23 |

**Tests util (sin BD):** `test:referral-proposals`, `test:referral-commission`, `test:referral-payment-requests`.

**Cleanup smoke:** tras cada smoke (salvo `SMOKE_SKIP_CLEANUP=1`); manual: `pnpm --filter api run smoke:cleanup` / `-- --confirm`. Implementación: `scripts/lib/smoke-cleanup.ts`.

**Destructivo (opcional):** `SMOKE_ALLOW_DESTRUCTIVE=1` en `smoke:user-portal` para test de aceptar transferencia (mueve ticket del usuario principal).

### Variables Web Push (API)

| Variable | Uso |
|----------|-----|
| `WEB_PUSH_VAPID_PUBLIC_KEY` | Clave pública VAPID |
| `WEB_PUSH_VAPID_PRIVATE_KEY` | Clave privada VAPID |
| `WEB_PUSH_CONTACT_EMAIL` | `mailto:` para `web-push.setVapidDetails` |

Opcional cron: `NOTIFICATIONS_CRON_ENABLED=false`, `NOTIFICATION_REMINDER_HOURS`, `NOTIFICATION_REMINDER_TOLERANCE_HOURS`. Expiry descuentos: `GASTRO_DISCOUNT_EXPIRY_CRON_ENABLED` — omitida/`true` = ON; `"false"` = OFF (`apps/api/.env.example`).

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
| GET | `/public/legal/requirements` | Público | Requeridos por `context` + `profileType`. **SIGNUP:** USER → `terms_general` + `privacy_policy`; PRODUCER → + `producer_terms`; GASTRO → + `gastro_terms`; HOTEL → + `hotel_terms`; REFERRER → + `referrer_terms` (flags `isRequiredForSignup`; hotfix `b7be41d`, migración `20260624140000`) |
| GET | `/public/legal/:slug` | Público | Solo PUBLIC + PUBLISHED; INTERNAL/DRAFT → 404 |
| GET | `/me/legal/requirements` | Usuario | Pendientes por contexto |
| POST | `/me/legal/accept` | Usuario | `{ documentVersionIds, context }` — idempotente |
| GET | `/me/legal/acceptances` | Usuario | Historial |
| GET | `/producer/events/:eventId/legal/publication-terms` | Productora | Estado aceptación `producer_terms` por evento |
| POST | `/producer/events/:eventId/legal/accept-publication-terms` | Productora | Registra `EVENT_PUBLICATION` + `eventId` |

**Seguridad:** `RolesGuard` + `Role.ADMIN` en admin; aceptación rechaza INTERNAL y no-PUBLISHED; tenant isolation.

**AuditAction:** `LEGAL_DOCUMENT_CREATED`, `LEGAL_DOCUMENT_UPDATED`, `LEGAL_DOCUMENT_DRAFT_SAVED`, `LEGAL_DOCUMENT_PUBLISHED`, `LEGAL_DOCUMENT_ARCHIVED`.

**Shared:** `packages/shared` — `constants/legal-documents.ts` (seed flags SIGNUP por perfil), `constants/legal-signup.ts`, `schemas/legal-documents.ts`, `schemas/me-legal.ts`.

**Registro + legales:** `LegalSignupService.assertSignupAcceptanceComplete` en `POST /auth/register` antes de crear usuario; persiste `UserLegalAcceptance` con `context=SIGNUP` en la misma transacción.

**Seed:** `pnpm --filter api run seed:legal-documents` (catálogo idempotente) · `pnpm --filter api run seed:legal-content` (Markdown `docs/legal/` → DRAFT; `--dry-run`, `--force`, `--publish` opcional).

**Smokes:** `pnpm --filter api run smoke:legal` | `test:legal-documents` (incl. SIGNUP PRODUCER) | `test:me-legal-acceptance` | `smoke:auth-register-role`.

**Getnet portal callback:** webhook en `POST /public/payments/getnet/webhook` (Basic Auth). Alias Next.js `/api/getnet/callback` — [GETNET_PORTAL_URL_COMPATIBILITY.md](../payments/GETNET_PORTAL_URL_COMPATIBILITY.md).

**Getnet Web Checkout webhook (2026-06):** payload real usa `payment.result.status` (`Authorized`/`Denied`), no `status` en raíz. Lookup `payment_intent_id`, `order_id`, `payment.result.payment_id`. Fix `ed0cc3e`. Prueba VPS: webhook llegó, schema lo rechazó antes del fix. Pendiente deploy + re-prueba fulfill — [GETNET_WEBHOOK.md](../payments/GETNET_WEBHOOK.md).

**Docs:** `docs/legal/LEGAL_ADMIN_MODULE.md`, `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`, `docs/audits/LEGAL_ADMIN_AUDIT.md`. UI: `FRONTEND_CONTEXT.md` §8e.

**Pendiente:** redacción legal; publicar términos comerciales en admin (bloquean registro si DRAFT); bloqueos duros en acciones sensibles; disclaimers hardcoded → documentos publicados.

**Nota SIGNUP vs PORTAL_ACCESS (2026-06-24):** términos verticales comerciales ya no son `PORTAL_ACCESS` — se exigen en SIGNUP. `PortalLegalPendingBanner` queda para otros docs `PORTAL_ACCESS` (p. ej. `terms_general` si aplica, `ticket_transfer_terms` en `/me`).

---

## 9. Debt / risks

- Payments: `DEMO` + `demo-confirm`; Getnet (webhook, reconcile, return UI, `/admin/pagos`) — **Web Checkout Redirect** en `feat/v1-s03-api-foundation`; VPS redirect OK; webhook payload fix `ed0cc3e` (`payment.result.status`); portal webhook configurado; pendiente deploy VPS + ciclo pago/tickets — [GETNET_WEBHOOK.md](../payments/GETNET_WEBHOOK.md), [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](../payments/GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md). `main` sin merge.
- Image uploads: portales + Admin → GCS **cerrado funcional prod 2026-05-31.** Ops legacy no bloqueante: `storage:audit-data-urls`, `storage:migrate-data-urls` (§21), `storage:audit-orphans`, `storage:cleanup-orphans` (§22).
- Public list `EventSummary` includes `fromPrice` (min active ticket/batch price, major units) and `producerName` (`ProducerProfile.displayName`, ACTIVE only) — see `public-event-summary.util.ts`.
- Run `prisma migrate deploy` + `prisma generate` after schema changes — **prod:** `https://api.yoteinvito.club`, migraciones vía `migrate deploy` (no `pnpm db:migrate`). **Build monorepo:** `pnpm build` desde raíz (genera Prisma client, compila `shared` con schemas Maps, luego api/web/scanner); no compilar `api` aislado sin `shared` recién buildado.

### Producción VPS (Mayo 2026)

| Dato | Valor |
|------|--------|
| API pública | `https://api.yoteinvito.club` |
| Health | `GET /health` |
| BD | PostgreSQL local `yo_te_invito` |
| Redis | Local (cola email) |
| Deploy | systemd `yti-api` → `:3001` |
| Auth prod | `DEV_AUTH_ENABLED=false` (sin `X-Dev-User-Id` en prod) |
| Secretos | Rotados Mayo 2026 (root VPS, DB `yti_app`, `JWT_SECRET`, `NEXTAUTH_SECRET`) — no versionar valores |
| `.env` API | `/opt/yoteinvito/apps/api/.env` — owner `deploy:deploy`, permisos `600` |
| Migraciones prod | `npx prisma migrate deploy` — incluye hotfix `20260531072000_restore_user_push_subscription` (`UserPushSubscription`) |

Detalle operativo: [`docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) §25. Auditoría: [`docs/audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md`](../audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md).

**Google Cloud Storage:** bucket privado + público. **Upload API:** `POST /uploads/public-image` — auth ADMIN bypass + portal ownership (`UploadsAuthorizationService`); scope `user` para avatar de cuenta (solo propio `userId`, `purpose=profile`). Doc: [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) §12–18.

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