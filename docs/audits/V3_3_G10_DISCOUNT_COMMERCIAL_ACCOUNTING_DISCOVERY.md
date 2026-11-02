# V3.3 G10.0 — Discovery: contratos, liquidaciones y pagos por descuento

**Fecha:** 2026-11-02  
**Rama:** `feat/v1-s03-api-foundation` · HEAD inicial `765f8f2` (`docs(v3.3): close gastro UX polish`)  
**Alcance:** auditoría de dominio + diseño objetivo. **Sin código funcional, sin migration, sin push, sin deploy.**  
**Producción:** desplegada con G7.11–G9 (dato del operador).  
**Working tree al iniciar:** `packages/shared/src/benefit-settlement-operations.assert.ts` aparece modificado solo por fin de línea (CRLF→LF, diff de contenido vacío) y `.cursorignore` sin trackear. Ninguno de los dos entra en este commit.

---

## 0. Resumen ejecutivo

| Tema | Hoy | Objetivo G10 |
|---|---|---|
| Contrato comercial | `BenefitCommercialAgreement` por **`GastroProfile`** (partner). Todos los descuentos del local comparten tarifa e historial | Un contrato (con historial propio) **por `GastroDiscount`** |
| Approval | Gate = agreement CURRENT **del local** | Gate = agreement CURRENT **del descuento**. El de A nunca habilita B |
| Settlement | Partner + período (`periodKey`), único por índice parcial SQL | **Sin cambio**: sigue siendo partner + período. El descuento agrupa dentro del settlement |
| Allocation | 1 por validación, snapshot de tarifa (EXACT) | Sin cambio de schema. El precio se resuelve con el contrato **del descuento de la validación** |
| Pago CASH | `BenefitSettlementTransfer` → **solo settlement**. Atribución por descuento: **NOT_ATTRIBUTABLE** | Transfer con `gastroDiscountId` opcional → **EXACT** cuando se registra desde el descuento |
| CANJE | Allocation BARTER → `CREDIT_FROM_SETTLEMENT` (EXACT por allocation) | Mismo motor. "Registrar CANJE" en el descuento = allocate BARTER de validaciones de ese descuento |
| Métricas GASTRO | Solo operativas (`summary`, `operational-metrics`). Nada económico | Endpoint read-only de resumen económico por descuento |

**Recomendación:** Opción A (extender `BenefitCommercialAgreement` con `gastroDiscountId`) + modelo de pago P1 (extender `BenefitSettlementTransfer` con `gastroDiscountId`). **Migration: SÍ** (solo columnas nullable, aditiva). **Backfill: SÍ** (script idempotente que copia el contrato del local a cada descuento facturable; solo inserta filas).

---

## 1. Contexto revisado

- `docs/rules/*` (PROJECT_RULES, AI_WORKFLOW_RULES), `docs/context/AI_ENTRYPOINT.md`, `NEXT_CHAT_HANDOFF.md`, `CONTEXT_PENDIENTES.md`, `V3_3_G8_G9_ROADMAP.md` (D1–D5).
- Audits previos: `V3_3_STAGE_9_SETTLEMENTS_*`, `V3_3_G7_12_SETTLEMENT_OPERATIONS_DISCOVERY.md`, `V3_3_G7_SETTLEMENT_UNIQUE_REVIEW.md`, `V3_3_G8_11_COURTESY_ACCOUNTING_*`.
- Código: `apps/api/prisma/schema.prisma`, migrations `20260901120000`…`20260901200000`, `modules/benefit-agreements/*`, `modules/benefit-settlements/*`, `modules/courtesy-credit-ledger/*`, `modules/admin/admin-gastro.service.ts`, `modules/gastro/gastro-courtesy-discounts.service.ts`, `modules/gastro/gastro-discount-metrics.service.ts`, `modules/admin/admin-deep-delete*.ts`, `modules/admin/admin-content-purge.service.ts`, `packages/shared/src/{benefit-commercial-agreements,benefit-settlement,benefit-settlement-operations,gastro-courtesy-accounting}.ts`, `packages/shared/src/schemas/gastro-discount-economic-metrics.ts`, web `components/admin/gastro/AdminGastroDiscount{CommercialContext,EconomicMetrics}Panel.tsx`, `app/(portal)/admin/liquidaciones/*`.

---

## 2. Auditoría de agreements

### 2.1 ¿Cómo está relacionado hoy el agreement con `GastroProfile`?

`BenefitCommercialAgreement` tiene `vertical` (`GASTRO` | `ACTIVITY`) y **dos FKs opcionales mutuamente excluyentes**: `gastroProfileId` (GASTRO) o `excursionOperatorId` (ACTIVITY). **No existe relación con `GastroDiscount`** (ni FK ni columna). `GastroProfile.benefitCommercialAgreements` es la back-relation. Todo descuento del local usa el mismo contrato vigente.

### 2.2 ¿Qué constraints existen?

| Constraint | Nivel | Detalle |
|---|---|---|
| PK `id` | DB | cuid |
| FK `tenantId` → `Tenant` | DB | `ON DELETE RESTRICT` |
| FK `gastroProfileId` → `GastroProfile` | DB | `ON DELETE RESTRICT` (un local con agreements no se puede borrar físicamente) |
| FK `excursionOperatorId` → `ExcursionOperator` | DB | `ON DELETE RESTRICT` |
| FK `createdByUserId` → `User` | DB | `ON DELETE SET NULL` |
| XOR partner (`gastroProfileId` xor `excursionOperatorId`) | **Solo app** | Zod `refinePartnerXor` + `assertBenefitPartnerXor`. **No hay CHECK en DB** |
| No solapamiento de vigencias por partner | **Solo app** | `assertNoOverlap` (`benefit-commercial-agreements.service.ts`). En `create` corre **fuera de transacción** (carrera preexistente); en `replace` dentro de tx con aislamiento default |
| Inmutabilidad de términos económicos | **Solo app** | El servicio solo actualiza `validTo` (close/replace) y `notes` |
| Partner ACTIVE para crear | App | `assertPartnerEligible` (perfil `ACTIVE` / operador activo) |

### 2.3 ¿Qué índices / unique existen?

- `@@index([tenantId, vertical, gastroProfileId])`
- `@@index([tenantId, vertical, excursionOperatorId])`
- `@@index([tenantId, validFrom, validTo])`
- **Ningún unique.** **Ningún índice parcial.** (Los únicos parciales de este dominio están en `BenefitSettlement`, ver §3.)

### 2.4 ¿Puede un profile tener historial?

**Sí.** N filas por perfil, sin solapamiento (app-level). `close` fija `validTo`; `replace` cierra la vigente en `effectiveFrom − 1 día` y crea una nueva en la misma transacción. `GET /admin/benefit-agreements/partner-history` devuelve `current` + `history`. Las filas nunca se borran (FK `Restrict` desde allocations).

### 2.5 ¿Qué significa CURRENT?

**No existe `BenefitCommercialAgreementStatus`** (ni enum Prisma ni tipo en código; el único `*AgreementStatus` del repo es de referidos). La "vigencia" es **derivada, no persistida**:

```text
classifyBenefitAgreementVigency(validFromKey, validToKey, todayKey)
  todayKey <  validFromKey            → FUTURE
  validToKey != null && todayKey > validToKey → PAST
  resto                               → CURRENT
```

Claves = fechas calendario AR (`America/Argentina/Buenos_Aires`), límites **inclusivos** en ambos extremos. `isOpen = validTo == null`. El filtro `vigency=CURRENT` del listado usa el equivalente en instantes (`validFrom ≤ finDelDía && (validTo null || validTo ≥ inicioDelDía)`).

### 2.6 ¿Cómo se resuelve `resolveApplicable`?

`BenefitCommercialAgreementsService.resolveApplicable(tenantId, { vertical, gastroProfileId | excursionOperatorId, onDate? })`:

1. `onDate` default = hoy (clave AR).
2. Carga **todas** las filas del partner (`tenantId + vertical + gastroProfileId`).
3. Mapea a claves AR y llama `resolveBenefitAgreementAtDate`: filtra las activas en esa fecha, ordena por `validFromKey` desc, toma la primera. Nunca usa "la última creada".
4. Devuelve `{ agreement: dto | null }`. No lanza si no hay.

Para liquidaciones, la misma lógica por validación: `resolveSettlementAgreementForValidation(agreementsDelPartner, validation.validatedAt)`.

### 2.7 ¿Cómo se usa durante approval?

| Flujo | Gate de agreement | Persiste vínculo |
|---|---|---|
| `AdminGastroService.approve` (descuento público `PENDING_REVIEW`/`COMMISSION_NEGOTIATION` → `ACTIVE`) | **Sí**: CURRENT del perfil (`row.gastroProfileId ?? profileId`); sin agreement → `BENEFIT_AGREEMENT_NOT_FOUND` | **No**. Solo pasa el agreement al email de aprobación |
| `AdminGastroService.approveCourtesy` (G8.3) | **Sí**, mismo resolver por perfil | No (`agreementId` solo en metadata de audit) |
| `GastroCourtesyDiscountsService.create` con rol ADMIN (G8.3.5) | **Sí**, CURRENT del perfil antes de crear | No |
| `AdminGastroService.createDiscountOnBehalf` (→ `ACTIVE` directo) | **No** (solo informativo en email) | No |
| `GastroDiscountMetricsService.updateDiscountStatus` (`INACTIVE`/`CANCELLED` → `ACTIVE`, owner o admin) | **No** | No |
| `AdminGastroService.sendQrEmail` (`APPROVED` → `ACTIVE` legacy) | **No** | No |
| `AdminGastroService.approvePendingEdit` | No (edición, no activación) | No |
| Scanner / validación | No (operativo) | — |

Conclusión: el agreement funciona hoy como **gate comercial del local**, no como contrato del descuento. Nada en el descuento registra qué contrato lo habilitó.

### 2.8 ¿Qué copia `BenefitSettlementUsageAllocation`?

Al allocate (`BenefitSettlementsService.allocationData`):

| Campo | Origen |
|---|---|
| `agreementId` | FK `Restrict` al agreement resuelto para `validatedAt` |
| `unitPriceCents` | snapshot del agreement |
| `barterMultiplier` | snapshot del agreement |
| `baseAmountCents` | = `unitPriceCents` (1 uso = 1 unidad) |
| `currency` | snapshot del agreement |
| `validationSource`, `validationId` | referencia **lógica** (sin FK) a la validación |
| `mode` | `CASH` / `BARTER` |
| `settlementId`, `allocatedAt`, `allocatedByUserId` | contexto |

**No copia:** `validFrom`/`validTo`, `notes`, `gastroProfileId`, ni `gastroDiscountId`. El crédito BARTER se deriva (`base × multiplier`, half-up) y se materializa en el ledger.

---

## 3. Auditoría de settlements

### 3.1 Scoping

| Entidad / cifra | Partner | Discount | Validation | Settlement |
|---|:-:|:-:|:-:|:-:|
| `BenefitCommercialAgreement` (GASTRO) | ✅ | ❌ | — | — |
| `BenefitSettlement` (`tenant + partner + periodKey`, único por índices parciales SQL `BenefitSettlement_tenant_gastro_period_key` / `_activity_period_key`, **no declarados en `schema.prisma`**) | ✅ | ❌ | — | ✅ |
| `BenefitSettlementUsageAllocation` (`@@unique([validationSource, validationId])`) | vía settlement | **derivado** (validation → discount) | ✅ | ✅ |
| `BenefitSettlementTransfer` | vía settlement | ❌ | ❌ | ✅ |
| `cashDue` / `cashReceived` / `cashOutstanding` / `cashCollectionStatus` (derivados) | — | ❌ | — | ✅ |
| `CourtesyCreditLedgerEntry` balance (partner + currency) | ✅ | ❌ | — | — |
| `CREDIT_FROM_SETTLEMENT` (`sourceAllocationId @unique`) | ✅ (asiento) | derivado | ✅ (vía allocation) | vía allocation |
| `DEBIT_COURTESY` (`sourceCourtesyCampaignId @unique`) | ✅ | ✅ (campaña 1:1 descuento cortesía) | — | — |
| `GastroDiscountValidation` | vía discount | ✅ | ✅ | — |
| G6 `GastroDiscountEconomicReportingService` | contexto | ✅ (lectura) | ✅ | contexto |

### 3.2 Dónde existe EXACT hoy

- Validaciones con claim de un descuento (`GastroDiscountValidation.discountId`).
- Allocation por validación (modo, agreement, snapshot, base) — trazable discount → validation → allocation.
- Crédito generado por allocation BARTER (`sourceAllocationId`).
- Débito de cortesía financiada por campaña (`sourceCourtesyCampaignId`).
- Billability por descuento (G8.11 D1: `FUNDED_COURTESY_NOT_BILLABLE` vs `BILLABLE`).

### 3.3 Dónde solo existe SETTLEMENT_LEVEL / PARTNER_LEVEL / NOT_ATTRIBUTABLE

```text
SETTLEMENT_LEVEL   cashDue, cashReceived, cashOutstanding, transfers, reversals, status, closedAt
PARTNER_LEVEL      contrato comercial GASTRO (hoy), saldo de crédito, crédito consumido, ADJUSTMENT, REVERSAL
NOT_ATTRIBUTABLE   cash transferido por descuento, cash pendiente por descuento, crédito consumido por descuento
```

El schema compartido (`gastro-discount-economic-metrics.ts`) y el panel admin G6 ya rotulan estas precisiones y prohíben inventar `cashTransferredByDiscount`.

---

## 4. Auditoría de pagos

`BenefitSettlementTransfer`: `settlementId`, `amountCents`, `currency`, `transferredAt`, `reference`, `notes`, `proofUrl`, `registeredByUserId`, `reversedAt`, `reversedByUserId`, `reversalReason`. Registro con `Serializable` + `SELECT … FOR UPDATE` sobre el settlement y guard de sobrepago **a nivel settlement** (`cashReceived + amount ≤ cashDue`).

**¿Existe alguna relación persistida que permita afirmar "$30.000 de esta transferencia → Discount A"? NO.**

- No hay columna, FK ni tabla hija que vincule transfer ↔ descuento.
- El audit `BENEFIT_TRANSFER_REGISTERED` guarda `settlementId`, `amountCents`, `currency`. Sin descuento.
- `reference` / `notes` son texto libre: no son una relación y no se deben parsear.
- `fromDiscountId` (G7.12.10) es **solo contexto de URL/UI** (`SettlementDetailClient`, `SettlementGeneratePanel`). Nunca se persiste.

**Payment attribution today: NOT EXACT** (NOT_ATTRIBUTABLE por descuento). No se propone prorrateo ni inferencia. Las transferencias existentes quedan como SETTLEMENT_LEVEL para siempre, salvo una acción explícita y auditada del ADMIN (ver §9.4).

---

## 5. Target — contrato por descuento

### 5.1 Opción A — Extender `BenefitCommercialAgreement` con `gastroDiscountId`

GASTRO nuevo = discount-scoped (`gastroDiscountId` + `gastroProfileId` desnormalizado = `discount.gastroProfileId`). Filas GASTRO existentes con `gastroDiscountId = null` = **legacy profile-scoped** (solo históricas). ACTIVITY sin cambios.

| Aspecto | Evaluación |
|---|---|
| **Pros** | Una sola tabla de contratos. `BenefitSettlementUsageAllocation.agreementId` sigue apuntando a la misma tabla → settlement audit, G6 snapshot segments, integridad, ledger reconcile y reporting **no cambian de fuente**. Reutiliza servicio (create/close/replace/notes), audit actions, DTO, reglas de inmutabilidad e historial. ACTIVITY intacto. |
| **Cons** | Tabla con dos alcances GASTRO (legacy perfil vs descuento): toda query GASTRO debe filtrar el alcance explícitamente (riesgo de mezclar si se olvida un filtro). `gastroProfileId` desnormalizado debe coincidir con el del descuento (no expresable como CHECK cross-table → app + integridad). |
| **Migration** | `ADD COLUMN "gastroDiscountId" TEXT NULL` + FK `→ GastroDiscount ON DELETE RESTRICT` + índices; `ADD COLUMN "derivedFromAgreementId" TEXT NULL` (linaje de backfill, self-FK `Restrict`); CHECK SQL de coherencia de alcance (precedente: índices parciales en SQL crudo). |
| **Backfill** | Insertar copias por descuento (§6). Las filas legacy no se tocan. |
| **Legacy compatibility** | Allocations históricas siguen apuntando al agreement legacy (FK intacta). La API deja de crear GASTRO profile-scoped. Las filas legacy se muestran como "acuerdo del local (legacy)". |
| **Queries afectadas** | `list` / `partnerHistory` / `resolveApplicable` / `assertNoOverlap` / `create` / `replace` (scope por descuento); `BenefitSettlementEligibilityService.loadPartnerAgreements` (→ mapa por descuento); `AdminGastroService.approve` / `approveCourtesy` / `createDiscountOnBehalf`; `GastroCourtesyDiscountsService.assertCurrentAgreement`; notificaciones lifecycle; web `useAdminBenefitAgreementPartnerHistory`, `AdminGastroDiscountCommercialContextPanel`, `/admin/liquidaciones/acuerdos{,/nuevo}`. |
| **Approval** | Gate por `gastroDiscountId`. |
| **Settlements** | Sin cambio de schema. El pricing por validación usa los agreements del descuento de esa validación. |
| **Reporting** | Sin cambio de fuente; se agrega etiqueta de alcance (descuento / legacy) en los DTO. |

### 5.2 Opción B — Nuevo modelo `BenefitDiscountCommercialAgreement`

| Aspecto | Evaluación |
|---|---|
| **Pros** | `gastroDiscountId NOT NULL`, sin filas mixtas; tabla legacy congelada para GASTRO. |
| **Cons** | `allocation.agreementId` es FK a `BenefitCommercialAgreement`: las allocations nuevas necesitan una **segunda FK** (`discountAgreementId`) + XOR CHECK → cambia el schema de allocations y **todos** sus lectores (settlement audit, G6 segments, integridad, validation details, reconcile). Duplica servicio, DTOs, audit actions y UI. Quedan **dos sistemas de contratos** (GASTRO nuevo / ACTIVITY viejo). Mayor superficie de regresión. |
| **Migration** | `CREATE TABLE` + columna nueva en allocations + CHECK XOR. |
| **Backfill** | Igual de complejo que A, más el riesgo de cambiar la tabla de allocations. |
| **Legacy** | Tabla vieja = histórico GASTRO + ACTIVITY vivo. |
| **Queries afectadas** | Las de A **más** todos los lectores de allocations. |
| **Approval / Settlements / Reporting** | Igual que A, pero con doble join en todo reporting. |

### 5.3 Opción C — Alternativas evaluadas

- **C1 — A + discriminador explícito `scope` (enum `PROFILE_LEGACY | DISCOUNT | OPERATOR`).** Igual que A, con el alcance explícito en una columna. Agrega enum + migration de enum y no aporta garantías que `gastroDiscountId IS NULL/NOT NULL` + CHECK no den. **Variante aceptable** si el operador prefiere alcance explícito.
- **C2 — Campos de tarifa en `GastroDiscount` (override).** **Rechazada:** sin historial, mutable, entra en conflicto con `pendingUpdate` y con la regla de inmutabilidad de Etapa 9.
- **C3 — Tabla N:M agreement ↔ discounts.** **Rechazada:** permite que un contrato habilite varios descuentos, lo que contradice "un agreement de A nunca puede habilitar B".
- **C4 — Settlement por descuento.** **Rechazada:** rompe los índices únicos partner+período, multiplica liquidaciones, y el crédito BARTER y el ledger son partner-level por diseño.

### 5.4 Recomendación

**Opción A** (con C1 como variante opcional). Es la que menos toca el motor contable: allocations, ledger, transfers y reporting conservan su fuente. El costo (filtrar alcance siempre) se mitiga con un único helper de `where` por alcance + tests + check de integridad `AGREEMENT_SCOPE_MISMATCH`.

---

## 6. Backfill

### 6.1 Estrategia propuesta (no asumida como única)

Script idempotente `benefit-agreements:backfill-discount-scope` (`--dry-run` por defecto, `--confirm` para escribir). **Solo inserta**; nunca actualiza ni borra filas existentes.

Para cada `GastroProfile` con agreements GASTRO legacy (`gastroDiscountId IS NULL`):

1. Seleccionar descuentos candidatos: `gastroProfileId = profile.id`, **no** cortesía financiada (D1), y que puedan necesitar pricing (cualquier estado excepto `REJECTED` sin validaciones). Incluye archivados/expirados si tienen validaciones sin allocation.
2. Para cada segmento legacy `P` (cerrado o abierto) cuya vigencia toque la vida del descuento (`P.validTo IS NULL OR P.validTo ≥ discount.createdAt`): insertar una copia con los **mismos** `unitPriceCents`, `barterMultiplier`, `currency`, `validFrom`, `validTo`, `gastroDiscountId = D`, `derivedFromAgreementId = P.id`, `notes` "Copiado del acuerdo del local P".
3. Idempotencia: saltar si ya existe una fila `(derivedFromAgreementId = P, gastroDiscountId = D)`.
4. Reporte: perfiles sin agreements, descuentos sin cobertura, descuentos con `gastroProfileId NULL`, cortesías financiadas salteadas.

Los segmentos legacy no se solapan entre sí, así que sus copias por descuento tampoco.

### 6.2 Casos

| Caso | Resultado |
|---|---|
| Profile con **0** agreements | No se copia nada. Sus descuentos quedan **sin contrato**: no se pueden aprobar ni reactivar (si se aprueba D-G10-5) y sus validaciones quedan `MISSING_AGREEMENT`. Es el mismo comportamiento que hoy a nivel local. |
| Profile con **historial** (P1 cerrado + P2 abierto) | Cada descuento recibe copias de los segmentos que tocan su vida → historial idéntico por descuento. Validaciones viejas pendientes se pricean con la copia del segmento de su fecha. |
| Profile con **varios descuentos** | Una copia por descuento por segmento. Desde ese momento cada descuento puede divergir (replace/close independientes). |
| **Allocations históricas** | **No cambian.** Siguen apuntando al agreement legacy (FK `Restrict`); snapshots intactos. G6 muestra esos segmentos como "acuerdo del local (legacy)". |
| **Snapshots existentes** | Intactos (allocations, ledger, audit). Los emails de aprobación no persistían agreement. |
| Validaciones **pendientes** (sin allocation) al momento del backfill | Se pricean con la copia del descuento: mismos términos que antes, distinto `agreementId`. En un settlement parcialmente asignado puede haber dos `agreementId` con igual tarifa (cosmético; se agrupa por linaje `derivedFromAgreementId`). |
| Descuento con `gastroProfileId NULL` (pre multi-local) | Hoy **nunca** entra en settlements (la elegibilidad exige `discount.gastroProfileId = partner`). No se backfillea; se reporta. Preexistente. |
| Cortesía **financiada** | Salteada: no facturable (D1); el pricing nunca la alcanza (se excluye antes de resolver agreement). |
| Cortesía **no financiada** | Copia como cualquier descuento facturable. |

### 6.3 Por qué script post-deploy y no SQL dentro de la migration

Durante `prisma migrate deploy` sigue corriendo el código G9. Ese código resuelve por `gastroProfileId` **sin filtrar alcance**: si las copias ya existieran, vería segmentos solapados y podría asignar el `agreementId` de la copia de otro descuento. Orden seguro:

```text
migrate deploy (solo columnas) → restart con código G10 (fail-closed: descuento sin contrato = sin contrato)
→ backfill --dry-run → revisión → backfill --confirm → verificación
```

Entre el restart y el backfill, approvals y allocations GASTRO quedan bloqueados (`MISSING_AGREEMENT`). Es **fail-closed**: no se generan importes incorrectos. Ventana operativa corta, sin operaciones de liquidación.

---

## 7. Target — approval

### 7.1 Regla

```text
Discount A → Agreement A CURRENT (gastroDiscountId = A, gastroProfileId = A.gastroProfileId) → approve A
Discount B → sin Agreement B → NO approve (BENEFIT_AGREEMENT_NOT_FOUND, copy "El descuento no tiene acuerdo comercial vigente")
```

El resolver GASTRO pasa a `resolveApplicable({ vertical: 'GASTRO', gastroDiscountId })`. Las filas legacy nunca participan en la resolución nueva.

### 7.2 Flujos a adaptar

| Flujo | Propuesta |
|---|---|
| `approve` | Gate por descuento. Persistencia del vínculo: no hace falta, el contrato ya es del descuento |
| `approveCourtesy` | Gate por el descuento de la cortesía (§14) |
| Admin create de cortesía | Financiada → sin gate (no facturable, D1). No financiada → términos de contrato en el body, creados **en la misma transacción** que el descuento (el descuento no existe antes) — **D-G10-4** |
| `createDiscountOnBehalf` (`ACTIVE` directo) | Hoy sin gate. Propuesta: términos de contrato en el body (atómico) **o** crear en `PENDING_REVIEW` — **D-G10-4** |
| `updateDiscountStatus` (reactivar a `ACTIVE`) | Hoy sin gate. Propuesta: exigir CURRENT del descuento si es facturable — **D-G10-5** |
| `sendQrEmail` (`APPROVED` → `ACTIVE` legacy) | Mismo gate que reactivación — **D-G10-5** |
| `approvePendingEdit` | Sin gate; aviso en UI si el descuento no tiene contrato CURRENT |
| Scanner | Sin cambio (operativo). Un descuento `ACTIVE` cuyo contrato venció sigue validando y sus usos quedan `MISSING_AGREEMENT` |

**Archivo grande:** `admin-gastro.service.ts` supera las 1.500 líneas. La lógica nueva va en servicios separados (p. ej. `GastroDiscountAgreementGateService`), según la regla de 300–400 líneas.

---

## 8. Target — detalle / métricas por descuento

### 8.1 Endpoints

```text
GET /admin/gastronomicos/:profileId/descuentos/:discountId/economic-summary   (ADMIN)
GET /gastro/discounts/:id/economic-summary                                    (GASTRO_OWNER, read-only)
```

Mismo servicio (archivo nuevo, no `admin-gastro.service.ts`). Ownership GASTRO: `discountId → gastroProfileId → assertCanOperateProfile`; `?profileId=` no autoriza. El G6 `economic-metrics` se mantiene por compatibilidad y se reemplaza en UI.

### 8.2 Contrato conceptual (con precisión explícita)

```text
discount        { id, gastroProfileId, title, status, visibility, isCourtesy, settlementBillability }
agreement       { current: Agreement|null                      [EXACT, scope DISCOUNT]
                  history: Agreement[]                         [EXACT]
                  legacyUsed: [{ agreementId, unitPrice, multiplier, validFrom, validTo, usageCount }]
                                                               [PARTNER_LEVEL legacy, desde allocations] }
validations     { total, billable, fundedCourtesy, allocated, pending, pendingWithoutAgreement }   [EXACT]
cash            { usageCount, generatedCents                    [EXACT]
                  paidCents (transfers con gastroDiscountId)   [EXACT]
                  remainingCents, remainingPrecision            EXACT | SETTLEMENT_LEVEL (§10.3)
                  unattributedSettlementReceivedCents           [SETTLEMENT_LEVEL, informativo] }
barter          { usageCount, baseCents, creditGeneratedCents } [EXACT]
                  (crédito consumido por descuento: NO se expone — NOT_ATTRIBUTABLE)
settlements[]   { settlementId, periodKey, status,
                  discountCashDue, discountCashPaid, discountCashRemaining, discountCollectionStatus [EXACT]
                  discountBarterBase                                                           [EXACT]
                  settlementCashDue/Received/Outstanding, containsOtherDiscounts,
                  hasUnattributedTransfers                                          [SETTLEMENT_LEVEL] }
payments[]      { transferId, settlementId, periodKey, amountCents, transferredAt, reference,
                  isActive, reversedAt, reversalReason,
                  notes / proofUrl / registeredBy / reversedBy (solo ADMIN) }       [EXACT]
history[]       { at, kind: AGREEMENT_CREATED|CLOSED|REPLACED|ALLOCATED_CASH|ALLOCATED_BARTER|
                  CREDIT_MATERIALIZED|PAYMENT_REGISTERED|PAYMENT_REVERSED, amount?, actorLabel (solo ADMIN) }
partner         { balanceAvailable, creditGenerated, creditConsumed }              [PARTNER_LEVEL]
```

Reglas: nunca sumar CASH + crédito como "total cobrado"; `remaining` nunca se calcula prorrateando transferencias no atribuidas.

---

## 9. Target — pago por descuento

### 9.1 Alternativas

| Modelo | Descripción | Pros | Cons |
|---|---|---|---|
| **P1 — Extender `BenefitSettlementTransfer` con `gastroDiscountId` (nullable, FK `Restrict`)** | Transfer atribuida = EXACT a un descuento dentro de un settlement | Reutiliza guard de sobrepago, `Serializable` + `FOR UPDATE`, reversa, audit, `reference`/`notes`/`proofUrl`. `settlement.cashReceived` sigue siendo Σ transfers activas, **sin segundo sistema** | Una transfer = un descuento (un pago bancario que cubre A y B se registra como dos transfers con la misma `reference`) |
| P2 — Nuevo `BenefitDiscountPayment` | Tabla de cobros paralela | Aislado | **Segundo sistema contable**: `cashReceived` debería unir dos tablas, con riesgo de doble conteo y reversa/audit duplicados. **Rechazado** |
| P3 — `BenefitSettlementTransferAttribution` (hija: `transferId`, `gastroDiscountId`, `amountCents`) | División explícita de una transfer en N descuentos | Permite atribuir **explícitamente** (sin inferir) transfers legacy y pagos multi-descuento | Invariantes extra (Σ atribuciones ≤ monto, reversa en cascada, estados parciales), más UI. Compatible como evolución futura de P1 |

### 9.2 Recomendación: P1

Campos conceptuales cubiertos:

| Requisito | P1 |
|---|---|
| `discountId` | `gastroDiscountId` (nuevo) |
| `settlementId` | existente (obligatorio: el CASH due vive en allocations de un settlement) |
| `mode` CASH/BARTER | La transfer es **solo CASH**. CANJE no es una transferencia de dinero: es allocation BARTER (§11) |
| amount / base | `amountCents` |
| agreement snapshot / referencia | **No se guarda en el pago**: el importe debido ya tiene snapshot por allocation (EXACT). El resumen lista los agreements involucrados vía allocations |
| `createdAt` / `createdBy` | `createdAt`, `registeredByUserId` |
| notes / reference / proof | existentes (`proofUrl` = URL https provista por ADMIN; upload privado sigue diferido) |
| reversal / audit | `reversedAt`, `reversedByUserId`, `reversalReason` + `BENEFIT_TRANSFER_REGISTERED/REVERSED` con `gastroDiscountId` en metadata |

### 9.3 Invariantes nuevas (en la misma tx `Serializable` + `FOR UPDATE`)

1. `gastroDiscountId` ≠ null ⇒ `settlement.vertical = GASTRO` y `discount.gastroProfileId = settlement.gastroProfileId`.
2. `discountCashDue(A, S)` = Σ `baseAmountCents` de allocations CASH de S cuya validación pertenece a A (join `validationId → GastroDiscountValidation.discountId`; sin tocar allocations).
3. Guard descuento: Σ transfers activas `(S, A)` + monto ≤ `discountCashDue(A, S)`.
4. Guard settlement (existente): Σ transfers activas `(S)` + monto ≤ `cashDue(S)`.

### 9.4 Transfers legacy (sin descuento)

- Siguen siendo SETTLEMENT_LEVEL. **Sin backfill, sin inferencia.**
- Recomendación **D-G10-7**: desde G10.D, toda transfer GASTRO nueva exige `gastroDiscountId`. Las transfers ACTIVITY no cambian.
- Conversión opcional y explícita: el ADMIN revierte la transfer legacy (con motivo) y la re-registra atribuida. Queda en el audit. No es inferencia.

---

## 10. CASH

### 10.1 Flujo

Son dos operaciones distintas, cada una con su audit:

1. **Asignar usos a CASH** (genera deuda): en el descuento A, elegir período → `generate` (idempotente partner+período) → `allocate { mode: CASH, validationIds: [validaciones pendientes de A] }`. Endpoint existente (G7.12.3).
2. **Registrar cobro CASH**: elegir settlement con saldo de A → monto → `reference` / `notes` / `proofUrl` → transfer con `gastroDiscountId = A`.

La UI puede encadenarlas, pero registrar un pago **nunca** crea allocations implícitamente.

### 10.2 Ejemplo objetivo

```text
A: 10 validaciones × $5.000 asignadas CASH en 2026-11   → cashGenerated(A) = $50.000   EXACT
ADMIN registra CASH $30.000 para A (settlement 2026-11) → cashPaid(A)      = $30.000   EXACT
                                                          cashRemaining(A) = $20.000   EXACT
Settlement 2026-11 (A + B): cashReceived incluye los $30.000; outstanding = due(S) − received(S)
```

### 10.3 Precisión de `remaining`

`remaining(A) = generated(A) − paid(A)` es EXACT **si ninguno de los settlements involucrados tiene transfers activas no atribuidas**. Si las tiene, `remainingPrecision = SETTLEMENT_LEVEL` y la UI aclara: "no considera $X transferidos al settlement sin atribución". Nunca se prorratea.

### 10.4 Restricciones heredadas

- Una validación asignada CASH no puede pasar a BARTER (`@@unique` por validación).
- `CLOSED ≠ PAID`: se puede seguir cobrando después del cierre.
- `CASH_OVERPAYMENT` sigue en integridad. Se agrega `DISCOUNT_CASH_OVERPAYMENT`.

---

## 11. CANJE (BARTER)

"Registrar CANJE" en el descuento A **reutiliza el motor existente**:

```text
generate(partner, period) [idempotente]
→ allocate { mode: BARTER, validationIds: [validaciones pendientes de A] }
→ por cada allocation: CourtesyCreditLedgerEntry CREDIT_FROM_SETTLEMENT (sourceAllocationId @unique, exactly-once)
```

- **Sin modelo nuevo, sin input de monto:** la base CANJE = Σ `unitPrice` snapshot de las validaciones elegidas; el crédito = base × multiplier (half-up), como hoy.
- **Sin crédito duplicado:** el unique de `sourceAllocationId` y el unique por validación ya lo impiden.
- **Precisión:** base y crédito generado de A = EXACT. El crédito se acredita al **saldo del local** (PARTNER_LEVEL). El consumo (`DEBIT_COURTESY`) **no es atribuible** a A (NOT_ATTRIBUTABLE).
- **Asimetría documentada:** el CANJE se liquida en especie al asignar. El CASH genera deuda al asignar y se cobra al transferir.

**Bloqueo a resolver (D-G10-6):** `allocate` hoy llama a `assertNoMissingAgreements` sobre **todas** las validaciones elegibles del settlement. Con contratos por descuento, un descuento B sin contrato bloquearía asignar A. Propuesta:

| Operación | Hoy | Propuesta |
|---|---|---|
| `generate` / `refresh` | bloquea | no bloquea; devuelve `missingAgreements` agrupado por descuento |
| `allocate` con `validationIds` | bloquea | bloquea **solo si** alguna validación elegida no tiene contrato |
| `allocate` por `count` | bloquea | elige solo validaciones con precio; informa las faltantes |
| `close` | bloquea | **sigue bloqueando** (no se cierra con usos sin precio) |

---

## 12. Métricas GASTRO (owner, read-only)

Por descuento, sin permisos financieros de escritura:

- **Contrato:** valor por uso, multiplicador de canje, vigencia, historial (sin `notes` internas ni actor).
- **Validaciones:** totales, facturables, cortesía financiada (uso operativo), liquidadas, pendientes.
- **CASH:** generado / pagado / pendiente (con su precisión).
- **CANJE:** base y crédito generado.
- **Liquidaciones:** período, estado y estado de cobro del descuento.
- **Opcional (D-G10-8):** saldo de crédito del local (PARTNER_LEVEL, rotulado) y lista de pagos (fecha, monto, referencia). `proofUrl` **no** se expone a GASTRO mientras no exista storage privado.

Endpoint `GET /gastro/discounts/:id/economic-summary`. Tests de ownership: owner de otro local → 403/404; sin endpoints de escritura en el controller GASTRO.

---

## 13. Métricas ADMIN

Todo lo de GASTRO, más:

- Contrato del descuento: crear / reemplazar / cerrar, historial completo, filas legacy rotuladas.
- Asignar usos CASH / CANJE (por selección de validaciones del descuento).
- Registrar cobro CASH atribuido (monto, fecha, referencia, notas, URL de comprobante).
- Revertir cobro con motivo (reemplaza `window.prompt`).
- Historial (timeline) con actores.
- Alertas: descuento `ACTIVE` sin contrato CURRENT; usos pendientes sin contrato; settlement con transfers no atribuidas.

---

## 14. Courtesies (G8 cerrado)

- Una cortesía **es un `GastroDiscount`** (`COURTESY_ONLY`, campaña 1:1). Con el modelo nuevo tiene **su propio contrato**. **Nunca hereda** el de un descuento público del mismo local.
- **D1 se mantiene sin cambios:** la elegibilidad se decide por el débito de financiamiento, no por el contrato. Funded → no facturable: se excluye **antes** de resolver contrato, así que un contrato faltante nunca la bloquea. Non-funded → facturable con el contrato **de la cortesía**.

| Caso | Contrato requerido |
|---|---|
| Cortesía del owner (`PENDING_REVIEW`) — siempre no financiada (D2: solo ADMIN financia) | **Sí**, de la cortesía; el ADMIN lo crea en la review y `approveCourtesy` lo exige |
| Cortesía ADMIN **financiada** | **No** (no facturable). Hoy se exige el CURRENT del local: se propone quitar ese gate — **D-G10-3** |
| Cortesía ADMIN **no financiada** | **Sí**, términos en el body, creado atómicamente con el descuento — **D-G10-4** |
| Cortesías legacy `ACTIVE` no financiadas | Backfill como cualquier descuento facturable |
| Cortesías financiadas existentes | Sin backfill |

`DEBIT_COURTESY` sigue siendo partner-level y su reversa sigue DEFERRED (G8.11). Sin cambios en el ledger.

---

## 15. Migration assessment

```text
Migration required:
  YES

Schema changes proposed:
  1. BenefitCommercialAgreement
     + gastroDiscountId        TEXT NULL  FK → GastroDiscount(id) ON DELETE RESTRICT
     + derivedFromAgreementId  TEXT NULL  FK → BenefitCommercialAgreement(id) ON DELETE RESTRICT (linaje de backfill)
     + @@index([tenantId, vertical, gastroDiscountId]), @@index([gastroDiscountId, validFrom])
     + CHECK (SQL crudo): vertical='ACTIVITY' ⇒ gastroDiscountId IS NULL;
                          gastroDiscountId IS NOT NULL ⇒ gastroProfileId IS NOT NULL
  2. BenefitSettlementTransfer
     + gastroDiscountId TEXT NULL FK → GastroDiscount(id) ON DELETE RESTRICT
     + @@index([settlementId, gastroDiscountId]), @@index([tenantId, gastroDiscountId])
  3. GastroDiscount: solo back-relations (sin columnas)
  4. Opcional: AuditAction BENEFIT_AGREEMENT_BACKFILLED (alternativa: BENEFIT_AGREEMENT_CREATED + metadata)
  Recomendación (D-G10-9): una sola migration en G10.A con 1+2; la columna de transfer queda sin uso hasta G10.D.
  Sin cambios en BenefitSettlement, BenefitSettlementUsageAllocation, CourtesyCreditLedgerEntry.

Backfill required:
  YES — script idempotente post-deploy (§6), dry-run por defecto, solo INSERT, linaje derivedFromAgreementId.
  Transfers legacy: NO backfill (no hay base para atribuir).

Data-loss risk:
  NONE esperado — columnas nullable aditivas; sin UPDATE/DELETE sobre agreements, allocations,
  transfers ni ledger existentes.

Production compatibility:
  Aditiva. El código G9 ignora las columnas nuevas. El backfill corre DESPUÉS de reiniciar con G10
  (el código G9 resolvería mal si existieran copias). Ventana fail-closed hasta el backfill.
  ACTIVITY intacto. Los índices parciales de BenefitSettlement no se tocan.

Rollback considerations:
  - Antes de la primera allocation/transfer discount-scoped: rollback de código + borrar las filas con
    gastroDiscountId (script) → columnas nullable inocuas (o down migration que las elimine).
  - Después: rollback de código INSEGURO (G9 vería copias/divergencias como contratos del local y
    pricearía mal). Solo forward-fix. Por eso G10.A se despliega y verifica antes de G10.B–D.
  - Deep delete / purge: las FKs Restrict nuevas bloquean borrar un descuento con contratos o pagos
    (igual que hoy los contratos bloquean borrar el local).
```

### 15.1 Pre-flight read-only (ejecutar en producción antes de G10.A)

```sql
-- Agreements GASTRO por local (abiertos / cerrados)
SELECT "gastroProfileId", COUNT(*) total, COUNT(*) FILTER (WHERE "validTo" IS NULL) abiertos
FROM "BenefitCommercialAgreement" WHERE vertical = 'GASTRO' GROUP BY 1;

-- Descuentos por local y cuántos locales sin agreement tienen descuentos ACTIVE
SELECT d."gastroProfileId", COUNT(*) descuentos,
       COUNT(*) FILTER (WHERE d.status IN ('ACTIVE','APPROVED')) activos,
       EXISTS (SELECT 1 FROM "BenefitCommercialAgreement" a
               WHERE a.vertical='GASTRO' AND a."gastroProfileId" = d."gastroProfileId") con_agreement
FROM "GastroDiscount" d GROUP BY 1;

-- Descuentos sin local (nunca liquidables)
SELECT COUNT(*) FROM "GastroDiscount" WHERE "gastroProfileId" IS NULL;

-- Validaciones con claim sin allocation, por descuento
SELECT v."discountId", COUNT(*) pendientes
FROM "GastroDiscountValidation" v
LEFT JOIN "BenefitSettlementUsageAllocation" a
  ON a."validationSource"='GASTRO_DISCOUNT_VALIDATION' AND a."validationId"=v.id
WHERE v."claimId" IS NOT NULL AND a.id IS NULL GROUP BY 1;

-- Settlements con transfers y con más de un descuento
SELECT s.id, s."periodKey", COUNT(DISTINCT v."discountId") descuentos,
       (SELECT COUNT(*) FROM "BenefitSettlementTransfer" t WHERE t."settlementId"=s.id AND t."reversedAt" IS NULL) transfers_activas
FROM "BenefitSettlement" s
JOIN "BenefitSettlementUsageAllocation" a ON a."settlementId"=s.id
JOIN "GastroDiscountValidation" v ON v.id=a."validationId"
WHERE s.vertical='GASTRO' GROUP BY s.id, s."periodKey";

-- Cortesías financiadas
SELECT COUNT(*) FROM "CourtesyCreditLedgerEntry" WHERE type='DEBIT_COURTESY';
```

---

## 16. Roadmap G10 (máx. ~5 slices por prompt)

| Etapa | Slices | Migration |
|---|---|---|
| **G10.A — Schema + agreements por descuento** | A1 migration (agreement + transfer, §15) — **detenerse antes de crearla para aprobación** · A2 shared: helpers de alcance + Zod (`gastroDiscountId`; prohibir GASTRO profile-scoped nuevo) · A3 servicio: create/close/replace/history/resolve por descuento + lock de fila `GastroDiscount` en el overlap · A4 script de backfill (dry-run/confirm, idempotente, linaje) + check `AGREEMENT_SCOPE_MISMATCH` · A5 eligibility: pricing por descuento de la validación, legacy excluido + tests | **SÍ (única)** |
| **G10.B — Approval + UI de contrato** | B1 `approve` / `approveCourtesy` por descuento · B2 resto de caminos a `ACTIVE` según D-G10-3/4/5 · B3 panel admin de contrato del descuento (crear/reemplazar/cerrar/historial, copy) · B4 `/admin/liquidaciones/acuerdos`: columna/filtro descuento, legacy rotulado, alta con selector de descuento · B5 emails/notificaciones + tests | No |
| **G10.C — Métricas económicas por descuento** | C1 contrato shared `economic-summary` con precisión · C2 servicio + endpoint ADMIN · C3 endpoint GASTRO read-only + tests de ownership · C4 panel admin (evoluciona G6) · C5 UI portal Gastro | No |
| **G10.D — Pagos exactos CASH / CANJE** | D1 servicio de cobro atribuido (guards §9.3) + reversa · D2 missing agreements no bloqueante (D-G10-6) · D3 UI descuento: asignar usos CASH/CANJE por selección · D4 UI descuento: registrar/revertir cobro CASH + comprobante URL · D5 UI settlement: atribución visible, transfer GASTRO nueva exige descuento (D-G10-7) + integridad `DISCOUNT_CASH_OVERPAYMENT` | No (usa A1) |
| **G10.E — Reporting / regresión / migration / deploy QA** | E1 reporting mensual/partners con desglose por descuento (opcional) · E2 regresión (agreements, settlements, transfers, ledger, D1, G6, approval, cortesías) · E3 DB integration local (migrate + backfill dry-run/confirm + escenarios) · E4 readiness + runbook (migrate → restart → backfill → verificación) + rollback · E5 checklist QA manual + cierre docs | No |

**Tests afectados conocidos:** `test:benefit-commercial-agreements`, `test:gastro-courtesy-approval`, `test:gastro-courtesy-hardening`, `test:admin-gastro-courtesy`, `test:gastro-courtesy-accounting` (escenarios DB + seed), `courtesy-fake-db`, suites de settlements/transfers/G6.

---

## 17. Decisiones abiertas para el operador

| # | Decisión | Recomendación |
|---|---|---|
| D-G10-1 | Modelo de contrato | Opción A (C1 como variante) |
| D-G10-2 | Alcance del backfill | Todos los descuentos facturables con `gastroProfileId`, excepto `REJECTED` sin validaciones; segmentos que tocan la vida del descuento |
| D-G10-3 | Cortesía financiada: ¿exigir contrato? | No (no facturable, D1) |
| D-G10-4 | Admin on-behalf / cortesía ADMIN no financiada | Términos de contrato en el body, creados en la misma transacción |
| D-G10-5 | Reactivación / `sendQrEmail` a `ACTIVE` | Exigir contrato CURRENT del descuento (fail-closed) |
| D-G10-6 | Missing agreements | No bloquear generate/refresh ni allocate de otros descuentos; `close` sigue bloqueando |
| D-G10-7 | Transfers GASTRO nuevas | Exigir `gastroDiscountId`; legacy queda SETTLEMENT_LEVEL; conversión solo por reversa + re-registro |
| D-G10-8 | Visibilidad GASTRO | Contrato, cifras EXACT, estados, pagos (fecha/monto/referencia); sin `notes` internas, actores ni `proofUrl` |
| D-G10-9 | Migrations | Una sola en G10.A (agreement + transfer) |
| D-G10-10 | Contratos legacy del local | Visibles como "legacy" read-only; prohibido crear nuevos GASTRO profile-scoped |

---

## 18. Riesgos

1. **Mezcla de alcances** (legacy local vs descuento) por un filtro olvidado → mitigación: helper único de `where`, tests, check de integridad.
2. **Liquidación bloqueada** por un descuento sin contrato → D-G10-6 + alerta "descuentos activos sin contrato vigente".
3. **Ventana de deploy / rollback limitado** (§6.3, §15) → deploy G10.A aislado, backfill post-restart, verificación antes de G10.B.
4. **Carrera de overlap preexistente** (`create` fuera de tx) → lock de la fila `GastroDiscount` en create/replace.
5. **`remaining` ambiguo** con transfers legacy no atribuidas → `remainingPrecision` + D-G10-7.
6. **Contrato que vence antes que el descuento** → usos `MISSING_AGREEMENT`; aviso en UI al crear o reemplazar.
7. **Descuentos con `gastroProfileId NULL`** nunca liquidan (preexistente, fuera de alcance).
8. **Archivos grandes** (`admin-gastro.service.ts` > 1.500 líneas) → servicios nuevos.
9. **Deep delete:** `gastroDiscount.delete(...).catch(() => undefined)` dentro de una transacción (preexistente: en Postgres un statement fallido aborta la tx). Las FKs `Restrict` nuevas pueden activar ese camino → revisar en G10.E.
10. **Datos de producción no auditados** → pre-flight §15.1 obligatorio antes de G10.A.
11. **ACTIVITY** debe quedar intacto (tests de regresión del vertical).

---

## 19. Estado

```text
Functional code changed: NO
Migration created:       NO
Push:                    NO
Deploy:                  NO
```
