# V3.3 G10 — Contrato, liquidación y pagos por descuento (cierre)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation`  
**Rango:** `50d0c29` (G10.0) → cierre G10.E. Base remota / producción: `765f8f2` (G9).  
**Estado:** **G10 COMPLETE en código.** Una migration aditiva (solo local), backfill ensayado. **Sin push, sin deploy, sin migration ni backfill en producción.** QA manual: pendiente post-deploy.

> **Release:** G10.A + G10.B + G10.C + G10.D son **una sola unidad**. No desplegar parcialmente. Orden y STOP conditions: [`docs/runbooks/V3_3_G10_PRODUCTION_DEPLOY.md`](../runbooks/V3_3_G10_PRODUCTION_DEPLOY.md). Readiness: [`V3_3_G10_RELEASE_READINESS.md`](./V3_3_G10_RELEASE_READINESS.md).

---

## 1. Qué cambió (en una frase)

Antes, el contrato comercial era **del local** y el cobro CASH solo existía **por liquidación** (pago por descuento NOT EXACT). Ahora cada `GastroDiscount` facturable tiene **su propio contrato**, se aprueba / activa solo con él, su lectura económica es **exacta** y cada pago CASH se atribuye a **un** descuento; los contratos del local quedan como historia read-only.

## 2. Etapas

| Etapa | Commits | Cierre | Resultado |
|---|---|---|---|
| **G10.0** Discovery | `50d0c29` | [`…_DISCOVERY.md`](./V3_3_G10_DISCOUNT_COMMERCIAL_ACCOUNTING_DISCOVERY.md) | Opción A (`gastroDiscountId` en agreement), settlement sigue local + período, pago CASH exacto con `gastroDiscountId` en transfer, CANJE = allocation BARTER. Decisiones D-G10-1…10 cerradas por el operador |
| **G10.A** Schema + agreements + backfill + pricing | `83d61ab`…`bc2429d` | [`…_A_…CLOSING.md`](./V3_3_G10_A_DISCOUNT_AGREEMENTS_CLOSING.md) | Migration `20261102120000_benefit_agreement_discount_scope`; alcance `DISCOUNT` / `PROFILE_LEGACY` (read-only) / `OPERATOR`; create/replace Serializable + lock; backfill insert-only idempotente; pricing por descuento; missing aislado (close bloquea). A0 de producción: PASS WITH WARNINGS |
| **G10.B** Approval + UI de contrato | `af110bb`…`e12a2d6` | [`…_B_…CLOSING.md`](./V3_3_G10_B_DISCOUNT_AGREEMENT_APPROVAL_UI_CLOSING.md) | `GastroDiscountAgreementGateService` en todo camino a ACTIVE; cortesía financiada sin contrato; on-behalf / cortesía ADMIN no financiada atómicos; sección «Contrato comercial»; `/admin/liquidaciones/acuerdos` por descuento; emails con el contrato del descuento |
| **G10.C** Resumen económico | `41539e4`…`2e6a2d2` | [`…_C_…CLOSING.md`](./V3_3_G10_C_DISCOUNT_ECONOMIC_SUMMARY_CLOSING.md) | `GastroDiscountEconomicSummaryService` (ADMIN completo / GASTRO redactado por schema); modelo de precisión EXACT / SETTLEMENT_LEVEL / PARTNER_LEVEL / PARTNER_LEVEL_LEGACY / NOT_ATTRIBUTABLE |
| **G10.D** Pagos exactos CASH / CANJE | `1553f26`…`ea1d57b` | [`…_D_…CLOSING.md`](./V3_3_G10_D_EXACT_DISCOUNT_PAYMENTS_CLOSING.md) | Transfer GASTRO exige descuento; guards por descuento + settlement en Serializable + `FOR UPDATE` con retry; allocate aislado por descuento; UI «Liquidar validaciones» / «Registrar pago» / «Revertir pago»; integridad `DISCOUNT_CASH_OVERPAYMENT` / `TRANSFER_DISCOUNT_SCOPE_MISMATCH` |
| **G10.E** Release readiness | `307b1af`, `af6c010`, `ab92be7`, `89ccd38`, cierre | este documento | E1–E5 abajo |

## 3. G10.E

### E1 — Reporting + integridad final — PASS (`307b1af`)

Revisados `GastroDiscountEconomicSummaryService`, `BenefitSettlementReportingService`, `GastroDiscountEconomicReportingService` (G6, solo compatibilidad), `BenefitSettlementIntegrityService`, `CourtesyCreditLedgerService`.

| Regla | Confirmado |
|---|---|
| Precisión | EXACT / SETTLEMENT_LEVEL / PARTNER_LEVEL (+ PARTNER_LEVEL_LEGACY) / NOT_ATTRIBUTABLE se mantienen; nada exacto se degrada a estimado; nunca se prorratea |
| CASH por descuento | generado = Σ allocations CASH de las validaciones del descuento; pagado = Σ transfers **activas** con `gastroDiscountId`; pendiente = generado − pagado |
| Transfers legacy (`gastroDiscountId = null`) | `SETTLEMENT_LEVEL`; nunca suman a `paidCents`; solo degradan la precisión del pendiente donde el descuento debe CASH |
| CANJE | base y crédito generado por descuento EXACT (ledger `CREDIT_FROM_SETTLEMENT` por `sourceAllocationId`); `creditConsumedByDiscount` **no se expone** (NOT_ATTRIBUTABLE); saldo del local `PARTNER_LEVEL` |
| Cortesía financiada (D1) | operativa sí, facturable no, CASH 0, BARTER 0, nunca `MISSING_AGREEMENT` |
| Reporting mensual / partners | sigue siendo settlement-level (incluye pagos legacy, rotulado aparte); no mezcla niveles |

Correcciones:

1. **CLI de integridad rota:** `benefit-settlements:audit-integrity` fallaba con `ReferenceError: tenantId is not defined` y solo corría chequeos pre-G10. Ahora reutiliza la lógica de `GET /admin/benefit-reporting/integrity` (todas las páginas, todos los tenants, `agreementScopeIssues` incluidos) vía `benefit-settlement-integrity-audit.runner.ts`; solo lectura (un audit log que intente escribirse aborta); exit 2 si hay ERROR. Es el paso 17 del runbook.
2. **Auditoría de liquidación:** las transfers de `GET /admin/benefit-settlements/:id/audit` ahora traen `gastroDiscountId` + `attribution` (EXACT / SETTLEMENT_LEVEL) en vez de perder la atribución.

Chequeos de integridad vigentes: `CASH_OVERPAYMENT`, `CURRENCY_MISMATCH`, `CLOSED_WITH_PENDING_USAGES`, `BARTER_*` (sin crédito, duplicado, monto, huérfano, drift), `NEGATIVE_COURTESY_BALANCE`, `ORPHAN_ALLOCATION`, `PARTNER_MISMATCH`, `FUNDED_COURTESY_ALLOCATED`, `ALLOCATION_AGREEMENT_DISCOUNT_MISMATCH`, `AGREEMENT_SCOPE_MISMATCH`, `DISCOUNT_CASH_OVERPAYMENT`, `TRANSFER_DISCOUNT_SCOPE_MISMATCH`. Nueva suite `test:g10-release-reporting-integrity-db` (PostgreSQL): precisión de punta a punta + filas corruptas insertadas detrás de los guards ⇒ cada código G10 detectado, y snapshot antes / después idéntico (sin auto-reparación).

### E2 — Regresión global — PASS (`af6c010`)

102 suites: **97 PASS**, 5 fallas de entorno / previas fuera de G10 (`door-scan`, `legal-documents`, `me-legal-acceptance`, `auth-resend-verification`, `getnet-auth`), **0 regresiones**. Todos los casos críticos repetidos (contratos A/B, pricing $5.000 / $7.500, CASH 50/30/20, cross-discount, BARTER exactly-once, missing aislado, cortesías, concurrencia ×2 y ×3, ACTIVITY). `test:gastro-discount-scan` corrido por primera vez contra PostgreSQL + HTTP (fixture corregido): VALID / ALREADY_USED / INVALID / INACTIVE. Detalle: [`V3_3_G10_E2_REGRESSION.md`](./V3_3_G10_E2_REGRESSION.md).

### E3 — DB integration + ensayo de release — PASS (`ab92be7`)

Base pre-G10 (111) sembrada con el cliente Prisma de G9 → `migrate deploy` (solo la migration G10, 0 filas cambiadas) → API de HEAD (fail-closed) → dry-run (plan exacto, 0 escrituras) → confirm (solo INSERT: 6 + 6 audits) → segundo dry-run (0) → integridad OK (`agreementScopeIssues = []`) → legacy idéntico → locales sin contrato sin copias. Detalle: [`V3_3_G10_E3_DB_REHEARSAL.md`](./V3_3_G10_E3_DB_REHEARSAL.md).

### E4 — Readiness + runbook — PASS (`89ccd38`)

[`V3_3_G10_RELEASE_READINESS.md`](./V3_3_G10_RELEASE_READINESS.md) (CODE / DB / MIGRATION / BACKFILL / DEPLOY / MANUAL QA / ROLLBACK) y [`V3_3_G10_PRODUCTION_DEPLOY.md`](../runbooks/V3_3_G10_PRODUCTION_DEPLOY.md) (19 pasos; `shared` antes de la API; backup GCS verificado; solo `migrate deploy`; dry-run → A0 → confirm → dry-run; STOP si difiere de A0; integridad CLI + `scripts/ops/g10-e4-post-backfill-verify-readonly.sql`; rollback por ventana, forward-fix después del backfill).

### E5 — QA manual + cierre — PASS (este commit)

[`V3_3_G10_MANUAL_QA_CHECKLIST.md`](./V3_3_G10_MANUAL_QA_CHECKLIST.md) por rol y flujo (contratos, approval, resumen, CASH, CANJE, GASTRO, cortesías, multi-descuento, multi-local, legacy, mobile, scanner, integridad). Contextos actualizados.

## 4. Builds finales

| Comando | Resultado |
|---|---|
| `pnpm --filter shared run build` | PASS |
| `pnpm --filter api run build` | PASS |
| `pnpm --filter web run build` | PASS (`fetch failed` al prerenderizar sin API levantada, exit 0, previo) |
| `pnpm --filter scanner run build` | PASS |

Corridos en `ab92be7`; los commits posteriores son solo documentación.

## 5. Pendiente (fuera de G10.E)

- Push + deploy según el runbook (cuando el operador lo indique).
- QA manual post-deploy (checklist).
- Post-deploy operativo: cargar el contrato de los 5 descuentos ACTIVE/APPROVED sin cobertura (A0).
- Deuda conocida: pantalla ADMIN para cortesía no financiada, upload privado de comprobantes, reversa de `DEBIT_COURTESY`, fixtures de smokes HTTP no-G10 (`door-scan`, legales), assert previo de `auth-resend-verification`.

## 6. Estado

```text
G10.0 / A / B / C / D / E:      COMPLETE (código)
New migrations in G10.E:        NO   (G10 total: 1, aditiva, de G10.A)
Production migration executed:  NO
Production backfill executed:   NO
Push:                           NO
Deploy:                         NO
Recommended release:            G10.A + B + C + D together
Ready to push:                  YES
Ready to deploy:                YES (runbook; STOP condition A0)
Manual QA:                      PENDING POST-DEPLOY
```
