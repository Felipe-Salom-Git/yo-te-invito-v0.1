# V3.3 — G8 — Cortesías Gastro — Cierre completo

**Branch:** `feat/v1-s03-api-foundation`  
**HEAD inicial de G8.12:** `a8e007d`  
**Estado:** G8.0–G8.13 **COMPLETE** en código y docs. **Sin push. Sin deploy. Producción congelada.**  
**Migrations de esta ventana (G7.11–G8.13):** **CERO.** G9 **NO iniciado.**

Una cortesía **no es una entidad nueva**. G8 extiende la arquitectura que ya existía.

---

## 1. Slices

| Slice | Commit | Qué quedó |
|---|---|---|
| G8.0 Discovery | `5c8b500` | [`V3_3_G8_COURTESY_DISCOVERY.md`](./V3_3_G8_COURTESY_DISCOVERY.md). Extender lo existente. Sin `CourtesyCoupon`. D1–D5 aprobadas |
| G8.1 Hardening | `9c87348` | Local correcto, preview, vigencia, `publicEventId`, origen, badge. [`V3_3_G8_1_G8_2_COURTESY_HARDENING_CLOSING.md`](./V3_3_G8_1_G8_2_COURTESY_HARDENING_CLOSING.md) |
| G8.2 Lifecycle | `d2143f7` | Sin master QR, cancelada = terminal, inmutable, cancelar ⇒ claims |
| G8.3 Approval | `ead150f` | Owner → `PENDING_REVIEW` + claims retenidos; ADMIN + agreement CURRENT. [`V3_3_G8_3_G8_4_COURTESY_APPROVAL_DELIVERY_CLOSING.md`](./V3_3_G8_3_G8_4_COURTESY_APPROVAL_DELIVERY_CLOSING.md) |
| G8.4 Delivery | (mismo cierre) | Entrega post-aprobación, idempotente, reintento; el mail fallido no revierte la aprobación |
| G8.5 Scanner | `a8a3b78` | Cortesía identificada, beneficio real, aislamiento A/B. [`V3_3_G8_5_G8_8_COURTESY_COUPON_EXPERIENCE_CLOSING.md`](./V3_3_G8_5_G8_8_COURTESY_COUPON_EXPERIENCE_CLOSING.md) |
| G8.6 ShortCode | `5bf21d5` | 6 caracteres, alfabeto actual, retry `P2002`, legacy intacto |
| G8.7 Studio | `3a51c87` | Mismo Studio; nunca `0%`; ruta `descuentos` |
| G8.8 Emails | `bd77fce` | Owner pendiente / aprobada / rechazada; shortCode al destinatario; acuerdo CURRENT no persistido |
| G8.9 Portal | `ffbded3` | Listado por local, estados, métricas, retiro de pendiente. [`V3_3_G8_9_G8_10_COURTESY_PORTAL_ADMIN_CLOSING.md`](./V3_3_G8_9_G8_10_COURTESY_PORTAL_ADMIN_CLOSING.md) |
| G8.10 Admin | `2682cf6` | Cola, review, acuerdo, approve/reject/redelivery, sin `qrToken` |
| G8.11 Accounting | `a2b8786`, `13c2992`, `c591f0a` | Financiada = uso operativo, no facturable. [`V3_3_G8_11_COURTESY_ACCOUNTING_CLOSING.md`](./V3_3_G8_11_COURTESY_ACCOUNTING_CLOSING.md) |
| G8.12 Regression | (sin commit de código) | Suites existentes, exit 0. **Ningún bug BLOCKER/REGRESSION.** |
| G8.13 Cierre | este commit | Este documento, readiness, checklist QA, contextos |

---

## 2. Arquitectura final

```text
GastroDiscount
visibility = COURTESY_ONLY
        │
        ├── GastroCourtesyCampaign
        │
        └── GastroDiscountClaim   (type = COURTESY)
```

Se reutilizan, sin segundo producto:

```text
Scanner existente
Studio existente          (GastroDiscountTemplate + DiscountTemplateRenderer)
Commercial Agreements     (BenefitCommercialAgreement; snapshot solo en allocation)
Settlement engine         (partner + period; sin FK nueva a la campaña)
Courtesy Credit Ledger    (DEBIT_COURTESY financia; CREDIT_FROM_SETTLEMENT no nace de una cortesía financiada)
```

`CourtesyGrant` sigue siendo de tickets y no se mezcla. No hay `CourtesyCoupon`.

Nada de acuerdo, precio ni multiplicador se guarda en `GastroCourtesyCampaign` ni en `GastroDiscount`. El snapshot vive solo en `BenefitSettlementUsageAllocation`.

---

## 3. Lifecycle final

### Owner

```text
request
→ PENDING_REVIEW
→ claims retenidos (existen, no se pueden usar, no se entregan)
→ ADMIN aprueba o rechaza
→ si aprueba: ACTIVE + delivery
→ si rechaza: REJECTED + claims CANCELLED
```

El owner puede **retirar** su propia solicitud `PENDING_REVIEW` → `CANCELLED` + claims `CANCELLED`. No puede retirar una cortesía creada por ADMIN. No puede aprobarse solo. No hay reactivación. No hay master QR. No se edita después del envío.

### Admin

```text
create
→ agreement CURRENT obligatorio
→ ACTIVE + delivery inmediata
```

Aprobar una solicitud del owner también exige agreement CURRENT del **mismo** local. Rechazar cancela los claims y no entrega. El reenvío solo reintenta claims sin `emailSentAt`.

Un mail fallido **no** revierte la aprobación y **no** duplica el claim. El retry es solo del claim fallido.

### Legacy

Una cortesía que ya estaba `ACTIVE` antes de G8.3 sigue usable. No se la pasa a pendiente ni se le exige un acuerdo retroactivo.

Un descuento `PUBLIC` conserva su master QR, su edición y su mail de QR.

---

## 4. Accounting final

```text
FUNDED COURTESY
→ uso operativo
→ NOT billable
→ sin allocation
→ sin CASH
→ sin BARTER
→ sin crédito nuevo

NON-FUNDED COURTESY
→ billable
→ CASH o BARTER, como cualquier uso con claim
```

```text
DEBIT_COURTESY
→ financia la campaña (1 campaña → 1 débito)
→ no se crea al validar ni al cerrar el settlement

CREDIT_FROM_SETTLEMENT
→ solo usos BARTER facturables
→ nunca una cortesía financiada
```

La regla única es `resolveGastroValidationSettlementEligibility`. Financiada = existe `DEBIT_COURTESY` de esa campaña. El settlement sigue siendo **partner + period**.

G6 mantiene `EXACT` / `SETTLEMENT_LEVEL` / `PARTNER_LEVEL` / `NOT_ATTRIBUTABLE`. La cortesía financiada no entra como uso ni base facturable. Si una allocation legacy de cortesía financiada ya existe, la integridad avisa `FUNDED_COURTESY_ALLOCATED` y no reescribe la fila.

---

## 5. G8.12 — Regresión

Todas las suites de abajo terminaron con **exit 0**. No hubo suite silenciosa.

| Área | Suite | Resultado |
|---|---|---|
| Multi-local | `test:gastro-cross-profile-isolation`, `test:admin-gastro-discount-profile-scope`, `test:gastro-owner-discount-scope`, `test:gastro-multi-local`, portal + `courtesy-scope.assert.ts` | PASS |
| Lifecycle | `test:gastro-courtesy-hardening`, `test:gastro-courtesy-lifecycle` | PASS |
| Approval / agreement | `test:gastro-courtesy-approval`, `test:benefit-commercial-agreements`, `test:g5-agreement-allocation-snapshots` | PASS |
| Delivery / emails | `test:gastro-courtesy-delivery`, `test:gastro-courtesy-emails`, `test:gastro-lifecycle-notifications` | PASS |
| Scanner | `test:gastro-courtesy-scanner`, `test:scanner-manual-short-code`, `test:scanner-username-auth` | PASS |
| ShortCode | `test:gastro-short-code-retry` | PASS |
| Studio | `test:gastro-courtesy-studio`, `test:discount-visual-template`, `test:gastro-discount-visual-persist`, `test:discount-visual-render` | PASS |
| Portal | `test:gastro-courtesy-portal` (incluye `courtesy-portal.assert.ts`) + `courtesy-scope.assert.ts` | PASS |
| Admin | `test:admin-gastro-courtesy` | PASS |
| Accounting | `test:gastro-courtesy-accounting`, `test:gastro-courtesy-credit-funding`, `test:courtesy-credit-ledger` | PASS |
| Economic reporting | `test:g6-discount-economic-accounting`, `-summary`, `-traceability` | PASS |
| G7.12 settlement | `test:benefit-settlement-operations`, `-transfers`, `-admin-ui`, `-domain`, `-reporting`, `-hardening` | PASS |

**Fixes de regresión:** ninguno. No apareció un BLOCKER ni una REGRESSION. No se tocó código de producto.

### Qué cubre PostgreSQL real y qué no

PostgreSQL local: Docker `yo-te-invito-postgres`, `localhost:5433`. `prisma migrate status`: **111 migrations, schema up to date.**

| Parte | Cobertura real |
|---|---|
| Funding, elegibilidad, guard de allocation, CASH/BARTER/mixto, cierre, reporting G6 de cortesía, snapshot de acuerdo, cross-profile de settlement | **PASS en DB** — escenarios A–H de `test:gastro-courtesy-accounting` (servicios Nest, tenant aislado) |
| Tabla del ledger, columna `sourceCourtesyCampaignId`, tabla de transferencias, índices únicos de settlement | **PASS** — existencia de schema. No es un flujo de negocio |
| Lifecycle owner/admin, emails, scanner, shortCode, Studio, portal, admin UI, aislamiento HTTP | **Solo Prisma falso / unit test.** No hay E2E contra filas reales |
| `test:benefit-settlement-operations` | Unit PASS. Conecta a la DB y se detiene: no hay script de escenario seed → **NO EJECUTADO** |
| `test:benefit-commercial-agreements` | Unit PASS. Escritura en DB **NO EJECUTADA** — el script reportó que faltan partners seed. El snapshot real de una cortesía no financiada está en el caso G del accounting |
| Concurrencia de funding, de materialización de crédito y de overpayment | **NO EJECUTADO** — los scripts lo dicen y no existe otro escenario |

El script de funding imprime `Concurrent funding: NO EJECUTADO — PostgreSQL no disponible` **después** de comprobar la columna, aunque Postgres sí estaba arriba. Es un texto fijo del script, no una caída de la base. No se cambió: no es un bug de producto.

**DB integration de G8.12: PARTIAL.** No se fabrica un PASS de lifecycle, scanner o portal contra la base.

---

## 6. Builds (G8.12)

| Build | Resultado |
|---|---|
| `@yo-te-invito/shared` | PASS |
| `api` | PASS |
| `web` | PASS |
| `scanner` | PASS |
| Web `tsc --noEmit` suelto | **PREEXISTING** — un solo error: `lib/categories/subcategoryRailThreshold.test.ts` no encuentra `vitest`. Fuera de G8 |

---

## 7. Deferred (no son blockers)

1. Reversión de `DEBIT_COURTESY` al cancelar una cortesía sin usos. Hoy el débito queda. Hace falta semántica nueva de ledger. Propuesta en el discovery de G8.11 §6.
2. Cancelar solicitudes pendientes de **descuentos normales** (el retiro de G8.8 es solo cortesía).
3. La restricción "Studio solo en pendiente/activa" está en la UI. El backend no la impone.
4. `apps/web/app/(portal)/admin/gastronomicos/[profileId]/descuentos/[discountId]/page.tsx` sigue en **607** líneas. Deuda previa a G8. No se partió en este cierre.
5. Auditoría de allocations legacy de cortesías financiadas **en producción**. En local el warning `FUNDED_COURTESY_ALLOCATED` funciona. Los datos de producción no se auditaron.
6. QA manual post-deploy. Checklist: [`V3_3_G8_MANUAL_QA_CHECKLIST.md`](./V3_3_G8_MANUAL_QA_CHECKLIST.md).
7. Rails por subcategoría secundaria: pendiente por falta de datos (QA 4 de G7.10). No es un bug de cortesías.
8. Upload privado de comprobantes de liquidación (URLs firmadas). Diferido desde G7.12.
9. Escenario seed de `test:benefit-settlement-operations` y escritura DB de agreements (faltan partners seed).
10. Concurrencia real de funding, crédito y overpayment. Scanner HTTP contra API+DB. Siguen sin script.
11. Consumo de cortesía en Activity. Sigue diferido (sin funding Activity).

---

## 8. Plan de deploy acumulado — NO EJECUTADO

Ventana local pendiente de publicar, en este orden de commits ya existentes:

```text
G7.11  b82c4af … ecb7974
G7.12  3570ccc … 87d912f   (+ cierre 6032838)
G8.0–G8.13  5c8b500 … este commit de docs
```

`git diff origin/feat/v1-s03-api-foundation...HEAD -- apps/api/prisma/migrations` está **vacío**. G7.11–G8.13 no agregan migrations. En el deploy de G7.10 la producción ya reportó 111 migrations y ninguna pendiente.

Comandos **solo** los del runbook `docs/deploy/DONWEB_PRODUCTION_RUNBOOK.md`. No se ejecutó ninguno contra el VPS.

| Paso | Qué dice el runbook |
|---|---|
| Pre-deploy | §21.1 `curl -sS https://api.yoteinvito.com/health`. §24 registra los hosts vivos como `yoteinvito.club` y, en el VPS, `curl http://localhost:3001/health` más `curl -I` de web y scanner. §19: `systemctl is-active yti-api` |
| Backup | §22.1 y §9.5, antes de tocar una base con datos: `sudo -u postgres pg_dump -Fc yo_te_invito > /var/backups/pre_deploy_$(date +%F_%H%M).dump` |
| Push | **No está en el runbook de app.** Lo hace el operador desde la máquina local. **No ejecutado** |
| Pull | El runbook de app **no define** `git pull`. La actualización documentada es `git checkout` de la rama o del commit en `/var/www/yo-te-invito` (§12.1, §22.2). El árbol vivo registrado está en `/opt/yoteinvito` (§24.2). `git pull` aparece solo en `GCS_BACKUPS_RUNBOOK.md`, para el script de backups, no como paso de deploy de la app |
| Install | §12.1 `pnpm install --frozen-lockfile` |
| Prisma generate | §15, desde `apps/api`: `npx prisma generate` |
| Build | §12.3 `pnpm build` (shared, api, web, scanner) |
| Migrate deploy | §15 `npx prisma migrate deploy`. Esperable: ninguna migration pendiente. **Prohibido:** `pnpm db:migrate`, `prisma migrate dev`, `prisma db push`, `db:reset-dangerous` |
| Restart | §22.2 `sudo systemctl restart yti-api yti-web yti-scanner` |
| Smoke | §21. Health, home, scanner, login, `/admin`, checkout **DEMO**. No correr `smoke:user-portal`, `smoke:cleanup` ni `SMOKE_ALLOW_DESTRUCTIVE=1` |
| QA | El checklist de este cierre, más los de G7.11 y G7.12, después del smoke |

Readiness: [`V3_3_G8_RELEASE_READINESS.md`](./V3_3_G8_RELEASE_READINESS.md).

---

## 9. Working tree

Al cierre, fuera del commit de docs, siguen sin incluirse a propósito:

- `.cursorignore` (untracked)
- `packages/shared/src/benefit-settlement-operations.assert.ts` (solo CRLF)

**Push:** NO · **Deploy:** NO · **Producción:** sin cambios · **G9:** NOT STARTED
