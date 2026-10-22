# V3.3 G7.2 / Release readiness — DB integration status

**Fecha:** 2026-10-22 (actualizado release readiness)  
**Entorno local:** `DATABASE_URL` → `localhost:5433`  
**Ops:** Docker Desktop iniciado; `docker compose up -d postgres` → healthy

## Resultado

```text
PASS — PostgreSQL disponible; migrate deploy OK; smoke DB gastro PASS
```

## Migrations

```text
prisma migrate deploy → All migrations successfully applied (111)
prisma migrate status → Database schema is up to date
```

Incluye (entre otras aplicadas en este entorno fresco):

- `20260901140000_benefit_settlement_domain` (partial unique GASTRO/ACTIVITY — sin duplicar)
- `20261022120000_gastro_content_gallery_urls`
- `20261022140000_gastro_profile_views`

## Verificación SQL / índices

| Check | Resultado |
|---|---|
| `GastroContent.galleryUrls` (jsonb) | presente |
| `GastroProfile.viewCount` | presente |
| tabla `GastroProfileView` + índices | presente |
| `BenefitSettlement_tenant_gastro_period_key` (partial unique) | presente |
| `BenefitSettlement_tenant_activity_period_key` (partial unique) | presente |
| Filas legacy backfill vacías (DB fresca = 0) | n/a; smoke re-ejecutó SQL de backfill → PASS |

## Smoke DB (fixtures temporales, cleanup OK)

| # | Ítem | Resultado |
|---|---|---|
| 3 | backfill `imageUrl` → `galleryUrls` | PASS |
| 4 | CRUD GastroContent + galerías | PASS |
| 5 | GastroProfileView por `profileId` | PASS |
| 6 | aislamiento Local A / Local B (content + views) | PASS |
| 7 | claims + validations (insert fila) | PASS |
| 8 | agreement CURRENT (profile-scoped) | PASS |
| 9 | allocations CASH + snapshot | PASS |
| 10 | allocations BARTER + snapshot | PASS |
| 11 | settlement + unique partner+period | PASS |
| 12 | transfers | PASS |
| 13 | courtesy ledger | PASS |
| 14 | snapshots históricos post-cambio agreement | PASS |

## Scripts domain/DB existentes (re-ejecutados)

| Script | Resultado |
|---|---|
| `test:gastro-content-*` / view-scope / cross-profile / g5 / g6 | PASS (domain) |
| `test:benefit-settlement-domain` | PASS — DB indexes present |
| `test:benefit-settlement-transfers` | PASS — transfer table present |
| `test:courtesy-credit-ledger` | PASS — ledger table present |
| `test:gastro-courtesy-credit-funding` | PASS — funding column present |
| `test:benefit-commercial-agreements` | unit PASS; seed partners **NO** (DB vacía salvo smoke) |

## No ejecutado

- Manual browser QA (`V3_3_G7_MANUAL_QA_CHECKLIST.md`) — **PENDIENTE**
- Concurrency overpayment / concurrent funding scripts dedicados
- Seed completo de partners de producto (fuera de smoke)

## Nota

No se modificó producto G1–G7. No se crearon migrations nuevas. No push / merge / deploy.
