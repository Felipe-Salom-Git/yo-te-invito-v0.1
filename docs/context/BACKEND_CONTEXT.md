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
| BullMQ + Redis | Jobs (email queue `emails`) |
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
| GET | `/auth/verify-email?token=` | Marca `emailVerified` y elimina token de verificación |
| POST | `/profiles/*/apply` | Usuario logueado sin perfil (p. ej. gastro en `/cuenta/solicitar-gastro`) |

Schemas signup/apply: `packages/shared/src/schemas/profile-onboarding.ts` (`gastroProfileToPersistInput`, `hotelProfileToPersistInput`, …). Catálogo provincias/ciudades (labels en persist): `packages/shared/src/location/argentina-locations.ts`.

See previous full endpoint tables in git history; key groups:

- **Me (legacy)**: tickets, orders, inbox create, commissions; `GET /me/tickets/:id`, `PATCH /me/tickets/:id/reminder`.
- **Me portal V1** (`MePortalController`, `MeCartController`, …): `GET /me/dashboard`; `GET/PATCH /me/preferences` (portal, sin `favoriteEventIds`); `GET/PATCH /me/account`, `POST /me/account/change-password`; `GET /me/activity` (+ `/attended`, `/reviews`, `/transfers`); carrito `GET/POST/PATCH/DELETE /me/cart*`, `GET /me/cart/pending-orders`, `POST /me/cart/checkout`; `GET/POST/DELETE/PATCH /me/favorites*`; `GET/POST/DELETE/PATCH /me/expected-events*`; **gastro follows** `GET /me/gastro-follows`, `GET /me/gastro-follows/status?gastroProfileId=`, `POST /me/gastro-follows`, `DELETE /me/gastro-follows/:id`, `PATCH /me/gastro-follows/:id/notifications` (`MeGastroFollowsController`, `UserGastroFollowsService`); transferencias `POST /me/tickets/:ticketId/transfer-offers` (`recipientEmail`, `message`), `GET /me/ticket-transfer-offers/lookup/:token`, `POST .../reject`, `POST .../cancel`, `POST .../accept`, `GET /me/ticket-transfer-offers`; cron expiración `TicketTransferSchedulerService`; legacy `POST /tickets/:ticketId/transfer` → 410. **`GET /me/tickets/:id`** incluye `ticketTemplate` para render comprador. Schemas: `packages/shared/src/schemas/user-portal.ts`, `ticket-transfer-offer.ts`, `push-notifications.ts`.
- **Producer**: events CRUD, metrics, ticket types, **ticket-template** PUT/GET/DELETE, referrers (associated, freelance, association link); **profile** `GET/POST/PATCH /producer/profile` (GET puede devolver `null`); **slug** generado en servidor desde `displayName` con unicidad global (`producer-profile-slug.util.ts`, sufijos `-2`, …); **reseñas** `GET /producer/reviews` (filtros `replyFilter`, `disputeStatus` incl. `OPEN`, `publicStatus`, `sort` highest/lowest), `GET /producer/reviews/summary` (`unansweredCount`, `openDisputeCount`), `POST /producer/reviews/:id/reply`, `POST /producer/reviews/:id/dispute`, `GET /producer/review-disputes*`; valoraciones comerciales `commercial-reviews` (4 aspectos 1–10).
- **Admin**: event approval/reject (`AdminEventsService` → dispara notificaciones productor), users, applications, inbox resolve, config, payouts, hotel/referrer profile approval; **dashboard operativo** `GET /admin/dashboard` (`AdminDashboardService`: KPIs tenant + cola eventos `PENDING`); **listado eventos** `GET /admin/events` (`AdminEventsService.listForAdmin`, query Zod `adminEventsListQuerySchema`); **usuarios** `GET /admin/users` (`AdminUsersService.list`, `adminUsersListQuerySchema`: `q`, `role`, `emailVerified`, `createdFrom`/`createdTo`, `has*Profile`, `status`, paginación; respuesta `{ data, meta }` con resúmenes de perfiles); `PATCH /admin/users/:userId/role` bloquea `MASTER_USER_EMAIL`; **delete seguro** `GET /admin/users/:userId/delete-preflight` + `DELETE /admin/users/:userId` (`AdminUsersService.getDeletePreflight` / `deleteUser`, util `admin-user-delete.util.ts`: blockers publicaciones/órdenes/tickets/pagos/reviews/scanner; 409 `USER_DELETE_BLOCKED`; audit `ADMIN_USER_DELETED` / `ADMIN_USER_DELETE_BLOCKED`; regla de oro: publicaciones activas bloquean); **subcategorías** `GET/POST/PATCH/DELETE /admin/subcategories` y **`GET /subcategories/public`** (`SubcategoriesService`: CRUD `event|gastro|rental|excursion`; `category=hotel` en admin y público → `{ data: [], comingSoon: true }`; create/update/remove hotel → `403`); **auditoría** `GET /admin/audit-logs` (`AdminAuditService`, `auditLogsListQuerySchema`: `q`, `action`, `entityType`, `actorUserId`, `actorEmail`, fechas, paginación; `summary` + actor email); **disputas reseñas** `GET /admin/review-disputes` (query `status`, `category`, `q`; ítem enriquecido: reseña, autor, evento/categoría, productor, estado/rating review, fechas), `GET :id`, `POST :id/mark-in-review|accept|reject|resolve` (audit); **reseñas admin** `POST /admin/reviews/:id/reply|hide|restore` (audit en hide/restore). **Notificaciones reviews** (`ReviewNotificationsService`): kinds `REVIEW_RECEIVED`, `REVIEW_OFFICIAL_REPLY`, `REVIEW_DISPUTE_*`, `REVIEW_MODERATION_*` vía `UserNotificationsService.deliver` (idempotente; email/push best-effort). **Reporte reputación** `GET /admin/reviews/report`, `GET /admin/reviews/report/export` (`AdminReviewsReportService`; KPIs, promedios por vertical, señales, top disputas; CSV acotado).
- **Gastro**: `GET/POST /gastro/reviews*`, `POST /gastro/reviews/:id/reply` (requiere `ReviewsModule` import en `GastroModule`).
- **Hotel**: `GET /hotel/me`, **`PATCH /hotel/me`** (sync `publicEventId` + evento `category=hotel` si perfil ACTIVE), `POST /profiles/hotel/apply`; **`GET /public/hotel-locations/by-event/:eventId`**, `GET /public/hotel-locations/:id` (solo `ACTIVE`); `GET /hotel/reviews*`, `POST /hotel/reviews/:id/reply`. **Admin archivar (V3.1 Etapa 12):** `GET /admin/hotel-profiles`, `POST .../:id/suspend|activate` (`HOTEL_PROFILE_SUSPENDED`/`ACTIVATED` audit); sync evento `PAUSED`/`APPROVED`. Migraciones: `20260522180000_hotel_profile_editable_fields`, `20260522190000_hotel_public_event`, `20260610140000_stage_12_hotel_audit_related_links` (`relatedLinks` JSON en Event/GastroProfile).
- **Me**: `POST /me/reviews` (crear review V2 autenticado).
- **Scanner**: validate, scan, logs; tickets en transferencia (`TRANSFER_PENDING`, `TRANSFERRED`) → inválidos.
- **Scanner ownership (V3.1 Etapa 5 — cerrada 2026-06-10):** modelo `ScannerAccount` (`apps/api/src/modules/scanner-accounts/`). Portales: `POST/PATCH/reset` en `/producer/scanners`, `/gastro/scanners`. **Hotfix 2026-06-23:** `createScannerForParent` setea `emailVerified: new Date()` al crear `User` con rol `SCANNER` (cuentas operativas desde panel autorizado, sin bloqueo `EMAIL_NOT_VERIFIED`). PWA/API: `GET /scanner/account`, `GET /scanner/scan-targets`, `POST /scanner/scan`, `GET /scanner/events/:id/tickets`, `POST /scanner/gastro-discounts/validate` — scope vía `assertScannerCanAccessEvent` / `assertScannerCanAccessGastroDiscount`. Util: `password.util.ts`. Smokes: `pnpm --filter api run smoke:v31-scanner-accounts`, `smoke:v31-scanner-scope`. Docs: `docs/audits/V3_1_STAGE_5_CLOSING.md`, `V3_1_STAGE_5_SCANNER_ACCOUNTS_SMOKE.md`, `V3_1_STAGE_5_SCANNER_USERS_SMOKE.md`.
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
- **QR descuentos v1:** `buildGastroDiscountQrPayload` en `@yo-te-invito/shared` — `yti:gastro-discount:v1:<discountId>:<token>`; emisión en `POST /public/gastro-discounts/:id/claim` (token por `GastroDiscountClaim`) y al aprobar ticket (`GastroDiscount.qrToken`). Validación puerta: `POST /scanner/gastro-discounts/validate` (`ScannerGastroDiscountService`) — roles SCANNER/ADMIN/GASTRO_OWNER; **hotfix 2026-06-23:** claim-first; parent redeemable `ACTIVE`/`APPROVED`; idempotencia por `claimId`; **V2:** vencimiento inclusivo AR, límite 1 cupón/día. **V2.1 (2026-06-23):** `validityMode` `DATE_RANGE`|`WEEKLY_RECURRING` + `validWeekday`; `isGastroDiscountValidToday`; scanner `NOT_VALID_TODAY`; admin KPI claims `USED`. Doc: `GASTRO_QR_COURTESIES_AUDIT.md`, `ADMIN_GASTRO_SCANNER_HOTFIX_AUDIT.md`. Tests: `test:gastro-discount-expiry`, `test:gastro-discount-qr`, `test:gastro-discount-scan`.
- **Gastro descuentos QR cortesía (2026-06-15 + V2 2026-06-23):** modelo `GastroCourtesyCampaign`, claims extendidos (`type`, `source`, `status`, `expiresAt`, `visibility: COURTESY_ONLY`). Endpoints: `POST /gastro/discounts/courtesy/send`, `GET /gastro/discounts/courtesy/recipients-preview`, `GET /me/gastro-discounts`, `GET /public/gastro-discounts/claims/:id`; claim público `POST /public/gastro-discounts/:id/claim`; emails `GASTRO_DISCOUNT_QR_REQUESTED`, `GASTRO_DISCOUNT_QR_COURTESY` — CTA principal claim `/descuentos/reclamo/:claimId?token=...` (`GastroDiscountClaimEmailService`). **V2.1:** `sendTemplateResult` con error detallado; respuesta cortesía `{ requestedCount, createdCount, sentCount, failedCount, failures[], emailConfigured }`; link fallback en HTML. Migración `20260615120000_gastro_courtesy_discount_claims` + `20260625120000_gastro_discount_weekly_recurrence`. Pendiente: QA manual staging/prod.
- **Bloque Gastro/Hoteles V2 (cerrado 2026-05-22):** gastro operativo (contenido, QR, scanner, dashboard, follows); hotel discovery Próximamente + portal `PATCH /hotel/me` + API pública `GET /public/hotel-locations*`; subcategorías `category=hotel` → `{ data: [], comingSoon: true }` (admin CRUD hotel → `403`). Auditoría: `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`.
- **Portal gastro dashboard:** `GET /gastro/dashboard` (KPIs, alertas, validaciones recientes); `GET /gastro/validations` paginado con filtros `discountId`, `from`, `to` — scope por perfil del dueño (`GastroDashboardService`).
- **Gastro follows + alertas:** `UserGastroFollow`; al activar descuento (`ACTIVE`) → `GastroFollowDiscountAlertsService` + kind `FOLLOWED_GASTRO_NEW_DISCOUNT` (idempotente, throttling). Doc: `docs/gastro/GASTRO_FOLLOWS_NOTIFICATIONS.md`.
- **Gastro reviews V2:** `GET /gastro/reviews/summary`, `GET /gastro/reviews`, `POST /gastro/reviews/:id/reply` — `ReviewDisputesService` (sin duplicar motor de reviews).
- **Admin gastro locations (Slices 2–5, cerrado 2026-06-02):** `POST /admin/gastronomicos`, `PATCH /admin/gastronomicos/:profileId`, `PATCH /admin/gastronomicos/:profileId/status` — `AdminGastroLocationsService` + `GastroPublicEventSyncService` (`publish: false` / no ACTIVE evita sync en alta; suspender → evento `PAUSED`, `publicEventId` intacto). `GET /admin/gastronomicos/:profileId` — detalle edición. Schemas `packages/shared`. Smoke: `docs/audits/ADMIN_GASTRO_LOCATIONS_AUDIT.md` § Slice 5.
- **Transferencia personal**: `TicketTransferOffer` — sin marketplace `/resale/*` (eliminado `20260605120000_remove_resale_marketplace`).
- **Notificaciones usuario**: `GET/PATCH /me/notifications`, `POST .../mark-all-read` (`UserNotificationsService`, `NotificationsSchedulerService`, email vía `EmailQueueService` → `EmailService` → `MailProvider`).
  - **Emails (Slices 2–10, PROD OK):** `MailProvider` (`MAIL_PROVIDER=smtp` en VPS DonWeb); registry **38** templates. Legacy activo: `renderOrderConfirmationEmail` (checkout), payouts en `email-templates.ts`; gastro QR inline — **bloque pagos/facturación pendiente**. Smokes `smoke:email`, `smoke:email-template` validados local y VPS. Doc: `docs/emails/EMAILS_CLOSING_AUDIT.md` (§0 validación prod).
  - **Entrega unificada** `deliver()`: canales `IN_APP`, `EMAIL`, `PUSH` (log idempotente `NotificationDeliveryLog`).
  - **Kinds:** `TICKET_REMINDER_24H`, `FAVORITE_EVENT_SOON`, `EXPECTED_EVENT_SOON`, `TRANSFER_OFFER_PENDING`, `REVIEW_PENDING`, `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`, **`EVENT_APPROVED_BY_ADMIN`**, **`EVENT_REJECTED_BY_ADMIN`**, **`REVIEW_RECEIVED`**, **`REVIEW_OFFICIAL_REPLY`**, **`REVIEW_DISPUTE_CREATED`**, **`REVIEW_DISPUTE_ACCEPTED`**, **`REVIEW_DISPUTE_REJECTED`**, **`REVIEW_MODERATION_HIDDEN`**, **`REVIEW_MODERATION_RESTORED`**.
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
- **GastroDiscount**, **GastroDiscountValidation**, **InboxItem** (kind incl. `REVIEW_DISPUTE_REQUEST`)
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

**Google Cloud Storage:** bucket privado + público. **Upload API:** `POST /uploads/public-image` — auth ADMIN bypass + portal ownership (`UploadsAuthorizationService`). Doc: [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) §12–18.

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