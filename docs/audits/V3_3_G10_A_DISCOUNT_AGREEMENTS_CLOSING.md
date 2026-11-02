# V3.3 G10.A — Schema + agreements por descuento + backfill (cierre)

**Fecha:** 2026-11-02  
**Rama:** `feat/v1-s03-api-foundation` · HEAD inicial `50d0c29` (discovery G10.0)  
**Alcance:** slices A0–A5 según [`V3_3_G10_DISCOUNT_COMMERCIAL_ACCOUNTING_DISCOVERY.md`](./V3_3_G10_DISCOUNT_COMMERCIAL_ACCOUNTING_DISCOVERY.md) con decisiones D-G10-1…10 **cerradas**.  
**Producción:** migration **NO** ejecutada · backfill **NO** ejecutado · **sin push, sin deploy**.

---

## 1. Commits

| Slice | Commit | Mensaje |
|---|---|---|
| A1 | `83d61ab` | `feat(v3.3): add discount-scoped benefit agreement schema` |
| A2 | `03ca401` | `feat(v3.3): add benefit agreement scope helpers and contracts` |
| A3 | `349ce75` | `feat(v3.3): scope benefit agreements per gastro discount` |
| A4 | `892767d` | `feat(v3.3): backfill discount-scoped agreements from legacy profile agreements` |
| A5 | `5996b0a` | `feat(v3.3): price settlement usage with discount-scoped agreements` |
| Docs | este commit | `docs(v3.3): close discount-scoped agreements stage` |

---

## 2. A0 — Preflight de producción (solo lectura) — PASS WITH WARNINGS

Ejecutado manualmente por el operador en el VPS dentro de `BEGIN TRANSACTION READ ONLY … ROLLBACK` (consultas en `scripts/ops/g10-a0-preflight-readonly.sql`; el agente no tenía acceso SSH).

| Hallazgo | Valor |
|---|---|
| Perfiles con agreements GASTRO | 15 (13 con 1 fila, 2 con historial de 2: `cmv1cjh680004i687ggnpcya8`, `cmvjl8wgp0017vndkjhd9aor8`); todos con exactamente 1 fila abierta |
| Perfiles con descuentos y **sin** agreement | 6 (`cmqycba1p000id6l28kuv0qmk`, `cmtt08lod000i4cmiu10xzppo`, `cmr0z47490013qyjj0naxgo7z`, `cmr11t0ha001vympcs4fph9ra`, `cmsmtc0ll000ocg669fwjk6tc`, `cmqrfzz4e000p13q0iebech34`) con 5 descuentos `ACTIVE`/`APPROVED` en total |
| Descuentos sin `gastroProfileId` | 0 |
| Validaciones con claim sin allocation | 11 en 10 descuentos |
| Settlements GASTRO con allocations | 0 (sin multi-discount, sin transfers legacy activas asociadas) |
| `DEBIT_COURTESY` (cortesías financiadas) | 0 |

**Riesgos reales:** los 6 perfiles sin agreement legacy **no** reciben contrato (fail-closed: el backfill los reporta como `PROFILE_WITHOUT_AGREEMENTS`, sus validaciones quedan `MISSING_AGREEMENT` hasta que ADMIN cree el contrato del descuento). Las 11 validaciones pendientes se valúan con el contrato del descuento por `validatedAt`; el dry-run en producción lista explícitamente las que queden sin cobertura (`pending validations uncovered`). No hubo contradicción con el discovery.

---

## 3. A1 — Migration `20261102120000_benefit_agreement_discount_scope` — PASS

- `BenefitCommercialAgreement`: `gastroDiscountId TEXT NULL` (FK → `GastroDiscount` **RESTRICT**), `derivedFromAgreementId TEXT NULL` (self-FK **RESTRICT**); índices `(tenantId, vertical, gastroDiscountId)` y `(gastroDiscountId, validFrom)`.
- `BenefitSettlementTransfer`: `gastroDiscountId TEXT NULL` (FK **RESTRICT**); índices `(settlementId, gastroDiscountId)`, `(tenantId, gastroDiscountId)`. Sin uso hasta G10.D.
- CHECKs (solo SQL): `…_discount_scope_check` (descuento ⇒ GASTRO + `gastroProfileId`), `…_activity_scope_check` (ACTIVITY ⇒ sin descuento), `…_derived_scope_check` (linaje solo en filas por descuento). Coherencia `agreement.gastroProfileId = discount.gastroProfileId` = app + integridad (no cross-table CHECK).
- **Seguridad:** columnas nullable (sin rewrite de tabla), aditiva, sin UPDATE/DELETE, sin backfill en la migration.
- **Local:** `prisma migrate deploy` → 112 migrations, schema up to date. `prisma migrate diff` (DB → schema) sin diferencias en los objetos nuevos. Se corrigió un nombre de índice > 63 caracteres (`…_tenantId_vertical_gastroDiscount_idx`, el nombre que Prisma espera) para no generar drift.
- **Rollback probado en local:** `scripts/ops/g10-a1-rollback.sql` (precondiciones documentadas en el archivo) → aplicado → migration re-aplicada OK.

---

## 4. A2 — Shared / alcance — PASS

- `resolveBenefitAgreementScope` → `DISCOUNT | PROFILE_LEGACY | OPERATOR` (derivado, no persistido); `isDiscountScopedGastroAgreement`, `isLegacyGastroAgreement`, `isBenefitAgreementReadOnly`, `isBenefitAgreementScopeShapeValid`, `isNewBenefitAgreementScopeValid`, `benefitAgreementMatchesDiscountProfile`.
- Zod: create GASTRO exige `gastroProfileId` + `gastroDiscountId` (GASTRO por local **prohibido**); resolve acepta `gastroDiscountId` (pricing) o `gastroProfileId` (legacy, gate transitorio); `discount-history` query; list con `gastroDiscountId` + `scope`.
- DTO: `gastroDiscountId`, `scope`, `derivedFromAgreementId`, `discountTitle`.
- `ErrorCode.BENEFIT_AGREEMENT_LEGACY_READ_ONLY`; integridad pura `checkAgreementScopeMismatch`, `checkAllocationAgreementDiscountMismatch`; `groupMissingAgreementsByBenefit`, `selectedValidationsMissingAgreement`.

## 5. A3 — Agreement service por descuento — PASS

- `benefit-agreement-scope.util.ts`: `agreementScopeWhere` (única fuente de filtros por alcance), `lockAgreementScope`, `mapAgreementWriteConflict` (P2034 → 409).
- create/replace: transacción `Serializable` + `FOR UPDATE` sobre `GastroDiscount` (o `ExcursionOperator`) + overlap **dentro** de la tx → **carrera previa cerrada** (3 creates concurrentes ⇒ 1 contrato).
- create GASTRO: descuento del tenant y del mismo perfil (cross-profile bloqueado), perfil `ACTIVE`.
- Legacy: close / replace / notes → `BENEFIT_AGREEMENT_LEGACY_READ_ONLY`. `partner-history` GASTRO = solo legacy.
- `resolveApplicable({ gastroDiscountId })` = solo contratos del descuento; nunca `gastroDiscountId IS NULL`.
- `GET /admin/benefit-agreements/discount-history?gastroDiscountId=` → `current`, `history`, `legacyUsed` (contratos legacy que valuaron allocations del descuento, con conteo).
- Archivos divididos para respetar 300–400 líneas: `benefit-agreement-scope.util.ts`, `benefit-agreement-dto.util.ts`, `benefit-discount-agreement-history.service.ts`.

## 6. A4 — Backfill — PASS

- Script: `pnpm --filter api run benefit-agreements:backfill-discount-scope [-- --confirm] [--tenant <id>] [--json]`.
- Planner puro (`discount-agreement-backfill.plan.ts`) + runner (`discount-agreement-backfill.runner.ts`).
- Elegibilidad (D-G10-2): `gastroProfileId` no nulo; excluye cortesía financiada, `REJECTED` sin validaciones; expirados/archivados/cortesía cancelada solo si tienen validaciones pendientes; descuentos que ya tienen contrato propio no se tocan.
- Segmentos: solo los que tocan la vida del descuento; `validFrom` recortado al día AR de alta del descuento (sin cobertura previa inventada). Segmentos legacy solapados ⇒ `LEGACY_OVERLAP`, sin copia.
- Confirm: insert-only, una transacción `Serializable` por perfil, lock por descuento y re-chequeo de idempotencia/overlap antes de cada insert; audit `BENEFIT_AGREEMENT_CREATED` con actor `system:g10-discount-agreement-backfill` y `metadata.backfill = 'G10.A4'`.
- Reporte: profiles scanned, legacy agreements, candidates, copies to insert, already existing, profiles without agreements, discounts without profile, funded courtesies skipped, discounts without coverage, pending validations uncovered.
- Integridad: `evaluateAgreementScopes` (`AGREEMENT_SCOPE_MISMATCH`) también expuesto en `GET /admin/benefit-reporting/integrity` (`agreementScopeIssues`).

**Local:** dry-run sobre la DB local → 1 perfil sin agreements, 1 descuento sin cobertura, 0 copias (sin términos inventados). Dataset controlado: dry-run 2 copias / 0 escrituras → confirm **2 inserts** → segundo confirm **0 inserts** (idempotente); allocation histórica y fila legacy intactas.

## 7. A5 — Eligibility / pricing — PASS

- Pricing: validation → `discountId` → contratos de ese descuento (filtrados además por `gastroProfileId` del partner: un contrato cross-profile nunca valúa ⇒ fail-closed). Legacy excluido.
- D1: cortesía financiada excluida **antes** de buscar contrato (nunca `MISSING_AGREEMENT`). Cortesía no financiada: contrato propio.
- D-G10-6 (GASTRO): generate/refresh no bloquean (summary `missingAgreementUsageCount` + `missingAgreementsByBenefit`; pendientes con `missingAgreementsByBenefit`); allocate explícito bloquea solo si alguna elegida no tiene contrato; allocate por `count` toma solo valuables; `close` sigue bloqueando. ACTIVITY: sin cambios (sigue bloqueando).
- Allocation: schema sin cambios (snapshot `agreementId`/`unitPriceCents`/`barterMultiplier`/`baseAmountCents`/`currency`). Trazabilidad `allocation.validationId → validation.discountId`.
- Integridad por allocation: `ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH` (allocation valuada con el contrato de otro descuento); legacy no se marca.
- Escenarios G8.11 (Postgres) adaptados: cada descuento facturable con contrato propio; Caso G reemplaza el contrato **del descuento**.

---

## 8. Tests

| Suite | Resultado |
|---|---|
| `test:benefit-agreement-scope` (nuevo, puro) | PASS |
| `test:g10-discount-agreements` (nuevo, Postgres) | PASS |
| `test:g10-agreement-backfill` (nuevo, puro + Postgres) | PASS |
| `test:g10-discount-pricing` (nuevo, Postgres) | PASS |
| `test:benefit-commercial-agreements` | PASS (DB: NO EJECUTADO — faltan partners seed, preexistente) |
| `test:benefit-settlement-domain` / `-transfers` / `-admin-ui` / `-reporting` / `-hardening` | PASS |
| `test:benefit-settlement-operations` | PASS (escenario DB seed preexistente: NO EJECUTADO) |
| `test:g5-agreement-allocation-snapshots` | PASS |
| `test:g6-discount-economic-traceability` / `-summary` / `-accounting` | PASS |
| `test:courtesy-credit-ledger`, `test:gastro-courtesy-credit-funding` | PASS |
| `test:gastro-courtesy-accounting` (Postgres A–H) | PASS |
| `test:gastro-courtesy-approval` / `-hardening` / `-lifecycle`, `test:admin-gastro-courtesy` | PASS |
| `test:gastro-multi-local` (cross-profile) | PASS |
| `test:activity-coupon-domain` / `-ownership` / `-scan` | PASS |

Cobertura de los casos obligatorios: A resuelve A / B no ve A; historial A1→A2 (B no ve ninguno); legacy legible pero fuera del pricing; backfill A_P/B_P + re-run 0; allocation histórica intacta; A $5.000 / B $7.500 en mismo local y período; missing aislado (generate OK, allocate A OK, allocate B FAIL, close FAIL); funded sin lookup / non-funded con contrato propio; ACTIVITY (agreements, settlement, allocation, bloqueo por faltante) sin cambios; cross-profile bloqueado; CHECKs y FK `RESTRICT` verificados en PostgreSQL real.

## 9. Builds

`shared` PASS · `api` PASS · `web` PASS · `scanner` PASS.

---

## 10. Gaps transitorios (cerrar en G10.B — **no desplegar G10.A sola**)

1. **UI de contratos:** el panel G5 («Crear acuerdo del local» / «Cambiar tarifa del local») y `/admin/liquidaciones/acuerdos/nuevo` envían contratos GASTRO por local ⇒ ahora **400** (D-G10-10). Hasta G10.B no hay UI para crear el contrato de un descuento (solo `POST /admin/benefit-agreements` con `gastroDiscountId`).
2. **Gates de approval** (`approve`, `approveCourtesy`, alta ADMIN de cortesía) siguen consultando el CURRENT **legacy del local** (resolver transitorio `gastroProfileId`). Un descuento aprobado así no tiene contrato propio ⇒ sus usos quedan `MISSING_AGREEMENT`. G10.B pasa todos los gates a `gastroDiscountId` + D-G10-3/4/5.
3. `BenefitSettlementTransfer.gastroDiscountId` existe pero no se usa hasta G10.D (D-G10-7).

**Corrección al handoff de G10.0:** allí se recomendó no mezclar G10.A con G10.B en un deploy. Por (1) y (2), G10.A **no es operable sola**: el deploy de producción debe llevar **G10.A + G10.B juntos** (manteniendo el orden migrate → restart → backfill).

## 11. Orden de deploy (cuando el operador lo indique)

```text
1. prisma migrate deploy                         (solo agrega columnas/FKs/índices/CHECKs)
2. restart yti-api / yti-web con código G10.A+B  (fail-closed: descuento sin contrato = sin contrato)
3. benefit-agreements:backfill-discount-scope    (dry-run) → comparar con A0
4. benefit-agreements:backfill-discount-scope -- --confirm
5. dry-run otra vez → copies to insert = 0; GET /admin/benefit-reporting/integrity → agreementScopeIssues = []
```

**Rollback:** solo antes de la primera allocation/transfer discount-scoped — `scripts/ops/g10-a1-rollback.sql` (borra filas por descuento, CHECKs y columnas, y la fila de `_prisma_migrations`) + código anterior. Después: solo forward-fix.

## 12. Estado

```text
Production migration executed: NO
Production backfill executed:   NO
Push:                           NO
Deploy:                         NO
Ready for G10.B:                YES
```
