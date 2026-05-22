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
| ProfilesRepo, ApplicationsRepo, PlatformConfigRepo | ✓ | |

**Category routing**: `gastro` → `/restaurants`, `excursion` → `/excursiones`, `rental` → `/rentals`, `hotel` → `/hoteles`, default → `/events`.

**Auth:** solo NextAuth + API NestJS. Eliminados `app/api/auth/*`, `app/api/admin/*`, `demo-users`, `dynamic-users`, `validate.ts` local.

---

## 6. Routes / Screens (summary)

| Area | Routes |
|------|--------|
| Public | `/`, `/home`, **`/explore`** (filtros URL: `q`, `category`, `subcategoryId`, `city`, `from`, `to`, `page`), `/events/[id]`, `/restaurants/[id]`, `/excursiones/[id]`, **`/rentals/[id]`**, `/hoteles/[id]`, **`/users/[userId]`** (perfil comentarista), checkout, `/me/tickets`, `/referrers`, `/r/[code]` |
| Account | `/login`, `/register`, **`/me/*`** (portal usuario estándar) |
| Cuenta (legacy) | `/cuenta/*` → **redirects** a `/me/*` (no mantener lógica duplicada) |
| Admin | `/admin/*` (**solo rol `ADMIN`**, `ProfileProtectedLayout` en `admin/layout.tsx`), sidebar operaciones; acceso: `/profiles`, navbar «Administración», URL directa |
| Producer | `/producer` (hub: KPIs, engagement, **`ProducerDashboardEventStatusAlerts`**, eventos; nav en sidebar), `/producer/events`, ticket studio, **`/producer/profile`** (hub por bloques + completitud frontend), **`/producer/profile/create`** (solo nombre; slug en servidor), **`/producer/profile/identity|images|contact`**, **`/producer/comments`** (`ManagedReviewsCommentsPage`), referidos, payouts |
| Gastro / Hotel / Referrer | `/gastro/*`, **`/gastro/valoraciones`**, `/hotel`, **`/hotel/valoraciones`**, `/referrer`, `/cuenta/solicitar-referrer` |

### Rental public detail (`/rentals/[id]`)

Uses **`RentalProductDetailContent`** (not `PlaceDetailView`). Shared UI tokens: `lib/rentals/rentalDetailUi.ts`, copy/CTA: `lib/rentals/publicCopy.ts`, WhatsApp: `lib/rentals/whatsapp.ts`, galería: `lib/rentals/productGallery.ts`.

- **`RentalProductHero`**: cover as full-width background; title + summary + chips (Alquiler / subcategoría / local). Shorter hero on mobile; no date/time chips; engagement row **not** overlaid on hero.
- **Layout**: desktop — main column (descripción, galería) + sticky sidebar (contacto, local). Mobile — aside first (Disponibilidad + Local), then descripción/galería; `EventEngagementRow` below breadcrumbs (mobile) or above descripción (`sm+`).
- **CTA**: `RentalContactCard` + fixed **`RentalMobileStickyCta`** (`lg:hidden`) when `whatsappPhone` resolves — button **«Consultar disponibilidad»**, full-width, `min-h-[48px]`; page `pb-24` on mobile when sticky is shown. Sin fallback demo si no hay número.
- **Galería**: only **additional** images (`buildRentalGalleryOnlyImages`); `RentalGalleryThumbnails` + modal. Cover **not** duplicated.
- **`RentalLocalCard`**: address, **horario de atención** solo si hay datos (`hasRentalOpeningHoursContent`), “Ver ubicación” (full-width button on mobile). No event-style schedule section elsewhere.
- **`RentalDescriptionBlock`**: «Detalle del producto»; hidden if empty (no «Lo que incluye» block on rentals).
- Reviews V2 + related products; favorites / “Lo espero” via `EventEngagementRow`.

### Rental admin

| Route | Purpose |
|-------|---------|
| `/admin/rentals` | List locales |
| `/admin/rentals/locales/nuevo` | Create local |
| `/admin/rentals/locales/[locationId]` | Local detail + products list |
| `/admin/rentals/locales/[locationId]/editar` | Edit local (structured opening hours) |
| `/admin/rentals/locales/[locationId]/productos/nuevo` | New product |
| `/admin/rentals/locales/[locationId]/productos/[productId]/editar` | Edit product + images |

**Forms**: `OpeningHoursEditor` (weekday / saturday / sunday + exceptions), `RentalProductImagesForm` (header + galería multi-upload; comprime JPEG vía `lib/image-compress.ts` antes de enviar data-URL).

### Portal usuario (`/me/*`)

| Ruta | Uso |
|------|-----|
| `/me` | Dashboard (alertas, recomendados, **MeDashboardPushCta**) |
| `/me/cart` | **Mi Carro** — carrito API + checkout |
| `/me/tickets`, `/me/tickets/[ticketId]` | Listado agrupado + **detalle ticket comprador** (`MeBuyerTicketPanel`, impresión, transferencia) |
| `/me/preferences` | Tabs: intereses, productoras, **gastro follows** (`MePreferencesGastro`), favoritos, esperados, notificaciones globales |
| `/me/activity` | Asistidos, reviews, transfers |
| `/me/account` | Perfil, contraseña, solicitudes de rol |
| `/me/notifications` | Bandeja in-app + **push** (`MePushNotificationsPanel`) + preferencias alertas (`MePushAlertPreferences` en `InterestsDisclosure`) |
| `/me/orders` | Historial órdenes (fuera del menú principal; ruta viva) |
| `/me/following` | Redirect → `/me/preferences?tab=producers` |

- Hooks: `lib/query/me-portal.ts` (incl. `usePushSubscriptions*`, `useRegisterPushSubscription`, `useSendTestPushNotification`); keys `mePortalKeys` en `lib/query/keys.ts`.
- Push cliente: `lib/push/registerPush.ts`; service worker `public/push-sw.js` (registro `/push-sw.js`).
- Layout: `UserPortalLayout` bajo `app/(portal)/me/` (menú: Inicio, Mis tickets, Mi Carro, Preferencias, Actividad, Notificaciones, Mi cuenta).
- Componentes portal: `MeDashboardAlerts`, `MeRecommendationsSection`, `MePreferencesInterests` + **`InterestsDisclosure`** (acordeones reutilizables); órdenes: `MeOrderDetailSummary`, `MeOrderTicketsList`.
- **Ticket comprador (V2.2):** `components/tickets/` (`BuyerTicketVisual`, `TicketTemplateRenderer`, `DefaultBuyerTicket`, `TicketQrImage`, `TicketEntryStatusBanner`); utilidades `lib/tickets/` (`qr-display.ts`, `qr-image-url.ts`, `ticket-status-ui.ts`); estilos impresión en `styles/globals.css` (`@media print`).
- Engagement en fichas: `EventEngagementRow` → API favoritos / expected-events; **`GastroFollowButton`** en detalle restaurante → `/me/gastro-follows`.
- Checkout autenticado: redirige a `/me/cart`; invitado usa `/checkout` público.

**Eliminado:** `/reventa`, `/dev/seed`, `/dev/local-db`, `lib/local-db/*`.

### Other place details

`PlaceDetailView` remains for **restaurant**, **excursion**, **hotel** (event-style hero, schedule, purchase card). Do not change those when editing rental-only code.

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
| Reviews V2 (público + portales) | `components/reviews/` (`ReviewForm`, `ReviewCard`, `ReviewSummary`, `ManagedReviewsCommentsPage`, `ReviewReplyModal`) |
| Comentarios productora | `components/producer/comments/` (`ProducerCommentsPage` → `ManagedReviewsCommentsPage`, filtros rápidos, resumen API) |
| Perfil productor (portal) | `components/producer/profile/` (`ProducerProfilePage`, `ManagedReviewSummary`, `ProducerProfilePublicPreview`, `producer-profile-completeness.ts`) |
| Dashboard productor | `components/producer/dashboard/` (`ProducerDashboardClient`, KPIs, engagement, alertas estado evento; **sin** `ProducerDashboardQuickLinks`) |
| Valoración B2B | `CommercialReviewPanel`, `CommercialAspectBreakdown` |
| Navbar admin | `NavbarUserMenu` — enlace «Administración» si `Role.ADMIN` |
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
- `useExploreEvents` → `GET /public/events/search` (misma metadata que listados: `fromPrice`, `producerName`, `subcategoryName`).
- Subcategorías: `usePublicSubcategories(category)`.
- Estados: loading skeleton, empty, `QueryError`.

## 8c. Descubrimiento público — cerrado

Bloque checklist V2 cerrado (Slices 1–8). Resumen: gateway → categorías/home/explore; sin hotel en discovery principal; rentals sin copy de alojamiento; visibilidad eventos vencida en API. Audit: `docs/audits/PUBLIC_DISCOVERY_AUDIT.md`.

**Rentals V2 (checklist § Rentals):** WhatsApp por local, cards discovery, subcategorías, anti-alojamiento, detalle mobile — ver `CONTEXT_PENDIENTES.md` § E.

---

## 9. Domain Rules (frontend)

- Ticket/order/scan/event statuses: `lib/domainLabels.ts`, `StatusBadge` — do not invent values.
- Rentals are **not events** in UX: no event-style “Horarios” section on rental detail unless real bookable slots exist.

---

## 10. Dev, E2E y datos

- **Persistencia:** solo API — no `lib/local-db`, no `/dev/seed`, no `/dev/local-db`.
- **Subcategorías (estructura):** `pnpm --filter api run seed:subcategories`.
- **Cleanup contenido:** `pnpm db:cleanup-content` (preserva `felipe.e.salom@gmail.com`).
- **Dev UI:** `/dev/scanner-sim` (simulación escaneo QR).
- **Login:** NextAuth → `POST /auth/login`; sin hints `@demo.local` en formulario.

### E2E Playwright (`e2e/`)

| Comando | Spec |
|---------|------|
| `pnpm e2e:portal` | `user-portal.spec.ts`, `checkout.spec.ts` |
| `pnpm e2e:notifications` | `notifications.spec.ts` |
| `pnpm e2e` | Suite completa |

**Requerido:** `E2E_USER_EMAIL` + `E2E_USER_PASSWORD` (cuenta real en BD). Sin credenciales → skip en tests con login.

`E2E_SEED=1` ignorado (`e2e/global-setup.ts`). Guía: `docs/guides/SMOKE_TESTS_GUIDE.md`.

### Smokes (contrato API, no navegador)

Usar `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` — ver `docs/guides/SMOKE_TESTS_GUIDE.md`, `docs/guides/DEVELOPER_SCRIPTS_GUIDE.md`.

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
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`
- `docs/reviews/REVIEWS_V2.md`
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
- `docs/frontend/FRONTEND_CONVENTIONS.md`
