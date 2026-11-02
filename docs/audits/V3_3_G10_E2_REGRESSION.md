# V3.3 G10.E2 — Regresión global G10 (A + B + C + D + E1)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation` · **HEAD probado:** `307b1af` (E1) + fixture del smoke de scanner (este commit)  
**Entorno:** PostgreSQL local Docker `yo-te-invito-postgres` (`localhost:5433`, 112 migrations). Sin push, sin deploy, sin producción.

---

## 1. Resultado

```text
Suites ejecutadas (todos los `test:*` del paquete api, que también aloja los asserts puros de web): 102
PASS:                         97   (96 en la primera corrida + test:gastro-discount-scan tras corregir su fixture)
FAIL de entorno / previos:     5   (ninguno toca código G10; ver §3)
Regresiones G10 encontradas:   0
```

Las suites G10 y todas las de dominio económico, cortesías, multi-local, scanner, G5/G6/G7.12/G8 y ACTIVITY terminaron en exit 0.

## 2. Suites por grupo (exit 0)

| Grupo | Suites |
|---|---|
| **G10.A** | `test:benefit-agreement-scope`, `test:g10-discount-agreements` (PG), `test:g10-agreement-backfill` (PG), `test:g10-discount-pricing` (PG) |
| **G10.B** | `test:g10-discount-approval` (PG), `test:g10-discount-activation` (PG), `test:g10-discount-agreement-ui` |
| **G10.C** | `test:g10-discount-economic-summary`, `-economic-summary-db` (PG), `-economic-summary-ui` |
| **G10.D** | `test:g10-discount-payments`, `-payments-db` (PG), `-allocation-db` (PG), `-settlement-actions-ui` |
| **G10.E1** | `test:g10-release-reporting-integrity-db` (PG, nuevo) |
| BenefitCommercialAgreement | `test:benefit-commercial-agreements` (escenario seed: NO EJECUTADO, previo) |
| BenefitSettlement / Transfer / Allocation | `test:benefit-settlement-domain`, `-transfers`, `-admin-ui`, `-reporting`, `-hardening`, `-operations` (seed de operations: NO EJECUTADO, previo) |
| CourtesyCreditLedger / funding | `test:courtesy-credit-ledger`, `test:gastro-courtesy-credit-funding` (concurrencia de materialización: NO EJECUTADO, previo) |
| GastroCourtesy | `test:gastro-courtesy-hardening` / `-lifecycle` / `-approval` / `-delivery` / `-scanner` / `-studio` / `-emails` / `-portal` / `-accounting` (PG A–H), `test:gastro-short-code-retry`, `test:admin-gastro-courtesy` |
| GastroDiscount lifecycle | `test:gastro-discount-pending-edit` / `-edit-moderation` / `-archive` / `-origin` / `-expiry` / `-qr` / `-metrics-scope` / `-metrics-days`, `test:gastro-lifecycle-notifications` |
| Admin Gastro | `test:admin-gastro-discount-profile-scope`, `test:admin-gastro-taxonomy-payload`, `test:admin-gastro-courtesy` |
| Gastro Portal / multi-local | `test:gastro-multi-local`, `test:gastro-owner-discount-scope`, `test:gastro-cross-profile-isolation`, `test:gastro-active-profile`, `test:gastro-profile-view-scope`, `test:gastro-content-*`, `test:gastro-empty-states`, `test:gastro-card-chips`, `test:gastro-location-share` |
| Scanner | `test:gastro-discount-scan` (**HTTP + PG**, ver §4), `test:scanner-manual-short-code`, `test:scanner-username-auth`, `test:gastro-scan-presentation`, `test:gastro-courtesy-scanner`, `test:activity-coupon-scan` (dispatch; DB: NO EJECUTADO, previo) |
| G5 / G6 reporting | `test:g5-agreement-allocation-snapshots`, `test:g6-discount-economic-traceability` / `-summary` / `-accounting` |
| G7.12 settlements | `test:benefit-settlement-operations` / `-admin-ui` / `-hardening` |
| G8 accounting | `test:gastro-courtesy-accounting` (PG A–H), `test:courtesy-credit-ledger` |
| ACTIVITY | `test:activity-coupon-domain` / `-ownership` / `-claim` / `-qr` / `-metrics` / `-scan` + secciones ACTIVITY de `test:g10-discount-agreements` / `-pricing` / `-payments-db` |
| Resto (fuera de G10, exit 0) | campañas, marketing, referidos, taxonomía, eventos, horarios, plantillas QR, Getnet webhook / reconciliación / fulfillment |

## 3. FAIL fuera de G10 (no bloquean el release)

| Suite | Causa | Clasificación |
|---|---|---|
| `test:door-scan` | Smoke HTTP de scanner de **tickets**: su fixture no crea `ScannerAccount` (scope V3.1) ⇒ 403 | Previo. G10 no toca scanner (`git diff 50d0c29..HEAD -- apps/api/src/scanner apps/scanner` vacío) |
| `test:legal-documents` | Smoke HTTP: exige API con dev auth y un ADMIN en `SMOKE_DEV_USER_ID` | Entorno |
| `test:me-legal-acceptance` | Smoke: exige `SMOKE_USER_EMAIL` / `SMOKE_USER_PASSWORD` | Entorno |
| `test:auth-resend-verification` | Un assert (`unverified → issue`) falla | Previo: archivo y módulo auth sin cambios desde V3.2 (`ff6f8e0`); G10 no toca auth |
| `test:getnet-auth` | Faltan `GETNET_CLIENT_ID` / `GETNET_CLIENT_SECRET` | Entorno (pagos fuera de alcance) |

## 4. Scanner contra PostgreSQL + HTTP

`test:gastro-discount-scan` figuraba como **NO EJECUTADO** en todos los cierres anteriores. Con la DB disponible fallaba por fixture desactualizado (no es regresión): `GastroDiscountClaim.shortCode` es obligatorio desde V3.3 Etapa 3 y el scanner exige `ScannerAccount` con scope del local desde V3.1. Este commit corrige **solo el fixture** (shortCode único por claim, `ScannerAccount` GASTRO del local, código del descuento APPROVED único por corrida para que sea re-ejecutable). Sin cambios de código de producto.

Corrida contra la API compilada de HEAD (`node dist/main.js`, puerto 3101, `DEV_AUTH_ENABLED=true`, DB local), dos veces seguidas:

| Caso | Resultado |
|---|---|
| Claim válido (vence hoy) | `VALID` |
| Segundo escaneo | `ALREADY_USED` |
| Token incorrecto / payload malformado | `INVALID` / `INVALID` |
| Padre `APPROVED` + claim activo | `VALID` |
| Dos cupones del mismo usuario el mismo día | `VALID` + `VALID` (sin límite diario desde `ffa333f`; el backend ya no emite `LIMIT_REACHED`, que solo queda como etiqueta en el schema y en la UI del scanner) |
| Descuento cancelado | `INACTIVE` |

`EXPIRED` y `NOT_VALID_TODAY` quedan cubiertos por las suites puras de vigencia y por el QA manual (`V3_3_G10_MANUAL_QA_CHECKLIST.md`). G10 no modificó ningún archivo del scanner.

## 5. Casos críticos repetidos

| Caso | Evidencia (todas PASS) |
|---|---|
| **Contratos:** A con contrato / B mismo local sin contrato ⇒ A approve PASS, B FAIL | `test:g10-discount-approval`: «A (own CURRENT contract) → approve PASS»; B bloqueado hasta tener contrato propio; el legacy del local nunca habilita |
| **Pricing:** A $5.000 / B $7.500, mismo local y período | `test:g10-discount-pricing` («validation B → $7.500 (agreement B)»), `test:g10-release-reporting-integrity-db` (contratos A/B independientes en el resumen) |
| **CASH:** due 50k, paid 30k, remaining 20k | `test:g10-discount-payments-db` S1; `test:g10-release-reporting-integrity-db` |
| **Cross-discount:** pagar A no afecta B | `test:g10-discount-payments-db` S5 / S6 |
| **BARTER:** 1 crédito, sin duplicado | `test:g10-discount-allocation-db` S8 / S9 (secuencial + concurrente: una allocation, un crédito) |
| **Missing agreement:** no bloquea otros descuentos; `close` bloquea | `test:g10-discount-pricing` (generate no bloquea, allocate C → `MISSING_AGREEMENTS`, close → `MISSING_AGREEMENTS`); `test:g10-discount-allocation-db` S10, `count`, `close` |
| **Courtesy:** financiada sin contrato ni settlement; no financiada con contrato propio y facturable | `test:g10-discount-approval`, `test:g10-discount-activation`, `test:g10-discount-allocation-db` S11, `test:g10-release-reporting-integrity-db` (CASH 0 / BARTER 0) |
| **Concurrencia:** 2 requests por los últimos 20k ⇒ 1 PASS + 1 sobrepago; 3 requests ⇒ 1 PASS | `test:g10-discount-payments-db` («concurrency: one PASS, one FAIL overpayment», «concurrency x3: exactly one PASS», sin doble cobro) |
| **ACTIVITY** sin `gastroDiscountId` obligatorio (agreements, settlements, allocations, transfers) | `test:g10-discount-agreements` / `-pricing` (secciones ACTIVITY), `test:g10-discount-payments-db` S13 |

## 6. Sub-escenarios NO EJECUTADO (previos, documentados desde G7.12 / G8)

Concurrencia de materialización de crédito y de funding, escenario seed de `benefit-settlement-operations`, escenario DB seed de `benefit-commercial-agreements`, DB de `activity-coupon-scan`. Ninguno es nuevo en G10 y ninguno se marca PASS.
