# Bootstrap Smoke Test Guide (Slice 01)

## Prerequisites

- Node.js 18+
- pnpm 9+
- Docker (for Postgres)

## Setup

```bash
# Install dependencies
pnpm install

# Copy .env from .env.example in apps/api (required for db:migrate)
# cp apps/api/.env.example apps/api/.env
# DATABASE_URL uses localhost:5433 (Postgres exposed on host port 5433)
```

## Slice 01 Acceptance Criteria (Run in Order)

Execute each command and report pass/fail:

### 1) pnpm install

```bash
pnpm install
```

Expected: exit code 0.

---

### 2) pnpm db:up

```bash
pnpm db:up
```

Expected: Postgres container starts. Verify with `docker ps`.

---

### 3) pnpm db:migrate

```bash
pnpm db:migrate
```

Expected: Prisma migrations run (or clear message if no migrations yet).

---

### 4) pnpm dev:api + GET /health

```bash
pnpm dev:api
# In another terminal:
# curl http://localhost:3001/health
```

Expected: `{ "status": "ok" }`

---

### 5) pnpm dev:web

```bash
pnpm dev:web
```

Expected: Web starts at http://localhost:3000. Homepage loads.

---

### 6) pnpm dev:scanner

```bash
pnpm dev:scanner
```

Expected: Scanner starts at http://localhost:3002. /door route shows Door Mode UI.

---

### 7) pnpm lint

```bash
pnpm lint
```

Expected: exit code 0.

---

### 8) pnpm build

```bash
pnpm build
```

Expected: shared, api, web, scanner build successfully.

---

### 9) pnpm db:down

```bash
pnpm db:down
```

Expected: Containers stop.

---

## Checklist

- [ ] 1) pnpm install
- [ ] 2) pnpm db:up
- [ ] 3) pnpm db:migrate
- [ ] 4) pnpm dev:api + GET /health
- [ ] 5) pnpm dev:web
- [ ] 6) pnpm dev:scanner
- [ ] 7) pnpm lint
- [ ] 8) pnpm build
- [ ] 9) pnpm db:down
