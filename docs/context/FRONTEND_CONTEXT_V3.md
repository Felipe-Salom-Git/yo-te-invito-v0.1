# FRONTEND CONTEXT V3 — Yo Te Invito

Implementation-oriented technical context for AI-assisted development. Describes the **current implemented state** as of this document.

---

## 1. Project Overview

- **What**: Web frontend for **Yo Te Invito**, a discovery and ticketing platform for events, restaurants, excursions, and rentals.
- **Current purpose**: Public discovery, checkout, ticket viewing; producer/admin/referrer/gastro portals; auth and role-based access.
- **Current mode**: **ApiRepository** — the app uses the NestJS API as the single data source. LocalStorage/LocalDB simulation has been removed.
- **Future goal**: Backend-ready architecture is in place; no major refactor needed when API evolves. Personalization and preference-driven homepage ordering are planned next steps.

---

## 2. Current Stack

| Technology | Use |
|------------|-----|
| Next.js 15 | App Router |
| React 18 | UI |
| TypeScript | Strict typing |
| TailwindCSS | Styles |
| TanStack Query | Cache and data fetching |
| Zod | Schemas and validation (shared package) |
| NextAuth | Auth |
| Framer Motion | Animations (SplashIntro, ContentRail, ContentCard) |

---

## 3. Branding and Design Rules

- **Background**: Black (`--color-bg: #0a0a0a`, `--color-bg-muted: #171717`)
- **Accent**: Green (`--color-accent: #22c55e`, `--color-accent-hover: #16a34a`)
- **Text**: White (`--color-text`) and muted (`--color-text-muted`)
- **Logo**: Centralized via `components/brand/Logo.tsx` (variants: `icon`, `with-text`, `navbar`, `auth`, `splash`)
- **Visual direction**: Dark, premium event platform; Netflix-inspired rails on homepage
- **Responsive**: Mobile-first; padding: ~16px mobile, ~24px tablet, ~32px desktop

---

## 4. Current Architecture

```
UI Components
      ↓
Query Hooks (TanStack Query)
      ↓
Repository Interfaces (repositories/interfaces.ts)
      ↓
ApiRepository (apps/web/repositories/ApiRepository.ts)
      ↓
ApiClient → HTTP (NEXT_PUBLIC_API_BASE_URL, default localhost:3001)
```

- **No direct `localStorage` or `fetch` in UI** — all data goes through `useRepositories()` and query hooks.
- **Typed domain-safe rendering** — interfaces from `repositories/interfaces.ts` and `packages/shared`.
- **LocalRepository**: Not in use. LocalDB/seed utilities exist in `lib/local-db/` but the app reads from API.
- **ApiRepository**: Active implementation; uses `ApiClient` with auth from NextAuth session.

---

## 5. Repository / Data Layer Status

| Repository | Status | Notes |
|------------|--------|-------|
| EventsRepo | Implemented | list, search, trending, getDetail, getTicketTypes, create, update; category filtering supported |
| OrdersRepo | Implemented | get, create |
| TicketsRepo | Implemented | listByOwner, listByEvent, get, etc. |
| ReviewsRepo | Implemented | list, create |
| ProducersRepo | Implemented | get (detail) |
| ReferralsRepo | Implemented | lookup, listLinks, createLink, etc. |
| CourtesiesRepo | Implemented | list, create, fetchTicketTypes |
| PayoutsRepo | Implemented | listByProducer, create, etc. |
| MetricsRepo | Implemented | getEventMetrics, getPlatformMetrics |
| TicketTypesRepo | Implemented | create, update |
| ApplicationsRepo | Implemented | listPending, approve, reject |

**EventSummary** includes: `id`, `title`, `startAt`, `city`, `venueName`, `coverImageUrl`, `category`, `description`, `ratingAvg`, `ratingCount` (when API returns). **ContentCardItem** extends it with `fromPrice`, `producerName` (curated seed / extended responses). Category routing: `gastro` → `/restaurants`, `excursion` → `/excursiones`, `rental` → `/rentals`, default → `/events`.

---

## 6. Hooks / Query Layer Status

| Hook | Location | Consumed By |
|------|----------|-------------|
| useEventsList | lib/query/events.ts | HomeLanding (highlights), admin, producer |
| useHomeCarousels | lib/query/home.ts | HomeLanding (trending, nearYou, newEvents, gastro, excursion, rental) |
| useExploreEvents | lib/query/explore.ts | Explore page |
| useMe | hooks/useMe.ts | Layout, user menus |
| useTenant | hooks/useTenant.ts | HomeLanding, queries |
| usePreferences | hooks/usePreferences.ts | Home V4 personalization |
| usePlatformConfig | hooks/usePlatformConfig.ts | Explore (categories) |
| useProducerId | hooks/useProducerId.ts | Producer portal |

**Query keys**: Centralized in `lib/query/keys.ts` (eventsKeys, homeKeys, ticketsKeys, exploreKeys, etc.). Use for cache and invalidation.

---

## 7. Current Routes / Screens

| Route | Status | Notes |
|-------|--------|-------|
| `/` | Implemented | Entry; SplashIntro or redirect to /home |
| `/home` | Implemented | Homepage with hero, rails |
| `/explore` | Implemented | Search/filters, ContentCard grid |
| `/events/[eventId]` | Implemented | Event detail (premium layout, breadcrumbs, OG meta) |
| `/restaurants/[id]` | Implemented | Restaurant detail (premium layout) |
| `/excursiones/[id]` | Implemented | Excursion detail (premium layout) |
| `/rentals/[id]` | Implemented | Rental detail (premium layout) |
| `/content/[id]` | Implemented | Generic content detail |
| `/producers/[id]` | Implemented | Producer page |
| `/checkout` | Implemented | Cart checkout |
| `/checkout/[eventId]` | Implemented | Direct checkout for event |
| `/checkout/success` | Implemented | Success page |
| `/me/tickets` | Implemented | My tickets (grouped by event); nav label "Mis tickets" |
| `/me/tickets/[ticketId]` | Implemented | Ticket QR viewer |
| `/me/orders` | Implemented | Order list |
| `/me/orders/[orderId]` | Implemented | Order detail |
| `/login`, `/logout` | Implemented | Auth |
| `/register` | Implemented | Registration |
| `/register/gastro`, `/register/producer` | Implemented | Role-specific registration |
| `/cuenta` | Implemented | Account area |
| `/cuenta/configuracion`, `/cuenta/preferencias` | Implemented | Account subpages |
| `/cuenta/eventos-asistidos`, `/cuenta/eventos-esperados` | Implemented | User event lists |
| `/admin` | Implemented | Dashboard, metrics |
| `/admin/eventos`, `/admin/usuarios`, etc. | Implemented | Admin sections |
| `/admin/excursiones`, `/admin/rentals` | Implemented | Admin content |
| `/admin/aplicaciones` | Implemented | Role applications |
| `/producer`, `/producer/events` | Implemented | Producer portal |
| `/producer/events/[eventId]` | Implemented | Event management, courtesies, referrals |
| `/producer/payouts`, `/producer/referrals` | Implemented | Producer tools |
| `/gastro` | Implemented | Gastro portal |
| `/referrer` | Implemented | Referrer portal |
| `/r/[code]` | Implemented | Referral redirect |
| `/reventa`, `/reventa/[listingId]` | Implemented | Resale |
| `/dev/seed` | Implemented | Demo seed instructions |
| `/dev/local-db` | Implemented | Dev tools, points to API seed |
| `/dev/scanner-sim` | Implemented | Scanner simulation |

---

## 8. Home / Landing Current State

### Structure
- **HomeLanding**: Uses `useEventsList` (highlights) and `useHomeCarousels` (trending, nearYou, newEvents, gastro, excursion, rental).
- **HomeHero**: Dynamic hero driven by featured items (trending + highlights, deduped). Supports manual rotation (prev/next) when multiple candidates exist.

### Hero
- **Dynamic**: Featured items from existing data; no hardcoded hero content.
- **HeroViewModel**: Mapped via `lib/home/heroModel.ts` (`mapFeaturedItemToHeroModel`).
- **Content**: Title, description, category, city, venue, date, rating, price, producer; CTAs by type (Comprar, Ver detalle, Explorar, Reservar).
- **Rotation**: Manual prev/next controls; AnimatePresence for transitions.

### Rails
- **ContentRail**: Horizontal scroll shelves with title, subtitle, green accent bar (48×3px), left/right edge fades (black→transparent, pointer-events-none).
- **Arrows**: z-50 above cards; clickable even when cards expand.
- **Padding**: px-4 sm:px-6 lg:px-8.

### Cards
- **ContentCard**: Used in homepage rails. Size ~280×180 (mobile) to 360×220 (desktop).
- **Hover/focus**: Scale 1.05, image zoom 1.12, layered shadow (dark + subtle green glow), border accent.
- **Expanded overlay**: RatingBadge, PriceBadge, ProducerMeta, title, short description (max 2 lines), quick CTA label (Comprar / Ver detalle / Explorar / Reservar by category).
- **Mobile**: No hover dependency; compact metadata always visible; overlay hidden on small screens.
- **Explore page**: Uses simple Link cards in a grid, not ContentCard.

### Content Preview Modal
- **ContentPreviewModal**: Cinematic overlay on card click (homepage). Hero image, strong gradient overlay, meta, CTAs "Ver detalle" + "Ver similares" (expand).
- **Modular subcomponents**: ContentPreviewMeta (scannable metadata), ContentPreviewActions (primary + expand), ContentPreviewChips (quick info pills), ContentPreviewExpanded (highlights, location, reviews, similar carousel when expanded).
- **Preview mode**: ContentCard accepts `onClick`; when set, opens modal instead of navigating.

### Home V4 Strategy & View Model
- **homeStrategy.ts**: `resolveHomeStrategy`, `hasUsablePreferences` (preferredCity, preferredCategories).
- **homeViewModel.ts**: `buildHomeViewModel` — hero, rails, featuredTabs, heroItemsByCategory.
- **Path A (discovery)**: Anonymous; hero with category tabs; default rail order.
- **Path B (personalized)**: Logged-in + preferences; "Para vos" rail first; rails reordered by `preferredCategories` when present.

### Caveats
- EventCard and Carousel exist but homepage uses ContentRail + ContentCard.
- Trending requires `ratingCount > 0` and `ratingAvg` in API response.

---

## 9. Reusable UI Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Logo | components/brand/Logo.tsx | Centralized logo (variants) |
| Navbar | components/Navbar.tsx | Main navigation |
| Footer | components/Footer.tsx | Footer |
| SplashIntro | components/splash/SplashIntro.tsx | First-visit intro overlay |
| HomeHero | components/home/HomeHero.tsx | Dynamic featured hero |
| ContentRail | components/home/ContentRail.tsx | Horizontal rail with fades, arrows |
| ContentCard | components/home/ContentCard.tsx | Card for rails (hover expansion); optional `tenantId`, `onClick` for preview |
| ExpandedContentCardOverlay | components/home/ExpandedContentCardOverlay.tsx | Hover metadata overlay |
| RatingBadge, PriceBadge, ProducerMeta | components/home/ | Card metadata badges |
| EventCard, Carousel | components/home/ | Legacy |
| ContentPreviewModal | components/home/ContentPreviewModal.tsx | Cinematic preview; ContentPreviewMeta, Actions, Chips, Expanded |
| EventHeroPremium, EventActionBar, EventMetaSummary | components/events/ | Premium event/place detail hero |
| EventLocationModal, EventPurchaseCard | components/events/ | Map modal, purchase panel |
| EventReviewsSection, RelatedEventsSection | components/events/ | Reviews + related content |
| StatusBadge | components/domain/StatusBadge.tsx | Domain status badges |
| PageContainer, SectionTitle | components/ | Layout helpers |
| Card, Button, Input, Modal, Badge, etc. | components/ui/ | Atomic UI |

---

## 10. Domain Rules Already Reflected in Frontend

- **TicketStatus**: VALID | USED | REVOKED — labels from `lib/domainLabels.ts`
- **OrderStatus**: PENDING_PAYMENT | PAID | CANCELLED | REFUNDED — tickets issued only after PAID
- **ScanResult**: OK | ALREADY_USED | REVOKED | INVALID
- **EventStatus**: DRAFT | PENDING | APPROVED | PAUSED | CANCELLED
- **Domain-safe rendering**: Use `getTicketStatusLabel`, `getOrderStatusLabel`; do not invent statuses
- **Event category routing**: gastro→/restaurants, excursion→/excursiones, rental→/rentals, default→/events

---

## 11. Demo Content / Seed Data Status

- **Source**: API (PostgreSQL via Prisma). No frontend LocalDB.
- **Base seed**: `cd apps/api && pnpm run demo:seed` — tenant, users, one event.
- **Curated seed**: `cd apps/api && pnpm run demo:seed-curated` — ~28 items: eventos, gastro, excursion, rental (editorial copy, Pexels images, rating, fromPrice).
- **Admin demo load**: No in-app button; run seed scripts from terminal.
- **Dev page**: `/dev/seed` documents both seeds; `/dev/local-db` points to API seed commands.

---

## 12. Recently Implemented UX/UI Changes

- Netflix-style horizontal rails with edge fades
- Card hover: scale 1.05, image zoom 1.12, layered shadow + green glow
- Carousel arrows z-50 above expanded cards (clickability preserved)
- Rail padding: 16px / 24px / 32px (mobile / tablet / desktop)
- Green accent bar (48×3px) under rail titles
- Dynamic hero driven by featured content with manual rotation
- Content Preview Modal: cinematic overlay; Ver detalle + Ver similares; modular Meta/Actions/Chips/Expanded
- Event/Place detail premium layout: hero, action bar, breadcrumbs, reviews, related
- contentRoutes: `getContentDetailHref`, `getCategoryLabel`, `getPlaceHeroCtaLabel`, `getRelatedSectionTitle`
- Expanded card metadata: rating, price, producer, description, quick CTA
- Hero content hierarchy and CTA labels by category

---

## 13. Known Gaps / Pending Work

- **Personalization**: implemented via preferredCity and preferredCategories; rails reordered for personalized mode
- **Featured tabs**: No category tabs in hero for anonymous discovery
- **Explore page**: Uses ContentCard with proper category routing and tenant
- **fromPrice in list**: API may not return fromPrice in list/trending; cards show it when present
- **producerName**: API may not include producer display name in list; ProducerMeta uses venueName as fallback
- **Guardar para después**: Not implemented
- **Light theme**: CSS variables exist but dark is primary

---

## 14. Next Recommended Iteration: Two-Path Homepage

### Path A — Anonymous / No preferences
- Hero with **featured category tabs** (Eventos, Gastronomía, Excursiones, Alquileres)
- Exploratory discovery-first layout
- Same rail structure; content ordered by recency/trending

### Path B — Logged-in with preferences (implemented)
- Smarter **personalized** rail ordering
- Prioritize favorite categories, expected events, relevant content
- Optional: “Para vos” rail

**Why**: Anonymous users need clear discovery; registered users benefit from relevance. Product should support both without overbuilding personalization logic initially.

---

## 15. Implementation Guardrails for the Next Chat

1. **Architecture**: Do not rewrite; extend via existing patterns (repos, hooks, components).
2. **Modularity**: Keep changes small; split files at ~300–400 lines.
3. **No direct data access in UI**: No `localStorage`, `fetch` in components; use repositories/hooks.
4. **Branding**: Preserve black background, green accents, white text.
5. **Personalization**: Prefer minimal, incremental logic; avoid complex recommendation engines initially.
6. **Repository contracts**: Respect `repositories/interfaces.ts`; extend APIs when needed.
7. **Query keys**: Use `lib/query/keys.ts` for cache/invalidation.
8. **Domain rules**: Use `lib/domainLabels.ts` and StatusBadge; do not invent statuses.
9. **Slices**: Prefer small, safe slices; avoid large refactors.

---

## References

- `docs/frontend/FRONTEND_CONVENTIONS.md`
- `docs/context/FRONTEND_CONTEXT_V2.md` (legacy; V3 supersedes for current state)
- `docs/guides/FRONTEND_COMPONENT_TEMPLATE.md`
- `docs/architecture/FOLDER_STRUCTURE.md`
