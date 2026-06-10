# FRONTEND CONTEXT — Yo Te Invito

Implementation-oriented technical context for AI-assisted development. Describes the **current implemented state** of `apps/web`.

---

## 1. Project Overview

- **What**: Web frontend for **Yo Te Invito** — discovery and ticketing for events, restaurants, excursions, and equipment rentals.
- **Current purpose**: Public discovery, checkout, ticket viewing; producer/admin/referrer/gastro/hotel portals; auth and role-based access.
- **Data mode**: **ApiRepository** only — NestJS API as single source. No LocalStorage/LocalDB in production UI.
- **Future**: Preference-driven homepage ordering; real payments; ticket render from `TicketTemplate`.

---

## 2. Stack

| Technology | Use |
|------------|-----|
| Next.js 15 | App Router |
| React 18 | UI |
| TypeScript | Strict typing |
| TailwindCSS | Styles |
| TanStack Query | Cache and data fetching |
| Zod | Validation (`packages/shared`) |
| NextAuth | Auth |
| Framer Motion | Animations (home, splash, preview modal) |

---

## 3. Branding and Design

- **Background**: Black (`#0a0a0a`, muted `#171717`)
- **Accent**: Green (`#22c55e`, hover `#16a34a`)
- **Text**: White + muted
- **Logo**: `components/brand/Logo.tsx` (variants: icon, with-text, navbar, auth, splash)
- **Direction**: Dark premium platform; Netflix-inspired rails on home
- **Responsive**: ~16px / 24px / 32px padding (mobile / tablet / desktop)

---

## 4. Architecture

```
UI Components
      ↓
Query Hooks (TanStack Query)
      ↓
Repository Interfaces (repositories/interfaces.ts)
      ↓
ApiRepository (repositories/ApiRepository.ts)
      ↓
ApiClient → HTTP (NEXT_PUBLIC_API_BASE_URL)
```

- No direct `fetch` or `localStorage` in UI components.
- Query keys in `lib/query/keys.ts`.

---

## 5. Repository Layer

| Repository | Status | Notes |
|------------|--------|-------|
| EventsRepo | ✓ | list, search, trending, detail, ticket types, public discounts; list summaries include `fromPrice`, `producerName` |
| **RentalLocationsRepo** | ✓ | Admin CRUD locales + productos (`/admin/rental-locations`) |
| SubcategoriesRepo | ✓ | `listPublic`, admin CRUD |
| OrdersRepo, TicketsRepo, ReviewsRepo | ✓ | V2: `listPublicV2`, `getPublicSummary`, `createMyReview`, replies |
| ReferralsRepo, CourtesiesRepo, PayoutsRepo | ✓ | |
| TicketTemplatesRepo | ✓ | Canvas studio per ticket type |
| InboxRepo, GastroRepo, HotelRepo | ✓ | |
| **ProducersRepo** | ✓ | público + `getMyProfile` / `createMyProfile` / `updateMyProfile*` + reviews agregadas |
| **producerReviews** / **adminReviewDisputes** | ✓ | comentarios productora + cola admin disputas |
| **commercialReviews** | ✓ | valoraciones privadas productora↔referidor |
| **MePortalRepo** | ✓ | dashboard, cart, favorites, expected-events, activity, account, transfer offers, notifications, **push subscriptions** |
| **adminDashboard** | ✓ | `GET /admin/dashboard` — KPIs + cola eventos pendientes |
| **adminEvents** | ✓ | `GET /admin/events` — listado operativo con filtros |
| **adminAudit** | ✓ | `GET /admin/audit-logs` — auditoría con filtros |
| **adminUsers** | ✓ | `GET /admin/users`, `PATCH /admin/users/:id/role` — listado operativo con filtros |
| **adminPayments** | ✓ | `GET /admin/payments`, reconcile, mark-reviewed — ops Getnet |
| **LegalDocumentsRepo** | ✓ | Admin CRUD + publish; público `/public/legal/*`; aceptación `/me/legal/*` |
| ProfilesRepo, ApplicationsRepo, PlatformConfigRepo | ✓ | Admin `GET/PATCH /admin/config` |
| **PublicPlatformConfigRepo** | ✓ | `GET /public/platform-config` — contacto footer (sin auth) |

**Category routing**: `gastro` → `/restaurants`, `excursion` → `/excursiones`, `rental` → `/rentals`, `hotel` → `/hoteles`, default → `/events`.

**Auth:** solo NextAuth + API NestJS. Eliminados `app/api/auth/*`, `app/api/admin/*`, `demo-users`, `dynamic-users`, `validate.ts` local.

---

## 6. Routes / Screens (summary)

| Area | Routes |
|------|--------|
| Public | `/`, `/home`, **`/explore`** (filtros URL: `q`, `category`, `subcategoryId`, `city`, `from`, `to`, `page`; `?category=hotel` → banner Próximamente), `/events/[id]`, **`/restaurants/[id]`** (ficha gastro `GastroPublicDetailContent`, no ticketera), `/gastronomicos/[id]`, `/excursiones/[id]`, **`/rentals/[id]`**, **`/hoteles`** + **`/hoteles/[id]`** (vertical Próximamente; ver abajo), **`/users/[userId]`** (perfil comentarista), **`/legal/[slug]`** (documentos publicados, ISR), checkout, `/me/tickets`, `/referrers`, `/r/[code]` |
| Account | `/login`, **`/register`** (wizard `RegisterWizard`: cuenta → perfil → paso por tipo → legales SIGNUP → `POST /auth/register` + `signIn`), **`/cuenta/solicitar-gastro`** (mismos campos mínimos + opcionales), **`/me/*`** (portal usuario estándar) |
| Cuenta (legacy) | `/cuenta/*` → **redirects** a `/me/*` (no mantener lógica duplicada) |
| Admin | `/admin/*` (**solo rol `ADMIN`**, `ProfileProtectedLayout` en `admin/layout.tsx`), sidebar operaciones; **`/admin`** dashboard; **`/admin/eventos`** listado filtrado; **`/admin/pagos`** pagos Getnet + revisión manual; **`/admin/legales`** documentos legales versionados; **`/admin/reviews`** reporte reputación (KPIs, CSV); **`/admin/review-disputes`** cola disputas; **`/admin/usuarios`** listado usuarios con filtros URL; **`/admin/categorias`** subcategorías + banners (`/admin/subcategorias` redirige); **`/admin/auditoria`** logs operativos; post-login y `/profiles` → redirect por rol (`rolePortalHome.ts`); usuario maestro: sidebar multi-portal |
| Producer | `/producer` (hub: KPIs, engagement, **`ProducerDashboardEventStatusAlerts`**, eventos; nav en sidebar), `/producer/events`, ticket studio, **`/producer/profile`** (hub por bloques + completitud frontend), **`/producer/profile/create`** (solo nombre; slug en servidor), **`/producer/profile/identity|images|contact`**, **`/producer/comments`** (`ManagedReviewsCommentsPage`), referidos, payouts |
| Gastro / Hotel / Referrer | `/gastro/*`, **`/gastro/contenido`** (editorial Prisma), **`/gastro/valoraciones`**, `/hotel`, **`/hotel/valoraciones`**, `/referrer`, `/cuenta/solicitar-referrer` |

### Rental public detail (`/rentals/[id]`)

Uses **`RentalProductDetailContent`** (not `PlaceDetailView`). Shared UI tokens: `lib/rentals/rentalDetailUi.ts`, copy/CTA: `lib/rentals/publicCopy.ts`, WhatsApp: `lib/rentals/whatsapp.ts`, galería: `lib/rentals/productGallery.ts`.

- **`RentalProductHero`**: cover as full-width background; title + summary + chips (Alquiler / subcategoría / local). Shorter hero on mobile; no date/time chips; engagement row **not** overlaid on hero.
- **Layout**: desktop — main column (descripción, galería) + sticky sidebar (contacto, local). Mobile — aside first (Disponibilidad + Local), then descripción/galería; `EventEngagementRow` below breadcrumbs (mobile) or above descripción (`sm+`).
- **CTA**: `RentalContactCard` + fixed **`RentalMobileStickyCta`** (`lg:hidden`) when `whatsappPhone` resolves — button **«Consultar disponibilidad»**, full-width, `min-h-[48px]`; page `pb-24` on mobile when sticky is shown. Sin fallback demo si no hay número.
- **Galería**: only **additional** images (`buildRentalGalleryOnlyImages`); `RentalGalleryThumbnails` + modal. Cover **not** duplicated.
- **`RentalLocalCard`**: address, **horario de atención** solo si hay datos (`hasRentalOpeningHoursContent`), “Ver ubicación” (full-width button on mobile). No event-style schedule section elsewhere.
- **`RentalDescriptionBlock`**: «Detalle del producto»; hidden if empty (no «Lo que incluye» block on rentals).
- Reviews V2 + related products; favorites / **«Me interesa»** (expected-events) via `EventEngagementRow` — copy en `lib/engagement/expected-event-copy.ts`.

### Rental admin

| Route | Purpose |
|-------|---------|
| `/admin/rentals` | List locales |
| `/admin/rentals/locales/nuevo` | Create local |
| `/admin/rentals/locales/[locationId]` | Local detail + products list |
| `/admin/rentals/locales/[locationId]/editar` | Edit local (structured opening hours) |
| `/admin/rentals/locales/[locationId]/productos/nuevo` | New product |
| `/admin/rentals/locales/[locationId]/productos/[productId]/editar` | Edit product + images |

**Forms**: `OpeningHoursEditor`, `RentalProductImagesForm` con `uploadConfig: GcsImageUploadConfig`. **GCS activo:** Admin Rentals, Admin Eventos/Excursiones, **Portal Productora**, **Portales Gastro + Hotel** — [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) §17–20.

### Gastro admin (Slices 3–5, cerrado 2026-06-02)

| Route | Purpose |
|-------|---------|
| `/admin/gastronomicos` | List locales — tabla desktop + cards mobile, filtros URL, activar/suspender |
| `/admin/gastronomicos/nuevo` | Alta local — `AdminGastroLocationFormClient` + `POST /admin/gastronomicos` |
| `/admin/gastronomicos/[profileId]` | Detalle + descuentos + editar + CTA ficha pública (si ACTIVE) |
| `/admin/gastronomicos/[profileId]/editar` | Edición — `GastroLocalForm` mode `admin` + `PATCH` + GCS |
| `/admin/gastronomicos/[profileId]/descuentos/[discountId]` | Moderación ticket descuento |

**Ficha pública canónica (admin CTA):** `/gastronomicos/[profileId]`. Alias discovery en cards: `/restaurants/[publicEventId]` (`contentRoutes.ts`).

**Hooks:** `lib/query/admin-gastro.ts` — list, detail, create, update, status mutations. **UI:** `AdminGastroLocations*` (listado), `AdminGastroLocationFormClient` (form). **`GastroLocalForm`:** `mode="owner"` (portal) | `mode="admin"` (campos extra + labels). Doc + smoke: `docs/audits/ADMIN_GASTRO_LOCATIONS_AUDIT.md` § Slice 5.

### Portal usuario (`/me/*`)

| Ruta | Uso |
|------|-----|
| `/me` | Dashboard (alertas, recomendados, **MeDashboardPushCta**) |
| `/me/cart` | **Mi Carro** — carrito API + checkout; aceptación legal `CHECKOUT` antes de confirmar |
| `/me/tickets`, `/me/tickets/[ticketId]` | Listado agrupado + **detalle ticket comprador** (`MeBuyerTicketPanel`, impresión, transferencia) |
| `/me/preferences` | Tabs: intereses, productoras, **gastro follows** (`MePreferencesGastro`), favoritos, esperados, notificaciones globales |
| `/me/activity` | Asistidos, reviews, transfers |
| `/me/account` | Perfil, contraseña, solicitudes de rol |
| `/me/notifications` | Bandeja in-app + **push** (`MePushNotificationsPanel`) + preferencias alertas (`MePushAlertPreferences` en `InterestsDisclosure`) |
| `/me/orders` | Historial órdenes (fuera del menú principal; ruta viva) |
| `/me/following` | Redirect → `/me/preferences?tab=producers` |

- Hooks: `lib/query/me-portal.ts` (incl. `usePushSubscriptions*`, `useRegisterPushSubscription`, `useSendTestPushNotification`); keys `mePortalKeys` en `lib/query/keys.ts`.
- Push cliente: `lib/push/registerPush.ts`; service worker `public/push-sw.js` (registro `/push-sw.js`).
- Layout: `app/(portal)/me/layout.tsx` + **`PortalLayoutShell`** (`portalKey="me"`); sidebar/mobile nav vía `portalNavConfig` (Slice 7). Usuario maestro (`MASTER_USER_EMAIL`): sidebar acordeón con **todas** las verticales (`MasterPortalSidebar` / `MasterMobilePortalNav`).
- Componentes portal: `MeDashboardAlerts`, `MeRecommendationsSection`, `MePreferencesInterests` + **`InterestsDisclosure`** (acordeones reutilizables); órdenes: `MeOrderDetailSummary`, `MeOrderTicketsList`.
- **Ticket comprador (V2.2):** `components/tickets/` (`BuyerTicketVisual`, `TicketTemplateRenderer`, `DefaultBuyerTicket`, `TicketQrImage`, `TicketEntryStatusBanner`); utilidades `lib/tickets/` (`qr-display.ts`, `qr-image-url.ts`, `ticket-status-ui.ts`); estilos impresión en `styles/globals.css` (`@media print`).
- Ficha gastro pública: `components/gastro/GastroPublicDetailContent` + hooks `lib/query/gastro-public-detail.ts`; **`GastroFollowButton`** → `/me/gastro-follows` (sin favoritos/esperados de evento en ficha restaurante).
- Portal gastro: dashboard + validaciones (Slice 6). **Imágenes GCS:** `GastroLocalForm`, `GastroDiscountForm`, `/gastro/contenido`. Valoraciones: `ManagedReviewsCommentsPage` scope `gastro` + `ManagedPortalReviewAlerts`. Follows: `GastroFollowButton`, `MePreferencesGastro` (toggles web/email por local). Notificaciones descuento: kind `FOLLOWED_GASTRO_NEW_DISCOUNT` en bandeja `/me/notifications`.
- Engagement eventos: `EventEngagementRow` en fichas de **eventos** (favoritos / expected-events).
- Checkout autenticado: redirige a `/me/cart` (aceptación `CHECKOUT` vía `POST /me/legal/accept`); invitado `/checkout` y `/checkout/[eventId]` — checkbox obligatorio (declaración; persistencia al tener cuenta). Post-Getnet: **`/checkout/return`** (estado + polling). Getnet **Web Checkout Redirect**: `checkoutUrl` / `redirectUrl` desde API (`feat/v1-s03-api-foundation`).
- **Alias portal Getnet:** `/checkout/success` → return (salvo `orderIds` demo carrito); `/checkout/error` → return `cancelled=1`; `POST /api/getnet/callback` → proxy webhook API — [GETNET_PORTAL_URL_COMPATIBILITY.md](../payments/GETNET_PORTAL_URL_COMPATIBILITY.md).
- **VPS redirect smoke:** checkout app → Getnet hosted checkout OK en producción; pago real no ejecutado; webhook portal pendiente — [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](../payments/GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md).
- **Hoteles (discovery Próximamente, portal + ficha pública Slice 10–11):** `/hoteles` (Próximamente), **`/hoteles/[id]`** — `HotelLocationDetailView` + `GET /public/hotel-locations/by-event/:eventId` (fallback evento hotel); contacto real (WhatsApp/tel/email); sin reservas/checkout. Portal: `/hotel`, `/hotel/editar` (**`HotelProfileForm` con GCS**). Valoraciones `/hotel/valoraciones`. `/categoria/hotel` → 404.

**Eliminado:** `/reventa`, `/dev/seed`, `/dev/local-db`, `lib/local-db/*`.

### Other place details

`PlaceDetailView` remains for **restaurant** and **excursion** (event-style hero, schedule, purchase card). **Hotel** ya no usa `PlaceDetailView`. Do not change those when editing rental-only code.

---

## 7. Key Components

| Component | Location |
|-----------|----------|
| HomeHero, ContentRail, ContentCard | `components/home/` |
| ContentPreviewModal | `components/home/` |
| EventHeroPremium, EventScheduleSection | `components/events/` (events/gastro/excursion/hotel) |
| **RentalProductDetailContent**, **RentalProductHero**, **RentalGalleryThumbnails**, **RentalLocalCard**, **RentalContactCard**, **RentalMobileStickyCta**, **RentalDescriptionBlock** | `components/rentals/` |
| PlaceDetailView | `components/places/` (non-rental) |
| TicketStudioClient | `components/producer/ticket-studio/` |
| OpeningHoursEditor, RentalProductImagesForm | `components/forms/`, `components/rentals/` |
| **ImageUploadHint**, `imageUploadHints.ts` | `components/upload/`, `lib/upload/` — medidas/formato/peso en formularios GCS (V3.1 Slice 1) |
| **FieldCharacterCounter**, `RentalSummaryField` | `components/forms/`, `components/rentals/` — contador resumen 220 y campos con límite (V3.1 Slice 1) |
| **PublicDescriptionBlock** | `components/public/` — preview + «Leer descripción completa» modal (V3.1 Slice 2); `sectionTitle` = copy, `null` oculta h2 (hotfix className) |
| **RentalDescriptionBlock** | wrapper rentals/gastro/excursiones; usa `RENTAL_DETAIL_DESCRIPTION_LABEL` / `RENTAL_DETAIL_SECTION_HEADING_CLASS` en `rentalDetailUi.ts` |
| **getContentCardPrimaryBadge** | `lib/home/contentCardPresentation.ts` — badges útiles en cards (subcategoría > genérico; V3.1 Slice 2) |
| **HomeCategoryStrip** | `components/home/` — grid categorías en home; oculto en mobile (`md+` only; Slice 3) |
| **ExcursionDetailInfoGrid** | `components/excursions/` — cards info clave en detalle excursión (Slice 3) |
| **RentalProductImagesForm** | galería con Subir/Bajar; orden → API `sortOrder` (Slice 5) |
| **PUBLIC_SUMMARY_MAX_LENGTH** | import desde `@yo-te-invito/shared` — 500 chars resumen (Slice 4) |
| **ExternalLinksFormFields** | `components/forms/` — carga URLs/redes validadas (Slice 6) |
| **PublicExternalLinksCard** | `components/public/` — bloque «Reservas y redes» en fichas gastro/excursión (Slice 6) |
| **ExcursionScheduleFormFields** | `components/excursions/` — horario/duración/días/punto de encuentro en admin excursión (Slice 7) |
| **ExcursionSchedulePublicSections** | `components/excursions/` — secciones públicas horario/encuentro/ubicación/observaciones (Slice 7) |

**Slice 7.5 smoke (estabilización):** revisión estática rutas §7.5 en `docs/audits/V3_1_SLICE_7_5_STABILIZATION_SMOKE.md` — `PublicExternalLinksCard` oculta vacíos; WhatsApp excursión solo en `ExcursionContactCard`.

**Slice 8.5 smoke (subcategorías):** checklist manual UI en `docs/audits/V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md` — multi-select solo excursiones; detalle `/excursiones/[id]`; filtros categoría/explore por secundaria.

**Slice 9 admin archivar:** `AdminEventLifecycleActions`, `AdminRentalLocationLifecycleActions`, `AdminExcursionOperatorLifecycleActions`, `AdminArchiveConfirmModal` — `/admin/eventos`, rentals locales, operadores excursión; gastro suspend/activate en `AdminGastroLocationsPageClient`.

| **ExcursionSubcategoryMultiSelect** | `components/excursions/` — multi-select chips excursiones; principal = primera (Slice 8) |
| Reviews V2 (público + portales) | `components/reviews/` — filtros públicos `PublicReviewsFiltersBar` + hooks `usePublicEntityReviewsState` / `useUserPublicReviewsState`; `EventReviewsSection`; perfil `/users/[userId]`; portales `ManagedReviewsCommentsPage` (URL query en productor/gastro/hotel, chips + orden/respuesta/disputa/estado); `ReviewReplyModal` |
| Comentarios productora | `components/producer/comments/` (`ProducerCommentsPage` → `ManagedReviewsCommentsPage`, filtros rápidos, resumen API) |
| Perfil productor (portal) | `components/producer/profile/` (`ProducerProfilePage`, `ProducerIdentityForm` + `ProducerImagesForm` con GCS, `ManagedReviewSummary`, `ProducerProfilePublicPreview`, `producer-profile-completeness.ts`) |
| Dashboard productor | `components/producer/dashboard/` (`ProducerDashboardClient`, KPIs, engagement, alertas estado evento; **sin** `ProducerDashboardQuickLinks`) |
| Valoración B2B | `CommercialReviewPanel`, `CommercialAspectBreakdown` |
| **Navbar V2** | `components/Navbar.tsx` — logo → `/categorias`, casita → `/home`, Explorar (`md+`), ciudad (`NavbarCitySelector` / drawer mobile), carro (`NavbarCartButton` + `useNavbarCart`), menú usuario (`NavbarUserMenu`) o drawer `NavbarMobileNav` + `MobilePublicNavDrawer`. Config: `lib/navigation/publicNavConfig.ts`, `userNavConfig.ts`. **Footer:** variantes por ruta (`footerVisibility.ts`, `RouteAwareFooter`); legales `footerLegalLinks.ts`; contacto `usePublicPlatformConfig` → `GET /public/platform-config` (no `/admin/config`). A11y: `useOverlayA11y`, `navA11yClasses`. Docs: `docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`, `PUBLIC_FOOTER_AUDIT.md` |
| Portales nav | `PortalLayoutShell`, `PortalSidebar` (desktop), `MobilePortalNav` (mobile por portal); config `lib/navigation/portalNavConfig.ts` |
| Portales layout (Legales V2) | `PORTAL_BODY_CLASS` en `app/(portal)/*/layout.tsx` (`max-w-screen-2xl`, padding responsive); `PortalPageProvider` + `PageContainer` sin segundo `max-w-6xl` dentro de portales |
| Usuario maestro nav | `lib/navigation/masterUser.ts` — inicio portal → `/me`; menú acordeón multi-vertical en todos los portales |
| Dashboard admin | `components/admin/dashboard/` — `AdminDashboardClient`, KPIs, cola, accesos; hook `lib/query/admin-dashboard.ts` |
| Eventos admin | `components/admin/events/` — `AdminEventsPageClient`, filtros URL, tabla + cards mobile |
| Auditoría admin | `components/admin/audit/` — `AdminAuditPageClient`, `AdminAuditFilters`, tabla + cards, `AdminAuditMetadataPreview`; hook `lib/query/admin-audit.ts` |
| Disputas admin | `components/admin/review-disputes/` — `AdminReviewDisputesPageClient`, filtros URL (`useAdminReviewDisputeUrlFilters`), tabla desktop + cards mobile, panel detalle con confirmaciones (aceptar/rechazar/marcar en revisión/ocultar/restaurar/réplica), enlace a `/admin/auditoria`; `adminReviewDisputesKeys` + `AdminReviewDisputesRepo` |
| Alertas valoraciones | `ManagedPortalReviewAlerts` en dashboard productor y portal gastro; labels en `/me/notifications`; preferencias `notifyManagedReviews` / `notifyReviewEngagement` en `MePushAlertPreferences` |
| Reputación admin | `/admin/reviews` — `AdminReviewsReportPageClient`, KPIs, tabla por vertical, señales problemáticas, top disputas, export CSV; hook `useAdminReviewsReport` |
| Usuarios admin | `components/admin/users/` — `AdminUsersPageClient`, filtros URL, tabla + cards mobile, badges rol/perfiles; cambio de rol con confirmación; cuenta maestro sin selector; hook `lib/query/admin-users.ts` |
| Subcategorías admin | `components/admin/subcategories/` — `AdminSubcategoriesPageClient`, tabs por vertical, CRUD vía `SubcategoriesRepo`, hotel `AdminHotelComingSoonPanel`; banners editoriales `AdminCategoryEditorialBannerPanel` + eventos `AdminCategoryBannerPanel`; hooks `useAdminSubcategories`, `useCategoryHeroBanner` |
| Productora eventos | `ProducerEventCreateForm` / `ProducerEventEditForm` — wizard 3 pasos (`ProducerEventWizardProgress`, `wizardStep`); `ProducerEventPublicationLegalNotice` paso 3; ticket types post-create en `/producer/events/[id]` |
| Ratings públicos 5/5 | `lib/reviews/ratingDisplay.ts` — `formatPublicRatingLabel`; sin cambio DB/API (Slice 13) |
| ContentCard editorial | `components/home/ContentCard.tsx` — fase 1 afiche (fecha badge, badges sutiles, poster title; Slice 13) |
| **QA pre-deploy V3.1** | Slice 14 — builds OK; QA manual browser pendiente (`V3_1_PRE_DEPLOY_QA_CLOSING.md` §6) |
| **Admin gastro → discovery** | Cards gastro → `/restaurants/[publicEventId]` (`getContentDetailHref`); admin canónico `/gastronomicos/[profileId]`; sin redirect Next `/restaurants`→`/gastronomicos` (`V3_1_HOTFIX_GASTRO_PUBLIC_LINKS.md`) |
| **Legales admin** | `components/admin/legal/` — `/admin/legales` (tabla desktop `md+` con `overflow-x-auto` + `min-w-[900px]`; cards `md:hidden`), detalle, versiones; `LegalDocumentsRepo` + `lib/query/admin-legal-documents.ts` |
| **Legales público** | `components/legal/` — `/legal/[slug]` (server fetch, ISR); preview Markdown |
| **Registro V2** | `components/auth/RegisterWizard.tsx`, `components/auth/register/*` (pasos comprador/productora/gastro/hotel/referido), `lib/auth/register-error-messages.ts`, `lib/auth/register-validation.ts`, `lib/onboarding/*-portal-onboarding.ts`, `OnboardingChecklistCard`; ubicación: `ProvinceCitySelect`, `GastroProvinceCityFields`, catálogo `@yo-te-invito/shared` → `ARGENTINA_PROVINCES` |
| **Aceptación legal (reutilizable)** | `LegalAcceptanceCheckboxList`, `LegalRequirementNotice`, `LegalDocumentsLinksList`, `LegalFlowAcceptanceBlock`, `PortalLegalPendingBanner`; hooks `lib/query/me-legal.ts`, `lib/query/public-legal-requirements.ts`; integración en `RegisterWizard`, `/me/cart`, checkout público, `PortalLayoutShell` |
| **Footer público** | `components/footer/*` + `RouteAwareFooter` — variantes full/minimal/hidden; legales `footerLegalLinks.ts`; config `footerPublicConfig.ts`; contacto `usePublicPlatformConfig`; smoke `docs/audits/PUBLIC_FOOTER_SMOKE.md` |
| **Portal legales** | `PortalLegalPendingBanner` en portales comerciales (`PORTAL_ACCESS`); `lib/navigation/portalLegalProfile.ts` |
| **Markdown legal** | `LegalMarkdownPreview` — subset seguro, sin `dangerouslySetInnerHTML`; SSR público vía `fetchPublicLegalDocument` |
| **QA / ops** | Smoke manual `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`; módulo `docs/legal/LEGAL_ADMIN_MODULE.md` |
| Portal usuario push | `components/me/MePushNotificationsPanel`, `MePushAlertPreferences`, `MeDashboardPushCta`, `InterestsDisclosure` |
| Ticket comprador | `components/tickets/*`, `components/me/MeBuyerTicketPanel`, `MeTicketListCard` |

**QR comprador:** payload `yti:v1:<hex>` sin transformar; imagen vía API externa con tamaño mínimo 200px (`MIN_QR_DISPLAY_PX`). No alterar sin auditar scanner PWA.

---

## 7a. Category landing (`/categoria/[category]`)

- **Rutas:** `event` | `gastro` | `rental` | `excursion` — `CategoryLandingPage` / `EventDiscoveryContent` (eventos + vista fecha/calendario).
- **Estructura:** `CategoryHeroBanner` → `CategoryLandingEditorial` → `SubcategoryRail` (`SubcategoriesRepo.listPublic`, sin `hotel`) → carruseles propios (`useCategoryCarousels`) → `CrossCategoryRails` (otras 3 categorías, `getCrossCategoryRails`).
- **Carruseles eventos:** Destacados, Próximos, Nuevos. **Otras categorías:** Destacados, Mejor puntuados (si aplica), Recientes/Nuevos.
- **Ver más:** carruseles propios → `/explore?category=…` (+ `subcategoryId` si filtra); cruzados → `/categoria/{otra}`.
- **Query:** `?subcategory=` o `?subcategoryId=` (slug o id). Cards: `ContentCard` con `fromPrice` / `producerName` / `subcategoryName`.

## 7e. Navbar y navegación responsive (V2 — 2026-05)

- **Público desktop:** `[Logo /categorias] [🏠 /home] [Explorar] [Ciudad]` + tema + notificaciones (`lg+`) + carro + menú cuenta.
- **Público mobile:** `[Logo] [Carro] [☰]` — links y cuenta en `MobilePublicNavDrawer`; ciudad en drawer.
- **Menú cuenta:** Inicio según rol (`rolePortalHome.ts` — ej. `/me`, `/admin`, `/producer`); maestro → `/me` + sidebar multi-portal; ADMIN no maestro: solo Panel admin; comprador: tickets + cuenta.
- **Portales:** sidebar vertical `md+`; mobile `MobilePortalNav` por ruta; sin scroll horizontal en navbar (`overflow-x-clip`, `scroll-padding-top` global).
- **Dropdown usuario:** panel en portal (`fixed`, `z-[60]`) — no expande altura del navbar.
- **Usuario maestro** (`packages/shared` `MASTER_USER_EMAIL`): `MasterPortalNavSections` — acordeones Usuario / Productora / Administración / Gastronómico / Hotel / Referido.

## 7b. Category gateway (post-splash)

- **Rutas:** `/` (splash + gateway si `shouldShowIntro()` en `introStorage.ts`, 24h) y `/categorias` (reentrada desde logo navbar).
- **UI:** `CategoryGatewayScreen` — hero poster, grilla 2×2 (`CATEGORY_GATEWAY_OPTIONS`), footer a `/home` y `/explore`.
- **Navegación categoría:** `getCategoryGatewayHref` → `/categoria/{event|gastro|rental|excursion}` (sin hotel en grilla).
- **Config:** `lib/home/categoryGatewayConfig.ts` — copy, imágenes Unsplash, `CATEGORY_GATEWAY_PATH`.

## 7c. Ticket Canvas vs ticket comprador

| Área | Ruta / código | Rol |
|------|----------------|-----|
| **Studio productor** | `/producer/events/.../ticket-studio`, `TicketStudioClient` | Diseño plantilla (`TicketTemplate` JSON + zona QR) |
| **Vista comprador** | `/me/tickets/[ticketId]` | Render plantilla o fallback; imprimir; estado de ingreso |

Doc: `docs/tickets/TICKET_CANVAS_STUDIO.md`, `docs/tickets/TICKET_TEMPLATE_QR_ZONE.md`.

---

## 8. Home / Landing

- `HomeLanding` + `useHomeCarousels`: editorial rails (recomendados, trending, nuevos, cerca de ti) + **4 carruseles por categoría** (`event`, `gastro`, `rental`, `excursion`) con **Ver más** → `/categoria/[category]`.
- `lib/home/homeDiscoveryConfig.ts` — tabs hero y definición de rails (sin hotel en discovery principal).
- Path A (anonymous): tabs hero 4 categorías + `HomeCategoryStrip`; hoteles en bloque **Próximamente** (`HomeHotelsComingSoon`).
- Path B (logged-in + preferences): “Para vos”, favoritos, rails reordenados por `preferredCategories` (sin hotel).
- Cards: `fromPrice` / `producerName` vía `ContentCard` (API Slice 2).
- Carril trending home: **«Lo más visto»** — `GET /public/events/trending` (orden por `viewCount` en API).

---

## 8b. Explore (`/explore`)

- `ExplorePageContent` + `useExploreUrlFilters` — filtros en URL: `q`, `category`, `subcategoryId`, `city`, `from`, `to`, `page`.
- **Buscador:** `PublicSearchBar` → `/explore?q=...` (home + explore); filtros avanzados en panel «Más filtros».
- **Filtros UI:** chips de categoría (`SubcategoryFilterChip` / `SubcategoryRail` en categorías); pills horizontales con scroll.
- `useExploreEvents` → `GET /public/events/search` (misma metadata que listados: `fromPrice`, `producerName`, `subcategoryName`).
- Subcategorías: `usePublicSubcategories(category)`.
- Estados: loading skeleton, empty, `QueryError`.

### Fechas en UI pública (V3.1 Etapa 2)

- `lib/public/publicContentDates.ts` — `shouldShowPublicEventDate(category)`: solo `event` muestra badge `startAt` en cards/modal.
- `contentCardPresentation.getContentCardDateLabel` usa esa regla; fichas place no muestran `EventScheduleSection` fuera de eventos.

## 8c. Descubrimiento público — cerrado

Bloque checklist V2 cerrado (Slices 1–8). Resumen: gateway → categorías/home/explore; sin hotel en discovery principal; rentals sin copy de alojamiento; visibilidad eventos vencida en API. Audit: `docs/audits/PUBLIC_DISCOVERY_AUDIT.md`.

## 8d. Gastro y Hoteles V2 — cerrado (2026-05-22)

**Gastro V2 (operativo):** discovery (`/categoria/gastro`, explore), ficha `/restaurants/[id]` (`GastroPublicDetailContent`), portal `/gastro` (dashboard, `/gastro/contenido` Prisma, descuentos, validaciones, valoraciones), follows + `FOLLOWED_GASTRO_NEW_DISCOUNT`, QR/scanner (`test:gastro-discount-qr`, `test:gastro-discount-scan`). Sin LocalDB ni `fetch` en UI.

**Hoteles V2 (liviano):** discovery **Próximamente** (sin tile en gateway 2×2, sin carrusel home, subcategorías `comingSoon`); portal operativo `/hotel` + `/hotel/editar` (`PATCH /hotel/me`, completitud); ficha pública `/hoteles/[id]` informativa (`HotelLocationDetailView`, API pública); `/hoteles` listado Próximamente. Sin reservas/checkout en plataforma.

**E2E:** `pnpm e2e:hotel` — `e2e/hotel.spec.ts`; `E2E_HOTEL_*` (skip si faltan); doc `docs/hotel/HOTEL_E2E.md`.

Auditoría: `docs/audits/GASTRO_HOTELES_V2_AUDIT.md` · QA/scripts: `docs/guides/SMOKE_TESTS_GUIDE.md` § Gastro/Hoteles · checklist V2 § Gastro y Hoteles.

**Rentals V2 (checklist § Rentals):** WhatsApp por local, cards discovery, subcategorías, anti-alojamiento, detalle mobile — ver `CONTEXT_PENDIENTES.md` § E.

## 8f. Footer público V2 — cerrado (2026-05-24, Slices 1–5)

| Capa | Implementado |
|------|----------------|
| Visibilidad | `footerVisibility.ts` → `full` \| `minimal` \| `hidden`; `RouteAwareFooter` en root layout |
| UI | `components/footer/*` — institucional, verticales, accesos, legales, soporte, confianza, redes, dev |
| Contacto | `usePublicPlatformConfig` → `GET /public/platform-config`; fallback placeholder |
| Gateway | `/categorias`: global `hidden` + `CategoryGatewayFooter` |
| Legal | `/legal/*`: `minimal` + nota versión en `LegalDocumentPage` |

**Docs:** `docs/audits/PUBLIC_FOOTER_AUDIT.md`, `PUBLIC_FOOTER_SMOKE.md`, `PUBLIC_FOOTER_CLOSING_AUDIT.md`.

## 8e. Legal Admin — cerrado (2026-05-24, Slices 1–8)

Módulo técnico **cerrado**; contenido base en `docs/legal/` importable como borrador (`seed:legal-content`). Publicación y aprobación cliente pendientes.

| Capa | Implementado |
|------|----------------|
| Admin | `/admin/legales`, editor borrador, preview Markdown seguro, publicación con confirmación, historial versiones |
| Público | `/legal/[slug]` — solo `PUBLIC` + `PUBLISHED`; `fetchPublicLegalDocument` (ISR 60s) |
| Aceptación | `RegisterWizard` (`SIGNUP`), `/me/cart` + checkout (`CHECKOUT`), banner portales (`PORTAL_ACCESS`) |
| Footer | Enlaces estables a slugs públicos + contacto vía `GET /public/platform-config` (`usePublicPlatformConfig`, fallback placeholder documentado) |

**Hooks/repos:** `LegalDocumentsRepo`, `admin-legal-documents.ts`, `me-legal.ts`, `public-legal-requirements.ts`.

**Smokes API:** `test:legal-documents`, `test:me-legal-acceptance`, `smoke:legal` (requiere API + `DEV_AUTH_ENABLED` o JWT).

**Docs:** `docs/legal/LEGAL_ADMIN_MODULE.md` (referencia), `docs/dev/LEGAL_ADMIN_QA_SMOKE.md` (manual), `docs/audits/LEGAL_ADMIN_AUDIT.md` (auditoría inicial).

**Pendiente producto:** redacción profesional, bloqueos duros en acciones sensibles del portal, migrar avisos hardcoded (transferencia/referidos).

---

## 9. Domain Rules (frontend)

- Ticket/order/scan/event statuses: `lib/domainLabels.ts`, `StatusBadge` — do not invent values.
- Rentals are **not events** in UX: no event-style “Horarios” section on rental detail unless real bookable slots exist.

---

## 10. Dev, E2E y datos

### Producción VPS (Mayo 2026)

| Dato | Valor |
|------|--------|
| Web | `https://yoteinvito.club` |
| API (`NEXT_PUBLIC_API_BASE_URL`) | `https://api.yoteinvito.club` |
| Scanner (`NEXT_PUBLIC_SCANNER_APP_URL`) | `https://scanner.yoteinvito.club/door` |
| NextAuth (`NEXTAUTH_URL`) | `https://yoteinvito.club` |
| Checkout | Provider **DEMO** (sin Getnet prod) |

Runbook: [`docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md). Pendiente: smoke dominio real, legales bootstrap → contenido aprobado.

**Google Maps (prod 2026-06-01):** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en VPS; autocomplete + mapa + fallback manual OK. Persistencia `googlePlaceId`/`province` (+ `city` rentals); `lib/maps/public-location.ts` (Ver ubicación); JSON-LD local en `lib/seo/jsonld.ts`. Productoras: solo texto city/country (sin mapa exacto). [`MAPS_LOCATION_AUDIT.md`](../audits/MAPS_LOCATION_AUDIT.md) §18–25.

**Storage imágenes (prod 2026-05-31):** GCS `yti-prod-public-assets`; `useGcsImageUpload` en rentals, admin eventos/excursiones, productora, gastro, hotel. [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) §17–22. Ops pendiente: data-URL/orphans (no bloqueante).

**SEO técnico (prod 2026-06-01):** `robots.ts` + `sitemap.ts` activos; metadata global y fichas; canonical; JSON‑LD verticales + local Maps. GSC: propiedad `yoteinvito.club` verificada, sitemap enviado. Pendiente no bloqueante: procesamiento GSC, CWV, Rich Results Test. [`SEO_TECHNICAL_AUDIT.md`](../audits/SEO_TECHNICAL_AUDIT.md) · [`SEARCH_CONSOLE_SEO_RUNBOOK.md`](../deploy/SEARCH_CONSOLE_SEO_RUNBOOK.md).

- **Persistencia:** solo API — no `lib/local-db`, no `/dev/seed`, no `/dev/local-db`.
- **Subcategorías (estructura):** `pnpm --filter api run seed:subcategories`.
- **Documentos legales (catálogo):** `pnpm --filter api run seed:legal-documents` (idempotente; sin auto-publish).
- **Contenido legal (Markdown):** `pnpm --filter api run seed:legal-content` — ver `docs/legal/README.md`.
- **Cleanup contenido:** `pnpm db:cleanup-content` (preserva `felipe.e.salom@gmail.com`).
- **Dev UI:** `/dev/scanner-sim` (simulación escaneo QR).
- **Login:** NextAuth → `POST /auth/login`; sin hints `@demo.local` en formulario.

### E2E Playwright (`e2e/`)

| Comando | Spec |
|---------|------|
| `pnpm e2e:portal` | `user-portal.spec.ts`, `checkout.spec.ts` |
| `pnpm e2e:notifications` | `notifications.spec.ts` |
| `pnpm e2e:hotel` | `hotel.spec.ts` — `E2E_HOTEL_*`; opcional `E2E_ADMIN_*` |
| `pnpm e2e` | Suite completa |

**Requerido:** `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` (cuenta real en BD). Hotel: `E2E_HOTEL_EMAIL` + `E2E_HOTEL_PASSWORD`. Sin credenciales → skip en tests con login.

`E2E_SEED=1` ignorado (`e2e/global-setup.ts`). Guía: `docs/guides/SMOKE_TESTS_GUIDE.md`.

### Smokes (contrato API, no navegador)

Usar `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` — ver `docs/guides/SMOKE_TESTS_GUIDE.md`, `docs/guides/DEVELOPER_SCRIPTS_GUIDE.md`.

| Comando | Alcance |
|---------|---------|
| `pnpm --filter api run smoke:legal` | Documentos admin/public + aceptación usuario |
| `pnpm --filter api run test:legal-documents` | Solo API documentos |
| `pnpm --filter api run test:me-legal-acceptance` | Solo `/me/legal/*` |

Ver: `docs/guides/README.md`, `docs/guides/DEVELOPER_SCRIPTS_GUIDE.md`, `docs/guides/SMOKE_TESTS_GUIDE.md`, `docs/guides/DEMO_REMOVAL.md`, `docs/guides/DEVELOPER_USERS.md`.

---

## 11. Guardrails for AI

1. Extend via repos + hooks; no rewrites.
2. No fetch/localStorage in components.
3. Preserve black/green/white branding.
4. Rental-only changes: branch or dedicated components — do not break event/gastro/excursion pages.
5. Files ~300–400 lines max; split when larger.

---

## References

- `docs/context/PROJECT_CONTEXT.md`
- `docs/context/BACKEND_CONTEXT.md`
- `docs/context/CONTEXT_PENDIENTES.md`
- `docs/legal/LEGAL_ADMIN_MODULE.md`
- `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`
- `docs/audits/LEGAL_ADMIN_AUDIT.md`
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`
- `docs/reviews/REVIEWS_V2.md`
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
- `docs/frontend/FRONTEND_CONVENTIONS.md`
