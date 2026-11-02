# V3.3 G10.C — Resumen económico por descuento (cierre)

**Fecha:** 2026-11-02  
**Rama:** `feat/v1-s03-api-foundation` · HEAD inicial `e12a2d6` (cierre G10.B)  
**Alcance:** slices C1–C5 sobre G10.A + G10.B. Lectura económica exacta por `GastroDiscount` (ADMIN completa, GASTRO read-only redactada).  
**Producción:** migration **NO** ejecutada · backfill **NO** ejecutado · **sin push, sin deploy**. **Sin migrations nuevas.**

> **Release:** G10.A + G10.B + G10.C **todavía NO desplegados**. G10.C es solo lectura y no agrega schema, pero depende de las columnas de G10.A (`gastroDiscountId` en agreement y transfer). Ver §8.

---

## 1. Commits

| Slice | Commit | Mensaje |
|---|---|---|
| C1 | `41539e4` | `feat(v3.3): add per-discount economic summary contract and precision model` |
| C2 | `a109a24` | `feat(v3.3): serve the per-discount economic summary to admin` |
| C3 | `b4a7609` | `feat(v3.3): expose a read-only discount economic summary to gastro owners` |
| C4 | `b0727ac` | `feat(v3.3): show per-discount economic metrics in the admin discount detail` |
| C5 | este commit | `feat(v3.3): show contract and settlements in the gastro discount detail` (+ docs) |

---

## 2. C1 — Contrato shared + modelo de precisión — PASS

`packages/shared`:

- `gastro-discount-economic-summary.ts` (puro): `GASTRO_DISCOUNT_ECONOMIC_PRECISIONS` (`EXACT`, `SETTLEMENT_LEVEL`, `PARTNER_LEVEL`, `PARTNER_LEVEL_LEGACY`, `NOT_ATTRIBUTABLE`), `countDiscountEconomicValidations`, `buildDiscountSettlementLines`, `summarizeDiscountCash`, `summarizeDiscountBarter`. Reutiliza `computeCashDueCents` / `computeCashReceivedCents` / `computeCashOutstandingCents` / `deriveCashCollectionStatus` / `resolveSettlementAgreementForValidation` (sin reimplementar reglas).
- `gastro-discount-economic-history.ts` (puro): `buildDiscountEconomicHistory` — `AGREEMENT_CREATED/CLOSED/REPLACED`, `ALLOCATED_CASH/BARTER`, `CREDIT_MATERIALIZED`, `PAYMENT_REGISTERED/REVERSED`. Solo hechos persistidos; allocations / créditos de una misma operación se agrupan (settlement + modo + actor + minuto) con conteo y total reales, como el historial de liquidaciones.
- `schemas/gastro-discount-economic-summary.ts`: `GastroDiscountEconomicSummary` = unión discriminada por `audience` (`ADMIN` | `GASTRO`). Reutiliza `benefitCommercialAgreementDtoSchema` (ADMIN completo; GASTRO `pick` de términos). `redactGastroDiscountEconomicSummaryForGastro` = parse por el schema GASTRO (Zod descarta claves no declaradas ⇒ la redacción es estructural, no "UI oculta").

| Bloque | Campos | Precisión |
|---|---|---|
| `discount` | `id, gastroProfileId, title, status, visibility, isCourtesy, settlementBillability` | — |
| `agreement.current` / `history` | contrato(s) `scope = DISCOUNT` de este descuento | EXACT |
| `agreement.legacyUsed` | solo contratos legacy del local que **valuaron allocations de este descuento** (+ `usageCount`) | `PARTNER_LEVEL_LEGACY` |
| `validations` | `total, billable, fundedCourtesy, allocated, pending, pendingWithoutAgreement` (con claim; master QR nunca factura) | EXACT |
| `cash.generatedCents` | Σ `baseAmountCents` de allocations CASH de las validaciones del descuento | EXACT |
| `cash.paidCents` | Σ transfers **activas** con `gastroDiscountId = discount` | EXACT |
| `cash.remainingCents` | `generated − paid` (nunca prorratea) | `EXACT` o `SETTLEMENT_LEVEL` |
| `cash.unattributedSettlementReceivedCents` | transfers activas **sin** descuento en los settlements donde el descuento debe CASH | SETTLEMENT_LEVEL (informativo) |
| `barter` | `usageCount, baseCents, creditGeneratedCents` (ledger `CREDIT_FROM_SETTLEMENT` por `sourceAllocationId`, neto de reversas — mismo cálculo que `sumMaterializedCreditForAllocations`) | EXACT |
| `settlements[]` | discount-level (`discountCashDue/Paid/Remaining`, `discountCollectionStatus`, `discountBarterBase`) vs settlement-level (`settlementCashDue/Received/Outstanding`, `unattributedReceivedCents`), `containsOtherDiscounts`, `hasUnattributedTransfers`, `remainingPrecision` | EXACT / SETTLEMENT_LEVEL |
| `payments[]` | `transferId, settlementId, periodKey, amountCents, currency, transferredAt, reference, isActive, reversedAt, reversalReason` (+ ADMIN: `notes, proofUrl, registeredBy, reversedBy`) | EXACT |
| `history[]` | timeline (+ ADMIN: `actorLabel`) | hechos persistidos |
| `partnerCredit` | `balanceAvailableCents` del local, rotulado "Saldo general del local" | PARTNER_LEVEL |

**No se expone** `creditConsumedByDiscount` (NOT_ATTRIBUTABLE). CASH y crédito nunca se suman.

**Regla de precisión de `remaining`:** `SETTLEMENT_LEVEL` solo si algún settlement **donde el descuento debe CASH** tiene transfers activas sin `gastroDiscountId`. Un descuento que solo tiene CANJE en ese settlement sigue `EXACT` (esa transfer no puede ser pago suyo). La cifra mostrada sigue siendo `generated − pagos atribuidos`.

## 3. C2 — Servicio + endpoint ADMIN — PASS

- `GastroDiscountEconomicSummaryService` (`benefit-settlements/`, archivo nuevo; `admin-gastro.service.ts` **no** se tocó) + `gastro-discount-economic-summary.loader.ts` (lecturas Prisma). Fuentes: `BenefitDiscountAgreementHistoryService.discountHistory` (current/history/legacyUsed, fuente G10.A), `GastroDiscountValidation`, `BenefitSettlementUsageAllocation`, `BenefitSettlement`, `BenefitSettlementTransfer`, `CourtesyCreditLedgerEntry`, `AuditLog` (`BENEFIT_AGREEMENT_*`), `CourtesyCreditLedgerService.getPartnerBalance`. Respuesta validada con el schema ADMIN.
- `GET /admin/gastronomicos/:profileId/descuentos/:discountId/economic-summary` (+ alias `discuentos`), `RequireRole(ADMIN)`, params Zod `adminGastroDiscountIdParamsSchema`.
- Scope: `tenantId + gastroProfileId (ruta) + discountId` en una sola query; cualquier desajuste (perfil de otro local, otro tenant, perfil vacío) ⇒ **404** (patrón G8.10.11). Nunca "URL de A + descuento de B".
- `BenefitSettlementsModule` importa `BenefitAgreementsModule` (sin ciclo). G6 `economic-metrics` / `economic-traceability` siguen en la API por compatibilidad (la UI ya no los usa).

## 4. C3 — Endpoint GASTRO read-only — PASS

- `GET /gastro/discounts/:id/economic-summary` (params Zod `gastroDiscountEconomicSummaryParamsSchema`, sin query).
- `GastroDiscountEconomicsPortalService` (archivo nuevo) reutiliza `GastroPortalDiscountsService.assertOwnDiscount` (ahora público, sin cambio de lógica): `discount.id → gastroProfileId → assertCanOperateProfile`. `profileId` nunca es autoridad. El servicio económico vuelve a filtrar por el perfil autorizado (defensa en profundidad) y devuelve la proyección redactada.
- Sin endpoints de escritura económica en el controller GASTRO (verificado por test de fuentes).

## 5. C4 — UI ADMIN — PASS

`/admin/gastronomicos/:profileId/descuentos/:discountId` → sección **Métricas económicas** (`AdminGastroDiscountEconomicSummaryPanel`) **reemplaza** el panel G6 (`AdminGastroDiscountEconomicMetricsPanel` eliminado, junto con su método de repositorio y su query key). Componentes compartidos en `components/gastro/economic-summary/`:

1. **Contrato del descuento:** Contrato vigente, Valor por validación, Multiplicador, Vigencia; sin contrato ⇒ "Sin contrato comercial vigente" + enlace "Cargar contrato del descuento" al panel B3 (`#contrato-comercial`). Usos históricos con contrato del local ⇒ rotulados `PARTNER_LEVEL_LEGACY`.
2. **Validaciones:** Totales, Facturables, Liquidadas, Pendientes, Pendientes sin contrato; cortesía financiada en bloque aparte.
3. **CASH:** Generado / Pagado / Pendiente + badge de precisión; con `SETTLEMENT_LEVEL`: "Existen pagos del settlement sin atribución a un descuento. El pendiente mostrado no prorratea esos pagos." + monto sin atribuir.
4. **Canje:** Usos asignados a canje, Base, Crédito generado; "El crédito pertenece al saldo general del local." + "Saldo general del local" (PARTNER_LEVEL).
5. **Liquidaciones:** Período, Estado (+ estado de cobro del descuento), CASH generado/pagado/pendiente, Canje base, Precisión; badges "Incluye otros descuentos" / "Pagos sin atribuir"; totales de la liquidación completa aparte; link a `/admin/liquidaciones/:id`.
6. **Pagos:** Fecha, Monto, Referencia, Período, Estado (+ quién registró/revirtió, notas), Comprobante (solo ADMIN). **Sin botón "Registrar pago"** (G10.D).
7. **Historial económico:** contratos, asignaciones, crédito generado, pagos, reversiones (con actor).

Copy "agreement/tarifa del local" eliminado de la web. Las mutaciones de contrato (B3) invalidan también los resúmenes económicos.

## 6. C5 — UI GASTRO — PASS

`/gastro/descuentos/:id` → sección **Contrato y liquidaciones** (`GastroDiscountEconomicSummaryPanel`), misma vista con payload GASTRO: contrato (valor, canje, vigencia), validaciones, CASH generado/pagado/pendiente, canje base y crédito generado, liquidaciones (período, estado), pagos (fecha, monto, referencia). Sin notas, actores, comprobantes ni links de admin; sin acción de edición de contrato. Empty states:

- Sin contrato: "Este descuento todavía no tiene un contrato comercial cargado. Las validaciones no podrán liquidarse hasta que Administración lo configure."
- Sin validaciones / liquidaciones / pagos: textos del prompt.

## 7. Tests

| Suite | Resultado |
|---|---|
| `test:g10-discount-economic-summary` (nuevo, puro) | PASS — escenarios A–G en el modelo puro, historial (sin duplicar REPLACED, agrupación real), redacción GASTRO, rutas read-only (GASTRO solo GET sin `profileId`; ADMIN sin escrituras económicas) |
| `test:g10-discount-economic-summary-db` (nuevo, **PostgreSQL**) | PASS — ver escenarios abajo |
| `test:g10-discount-economic-summary-ui` (nuevo, puro web) | PASS — copy exacto, estado de contrato, advertencia de precisión, historial, keys, fuentes sin "Registrar pago"/mutaciones, comprobante solo ADMIN, GASTRO sin edición ni links admin |
| G10.A/B: `test:benefit-agreement-scope`, `test:g10-discount-agreements`, `-agreement-backfill`, `-discount-pricing`, `-discount-approval`, `-discount-activation`, `-discount-agreement-ui` | PASS (Postgres donde aplica) |
| `test:benefit-commercial-agreements` | PASS (escenario DB seed: NO EJECUTADO, preexistente) |
| G7.12 / Etapa 9: `test:benefit-settlement-domain` / `-transfers` / `-admin-ui` / `-reporting` / `-hardening` / `-operations` | PASS (escenario seed de operations: NO EJECUTADO, preexistente) |
| G5/G6: `test:g5-agreement-allocation-snapshots`, `test:g6-discount-economic-traceability` / `-summary` / `-accounting` | PASS |
| G8: `test:courtesy-credit-ledger`, `test:gastro-courtesy-credit-funding`, `test:gastro-courtesy-accounting` (Postgres A–H) | PASS |
| Cortesías: `test:gastro-courtesy-approval` / `-hardening` / `-lifecycle` / `-emails` / `-delivery` / `-scanner` / `-portal` / `-studio`, `test:admin-gastro-courtesy` | PASS (`-studio` verifica que cada llamada web a `/admin/gastronomicos/…` existe en la API, incluida `economic-summary`) |
| Multi-local: `test:gastro-multi-local`, `test:admin-gastro-discount-profile-scope` | PASS |
| ACTIVITY: `test:activity-coupon-domain` / `-ownership` / `-scan` | PASS (scan: DB NO EJECUTADO, preexistente) |

**Escenarios DB (`test:g10-discount-economic-summary-db`):**

| # | Escenario | Resultado |
|---|---|---|
| A | Contrato $5.000, 10 validaciones CASH | generado $50.000 · pagado $0 · pendiente $50.000 · EXACT |
| B | Transfer atribuida $30.000 (fixture DB controlado; el write path es G10.D) + una atribuida revertida | pagado $30.000 · pendiente $20.000 · EXACT · revertida excluida · ADMIN ve notas/comprobante/actor |
| C | A ($50k) y B ($30k) en el mismo settlement | A = $50.000, B = $30.000; nunca $80.000 individual; settlement-level $80.000 rotulado aparte |
| D | Transfer legacy sin descuento en el settlement | pagado = solo atribuidas · `hasUnattributedTransfers` · `remainingPrecision = SETTLEMENT_LEVEL` · no aparece como pago del descuento |
| E | CANJE base $20.000 × 2 | base $20.000 · crédito $40.000 (ledger) · EXACT (aunque su settlement tenga transfer legacy, no debe CASH) |
| F | Cortesía financiada con validaciones | CASH 0 · CANJE 0 · `pendingWithoutAgreement` 0 · `FUNDED_COURTESY_NOT_BILLABLE` |
| G | Descuento ACTIVE sin contrato | `current = null` · `pendingWithoutAgreement = 2` · sin crash |
| H | Allocation histórica con contrato `PROFILE_LEGACY` | sigue contando ($50.000 + $9.999) · `legacyUsed` la incluye (`PARTNER_LEVEL_LEGACY`) · `agreementId` intacto · antes de existir no se listan contratos del local |
| I | Seguridad | ADMIN: perfil B + descuento A ⇒ 404, otro tenant ⇒ 404. GASTRO: owner A → A PASS; owner A → descuento de otro local 403; otro owner 403; sin acceso gastro 403; otro tenant FAIL; servicio re-chequea el perfil |
| — | Historial | CREATED (con actor), REPLACED y CLOSED desde audit real, allocations, pagos, reversión |

**Smoke de arranque:** la API compilada arrancó contra la DB local y mapeó `GET /gastro/discounts/:id/economic-summary` y `GET /admin/gastronomicos/:profileId/descuentos/:discountId/economic-summary` (DI resuelta). **QA visual manual NO ejecutado** (sin sesión admin/gastro en esta corrida).

## 8. Builds y release

`shared` PASS · `api` PASS · `web` PASS · `scanner` PASS.

**Estado de release:** **G10.A + G10.B + G10.C todavía NO desplegados.** G10.C no agrega migrations ni backfill: se despliega en el mismo paquete que G10.A + G10.B con el mismo orden (`migrate deploy` → restart → backfill dry-run → confirm → verificación). Recomendación: liberar **A+B+C juntos** (C es read-only y da visibilidad para validar el backfill); G10.D puede ir en un release posterior. Si el operador prefiere un único release económico completo, A+B+C+D también es coherente.

## 9. QA manual pendiente (post-deploy)

- [ ] ADMIN detalle de descuento con contrato y usos CASH: cards Generado/Pagado/Pendiente coinciden con la liquidación.
- [ ] Descuento sin contrato: "Sin contrato comercial vigente" + enlace al panel de contrato; pendientes sin contrato > 0.
- [ ] Settlement con dos descuentos: cada detalle muestra solo lo suyo; badge "Incluye otros descuentos".
- [ ] Settlement con transferencia legacy: advertencia de pagos sin atribución; el pendiente no prorratea.
- [ ] Descuento con CANJE: base, crédito generado y "Saldo general del local".
- [ ] Cortesía financiada: bloque no facturable, sin CASH/CANJE.
- [ ] GASTRO `/gastro/descuentos/:id`: "Contrato y liquidaciones" sin notas, actores ni comprobantes; sin botones de edición; owner de otro local recibe error.

## 10. Fuera de alcance (G10.D)

Registrar / revertir CASH desde el descuento, asignar usos CASH/CANJE desde la nueva UI, exigir `gastroDiscountId` en el write path de transfers (D-G10-7), guard/integridad `DISCOUNT_CASH_OVERPAYMENT`. Hasta G10.D ningún flujo escribe `gastroDiscountId` en una transfer, así que `paidCents` será 0 en producción y cualquier transfer GASTRO existente o nueva queda como legacy (`SETTLEMENT_LEVEL`). Según A0, producción no tiene settlements GASTRO con allocations.

## 11. Estado

```text
New migrations:                 NO
Production migration executed:  NO
Production backfill executed:   NO
Push:                           NO
Deploy:                         NO
G10.A + G10.B + G10.C:          todavía NO desplegados
Ready for G10.D:                YES
```
