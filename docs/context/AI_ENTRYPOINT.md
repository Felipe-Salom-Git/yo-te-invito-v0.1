# AI_ENTRYPOINT.md
AI Development Entry Point

Read this file **before generating or modifying code**.

---

## 0. Non-negotiable rules (2026)

| Rule | Detail |
|------|--------|
| **Pago demo sí** | `POST /public/payments/:id/demo-confirm`, provider `DEMO` en checkout — no eliminar |
| **Datos demo automáticos no** | Sin `demo:seed`, `demo:load`, LocalDB, usuarios `@demo.local` por defecto |
| **Usuario maestro** | `felipe.e.salom@gmail.com` — preservado por `db:cleanup-content`; no borrar en scripts |
| **No commitear secretos** | `.env` local; usar `.env.example` |
| **Rama Getnet activa** | `feat/v1-s03-api-foundation` — **no** `development` (eliminada); **no** tocar `main` salvo instrucción explícita |
| **V3.2 discovery** | Código cerrado (slices 0–11); QA manual pendiente — [`V3_2_QA_CLOSING.md`](../audits/V3_2_QA_CLOSING.md). Event/Gastro `comingSoon`; preview por rol en `category-availability.ts`. Hotfixes 2026-08: cache HTML, roles owners, auth resend, horarios overnight — ver § Hotfixes V3.2. |
| **V3.3 funcional/operativa** | **Activa** — Etapa 0 auditoría cerrada; **Etapas 1–6** implementadas (UX pública/mobile, Avatar, Scanner V3, Gastro Multi-local + Approval, Descuentos Gastro V3, QR Studio); QA manual/integración acumulado pendiente — [`V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`](../audits/V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md), [`V3_3_STAGE_2_USER_AVATAR_CLOSING.md`](../audits/V3_3_STAGE_2_USER_AVATAR_CLOSING.md), [`V3_3_STAGE_3_SCANNER_V3_CLOSING.md`](../audits/V3_3_STAGE_3_SCANNER_V3_CLOSING.md), [`V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md`](../audits/V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md), [`V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md`](../audits/V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md), [`V3_3_STAGE_6_QR_STUDIO_CLOSING.md`](../audits/V3_3_STAGE_6_QR_STUDIO_CLOSING.md), checklist [`Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`](../dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md). |
| **Handoff nuevo chat** | [`NEXT_CHAT_HANDOFF.md`](./NEXT_CHAT_HANDOFF.md) — punto de entrada operativo (stack, prod, hotfixes, pendientes). |

Detalle histórico demo: [guides/DEMO_REMOVAL.md](../guides/DEMO_REMOVAL.md). Portal: [user/USER_PORTAL.md](../user/USER_PORTAL.md).

---

## Getnet Web Checkout Redirect — estado actual

- **Rama activa:** `feat/v1-s03-api-foundation` (desplegada en VPS; último código: `920c5d7`; hotfixes V3.2 ago-2026 pusheados).
- **`main`:** sin cambios.
- **`development`:** descartada y eliminada — no mergear spikes ni commits.
- **V1:** Redirect (`redirect_url`); iFrame/Lightbox fuera de V1.
- **VPS:** smokes config/auth/dry-run OK; aliases portal OK; redirect app → Getnet hosted checkout OK — [GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md](../payments/GETNET_WEBCHECKOUT_VPS_REDIRECT_SMOKE.md).
- **Webhook Portal Getnet:** URL + Basic Auth configurados en portal (`api.yoteinvito.club/.../webhook`). Prueba de pago: webhook **llegó** al API pero fue rechazado por schema (`status` en raíz vs `payment.result.status`) — **corregido en código** (`ed0cc3e`).
- **Payload Web Checkout:** estado en `payment.result.status` (`Authorized` → aprobado); lookup por `payment_intent_id` / `order_id` — [GETNET_WEBHOOK.md](../payments/GETNET_WEBHOOK.md).
- **Pendiente operativo:** deploy `ed0cc3e` en VPS → re-probar pago mínimo → confirmar `Authorized` procesado + tickets automáticos.
- **Fulfillment:** `OrderFulfillmentService` vía `GetnetReconciliationService`; no emitir tickets fuera de ahí.
- **Handoff:** [NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md](./NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md) · cierre [GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md](../payments/GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md).

---

## V3.3 — Mejoras funcionales y operativas (2026-08)

| Etapa | Estado | Referencia |
|-------|--------|------------|
| **0 — Auditoría** | Cerrada | [`V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md`](../audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md) |
| **1 — UX pública / mobile** | Código implementado; QA manual pendiente | [`V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`](../audits/V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md) |
| **2 — Perfil usuario / Avatar** | Código implementado; QA manual acumulado pendiente | [`V3_3_STAGE_2_USER_AVATAR_CLOSING.md`](../audits/V3_3_STAGE_2_USER_AVATAR_CLOSING.md) |
| **3 — Scanner V3** | Código implementado + auth hardening; migración DB smoke pendiente | [`V3_3_STAGE_3_SCANNER_V3_CLOSING.md`](../audits/V3_3_STAGE_3_SCANNER_V3_CLOSING.md), [`V3_3_SCANNER_USERNAME_AUTH.md`](../audits/V3_3_SCANNER_USERNAME_AUTH.md) |
| **4 — Gastro Multi-local + Approval** | Código implementado + pre-cierre hardening; QA manual acumulado pendiente | [`V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md`](../audits/V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md), [`V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md`](../audits/V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md) |
| **5 — Descuentos Gastro V3** | Código implementado + hardening `type`/`value`; QA manual + DB smoke pendientes | [`V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md`](../audits/V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md), [`V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md`](../audits/V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md) |
| **6 — QR Studio** | Código implementado + hardening canónico; QA manual + DB smoke pendientes | [`V3_3_STAGE_6_QR_STUDIO_AUDIT.md`](../audits/V3_3_STAGE_6_QR_STUDIO_AUDIT.md), [`V3_3_STAGE_6_QR_STUDIO_CLOSING.md`](../audits/V3_3_STAGE_6_QR_STUDIO_CLOSING.md) |

**Etapa 1 — resumen:** cards descuento discovery → ficha gastro; Home/Explore en nav mobile; modales convencionales centrados; scroll táctil galerías; rails subcategoría solo con **≥5** publicaciones (**sin autoplay**); jerarquía CTA gastro; OG dinámico `/descuentos/[id]`; copy público **Actividades** (`excursionPublicCopy.ts`) con clave técnica **`excursion`** sin cambios.

**Etapa 2 — resumen:** avatar en `User.preferences.avatarUrl` (sin migración Prisma); upload GCS scope `user` + `purpose=profile`; UI `/me/account` (`MeAccountAvatarSection`), navbar, reviews y `/users/[userId]` vía `UserReviewerAvatar`; validación HTTP(S), sin data URL; helper `readUserAvatarUrl()`.

**Etapa 3 — resumen:** PWA **Yo Te Invito Scanner** (branding dark); short codes manuales (tickets `shortTicketCode` 8 chars; gastro `GastroDiscountClaim.shortCode` 6 chars); cámara rápida (1 target / target persistido / `?mode=camera`); auth **username + password** (`User.username` global unique; `User.email` nullable en DB); login legacy por email; bypass `emailVerified` **solo** `Role.SCANNER` (`198fc38`); migraciones `20260831120000_gastro_claim_short_code` (pgcrypto idempotente) y `20260831130000_user_scanner_username` — **smoke DB pendiente**.

**Etapa 4 — resumen:** `GastroProfile` = unidad operativa/pública independiente; cuenta Gastro gestiona **N** perfiles vía `UserGastroMembership`; nuevos perfiles → `PENDING` hasta aprobación admin; copy/snapshot ubicación+contactos (`copyFromProfileId`); `GastroOwnershipService` + `?profileId=` como contexto de navegación (no autorización); descuentos resource-specific por `discountId` → `gastroProfileId`; API build restaurado (`user-contact.util.ts`); notificaciones aprobación/rechazo de perfil → **cerradas en Etapa 5 (A9)**.

**Etapa 5 — resumen:** descuento publicado `ACTIVE`/`APPROVED` + `pendingUpdate` opcional (sin `GastroDiscountVersion`); edición material (incl. `type`/`value`) no baja el publicado; soft archive `archivedAt`; expiry scheduler (`GastroDiscountExpiryService`); admin create on-behalf (`origin ADMIN` → `ACTIVE`); notificaciones lifecycle + A9 de Etapa 4; hardening `c91c205`. Migración `20260831140000_gastro_discount_v3_lifecycle` — **smoke DB pendiente**.

**Etapa 6 — resumen:** editor visual de cupón QR (sin Canva.com); modelo `GastroDiscountTemplate` 1:0..1 por `GastroDiscount` (no se reutilizó Prisma `TicketTemplate`); `DiscountTemplateRenderer` + fallback `GastroDiscountQrCard`; bindings canónicos obligatorios y visibles (`discountValue`, `discountTitle`, `shortCode` + zona QR); presets Clásico/Minimal/Premium/Promoción; Studio `/gastro/descuentos/[id]/qr-studio`; preview Admin; `TicketStudioClient` no tocado. Migración `20260831150000_gastro_discount_visual_template` — **smoke DB pendiente**. Hardening `de4e07d`.

**Próxima etapa V3.3:** Etapa 7 — Actividades + Cupones (ver checklist). No iniciar sin instrucción explícita.

---

## Jornada 2026-06-15 — resumen operativo

Rama activa: `feat/v1-s03-api-foundation` (último push documental: ver `git log`; recientes: `3fafa18` favicon … `772a227` footer … `5353ae2` GEO address).

| Bloque | Estado | Referencia |
|--------|--------|------------|
| **Scanner PWA operativo** | Cerrado funcionalmente; QA extendida en evento real/mobile opcional | Commits `0ad9564`…`cbc4866`, `84707cd`; Etapas 5–6 previas |
| **Multi-fecha / ticket types** | Corregido — formulario envía `occurrenceId` | `ea9c2d7` |
| **Banners editoriales** | Fix código pusheado; **QA manual prod pendiente** si persiste reemplazo | `d48741c`–`ae971ba`; `V3_1_STAGE_16_BANNERS_RENDERING_CLOSING.md` |
| **Ciudad / Explore** | Selector sacado del navbar; filtro en `/explore` | `fda9bc6`; `V3_1_STAGE_16_EXPLORE_CITY_FILTER_CLOSING.md` |
| **GEO / Maps Georef** | Cerrado prod 2026-06-23 (keys, migrate, QA Bariloche + ubicar mapa) | `7957994`–`5353ae2`; `GEO_MAPS_STAGE_CLOSING.md` |
| **Footer público refresh** | Layout + assets marca + datos reales prod OK | `772a227`; `components/footer/*`, `footerPublicConfig.ts` |
| **Branding web** | Favicon, intro, share OG alineados y QA share OK prod | `9c1f83b`–`3fafa18`; `lib/seo/brandAssets.ts`, `/brand/*` |
| **Gastro descuentos QR / cortesías V2** | Código cerrado 2026-06-23; QA manual staging/prod pendiente | `GASTRO_QR_COURTESIES_AUDIT.md` |
| **Gastro Discounts V2.1** | Recurrente semanal + admin contador + fix emails cortesía (2026-06-23) | `GASTRO_QR_COURTESIES_AUDIT.md` § V2.1 |
| **Gastro Discounts V2.2** | Sin límite diario; detalle/métricas/activar/editar descuentos (2026-06-23) | `GASTRO_QR_COURTESIES_AUDIT.md` § V2.2 |
| **Admin/Gastro/Scanner hotfix operativo** | Código 2026-06-23; QA manual pendiente | `ADMIN_GASTRO_SCANNER_HOTFIX_AUDIT.md` |
| **Getnet webhook** | Fix payload en código; abandonado como implementación activa — nueva pasarela TBD | `ed0cc3e` |
| **Ticketera Próximamente** | UI productora bloqueada; solo publicidad operativa | `TICKETING_CREATION_ENABLED` |
| **Mensajes email/spam** | Post-registro + post-QR en web | `EmailInboxNotice` |
| **Admin Deep Delete** | Preflight + modal + delete transaccional (2026-06-23) | `ADMIN_DEEP_DELETE_AUDIT.md` |

Detalle y pendientes priorizados: **`CONTEXT_PENDIENTES.md` § Jornada 2026-06-15**, **§ Hotfixes V3.2 (2026-08)** y **§ Etapa UX operativa**.

## Hotfixes V3.2 — agosto 2026 (rama `feat/v1-s03-api-foundation`)

| Hotfix | Commit | Doc |
|--------|--------|-----|
| Caché HTML pública Next.js | `15f2776` | [`V3_2_HOTFIX_PUBLIC_CACHE_CLOSING.md`](../audits/V3_2_HOTFIX_PUBLIC_CACHE_CLOSING.md) |
| Category availability por rol | `b8dc571` | [`V3_2_SLICE_10_COMING_SOON_CLOSING.md`](../audits/V3_2_SLICE_10_COMING_SOON_CLOSING.md) |
| Reenvío email verificación | `ff6f8e0` | [`AUTH_EMAIL_VERIFICATION_RESEND_CLOSING.md`](../audits/AUTH_EMAIL_VERIFICATION_RESEND_CLOSING.md) |
| Horarios gastro overnight | `920c5d7` | [`V3_2_HOTFIX_GASTRO_OVERNIGHT_HOURS_CLOSING.md`](../audits/V3_2_HOTFIX_GASTRO_OVERNIGHT_HOURS_CLOSING.md) |

**Caché:** `/`, `/home`, `/explore`, `/categoria/*` → `force-dynamic` + headers `no-store`; no cachear HTML dinámico; `/_next/static/*` sin cambios.

**Roles discovery:** Eventos preview → `ADMIN`, `PRODUCER_OWNER`, `PRODUCER_STAFF`. Gastronomía preview → `ADMIN`, `GASTRO_OWNER`. Rentals/excursiones públicas.

**Auth resend:** `POST /auth/resend-verification-email`; respuesta genérica; rate limit 3/email/15min, 10/IP/15min; UX en Login con `EMAIL_NOT_VERIFIED`.

**Horarios:** `20:00→00:00` = cierre día siguiente; error de horarios bajo fieldset horarios (no Provincia).

**Pendiente operativo:** deploy VPS + QA prod de los cuatro hotfixes. Handoff: [`NEXT_CHAT_HANDOFF.md`](./NEXT_CHAT_HANDOFF.md).

## Etapa UX operativa — Ticketera Próximamente + mensajes email/spam

- Ticketera temporalmente deshabilitada en UI para usuarios/productoras (`apps/web/lib/producer/ticketing-config.ts`).
- Opción con ticketera queda como Próximamente; URL directa `?mode=ticketed` muestra panel informativo.
- Flujo publicitario continúa operativo.
- Mensajes post-registro y post-QR ahora avisan revisar email y spam (`EmailInboxNotice`, `PostRegisterEmailNotice`).

## Admin delete seguro de usuarios

- Admin puede eliminar usuarios sin contenido/historial crítico desde `/admin/usuarios`.
- Backend bloquea usuarios con publicaciones, tickets, órdenes, pagos o historial sensible (`GET /admin/users/:id/delete-preflight`, `DELETE /admin/users/:id`).
- **Eliminación profunda** (`GET/DELETE /admin/deep-delete/USER/:id`): permite eliminar cuentas con actividad tras modal de impacto; conserva tickets/órdenes/pagos/auditoría.
- Doc: `docs/audits/ADMIN_USER_DELETE_AUDIT.md`, `docs/audits/ADMIN_DEEP_DELETE_AUDIT.md`.

---

## 1. Project Overview

**Yo Te Invito** — multi-tenant platform for events, gastronomy, excursions, **equipment rentals**, and hotels: discovery, ticketing (demo payments), portals, scanner PWA.

Built with **documentation-driven architecture** and AI-assisted development.

---

## 2. Tech Stack

| Layer | Stack |
|-------|--------|
| Monorepo | Nx + pnpm — `apps/web`, `apps/api`, `apps/scanner`, `packages/shared` |
| Backend | NestJS, Prisma, PostgreSQL, Zod |
| Frontend | Next.js 15 App Router, React, Tailwind, TanStack Query, NextAuth |
| Infra | Docker (Postgres), Redis (queues) |

---

## 3. Request Flow

```
User → Next.js → ApiRepository → NestJS Controller → Service → Prisma → PostgreSQL
```

Controllers: HTTP + Zod only. Services: business logic. Prisma: persistence only.

---

## 4. Context documents (source of truth)

| File | Content |
|------|---------|
| **`AI_ENTRYPOINT.md`** | This index |
| **`PROJECT_CONTEXT.md`** | Product vision, monorepo, scope, rentals domain |
| **`BACKEND_CONTEXT.md`** | API modules, Prisma, endpoints, dev scripts |
| **`FRONTEND_CONTEXT.md`** | Web app routes, repos, rental UI, **navbar V2**, **footer público V2**, E2E |
| **`docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`** | Slices 1–10 navbar + fix dropdown flotante |
| **`docs/audits/NAVBAR_RESPONSIVE_SMOKE.md`** | Smoke responsive navbar |
| **`docs/audits/PUBLIC_FOOTER_AUDIT.md`** | Footer público — Slices 1–5 + cierre |
| **`docs/audits/PUBLIC_FOOTER_SMOKE.md`** | Smoke / QA footer |
| **`docs/audits/PUBLIC_FOOTER_CLOSING_AUDIT.md`** | Auditoría de cierre footer |
| **`docs/audits/ADMIN_GASTRO_LOCATIONS_AUDIT.md`** | Admin Gastro Locations — bloque cerrado (CRUD admin + smoke Slice 5) |
| **`docs/audits/GEO_MAPS_STAGE_CLOSING.md`** | Etapa GEO/Maps Georef — cierre completo (2026-06-23) |
| **`docs/audits/GEO_MAPS_STAGE_AUDIT.md`** | Auditoría etapa GEO/Maps |
| **`docs/audits/GEO_ADDRESS_MAP_PIN_CLOSING.md`** | Etapa GEO — geocoding + pin editable (previo) |
| **`docs/audits/GASTRO_DISCOUNTS_QR_COURTESY_CLOSING.md`** | Gastro descuentos QR y cortesías (v1) |
| **`docs/audits/GASTRO_QR_COURTESIES_AUDIT.md`** | Gastro QR / Cortesías V2 — cierre reglas + QA |
| **`docs/audits/V3_1_STAGE_16_BANNERS_RENDERING_CLOSING.md`** | Banners editoriales sin reemplazar publicaciones |
| **`docs/audits/V3_1_STAGE_16_EXPLORE_CITY_FILTER_CLOSING.md`** | Filtro ciudad en Explore |
| **`CONTEXT_PENDIENTES.md`** | Checkbox backlog — mark `[x]` when done |
| **`docs/dev/Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md`** | Checklist V3.3 funcional/operativa |
| **`docs/audits/V3_3_STAGE_1_PUBLIC_MOBILE_CLOSING.md`** | Cierre Etapa 1 V3.3 |
| **`docs/audits/V3_3_STAGE_2_USER_AVATAR_CLOSING.md`** | Cierre Etapa 2 V3.3 — avatar usuario |
| **`docs/audits/V3_3_STAGE_3_SCANNER_V3_CLOSING.md`** | Cierre Etapa 3 V3.3 — Scanner V3 |
| **`docs/audits/V3_3_SCANNER_USERNAME_AUTH.md`** | Auth username Scanner — arquitectura y reglas |
| **`docs/audits/V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md`** | Arquitectura Etapa 4 — Gastro multi-local |
| **`docs/audits/V3_3_STAGE_4_GASTRO_MULTI_LOCAL_CLOSING.md`** | Cierre Etapa 4 V3.3 — Gastro multi-local + approval |
| **`docs/audits/V3_3_STAGE_5_GASTRO_DISCOUNTS_AUDIT.md`** | Auditoría Etapa 5 — Descuentos Gastro V3 |
| **`docs/audits/V3_3_STAGE_5_GASTRO_DISCOUNTS_CLOSING.md`** | Cierre Etapa 5 V3.3 — Descuentos Gastro V3 |
| **`docs/audits/V3_3_STAGE_6_QR_STUDIO_AUDIT.md`** | Auditoría Etapa 6 — QR Studio |
| **`docs/audits/V3_3_STAGE_6_QR_STUDIO_CLOSING.md`** | Cierre Etapa 6 V3.3 — QR Studio |
| **`NEXT_CHAT_HANDOFF.md`** | Handoff operativo — iniciar chat sin reconstruir historial |
| **`NEXT_CHAT_GETNET_WEBCHECKOUT_HANDOFF.md`** | Handoff Getnet Web Checkout Redirect |
| **`docs/payments/GETNET_WEBCHECKOUT_REDIRECT_CLOSING.md`** | Cierre slice Redirect |
| **`docs/legal/LEGAL_ADMIN_MODULE.md`** | Legal Admin — modelos, endpoints, flujos, staging (módulo cerrado 2026-05-24) |
| **`docs/onboarding/`** | Registro V2 por perfil — wizard, schemas, legales signup, slices 12.5–12.6 |
| **`FRONTEND_DEMO_NOTES.md`** | Legacy demo mapping (not current persistence) |

**V3.1 Etapa 16 — Banners + ciudad (2026-06-15):** hotfix render banners editoriales sin reemplazar publicaciones (`V3_1_STAGE_16_BANNERS_RENDERING_CLOSING.md`); filtro ciudad movido a Explore (`V3_1_STAGE_16_EXPLORE_CITY_FILTER_CLOSING.md`). QA manual prod pendiente banners.

**Etapa GEO / Maps — Georef + hotfixes (2026-06-23):** `GET /geo/provinces`, `GET /geo/localities` (dedupe nombres), `GeoRefService`, hooks `useGeoProvinces`/`useGeoLocalities`, `AddressMapPicker` con `query` compuesta (calle+ciudad+provincia), pin `mapEpoch`+`panTo`, fichas públicas sin duplicados. Commits: `ea53f72`, `5353ae2`. Doc: `docs/audits/GEO_MAPS_STAGE_CLOSING.md`. **Cerrado prod 2026-06-23.**

**Footer público refresh (2026-06-23):** commit `772a227` — layout 3 columnas (marca / Instagram / contacto), legales inline, crédito dev; assets `logo.png`, `logo_2.png`; audio intro removido. Componentes: `FooterFull`, `FooterInstagramHighlight`, `footerStyles.ts`.

**Branding web (2026-06-23):** favicon `/brand/logo.png` (`3fafa18`); share OG `/brand/og-logo3-black-v2.png` + `/home` alineado (`ef6ef4b`); intro `logo_2.png` ~70% sin sonido (`88e7bb7`). Constantes: `lib/seo/brandAssets.ts`. **No mezclar** intro asset con favicon/OG.

**Etapa GEO — dirección a Maps + pin editable (2026-06-15):** `POST /geo/resolve-address`, `AddressMapPicker`, formularios eventos/gastro/rentals/excursiones. Doc: `docs/audits/GEO_ADDRESS_MAP_PIN_CLOSING.md`.

**Gastro descuentos QR cortesía V2 (2026-06-23):** vencimiento inclusivo AR, uso único por claim, emails con CTA claim, UI `GastroDiscountQrCard`. **V2.1:** descuentos recurrentes por día de semana (`validityMode`, `validWeekday`), scanner `NOT_VALID_TODAY`, admin KPI cupones escaneados, emails cortesía con diagnóstico + link fallback. **V2.2:** sin límite diario; detalle por descuento con métricas/claims; activar/desactivar/editar desde panel gastro y admin. Doc: `docs/audits/GASTRO_QR_COURTESIES_AUDIT.md`. QA manual pendiente.

**Scanner operativo jornada (2026-06-15):** login, PDF fix (`pdfkit` CJS), targets sin `/public/events/:id`, eventos vencidos ocultos (corte 1 AM AR), escaneo manual por botón, modal sin auto-cierre, setup vs operación, listado entradas + hora escaneo. Cerrado funcionalmente; QA puerta real opcional.

**Portal productor:** `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md` § K (slices 1–10 cerrados en checklist V2; slug auto en perfil; notificaciones `EVENT_*_BY_ADMIN`).

**Checklist producción portal productor:** `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Portal productor — sincronizado con § K de este archivo.

**Reviews V2 (reputación y moderación):** `docs/reviews/REVIEWS_V2.md` — slices UI pública, perfil, filtros, cola admin, notificaciones, reporting (`/admin/reviews`); smoke `smoke:reviews`; checklist § Reviews en `Yo_Te_Invito_Checklist_V2_Produccion.md` cerrado.

**Gastro y Hoteles V2 (cerrado 2026-05-22):** checklist § Gastro y Hoteles; auditoría `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`. Gastro: QR `docs/gastro/GASTRO_DISCOUNT_QR.md`, tests `test:gastro-discount-qr` / `test:gastro-discount-scan`. Hoteles: discovery Próximamente, portal `/hotel`, ficha `/hoteles/[id]`, E2E `pnpm e2e:hotel` + `docs/hotel/HOTEL_E2E.md`.

**V3.1 Etapa 4 — Etiquetas (cerrada 2026-06-10):** modelo `ContentTag` / `EventTag`, admin `/admin/etiquetas`, tags en portales, filtro `?tag=` en explore. Doc: `docs/audits/V3_1_STAGE_4_TAGS_CLOSING.md`; checklist §23.

**V3.1 Etapa 5 — Scanner PWA (cerrada 2026-06-10):** `ScannerAccount`, portales `/producer/scanners` y `/gastro/scanners`, PWA `apps/scanner` (manifest, cámara QR, scope API). Smokes: `smoke:v31-scanner-accounts`, `smoke:v31-scanner-scope`. Doc: `docs/audits/V3_1_STAGE_5_CLOSING.md`; checklist §24.1–24.4.

**V3.1 Etapa 6 — Scanner PDF y offline (cerrada 2026-06-10):** PDF listado (`export.pdf`), snapshot offline, validación/sync local, conflictos, UX estados. Smokes: `smoke:v31-ticket-list-pdf`, `smoke:v31-ticket-list-pdf-permissions`. Doc: `docs/audits/V3_1_STAGE_6_SCANNER_OFFLINE_CLOSING.md`; checklist §24.5–24.6. Pendiente operativo: JWT login PWA prod, QA manual móvil puerta.

**V3.1 Etapa 7 — Eventos multi-fecha (cerrada 2026-06-10):** modelo `EventOccurrence`, checkout/cart con `occurrenceId`, scanner `WRONG_OCCURRENCE`. Smoke: `smoke:v31-event-occurrences`. Doc: `docs/audits/V3_1_STAGE_7_MULTI_DATE_EVENTS_CLOSING.md`; checklist §25.1–25.2.

**V3.1 Etapa 8 — Cambio de fecha entrada (cerrada 2026-06-10):** `TicketDateChangeRequest`, política `docs/tickets/TICKET_DATE_CHANGE_POLICY.md`, portal usuario + productora, notificaciones/email. Smoke: `smoke:v31-ticket-date-change`. Doc: `docs/audits/V3_1_STAGE_8_TICKET_DATE_CHANGE_CLOSING.md`; checklist §25.3.

**V3.1 Etapa 9 — Transferencia de entradas (cerrada 2026-06-10):** flujo personal `TicketTransferOffer`, elegibilidad `TicketTransferEligibilityService`, QR nuevo al aceptar. Smokes: `smoke:v31-ticket-transfer-flow`, `smoke:user-portal`. Doc: `docs/audits/V3_1_STAGE_9_TICKET_TRANSFER_CLOSING.md`; checklist §26.1.

**V3.1 Etapa 0 — Deploy técnico pre-QA (parcial 2026-06-10):** push `feat/v1-s03-api-foundation` @ `892f611`; smokes V3.1 OK local; deploy VPS manual pendiente SSH. Docs: `V3_1_STAGE_0_DEPLOY_CLOSING.md`, `V3_1_STAGE_0_MANUAL_QA_SERVER_CHECKLIST.md`.

**V3.1 Etapa 13 — Hotfix visual (cerrada 2026-06-10):** dark forzado global; subtítulos gastro cards. Doc: `V3_1_STAGE_13_VISUAL_HOTFIX_CLOSING.md`.

**V3.1 Etapa 10 — Horarios gastro avanzados (cerrada 2026-06-10):** `openingHoursMode` simple/weekly, `openingHoursWeekly` por día, formulario `WeeklyOpeningHoursEditor`, ficha pública abierto/cerrado. Smoke: `smoke:v31-gastro-weekly-hours`. Doc: `docs/audits/V3_1_STAGE_10_GASTRO_HOURS_CLOSING.md`; checklist §27.1–27.2.

**Legal Admin / Legales V2 (cerrado 2026-05-24):** slices 1–8 + import Markdown — admin `/admin/legales`, público `/legal/[slug]`, aceptación `/me/legal/*`, integración registro/checkout/footer/portales; **layout portales** `max-w-screen-2xl` (`portalLayoutClasses.ts`, `PortalPageContext`). Doc: `docs/legal/LEGAL_ADMIN_MODULE.md`; QA: `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`; smoke `pnpm --filter api run smoke:legal` (API + `DEV_AUTH_ENABLED` o JWT). **No** marcar checklist de redacción legal hasta publicar contenido real.

**Footer público V2 (cerrado 2026-05-24, refresh 2026-06-23):** `RouteAwareFooter` + variantes `full`/`minimal`/`hidden` (`footerVisibility.ts`); UI `components/footer/*` (refresh `772a227`: Instagram highlight, legales inline); contacto `GET /public/platform-config` + `usePublicPlatformConfig`. `/categorias`: solo `CategoryGatewayFooter` (global hidden). Docs: `PUBLIC_FOOTER_AUDIT.md`, `PUBLIC_FOOTER_SMOKE.md`, `PUBLIC_FOOTER_CLOSING_AUDIT.md`.

**Registro y onboarding por tipo de usuario (cerrado 2026-05-24, slices 1–14 + 12.5–12.6):** wizard `/register` (`RegisterWizard` + pasos por perfil), `POST /auth/register` con `profileType` / `profileData`, legales SIGNUP transaccionales, perfiles comerciales ACTIVE al crear. Schemas: `packages/shared/src/schemas/profile-onboarding.ts`. Ubicación: catálogo `ARGENTINA_PROVINCES` en `@yo-te-invito/shared`; hotel y gastro con selects provincia/ciudad; email duplicado `EMAIL_ALREADY_EXISTS`. Rental sin signup (admin + CTA). Índice: `docs/onboarding/` — auditoría `docs/audits/REGISTER_ONBOARDING_AUDIT.md`, smoke `docs/onboarding/REGISTER_ONBOARDING_SMOKE.md`.

**Portal usuario (`/me/*`):** `docs/user/USER_PORTAL.md` (incl. **Push notifications** V2.1.3–V2.1.4, **ticket comprador** V2.2).

**Checklist producción (V2 → prod):** `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` — marcar ítems al cerrar slices; alinear con `CONTEXT_PENDIENTES.md`.

**Guías developer (leer primero para scripts/QA):**

- `docs/guides/README.md` — índice vigente
- `docs/guides/DEVELOPER_SCRIPTS_GUIDE.md` — manual de comandos npm (español)
- `docs/guides/SMOKE_TESTS_GUIDE.md` — smokes + E2E
- `docs/dev/SCRIPTS.md` — referencia técnica breve (IA)
- `docs/guides/DEVELOPER_USERS.md` — cuentas y roles

**Legacy (no operar):** `docs/legacy/guides/`

**Ticket studio:** `docs/tickets/TICKET_CANVAS_STUDIO.md`

**Rules:** `docs/rules/PROJECT_RULES.md`, `AI_WORKFLOW_RULES.md`, `AI_CODE_REVIEW_RULES.md`, `ARCHITECTURE_GUARDRAILS.md`

**Architecture:** `docs/architecture/PROJECT_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`

---

## 5. Key folders

```
docs/context/     ← start here
docs/dev/         ← SCRIPTS.md, Yo_Te_Invito_Checklist_V2_Produccion.md
docs/guides/      ← README, DEVELOPER_SCRIPTS_GUIDE, SMOKE_TESTS_GUIDE
docs/deploy/      ← DONWEB, GOOGLE_CLOUD, GCS_BACKUPS, GCS_STORAGE_STRATEGY
docs/legacy/guides/  ← histórico (slices, planes viejos)
scripts/ops/      ← backup-postgres-to-gcs.sh (VPS, no npm)
apps/api/src/     ← NestJS modules
apps/api/prisma/  ← schema + cleanup-content.ts
apps/api/scripts/ ← smokes, user:*, lib/smoke-*
apps/web/         ← Next.js
e2e/              ← Playwright
packages/shared/  ← Zod schemas
```

---

## 6. AI workflow

1. Read relevant context + rules.
2. Use templates in `docs/guides/templates/` when adding modules.
3. Small slices; ~300–400 lines per file.
4. Update `CONTEXT_PENDIENTES.md` when closing backlog items.
5. Do **not** reintroduce demo data seeds or LocalDB — extend manual/API flows.

---

## 7. Boundaries (do not break)

- No business logic in controllers.
- No direct `fetch` / `localStorage` in web UI — use repositories.
- Rental UX changes must not alter event/gastro/excursion detail behavior (use rental-specific components).
- Do not invent Prisma models — read `schema.prisma`.
- Smokes/E2E: require explicit credentials (`SMOKE_*`, `E2E_*`) — no `@demo.local` defaults.

---

## 8. Local dev & QA (quick reference)

### Infra

```bash
pnpm db:up && pnpm db:migrate   # solo desarrollo local
pnpm run -w dev    # API :3001 + web :3000
```

**Producción VPS (Mayo 2026):** `yoteinvito.club` — `npx prisma migrate deploy` en `apps/api` (no `pnpm db:migrate`). SSH: `ssh yoteinvito` → usuario `deploy`, puerto **5230**, solo clave (root/password SSH deshabilitados). API: `NODE_ENV=production`, `DEV_AUTH_ENABLED=false`; `.env` permisos `600`. Secretos críticos rotados (Mayo 2026). Runbook VPS: `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md` §24–25; auditoría hardening: `docs/audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md`.

**Google Cloud / Storage / SEO / Maps (bloque cerrado 2026-06-01):** proyecto `yoteinvito-1721413433327`; GCS `yti-prod-storage` + `yti-prod-public-assets`; backups PG OK; upload `POST /uploads/public-image` + formularios GCS; SEO `robots`/`sitemap` + GSC propiedad verificada + sitemap enviado; Maps prod (key, autocomplete, fallback, `googlePlaceId`/`province`, Ver ubicación, JSON-LD local). Runbooks: [`GOOGLE_CLOUD_RUNBOOK.md`](../deploy/GOOGLE_CLOUD_RUNBOOK.md) · [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) · [`SEARCH_CONSOLE_SEO_RUNBOOK.md`](../deploy/SEARCH_CONSOLE_SEO_RUNBOOK.md). Auditorías: [`MAPS_LOCATION_AUDIT.md`](../audits/MAPS_LOCATION_AUDIT.md) · [`SEO_TECHNICAL_AUDIT.md`](../audits/SEO_TECHNICAL_AUDIT.md). **Ops no bloqueante:** budget alerts GCP, data-URL/orphans migrate, CDN, GSC indexación/CWV/Rich Results.

**Producción — no ejecutar salvo emergencia documentada:** `pnpm db:reset-dangerous`, `pnpm db:cleanup-content`, `pnpm db:migrate` (usar solo `npx prisma migrate deploy`).

### Cuenta de trabajo

- Principal: `felipe.e.salom@gmail.com` (registro o existente en BD).
- Restaurar **ADMIN** + portales tras cleanup: `pnpm --filter api run user:restore-master` → luego **cerrar sesión y volver a entrar** (JWT trae `role`).
- Panel admin: `/admin` (solo `Role.ADMIN`); operativo V2: dashboard + cola pendientes, `/admin/eventos`, `/admin/usuarios`, `/admin/auditoria`, `/admin/categorias` (subcategorías; hotel Próximamente). También `/profiles` → tarjeta Administración o menú navbar.

### Limpiar contenido del tenant (no borra Felipe)

```bash
pnpm db:cleanup-content              # dry-run
pnpm db:cleanup-content -- --confirm
```

### Reset total (peligroso)

```bash
pnpm db:reset-dangerous -- --confirm   # borra TODA la BD
```

### Smokes API (requieren credenciales)

```bash
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pass> \
  pnpm --filter api run smoke:user-portal
```

| Comando | Notas |
|---------|--------|
| `smoke:api` | Health endpoints |
| `smoke:reviews` | Reviews V2; roles opcionales `SMOKE_PRODUCER_EMAIL`, etc. |
| `smoke:referrals` | Referidos V2; requiere `SMOKE_PRODUCER_EMAIL` + `SMOKE_REFERRER_EMAIL` |
| `test:referral-proposals` / `test:referral-commission` / `test:referral-payment-requests` | Util sin BD |
| `smoke:notifications` | Bandeja in-app + seed-demo admin (push requiere VAPID + navegador) |
| `smoke:producer-follows` | Follows (cleanup follow al final) |
| `smoke:legal` | Documentos legales + aceptación usuario (`test:legal-documents` + `test:me-legal-acceptance`) |
| `seed:legal-documents` | Catálogo legal idempotente (sin auto-publish) |
| `seed:legal-content` | Importa `docs/legal/*.md` → borradores (`--dry-run`, `--force`, `--publish`) |
| `smoke:cleanup` | Dry-run / `--confirm` — artefactos smoke en BD |

Variables útiles: `SMOKE_SKIP_CLEANUP`, `SMOKE_CLEANUP_BEFORE`, `SMOKE_ALLOW_DESTRUCTIVE` (transfer accept). Ver `docs/dev/SCRIPTS.md`.

### E2E Playwright

```bash
E2E_USER_EMAIL=felipe.e.salom@gmail.com E2E_USER_PASSWORD=<pass> pnpm e2e:portal
```

Sin credenciales → skip en tests con login. `E2E_SEED=1` ignorado.

### Utilidades usuario

`user:inspect`, `user:reset-password`, `user:verify-email`, `user:test-login`, `debug:gastro-discounts`, `debug:admin-api`.

### Web Push (API + web, opcional en dev)

```env
WEB_PUSH_VAPID_PUBLIC_KEY=
WEB_PUSH_VAPID_PRIVATE_KEY=
WEB_PUSH_CONTACT_EMAIL=mailto:soporte@ejemplo.com
NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY=   # opcional si se usa GET /me/push-subscriptions/config
```

Sin VAPID: la API arranca; registro de dispositivo OK; envío de prueba/alertas push falla con mensaje controlado.

---

## 9. Script hygiene (auditoría 2026 — etapas A–E)

| Etapa | Hecho |
|-------|--------|
| **A** | Renombres npm (`seed:subcategories`, `user:restore-master`, `db:reset-dangerous`, `smoke:api`, `smoke:reviews`) + `docs/dev/SCRIPTS.md` |
| **B** | Smokes/E2E sin `@demo.local`; `SMOKE_*` / `E2E_*` obligatorios |
| **C** | `user:inspect`, `user:test-login`, `debug:*`; fusionados `check-user` / `debug-login` / `test-login-api` |
| **D** | Cleanup automático post-smoke + `smoke:cleanup`; usuarios `*@smoke.yo-te-invito.test` |
| **E** | Este entrypoint + `PROJECT_*` / `BACKEND_*` / `FRONTEND_*` / `CONTEXT_PENDIENTES` § M alineados |
| **F** | Limpieza documental: `docs/guides/` vigente + `docs/legacy/guides/` histórico |

Al agregar scripts nuevos: documentar en `DEVELOPER_SCRIPTS_GUIDE.md` y `SCRIPTS.md`; evitar nombres ambiguos (`reset`, `seed`, `demo` sin calificador); marcar riesgo DB.

---

## 10. Usuario estándar y limpieza demo (2026-05)

### Portal usuario (`/me/*`)

- **Hub:** `/me` (dashboard con alertas + CTA push), `/me/cart` (**Mi Carro**), `/me/tickets`, `/me/preferences`, `/me/activity`, `/me/account`, `/me/notifications`, `/me/producer-follows`, `/me/recommendations` (redirect `/me/recommendations` → `/me`).
- **V2.1.2 UX:** Inicio con alertas/recomendados; productoras en preferencias; ciudad/categorías favoritas en `User.preferences` JSON.
- **V2.1.3–V2.1.4 notificaciones:** bandeja in-app + **PUSH**; publicación evento → seguidores + matching intereses (`EventPublicationAlertsService`, kinds `FOLLOWED_PRODUCER_NEW_EVENT`, `FAVORITE_INTEREST_NEW_CONTENT`); throttling `SMART_ALERTS_MAX_PER_USER_HOUR`.
- **V2.2 ticketera comprador:** render desde `TicketTemplate` o `DefaultBuyerTicket`; QR `yti:v1:` (mín. 200px, ECC M); impresión `@media print`; estados en pantalla e impresión; smoke valida payload + `TRANSFER_PENDING` rechazado en scanner.
- **Gastro follows:** `GET/POST/DELETE/PATCH /me/gastro-follows*`; UI `MePreferencesGastro`, `GastroFollowButton` en ficha restaurante.
- **Datos:** API `MePortalController` + `UserNotificationsService`, `WebPushService`, `EventPublicationAlertsService`; SW `push-sw.js`; UI push en `/me/notifications`.
- **Frontend:** `repositories/mePortal` + hooks `lib/query/me-portal.ts`; `lib/push/registerPush.ts`; `components/tickets/*`, `lib/tickets/*`; layout `UserPortalLayout`.
- **Redirects:** `/cuenta/*` → rutas `/me/*` (temporal; no duplicar lógica en páginas `/cuenta`).
- **Checkout:** usuario autenticado usa carrito API (`POST /me/cart/checkout`); aceptación legal `CHECKOUT` en `/me/cart` antes de confirmar; invitado mantiene flujo público con checkbox (persistencia al autenticarse).
- **Legales:** registro acepta `SIGNUP` tras crear usuario (`POST /me/legal/accept`); footer y `/legal/[slug]` — ver `LEGAL_ADMIN_MODULE.md`.
- **Transferencia:** solo personal (`TicketTransferOffer`); marketplace `/reventa` y módulo API `resale` **eliminados**.

### Eliminado (no reintroducir)

| Área | Qué se quitó |
|------|----------------|
| API scripts | `demo:seed`, `demo:load`, `demo-seed-curated`, `check-user`, `debug-login`, `test-login-api`, `cleanup-demo.ts` |
| Web | `lib/local-db/*`, `lib/auth/demo-users.ts`, `dynamic-users`, rutas `/dev/seed`, `/dev/local-db`, `/reventa/*` |
| Web API routes | `app/api/auth/*`, `app/api/admin/*` (auth/admin solo vía NestJS) |
| BD cleanup | `db:cleanup-content` reemplaza wipe masivo; `db:reset-dangerous` para reset total |

### Scripts usuario (API)

`user:restore-master`, `user:inspect`, `user:reset-password`, `user:verify-email`, `user:test-login` — ver §8 y `DEVELOPER_SCRIPTS_GUIDE.md`.

### Descubrimiento público (cerrado V2)

Checklist: `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Descubrimiento público. Auditoría y QA: `docs/audits/PUBLIC_DISCOVERY_AUDIT.md`. Contexto: `PROJECT_CONTEXT.md` §5, `FRONTEND_CONTEXT.md` §7–8c, `BACKEND_CONTEXT.md` §4.
