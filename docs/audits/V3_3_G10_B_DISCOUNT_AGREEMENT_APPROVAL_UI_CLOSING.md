# V3.3 G10.B — Approval + UI de contrato por descuento (cierre)

**Fecha:** 2026-11-02  
**Rama:** `feat/v1-s03-api-foundation` · HEAD inicial `bc2429d` (cierre G10.A)  
**Alcance:** slices B1–B5 sobre G10.A, con D-G10-3 / D-G10-4 / D-G10-5 / D-G10-10 aplicadas.  
**Producción:** migration **NO** ejecutada · backfill **NO** ejecutado · **sin push, sin deploy**.

> **G10.A + G10.B form an atomic release unit.** G10.A sola deja la UI de contratos en 400 y los gates de approval sobre el contrato legacy del local; G10.B cierra ambos huecos. Se despliegan juntas, con el orden de §8.

---

## 1. Commits

| Slice | Commit | Mensaje |
|---|---|---|
| B1 | `af110bb` | `feat(v3.3): gate discount approval on the discount's own agreement` |
| B2 | `4475500` | `feat(v3.3): require the discount's own agreement on every path to ACTIVE` |
| B3 | `59c3977` | `feat(v3.3): manage the commercial contract from the discount detail` |
| B4 | `ec7190a` | `feat(v3.3): list and create agreements per discount in admin settlements` |
| B5 | este commit | `feat(v3.3): name the discount's own contract in approval emails` (+ docs) |

Sin migrations nuevas. La migration de G10.A (`20261102120000_benefit_agreement_discount_scope`) **no se tocó**.

---

## 2. B1 — Approval gates por descuento — PASS

- Nuevo `GastroDiscountAgreementGateService` (`benefit-agreements/`): `resolve(tenantId, discountId)` → `{ billable, agreement }`. Cortesía financiada (débito `DEBIT_COURTESY` de su campaña) ⇒ `billable = false` y **no** busca contrato (D1 / D-G10-3). Si no, `resolveApplicable({ vertical: 'GASTRO', gastroDiscountId })` = solo filas DISCOUNT de **ese** descuento (nunca `gastroDiscountId IS NULL`).
- `assertActivatable` ⇒ `400 BENEFIT_AGREEMENT_NOT_FOUND` con `"Este descuento no tiene un contrato comercial vigente."` (cortesía: `"Esta cortesía no tiene un contrato comercial vigente. …"`).
- `AdminGastroService.approve` y `approveCourtesy` usan el gate; el resolver por `gastroProfileId` ya no participa en ningún gate.
- Audit `GASTRO_DISCOUNT_APPROVED`: `metadata = { discountId, agreementId, agreementScope: 'DISCOUNT', billable }` (`buildDiscountAgreementGateMetadata`, shared). No se persiste vínculo en `GastroDiscount`.
- El email de aprobación recibe el contrato **del descuento**.

## 3. B2 — Caminos a ACTIVE — PASS

| Camino | Antes | Ahora |
|---|---|---|
| `approve` / `approveCourtesy` | CURRENT del local | CURRENT del descuento (B1) |
| `createDiscountOnBehalf` | sin gate | Body `agreement` obligatorio (`adminGastroDiscountCreateSchema`). Descuento + contrato + ACTIVE en **una** `$transaction`; contrato debe estar CURRENT hoy (`BENEFIT_AGREEMENT_INVALID_EFFECTIVE_DATE` si no) |
| Cortesía ADMIN financiada | CURRENT del local | **sin contrato** (D-G10-3). Si trae términos ⇒ 400 (no facturable) |
| Cortesía ADMIN no financiada | CURRENT del local | Términos obligatorios (`agreement` en `gastroCourtesySendBodySchema`), creados en la **misma** tx Serializable que descuento + campaña + claims (D-G10-4). Owner con términos ⇒ 403 |
| `updateDiscountStatus` → ACTIVE (owner y ADMIN) | sin gate | Si el estado cambia, exige CURRENT del descuento; financiada sin gate (D-G10-5) |
| `sendQrEmail` (`APPROVED → ACTIVE`) | sin gate | Exige CURRENT del descuento si el estado cambia; reenvío sobre ACTIVE sin cambios |
| `PATCH /gastro/discounts/:id` legacy (`GastroService.updateDiscount`, sombreado por la ruta portal) | podía escribir `status: ACTIVE` | Rechaza activar (defensa en profundidad) |
| `approvePendingEdit`, unarchive, scanner | — | Sin cambio (no activan) |

- `GastroDiscountAgreementGateService.createInitialInTx` inserta la fila DISCOUNT dentro de la tx del llamador (no hay solapamiento posible: el descuento no existía); `recordInitial` audita `BENEFIT_AGREEMENT_CREATED` (`metadata.createdWithDiscount`) después del commit.
- Fallo forzado del contrato (test Postgres) ⇒ **ni descuento ni contrato** quedan.
- Web: `/admin/gastronomicos/:profileId/descuentos/nuevo` pide los términos (sección "Contrato comercial del descuento") y los envía junto al descuento.

## 4. B3 — UI de contrato en el detalle del descuento — PASS

`/admin/gastronomicos/:profileId/descuentos/:discountId` → sección **Contrato comercial** (`AdminGastroDiscountAgreementPanel` + `…Actions` + `…History`), usando `GET /admin/benefit-agreements/discount-history`:

- Estado: Vigente / Próximo / Vencido / Sin contrato (financiada: "No requiere contrato").
- Valor por validación, Moneda, Multiplicador de canje, Vigencia, Origen (cargado por administración / copiado del contrato del local por la migración).
- **Crear contrato** (si no hay fila abierta): Valor, Moneda (ARS), Multiplicador, Desde, Hasta opcional, Notas.
- **Cambiar contrato** (fila DISCOUNT abierta): usa `replace` (cierra el día anterior + abre nueva). Los términos de una fila existente nunca se editan.
- **Cerrar contrato**: `close` con fecha fin; el historial se conserva.
- Legacy: filas `PROFILE_LEGACY` que valuaron usos del descuento se muestran como "Contrato del local (legacy) · solo lectura", sin acciones.
- Alerta visible si el descuento está ACTIVE/APPROVED, es facturable y no tiene CURRENT: "⚠ Sin contrato comercial vigente — Las validaciones de este descuento no pueden liquidarse hasta cargar un contrato."
- El botón "Aprobar" se habilita con el contrato **del descuento** (o financiada); el bloqueo enlaza a la sección.
- API (extensiones aditivas): `discount-history` agrega `billable` + `discountStatus`; `create` acepta `validTo` opcional (overlap lo considera; sin `validTo` = comportamiento previo, ACTIVITY incluido); el servicio rechaza un GASTRO sin `gastroDiscountId` aunque se saltee Zod (antes `findFirst({ id: undefined })` podía tomar cualquier descuento del tenant — bug latente de G10.A corregido).

## 5. B4 — `/admin/liquidaciones/acuerdos` — PASS

- Listado con columnas Local/operador · Descuento · Estado del descuento · Valor · Canje · Vigencia · Alcance · Acciones (`BenefitAgreementsTable`). DTO agrega `discountStatus`.
- Filtros server-side: Vertical, Local (u operador), Descuento (del local elegido), Vigencia CURRENT/PAST/FUTURE, Alcance DISCOUNT/PROFILE_LEGACY/OPERATOR. Links viejos con `?partnerId=` siguen funcionando.
- Filas legacy: badge **Legacy** + "Solo lectura" (sin cerrar/reemplazar). Filas DISCOUNT: "Gestionar en el descuento" (flujo oficial). ACTIVITY: acciones previas sin cambios.
- `/admin/liquidaciones/acuerdos/nuevo`: GASTRO exige **Local → Descuento → términos** (botón deshabilitado sin descuento; nunca envía un contrato por local). ACTIVITY: operador + términos, como antes.
- Panel G5 legacy (`AdminGastroDiscountCommercialContextPanel`, "Crear acuerdo del local" / "Cambiar tarifa del local") **eliminado**. En "Generar liquidación" se reemplaza por un resumen read-only de contratos vigentes por descuento (o el contrato del descuento si se inició desde uno). Sin botones que den 400.

## 6. B5 — Emails — PASS

- Líneas del contrato: "Valor por validación", "Moneda", "Multiplicador de canje", "Vigencia del contrato", siempre del contrato del descuento/cortesía aprobado.
- Cuerpo: "…condiciones del contrato comercial de este descuento" / "…de esta cortesía". Nunca "contrato del local".
- Cortesía financiada: línea "Facturación: Cortesía financiada con canje: no facturable" y **sin** contrato (`fundedCourtesy` en `notifyDiscountApproved`).

## 7. Tests

| Suite | Resultado |
|---|---|
| `test:g10-discount-approval` (nuevo, Postgres) | PASS — A con contrato / B sin contrato (mismo local), legacy del local nunca habilita, cross-discount y cross-profile (`PARTNER_INVALID`), metadata de audit, cortesía no financiada con contrato propio, financiada sin lookup; API B3 (create con `validTo`, replace/close del mismo descuento, historial, legacy read-only, create por local rechazado); listado B4 |
| `test:g10-discount-activation` (nuevo, Postgres) | PASS — on-behalf atómico + **fallo forzado sin residuos**, contrato no CURRENT rechazado, cortesía ADMIN no financiada (contrato propio) / financiada (sin contrato), reactivación bloqueada sin CURRENT (también owner, aun con legacy del local), financiada sin gate, `sendQrEmail` APPROVED sin CURRENT bloqueado |
| `test:g10-discount-agreement-ui` (nuevo, puro web) | PASS — estados, alerta, botones (crear/cambiar/cerrar), legacy read-only, ruta nuevo GASTRO exige descuento / ACTIVITY por operador, cache keys por descuento |
| `test:benefit-commercial-agreements` | PASS (escenario DB seed: NO EJECUTADO, preexistente) |
| `test:benefit-agreement-scope`, `test:g10-discount-agreements`, `test:g10-agreement-backfill`, `test:g10-discount-pricing` | PASS |
| `test:gastro-courtesy-approval` / `-hardening` / `-lifecycle` / `-emails` / `-delivery` / `-scanner` / `-portal` / `-studio`, `test:admin-gastro-courtesy`, `test:gastro-short-code-retry`, `test:gastro-lifecycle-notifications` | PASS (fakes adaptados: gate real + resolver por descuento; cortesía ADMIN no financiada con términos) |
| `test:gastro-courtesy-accounting` (Postgres A–H) | PASS |
| `test:benefit-settlement-operations` / `-domain` / `-transfers` / `-admin-ui` / `-reporting` / `-hardening` | PASS (escenarios seed preexistentes NO EJECUTADO) |
| `test:g5-agreement-allocation-snapshots`, `test:g6-discount-economic-*`, `test:courtesy-credit-ledger`, `test:gastro-courtesy-credit-funding` | PASS |
| `test:gastro-multi-local`, `test:admin-gastro-discount-profile-scope`, `test:gastro-discount-origin` / `-pending-edit` / `-edit-moderation` / `-archive` | PASS |
| ACTIVITY: `test:activity-coupon-domain` / `-ownership` / `-scan` + secciones ACTIVITY de `test:g10-discount-agreements` / `-pricing` | PASS (sin cambios de comportamiento) |

**Nota de fixture:** en `courtesy-fake-db` una clave de `agreements` puede ser un id de descuento o de local ("cada descuento de ese local tiene su propio contrato"). El aislamiento real dentro del mismo local se prueba solo contra PostgreSQL (`test:g10-discount-approval`).

**UI:** verificada por build de Next + asserts puros. **QA visual manual NO ejecutado** (sin dev server / sesión admin en esta corrida) → checklist §9.

## 8. Builds y deploy

`shared` PASS · `api` PASS · `web` PASS · `scanner` PASS. Web `tsc` suelto: solo los errores `vitest` preexistentes.

Orden de deploy (cuando el operador lo indique; **G10.A + G10.B juntas**), igual que G10.A §11:

```text
1. prisma migrate deploy                         (solo la migration aditiva de G10.A)
2. restart yti-api / yti-web con código G10.A+B
3. benefit-agreements:backfill-discount-scope    (dry-run) → comparar con A0
4. benefit-agreements:backfill-discount-scope -- --confirm
5. dry-run otra vez → copies to insert = 0; GET /admin/benefit-reporting/integrity → agreementScopeIssues = []
```

**Impacto operativo post-deploy:** los 5 descuentos ACTIVE/APPROVED de los 6 locales sin contrato legacy (A0) **siguen ACTIVE** (no se desactiva nada), pero muestran la alerta "Sin contrato comercial vigente" y sus usos quedan `MISSING_AGREEMENT` hasta que ADMIN cargue el contrato desde el detalle del descuento. Reactivar un descuento cancelado (owner o ADMIN) también exige su contrato.

## 9. QA manual pendiente (post-deploy)

- [ ] Detalle de descuento sin contrato: alerta visible, "Aprobar" bloqueado con enlace a "Contrato comercial".
- [ ] Crear contrato (con y sin "Hasta") → estado Vigente; Cambiar contrato → historial con 2 filas; Cerrar → Vencido, historial intacto.
- [ ] Descuento migrado por backfill: origen "Copiado del contrato del local (migración)"; filas legacy "solo lectura".
- [ ] Alta on-behalf con términos → nace ACTIVE con su contrato; términos futuros → error claro.
- [ ] `/admin/liquidaciones/acuerdos`: filtros Local → Descuento, Alcance Legacy con badge, sin acciones en legacy; "Nuevo contrato" GASTRO no se puede enviar sin descuento; ACTIVITY igual que antes.
- [ ] "Generar liquidación" desde un descuento: muestra el contrato de ese descuento (read-only).
- [ ] Email de aprobación: "contrato comercial de este descuento" + líneas; cortesía financiada: "no facturable".

## 10. Fuera de alcance (siguiente)

- G10.C resumen económico por descuento (el panel G6 todavía menciona "agreement del local" en su texto de snapshots; se reemplaza en C4).
- G10.D cobro CASH exacto por descuento (`BenefitSettlementTransfer.gastroDiscountId` sigue sin uso).
- Cortesía ADMIN **no financiada** no tiene pantalla propia (solo API `POST /gastro/discounts/courtesy/send` con rol ADMIN + `agreement`); la pantalla ADMIN existente es la de cortesía financiada (sin cambios).
- `GET /admin/benefit-agreements/partner-history` se mantiene (GASTRO = solo legacy; ACTIVITY sin cambios); el hook web quedó sin uso.

## 11. Estado

```text
Migration changed:              NO
New migrations:                 NO
Production migration executed:  NO
Production backfill executed:   NO
Push:                           NO
Deploy:                         NO
G10.A + G10.B ready as one release: YES (pendiente QA manual post-deploy)
Ready for G10.C:                YES
```
