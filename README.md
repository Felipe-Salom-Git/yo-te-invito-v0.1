# Yo Te Invito

Ticketing platform monorepo — Nx + pnpm.

## Read First (Documentation Index)

Before writing any code or making architectural changes, please review the following documents in order:

1. [AI Entrypoint](docs/context/AI_ENTRYPOINT.md) · [Project Context](docs/context/PROJECT_CONTEXT.md)
2. [Project Rules](docs/rules/PROJECT_RULES.md)
3. [AI Workflow Rules](docs/rules/AI_WORKFLOW_RULES.md)
4. [Project Architecture](docs/architecture/PROJECT_ARCHITECTURE.md)
5. [System Overview](docs/architecture/SYSTEM_OVERVIEW.md)
6. [Folder Structure](docs/architecture/FOLDER_STRUCTURE.md)
7. [API Contracts](docs/api/API_CONTRACTS.md)

## Quick start

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev
# OR run individually:
# pnpm dev:api     (http://localhost:3001)
# pnpm dev:web     (http://localhost:3000)
# pnpm dev:scanner (http://localhost:3002)
```

## Database

Postgres runs on host port **5433** (HOST:5433 → CONTAINER:5432).

```bash
pnpm db:up       # Start Postgres (Docker)
pnpm db:migrate  # Run Prisma migrations
pnpm db:reset    # Reset database (optional)
pnpm db:studio   # Open Prisma Studio (optional)
pnpm db:down     # Stop containers
```

## Slice 01 Smoke Tests

See [docs/guides/BOOTSTRAP_SMOKE_TEST.md](docs/guides/BOOTSTRAP_SMOKE_TEST.md) for the full acceptance checklist.
