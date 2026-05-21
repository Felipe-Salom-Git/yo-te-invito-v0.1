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
| **`FRONTEND_CONTEXT.md`** | Web app routes, repos, rental UI, E2E |
| **`CONTEXT_PENDIENTES.md`** | Checkbox backlog — mark `[x]` when done |
| **`FRONTEND_DEMO_NOTES.md`** | Legacy demo mapping (not current persistence) |

**Portal productor:** `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md` § K.

**Reviews V2:** `docs/reviews/REVIEWS_V2.md` — smoke `smoke:reviews`.

**Portal usuario (`/me/*`):** `docs/user/USER_PORTAL.md` (incl. **Push notifications** V2.1.3–V2.1.4).

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
docs/dev/         ← SCRIPTS.md (npm commands)
docs/guides/      ← README, DEVELOPER_SCRIPTS_GUIDE, SMOKE_TESTS_GUIDE
docs/legacy/guides/  ← histórico (slices, planes viejos)
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
pnpm db:up && pnpm db:migrate
pnpm run -w dev    # API :3001 + web :3000
```

### Cuenta de trabajo

- Principal: `felipe.e.salom@gmail.com` (registro o existente en BD).
- Restaurar portales tras cleanup: `pnpm --filter api run user:restore-master`.

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
| `smoke:notifications` | Bandeja in-app + seed-demo admin (push requiere VAPID + navegador) |
| `smoke:producer-follows` | Follows (cleanup follow al final) |
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
- **Datos:** API `MePortalController` + `UserNotificationsService`, `WebPushService`, `EventPublicationAlertsService`; SW `push-sw.js`; UI push en `/me/notifications`.
- **Frontend:** `repositories/mePortal` + hooks `lib/query/me-portal.ts`; `lib/push/registerPush.ts`; layout `UserPortalLayout`.
- **Redirects:** `/cuenta/*` → rutas `/me/*` (temporal; no duplicar lógica en páginas `/cuenta`).
- **Checkout:** usuario autenticado usa carrito API (`POST /me/cart/checkout`); invitado mantiene flujo público.
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
