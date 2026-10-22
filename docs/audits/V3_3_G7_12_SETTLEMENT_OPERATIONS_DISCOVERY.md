# V3.3 G7.12.0 — Discovery operativo de Liquidaciones

**Fecha:** 2026-10-22  
**Rama:** `feat/v1-s03-api-foundation` · HEAD inicial `c1766bb`  
**Alcance:** auditoría del dominio Etapa 9 + G5/G6 para operación ADMIN completa. Sin código.

---

## 1. Modelo real (Prisma)

| Modelo | Rol | Notas |
|---|---|---|
| `BenefitCommercialAgreement` | Tarifa por partner (`gastroProfileId` xor `excursionOperatorId`) | Inmutable post-create; reemplazo = cerrar + crear. `unitPriceCents` BigInt, `barterMultiplier` Decimal(8,4), `currency`. |
| `BenefitSettlement` | Liquidación **partner + período** | `status` `BenefitSettlementStatus`; `closedAt`; **sin** FK a descuento. Unicidad partner+period por partial unique SQL (`20260901140000`). |
| `BenefitSettlementUsageAllocation` | Uso validado → modo económico | Snapshots `agreementId`, `unitPriceCents`, `barterMultiplier`, `baseAmountCents`, `currency`, `allocatedAt`, `allocatedByUserId`. `@@unique([validationSource, validationId])` (una validación se asigna una sola vez en todo el tenant). |
| `BenefitSettlementTransfer` | Pago CASH (parcial/múltiple) | `amountCents`, `currency`, `transferredAt`, `reference`, `notes`, **`proofUrl`**, `registeredByUserId`, `reversedAt`, `reversedByUserId`, `reversalReason`. Nunca se borra. |
| `CourtesyCreditLedgerEntry` | Crédito de canje (append-only) | `CREDIT_FROM_SETTLEMENT` (1 por allocation BARTER, `sourceAllocationId @unique`), `DEBIT_COURTESY` (1 por campaña, `sourceCourtesyCampaignId @unique`), `ADJUSTMENT`, `REVERSAL`. Balance = `SUM(entries)` por partner+currency. |

### Estados reales

```text
BenefitSettlementStatus (persistido):
  OPEN                 sin allocations
  PARTIALLY_ALLOCATED  hay allocations y quedan usos pendientes
  ALLOCATED            todos los usos elegibles asignados
  CLOSED               congelado (closedAt)

BenefitCashCollectionStatus (derivado, NO persistido):
  NONE | PENDING | PARTIALLY_RECEIVED | RECEIVED
```

**No existen** `PAID` / `PARTIALLY_PAID`. `CLOSED ≠ pagado`: cerrar congela usos; las transferencias CASH pueden seguir registrándose (decisión Etapa 9).

`deriveBenefitSettlementStatus` recalcula OPEN/PARTIALLY_ALLOCATED/ALLOCATED tras cada allocate.

## 2. Fuentes de validación elegibles

| Vertical | Fuente | Regla |
|---|---|---|
| GASTRO | `GastroDiscountValidation` | `claimId != null`; `discount.tenantId` + `discount.gastroProfileId` = partner; `validatedAt` dentro del período (AR). |
| ACTIVITY | `ActivityCouponValidation` | `result = VALID`, `claimId != null`; `coupon.tenantId` + `coupon.excursionOperatorId` = partner. |

Precio: `resolveSettlementAgreementForValidation(agreements del partner, validatedAt)`. Sin agreement → `BENEFIT_SETTLEMENT_MISSING_AGREEMENTS` (bloquea generate/refresh/allocate).

Orden: `compareSettlementValidationOrder` (validatedAt asc, id asc).

## 3. API existente (`/admin/benefit-settlements`, ADMIN, tenant del JWT)

| Endpoint | Estado |
|---|---|
| `GET /` list (vertical, partner, period, status, paginado) | ✅ |
| `POST /generate` (idempotente partner+period; CLOSED → 409) | ✅ |
| `GET /:id` (DTO + summary) | ✅ |
| `POST /:id/refresh` | ✅ |
| `POST /:id/allocate` `{ mode, count }` — **solo por cantidad**, del más antiguo | ✅ (sin selección individual) |
| `POST /:id/close` (bloquea si `pendingUsageCount > 0`) | ✅ |
| `GET/POST /:id/transfers` (overpay guard, currency ARS, serializable + `FOR UPDATE`) | ✅ — **no acepta `proofUrl`** |
| `POST /:id/transfers/:transferId/reverse` `{ reason }` | ✅ |
| `GET /:id/audit` (agreements, allocations, transfers, ledger, campañas, timeline, integridad) | ✅ |
| `GET /admin/benefit-reporting/*` (monthly, partners, integrity) | ✅ |
| `GET /admin/courtesy-credit-ledger/*` (balance, entries, adjustments) | ✅ |

Allocate: transacción Serializable + `FOR UPDATE`; BARTER materializa crédito en la misma tx; P2002 → `BENEFIT_SETTLEMENT_ALLOCATION_CONFLICT`.

## 4. UI existente (`/admin/liquidaciones`)

| Pantalla | Estado |
|---|---|
| Listado + KPIs período + por partner + filtros + Generar (G7.11 contextual) | ✅ |
| Detalle `SettlementDetailClient` (584 líneas) | ✅ resumen, usos (conteos), asignar por cantidad CASH/BARTER, CASH cards, canje cards + saldo, transferencias, registrar transferencia, revertir (prompt), cerrar, link ledger |
| `SettlementAuditPanel` | ✅ integridad, acuerdos, timeline, allocations (id/beneficio/modo/base), movimientos ledger |
| `/acuerdos`, `/creditos` | ✅ |

## 5. Gaps

### Solo UI

| # | Gap |
|---|---|
| U1 | Detalle no muestra unit price / multiplicador / agreement(s) involucrados en el encabezado |
| U2 | Desglose BARTER por tarifa (`n × unit`, base, ×mult, crédito) — derivable de `audit.allocations` |
| U3 | Reversión vía `window.prompt`; tabla no muestra `reversedAt` / `reversalReason` / registrado por |
| U4 | **Bug:** formulario «Registrar transferencia» oculto cuando `CLOSED`, contradice dominio (transfers siguen tras cierre) |
| U5 | Estado humano derivado (Pendiente / Parcialmente pagada / Pagada / Con canje / Cerrada) separado del persistido |
| U6 | Historial: timeline existe; falta presentación tipo/monto/responsable/referencia legible |
| U7 | Contexto `fromDiscountId` no llega al detalle (filtro/agrupación visual) |

### API (sin migration)

| # | Gap |
|---|---|
| A1 | Listado de **validaciones pendientes** con detalle (descuento, fecha, código, precio) — hoy solo conteos |
| A2 | **Allocate por `validationIds`** (selección individual) — reutilizar misma transacción; ids deben ∈ elegibles del settlement |
| A3 | `proofUrl` en registro de transferencia (campo ya existe en DB) |
| A4 | **Bug menor:** `audit.allocations[].validatedAt` usa `allocatedAt` |

### Storage (diferido)

`proofUrl`: el upload existente (`POST /uploads/public-image`) escribe en bucket **público** — no apto para comprobantes (Etapa 9). Bucket privado + signed URLs (`private/invoices/`, S8 en `GCS_STORAGE_STRATEGY.md`) **diseñado, no implementado**. G7.12.5 = URL https provista por ADMIN + link «Ver comprobante»; upload privado diferido (requiere `GCS_PRIVATE_BUCKET` + signed URL + decisión ops).

## 6. Semántica contable (no alterar)

```text
EXACT (allocation)        validationId, mode, agreementId, unitPrice, multiplier, base, crédito materializado
SETTLEMENT_LEVEL          cashDue, cashReceived, cashOutstanding, transfers, reversals, status, closedAt
PARTNER_LEVEL             balanceAvailable, creditConsumed (DEBIT_COURTESY), ADJUSTMENT/REVERSAL ledger
NOT_ATTRIBUTABLE          transfers/consumo por descuento (cashTransferredByDiscount, cashRemainingByDiscount,
                          barterConsumedByDiscount)
```

El descuento sirve como agrupación visual de validaciones (EXACT por validación), nunca como dueño de settlement/transfer.

## 7. Migrations

**NONE** previstas. Todos los gaps se cubren con schema actual.

## 8. Plan de slices

| Slice | Tipo |
|---|---|
| G7.12.1 Detalle (encabezado agreements/unit/mult, CASH/BARTER bloques) | UI + helper shared |
| G7.12.2 Validaciones pendientes (A1 + A4) | API + UI |
| G7.12.3 Allocate por selección (A2) + preview | API + UI |
| G7.12.4 Transfers parciales UX + permitir tras CLOSED (U4) | UI |
| G7.12.5 Comprobante URL (A3) | API + UI |
| G7.12.6 Reversión UX (U3) | UI |
| G7.12.7 Desglose BARTER (U2) | UI + helper shared |
| G7.12.8 Historial legible (U6) | UI |
| G7.12.9 Estado derivado (U5) + reglas de cierre | helper shared + UI |
| G7.12.10 Contexto desde descuento (U7) | UI |
| G7.12.11 Listado (estado derivado / columnas) | UI |
| G7.12.12–13 Tests seguridad + económicos | tests |
| G7.12.14 Regresión/builds · G7.12.15 docs | — |
