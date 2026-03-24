# PROJECT CONTEXT V2 — Yo Te Invito

High-level project-wide summary. **Current state as verified from the repository.**

---

## 1. Project Overview

**Yo Te Invito** is a web platform for discovery and ticketing of events, plus related verticals:

- **Events** — concerts, shows, festivals
- **Gastronomy** (`gastro`) — restaurants, cafés
- **Excursions** (`excursion`) — tours, experiences
- **Rentals** (`rental`) — accommodation, spaces

Product direction: marketplace for experiences and tourism; multi-tenant; supports event producers, gastro owners, referrers, admins, and end users.

**Current maturity**: Functional end-to-end flows (discovery → purchase demo → tickets → scanning). Producer/admin/gastro/referrer portals present. Payment is demo-only. Personalization (preferences) partially implemented.

---

## 2. Monorepo Structure

```
yo-te-invito-v0.1/
├── apps/
│   ├── web/          # Next.js 15 — main frontend (discovery, checkouts, portals)
│   ├── api/          # NestJS — backend API (REST)
│   └── scanner/      # Next.js PWA — door scanning (online + offline)
├── packages/
│   └── shared/       # Zod schemas, enums, API contracts
└── docs/
    ├── context/      # Project, frontend, backend context
    ├── frontend/     # Frontend conventions, roadmaps
    ├── backend/      # API conventions, Prisma guides
    ├── architecture/
    ├── project/
    └── guides/
```

- **Frontend** (web): consumes API via `ApiRepository` and query hooks.
- **Backend** (api): NestJS + Prisma + PostgreSQL. Uses `@yo-te-invito/shared` for validation and contracts.
- **Scanner**: PWA with IndexedDB offline queue; syncs with API when online.
- **Shared**: single source of truth for schemas and types.

---

## 3. Current Architecture Summary

```
[Next.js Web App]  ──HTTP──►  [NestJS API]  ──Prisma──►  [PostgreSQL]
       │                            │
       └── TanStack Query ──────────┘
       └── ApiRepository / ApiClient
       └── packages/shared (Zod, contracts)
```

- **Data source**: API only. No LocalStorage/LocalDB in production UI.
- **Auth**: NextAuth (credentials) on frontend; JWT or `X-Dev-User-Id` (dev) on backend.
- **Multi-tenant**: `tenantId` required on most operations; default `tenant-demo` for public flows.

---

## 4. Current Implemented Scope

### Public

- Splash intro → Home → Explore
- Home: hero, rails (trending, nearYou, newEvents, gastro, excursion, rental)
- Content preview modal on card click (hero, meta, CTAs, chips, expanded state)
- Event/restaurant/excursion/rental detail pages (premium layout)
- Checkout (demo), order success, tickets
- My tickets, ticket QR view
- Producer page, referral redirect

### Auth & Account

- Login, register, role-specific registration (producer, gastro)
- Account, configuration, preferences
- Events attended / expected

### Producer / Admin / Gastro / Referrer

- Producer: events, ticket types, courtesies, referrals, payouts
- Admin: users, events approval, tickets revoke, applications, config, audit
- Gastro: content, discounts, validations
- Referrer: events, links, configuration

### Backend

- Events CRUD, public listing, search, trending
- Orders, ticket types, ticket issuance
- Scanner validate/scan (online + offline sync)
- Reviews, referrals, courtesies, payouts
- Admin flows, applications, audit
- Demo payment confirmation

---

## 5. Current Gaps / Missing Scope

- **Payments**: Demo flow only; no real payment provider.
- **fromPrice / producerName in lists**: API may not return in list/trending; frontend shows when present.
- **Guardar para después**: Not implemented.
- **Featured category tabs in hero**: Not present for anonymous users.
- **Light theme**: CSS variables exist; dark is primary.
- **Scanner path**: `/scanner/` routes exist in scanner app; web has `/dev/scanner-sim` only.

---

## 6. Product / Design Direction

- **Branding**: Black background, green accent, white text.
- **Style**: Premium, cinematic, discovery-focused; Netflix-inspired rails.
- **Target**: Dark event/tourism platform; clear CTAs, scannable metadata.

---

## 7. Safe Guidance for Future AI Sessions

1. **Architecture**: Extend via existing patterns; avoid rewrites.
2. **Data access**: No direct `fetch` or `localStorage` in UI; use hooks and repositories.
3. **Contracts**: Use `packages/shared` and `repositories/interfaces.ts`; do not invent ad hoc types.
4. **Slices**: Prefer small, reversible changes.
5. **Branding**: Preserve black/green/white; keep dark premium feel.
