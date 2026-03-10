# Yo Te Invito — Frontend Roadmap — Chat 01

## Goal
Build the **public V1 foundation** of the frontend in **LocalStorage Edition**, while keeping the app **backend-ready from day one**.

## Working rules
- Use **Next.js App Router**
- Use **React + TypeScript + TailwindCSS**
- Consume data only through:
  - UI Components
  - TanStack Query Hooks
  - Repository Interfaces
  - LocalRepository (current)
  - ApiRepository (future)
- UI must **not** access `localStorage` directly
- UI must **not** use `fetch` directly
- UI must **not** depend on repository implementation details
- Keep changes small, isolated, typed, and mobile-first
- Preserve brand consistency:
  - black background
  - green accents
  - white contrast text

## Domain consistency rules
- TicketStatus:
  - `VALID`
  - `USED`
  - `REVOKED`
- Order flow:
  - `PENDING_PAYMENT`
  - `PAID`
- Tickets are emitted **only after** the order becomes `PAID`
- Future door scan result values:
  - `OK`
  - `ALREADY_USED`
  - `REVOKED`
  - `INVALID`

## Scope for this chat
This chat should cover the **public V1 base** and the first usable end-to-end flow:

**Intro → Home → Explore → Event Detail → Checkout → Paid demo order → My Tickets → QR visible**

## Slices

### Slice 01 — Fix Logo Asset + Central Logo Component
**Objective**
Create a single reusable `Logo` component that uses `apps/web/public/brand/logo.png` and becomes the only valid way to render the brand logo.

**Deliverables**
- `components/brand/Logo.tsx`
- variants for splash, navbar, auth, icon-only, with-text
- replace direct logo usage if found

**Notes**
Pure presentational slice. No business logic.

---

### Slice 02 — Repository Architecture
**Objective**
Establish repository interfaces for all current local data and future API data.

**Deliverables**
- `repositories/interfaces/*`
- `repositories/local/*`
- `repositories/api/*` placeholders
- `repositories/index.ts`

**Notes**
No direct UI access to storage.

---

### Slice 03 — Query Hooks Layer
**Objective**
Create the TanStack Query hook layer as the only valid UI data-consumption layer.

**Deliverables**
- `hooks/*`
- query key factory
- read hooks for public content
- write hooks where needed for demo flows

---

### Slice 04 — Global Layout + Navbar + Branding Shell
**Objective**
Create the public app shell with premium dark layout and sticky navbar.

**Deliverables**
- `PublicLayout`
- `Navbar`
- login CTA
- filter triggers: category, service, city

---

### Slice 05 — SplashIntro Component
**Objective**
Build the fullscreen branded intro.

**Deliverables**
- `components/splash/SplashIntro.tsx`
- black background
- green scan line
- logo reveal
- glow pulse
- fade out
- skip button

---

### Slice 06 — Splash Integration
**Objective**
Integrate the splash into the entry route.

**Deliverables**
- entry flow on `app/page.tsx`
- redirect to `/home`

---

### Slice 07 — Intro Persistence + Replay
**Objective**
Store intro visibility through an abstraction, not direct UI storage access.

**Deliverables**
- key: `yti_intro_last_seen`
- first visit or 24h expiration logic
- replay helper for future settings

---

### Slice 08 — Home Page (Netflix Style)
**Objective**
Build the main discovery home page.

**Route**
- `/home`

**Deliverables**
- hero/discovery section
- carousel rows:
  - Destacados
  - Eventos
  - Restaurantes
  - Excursiones
  - Rentals
  - Categorías
  - Próximos Eventos

---

### Slice 09 — Explore Events / Public Content
**Objective**
Create the discover/explore page with basic filtering.

**Route**
- `/explore`

**Deliverables**
- content grid/list
- filters:
  - category
  - service
  - city
- search shell
- clear filters UX

---

### Slice 10 — Event Detail
**Objective**
Build the event detail page.

**Route**
- `/eventos/[id]`

**Deliverables**
- gallery
- title/date/city/venue
- description/editorial
- map/location block
- producer block + link
- ticket type selector
- CTA to demo checkout

---

### Slice 11 — Checkout Flow
**Objective**
Create the demo checkout flow with typed buyer form and correct domain order flow.

**Route**
- `/checkout/[eventId]`

**Deliverables**
- selected ticket summary
- buyer data form
- demo payment confirmation
- order flow `PENDING_PAYMENT -> PAID`
- ticket issuance only after `PAID`

---

### Slice 12 — My Tickets
**Objective**
Build the tickets overview page for the logged user.

**Route**
- `/mis-tickets`

**Deliverables**
- ticket list
- event summary
- status badges
- QR CTA
- empty state

---

### Slice 13 — Ticket QR Viewer
**Objective**
Create the individual ticket viewer.

**Route**
- `/mis-tickets/[ticketId]`

**Deliverables**
- visible QR
- event info
- buyer/ticket metadata
- status badge
- placeholder for future PDF action

---

### Slice 14 — Status Badges + Domain Consistency
**Objective**
Centralize status rendering to avoid inconsistent labels.

**Deliverables**
- typed status badge components
- centralized mappings
- replace hardcoded inconsistent labels if found

---

### Slice 15 — Auth UI Shell / Profile Entry
**Objective**
Create branded login/register/profile entry shells without overbuilding auth.

**Routes**
- `/login`
- `/perfil` or `/cuenta`

**Deliverables**
- branded auth layout
- login CTA
- register CTA
- profile entry shell

---

### Slice 16 — Demo Seed Data + Empty State Polish
**Objective**
Ensure the main public screens have representative demo content and polished empty states.

**Deliverables**
- improved seed source
- no hardcoded demo data inside UI components
- polished empty states across main public routes

## Exit criteria for Chat 01
By the end of this roadmap, the frontend should have:
- a stable public shell
- intro flow working
- public discovery working
- event detail working
- demo checkout working
- ticket issuance working in local mode
- tickets and QR viewer working
- consistent status and branding foundations
