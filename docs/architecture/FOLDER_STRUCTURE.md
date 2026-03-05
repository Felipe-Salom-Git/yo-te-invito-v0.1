# Folder Structure — Monorepo

## Root Layout
- apps/
  - web/
  - scanner/
  - api/
- packages/
  - shared/
- docs/ (living documentation)
- scripts/ (maintenance, seeds, migrations helpers)
- infra/ (docker, reverse-proxy, VPS deployment assets)

---

## apps/web (Next.js App Router)

Suggested structure:
- app/
  - (public)/
  - (auth)/
  - (producer)/
  - (admin)/
  - (referrer)/
  - (user)/
- components/
  - ui/ (atomic reusable UI)
  - layout/
  - modules/ (domain-level components)
- lib/
  - api/ (fetch clients, typed calls)
  - auth/
  - config/
  - query/ (TanStack Query client/keys)
  - utils/
- styles/

Guidelines:
- Prefer Server Components by default
- Use Client Components only when necessary (forms, query hooks, browser APIs)
- Keep files ~300–400 lines max (split into smaller modules/hooks)

---

## apps/scanner (Next.js PWA)

Suggested structure:
- app/
  - login/
  - events/
  - scan/
  - sync/
  - settings/
- components/
  - door-mode/ (minimal UI)
- lib/
  - db/ (IndexedDB)
  - sync/ (offline queue)
  - qr/
  - api/

Guidelines:
- “Door mode” UI: big buttons, high contrast, immediate feedback
- Offline queue in IndexedDB, with explicit sync screen/state

---

## apps/api (NestJS)

Suggested structure:
- src/
  - modules/
    - auth/
    - users/
    - events/
    - ticketing/
    - orders/
    - scanner/
    - referrals/
    - reviews/
    - payouts/
    - admin/
    - exports/
    - audit/
  - common/
    - guards/
    - filters/
    - interceptors/
    - pipes/
    - decorators/
    - errors/
  - infra/
    - db/ (Prisma service)
    - redis/
    - queues/ (BullMQ - V2)
    - email/
    - storage/
  - config/

Guidelines:
- One domain per module
- Controllers thin; services contain business logic
- Contracts and Zod schemas live in packages/shared

---

## packages/shared

Suggested structure:
- src/
  - contracts/ (request/response shapes)
  - schemas/ (Zod)
  - enums/
  - types/
  - helpers/ (money, dates, ids)
  - constants/

Guidelines:
- Shared schemas are the source of truth
- Backend and frontend import from shared to avoid duplication

---

## docs/ (Living Documentation)
As the project grows:
- docs/components/
- docs/modules/
- docs/integrations/
- docs/architecture/
- docs/rules/
- docs/guides/

Rule:
- Each major feature should ship with a doc file under docs/modules/