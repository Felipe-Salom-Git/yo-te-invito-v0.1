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
| **Fuente de datos** | API + PostgreSQL únicamente en web (`ApiRepository`) |
| **Usuario estándar** | Portal unificado **`/me/*`** (carrito API, favoritos, transferencias, bandeja + **push Web/Mobile**). `/cuenta/*` solo redirects temporales |
| **Inventario scripts** | `docs/guides/DEVELOPER_SCRIPTS_GUIDE.md` + `docs/dev/SCRIPTS.md` |

Detalle histórico demo: [guides/DEMO_REMOVAL.md](../guides/DEMO_REMOVAL.md). Portal: [user/USER_PORTAL.md](../user/USER_PORTAL.md).

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
| **`CONTEXT_PENDIENTES.md`** | Checkbox backlog — mark `[x]` when done |
| **`docs/legal/LEGAL_ADMIN_MODULE.md`** | Legal Admin — modelos, endpoints, flujos, staging (módulo cerrado 2026-05-24) |
| **`docs/onboarding/`** | Registro V2 por perfil — wizard, schemas, legales signup, slices 12.5–12.6 |
| **`FRONTEND_DEMO_NOTES.md`** | Legacy demo mapping (not current persistence) |

**Portal productor:** `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md` § K (slices 1–10 cerrados en checklist V2; slug auto en perfil; notificaciones `EVENT_*_BY_ADMIN`).

**Checklist producción portal productor:** `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Portal productor — sincronizado con § K de este archivo.

**Reviews V2 (reputación y moderación):** `docs/reviews/REVIEWS_V2.md` — slices UI pública, perfil, filtros, cola admin, notificaciones, reporting (`/admin/reviews`); smoke `smoke:reviews`; checklist § Reviews en `Yo_Te_Invito_Checklist_V2_Produccion.md` cerrado.

**Gastro y Hoteles V2 (cerrado 2026-05-22):** checklist § Gastro y Hoteles; auditoría `docs/audits/GASTRO_HOTELES_V2_AUDIT.md`. Gastro: QR `docs/gastro/GASTRO_DISCOUNT_QR.md`, tests `test:gastro-discount-qr` / `test:gastro-discount-scan`. Hoteles: discovery Próximamente, portal `/hotel`, ficha `/hoteles/[id]`, E2E `pnpm e2e:hotel` + `docs/hotel/HOTEL_E2E.md`.

**Legal Admin / Legales V2 (cerrado 2026-05-24):** slices 1–8 + import Markdown — admin `/admin/legales`, público `/legal/[slug]`, aceptación `/me/legal/*`, integración registro/checkout/footer/portales; **layout portales** `max-w-screen-2xl` (`portalLayoutClasses.ts`, `PortalPageContext`). Doc: `docs/legal/LEGAL_ADMIN_MODULE.md`; QA: `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`; smoke `pnpm --filter api run smoke:legal` (API + `DEV_AUTH_ENABLED` o JWT). **No** marcar checklist de redacción legal hasta publicar contenido real.

**Footer público V2 (cerrado 2026-05-24):** `RouteAwareFooter` + variantes `full`/`minimal`/`hidden` (`footerVisibility.ts`); UI `components/footer/*`; contacto `GET /public/platform-config` + `usePublicPlatformConfig`; legales `footerLegalLinks.ts`. `/categorias`: solo `CategoryGatewayFooter` (global hidden). Checklist V2 § Footer público completo. Docs: `PUBLIC_FOOTER_AUDIT.md`, `PUBLIC_FOOTER_SMOKE.md`, `PUBLIC_FOOTER_CLOSING_AUDIT.md`.

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
