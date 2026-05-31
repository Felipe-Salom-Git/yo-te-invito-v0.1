# Scripts developer — referencia técnica (IA / dev)

**Guía principal en español:** [guides/DEVELOPER_SCRIPTS_GUIDE.md](../guides/DEVELOPER_SCRIPTS_GUIDE.md)  
**Smokes y E2E:** [guides/SMOKE_TESTS_GUIDE.md](../guides/SMOKE_TESTS_GUIDE.md)  
**Índice:** [guides/README.md](../guides/README.md)

**Regla:** pago demo sí · datos demo automáticos no · usuario maestro `felipe.e.salom@gmail.com`

**Producción:** usar `cd apps/api && npx prisma migrate deploy` — **no** `pnpm db:migrate`, **no** `pnpm db:reset-dangerous`, **no** `pnpm db:cleanup-content` (salvo emergencia documentada). Hotfixes de schema deben quedar versionados en `apps/api/prisma/migrations/` (ej. `20260531072000_restore_user_push_subscription`). Deploy VPS: [`docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`](../deploy/DONWEB_PRODUCTION_RUNBOOK.md) §25.

---

## Tabla rápida (raíz + api)

| Comando | Riesgo | DB |
|---------|--------|-----|
| `pnpm dev` / `dev:api` / `dev:web` / `dev:scanner` | Bajo | No |
| `pnpm db:generate` / `db:migrate` / `db:up` / `db:down` / `db:studio` | Bajo–Medio | Schema/infra |
| `pnpm db:cleanup-content` | Medio | Sí (preserva Felipe) |
| `pnpm db:reset-dangerous -- --confirm` | Alto | Toda la BD |
| `pnpm db:seed` | Medio | Opt-in env |
| `pnpm --filter api run seed:subcategories` | Bajo | Catálogo |
| `pnpm --filter api run seed:legal-documents` | Bajo | Catálogo legal (idempotente; sin auto-publish) |
| `pnpm --filter api run seed:legal-content` | Bajo | Importa `docs/legal/*.md` → borradores (`--dry-run`, `--force`, `--publish`) |
| `pnpm --filter api run smoke:legal` | Bajo | Legal Admin — API + `DEV_AUTH_ENABLED` o JWT |
| `pnpm --filter api run user:*` | Bajo–Medio | Ver guía |
| `pnpm --filter api run smoke:*` | Bajo–Alto | Ver SMOKE_TESTS_GUIDE |
| `pnpm --filter api run smoke:referrals` | Alto | Referidos V2 — productor + referido + evento |
| `pnpm --filter api run smoke:storage-upload` | Medio | GCS upload — ADMIN + GCS env en API |
| `pnpm --filter api run smoke:storage-upload-auth` | Bajo | Auth upload — USER 403; prod: `SMOKE_NON_ADMIN_*` |
| `pnpm --filter api run storage:audit-data-urls` | Bajo | Lee BD — detecta `data:image/` (read-only) |
| `pnpm --filter api run storage:migrate-data-urls` | Alto | Dry-run default; `--confirm` escribe GCS + BD |
| `pnpm --filter api run storage:audit-orphans` | Bajo | Lista GCS `public/` + lee BD (read-only) |
| `pnpm --filter api run storage:cleanup-orphans` | Alto | Dry-run default; `--confirm` borra en bucket público |
| `pnpm --filter api run smoke:storage-global` | Medio | Matriz uploads + auth + validación — §22 |
| `pnpm --filter api run test:referral-*` | No | Util % / propuestas / solicitudes pago |
| `pnpm --filter api run smoke:cleanup` | Medio | Artefactos smoke |
| `pnpm e2e:portal` / `e2e:notifications` | Bajo* | E2E UI |

\* Requiere `E2E_USER_EMAIL` + `E2E_USER_PASSWORD`.

---

## Scripts ops VPS (`scripts/ops/` — no npm)

| Script | Riesgo | DB / GCS | Notas |
|--------|--------|----------|--------|
| `backup-postgres-to-gcs.sh` | Medio | Lectura PG + escritura GCS | `--help`, `--dry-run`, `--env-file`; runbook [`GCS_BACKUPS_RUNBOOK.md`](../deploy/GCS_BACKUPS_RUNBOOK.md) |

**API upload (npm):** `pnpm --filter api run smoke:storage-upload` — ver [`GCS_STORAGE_STRATEGY.md`](../deploy/GCS_STORAGE_STRATEGY.md) §13.

**Data-URL ops:** `storage:audit-data-urls` (read-only), `storage:migrate-data-urls` (dry-run / `--confirm`) — §21.

**Orphan ops:** `storage:audit-orphans` (read-only), `storage:cleanup-orphans` (dry-run / `--confirm`) — §22. **No** `--confirm` en producción desde CI.

**Smoke storage:** `smoke:storage-upload`, `smoke:storage-upload-auth` (prod: `SMOKE_NON_ADMIN_EMAIL` + `SMOKE_NON_ADMIN_PASSWORD`), `smoke:storage-global` — §22.

---

## Eliminados

`demo:seed`, `demo:load`, `db:reset`, `smoke` (sin sufijo), `smoke:reviews-v2` — ver [guides/DEMO_REMOVAL.md](../guides/DEMO_REMOVAL.md).

---

## Legacy

Planes y slices históricos: [legacy/guides/](../legacy/guides/README.md).
