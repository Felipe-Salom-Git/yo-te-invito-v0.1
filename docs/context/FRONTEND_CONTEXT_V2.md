# FRONTEND_CONTEXT_V2.md
## Project: Yo Te Invito — Frontend Web
## Mode: LocalStorage Edition (Backend-ready architecture)

Documento actualizado de la arquitectura frontend, esquemas, rutas y reglas de dominio para **Yo Te Invito**.

---

# 1. Objetivo del Proyecto

Frontend de **Yo Te Invito**, plataforma de descubrimiento y ticketing de eventos, con arquitectura preparada para backend, usando **localStorage** como persistencia temporal.

Flujo demo soportado:

```
Intro (SplashIntro)
→ Home
→ Explore Events
→ Event Detail
→ Checkout
→ Ticket Issuance
→ My Tickets
→ Ticket QR View (/me/tickets/[ticketId])
```

Objetivo: minimizar refactors al migrar de localStorage a API real.

---

# 2. Stack Tecnológico

| Tecnología | Uso |
|------------|-----|
| Next.js 15 | App Router |
| React 18 | UI |
| TypeScript | Tipado estricto |
| TailwindCSS | Estilos |
| TanStack Query | Cache y data fetching |
| Zod | Validación de formularios y schemas |
| NextAuth | Auth (preparado) |
| Framer Motion | Animaciones (SplashIntro) |

---

# 3. Branding

- **Background**: black
- **Accent**: emerald/green
- **Contrast**: white

**Logo**: `apps/web/public/brand/logo.png`

**Componente centralizado**: `components/brand/Logo.tsx`

Variantes: `icon` | `with-text` | `navbar` | `auth` | `splash`

---

# 4. Principios de Arquitectura

## 4.1 Sin acceso directo a persistencia desde UI
- No `localStorage` directo
- No `fetch` directo
- No lógica de API directa

Todo pasa por **repositorios**.

## 4.2 Query-first
- TanStack Query para datos
- Hooks que usan `useRepositories()`

## 4.3 Query keys centralizados
- `lib/query/keys.ts` — única fuente de verdad para cache e invalidación

## 4.4 Consistencia de dominio
- Labels y estados en `lib/domainLabels.ts`
- Badges en `components/domain/StatusBadge.tsx`

---

# 5. Arquitectura de Datos

```
UI Components
      ↓
Query Hooks (TanStack Query)
      ↓
Repository Interfaces (repositories/interfaces.ts)
      ↓
LocalRepository | ApiRepository
      ↓
LocalDB (localStorage) | API HTTP
```

## Repositorios

| Repositorio | Responsabilidad |
|-------------|-----------------|
| `EventsRepo` | list, search, trending, getDetail, getTicketTypes, create, update |
| `TicketsRepo` | listByOwner, listByEvent, get, create, update, delete |
| `OrdersRepo` | get, create, confirmDemoPayment |
| `ReviewsRepo` | list, create |
| `ReferralsRepo` | lookup, listLinks, listLinksByUser, createLink |
| `CourtesiesRepo` | list, create, fetchTicketTypes |
| `MetricsRepo` | getEventMetrics, getPlatformMetrics |
| `ProducersRepo` | get |
| `ScannerRepo` | scan, listScanLogs |
| `TicketTypesRepo` | create, update |
| `UsersRepo` | getMe, getMyTickets |

---

# 6. Esquemas Zod

## 6.1 Domain (lib/schemas/domain.ts)
- `TicketStatusSchema`: VALID | USED | REVOKED
- `RoleSchema`: ADMIN, PRODUCER_OWNER, PRODUCER_STAFF, GASTRO_OWNER, REFERRER, SCANNER, USER
- `EventStatusSchema`: DRAFT, PENDING, APPROVED, PAUSED, CANCELLED
- `OrderStatusSchema`: PENDING_PAYMENT, PAID, CANCELLED, EXPIRED, REFUNDED
- `ScanResultSchema`: OK, ALREADY_USED, INVALID, REVOKED
- Schemas de entidades: User, Event, Ticket, Order, Review, etc.

## 6.2 Review (lib/schemas/review.ts)
- **Restaurant/Producer**: servicioBrindado, atencion, localEstetica, comment?
- **Excursion/Rental**: servicio, atencionBrindada, comment?
- **Evento genérico**: score, comment?
- `EntityType`: restaurant | producer | excursion | rental | event
- `getReviewSchema(entityType)` / `getDimensionLabels(entityType)`

## 6.3 Checkout (lib/schemas/checkout.ts)
- `checkoutFormSchema`: email, firstName, lastName, phone?

---

# 7. Query Keys (lib/query/keys.ts)

| Namespace | Keys |
|-----------|------|
| eventsKeys | all, list, search, trending, detail, byProducer |
| homeKeys | all, trending, nearYou, new, category |
| ticketsKeys | all, me, byEvent, detail |
| ticketTypesKeys | all, byEvent |
| reviewsKeys | all, byEvent |
| ordersKeys | all, detail |
| exploreKeys | all, search |
| producersKeys | all, detail |
| metricsKeys | platform, admin |
| referralsKeys | byUser |
| meKeys | all, detail |

---

# 8. Estructura de Carpetas Actual

```
apps/web
│
├─ app
│   ├─ (public)/
│   │   ├─ page.tsx              # Entry → SplashIntro → /home
│   │   ├─ home/
│   │   ├─ explore/
│   │   ├─ events/[eventId]/
│   │   ├─ content/[id]/
│   │   ├─ producers/[id]/
│   │   ├─ checkout/
│   │   ├─ checkout/[eventId]/
│   │   ├─ checkout/success/
│   │   ├─ r/[code]/             # Referral redirect
│   │   └─ dev/
│   │       ├─ local-db/
│   │       ├─ scanner-sim/
│   │       └─ seed/
│   │
│   ├─ (portal)/                 # Auth required
│   │   ├─ cuenta/
│   │   │   ├─ layout.tsx
│   │   │   ├─ page.tsx
│   │   │   ├─ preferencias/
│   │   │   ├─ eventos-asistidos/
│   │   │   └─ eventos-esperados/
│   │   │
│   │   ├─ me/tickets/
│   │   │   ├─ page.tsx
│   │   │   └─ [ticketId]/       # Ticket QR viewer
│   │   │
│   │   ├─ admin/
│   │   │   ├─ layout.tsx
│   │   │   ├─ page.tsx          # Dashboard + metrics
│   │   │   ├─ audit/
│   │   │   ├─ eventos/
│   │   │   ├─ productoras/
│   │   │   ├─ tickets/
│   │   │   ├─ configuracion/
│   │   │   └─ publicidad/
│   │   │
│   │   ├─ producer/
│   │   │   ├─ page.tsx
│   │   │   └─ events/
│   │   │       ├─ page.tsx
│   │   │       └─ [eventId]/
│   │   │           ├─ page.tsx
│   │   │           ├─ courtesies/
│   │   │           └─ referrals/
│   │   │
│   │   ├─ referrer/
│   │   └─ gastro/
│   │
│   └─ (auth)/
│       ├─ login/
│       └─ logout/
│
├─ components
│   ├─ brand/
│   │   └─ Logo.tsx
│   ├─ splash/
│   │   └─ SplashIntro.tsx
│   ├─ home/
│   │   ├─ Carousel.tsx
│   │   └─ EventCard.tsx
│   ├─ domain/
│   │   └─ StatusBadge.tsx
│   ├─ reviews/
│   │   └─ ReviewForm.tsx
│   ├─ auth/
│   │   └─ ProtectedLayout.tsx
│   ├─ Navbar.tsx
│   ├─ NavbarUserMenu.tsx
│   ├─ Footer.tsx
│   ├─ PageContainer.tsx
│   ├─ SectionTitle.tsx
│   └─ ui/                       # Button, Card, Input, Modal, Badge, etc.
│
├─ lib
│   ├─ query/
│   │   ├─ keys.ts               # Query keys centralizados
│   │   ├─ events.ts
│   │   ├─ home.ts
│   │   ├─ explore.ts
│   │   ├─ tickets.ts
│   │   └─ ...
│   ├─ schemas/
│   │   ├─ domain.ts
│   │   ├─ review.ts
│   │   ├─ checkout.ts
│   │   └─ index.ts
│   ├─ domainLabels.ts
│   ├─ introStorage.ts
│   ├─ local-db/
│   │   ├─ LocalDB.ts
│   │   ├─ app-db.ts
│   │   ├─ seed.ts
│   │   └─ ...
│   └─ auth/
│
├─ repositories
│   ├─ interfaces.ts             # Contratos de dominio
│   ├─ LocalRepository.ts        # Implementación localStorage
│   ├─ ApiRepository.ts          # Placeholders para API
│   ├─ context.tsx               # RepositoriesProvider
│   └─ index.ts
│
├─ hooks
│   ├─ useTenant.ts
│   ├─ useRole.ts
│   └─ useMe.ts
│
└─ context/
    └─ CartContext.tsx
```

---

# 9. Rutas Principales

| Ruta | Descripción |
|------|-------------|
| `/` | Entry con SplashIntro; redirige a /home |
| `/home` | Home con hero, carruseles, destacados |
| `/explore` | Búsqueda y filtros de eventos |
| `/events/[eventId]` | Detalle de evento, entradas, reviews |
| `/checkout` | Checkout carrito global |
| `/checkout/[eventId]` | Checkout directo por evento |
| `/me/tickets` | Mis tickets agrupados por evento |
| `/me/tickets/[ticketId]` | Vista QR del ticket |
| `/cuenta` | Área de cuenta |
| `/admin` | Dashboard admin + métricas |
| `/producer` | Panel productor |
| `/producer/events` | Lista eventos del productor |
| `/login`, `/logout` | Auth |

---

# 10. Estados de Dominio

## Ticket
- VALID | USED | REVOKED

## Orden
- PENDING_PAYMENT → PAID (vía confirmDemoPayment)

## Resultado de scan
- OK | ALREADY_USED | REVOKED | INVALID

## Evento
- DRAFT | PENDING | APPROVED | PAUSED | CANCELLED

---

# 11. Intro Storage

**Key**: `yti_intro_last_seen`

**Lógica** (`lib/introStorage.ts`):
- `shouldShowIntro()`: true si primera visita o > 24h desde último visto
- `setLastSeen()`: al completar intro
- `clearLastSeen()`: para "Replay Intro"

---

# 12. Referencias

- `docs/guides/PROMPT_HEADER.md`
- `docs/guides/FRONTEND_COMPONENT_TEMPLATE.md`
- `docs/guides/TEMPLATES_GUIDE_ES.md`
