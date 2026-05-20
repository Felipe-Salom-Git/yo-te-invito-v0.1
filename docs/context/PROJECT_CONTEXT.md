# PROJECT CONTEXT — Yo Te Invito

High-level project-wide summary. **Current state as verified from the repository.**

---

## 1. Overview

**Yo Te Invito** is a multi-tenant platform for discovery and ticketing, plus verticals:

| Category | `Event.category` | Notes |
|----------|------------------|--------|
| Events | `event` | Ticketing, scanner, referrals |
| Gastronomy | `gastro` | Discounts, inbox promos, validations |
| Excursions | `excursion` | Content as events |
| **Rentals** | `rental` | **Locales** (`RentalLocation`) + **products** (events linked to a local) |
| Hotels | `hotel` | `HotelProfile`, portal `/hotel` |

**Maturity**: E2E demo flows (discovery → demo checkout → tickets → scan). Portals for producer, admin, gastro, hotel, referrer. Payments are demo-only.

---

## 2. Monorepo

```
yo-te-invito-v0.1/
├── apps/web/       # Next.js — discovery, portals
├── apps/api/       # NestJS + Prisma + PostgreSQL
├── apps/scanner/   # PWA door scanning
├── packages/shared/  # Zod schemas, contracts
└── docs/
```

- **Web** → API via `ApiRepository`.
- **Shared** → single validation/contracts source.

---

## 3. Architecture

```
[Next.js Web] ──HTTP──► [NestJS API] ──Prisma──► [PostgreSQL]
                              │
                         [Redis] ← BullMQ (email)
```

- Auth: NextAuth (web) + JWT / `X-Dev-User-Id` (dev API).
- Default public tenant: `tenant-demo`.

---

## 4. Implemented Scope (high level)

### Public

- Home, explore, category detail pages, checkout (demo), tickets, referrers directory, referral redirect `/r/[code]`.

### Rentals (Equipos y Rentals)

- **Admin**: CRUD **locales** (store) with structured **opening hours** (JSON); CRUD **products** per local (header image + gallery).
- **Public**: Product detail with hero cover, gallery thumbnails + modal, local card, WhatsApp CTA — **not** the same layout as event ticketing pages.
- Data: `RentalLocation` + `Event` (`category: rental`, `rentalLocationId`, `subcategoryId`).

### Producer / Admin / Gastro / Hotel / Referrer

- **Producer (productoras / “Proveedores v2”)**: events, ticket types, **Ticket Canvas Studio**, courtesies, referidos, payouts; **perfil público** (`ProducerProfile`) con página `/producers/[id|slug]`, portal por **bloques** en `/producer/profile` (+ `/create`, `/identity`, `/images`, `/contact`); **comentarios y disputas** de reseñas de eventos (`/producer/comments`, flujo admin `/admin/review-disputes`); valoraciones **comerciales** privadas productora↔referidor (separadas de reseñas públicas).
- Admin: users, event approval, inbox (gastro promos, review moderation, **solicitudes de disputa de reseñas**), profiles (incl. hotel), config, **rentals locales/products**, audit.
- Gastro / Hotel / Referrer portals as documented in backend/frontend context.

### Backend highlights

- Referrer ↔ producer relationships (`ProducerReferrerRelationship`).
- Inbox → gastro discounts / review moderation / **cola de disputas de reseñas** (`REVIEW_DISPUTE_REQUEST` + modelo `ReviewDisputeRequest`).
- Reseñas públicas de eventos (`Review`); disputas con auditoría (`AuditLog`); ocultar del público al aceptar disputa (sin borrar reseña por defecto).
- Valoraciones B2B (`CommercialRelationshipReview`) — no mezclar con reseñas de eventos.
- Ticket templates (visual design JSON + QR zone rules).

---

## 5. Gaps

See **`docs/context/CONTEXT_PENDIENTES.md`** (checkbox backlog).

Summary: real payments, gastro scanner QR, image storage (vs data-URL), ticket render from template, anonymous hero category tabs, SEO/loading polish.

---

## 6. Product / Design

- Black background, green accent, white text.
- Premium, cinematic, discovery-first (Netflix-style rails).

---

## 7. Demo database cleanup

Script: `apps/api/prisma/scripts/cleanup-demo.ts`

```bash
pnpm db:cleanup-demo              # dry-run
pnpm db:cleanup-demo -- --confirm # destructive (dev only)
```

Keeps one user (`felipe.e.salom@gmail.com`), tenant, `PlatformConfig`, subcategories (optional delete flag). Removes all events, rental locales, orders, profiles, etc.

---

## 8. AI Guidance

1. Extend existing patterns; avoid rewrites.
2. Use `packages/shared` + repository interfaces.
3. Small reversible slices.
4. Check `CONTEXT_PENDIENTES.md` before large work.

---

## References

- `docs/context/AI_ENTRYPOINT.md`
- `docs/context/BACKEND_CONTEXT.md`
- `docs/context/FRONTEND_CONTEXT.md`
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
