# Yo Te Invito — Frontend Roadmap — Chat 02

## Goal
Expand the frontend from the basic public flow into the **full public catalog**, **user account area**, and **first operation shells** for provider roles.

## Working rules
- Preserve repository abstraction
- Preserve query hook usage
- Preserve domain naming
- Keep mobile-first UX
- No app-wide rewrites
- No direct storage or direct fetch from UI

## Scope for this chat
This chat should cover:
- public detail pages beyond events
- reviews/ratings flow
- public resale page
- user account area
- producer foundations

## Slices

### Slice 17 — Restaurant Detail
**Route**
- `/restaurants/[id]`

**Features**
- editorial content
- image carousel
- presence / validation block
- request QR / discount code CTA
- detailed rating summary
- reviews list

---

### Slice 18 — Excursion Detail
**Route**
- `/excursiones/[id]`

**Features**
- gallery
- informative ficha
- description
- WhatsApp contact CTA
- rating summary
- reviews

---

### Slice 19 — Rental Detail
**Route**
- `/rentals/[id]`

**Features**
- gallery
- informative ficha
- description
- WhatsApp contact CTA
- rating summary
- reviews

---

### Slice 20 — Producer Public Profile
**Route**
- `/productoras/[id]`

**Features**
- editorial content
- image carousel
- list of linked events
- rating summary
- reviews

---

### Slice 21 — Public Review / Rating Flow
**Objective**
Implement public reviews and typed score forms depending on entity type.

**Routes**
- embedded in detail pages or `/valorar/[entityType]/[id]`

**Scoring rules**
Restaurant and Producer:
- Servicio brindado
- Atención
- Local / estética

Excursión and Rental:
- Servicio
- Atención brindada

**Deliverables**
- Zod validation
- entity-specific score model
- review mutation hook
- cache refresh

---

### Slice 22 — Public Resale Listing
**Route**
- `/reventa/[listingId]`

**Features**
- public ticket listing card
- event summary
- safe seller-agnostic presentation
- demo purchase CTA
- rules/disclaimer block

---

### Slice 23 — User Account Area Shell
**Routes**
- `/cuenta`
- `/cuenta/preferencias`
- `/cuenta/eventos-asistidos`
- `/cuenta/eventos-esperados`

**Features**
- account navigation
- settings shell
- preferences shell
- attended events list
- expected events list

---

### Slice 24 — Producer Dashboard Shell
**Route**
- `/productora/dashboard`

**Features**
- KPI cards
- sales-by-day chart area
- top events
- top referrals
- 90% alerts
- export entry points

---

### Slice 25 — Producer Events List
**Route**
- `/productora/eventos`

**Features**
- list/grid of owned events
- create CTA
- edit CTA
- soft delete CTA
- status badges
- duplicate placeholder for V2

**Status values**
- `draft`
- `pending`
- `approved`
- `paused`
- `cancelled`
- `deleted`

---

### Slice 26 — Producer Event Management Detail
**Route**
- `/productora/eventos/[id]`

**Tabs**
- Resumen
- Entradas
- Tickets vendidos
- Cortesías
- Referidos
- Plantilla PDF
- Exports
- Solicitud de pago

---

### Slice 27 — Event Form Create/Edit Shell
**Routes**
- `/productora/eventos/nuevo`
- `/productora/eventos/[id]/editar`

**Features**
- title
- description/editorial
- category
- city
- images upload shell
- location fields
- status shell

---

### Slice 28 — Pricing / Ticket Types / Tandas
**Embedded in**
- Producer event management detail → Entradas tab

**Features**
- ticket types
- sequential batches per type
- active batch indicator
- sellability awareness

---

### Slice 29 — Producer Referrals Management
**Routes**
- `/productora/referidos`

**Features**
- CRUD list
- assign events
- auto-password placeholder
- per-event sales links
- commission state visibility

---

### Slice 30 — Payout Requests / History
**Routes**
- `/productora/payouts`
- and/or event tab integration

**Features**
- request payout form
- bank/account data form
- history table/list
- status visibility

---

### Slice 31 — Producer Content Management
**Route**
- `/productora/contenido`

**Features**
- editorial content editing
- image management shell
- public profile preview block

---

### Slice 32 — Admin Shell Foundation
**Routes**
- `/admin`
- `/admin/dashboard`
- `/admin/eventos`
- `/admin/productoras`
- `/admin/tickets`
- `/admin/configuracion`
- `/admin/publicidad`

**Features**
- admin shell
- navigation
- dashboard shell
- entry cards to platform modules

## Exit criteria for Chat 02
By the end of this roadmap, the frontend should have:
- full public catalog detail pages
- review/rating flow
- public resale base
- user area shell
- producer management shell foundation
- admin foundation shell
