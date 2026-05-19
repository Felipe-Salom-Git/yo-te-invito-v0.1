# FRONTEND_DEMO_NOTES.md

## Scope

**Legacy / mapping doc.** Compares an older **Yo-Te-Invito (Demo)** tree to structural ideas in **`apps/web`**. It is **not** the source of truth for how data is loaded today.

- **Demo reference**: external demo project paths mentioned below (historical)
- **Current app**: `apps/web` in this monorepo
- **Persistence today**: **NestJS API + PostgreSQL**; UI uses **`useRepositories()` → `ApiRepository` → `ApiClient`**. No `LocalRepository` in normal flows.
- **Current frontend truth**: `docs/context/FRONTEND_CONTEXT.md`
- **Backlog**: `docs/context/CONTEXT_PENDIENTES.md`
- **Rules**: `PROJECT_RULES.md`, `AI_WORKFLOW_RULES.md` (small, documented changes)

Sections below that say “LocalRepository” or “LocalStorage” describe the **old** demo mapping, not the current stack.

---

## 1. Public Home / Landing

### 1.1 Demo structure

- **File**: `Yo-Te-Invito (Demo)/app/page.tsx`
- **Key pieces**:
  - `Navbar` (fixed, blurred, dark)
  - `HeroEvent` (full‑width hero banner with background image, gradients, title, date, location, category badge)
  - Several `EventCarousel` rows, each a horizontal list of `EventCard`:
    - `Próximos Eventos`
    - `Destacados de la Semana`
    - Rows by category (Electrónica, Rock, Teatro, Otros)
  - Footer with brand + legal links
- **Data source**: `useAppStore()` (in‑memory / LocalStorage store holding an array of `events`)

### 1.2 Current app mapping

- **Entry**: `apps/web/app/(public)/page.tsx`
  - Shows `SplashIntro` (intro animation) and then redirects to `/home`.
- **Home route**: `apps/web/app/(public)/home/page.tsx`
  - Uses `HomeLanding` (`apps/web/components/home/HomeLanding.tsx`).
- **Current `HomeLanding` responsibilities** (after recent adjustments):
  - Hero section with background image (first `trending` event or highlight), gradients and fade into content.
  - Main headline: "Descubrí eventos cerca tuyo" + CTA buttons (`/explore`, `/login`).
  - "Destacados" horizontal row using `EventCard`; carousel containers use `scrollbar-hide` (no visible scrollbars); cards have fluid hover (scale, z-index, more detail on hover); container closer to screen edges (`px-2 sm:px-3`).
  - Several `Carousel` components fed by `useHomeCarousels()` with arrows centred on the sides of the container and smooth hover:
    - Trending, Cerca de ti, Nuevos, Gastronomía, **Hoteles**, Excursiones, Alquileres (según `homeViewModel` / categorías en API).
- **Data source**:
  - `useHomeCarousels()` y `useEventsList()` → `useRepositories()` → **`ApiRepository`** (NestJS API), no `LocalRepository`.

### 1.3 Structural equivalence (demo → current)

- **Navbar**
  - Demo: `components/layout/Navbar` (fixed, blurred, dark background, primary brand text).
  - Current: `apps/web/components/Navbar.tsx` (sticky top, blurred gradient; palette adapted to green accent). No "Mis tickets" / "Mis pedidos" in navbar; "Cuenta" only inside user dropdown when logged in. Logo enlarged with "Yo Te Invito" title beside it (`Logo` variant `navbar` with `showText`).
- **Hero**
  - Demo: `HeroEvent` (banner with background image, textual overlay, gradients, and a bottom fade to content).
  - Current: `HomeLanding` hero mimics this: full‑height hero with image, gradients, headline/description, and a bottom gradient (`bg-gradient-to-t from-bg to-transparent`).
- **Carousels**
  - Demo: `EventCarousel` rows by status and category.
  - Current: `Carousel` component with horizontal scroll; sections mapped to trending / near you / new / categories via `useHomeCarousels()`.
- **Cards**
  - Demo: `components/event-card.tsx` (Netflix‑style card, overlay gradient, title, date/location, hover CTA).
  - Current: `components/home/EventCard.tsx` now has similar structure but uses:
    - Our routing (`/events`, `/restaurants`, `/excursiones`, `/rentals`, `/hoteles` + `tenantId` query).
    - Our palette (emerald accent instead of purple).

**Conclusion**: `/home` sigue la **misma idea de layout** que el demo (hero + carruseles), pero los datos vienen del **API + PostgreSQL** vía `ApiRepository`, no LocalDB ni `useAppStore`.

**Pendientes y mejoras:** ver `docs/context/CONTEXT_PENDIENTES.md`.

---

## 2. Admin Dashboard

### 2.1 Demo structure

- **File**: `Yo-Te-Invito (Demo)/app/admin/page.tsx`
- **Data source**: `useAppStore()` exposing `currentUser`, `events`, `tickets`.
- **Main sections**:
  - Header with title "Dashboard Administrativo".
  - KPI cards (using `Card`):
    - Total Eventos
    - Entradas Vendidas
    - Accesos Validados
    - Tasa de Uso (% entradas usadas / vendidas)
  - Recent events table (using `Table`):
    - Columns: Evento, Fecha, Ubicación, Estado, Entradas
    - Links to `/admin/eventos/[id]` detail.
- **Important fields in demo `event` model** for admin:
  - `id`, `name`, `date`, `location`, `status`, `createdAt`.
  - Tickets joined via `tickets` array and `ticket.eventId`.

### 2.2 Current app mapping

- **Admin entry**: `apps/web/app/(portal)/admin/page.tsx` and related pages under `apps/web/app/(portal)/admin/*`.
- **Layout**: Admin uses **sidebar** (`PortalSidebar`) instead of horizontal nav; same for Gastro, Producer, Referrer. User-common (cuenta) keeps horizontal nav with 5px margin below navbar.
- **Dashboard**: Shows KPI cards (eventos, activos, tickets vendidos, reviews, scans) and a **Payouts pendientes** block with count and link to `/admin/payouts`. Publicidad removed from menu; `/admin/publicidad` redirects to `/admin`.
- **Forms** (Excursiones, Rentals, Eventos nuevo/editar): Fecha, Capacidad, Valor optional; image URL + local file upload; ofertas (optional text); ubicación (address + lat/lng).
- **Configuración**: Datos de contacto (email, teléfono, dirección) and CRUD de categorías (eventos, restaurants, rentals, excursiones); persisted in localStorage for demo.
- **Data source**: LocalStorage via `LocalRepository`; admin uses repositories for events, payouts, metrics.

### 2.3 Structural notes for future alignment

When aligning more closely with the demo **without breaking backend contracts**:

- We should ensure that admin has:
  - **Top‑level KPIs**: total events, tickets sold, validated entries, possibly reuse existing metrics from `MetricsRepo` / `LocalDB`.
  - **Recent events table** with at least:
    - Title → current `EventDetail.title`
    - Date → `EventDetail.startAt`
    - Location → `city` / `venueName`
    - Status → `status` field already present in LocalDB seed.
    - Entradas → count of tickets per event (from `LocalRepository.tickets`).
- These structures can be implemented using **existing repos** only; no direct LocalDB/LocalStorage access from components.

---

## 3. Producer / Productora Dashboard

### 3.1 Demo structure

- **File**: `Yo-Te-Invito (Demo)/app/productora/page.tsx`
- **Data source**: `useAppStore()` with `currentUser`, `getEventsByProductora`, `getTicketsByEvent`.
- **Main sections**:
  - Header with CTA "+ Crear Evento" → `/productora/eventos/nuevo`.
  - Summary cards:
    - Eventos Activos
    - Próximos Eventos
    - Eventos Pasados
  - Grids of `ProductoraEventCard` per group (active, future, past).
  - `ProductoraEventCard` includes:
    - Name, date, location
    - Status badge
    - Tickets sold, revenue (sum over `tandas`)
    - Link to `/productora/eventos/[id]`.

### 3.2 Current app mapping

- **Portal productor**: pages under `apps/web/app/(portal)/producer/*`; layout uses **sidebar** (`PortalSidebar`).
- **Event create/edit modal** (producer events page): Título, fecha, ciudad, lugar; **imagen** (URL + file upload); **ubicación** (dirección, lat/lng). Tandas: each ticket type is a "tanda" (by date or capacity); UI note explains "lo que se cumpla primero pasa a la siguiente".
- **Referidos** (`/producer/events/[eventId]/referrals`): Create link; optional **Regalar entradas de cortesía** (cantidad + tipo de entrada) assigned to the referrer when creating the link.
- **Data**: repositories and LocalDB seed.

### 3.3 Structural equivalence

- Both apps expose a **producer‑facing dashboard** that groups/filters events by lifecycle and shows per‑event KPIs.
- For future alignment we should:
  - Keep the "cards + per‑event metrics" pattern from the demo.
  - Use our existing metrics and events interfaces instead of the demo `event.tandas` field.
  - Preserve the route structure `/producer/events` and `/producer/events/[id]` while mirroring the layout idea from the demo.

---

## 4. Event Detail

### 4.1 Demo structure

- **File**: `Yo-Te-Invito (Demo)/app/eventos/[id]/page.tsx`
- **Key elements**:
  - Navbar at top.
  - Hero banner with large background image (via inline `backgroundImage`), gradients, category badge, featured badge, title, date, and location.
  - Left column: description + related events (`EventCarousel`).
  - Right column (sticky): ticket selection by `tandas` (price tiers), quantity selector, simulated purchase CTA.
- **Important fields in demo `event` model**:
  - `id`, `name`, `category`, `date`, `location`, `description`, `image`, `featured`, `tandas[]`.

### 4.2 Current app mapping

- **Route**: `apps/web/app/(public)/events/[eventId]/page.tsx` (plus supporting components under `components/home` / `components/events`).
- **Data model** (LocalDB seed / repositories):
  - `EventDetail` with fields like:
    - `id`, `tenantId`, `title`, `startAt`, `city`, `venueName`, `coverImageUrl`, `description`, `status`, `media`, etc.
  - Ticket types via `LocalRepository.events.getTicketTypes(eventId)` returning `TicketTypeResponse` (name, price, capacityAvailable, etc.).

### 4.3 Field mapping (demo → current LocalDB)

- `event.id` → `EventDetail.id`
- `event.name` → `EventDetail.title`
- `event.date` → `EventDetail.startAt`
- `event.location` → `EventDetail.city` / `venueName`
- `event.category` → `EventDetail.category` (string: `event`, `gastro`, `excursion`, `rental`)
- `event.image` → `EventDetail.coverImageUrl` (string | null)
- `event.tandas[]` → `TicketTypeResponse[]` (ticket types per event)

This mapping allows the current event detail to keep the **same conceptual layout** as the demo (hero + description + ticket types), but using the repository / LocalDB architecture prepared for a future backend.

---

## 4.4 Portal Gastronómico (Gastro)

- **Layout**: Sidebar (`PortalSidebar`). Nav: Dashboard, Contenido, Descuentos, **Resumen descuentos** (ex "Validaciones"), **Valoraciones**.
- **Dashboard**: Links to Contenido, Descuentos, Resumen; **PWA Scanner** download/open link (`/dev/scanner-sim`); **Valoraciones** link.
- **Contenido**: CRUD by event: create content (título, descripción, imagen URL o archivo, ubicación); edit inline.
- **Descuentos**: CRUD: create (código, tipo %, fijo, valor, fechas); alta/baja (toggle ACTIVE/INACTIVE); list shows **QR** placeholder (code + value) and **Usos** (validation count).
- **Resumen descuentos**: Historial de cantidad de gente que consumió descuentos (same validations list, retitled).
- **Valoraciones**: List reviews by event for the gastro owner.

---

## 5. LocalStorage & Seed (Mocks)

### 5.1 Current LocalDB usage

- **Factories**: `apps/web/lib/local-db/app-db.ts`
- **Implementation**: `apps/web/lib/local-db/LocalDB.ts`
- **Seed**: `apps/web/lib/local-db/seed.ts`
  - 1 tenant (`tenant-demo`)
  - Developer users (ADMIN, PRODUCER, GASTRO, REFERRER, USER, SCANNER) matching `DEVELOPER_USERS.md`.
  - Demo events with categories: `event`, `gastro`, `excursion`, `rental`.
  - Ticket types, orders, tickets, reviews, referral links, payouts, resale listings, gastro content/discounts, etc.
- **Dev tools**: `apps/web/app/(public)/dev/seed/page.tsx` to seed/reset/export LocalDB.

### 5.2 Alignment with demo expectations

- The demo app expects:
  - A rich set of **events** with categories and statuses.
  - Per‑user data (tickets, orders) for the developer users.
- The current LocalDB seed already follows this idea, but part of future phases will be:
  - Enriching event mocks (more realistic titles, cover images, categories) so that the new hero/cards layout always looks populated.
  - Ensuring that flows for `/home`, `/events/[id]`, `/me/tickets`, `/me/orders` match the behavior described in `DEVELOPER_USERS.md`.

---

## 6. Checklist for Future Phases (Backend Integration)

When replacing LocalStorage with a real backend, this document should be used as a checklist:

- **Routing & Layout**
  - [ ] Keep the same public routes: `/`, `/home`, `/events/[id]`, `/explore`, `/checkout`, `/me/*`.
  - [ ] Preserve hero + carousels on home and the Netflix‑style card layout.
- **Admin / Producer**
  - [ ] Provide APIs that return at least the fields used in the admin and producer dashboards (see sections 2 and 3).
  - [ ] Map backend enums/status codes to the same labels/colors already used in the UI.
- **Event Detail**
  - [ ] Ensure event detail endpoints provide the necessary fields to render the hero and ticket tiers.
  - [ ] Keep ticket types compatible with the current `TicketTypeResponse` shape.
- **Data Flow**
  - [ ] Implement API‑backed repositories that respect the same interfaces as `LocalRepository`.
  - [ ] Swap repository implementation via `RepositoriesProvider` without changing UI components.

This way, the frontend can preserve the **structure and UX** of the demo app while transitioning from LocalStorage to a real backend.

