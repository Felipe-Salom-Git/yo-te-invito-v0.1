# V3.3 G10.D — Pagos exactos CASH / CANJE por descuento (cierre)

**Fecha:** 2026-11-02  
**Rama:** `feat/v1-s03-api-foundation` · HEAD inicial `2e6a2d2` (cierre G10.C)  
**Alcance:** slices D1–D5 sobre G10.A + G10.B + G10.C. Cobro CASH atribuido exactamente a un `GastroDiscount`, asignación CASH / CANJE por selección explícita desde el detalle del descuento, atribución visible en la liquidación e integridad.  
**Producción:** migration **NO** ejecutada · backfill **NO** ejecutado · **sin push, sin deploy**. **Sin migrations nuevas** (usa `BenefitSettlementTransfer.gastroDiscountId` creado por G10.A).

---

## 1. Commits

| Slice | Commit | Mensaje |
|---|---|---|
| D1 | `1553f26` | `feat(v3.3): attribute GASTRO CASH transfers exactly to one discount` |
| D2 | `91b14a1` | `feat(v3.3): isolate settlement allocation per discount` |
| D3 | `8c4fd4e` | `feat(v3.3): assign discount validations to CASH or CANJE from the admin detail` |
| D4 | `f2dfbf2` | `feat(v3.3): register and reverse discount CASH payments from the admin detail` |
| D5 | este commit | `feat(v3.3): show discount attribution and integrity in settlements` (+ docs) |

Working tree al iniciar: `packages/shared/src/benefit-settlement-operations.assert.ts` modificado solo por fin de línea (diff de contenido vacío) y `.cursorignore` sin trackear. Ninguno entra en los commits de G10.D.

---

## 2. Reglas aplicadas

- **CASH = dos operaciones:** (1) allocation `mode=CASH` (genera deuda) y (2) transfer CASH (cobro). Registrar un pago **nunca** crea allocations.
- **CANJE = allocation `mode=BARTER`** → `CREDIT_FROM_SETTLEMENT` exactly-once (motor existente). **No existe "pago CANJE"** ni segundo sistema contable.
- **D-G10-7:** toda `BenefitSettlementTransfer` GASTRO nueva lleva `gastroDiscountId`. Filas existentes sin descuento = legacy `SETTLEMENT_LEVEL`: sin backfill, sin atribución, sin conversión automática.
- **Precisión:** nunca prorratear, inferir ni atribuir por porcentaje.

## 3. D1 — Transfer CASH atribuida — PASS

- Contrato: `registerBenefitSettlementTransferBodySchema` + `gastroDiscountId` (opcional en Zod; la obligatoriedad depende del vertical del settlement y se valida en servidor). DTO de transfer + `gastroDiscountId` + `attribution` (`EXACT` | `SETTLEMENT_LEVEL`).
- Shared puro `benefit-settlement-discount-payments.ts`: `computeDiscountCashDueCents`, `computeDiscountCashPaidCents`, `assertDiscountTransferWouldNotOverpay`, `resolveDiscountTransferMaxCents`, `resolveBenefitTransferDiscountRequirement`, `resolveBenefitTransferAttribution`.
- `BenefitSettlementTransfersService.register` (misma transacción **Serializable + `SELECT … FOR UPDATE`** del settlement):
  1. GASTRO sin `gastroDiscountId` ⇒ `400 BENEFIT_TRANSFER_DISCOUNT_REQUIRED`; ACTIVITY con `gastroDiscountId` ⇒ `400 BENEFIT_TRANSFER_DISCOUNT_SCOPE_INVALID`; ACTIVITY sin él ⇒ comportamiento previo.
  2. Descuento existente, del tenant y con `gastroProfileId = settlement.gastroProfileId`; si no ⇒ `BENEFIT_TRANSFER_DISCOUNT_SCOPE_INVALID`.
  3. `discountCashDue(S, D) = Σ baseAmountCents` de allocations CASH de S cuya validación pertenece a D (join `validationId → GastroDiscountValidation.discountId`).
  4. **Guard de descuento:** transfers activas atribuidas `(S, D)` + monto ≤ `discountCashDue(S, D)`; si no ⇒ `400 BENEFIT_SETTLEMENT_DISCOUNT_CASH_OVERPAYMENT` (con due / paid / remaining).
  5. **Guard de settlement (existente, se mantiene):** transfers activas `(S)` + monto ≤ `cashDue(S)` ⇒ `BENEFIT_TRANSFER_OVERPAYMENT`.
- **Concurrencia:** los conflictos de serialización (P2034 / 40001) se reintentan (máx. 4 intentos); el perdedor relee las transfers ya comprometidas y falla por sobrepago, nunca con 500 ni doble cobro. Agotados los intentos ⇒ `409 BENEFIT_TRANSFER_CONCURRENT_CONFLICT`.
- Audit `BENEFIT_TRANSFER_REGISTERED`: `settlementId`, `gastroDiscountId`, `amountCents`, `currency`. `BENEFIT_TRANSFER_REVERSED`: + `gastroDiscountId` (y `reason`, `amountCents`).
- **Reversa:** la existente (append-only: `reversedAt` / `reversedByUserId` / `reversalReason`, nunca borra), ahora también con retry serializable. La capacidad settlement-level y discount-level se restaura por derivación (solo cuentan transfers activas).

## 4. D2 — Allocation / missing agreements — PASS

D-G10-6 ya estaba aplicado desde G10.A5; se verificó de punta a punta y se agregó aislamiento explícito por descuento:

| Operación | Comportamiento verificado |
|---|---|
| `generate` / `refresh` | Crea / refresca aunque haya descuentos sin contrato; `summary.missingAgreementsByBenefit` agrupado por descuento |
| `allocate` con `validationIds` | Falla solo si alguna **elegida** no tiene contrato; la selección fallida no asigna nada |
| `allocate` por `count` | Solo validaciones valuadas, elegibles y pendientes; nunca consume `MISSING_AGREEMENT` |
| CASH | Genera deuda; nunca una transfer |
| BARTER | `CREDIT_FROM_SETTLEMENT` exactly-once (unique por validación + `sourceAllocationId`); reintento ⇒ `NOT_PENDING`; doble request concurrente ⇒ una sola allocation y un solo crédito |
| Cortesía financiada | No facturable: ni CASH, ni BARTER, ni `MISSING_AGREEMENT` |
| `close` | Sigue bloqueando con usos facturables sin contrato o sin allocation |

Nuevo:

- `allocate` acepta `gastroDiscountId` (solo con `validationIds`, nunca con `count`): cada validación elegida debe pertenecer a ese descuento del mismo tenant y local; si no ⇒ `400 BENEFIT_SETTLEMENT_VALIDATION_DISCOUNT_MISMATCH` **antes de cualquier escritura**. El audit de allocation incluye `gastroDiscountId`.
- `GET /admin/gastronomicos/:profileId/descuentos/:discountId/pending-validations` (`GastroDiscountPendingValidationsService`, ADMIN, Zod params, scope tenant + local + descuento ⇒ 404 si no coincide): validaciones con claim **no asignadas** del descuento, con `periodKey`, `pricingStatus` (`PRICED` | `MISSING_AGREEMENT` | `FUNDED_COURTESY`), contrato / valor / multiplicador, cupón y email, settlement del período (id + estado), `allocatable` y `blockedReason` (`MISSING_AGREEMENT` | `FUNDED_COURTESY` | `SETTLEMENT_CLOSED`). El pricing sale de `discoverEligibleValidations` (el mismo motor que `allocate`), nunca reimplementado.

## 5. D3 — UI «Liquidar validaciones» — PASS

`/admin/gastronomicos/:profileId/descuentos/:discountId` → **Métricas económicas** → **Liquidar validaciones** (`AdminDiscountSettleValidationsSection` + `AdminDiscountPendingPeriodTable` + `AdminDiscountAssignModal`):

- Validaciones pendientes agrupadas por período: fecha, cupón / usuario, valor unitario, contrato, estado. Selección múltiple **explícita** por período.
- `MISSING_AGREEMENT` visible y **deshabilitada** con «Sin contrato vigente para la fecha de validación»; liquidación cerrada ⇒ «Liquidación del período cerrada».
- **Asignar a CASH** / **Asignar a CANJE** abren un modal «Liquidar como: ○ CASH ○ CANJE» con cantidad, base y (CANJE) crédito estimado. Confirmar ⇒ `generate` del período si no existe la liquidación ⇒ `allocate { mode, validationIds, gastroDiscountId }`. Nunca `count`.
- Cortesía financiada: sin acciones CASH / CANJE (texto no facturable).
- Refresca economic-summary, lista de pendientes y liquidaciones (también las mutaciones de `/admin/liquidaciones/:id` refrescan los resúmenes por descuento).

## 6. D4 — UI «Registrar pago» / «Revertir pago» — PASS

En el bloque **Pagos** del mismo detalle (slots solo ADMIN; el portal GASTRO no los recibe):

- **Registrar pago** (`AdminDiscountRegisterPaymentModal`): selector de período / liquidación con solo settlements donde el descuento tiene `CASH due > CASH paid`; muestra «Saldo CASH del descuento en esa liquidación»; máximo = saldo del descuento, acotado por el pendiente del settlement si hay pagos legacy sin atribuir (aviso visible). Campos: Monto, Fecha, Referencia, Notas, Comprobante URL (`http(s)`, implementación actual; sin upload privado). Modo CASH fijo; texto explícito «El CANJE no se paga».
- **Revertir pago** en pagos activos ⇒ `ReverseTransferModal` (motivo obligatorio, sin `window.prompt` / `window.confirm`) ⇒ reversa append-only.
- Después de asignar / registrar / revertir se refrescan economic-summary y el resumen de la liquidación.

## 7. D5 — Liquidación, integridad — PASS

`/admin/liquidaciones/:id` (`SettlementCashTransfersSection` dividido en `SettlementTransfersTable` + `SettlementRegisterTransferForm` + `ReverseTransferModal`):

- GASTRO: columnas **Descuento, Local, Monto, Referencia, Estado** (+ fecha, comprobante). Transfer nueva ⇒ título del descuento + badge **EXACT**. `gastroDiscountId = null` ⇒ «Pago legacy sin atribución» + badge **SETTLEMENT_LEVEL** (sin inferir descuento).
- `GET /admin/benefit-settlements/:id/transfers` (GASTRO) agrega `discountTitle` / `discountLocalName` por transfer y `discountCash[]` (due / paid / remaining por descuento; las transfers legacy nunca cuentan).
- Formulario de transferencia GASTRO: exige elegir el descuento (solo con saldo CASH), máximo = saldo del descuento acotado por el pendiente del settlement. ACTIVITY: sin cambios.
- Reversa desde la liquidación: mismo modal con motivo (se quitó el `window.confirm`).
- **Integridad** (`BenefitSettlementIntegrityService`, también en reporting): `DISCOUNT_CASH_OVERPAYMENT` (ERROR) si transfers activas atribuidas `(S, D)` > `discountCashDue(S, D)`; `TRANSFER_DISCOUNT_SCOPE_MISMATCH` (ERROR) si la transfer nombra un descuento inexistente, de otro tenant, de otro local o en un settlement ACTIVITY. Legacy sin descuento no se inspecciona por descuento.
- Reporting mensual: **sin cambios** (no hacía falta). Economic-summary se calcula en vivo y la UI lo invalida tras register / reversa.

---

## 8. Tests

| Suite | Resultado |
|---|---|
| `test:g10-discount-payments` (nuevo, puro) | PASS — helpers due / paid / max, requisito por vertical, contrato Zod, guards dentro del lock, reversa append-only, aislamiento de allocate, integridad pura |
| `test:g10-discount-payments-db` (nuevo, **PostgreSQL**) | PASS — escenarios 1–7, 12, 13, concurrencia ×2 y ×3, guard settlement-level con legacy, vista de liquidación, integridad |
| `test:g10-discount-allocation-db` (nuevo, **PostgreSQL**) | PASS — escenarios 8–11, aislamiento por descuento, lista de pendientes, `count`, `close`, liquidación cerrada |
| `test:g10-discount-settlement-actions-ui` (nuevo, puro web) | PASS — selección explícita, missing deshabilitada, CASH / CANJE, registrar pago, modal de reversa, badge legacy, sin `window.confirm/prompt` |
| G10.A: `test:benefit-agreement-scope`, `test:g10-discount-agreements`, `-agreement-backfill`, `-discount-pricing` | PASS (Postgres) |
| G10.B: `test:g10-discount-approval`, `-discount-activation`, `-discount-agreement-ui` | PASS |
| G10.C: `test:g10-discount-economic-summary`, `-db`, `-ui` | PASS (assert de `-ui` actualizado: la vista compartida sigue sin mutaciones; las acciones viven en slots ADMIN que GASTRO nunca recibe) |
| G7.12 / Etapa 9: `test:benefit-settlement-domain` / `-transfers` / `-admin-ui` / `-reporting` / `-hardening` / `-operations` | PASS (escenario seed de `-operations`: NO EJECUTADO, preexistente) |
| G5 / G6: `test:g5-agreement-allocation-snapshots`, `test:g6-discount-economic-traceability` / `-summary` / `-accounting` | PASS |
| Agreements: `test:benefit-commercial-agreements` | PASS (escenario DB seed: NO EJECUTADO, preexistente) |
| G8 / ledger: `test:courtesy-credit-ledger`, `test:gastro-courtesy-credit-funding`, `test:gastro-courtesy-accounting` (Postgres A–H) | PASS |
| Cortesías: `test:gastro-courtesy-approval` / `-hardening` / `-lifecycle` / `-emails` / `-delivery` / `-scanner` / `-portal` / `-studio`, `test:admin-gastro-courtesy` | PASS |
| Multi-local: `test:gastro-multi-local`, `test:admin-gastro-discount-profile-scope` | PASS |
| ACTIVITY: `test:activity-coupon-domain` / `-ownership` / `-scan` | PASS (scan DB: NO EJECUTADO, preexistente) |

**Escenarios obligatorios (Postgres):**

| # | Escenario | Resultado |
|---|---|---|
| 1 | A: 10 × $5.000 CASH, pago $30.000 | generado $50.000 · pagado $30.000 · pendiente $20.000 · EXACT · audit con settlement / descuento / monto / moneda |
| 2 | Segundo pago $20.000 | pagado $50.000 · pendiente $0 |
| 3 | +$1 | `BENEFIT_SETTLEMENT_DISCOUNT_CASH_OVERPAYMENT` |
| 4 | Revertir $20.000 | pagado $30.000 · pendiente $20.000 · fila intacta · audits intactos · segunda reversa rechazada |
| 5 | A $50k / B $30k mismo settlement | pago de A no reduce B (B pendiente $30.000) |
| 6 | Cross-discount | A pagado completo con saldo de B en el settlement ⇒ sobrepago de A rechazado |
| 7 | Settlement A + descuento de B / inexistente / otro tenant / sin descuento | `SCOPE_INVALID` / `SCOPE_INVALID` / `SCOPE_INVALID` / `DISCOUNT_REQUIRED` |
| 8 | CANJE 4 × $5.000 × 2 | base $20.000 · crédito $40.000 · cero transfers |
| 9 | CANJE duplicado (secuencial + concurrente) | sin allocation ni crédito duplicados |
| 10 | A con contrato / M sin contrato | allocate A PASS · allocate M FAIL · selección mixta FAIL sin asignar nada |
| 11 | Cortesía financiada | no elegible CASH / CANJE; nunca `MISSING_AGREEMENT` |
| 12 | Transfer legacy | sigue `SETTLEMENT_LEVEL`, no se modifica; `remainingPrecision = SETTLEMENT_LEVEL` |
| 13 | ACTIVITY | transfer sin `gastroDiscountId` PASS; con `gastroDiscountId` rechazada; guard de settlement sin cambios |
| Conc. | Dos requests por el último $20.000 | una PASS, una `DISCOUNT_CASH_OVERPAYMENT`; sin doble cobro. Tres requests: una PASS |
| Settlement guard | Descuento con saldo $20.000, settlement con $5.000 por pago legacy | $10.000 ⇒ `BENEFIT_TRANSFER_OVERPAYMENT`; $5.000 PASS |

**Smoke de arranque:** la API compilada arrancó contra la DB local y mapeó `GET /admin/gastronomicos/:profileId/descuentos/:discountId/pending-validations` (DI resuelta). **QA visual manual NO ejecutado** (sin sesión admin en esta corrida) ⇒ checklist §10.

## 9. Builds

`shared` PASS · `api` PASS · `web` PASS · `scanner` PASS. Web `tsc` suelto: solo los errores `vitest` preexistentes.

## 10. QA manual pendiente (post-deploy)

- [ ] Detalle de descuento con usos pendientes: «Liquidar validaciones» por período; fila sin contrato visible y deshabilitada con el texto exacto.
- [ ] Asignar a CASH ⇒ CASH generado sube; no aparece ningún pago. Asignar a CANJE ⇒ base + crédito generado; saldo general del local sube.
- [ ] Registrar pago: solo períodos con saldo; el máximo coincide con el saldo CASH del descuento; superar ⇒ error.
- [ ] Revertir pago: modal con motivo obligatorio; el pago queda «Revertido» y el pendiente vuelve.
- [ ] `/admin/liquidaciones/:id` GASTRO: columnas Descuento / Local; transfer nueva EXACT; transfer legacy «Pago legacy sin atribución» + SETTLEMENT_LEVEL; formulario exige descuento.
- [ ] ACTIVITY: formulario y tabla de transferencias como antes.
- [ ] Integridad: `GET /admin/benefit-reporting/integrity` sin `DISCOUNT_CASH_OVERPAYMENT` / `TRANSFER_DISCOUNT_SCOPE_MISMATCH`.

## 11. Release

- **Recomendación: liberar A + B + C + D juntos.** G10.D cambia el contrato de escritura de transfers GASTRO (exige descuento). Según A0, producción no tiene settlements GASTRO con allocations: desplegando D junto con A–C ninguna transfer GASTRO de producción nace sin atribución, y no aparecen transfers legacy nuevas que después queden `SETTLEMENT_LEVEL` para siempre.
- Orden (igual que G10.A §11): `prisma migrate deploy` (solo la migration aditiva de G10.A) → restart `yti-api` / `yti-web` → `benefit-agreements:backfill-discount-scope` dry-run → `--confirm` → dry-run de verificación (0 copias) + integridad (`agreementScopeIssues = []`, sin issues de G10.D).
- Rollback: solo antes de la primera allocation / transfer por descuento (`scripts/ops/g10-a1-rollback.sql`). Después: forward-fix.

## 12. Fuera de alcance (no implementado, por diseño)

Tabla hija de atribución de pagos, split / prorrateo automático, conversión de transfers legacy, upload privado de comprobantes, reversa de `DEBIT_COURTESY`, cambios en agregados mensuales de reporting (G10.E opcional).

## 13. Estado

```text
New migrations:                 NO
Production migration executed:  NO
Production backfill executed:   NO
Push:                           NO
Deploy:                         NO
Ready for G10.E:                YES
```
