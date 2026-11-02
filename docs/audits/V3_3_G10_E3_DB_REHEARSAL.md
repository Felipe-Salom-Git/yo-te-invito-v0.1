# V3.3 G10.E3 — DB integration + ensayo de release (PostgreSQL local)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation` · **Código:** HEAD `af6c010` (API compilada = E1, sin cambios de producto posteriores)  
**Base:** DB descartable `yti_g10_rehearsal` en el contenedor local `yo-te-invito-postgres` (`localhost:5433`). **Nunca** producción ni la DB de desarrollo.  
**Resultado:** **PASS** en los 9 pasos. Sin push, sin deploy, sin tocar producción.

---

## 1. Resumen

| Paso | Qué se probó | Resultado |
|---|---|---|
| 1 | Base pre-G10 (111 migrations) + dataset con forma A0, escrito con el **cliente Prisma de G9** | PASS |
| 2 | `pnpm --filter api exec prisma migrate deploy` | PASS — aplica solo `20261102120000_benefit_agreement_discount_scope`; 0 filas cambiadas |
| 3 | API compilada de HEAD contra la DB migrada, **antes** del backfill | PASS — `/health` ok; fail-closed (sin contrato, pendientes sin cobertura) |
| 4 | Backfill dry-run | PASS — plan esperado exacto; **0 escrituras** |
| 5 | Backfill `--confirm` | PASS — **solo INSERT**: 6 contratos + 6 audits |
| 6 | Segundo dry-run | PASS — `copies to insert 0`, `already existing 6`; 0 escrituras |
| 7 | Integridad (`benefit-settlements:audit-integrity`) | PASS — `RESULT: OK`, `agreementScopeIssues 0`, sin issues G10 |
| 8 | Legacy | PASS — agreements, allocations, transfers y ledger legacy idénticos al snapshot pre-G10 |
| 9 | Locales sin contrato | PASS — 0 contratos inventados; quedan «without coverage» |

## 2. Dataset pre-G10 (forma A0, a escala)

Sembrado por `apps/api/scripts/g10-rehearsal/seed-pre-g10.ts` con el cliente generado desde `git show 50d0c29:apps/api/prisma/schema.prisma` (el schema de G9: entre `50d0c29` y HEAD solo cambian la migration de G10.A y su delta de schema).

| Local | Contratos legacy | Descuentos | Cubre en A0 |
|---|---|---|---|
| P1 | 1 abierto ($5.000) | D1a ACTIVE (2 pendientes + 1 uso BARTER legacy), D1b APPROVED creado **antes** del contrato, D1c REJECTED sin usos, D1d EXPIRED con 2 usos CASH legacy | locales con agreement; settlement GASTRO histórico (CLOSED, 2 CASH + 1 BARTER + crédito + transfer parcial **sin descuento**) |
| P2 | Historial de 2 filas: $4.000 (ene–jun) + $6.000 (jul–abierto) | D2a ACTIVE (pendientes en mayo y septiembre), D2b ACTIVE creado en agosto | «2 con historial» |
| P3 | ninguno | D3a ACTIVE + 1 pendiente | «locales con descuentos sin agreement» + «pendientes sin cobertura» |
| P4 | ninguno | D4a APPROVED sin usos | idem |
| P5 | 1 abierto ($3.000) | D5a ACTIVE, D5c cortesía **financiada** (DEBIT_COURTESY) con 1 uso | (A0 tiene 0 financiadas; se incluye para probar el skip) |
| ACTIVITY | 1 agreement de operador | cupón + settlement + allocation CASH + transfer | debe quedar intacto |

Preflight A0 (`scripts/ops/g10-a0-preflight-readonly.sql`, solo lectura) sobre esta base: Q1 3 locales con agreements (uno con 2 filas), Q2 5 locales con descuentos (2 sin agreement), Q3 0 sin local, Q4 6 pendientes en 4 descuentos, Q5 1 settlement GASTRO con allocations, Q6 1 financiada. Es el mismo formato que se compara contra el A0 real en producción.

## 3. Salidas

### Paso 2 — migrate deploy

```text
Datasource "db": PostgreSQL database "yti_g10_rehearsal", schema "public" at "localhost:5433"
112 migrations found in prisma/migrations
The following migration(s) have been applied:
  └─ 20261102120000_benefit_agreement_discount_scope/
All migrations have been successfully applied.
prisma migrate status → Database schema is up to date!
verify identical --across-migration → exactly one migration applied; 0 rows inserted / updated / deleted
```

`prisma migrate diff` (DB → schema): **sin diferencias en los objetos de G10** (columnas, FKs, índices). Solo aparece drift **histórico** previo a G10 (variantes de enums, nombres de índice truncados a 63 caracteres por Postgres en migrations de Etapa 9, `updatedAt` sin default en 3 tablas, 2 índices de `Event`), idéntico al de cualquier base construida con las mismas migrations. No bloquea `migrate deploy` (que no compara drift).

### Paso 3 — API de HEAD antes del backfill (fail-closed)

```text
health: {"status":"ok"}
D1a: current=null legacyUsed=1 pending=2 pendingWithoutAgreement=2 BILLABLE barterBase=500000
D2a: current=null pending=2 pendingWithoutAgreement=2 BILLABLE
D3a: current=null pending=1 pendingWithoutAgreement=1 BILLABLE
D5c: current=null pending=0 pendingWithoutAgreement=0 FUNDED_COURTESY_NOT_BILLABLE
```

El uso BARTER histórico de D1a se lee con su contrato legacy (`legacyUsed`, `PARTNER_LEVEL_LEGACY`). Ventana operativa real entre restart y backfill: los descuentos facturables se ven sin contrato hasta el `--confirm`.

### Paso 4 — dry-run

```text
profiles scanned 5 · legacy agreements 4 · discounts scanned 10 · candidates 7
copies to insert 6 · already existing 0
profiles without agreements 2 · discounts without profile 0
funded courtesies skipped 1 · rejected w/o validations skipped 1 · terminal w/o pending skipped 1
discounts with own agreements 0 · discounts without coverage 2 · pending validations uncovered 1
Copies:
  D1b ← L1   500000 ×2 · 2026-03-01 → open
  D2a ← L2a  400000 ×2 · 2026-03-15 → 2026-06-30 (clipped)
  D2a ← L2b  600000 ×2 · 2026-07-01 → open
  D1a ← L1   500000 ×2 · 2026-04-10 → open (clipped)
  D2b ← L2b  600000 ×2 · 2026-08-01 → open (clipped)
  D5a ← L5   300000 ×2 · 2026-09-01 → open (clipped)
DRY RUN — nothing written.
verify identical (post-migrate vs post-dry-run) → PASS
```

Coincide exactamente con lo esperado: D1b no se recorta (su contrato empieza después del alta), D2a recibe los dos segmentos del historial, D2b solo el vigente, P3 / P4 sin copias, D1c / D1d / D5c salteados.

### Paso 5 — confirm

```text
Inserted: 6 · Skipped at write (re-checked in transaction): 0
verify backfill (pre-G10 snapshot vs post-confirm) → PASS
  - 0 filas pre-existentes modificadas o borradas en las 11 tablas observadas
  - columnas nuevas = NULL en todas las filas legacy (agreements y transfers)
  - inserts solo en BenefitCommercialAgreement (6) + AuditLog (6)
  - cada copia: gastroDiscountId + derivedFromAgreementId de un legacy del mismo local, mismos términos, createdByUserId NULL
  - audits: BENEFIT_AGREEMENT_CREATED, actor system:g10-discount-agreement-backfill, metadata.backfill = G10.A4
```

### Paso 6 — segundo dry-run

```text
copies to insert 0 · already existing 6 · profiles without agreements 2 · discounts without coverage 2
DRY RUN — nothing written.
verify identical (post-confirm vs post-second-dry-run) → PASS
```

### Paso 7 — integridad

```text
pnpm --filter api run benefit-settlements:audit-integrity
tenant …: OK · settlements checked 2 (ok 2, warnings 0, errors 0) · agreementScopeIssues 0
RESULT: OK   (exit 0)
```

Sin `AGREEMENT_SCOPE_MISMATCH`, `ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH`, `DISCOUNT_CASH_OVERPAYMENT`, `TRANSFER_DISCOUNT_SCOPE_MISMATCH` ni `FUNDED_COURTESY_ALLOCATED`. Las allocations históricas valuadas con el contrato del local no se marcan (legacy).

### Pasos 8–9 — legacy y locales sin contrato

- Agreements legacy (L1, L2a, L2b, L5, ACTIVITY): existen, términos y vigencias idénticos, `gastroDiscountId` / `derivedFromAgreementId` NULL.
- Allocations legacy (2 CASH + 1 BARTER del settlement de mayo, CASH de ACTIVITY): idénticas; su `agreementId` sigue apuntando al contrato legacy.
- Transfers legacy (GASTRO parcial y ACTIVITY): idénticas, `gastroDiscountId` NULL ⇒ `SETTLEMENT_LEVEL`.
- Ledger (crédito BARTER, ajuste y DEBIT_COURTESY): idéntico.
- P3 / P4: 0 contratos; D3a y D4a «without coverage» (`PROFILE_WITHOUT_AGREEMENTS`); la validación pendiente de D3a queda `MISSING_AGREEMENT`.

API de HEAD después del backfill:

```text
D1a: current=500000 DISCOUNT history=1 legacyUsed=1 pending=2 pendingWithoutAgreement=0
D2a: current=600000 DISCOUNT history=2 pending=2 pendingWithoutAgreement=0
D3a: current=null pendingWithoutAgreement=1
D5c: current=null FUNDED_COURTESY_NOT_BILLABLE
pending-validations:
  D1a: 2026-10 PRICED 500000 allocatable ×2
  D2a: 2026-05 PRICED 400000 allocatable | 2026-09 PRICED 600000 allocatable   (historial exacto por fecha)
  D3a: 2026-10 MISSING_AGREEMENT not allocatable
```

## 4. Cómo repetir el ensayo

Herramientas (solo para DB cuyo nombre contenga `rehearsal`; se niegan a correr en otra base): `apps/api/scripts/g10-rehearsal/` — `seed-pre-g10.ts`, `snapshot.ts` (SELECT * crudo, sirve antes y después de la migration), `verify.ts` (`--mode identical [--across-migration]` | `--mode backfill`).

```powershell
$env:DATABASE_URL = 'postgresql://postgres:postgres@localhost:5433/yti_g10_rehearsal?schema=public'
docker exec yo-te-invito-postgres psql -U postgres -c "DROP DATABASE IF EXISTS yti_g10_rehearsal" -c "CREATE DATABASE yti_g10_rehearsal"
# schema G9 dentro de apps/api (prisma generate exige estar en el paquete), excluido de git
git show 50d0c29:apps/api/prisma/schema.prisma   # + output = "<abs>/apps/api/.g10-rehearsal-tmp/pre/client"
# migrations/ copiadas sin 20261102120000_benefit_agreement_discount_scope
cd apps/api
pnpm exec prisma migrate deploy --schema .g10-rehearsal-tmp/pre/schema.prisma   # 111
pnpm exec prisma generate --schema .g10-rehearsal-tmp/pre/schema.prisma
$env:G10_PRE_CLIENT = (Resolve-Path .g10-rehearsal-tmp/pre/client).Path
npx tsx scripts/g10-rehearsal/seed-pre-g10.ts --out ids.json
npx tsx scripts/g10-rehearsal/snapshot.ts --out 01-pre.json
cd ../..
pnpm --filter api exec prisma migrate deploy
pnpm --filter api run benefit-agreements:backfill-discount-scope
pnpm --filter api run benefit-agreements:backfill-discount-scope -- --confirm
pnpm --filter api run benefit-agreements:backfill-discount-scope
pnpm --filter api run benefit-settlements:audit-integrity
# snapshot + verify.ts entre cada paso
```

La DB `yti_g10_rehearsal` y el cliente G9 temporal se eliminaron al terminar.
