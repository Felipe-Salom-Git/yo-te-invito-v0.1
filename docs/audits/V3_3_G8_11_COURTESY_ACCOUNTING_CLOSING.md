# V3.3 — G8.11 — Accounting de cortesías (cierre)

**Branch:** `feat/v1-s03-api-foundation` · **HEAD inicial:** `8865459` · **Estado:** COMPLETADO (local). **Sin push. Sin deploy. Producción congelada.**
**Migrations:** NINGUNA. G8.12+ **NO iniciado**.

> **Regla registrada (D1):** cortesía **financiada** con Courtesy Credit = **uso operativo, NO facturable**. Cortesía **no financiada** = **facturable** (CASH o BARTER, como cualquier uso con claim).

| Slice | Commit | Resumen |
|---|---|---|
| G8.11.0 Audit | `a2b8786` | [`V3_3_G8_11_COURTESY_ACCOUNTING_DISCOVERY.md`](./V3_3_G8_11_COURTESY_ACCOUNTING_DISCOVERY.md): cadena real, sin migration |
| G8.11.1–G8.11.8 Elegibilidad | `13c2992` | Regla canónica, exclusión backend, guard en allocate + ledger, snapshots, tests A–H en PostgreSQL real |
| G8.11.9 Reporting | `c591f0a` | G6 operativo vs facturable, WARNING de integridad legacy, copy UI |
| Docs | (este commit) | Cierre + contextos |

## Trazabilidad (G8.11.0)

`GastroDiscountValidation.discountId` (NOT NULL) → `GastroDiscount.courtesyCampaign` (1:1, `discountId @unique`) → `GastroCourtesyCampaign.courtesyCreditDebit` (0..1, `sourceCourtesyCampaignId @unique`, `type = DEBIT_COURTESY`). Solo relaciones existentes en un `select` anidado (misma query del discovery, sin N+1). **No** se creó `BenefitSettlement → Campaign` ni `Allocation → Campaign`; el settlement sigue siendo **partner + period**.

## Elegibilidad (G8.11.1 / G8.11.2)

- `packages/shared/src/gastro-courtesy-accounting.ts` — **regla única** `resolveGastroValidationSettlementEligibility(validation, { tenantId, gastroProfileId, alreadyAllocated })`, que devuelve `eligible + kind (DISCOUNT|COURTESY)` o `reason`: `NO_CLAIM` (master QR) · `OUT_OF_SCOPE` (tenant/local) · `ALREADY_ALLOCATED` · `FUNDED_COURTESY`. Helpers: `isGastroCourtesyFundedByCredit`, `isGastroCourtesyDiscount`, `resolveGastroDiscountSettlementBillability`.
- Funding = existe `DEBIT_COURTESY` para la campaña; **no** depende de `visibility` (conservador frente a doble monetización).
- `BenefitSettlementEligibilityService.discoverGastro` usa la regla (backend-side). El discovery devuelve `fundedCourtesyExcluded`; como `generate / refresh / allocate / close / summary / pending-validations` usan el mismo discovery, la exclusión vale para todos.
- Pendientes: `fundedCourtesyExcludedCount`. Summary: `fundedCourtesyUsageCount` (opcional). Las cortesías financiadas **no** cuentan en `eligibleUsageCount`, `pendingUsageCount`, `pendingBaseAmountCents` ni bloquean `close`.
- El estado del descuento "al momento correspondiente" lo garantiza el scanner al validar; el settlement no reevalúa el estado actual (semántica G7.12 sin cambios).

## Guard de allocation (G8.11.3)

1. `allocate` con `validationIds` de cortesía financiada → **400 `BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY`** (`fundedValidationIds`); una selección mixta se rechaza entera.
2. Re-check dentro de la transacción `Serializable` (`assertNoFundedCourtesyValidations`) para CASH y BARTER.
3. Última línea: `CourtesyCreditLedgerService.materializeBarterCreditForAllocation` (único creador de `CREDIT_FROM_SETTLEMENT`, también usado por `reconcileMissingBarterCredits`) rechaza allocations de cortesías financiadas.
4. Una validation financiada de **otro** local da `NOT_PENDING` (no se filtra información).
Mensaje UI: "Alguno de los usos pertenece a una cortesía financiada con crédito: no es facturable (ni CASH ni BARTER)."

## Resultado económico

| | CASH | BARTER | Crédito nuevo |
|---|---|---|---|
| Cortesía **financiada** | `cashDue += 0` (sin allocation) | sin allocation | **nunca** `CREDIT_FROM_SETTLEMENT` |
| Cortesía **no financiada** | allocation CASH válida (10 × $5.000 = $50.000) | allocation BARTER válida | según snapshot (10 × $5.000 × 2 = $100.000) |

`BenefitSettlementTransfer` y sus reglas **no** se tocaron (no hay caso especial de cortesía).

## Snapshots y agreement (G8.11.7 / G8.11.8)

- La allocation de una cortesía no financiada guarda `agreementId`, `unitPriceCents`, `barterMultiplier`, `baseAmountCents`, `currency` (verificado contra DB). Cambiar el agreement **no** modifica allocations históricas (caso G). Nada se persiste en `GastroCourtesyCampaign` ni en `GastroDiscount`.
- Aprobar comercialmente ≠ facturar. La cortesía financiada sigue exigiendo agreement CURRENT para aprobarse (G8.3, sin cambios), pero sus validations no entran en el settlement. La no financiada usa el agreement vigente en la aprobación y el snapshot al liquidar (arquitectura normal).

## Reporting (G8.11.9)

- **G6** (`GastroDiscountEconomicReportingService`): agrega `settlementBillability` (`BILLABLE` | `FUNDED_COURTESY_NOT_BILLABLE`) y `courtesyFunding` (`campaignId`, `ledgerEntryId`, `imputedValueCents` del `DEBIT_COURTESY` propio: EXACT por `sourceCourtesyCampaignId`). `validatedUsageCount` queda como uso **operativo**; la base facturable sale solo de allocations. Semántica EXACT / SETTLEMENT_LEVEL / PARTNER_LEVEL / NOT_ATTRIBUTABLE intacta; **no** existen `cashTransferredByCourtesy` ni `barterConsumedByCourtesy`.
- Reporting mensual, partners e integridad derivan del summary, así que la cortesía financiada **no** cuenta como `usageCount` ni `baseGeneratedCents`.
- **Integridad:** WARNING `FUNDED_COURTESY_ALLOCATED` para allocations **legacy** (previas a G8.11) de cortesías financiadas. No se reescriben (allocations inmutables, ledger append-only): ADMIN corrige con `ADJUSTMENT`.
- **UI admin:** en usos pendientes, aviso "Cortesía financiada con crédito · No facturable" con el conteo; en el overview del settlement, la fila "Cortesías financiadas con crédito (no facturables)"; en el panel económico del descuento, un bloque con el monto financiado. Las cortesías financiadas no son seleccionables para CASH/BARTER.

## Ledger e idempotencia (G8.11.10 / G8.11.11)

- Financiar = **un** `DEBIT_COURTESY` (crédito $100.000 → financiar $40.000 → saldo $60.000). Repetir el funding devuelve `created: false`.
- Validar no debita (el scanner no referencia el ledger). Cerrar no debita (`close()` no usa el ledger). Retry `generate`/`refresh` no genera crédito. Settlement `CLOSED` → `ALREADY_CLOSED`.

## Reversión de financiamiento (G8.11.12) — DEFERRED

- Si ADMIN cancela una cortesía financiada antes de usarse, la campaña y sus claims `ACTIVE` pasan a `CANCELLED` y el `DEBIT_COURTESY` **queda**: el crédito no se restaura.
- Hoy no existe una operación segura para restaurarlo: `reverseEntry` solo acepta entradas positivas y `REVERSAL` debe ser negativo. Un `ADJUSTMENT` positivo no tendría vínculo inequívoco con el débito ni idempotencia.
- **Motivo del DEFER:** el schema ya permite trazabilidad (`reversalOfEntryId @unique`), pero hace falta **semántica nueva de ledger** (`REVERSAL` positivo para revertir un débito) y reglas de negocio (¿solo con 0 usos?, ¿parcial?, ¿automática o manual?). La propuesta está en el discovery §6. No se modificó ni borró ninguna entry.

## Tests

| Suite | Resultado |
|---|---|
| `test:gastro-courtesy-accounting` (**nuevo**, 74 checks: regla pura, guards estáticos, escenarios A–H + reporting en PostgreSQL) | **PASS** |
| `benefit-settlement-operations` (47), `-admin-ui` (12), `-domain` (24), `-hardening` (8), `-reporting` (15), `-transfers` (23), `benefit-commercial-agreements` (20) | **PASS** |
| `g6-discount-economic-accounting` (19), `-summary` (6), `-traceability` (6) | **PASS** |
| `courtesy-credit-ledger` (21), `gastro-courtesy-credit-funding` (8) | **PASS** |
| `gastro-courtesy-hardening` / `-lifecycle` / `-approval` / `-delivery` / `-scanner` / `-studio` / `-emails` / `-portal`, `admin-gastro-courtesy` | **PASS** |
| `gastro-cross-profile-isolation`, `gastro-multi-local`, `admin-gastro-discount-profile-scope`, `gastro-owner-discount-scope`, `gastro-discount-metrics-scope` | **PASS** |
| shared `benefit-settlement-operations.assert` / `benefit-settlement-history.assert` (dist) | **PASS** |

Casos económicos (todos contra DB real): **A** normal 10 × $5.000 → CASH $50.000 · **B** cortesía no financiada → CASH base $50.000 + snapshot · **C** no financiada BARTER ×2 → crédito $100.000 · **D** financiada: $100.000 → $60.000, validations existen, no elegibles · **E** inyección CASH/BARTER/mixta/count → rechazada, 0 allocations · **F** MIXED (3 normales + 2 no financiadas ✅, 10 financiadas ❌): cash due $15.000, crédito solo $20.000, cierra OK · **G** agreement reemplazado: allocations históricas intactas, uso nuevo con la tarifa nueva · **H** cross-profile: B 100% elegible, validation de A → `NOT_PENDING` en B.

## Builds

shared **PASS** · api **PASS** · web **PASS** · scanner **PASS**.

## DB integration — PASS

PostgreSQL local (Docker `yo-te-invito-postgres`, `localhost:5433`, **111 migrations aplicadas, schema up to date**). Los escenarios usan los servicios Nest reales (`BenefitSettlementsService`, `BenefitSettlementEligibilityService`, `BenefitSettlementPendingValidationsService`, `CourtesyCreditLedgerService`, `BenefitSettlementIntegrityService`, `BenefitSettlementReportingService`, `GastroDiscountEconomicReportingService`) sobre un **tenant aislado** que se borra al final (verificado: 0 tenants residuales). Alcance: settlements/ledger/funding/reporting. El scanner HTTP y la concurrencia real siguen fuera de alcance.

## Manual QA

**NO EJECUTADO** (browser). Checklist:
1. Admin → Liquidaciones → período con cortesía financiada: el aviso "Cortesía financiada con crédito · No facturable" muestra el conteo y esos usos no aparecen como seleccionables.
2. Overview: aparece la fila "Cortesías financiadas con crédito (no facturables)" y "Pendientes de asignar" no las incluye.
3. Cerrar el settlement con solo cortesías financiadas restantes → se permite.
4. Admin → Local → descuento de cortesía financiada → panel económico muestra el bloque con el monto financiado; una cortesía no financiada no lo muestra.
5. Cortesía no financiada → asignar CASH y BARTER → montos y crédito según el acuerdo.

## Deferred

- Reversión de `DEBIT_COURTESY` al cancelar una cortesía sin usos (semántica de ledger nueva; propuesta en el discovery §6).
- Datos reales de producción no auditados: si existieran allocations legacy de cortesías financiadas, se detectan con `FUNDED_COURTESY_ALLOCATED` y se corrigen manualmente.
- QA browser (checklist arriba). Activity: consumo de cortesía sigue diferido (sin funding Activity).

## Working tree

Limpio salvo lo preexistente no incluido a propósito: `.cursorignore` (untracked) y `packages/shared/src/benefit-settlement-operations.assert.ts` (solo CRLF).

**Push:** NO · **Deploy:** NO · **G8.12+:** NOT STARTED
