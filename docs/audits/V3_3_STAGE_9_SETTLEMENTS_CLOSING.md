# V3.3 — Etapa 9 — Cierre Liquidaciones, Transferencias, Canjes y Reporting

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD pre-hardening:** `25548ab` (`feat(v3.3): add benefit settlement audit reporting`)  
**Auditoría diseño:** [`V3_3_STAGE_9_SETTLEMENTS_AUDIT.md`](./V3_3_STAGE_9_SETTLEMENTS_AUDIT.md)

**Estado código:** ✅ implementado (slices 9.0–9.8) + hardening pre-cierre  
**DB integration / concurrency real / QA manual global V3.3:** pendientes (PostgreSQL `localhost:5433` no disponible en esta sesión)

---

## 0. Slices entregados

| Slice | Descripción | Commit |
|-------|-------------|--------|
| 9.0 | Auditoría + decisiones | audit doc |
| 9.1 | Commercial Agreements | acuerdos comerciales |
| 9.2 | Settlement Domain | generate/refresh/allocate/close |
| 9.3 | CASH / Transfer Accounting | transferencias manuales |
| 9.4 | Courtesy Credit Ledger | ledger append-only |
| 9.5 | Gastro Courtesy Funding | debit funded cortesías |
| 9.6 | Admin Settlement UI | portal liquidaciones |
| 9.7 | Audit / Reporting | monthly, partners, integrity, settlement audit |
| 9.8 | Hardening / Pre-cierre | fixes mínimos + tests + este doc |

---

## 1. Modelo de negocio (V1)

```
uso validado (scanner)
  → acuerdo comercial histórico
  → liquidación mensual (settlement)
  → CASH y/o BARTER
  → transferencia manual (CASH) y/o crédito ledger (BARTER)
  → cortesía gastro con funding (opcional)
```

**No incluido en V1:**

- Pasarela de pago / API bancaria
- Facturación fiscal
- CSV export
- Proof upload de comprobantes
- Consumo de crédito Activity (cortesía activity)
- Ajuste automático por validaciones tardías en settlement CLOSED

---

## 2. CASH — due / received / outstanding

| Concepto | Fuente |
|----------|--------|
| `cashDueCents` | Suma allocations `mode=CASH` (snapshot `baseAmountCents`) |
| `cashReceivedCents` | Suma transfers activos (`reversedAt IS NULL`) |
| `cashOutstandingCents` | `due - received` (derivado server-side) |

**`CLOSED ≠ PAID`:** `settlement.status=CLOSED` es cierre operativo del período; `cashCollectionStatus` puede ser `PARTIALLY_RECEIVED` o `PENDING`. UI y reporting nunca mapean CLOSED a “Pagado/Cobrado”.

**Overpayment:** bloqueado en service (`Serializable` + `FOR UPDATE` + recomputación). Integrity → `CASH_OVERPAYMENT` ERROR.

---

## 3. BARTER — allocation → crédito exactamente una vez

```
1 BARTER allocation → 1 CREDIT_FROM_SETTLEMENT (sourceAllocationId @unique)
```

- Materialización idempotente en `CourtesyCreditLedgerService.materializeBarterCreditForAllocation`
- `detectBarterCreditDrift()` cubre: missing, duplicate, amount mismatch, orphan
- Canje **no** es dinero recibido — nunca sumar con CASH en KPIs

---

## 4. Validación única económica

**DB:** `@@unique([validationSource, validationId])` en `BenefitSettlementUsageAllocation`

**Service:** `allocate()` captura `P2002` → `BENEFIT_SETTLEMENT_ALLOCATION_CONFLICT`

Casos cubiertos:

- Request A CASH + request B BARTER misma validation → segunda rechazada
- Misma validation en settlement distinto → segunda rechazada

`allocate()` reforzado en 9.8: `FOR UPDATE` settlement + re-check CLOSED + `Serializable`.

---

## 5. Settlement close freeze

Después de `CLOSED`:

| Permitido | Bloqueado |
|-----------|-----------|
| Transfers | `refresh` usages |
| Ledger history / reporting | Nuevas allocations |
| | Cerrar con `pendingUsageCount > 0` |

Late validation en settlement abierto → refresh puede incorporarla como pending.  
Late validation con settlement CLOSED → no modifica histórico (ajuste futuro).

---

## 6. Acuerdos históricos

- Allocation guarda snapshot: `agreementId`, `unitPriceCents`, `barterMultiplier`, `baseAmountCents`, `currency`
- Cambiar/cerrar/reemplazar agreement **no** altera allocations existentes
- Múltiples agreements mismo mes (ej. 1–15 tarifa A, 16–31 tarifa B) → cada allocation usa agreement vigente en `validatedAt`
- Validation eligible sin agreement histórico → generate/refresh/allocate bloqueado (`missingAgreements`), no $0 silencioso

---

## 7. Money safety

| Capa | Tipo |
|------|------|
| Prisma | `BigInt` cents |
| API | `string` |
| Backend | `bigint` |
| Barter multiplier | `Decimal` / string |
| Rounding | `roundBarterCreditCents()` half-up, sin float |

V1 moneda: **ARS** única. Currency mismatch en transfer → rechazado + integrity ERROR.

Tests > Int32: `3000000000` cents en agreements y settlements.

---

## 8. Timezone

- `periodKey = YYYY-MM`
- Calendario `America/Argentina/Buenos_Aires`
- `validatedAt` determina período y agreement histórico

---

## 9. Ledger append-only

Movimientos: `CREDIT_FROM_SETTLEMENT`, `DEBIT_COURTESY`, `ADJUSTMENT`, reversals relacionados.

- Sin UPDATE de `amountCents`
- Sin DELETE de entries
- Balance = `SUM(entries)` por tenant/vertical/partner/currency

**Reporting semantics:**

- `creditGenerated` = neto `CREDIT_FROM_SETTLEMENT` (+ reversals)
- `creditConsumed` = neto `DEBIT_COURTESY` (+ reversals), no `ABS(SUM)`
- `balance < 0` → integrity ERROR

---

## 10. Courtesy funding (Gastro)

- `1 funded GastroCourtesyCampaign → máximo 1 DEBIT_COURTESY` (`sourceCourtesyCampaignId @unique`)
- Funding ADMIN only (server-side reject GASTRO role)
- `GASTRO_OWNER` cortesía sin funding → backward compatible, sin ledger debit
- Cancel cortesía V1 → **no** auto-refund (reversal manual si corresponde)

Funding no altera: claim uniqueness, QR, scanner, USED, expiry (regression tests PASS).

---

## 11. Activity

- Agreement → settlement → CASH / BARTER credit → balance visible
- **Activity courtesy consumption → DIFERIDO** (sin endpoint/CTA)

---

## 12. Tenant isolation

Todos los controllers Etapa 9 usan `authenticated user.tenantId` — sin `tenantId` arbitrario en query/body:

- Agreements, settlements, transfers, ledger, funded courtesy, reporting

**ADMIN only** (excepto flujo GASTRO courtesy histórico sin funding).

**Partner XOR:** GASTRO → `gastroProfileId` only; ACTIVITY → `excursionOperatorId` only.

---

## 13. Delete safety (auditoría 9.8)

### Paths auditados

| Path | Protección |
|------|------------|
| `AdminDeepDeleteService.suspendGastroInTx` / `executeGastro` | No hard-delete si validations/claims USED o `settlementAllocations > 0` |
| `AdminContentPurgeService.hardDeleteGastroProfile` | Rechaza si validations, claims o allocations |
| `AdminContentPurgeService.hardDeleteExcursionOperator` | Rechaza si `settlementAllocations > 0` |
| `AdminDeepDeleteService.executeExcursionOperator` | Soft-delete si allocations existen |
| Preflight gastro / excursion operator | Impact item `BENEFIT_SETTLEMENT_ALLOCATIONS` |
| Agreement delete | FK `agreementId` → **Restrict** en allocation |
| Settlement / transfer / ledger | Sin hard-delete ordinario; reversal/adjustment only |

### Punto crítico: validationId lógico

`BenefitSettlementUsageAllocation.validationId` no tiene FK real.

**Fix 9.8:** deep delete y content purge bloquean borrado destructivo de partner con allocations.  
**Integrity 9.8:** `checkOrphanAllocation` + `checkPartnerMismatchAllocation` en reporting integrity.

**Deuda:** `prisma/scripts/cleanup-content.ts` (script dev) no auditado para producción — no ejecutar contra DB con historia económica.

### User delete

Actor FKs (`createdBy`, `registeredBy`, `reversedBy`) → `SetNull` donde corresponde; registros económicos persisten.

### Partner delete

`GastroProfile` / `ExcursionOperator` con historia económica → **Restrict** / soft-delete; no cascade destructivo.

---

## 14. Integrity matrix

### ERROR

- BARTER missing/duplicate credit, amount mismatch, orphan credit
- Cash overpayment
- Negative balance
- CLOSED with pending usages
- Currency mismatch
- Partner mismatch (allocation vs validation)
- Orphan allocation (validation deleted)

### NORMAL (no ERROR)

- Cash outstanding
- `PARTIALLY_RECEIVED`
- OPEN with pending
- Activity unconsumed credit

Script READ-ONLY: `pnpm --filter api run benefit-settlements:audit-integrity` (tenant-scoped en 9.8).

---

## 15. Privacy (reporting API)

Settlement audit / reporting no devuelve: `qrToken`, `claimToken`, `recipientEmail`, passwords, metadata privada.  
Actor labels vía `userDisplayLabel` (email nullable — no fabricar).

---

## 16. Migrations Etapa 9

| Migration | Contenido |
|-----------|-----------|
| `20260901120000_benefit_commercial_agreements` | Agreements, BigInt, XOR partner |
| `20260901140000_benefit_settlement_domain` | Settlements, allocations, `@@unique(validationSource, validationId)` |
| `20260901160000_benefit_settlement_transfers` | Transfers append-only, reversal |
| `20260901180000_courtesy_credit_ledger` | Ledger append-only, `sourceAllocationId @unique` |
| `20260901200000_gastro_courtesy_credit_funding` | `sourceCourtesyCampaignId @unique` |

**Prisma validate:** PASS  
**Migration apply:** NO EJECUTADO (PostgreSQL no disponible)

---

## 17. Hardening 9.8 — cambios concretos

1. `allocate()`: `FOR UPDATE` + Serializable + re-check CLOSED
2. Shared: `benefitValidationAllocationKey`, `checkOrphanAllocation`, `checkPartnerMismatchAllocation`
3. Integrity service: `checkAllocationLogicalIntegrity()`
4. Deep delete / content purge: guard `countPartnerSettlementAllocations` (Gastro + Excursion operator)
5. Preflight: impact item allocations económicas
6. Audit integrity script: tenant filter en settlements y ledger queries
7. Tests: `test-benefit-settlement-hardening`, extensiones reporting/domain

---

## 18. Tests (esta sesión)

| Suite | Resultado |
|-------|-----------|
| `test:benefit-commercial-agreements` | PASS (DB: NO EJECUTADO) |
| `test:benefit-settlement-domain` | PASS (DB: NO EJECUTADO) |
| `test:benefit-settlement-transfers` | PASS (DB: NO EJECUTADO) |
| `test:courtesy-credit-ledger` | PASS (DB: NO EJECUTADO) |
| `test:gastro-courtesy-credit-funding` | PASS (DB: NO EJECUTADO) |
| `test:benefit-settlement-reporting` | PASS |
| `test:benefit-settlement-hardening` | PASS |
| `test:benefit-settlement-admin-ui` | PASS |
| Gastro QR / Activity QR / scan / claim / scanner short-code | PASS |

---

## 19. Builds

| Package | Resultado |
|---------|-----------|
| `shared` | PASS |
| `api` | PASS |
| `web` | PASS |
| `scanner` | PASS |
| `prisma validate` | PASS |

---

## 20. DB integration / concurrency

| Check | Estado |
|-------|--------|
| Index unique allocation | NO EJECUTADO — P1001 |
| Partial unique settlements | NO EJECUTADO |
| Concurrent transfer overpayment | NO EJECUTADO |
| Concurrent double allocation | NO EJECUTADO |
| Concurrent BARTER materialization | NO EJECUTADO |
| Concurrent courtesy overspend | NO EJECUTADO |
| `benefit-settlements:materialize-barter-credits` | NO EJECUTADO |
| `benefit-settlements:audit-integrity` | NO EJECUTADO |

Scripts existen; no declarar concurrency “validada” sin PostgreSQL.

---

## 21. QA manual

**PENDIENTE** — acumulado para cierre global V3.3:

agreements, generate settlement, allocate CASH/BARTER, partial transfer, full transfer, reversal, credit balance, courtesy funding, insufficient balance, reporting, integrity, mobile Admin.

---

## 22. Deuda real (post-Etapa 9)

- Activity courtesy consumption
- Private proof storage / comprobantes
- CSV export
- Partner portal liquidaciones
- Auto-refund cortesía al cancelar
- Late validation adjustment flow (settlement CLOSED)
- DB/concurrency smoke si no ejecutado
- QA global V3.3
- Context update global (AI_ENTRYPOINT, handoff, checklist) — **diferido**

---

## 23. Audit log actions

Confirmados en flujos Etapa 9:

`BENEFIT_AGREEMENT_*`, `BENEFIT_SETTLEMENT_*`, `BENEFIT_USAGE_*`, `BENEFIT_TRANSFER_*`, `BENEFIT_CREDIT_*` — actor real Admin, sin actor system fabricado.
