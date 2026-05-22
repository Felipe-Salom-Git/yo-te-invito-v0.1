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

**Maturity**: Flujos productivos contra API + PostgreSQL (contenido manual; pago **demo** en checkout). Portales producer, admin, gastro, hotel, referrer, **portal usuario estándar `/me/*`**. Smokes/E2E con credenciales explícitas — sin seeds masivos ni `@demo.local`.

**Usuario estándar (2026-05):** comprador autenticado opera en `/me` (carrito, tickets, favoritos, eventos esperados, actividad, cuenta, **bandeja + push notifications**, seguir productoras). Rutas `/cuenta/*` redirigen a `/me`. Sin LocalDB ni usuarios demo automáticos.

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

- **Producer (productoras / “Proveedores v2”)**: portal pulido (slices 1–10 en checklist V2): dashboard `/producer` (métricas, engagement, alertas de aprobación/rechazo admin vía `/me/notifications`), eventos por estado, create/edit, tandas, cortesías, referidos, **perfil por bloques** (`/producer/profile` + slug **auto-único** desde nombre), **comentarios** (`/producer/comments`). Ficha pública `/producers/[id|slug]`. Valoraciones **comerciales** B2B. Navegación principal en **sidebar** del layout productor (sin duplicar accesos rápidos en dashboard).
- **Admin**: rol `ADMIN` en `User.role`; web `/admin/*` restringido a ADMIN; aprobación/rechazo de eventos notifica a productoras (in-app + email + push según preferencias). Inbox, disputas reseñas, users, config, **rentals** locales/productos, audit. Cuenta maestro: `user:restore-master` + re-login.
- Gastro/hotel: portales `/gastro/valoraciones`, `/hotel/valoraciones`.
- Gastro / Hotel / Referrer portals as documented in backend/frontend context.

### Portal usuario (`/me/*`)

- Migraciones: `user_portal_v1`, notificaciones, producer follows, **`UserPushSubscription`**; reventa marketplace **removida** (`remove_resale_marketplace`).
- Carrito persistido (`UserCart`), favoritos, eventos esperados, transferencias personales (`TicketTransferOffer`), bandeja notificaciones + **Web Push** (canal adicional, no reemplaza la bandeja).
- **V2.1.2:** inicio con alertas/recomendados; **Mi Carro**; preferencias (ciudad, categorías, productoras seguidas).
- **V2.1.3–V2.1.4:** activar push desde `/me/notifications`, preferencias por tipo de alerta, `deliver()` con deduplicación `PUSH`; transferencias y cron de reviews disparan push si corresponde.
- **V2.2 ticketera:** ticket comprador desde `TicketTemplate` o fallback premium; QR `yti:v1:` imprimible; estados visibles; validación scanner documentada en smokes.
- **Gastro follows:** seguir locales/restaurantes desde preferencias y ficha pública (`UserGastroFollow`).
- Smokes: `smoke:user-portal`, `smoke:notifications`, `smoke:producer-follows` + cleanup automático post-run.
- Doc detallada: `docs/user/USER_PORTAL.md`, `docs/user/TICKET_TRANSFER.md`, `docs/tickets/TICKET_CANVAS_STUDIO.md`.
- Checklist operativo: `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` (sincronizar con este archivo al cerrar ítems).

### Backend highlights

- Referrer ↔ producer relationships (`ProducerReferrerRelationship`).
- Inbox → gastro discounts / review moderation / **cola de disputas de reseñas** (`REVIEW_DISPUTE_REQUEST` + modelo `ReviewDisputeRequest`).
- **Reviews V2**: reseñas públicas (`Review` con `overallRating` + aspectos JSON, estados moderación, réplicas por rol); ranking en `Event.rankingScore` / carruseles `GET /public/events/recommended`; perfil comentarista; smoke `smoke:reviews`. Ver `docs/reviews/REVIEWS_V2.md`.
- Disputas con auditoría; ocultar del público al aceptar disputa (sin borrar reseña por defecto).
- Valoraciones B2B (`CommercialRelationshipReview`) — no mezclar con reseñas de eventos.
- Ticket templates (visual design JSON + QR zone rules).

---

## 5. Gaps

See **`docs/context/CONTEXT_PENDIENTES.md`** (checkbox backlog).

Summary: real payments, gastro scanner QR, image storage (vs data-URL), validación física ticket en staging, anonymous hero category tabs, SEO/loading polish.

---

## 6. Product / Design

- Black background, green accent, white text.
- Premium, cinematic, discovery-first (Netflix-style rails).

---

## 7. Dev database & QA

| Acción | Comando |
|--------|---------|
| Limpiar contenido tenant (conserva Felipe) | `pnpm db:cleanup-content` / `-- --confirm` |
| Reset BD completo (peligroso) | `pnpm db:reset-dangerous -- --confirm` |
| Limpiar artefactos smokes | `pnpm --filter api run smoke:cleanup` / `-- --confirm` |
| Inventario scripts | `docs/dev/SCRIPTS.md` |

Script cleanup: `apps/api/prisma/scripts/cleanup-content.ts` (preserva `felipe.e.salom@gmail.com`). Reset total: `db:reset-dangerous -- --confirm`.

**Limpieza demo (hecho):** eliminados seeds masivos, LocalDB web, rutas `/dev/seed`, marketplace reventa, Next.js API routes locales de auth/admin. Scripts unificados bajo prefijos `user:*`, `smoke:*`, `seed:subcategories`.

Guías: `docs/guides/README.md`, `DEVELOPER_SCRIPTS_GUIDE.md`, `SMOKE_TESTS_GUIDE.md`, `DEMO_REMOVAL.md`. Histórico: `docs/legacy/guides/`.

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
- `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
