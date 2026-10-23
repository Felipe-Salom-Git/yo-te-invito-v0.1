# V3.3 — G8.11.0 — Accounting de cortesías (discovery / audit de trazabilidad)

**Branch:** `feat/v1-s03-api-foundation` · **HEAD inicial:** `8865459` · **Sin push. Sin deploy. Producción congelada.**
**Resultado:** la regla D1 se puede implementar **sin migration** con relaciones Prisma existentes.

---

## 1. Cadena real (schema actual)

```text
GastroCourtesyCampaign ──(discountId @unique, 1:1)──► GastroDiscount (visibility = COURTESY_ONLY)
        │                                                   │
        │ courtesyCreditDebit (0..1)                        │ validations (1:N, discountId NOT NULL, Cascade)
        ▼                                                   ▼
CourtesyCreditLedgerEntry                          GastroDiscountValidation (claimId @unique, nullable, SetNull)
  type = DEBIT_COURTESY                                     │
  sourceCourtesyCampaignId @unique (FK Restrict)            │ validationSource = GASTRO_DISCOUNT_VALIDATION
                                                            │ validationId (referencia lógica, sin FK)
GastroDiscountClaim (type = COURTESY,                       ▼
  courtesyCampaignId nullable SetNull) ◄── claim   BenefitSettlementUsageAllocation
                                                     @@unique([validationSource, validationId])
```

| Relación | Cardinalidad | Garantía |
|---|---|---|
| `GastroCourtesyCampaign.discountId` → `GastroDiscount` | 1:1 | `discountId @unique`, FK Cascade |
| `GastroDiscountValidation.discountId` → `GastroDiscount` | N:1 | FK **NOT NULL** Cascade |
| `GastroDiscountValidation.claimId` → `GastroDiscountClaim` | 0..1 | `@unique`, nullable, SetNull |
| `GastroDiscountClaim.courtesyCampaignId` → campaign | N:1 | nullable, SetNull |
| `CourtesyCreditLedgerEntry.sourceCourtesyCampaignId` → campaign | 0..1 | `@unique`, FK **Restrict** |
| Allocation → validation | 0..1 | `@@unique([validationSource, validationId])`, sin FK (integridad por `ORPHAN_ALLOCATION`) |

## 2. Respuestas

### ¿Cómo identificar inequívocamente una validation de courtesy?

Por la ruta **validation → discount → courtesyCampaign**: `validation.discount.courtesyCampaign != null` (y `discount.visibility = COURTESY_ONLY`, que se setea en la misma transacción que crea la campaña).

Es la ruta canónica porque `validation.discountId` es NOT NULL y la campaña es 1:1 con el discount. La ruta por claim (`validation.claim.courtesyCampaignId`, `claim.type = COURTESY`) es secundaria: `claimId` y `courtesyCampaignId` son nullable con `SetNull`, así que no sirven como única fuente.

### ¿Cómo identificar si esa courtesy fue financiada?

`validation.discount.courtesyCampaign.courtesyCreditDebit` existe con `type = DEBIT_COURTESY`.

- El débito se crea **solo** en `GastroCourtesyDiscountsService` al crear la campaña (ADMIN, `funding` en el body), dentro de la **misma transacción `Serializable`** que el discount, la campaña y los claims (`debitForGastroCourtesyCampaign`, idempotente por `sourceCourtesyCampaignId`).
- No existe otra operación que agregue un `DEBIT_COURTESY` a una campaña ya creada. El estado "financiada" queda fijo desde el commit, **antes** de que pueda existir cualquier claim usable o validation, así que no hay carrera entre financiar y validar.
- Hoy `DEBIT_COURTESY` **no es reversible** (`reverseEntry` solo acepta entradas positivas). Por eso, que exista el débito equivale a que la campaña está financiada.
- Owner (GASTRO_OWNER) no puede financiar (D2) → toda cortesía de owner es **no financiada**.
- Cross-profile: el débito es por campaña (`sourceCourtesyCampaignId`), no por local. Financiar la campaña A nunca marca validations de la campaña B ni de descuentos normales del mismo local.

### ¿La relación requiere joins existentes o falta schema?

Solo joins existentes. Se resuelve con un `select` anidado de Prisma en el discovery:

```ts
discount: {
  select: {
    tenantId, gastroProfileId, visibility,
    courtesyCampaign: { select: { id, courtesyCreditDebit: { select: { id, type } } } },
  },
}
```

No hay N+1: es la misma query que el discovery ya hace por (tenant, local, período).

### ¿Puede hacerse sin migration?

**Sí. NO migration.** No se crea `BenefitSettlement → GastroCourtesyCampaign` ni `Allocation → CourtesyCampaign`. El settlement sigue siendo **partner + period**.

## 3. Estado actual (antes de G8.11)

| Punto | Hoy | Problema |
|---|---|---|
| `BenefitSettlementEligibilityService.discoverGastro` | `claimId != null` + período + tenant + `gastroProfileId` | No mira funding → cortesía financiada **es facturable** (viola D1; habilita crédito circular BARTER → crédito → cortesía → BARTER) |
| `isGastroValidationEligibleForSettlement` (shared) | solo `claimId != null` | Regla incompleta |
| `allocate()` | Selecciona solo de `discovery.priced` (`selectPendingUsagesForAllocation`) | Correcto como mecanismo: excluir en el discovery bloquea también la inyección por `validationIds`, pero con el error genérico `NOT_PENDING` |
| `generate / refresh / close / buildSummary / pending-validations` | Todos derivan del mismo discovery | Se corrigen con un único cambio en el discovery |
| Reporting monthly / partners / integrity | Derivan de `summary` (discovery) | Se corrigen solos |
| G6 `GastroDiscountEconomicReportingService` | `validatedUsageCount` = validations con claim; `allocatedUsageCount` = allocations | No hay cifra explícita de "uso facturable sin asignar", pero no distingue "operativo" de "facturable" para una cortesía financiada |
| Integridad | No conoce cortesías | Una allocation **legacy** (anterior a G8.11) de cortesía financiada no se detecta |
| Scanner | Marca claim `USED` + crea validation en la misma tx; **no toca el ledger** | OK: validar no debita |
| `close()` | No toca el ledger | OK: cerrar no debita |

## 4. Elegibilidad: qué se considera

| Regla | Fuente |
|---|---|
| Validation válida con claim (master QR excluido) | `claimId != null` (la validation solo se crea con el claim marcado `USED`, misma tx) |
| Tenant + local | `discount.tenantId` / `discount.gastroProfileId` = settlement |
| Período | `validatedAt` dentro del `periodKey` (AR) |
| Sin allocation previa | `excludeValidationIds` + `@@unique([validationSource, validationId])` |
| Agreement aplicable | `resolveSettlementAgreementForValidation` a `validatedAt` → si falta, `missingAgreements` (sin cambios) |
| **Courtesy funding (nuevo)** | `discount.courtesyCampaign.courtesyCreditDebit.type = DEBIT_COURTESY` → **no elegible** |

"Discount/courtesy activa al momento correspondiente" lo garantiza el scanner al validar (padre `ACTIVE|APPROVED`, claim `ACTIVE`). El settlement **no** reevalúa el estado actual del descuento: un uso histórico sigue siendo facturable aunque el descuento se haya archivado o cancelado después (semántica G7.12, sin cambios).

La detección de funding **no** depende de `visibility`: si una campaña tiene `DEBIT_COURTESY`, sus validations no son facturables. Es la opción conservadora frente a doble monetización ante cualquier inconsistencia de datos.

## 5. Datos reales

**No auditados contra base real.** PostgreSQL/Docker local no está disponible y producción está congelada (sin acceso de lectura en esta etapa). Las migrations `20260901120000`…`20260901200000` (liquidaciones/ledger/funding) figuran como **no aplicadas localmente**.

- Riesgo: si en producción ya existieran allocations de cortesías financiadas (creadas antes de G8.11), **no se modifican**: las allocations y el ledger son inmutables/append-only. G8.11 agrega un **WARNING de integridad** para detectarlas y que ADMIN decida (ajuste manual vía `ADJUSTMENT`).

## 6. Reversión de financiamiento (G8.11.12) — análisis

| Pregunta | Respuesta |
|---|---|
| ¿Qué pasa si ADMIN cancela una cortesía financiada antes de uso? | La campaña pasa a terminal (`CANCELLED`), los claims `ACTIVE` pasan a `CANCELLED`. El `DEBIT_COURTESY` **queda** → el crédito **no** se restaura |
| ¿El crédito debería restaurarse? | Funcionalmente sí (si no hubo usos), mediante una **nueva** entry append-only |
| ¿Existe operación segura actual? | **No.** `reverseEntry` rechaza entradas no positivas (`BENEFIT_CREDIT_NOT_REVERSIBLE`) y `assertLedgerAmountSignForType('REVERSAL')` exige monto **negativo**. `ADJUSTMENT` positivo restauraría saldo pero **sin vínculo** inequívoco ni idempotencia con el débito |

El schema **sí** permitiría trazabilidad e idempotencia (`reversalOfEntryId @unique` apuntando al `DEBIT_COURTESY`). Lo que falta es **semántica nueva**:

1. `REVERSAL` positivo (hoy prohibido) y su efecto en `computeCreditConsumedCents`.
2. Regla de negocio: ¿solo si 0 claims `USED`?, ¿reversión parcial si hubo usos parciales?, ¿automática al cancelar o acción manual ADMIN?
3. Orden de lock entre la cancelación de la campaña y el ledger del partner.

**Decisión: DEFERRED** (no se modifica ni se borra ninguna entry). Propuesta para una etapa futura (sin migration):

```text
POST /admin/courtesy-credit/campaigns/:campaignId/restore  (ADMIN)
  tx Serializable + lock GastroProfile
  precondiciones: campaign CANCELLED, 0 claims USED, DEBIT_COURTESY existe, sin reversal previo
  crea REVERSAL { amountCents = -debit.amountCents (> 0), reversalOfEntryId = debit.id }
  idempotencia: reversalOfEntryId @unique (P2002 → ALREADY_REVERSED)
  requiere: assertLedgerAmountSignForType('REVERSAL', x, original) por signo opuesto al original
```

La elegibilidad de G8.11 no se ve afectada: una campaña cancelada sin usos no tiene validations.

## 7. Plan de slices

| Slice | Contenido | Schema |
|---|---|---|
| G8.11.1–G8.11.8 | Helper canónico (shared) + discovery excluye financiadas + guard en `allocate` (`BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY`, re-check dentro de la tx) + count de excluidas en pendientes + tests A–H | NINGUNO |
| G8.11.9 | Reporting: G6 distingue uso operativo de facturable; WARNING de integridad para allocations legacy de cortesías financiadas; copy UI "Cortesía financiada con crédito · No facturable" | NINGUNO |
| G8.11.10–G8.11.12 | Ledger (1 débito, sin débito al validar/cerrar) + idempotencia: cubiertos por tests; reversión **DEFERRED** | NINGUNO |
