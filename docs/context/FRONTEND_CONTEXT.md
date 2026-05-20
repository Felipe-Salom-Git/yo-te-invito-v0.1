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
| EventsRepo | ✓ | list, search, trending, detail, ticket types, public discounts |
| **RentalLocationsRepo** | ✓ | Admin CRUD locales + productos (`/admin/rental-locations`) |
| SubcategoriesRepo | ✓ | `listPublic`, admin CRUD |
| OrdersRepo, TicketsRepo, ReviewsRepo | ✓ | |
| ReferralsRepo, CourtesiesRepo, PayoutsRepo | ✓ | |
| TicketTemplatesRepo | ✓ | Canvas studio per ticket type |
| InboxRepo, GastroRepo, HotelRepo | ✓ | |
| **ProducersRepo** | ✓ | público + `getMyProfile` / `createMyProfile` / `updateMyProfile*` + reviews agregadas |
| **producerReviews** / **adminReviewDisputes** | ✓ | comentarios productora + cola admin disputas |
| **commercialReviews** | ✓ | valoraciones privadas productora↔referidor |
| ProfilesRepo, ApplicationsRepo, PlatformConfigRepo | ✓ | |

**Category routing**: `gastro` → `/restaurants`, `excursion` → `/excursiones`, `rental` → `/rentals`, `hotel` → `/hoteles`, default → `/events`.

---

## 6. Routes / Screens (summary)

| Area | Routes |
|------|--------|
| Public | `/`, `/home`, `/explore`, `/events/[id]`, `/restaurants/[id]`, `/excursiones/[id]`, **`/rentals/[id]`**, `/hoteles/[id]`, checkout, `/me/tickets`, `/referrers`, `/r/[code]` |
| Account | `/login`, `/register`, `/cuenta/*` |
| Admin | `/admin/*`, **`/admin/rentals`**, **`/admin/rentals/locales/...`**, **`/admin/review-disputes`**, inbox, perfiles, config |
| Producer | `/producer`, `/producer/events`, ticket studio, **`/producer/profile`** (dashboard por bloques), **`/producer/profile/create`**, **`/producer/profile/identity`**, **`/producer/profile/images`**, **`/producer/profile/contact`**, **`/producer/comments`** (reseñas de eventos + solicitud revisión), referidos, payouts |
| Gastro / Hotel / Referrer | `/gastro/*`, `/hotel`, `/referrer`, `/cuenta/solicitar-referrer` |

### Rental public detail (`/rentals/[id]`)

Uses **`RentalProductDetailContent`** (not `PlaceDetailView`):

- **`RentalProductHero`**: cover image as full-width background behind title, description, chips (Alquiler / subcategoría / local). No date/time chips.
- **Galería**: only **additional** images (`event.media`), thumbnails grid; click opens modal carousel (`RentalGalleryThumbnails`). Header/cover image is **not** duplicated in gallery.
- **Sidebar**: `RentalContactCard` (WhatsApp), `RentalLocalCard` (address, structured opening hours, “Ver ubicación”).
- Reviews + related products below.
- Favorites / “Lo espero” via `EventEngagementRow`.

### Rental admin

| Route | Purpose |
|-------|---------|
| `/admin/rentals` | List locales |
| `/admin/rentals/locales/nuevo` | Create local |
| `/admin/rentals/locales/[locationId]` | Local detail + products list |
| `/admin/rentals/locales/[locationId]/editar` | Edit local (structured opening hours) |
| `/admin/rentals/locales/[locationId]/productos/nuevo` | New product |
| `/admin/rentals/locales/[locationId]/productos/[productId]/editar` | Edit product + images |

**Forms**: `OpeningHoursEditor` (weekday / saturday / sunday + exceptions), `RentalProductImagesForm` (header image + multi-select gallery with thumbnails).

### Other place details

`PlaceDetailView` remains for **restaurant**, **excursion**, **hotel** (event-style hero, schedule, purchase card). Do not change those when editing rental-only code.

---

## 7. Key Components

| Component | Location |
|-----------|----------|
| HomeHero, ContentRail, ContentCard | `components/home/` |
| ContentPreviewModal | `components/home/` |
| EventHeroPremium, EventScheduleSection | `components/events/` (events/gastro/excursion/hotel) |
| **RentalProductDetailContent**, **RentalProductHero**, **RentalGalleryThumbnails**, **RentalLocalCard**, **RentalContactCard** | `components/rentals/` |
| PlaceDetailView | `components/places/` (non-rental) |
| TicketStudioClient | `components/producer/ticket-studio/` |
| OpeningHoursEditor, RentalProductImagesForm | `components/forms/`, `components/rentals/` |

---

## 8. Home / Landing

- `HomeLanding` + `useHomeCarousels` (trending, nearYou, gastro, excursion, rental, hotel).
- Path A (anonymous): category tabs in hero — **pending** (`CONTEXT_PENDIENTES.md`).
- Path B (logged-in + preferences): “Para vos” rail, reordered categories.

---

## 9. Domain Rules (frontend)

- Ticket/order/scan/event statuses: `lib/domainLabels.ts`, `StatusBadge` — do not invent values.
- Rentals are **not events** in UX: no event-style “Horarios” section on rental detail unless real bookable slots exist.

---

## 10. Demo / Seed

- API seeds: `pnpm --filter api run demo:seed`, `demo:seed-curated`, `demo:seed-subcategories`.
- **Demo cleanup**: `pnpm db:cleanup-demo` (dry-run) / `pnpm db:cleanup-demo -- --confirm` — see `apps/api/prisma/scripts/cleanup-demo.ts`.
- Dev docs: `/dev/seed`, `/dev/local-db`.

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
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
- `docs/frontend/FRONTEND_CONVENTIONS.md`
