# V3.3 — Etapa 9 — Auditoría Liquidaciones, Transferencias y Canjes

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al auditar:** `c9d17a4` (`docs(v3.3): close admin campaigns context`)  
**Slice:** 9.0 (solo auditoría + decisiones; sin Prisma ni código de producto)

Checklist origen: **F1** — `Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md` § F1 (conciliación cupones).  
Etapa 8 cerrada: campañas marketing **no** se acoplan a settlement (trazabilidad indirecta vía claim/validation).

**No** actualizar contextos globales. **No** push. **No** implementar slices 9.1+ en este commit.

---

## 0. Principio no negociable

```
USO VALIDADO (scanner)  →  OBLIGACIÓN ECONÓMICA  →  LIQUIDACIÓN  →  TRANSFERENCIA y/o CANJE  →  CRÉDITO CORTESÍAS
```

| Clase | Qué es | Qué **no** es |
|-------|--------|----------------|
| **Benefit settlement** (Etapa 9) | Contabilidad operativa de usos Gastro/Activity validados | Pago automático, pasarela, conciliación bancaria |
| **Payment / Order** | Ticketera checkout (`Payment.amount` Int, `currency` ARS) | Liquidación de cupones |
| **Payout** | Productora → retiro manual ticketera (`amountCents`) | Liquidación gastro/activity |
| **ReferralPaymentRequest** | Referidor ↔ productora, liquidación **externa** manual | Liquidación de beneficios |
| **AdminCampaign** | Marketing opt-in (`UserMarketingPreference`) | Motor económico de uso |

**NO** integrar Getnet, Payway, Mercado Pago, Stripe, APIs bancarias.  
Transferencias monetarias = registro manual Admin (`SettlementTransfer`), no webhook.

**CASH ≠ BARTER CREDIT:** magnitudes separadas en UI, API y ledger. Nunca sumar “pagó $150.000” mezclando transferencia real + crédito de canje.

---

## 1. Auditoría — dominio de uso (preguntas obligatorias)

### 1.1 ¿Qué timestamp define el período?

| Vertical | Campo | Fuente |
|----------|-------|--------|
| Gastro | `GastroDiscountValidation.validatedAt` | `@default(now())` al crear fila en scanner |
| Activity | `ActivityCouponValidation.validatedAt` | idem |

**Decisión período V1:** `periodKey = YYYY-MM` en calendario **Argentina** (`America/Argentina/Buenos_Aires`), mismo helper que digest/expiry:

- Reutilizar `getGastroDiscountCalendarKey(date, GASTRO_DISCOUNT_TIMEZONE)` → extraer `YYYY-MM` (primeros 7 chars) o helper dedicado `getBenefitSettlementPeriodKey(date)`.
- **No** agrupar por UTC implícito del VPS.

### 1.2 ¿Qué status/resultados cuentan como uso económico válido?

| Vertical | Cuenta | No cuenta |
|----------|--------|-----------|
| **Gastro** | Fila en `GastroDiscountValidation` con **`claimId IS NOT NULL`** (redención claim-first exitosa) | Respuestas scanner `INVALID`, `EXPIRED`, `ALREADY_USED`, `INACTIVE`, `NOT_VALID_TODAY` (no crean validation). Validaciones **master QR** sin `claimId` (legacy `discount.qrToken` directo) — **excluidas V1** (ver §1.6) |
| **Activity** | `ActivityCouponValidation` con **`result = 'VALID'`** y `claimId` presente | Cualquier scan que retorna sin crear validation |

Gastro no tiene columna `result`; la existencia de la fila tras scan exitoso = uso contable. Activity almacena `result` explícito.

### 1.3 ¿Las validaciones exitosas son inmutables?

| Hecho | Evidencia |
|-------|-----------|
| Scanner no actualiza/borra validations | `scanner-gastro-discount.service.ts`, `scanner-activity-coupon.service.ts` solo `create` |
| Idempotencia scan | `claimId @unique` + transacción `updateMany` claim → USED |
| Riesgo cascade | `GastroDiscountValidation.discount` → `onDelete: Cascade`; `ActivityCouponValidation.coupon` → `onDelete: Cascade` |

**Decisión:** validaciones elegibles son **históricas** una vez creadas. Settlement **no** debe depender de filas vivas de discount/coupon para montos (snapshot en allocation). Deep delete de partner con allocations → **Restrict** o snapshot previo; no cascade settlement.

### 1.4 ¿Puede existir más de una validación válida por claim?

| Modelo | Constraint | Conclusión |
|--------|------------|------------|
| `GastroDiscountValidation` | `claimId String? @unique` | **Máximo 1** validation por claim |
| `ActivityCouponValidation` | `claimId String? @unique` | **Máximo 1** validation por claim |

Un claim USED no puede re-escanearse (scanner → `ALREADY_USED`).

**Excepción Gastro:** master token sin claim puede crear **múltiples** validations por `discountId` (sin unique). Por eso V1 limita elegibilidad a `claimId IS NOT NULL`.

### 1.5 ¿Cómo identificar el partner económico?

| Vertical | Partner | Resolución |
|----------|---------|------------|
| **GASTRO** | `GastroProfile` | `GastroDiscount.gastroProfileId` en la validation vía join `discountId`. Si `gastroProfileId` null (legacy): **no elegible V1** hasta dato reparable; no inferir partner por `eventId` solo |
| **ACTIVITY** | `ExcursionOperator` | `ActivityCoupon.excursionOperatorId` vía join `couponId`. **No** acuerdo a nivel `Event` aunque el cupón tenga `eventId` |

### 1.6 Master QR Gastro (legacy)

`ScannerGastroDiscountService` permite validar `discount.qrToken` maestro **sin** claim → crea `GastroDiscountValidation` sin `claimId`.

**Decisión V1:** **excluir** del pool de liquidación. Motivo: sin claim no hay trazabilidad 1:1 ni garantía de uso único. Si negocio requiere incluirlos → slice futuro con reglas explícitas.

### 1.7 Infraestructura AuditLog

| Pieza | Path | Reutilizar |
|-------|------|------------|
| `AuditService.logAction` | `apps/api/src/modules/audit/audit.service.ts` | **Sí** — requiere `actorId` real (ADMIN V1) |
| `AuditAction` enum | `schema.prisma` | **Extender** con prefijo `BENEFIT_*` (no reutilizar `GASTRO_DISCOUNT_REDEEMED` para settlement) |
| Acciones scan existentes | `GASTRO_DISCOUNT_REDEEMED`, `ACTIVITY_COUPON_REDEEMED` | Permanecen en scanner; settlement audita acciones **económicas** aparte |

### 1.8 Sistema cortesías Gastro actual

| Pieza | Evidencia |
|-------|-----------|
| Modelo | `GastroCourtesyCampaign` 1:1 `GastroDiscount`, N claims vía `courtesyCampaignId` |
| Servicio | `GastroCourtesyDiscountsService` — envío email, crea discount+claims `type=COURTESY` |
| Ledger monetario | **No existe** |
| Valor imputado | **No existe** — cortesía no consume crédito hoy |

**Decisión slice 9.5:** al crear cortesía **financiada por crédito Admin**, Admin ingresa `imputedValueCents`; transacción atómica: verificar saldo ledger → crear campaña/claim → `DEBIT_COURTESY` en ledger.

### 1.9 Activity — cortesías equivalentes

**No existe** `ActivityCourtesyCampaign` ni flujo de cortesía Activity.

**Decisión:** BARTER allocation genera `CourtesyCreditLedgerEntry` para `ExcursionOperator`. **Consumo** de ese crédito en Activity **diferido** (sin inventar sistema de cortesía Activity en Etapa 9). Ledger queda disponible para evolución “regalo publicado”.

### 1.10 Modelos económicos que podrían confundirse

| Modelo existente | Dominio | Riesgo naming | Acción |
|------------------|---------|---------------|--------|
| `ReferralCommercialAgreement` | Referidor ↔ productora, comisión tickets | “CommercialAgreement” | Prefijo **`Benefit`** en modelos nuevos |
| `ReferralPaymentRequest` | Solicitud pago manual referidos | “Payment” | No reutilizar |
| `Payment` | Checkout ticketera | “Payment” | No reutilizar |
| `Payout` | Retiro productora | “Payout” | No reutilizar |
| `PayoutStatus` | REQUESTED/SENT… | “PAID” ambiguo | Settlement usa `SETTLED` / `PARTIALLY_SETTLED`, no `PAID` único |

Nombres propuestos (prefijo `Benefit`):

- `BenefitCommercialAgreement`
- `BenefitSettlement`
- `BenefitSettlementUsageAllocation`
- `BenefitSettlementTransfer`
- `CourtesyCreditLedgerEntry` (ledger es transversal; mantiene nombre explícito)

### 1.11 Deep delete e histórico

| Entidad | Comportamiento actual | Impacto settlement |
|---------|----------------------|-------------------|
| `GASTRO` deep delete | Validations **keep** (critical) | Partner puede borrarse; validations quedan huérfanas de profile si cascade discount |
| `EXCURSION_OPERATOR` deep delete | No cuenta activity validations en preflight | Riesgo: operator borrado con cupones activos (`ExcursionOperator` → `Restrict` en coupon) |
| `User` actor Admin | FK `SetNull` en acuerdos/settlement `createdBy` | OK |
| Validation delete | Solo vía cascade discount/coupon delete | **Prohibir** borrar discount/coupon con allocation activa (Restrict en allocation → validation) |

**Decisión:** allocations referencian `validationId` + `validationSource` enum; snapshot de `partnerId`, `periodKey`, precios en allocation; partner delete con historial → **Restrict** si hay settlements no cancelados.

---

## 2. Arquitectura — motor común + origen vertical

```
                    ┌─────────────────────────────────────┐
                    │     Benefit settlement engine       │
                    │  (agreements, settlements, ledger)  │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┴────────────────────┐
              │                                         │
    GastroDiscountValidation              ActivityCouponValidation
    (claimId NOT NULL)                  (result = VALID)
              │                                         │
    GastroProfile partner                 ExcursionOperator partner
```

**No** unificar `GastroDiscount` / `ActivityCoupon` en `GenericCoupon`.  
**Sí** motor compartido: acuerdo, período, allocation, transfer, ledger.

---

## 3. Money representation

| Área repo | Convención | Recomendación Etapa 9 |
|-----------|------------|----------------------|
| `Payment.amount` | `Int` (centavos) | **Seguir** |
| `Payout.amountCents` | `Int` | **Seguir** |
| `ReferralCommission.amountCents` | `Int` | **Seguir** |
| `Order.totalAmount` | `Decimal(12,2)` pesos | No usar para settlement nuevo |
| `GastroDiscount.value` | `Float` beneficio %/$ display | **No** usar como precio acordado partner |

**Decisión:**

- Montos settlement/ledger/transfer: **`amountCents Int`** + **`currency String @default("ARS")`**.
- `unitPriceCents` en acuerdo.
- `barterMultiplier`: **`Decimal @db.Decimal(8, 4)`** (ej. `2.0000`), no `Float` JS.
- Crédito por uso BARTER: `creditCents = roundHalfUp(unitPriceCents * barterMultiplier)` **por allocation**, server-side shared helper.
- **No** `Number` float en asserts de tests económicos.

---

## 4. BenefitCommercialAgreement

Representa tarifa vigente por partner.

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | cuid | |
| `tenantId` | FK | |
| `vertical` | enum `GASTRO` \| `ACTIVITY` | |
| `partnerType` | enum `GASTRO_PROFILE` \| `EXCURSION_OPERATOR` | Explícito (no string libre) |
| `partnerId` | String | `GastroProfile.id` o `ExcursionOperator.id` |
| `unitPriceCents` | Int | Precio acordado por uso |
| `barterMultiplier` | Decimal | Default UI sugiere `2.0`; **no** hardcode global en lógica |
| `currency` | String | Default `ARS` |
| `validFrom` | DateTime | Inicio inclusive (AR calendar o instant según implementación; documentar en slice 9.1) |
| `validTo` | DateTime? | null = abierto; cerrar al reemplazar |
| `notes` | String? | |
| `createdByUserId` | FK? SetNull | |
| `createdAt` / `updatedAt` | | |

**Reglas:**

- Resolver acuerdo: `validatedAt` ∈ `[validFrom, validTo]` (o validTo null).
- Tarifa cambia → **cerrar** `validTo` + **crear** nuevo agreement; **no** editar `unitPriceCents` usado en allocations existentes.
- Overlap mismo partner+vertical con rangos solapados → **rechazar** en create.
- Unique parcial opcional: un solo agreement “abierto” (`validTo IS NULL`) por partner+vertical.

---

## 5. BenefitSettlement

| Campo conceptual | Notas |
|------------------|-------|
| `tenantId`, `vertical`, `partnerType`, `partnerId` | |
| `periodKey` | `YYYY-MM` AR |
| `status` | Ver §6 |
| `eligibleUsageCount` | Snapshot al generate/refresh |
| `allocatedCashCount` / `allocatedBarterCount` | Derivados de allocations |
| `baseAmountCents` | Suma snapshots allocations (o eligible × precio al generate) |
| `cashDueCents` | Suma base de allocations CASH |
| `cashTransferredCents` | Suma transfers |
| `barterCreditGeneratedCents` | Suma créditos generados por allocations BARTER |
| `createdByUserId`, `startedAt`, `closedAt?` | |

**Unique V1:** `@@unique([tenantId, vertical, partnerType, partnerId, periodKey])` — un settlement por partner/período.

**Generación:** Admin **Generate settlement** → backend descubre validations elegibles **sin allocation activa** en ese período/partner.

---

## 6. Estados — doble dimensión (recomendado)

Un solo `status` mezcla “usos asignados” con “plata recibida”. **Recomendación V1:**

| Campo | Valores | Significado |
|-------|---------|-------------|
| `allocationStatus` | `OPEN` \| `PARTIAL` \| `COMPLETE` | ¿Todos los usages elegibles tienen mode CASH o BARTER? |
| `settlementStatus` | `OPEN` \| `PARTIALLY_SETTLED` \| `SETTLED` \| `CANCELLED` | Estado de negocio global |
| `cashCollectionStatus` | `NOT_APPLICABLE` \| `PENDING` \| `PARTIAL` \| `COMPLETE` | Solo si hay allocations CASH |

**Reglas derivadas:**

- `cashOutstandingCents = cashDueCents - cashTransferredCents` (mínimo 0).
- `settlementStatus = SETTLED` cuando `allocationStatus = COMPLETE` **y** (`cashCollectionStatus = COMPLETE` o `NOT_APPLICABLE`).
- `PARTIALLY_SETTLED`: allocations parciales **o** cash pendiente.
- `CANCELLED`: void admin con audit; allocations reversadas (ver §12).

Alternativa mínima si se prefiere un enum: mantener `settlementStatus` + campos derivados `cashOutstandingCents` siempre visibles en API (decisión final en slice 9.2).

---

## 7. BenefitSettlementUsageAllocation

**Estrategia recomendada** (evita double-count y sobreallocate):

| Campo | Notas |
|-------|-------|
| `settlementId` | FK |
| `validationSource` | `GASTRO_DISCOUNT_VALIDATION` \| `ACTIVITY_COUPON_VALIDATION` |
| `validationId` | String |
| `mode` | `CASH` \| `BARTER` |
| `unitPriceCents` | **Snapshot** del acuerdo vigente al asignar |
| `barterMultiplier` | **Snapshot** |
| `baseAmountCents` | = `unitPriceCents` (por uso) |
| `creditCents` | Si BARTER: `round(unitPriceCents * multiplier)`; si CASH: 0 |
| `agreementId` | FK al agreement usado (trazabilidad) |
| `allocatedAt` | |
| `allocatedByUserId` | |

**Constraints críticos:**

- `@@unique([validationSource, validationId])` — **idempotencia económica** (una validation → una allocation activa).
- Backend: `cashCount + barterCount <= eligibleUsageCount` vía conteo real de allocations, no solo input UI.

**Allocation automática por cantidad:** UI envía `{ cashCount: 10, barterCount: 10 }` → backend selecciona validations no asignadas del período **`ORDER BY validatedAt ASC`** (oldest first), persiste allocations concretas.

---

## 8. BenefitSettlementTransfer

| Campo | Notas |
|-------|-------|
| `settlementId` | |
| `amountCents` | |
| `transferredAt` | |
| `reference` | opcional |
| `proofUrl` | HTTPS GCS |
| `notes` | |
| `registeredByUserId` | SetNull |
| `createdAt` | |

- Múltiples transfers por settlement permitidos.
- **Transfer ≠ allocation:** 10 usages CASH → $50.000 due; transfers $25.000 + $25.000 → complete.
- Corrección V1: **reversal** row (negativo o `voidedAt`) + nuevo transfer; no editar monto histórico si ya auditado.

**Comprobante GCS:** extender `uploadPurposeSchema` con `'settlement-proof'` (scope `platform` o `gastro`/`excursion` según partner — preferir `platform` + `entityId=settlementId`). Sin base64 en DB.

---

## 9. CourtesyCreditLedgerEntry

Append-only ledger por partner.

| Campo | Notas |
|-------|-------|
| `tenantId`, `vertical`, `partnerType`, `partnerId` | Owner |
| `entryType` | `CREDIT_FROM_SETTLEMENT` \| `DEBIT_COURTESY` \| `ADJUSTMENT` \| `REVERSAL` |
| `amountCents` | Signed: credit positive, debit negative (o siempre positive + direction enum — elegir uno en 9.4) |
| `balanceAfterCents` | Opcional cache; fuente verdad = SUM |
| `settlementAllocationId` | nullable; origen crédito |
| `courtesyCampaignId` | nullable; destino debit Gastro |
| `reason` / `notes` | obligatorio en ADJUSTMENT |
| `createdByUserId` | |
| `createdAt` | |

**Balance:** `availableCreditCents = SUM(entries)` por partner; transacción serializable / `SELECT FOR UPDATE` al debitar.

**No** campo `courtesyBalance` suelto sin ledger.

---

## 10. Courtesy consumption (Gastro) — reglas V1

| Escenario | Regla propuesta |
|-----------|-----------------|
| Admin crea cortesía con crédito | `imputedValueCents` requerido; atomic debit |
| Saldo insuficiente | Rechazar |
| Cortesía cancelada **antes** de uso/claim | **REVERSAL** crédito si debit ya hecho (auditar en 9.5 según lifecycle real `GastroCourtesyCampaign` / claim `CANCELLED`) |
| Cortesía **usada** (claim USED + validation) | **No** devolver crédito |
| Cortesía sin valor imputado (flujo actual gastro portal) | **No** bloquear; sin ledger (backward compatible) |

---

## 11. Late validations

| Estado settlement | Validación nueva mismo período |
|-------------------|-------------------------------|
| `OPEN` / `PARTIALLY_SETTLED` (allocation incompleta) | **Refresh** — incrementa `eligibleUsageCount`; Admin re-asigna |
| `SETTLED` (cerrado) | **No** mutar silenciosamente → adjustment documentado o settlement período siguiente / `ADJUSTMENT` ledger |
| Validación backdated | Usa `validatedAt` real para `periodKey`; si período ya cerrado → política anterior |

---

## 12. Reversals V1 (mínimo)

| Acción | Regla |
|--------|-------|
| Allocation incorrecta | Solo si settlement **no** `SETTLED`; crear `REVERSAL` allocation o delete allocation + audit (preferir entry ledger si crédito ya generado) |
| Transfer incorrecto | Reversal transfer + audit; no editar |
| Settlement close | Admin explícito; congela recálculo automático |
| Ledger | Nunca UPDATE; solo append `ADJUSTMENT` / `REVERSAL` |

---

## 13. Campaigns (Etapa 8) — trazabilidad

Sin `campaignId` en validation.

Cadena reconstruible:

```
AdminCampaign → content (GastroDiscount / ActivityCoupon) → Claim → Validation → Allocation
```

Marketing opt-out **no** afecta settlement (uso ya validado es hecho operativo).

---

## 14. Scanner — sin cambios

Scanner sigue produciendo validations; **no** calcula dinero. Etapa 9 consume downstream.

---

## 15. Admin UI (diseño V1 — slice 9.6)

| Ruta | Capacidad |
|------|-----------|
| `/admin/liquidaciones` | Listado settlements + filtros period/vertical/partner/status |
| `/admin/liquidaciones/acuerdos` | CRUD agreements, historial, close/replace |
| `/admin/liquidaciones/[id]` | Detalle: usages, allocate cash/barter, transfers, proof, ledger, audit |

Summary cards separadas:

```
BASE generado | CASH asignado | CASH transferido | CASH pendiente | CRÉDITO CANJE generado | CRÉDITO consumido | CRÉDITO disponible
```

**ADMIN only** V1. Sin portal partner.

---

## 16. AuditAction — propuesta (extender enum)

```
BENEFIT_AGREEMENT_CREATED
BENEFIT_AGREEMENT_CLOSED
BENEFIT_SETTLEMENT_GENERATED
BENEFIT_SETTLEMENT_REFRESHED
BENEFIT_USAGE_ALLOCATED_CASH
BENEFIT_USAGE_ALLOCATED_BARTER
BENEFIT_TRANSFER_REGISTERED
BENEFIT_TRANSFER_REVERSED
BENEFIT_CREDIT_GENERATED
BENEFIT_CREDIT_DEBITED
BENEFIT_CREDIT_ADJUSTMENT
BENEFIT_SETTLEMENT_CLOSED
BENEFIT_SETTLEMENT_CANCELLED
```

Naming exacto al implementar; seguir patrón existente `SCREAMING_SNAKE`.

---

## 17. Migraciones — estrategia

Separar en migraciones lógicas (no una sola gigante):

| Orden | Migración conceptual |
|-------|---------------------|
| 1 | `BenefitCommercialAgreement` |
| 2 | `BenefitSettlement` + `BenefitSettlementUsageAllocation` |
| 3 | `BenefitSettlementTransfer` |
| 4 | `CourtesyCreditLedgerEntry` + enum extensions |
| 5 | `AuditAction` values |

---

## 18. Tests plan (por slice)

| Slice | Tests clave |
|-------|-------------|
| 9.1 | agreement overlap, historical dates, replace, tenant isolation |
| 9.2 | period AR, eligible Gastro/Activity, duplicate settlement, unique validation allocation |
| 9.3 | partial/multiple transfers, cash outstanding, overpayment behavior |
| 9.4 | multiplier 2x, historical multiplier, ledger balance, no duplicate credit |
| 9.5 | debit atomic, insufficient credit, courtesy link, concurrency (DB si disponible) |
| 9.8 | regression gastro/activity scan, campaigns |

**DB integration / concurrency:** si PostgreSQL no disponible → `NO EJECUTADO`; scripts listos.

---

## 19. Explicit non-goals (Etapa 9)

- Payment gateway, bank API, AFIP, ERP, general ledger accounting
- Partner portal
- Activity courtesy campaign system
- Campaign settlement direct link
- Automatic bank reconciliation
- Fiscal invoicing

---

## 20. Slice map → commits

| Slice | Entregable | Commit message |
|-------|------------|----------------|
| **9.0** | Este audit | `docs(v3.3): audit benefit settlement architecture` |
| 9.1 | Agreements | `feat(v3.3): add benefit commercial agreements` |
| 9.2 | Settlement domain | `feat(v3.3): add benefit settlement domain` |
| 9.3 | Transfers | `feat(v3.3): add settlement transfer accounting` |
| 9.4 | Ledger | `feat(v3.3): add courtesy credit ledger` |
| 9.5 | Gastro courtesy debit | `feat(v3.3): fund gastro courtesies from barter credit` |
| 9.6 | Admin UI | `feat(v3.3): add benefit settlement admin ui` |
| 9.7 | Audit/reporting | `feat(v3.3): add benefit settlement audit reporting` |
| 9.8 | Hardening + closing doc | `fix(v3.3): harden benefit settlement lifecycle` + `V3_3_STAGE_9_SETTLEMENTS_CLOSING.md` |

---

## 21. Referencias código auditadas

| Área | Path |
|------|------|
| Gastro validation | `apps/api/src/scanner/scanner-gastro-discount.service.ts` |
| Activity validation | `apps/api/src/scanner/scanner-activity-coupon.service.ts` |
| Gastro courtesy | `apps/api/src/modules/gastro/gastro-courtesy-discounts.service.ts` |
| Metrics | `apps/api/src/modules/gastro/gastro-discount-metrics.service.ts` |
| Deep delete gastro | `apps/api/src/modules/admin/admin-deep-delete-preflight.util.ts` |
| TZ AR | `packages/shared/src/gastro-discount-expiry.ts` (`GASTRO_DISCOUNT_TIMEZONE`, `getGastroDiscountCalendarKey`) |
| Money precedents | `Payment.amount`, `Payout.amountCents`, `ReferralCommission.amountCents` |
| Upload purposes | `packages/shared/src/schemas/public-image-upload.ts` |
| Discovery F1 | `docs/audits/V3_3_FUNCTIONAL_OPERATIONS_DISCOVERY_AUDIT.md` § F1 |
| Prisma models | `apps/api/prisma/schema.prisma` — validations, courtesy, payment, referral |

---

## 22. Decisiones abiertas (resolver en slice 9.1–9.2, no bloquean audit)

1. ¿`validFrom`/`validTo` en agreement como **date** AR (sin hora) o **instant** UTC? Recomendación: **date** AR para alinearse con período mensual.
2. ¿Un enum `allocationStatus` separado o solo `settlementStatus` + campos cash? Recomendación: **ambos** para evitar ambigüedad UI.
3. ¿Incluir master QR Gastro en fase 2 con flag explícito? V1: **no**.

---

**STOP slice 9.0** — siguiente paso: slice 9.1 agreements (no iniciar en este commit).
