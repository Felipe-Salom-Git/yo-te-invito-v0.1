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

**Producción:** VPS DonWeb (`yoteinvito.club`) + proyecto GCP `yoteinvito-1721413433327` (GCS privado `yti-prod-storage`; bucket público `yti-prod-public-assets`). **Storage V2 cerrado funcional en producción (2026-05-31).** Runbooks: `DONWEB_PRODUCTION_RUNBOOK.md` §24.9, `GOOGLE_CLOUD_RUNBOOK.md`, `GCS_STORAGE_STRATEGY.md` §22.

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
- **Legales:** `/legal/[slug]` (documentos publicados); footer con enlaces; aceptación en registro/checkout/portales — ver §5d.
- **Navbar V2 (2026-05):** navegación responsive modular (drawer mobile, selector ciudad, carro con badge, menú usuario simplificado, portales con sidebar/mobile nav). Auditoría: `docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`. Usuario maestro: sidebar unificado multi-portal (`MASTER_USER_EMAIL`).
- **Footer público V2 (2026-05-24):** pie modular dark premium; variantes por ruta; contacto vía `GET /public/platform-config`; oculto en portales. Auditoría: `docs/audits/PUBLIC_FOOTER_CLOSING_AUDIT.md`.

### Rentals (Equipos y Rentals) — V2 cerrado (checklist)

- **Admin**: CRUD **locales** (store) with structured **opening hours** (JSON), contact fields (`whatsappPhone`, etc.); CRUD **products** per local (header image + gallery).
- **Public discovery**: cards con badge «Alquiler», subcategoría/local, sin fecha/entradas; explore/home/categoría con filtros subcategoría; copy anti-alojamiento (`lib/rentals/publicCopy.ts`).
- **Public detail**: hero cover, galería sin duplicar header, sidebar contacto/local, CTA «Consultar disponibilidad» (card + sticky mobile), horario solo en card del local — **not** event ticketing layout (`RentalProductDetailContent`, not `PlaceDetailView`).
- Data: `RentalLocation` + `Event` (`category: rental`, `rentalLocationId`, `subcategoryId`).

### Producer / Admin / Gastro / Hotel / Referrer

- **Producer (productoras / “Proveedores v2”)**: portal pulido (slices 1–10 en checklist V2): dashboard `/producer` (métricas, engagement, alertas de aprobación/rechazo admin vía `/me/notifications`), eventos por estado, create/edit, tandas, cortesías, referidos, **perfil por bloques** (`/producer/profile` + slug **auto-único** desde nombre), **comentarios** (`/producer/comments`). Ficha pública `/producers/[id|slug]`. Valoraciones **comerciales** B2B. Navegación principal en **sidebar** del layout productor (sin duplicar accesos rápidos en dashboard).
- **Admin**: rol `ADMIN` en `User.role`; web `/admin/*` restringido a ADMIN; aprobación/rechazo de eventos notifica a productoras (in-app + email + push según preferencias). Inbox, **cola disputas** (`/admin/review-disputes`), **reporte reputación** (`/admin/reviews`), users, config, **rentals** locales/productos, **`/admin/legales`** (documentos versionados), audit. Cuenta maestro: `user:restore-master` + re-login.
- **Gastro V2 (cerrado):** portal `/gastro/*` (dashboard, contenido Prisma, descuentos, validaciones, valoraciones), ficha `/restaurants/[id]`, QR + scanner PWA, follows + alertas descuento. Docs: `docs/gastro/`, `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`.
- **Hoteles V2 (liviano, cerrado):** discovery Próximamente (sin gateway/carrusel); portal `/hotel` + `/hotel/editar`; ficha pública `/hoteles/[id]`; valoraciones `/hotel/valoraciones`; E2E `pnpm e2e:hotel` (`docs/hotel/HOTEL_E2E.md`).
- **Referidos V2 (cerrado):** propuesta → aceptación → acuerdo + link; comisión **% o fijo por entrada** al pagar; solicitud de pago y registro `mark-paid` (**liquidación manual externa**, sin custodia de fondos). Portales `/producer/referrals`, evento referrals, `/referrer`. Doc: `docs/referrals/REFERRALS_V2.md`; smoke `smoke:referrals`. Legacy `/me/commissions/request` convive (deprecación opcional).

### Portal usuario (`/me/*`)

- Migraciones: `user_portal_v1`, notificaciones, producer follows, **`UserPushSubscription`**; reventa marketplace **removida** (`remove_resale_marketplace`).
- Carrito persistido (`UserCart`), favoritos, eventos esperados, transferencias personales (`TicketTransferOffer`), bandeja notificaciones + **Web Push** (canal adicional, no reemplaza la bandeja).
- **V2.1.2:** inicio con alertas/recomendados; **Mi Carro**; preferencias (ciudad, categorías, productoras seguidas).
- **V2.1.3–V2.1.4:** activar push desde `/me/notifications`, preferencias por tipo de alerta, `deliver()` con deduplicación `PUSH`; transferencias y cron de reviews disparan push si corresponde.
- **V2.2 ticketera:** ticket comprador desde `TicketTemplate` o fallback premium; QR `yti:v1:` imprimible; estados visibles; validación scanner documentada en smokes.
- **Gastro follows:** seguir locales/restaurantes desde preferencias y ficha pública (`UserGastroFollow`).
- Smokes: `smoke:user-portal`, `smoke:notifications`, `smoke:producer-follows`, `smoke:referrals` + cleanup automático post-run.
- Doc detallada: `docs/user/USER_PORTAL.md`, `docs/user/TICKET_TRANSFER.md`, `docs/tickets/TICKET_CANVAS_STUDIO.md`.
- Checklist operativo: `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` (sincronizar con este archivo al cerrar ítems).

### Backend highlights

- Referidos V2: `ReferralCommercialProposal`, `ReferralCommercialAgreement`, `ReferralPaymentRequest`, comisión en `PAID` (`ReferralCommissionService`). Ver `docs/referrals/REFERRALS_V2.md`.
- Inbox → gastro discounts / review moderation / **cola de disputas de reseñas** (`REVIEW_DISPUTE_REQUEST` + modelo `ReviewDisputeRequest`).
- **Reviews V2** (checklist § Reviews cerrado): UI pública, perfil comentarista, filtros, cola admin disputas, notificaciones (`ReviewNotificationsService`), reporte admin (`GET /admin/reviews/report` + CSV). Ver `docs/reviews/REVIEWS_V2.md`; smoke `smoke:reviews`.
- Disputas con auditoría; ocultar del público al aceptar disputa (sin borrar reseña por defecto).
- Valoraciones B2B (`CommercialRelationshipReview`) — no mezclar con reseñas de eventos.
- Ticket templates (visual design JSON + QR zone rules).

---

## 5. Descubrimiento público — Estado cerrado (2026-05-22, Slices 1–8)

Bloque **Descubrimiento público** cerrado en checklist V2. Detalle: `docs/audits/PUBLIC_DISCOVERY_AUDIT.md`.

| Pieza | Estado |
|-------|--------|
| Gateway editorial (`/`, `/categorias`) | Cerrado — 2×2, sin hotel en grilla, footer home/explore |
| Home (`/home`) | Cerrado — 4 categorías, rails, metadata cards, hoteles “Próximamente” |
| Explore (`/explore`) | Cerrado — filtros URL, subcategoría, `fromPrice` / `producerName` |
| Categorías (`/categoria/*`) | Cerrado — hero, subcategorías, carruseles, cruzados |
| Metadata en cards | Cerrado — API + `ContentCard` |
| Visibilidad eventos vencidos | Cerrado — 1:00 AM día siguiente (AR) en `GET /public/events*` |
| Trending | Cerrado — `viewCount` + `rankingScore` en `/public/events/trending` |

**Fuera de este bloque:** pagos reales, storage imágenes, drift TS global (`registerPush`, etc.). Rentals V2 (WhatsApp, cards, subcategorías, anti-alojamiento, detalle mobile) cerrado en checklist § Rentals.

## 5a. Registro y onboarding por tipo de usuario — Estado cerrado (2026-05-24)

| Pieza | Estado |
|-------|--------|
| Wizard `/register` + legales SIGNUP | Cerrado — slices 1–14 |
| Schemas unificados signup/apply | Cerrado — `profile-onboarding.ts` |
| Email duplicado + ubicación hotel | Cerrado — slice 12.5 |
| Gastro provincia/ciudad (selects) | Cerrado — slice 12.6 |
| Rental signup | Excluido V2 — admin + CTA público |

Docs: `docs/onboarding/`, `docs/audits/REGISTER_ONBOARDING_AUDIT.md`. Checklist V2 § Registro y onboarding.

## 5b. Admin operativo — Estado cerrado (2026-05, Slices 1–5)

| Pieza | Estado |
|-------|--------|
| Dashboard `/admin` | Cerrado — KPIs `GET /admin/dashboard`, cola pendientes, accesos operativos |
| Eventos `/admin/eventos` | Cerrado — listado filtrado `GET /admin/events` |
| Usuarios `/admin/usuarios` | Cerrado — `GET /admin/users`, rol con confirmación; cuenta maestro protegida |
| Auditoría `/admin/auditoria` | Cerrado — `GET /admin/audit-logs` con filtros |
| Subcategorías `/admin/categorias` | Cerrado — CRUD 4 verticales; hoteles Próximamente |

Detalle API/UI: `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, checklist V2 § Admin operativo.

## 5c. Gastro y Hoteles V2 — Estado cerrado (2026-05-22)

| Vertical | Discovery | Portal | Público | QA |
|----------|-----------|--------|---------|-----|
| Gastro | Activo (`gastro` en gateway/home/explore) | `/gastro/*` operativo | `/restaurants/[id]` | `test:gastro-discount-qr`, `test:gastro-discount-scan` |
| Hoteles | Próximamente (sin tile gateway) | `/hotel`, `/hotel/editar` | `/hoteles/[id]` informativa | `pnpm e2e:hotel` (`E2E_HOTEL_*`, skip sin env) |

Checklist V2 § Gastro y Hoteles marcado. Auditoría: `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`.

## 5e. Footer público V2 — Estado cerrado (2026-05-24)

| Pieza | Estado |
|-------|--------|
| Variantes por ruta (`footerVisibility`, `RouteAwareFooter`) | Cerrado |
| UI full / minimal / hidden (`components/footer/*`) | Cerrado |
| Contacto público `GET /public/platform-config` | Cerrado |
| Sin doble pie `/categorias`, `/legal/*` | Cerrado |
| Legales + verticales + accesos + confianza | Cerrado |

Detalle: `docs/audits/PUBLIC_FOOTER_AUDIT.md`, cierre `PUBLIC_FOOTER_CLOSING_AUDIT.md`, smoke `PUBLIC_FOOTER_SMOKE.md`. Pendientes producto: datos reales Instagram/contacto/desarrollador, publicación legales.

## 5d. Legal Admin — Estado cerrado (2026-05-24)

| Pieza | Estado |
|-------|--------|
| Backend versionado + audit | Cerrado — draft/publish, una PUBLISHED por doc |
| Admin UI `/admin/legales` | Cerrado |
| Páginas públicas `/legal/*` | Cerrado |
| Aceptación `/me/legal/*` | Cerrado — por `documentVersionId` + contexto |
| Integración registro/checkout/footer/portales | Cerrado |
| QA + smokes `smoke:legal` | Cerrado (ejecutar con API + dev auth) |
| Import Markdown `seed:legal-content` | Cerrado — borradores desde `docs/legal/` |
| **Legales V2** — layout portales + listado admin | Cerrado — `PORTAL_BODY_CLASS`, tabla `min-w-[900px]` |
| **Redacción legal real** | Pendiente — publicar versiones aprobadas en admin |

Referencia: `docs/legal/LEGAL_ADMIN_MODULE.md`, `BACKEND_CONTEXT.md` §8, `FRONTEND_CONTEXT.md` §8e, `CONTEXT_PENDIENTES.md` § Legal Admin.

---

## 6. Gaps

See **`docs/context/CONTEXT_PENDIENTES.md`** (checkbox backlog).

Summary: real payments, image storage (vs data-URL), validación física ticket en staging, SEO/loading polish, E2E discovery automatizado, `smoke:gastro-discounts` npm unificado.

---

## 7. Product / Design

- Black background, green accent, white text.
- Premium, cinematic, discovery-first (Netflix-style rails).

---

## 8. Dev database & QA

| Acción | Comando |
|--------|---------|
| Limpiar contenido tenant (conserva Felipe) | `pnpm db:cleanup-content` / `-- --confirm` |
| Seed catálogo legal (idempotente) | `pnpm --filter api run seed:legal-documents` |
| Reset BD completo (peligroso) | `pnpm db:reset-dangerous -- --confirm` |
| Limpiar artefactos smokes | `pnpm --filter api run smoke:cleanup` / `-- --confirm` |
| Inventario scripts | `docs/dev/SCRIPTS.md` |

Script cleanup: `apps/api/prisma/scripts/cleanup-content.ts` (preserva `felipe.e.salom@gmail.com`). Reset total: `db:reset-dangerous -- --confirm`.

**Limpieza demo (hecho):** eliminados seeds masivos, LocalDB web, rutas `/dev/seed`, marketplace reventa, Next.js API routes locales de auth/admin. Scripts unificados bajo prefijos `user:*`, `smoke:*`, `seed:subcategories`.

Guías: `docs/guides/README.md`, `DEVELOPER_SCRIPTS_GUIDE.md`, `SMOKE_TESTS_GUIDE.md`, `DEMO_REMOVAL.md`. Histórico: `docs/legacy/guides/`.

**Maps / ubicación (Etapa B, 2026-06-01):** campos `address`, `geoLat`, `geoLng`, `googlePlaceId`, `province` (y `city` en rentals) en Event, Gastro, Hotel, RentalLocation, ExcursionOperator. UI: `LocationPickerMap` + fallback manual; público: `apps/web/lib/maps/public-location.ts` (Ver ubicación). Smoke API: `pnpm --filter api run smoke:maps-location`. Auditoría: `docs/audits/MAPS_LOCATION_AUDIT.md` §18–23.

---

## 9. AI Guidance

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
- `docs/legal/LEGAL_ADMIN_MODULE.md`
- `docs/tickets/TICKET_CANVAS_STUDIO.md`
