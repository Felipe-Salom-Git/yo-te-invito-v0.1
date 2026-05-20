# AI_ENTRYPOINT.md
AI Development Entry Point

Read this file **before generating or modifying code**.

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
| **`BACKEND_CONTEXT.md`** | API modules, Prisma, endpoints, demo scripts |
| **`FRONTEND_CONTEXT.md`** | Web app routes, repos, rental UI, components |
| **`CONTEXT_PENDIENTES.md`** | Checkbox backlog — mark `[x]` when done |
| **`FRONTEND_DEMO_NOTES.md`** | Legacy demo mapping (not current persistence) |

**Portal productor (perfil por bloques, reseñas públicas, disputas, valoraciones comerciales B2B):** detalle en `PROJECT_CONTEXT.md`, API en `BACKEND_CONTEXT.md`, rutas/repos en `FRONTEND_CONTEXT.md`, seguimiento en `CONTEXT_PENDIENTES.md` § K.

**Ticket studio:** `docs/tickets/TICKET_CANVAS_STUDIO.md`

**Rules:** `docs/rules/PROJECT_RULES.md`, `AI_WORKFLOW_RULES.md`, `AI_CODE_REVIEW_RULES.md`, `ARCHITECTURE_GUARDRAILS.md`

**Architecture:** `docs/architecture/PROJECT_ARCHITECTURE.md`, `FOLDER_STRUCTURE.md`

---

## 5. Key folders

```
docs/context/     ← start here
docs/rules/
apps/api/src/     ← NestJS modules
apps/api/prisma/  ← schema + scripts (incl. cleanup-demo.ts)
apps/web/         ← Next.js
packages/shared/  ← Zod schemas
```

---

## 6. AI workflow

1. Read relevant context + rules.
2. Use templates in `docs/guides/` when adding modules.
3. Small slices; ~300–400 lines per file.
4. Update `CONTEXT_PENDIENTES.md` when closing backlog items.

---

## 7. Boundaries (do not break)

- No business logic in controllers.
- No direct `fetch` / `localStorage` in web UI — use repositories.
- Rental UX changes must not alter event/gastro/excursion detail behavior (use rental-specific components).
- Do not invent Prisma models — read `schema.prisma`.

---

## 8. Demo DB cleanup

```bash
pnpm db:cleanup-demo              # dry-run
pnpm db:cleanup-demo -- --confirm # delete demo content (dev)
```

Preserves `felipe.e.salom@gmail.com` + tenant/config. See `BACKEND_CONTEXT.md`.
