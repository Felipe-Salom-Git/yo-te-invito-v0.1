# V3.3 G7.12 — Operación completa de Liquidaciones (closing)

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation`  
**Discovery:** [`V3_3_G7_12_SETTLEMENT_OPERATIONS_DISCOVERY.md`](./V3_3_G7_12_SETTLEMENT_OPERATIONS_DISCOVERY.md)  
**Push / merge / deploy:** **NO** (todo local)  
**Migrations:** **ninguna** (el schema existente alcanzó)  
**G8 / G9:** **NOT STARTED**

## Rango de commits

| | SHA |
|---|---|
| HEAD inicial (G7.11 cerrado) | `c1766bb` |

| Slice | Commit | Mensaje |
|---|---|---|
| G7.12.0 | `3570ccc` | docs(v3.3): audit settlement operational workflow |
| G7.12.1 | `8a5f72f` | feat(v3.3): add settlement overview with cash and barter breakdown |
| G7.12.2 | `1e09dab` | feat(v3.3): list pending settlement validations with benefit detail |
| G7.12.3 | `edcb849` | feat(v3.3): allocate selected settlement usages to cash or barter |
| G7.12.4 | `5948ac3` | feat(v3.3): add settlement cash transfer section with partial payments |
| G7.12.5 | `a255f3c` | feat(v3.3): attach proof links to settlement transfers |
| G7.12.6 | `54e9ca3` | feat(v3.3): add inline transfer reversal with reason and trace |
| G7.12.7 | `785b633` | feat(v3.3): break down settlement barter credit by agreement snapshot |
| G7.12.8 | `a30bb31` | feat(v3.3): show readable settlement history from audit timeline |
| G7.12.9 | `bec6fc9` | feat(v3.3): derive settlement display status and guard close on unpriced usages |
| G7.12.10 | `044f049` | feat(v3.3): carry discount context into settlement detail |
| G7.12.11 | `75c81ac` | feat(v3.3): show derived settlement status in admin list |
| G7.12.12–13 | `87d912f` | test(v3.3): cover settlement operation security and economic scenarios |
| G7.12.15 | *(este doc)* | docs(v3.3): close settlement operations |

## Qué cambió

- **Detalle (G7.12.1):** encabezado con socio/vertical/período/estado persistido, acuerdos aplicados, bloque CASH (usos, base, segmentos por tarifa, transferido, pendiente) y bloque BARTER.
- **Validaciones pendientes (G7.12.2):** `GET /admin/benefit-settlements/:id/pending-validations` (fecha, descuento, código, valor del acuerdo). Fix A4: `audit.allocations[].validatedAt` ahora es la fecha real de la validación (`loadBenefitValidationDetails`).
- **Asignación por selección (G7.12.3):** body `allocate` = `mode` + (`count` **XOR** `validationIds`). Los ids deben pertenecer a la lista pendiente de **esa** liquidación (otro socio / otro período / ya asignado → `BENEFIT_SETTLEMENT_VALIDATION_NOT_PENDING`). Mismo flujo transaccional (`Serializable` + `FOR UPDATE`); BARTER materializa crédito en la misma tx. Vista previa en UI (`previewAllocationSelection`, no autoritativa).
- **Transferencias (G7.12.4):** deuda / transferido / restante; pagos parciales; **se permiten tras `CLOSED`** (fix U4; cerrar congela usos, no cobranza).
- **Comprobantes (G7.12.5):** `proofUrl` opcional (`http(s)` validado) + «Ver comprobante». **Sin archivos en DB.**
- **Reversión (G7.12.6):** motivo obligatorio + confirmación; se muestran `reversedAt`, `reversalReason` y quién; la fila **nunca se borra**.
- **BARTER (G7.12.7):** `n × unit`, base, `×multiplicador`, crédito generado (snapshot por acuerdo) y balance disponible del ledger.
- **Historial (G7.12.8):** `buildSettlementHistory` sobre el audit timeline existente (asignaciones, transferencias, reversiones, créditos). Sin audit log nuevo.
- **Estado (G7.12.9):** `deriveSettlementDisplayStatus` (Pendiente de asignar / Pendiente de pago / Parcialmente pagada / Pagada / Con canje / Cerrada) **derivado, no persistido**; persistido sigue `OPEN | PARTIALLY_ALLOCATED | ALLOCATED | CLOSED`. Cierre bloqueado con usos pendientes **o** validaciones sin acuerdo aplicable (`resolveSettlementCloseBlocker`). Cobranza **no** bloquea cierre (CLOSED ≠ PAID).
- **Contexto desde descuento (G7.12.10):** `?fromDiscountId=` llega al detalle y **solo** agrupa/enfoca visualmente. El descuento nunca es clave contable; no existe Settlement → Discount.
- **Listado (G7.12.11):** columna de estado derivado + cobranza.

## Semántica contable (sin cambios)

| Nivel | Qué | Dónde |
|---|---|---|
| **Exacto** (allocation) | validación → modo, snapshot (`agreementId`, `unitPriceCents`, `barterMultiplier`, `baseAmountCents`, moneda), crédito por `sourceAllocationId` | `BenefitSettlementUsageAllocation`, ledger |
| **Settlement-level** | deuda CASH, transferido, restante, estado de cobranza, transferencias/reversiones | `BenefitSettlement` + transfers |
| **Partner-level** | balance y consumo del ledger de cortesías | `CourtesyCreditLedgerEntry` |
| **No atribuible por descuento** | `cashTransferredByDiscount`, `cashRemainingByDiscount`, `barterConsumedByDiscount` | **no se calculan ni se muestran** |

La liquidación sigue siendo `partner + período` (unique intacto). Los snapshots históricos no se reescriben al reemplazar un acuerdo (cubierto por test).

## Seguridad

- Controller `@RequireRole(Role.ADMIN)` + `JwtOrDevAuthGuard`/`RolesGuard`; `tenantId` siempre del JWT.
- Bodies `.strict()`: no admiten `tenantId`, socio, `discountId` ni `settlementId`.
- Reversión acotada por `tenantId` **y** `settlementId`; registro de transferencia lockea la liquidación del tenant.
- Allocate selecciona solo de la lista pendiente de la liquidación (partner A no puede asignar validaciones de B).

## Proofs: decisión

Solo existe subida a bucket **público** (`/uploads/public-image`); comprobantes bancarios no deben ir ahí. Se usa **link** ingresado por ADMIN. **Diferido:** upload privado + URLs firmadas (diseño S8 `private/invoices/`), cuando exista bucket privado.

## Tests

| Comando | Resultado |
|---|---|
| `test:benefit-settlement-operations` (nuevo; 47 checks seguridad + económicos) | **PASS** |
| `test:benefit-settlement-domain` / `-transfers` | unit **PASS**; DB integration **NO EJECUTADO** (sin PostgreSQL local) |
| `test:benefit-settlement-admin-ui` / `-reporting` / `-hardening` | **PASS** |
| `test:g6-discount-economic-traceability` / `-summary` / `-accounting` | **PASS** |
| `benefit-settlement-operations.assert.js`, `benefit-settlement-history.assert.js` (shared) | **PASS** |
| Asserts web (`pesos-input`, `settlement-generate-context`, `settlement-partner-options`, `local-preview-state`, `managed-reviews-url`) | **PASS** |

Escenarios económicos cubiertos: CASH 10×$5.000 → deuda $50.000 → $30.000 → resta $20.000 → $20.000 → $0 (sobrepago rechazado); reversión reabre deuda; BARTER 10×$5.000×2 = $100.000 (sin deuda CASH); MIXED 20 → 10/10 sin doble asignación; snapshots históricos intactos tras cambio de acuerdo.

**DB integration (aislamiento tenant/socio sobre filas reales): NO EJECUTADO** — no hay PostgreSQL local; los guards de tenant/rol están cubiertos por tests unitarios y de código fuente, no por DB.

## Builds

| Target | Resultado |
|---|---|
| `@yo-te-invito/shared` / `api` / `web` / `scanner` build | **PASS** (ECONNREFUSED en SSG sin API local — conocido) |
| Web `tsc --noEmit` standalone | **PREEXISTING FAIL** — solo `vitest` en `subcategoryRailThreshold.test.ts` |

## QA manual pendiente (browser, post-deploy)

- [ ] Detalle: overview CASH/BARTER y segmentos por tarifa
- [ ] Selección de validaciones → preview → asignar CASH / BARTER; mixta 10/10
- [ ] Transferencias parciales hasta $0; sobrepago bloqueado; registrar tras cerrar
- [ ] Link de comprobante; reversión con motivo y traza visible
- [ ] Historial legible; estado derivado en detalle y listado
- [ ] «Liquidar» desde descuento → detalle enfocado (sin filtrar otros descuentos)
- [ ] Cierre bloqueado con pendientes / sin acuerdo

## Pendiente / diferido

- Upload privado de comprobantes (URLs firmadas).
- Tests de integración con DB real (requiere PostgreSQL local).
- Push/deploy de G7.11 + G7.12 en una ventana conjunta, solo con confirmación explícita.
- G8 (cortesías) y G9 (UX final): **no iniciados**.
