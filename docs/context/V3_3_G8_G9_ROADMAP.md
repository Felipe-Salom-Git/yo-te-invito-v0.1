# V3.3 — Roadmap G8 / G9

**Estado:** **G8 COMPLETE** (local, sin push/deploy, sin migrations nuevas). Cierre: [`V3_3_G8_COURTESIES_CLOSING.md`](../audits/V3_3_G8_COURTESIES_CLOSING.md) · readiness [`V3_3_G8_RELEASE_READINESS.md`](../audits/V3_3_G8_RELEASE_READINESS.md) · QA [`V3_3_G8_MANUAL_QA_CHECKLIST.md`](../audits/V3_3_G8_MANUAL_QA_CHECKLIST.md). Slices: [`V3_3_G8_COURTESY_DISCOVERY.md`](../audits/V3_3_G8_COURTESY_DISCOVERY.md) · [`V3_3_G8_1_G8_2_COURTESY_HARDENING_CLOSING.md`](../audits/V3_3_G8_1_G8_2_COURTESY_HARDENING_CLOSING.md) · [`V3_3_G8_3_G8_4_COURTESY_APPROVAL_DELIVERY_CLOSING.md`](../audits/V3_3_G8_3_G8_4_COURTESY_APPROVAL_DELIVERY_CLOSING.md) · [`V3_3_G8_5_G8_8_COURTESY_COUPON_EXPERIENCE_CLOSING.md`](../audits/V3_3_G8_5_G8_8_COURTESY_COUPON_EXPERIENCE_CLOSING.md) · [`V3_3_G8_9_G8_10_COURTESY_PORTAL_ADMIN_CLOSING.md`](../audits/V3_3_G8_9_G8_10_COURTESY_PORTAL_ADMIN_CLOSING.md) · [`V3_3_G8_11_COURTESY_ACCOUNTING_CLOSING.md`](../audits/V3_3_G8_11_COURTESY_ACCOUNTING_CLOSING.md). **G9 NOT STARTED** — solo con confirmación explícita del operador.

```text
G8.0: DONE (docs only)
G8.1: DONE (9c87348)
G8.2: DONE (d2143f7)
G8.3: DONE (approval + agreement gate)
G8.4: DONE (delivery post-approval)
G8.5: DONE (a8a3b78) scanner
G8.6: DONE (5bf21d5) shortCode retry
G8.7: DONE (3a51c87) Studio
G8.8: DONE (bd77fce) notificaciones/emails/metricas/cancel
G8.9: DONE (ffbded3) portal Gastro de cortesías
G8.10: DONE (2682cf6) admin de cortesías
G8.11: DONE (a2b8786, 13c2992, c591f0a) accounting D1 — funded = operativo NO facturable; reversa DEBIT_COURTESY DEFERRED
G8.12: DONE (regresión, sin commit de código) — suites exit 0; DB integration PARTIAL (accounting A–H en Postgres; lifecycle/scanner/portal solo Prisma falso)
G8.13: DONE (docs) — cierre global, readiness, checklist QA
G8:    COMPLETE
G9:    NOT STARTED
```

---

## Orden general

```text
✅ G1–G7 — Expansión gastro + QA/hardening
✅ G7.10 — QA fixes + onboarding (desplegado, R0)
✅ G7.11 / G7.12 — Post-QA + Operación de Liquidaciones (local, sin push/deploy)
✅ G8.0 — Discovery cortesías (docs)
✅ G8.1–G8.13 — Cortesías: arquitectura existente extendida. **G8 COMPLETE** (local)
⏭ G9 — UX complementaria gastro (no contaminar cortesías; solo con confirmación)
```

---

## G8 — Cortesías Gastro

### Principio

Una cortesía **no es una entidad nueva**: es `GastroDiscount(visibility = COURTESY_ONLY)` + `GastroCourtesyCampaign` + `GastroDiscountClaim(type = COURTESY)`. G8 **extiende** eso. **No** se crea `CourtesyCoupon`, ni segundo Studio, ni segundo scanner. `CourtesyGrant` es de tickets y no se mezcla.

| Dominio | Rol |
|---|---|
| **Courtesy Campaign** | Beneficio que un local regala a usuarios (descuento oculto + claims) |
| **CourtesyCreditLedgerEntry** | Saldo BARTER del partner; solo puede **financiar** una campaña (`sourceCourtesyCampaignId`) |

### Decisiones del operador D1–D5 (APROBADAS 2026-10-23)

| ID | Decisión aprobada | Se implementa en |
|---|---|---|
| D1 | Cortesía **financiada con Courtesy Credit** (`DEBIT_COURTESY` + `sourceCourtesyCampaignId`) ⇒ **NO elegible** para settlement (ni CASH, ni BARTER, ni genera crédito). Cortesía **no financiada** ⇒ puede ser elegible según acuerdo y allocations normales. **Implementado en G8.11** (funded = uso operativo, NOT billable usage) | G8.11 ✅ |
| D2 | GASTRO_OWNER **no** gasta Courtesy Credit; solo ADMIN financia. No ampliar permisos del ledger | vigente (test) |
| D3 | Cortesía de owner: `PENDING_REVIEW` → claims retenidos/no utilizables → ADMIN review → agreement CURRENT → approve → activar/entregar. ADMIN puede crear `ACTIVE`. Campañas legacy `ACTIVE` **no** se invalidan | G8.3 |
| D4 | ShortCode: 6 caracteres, alfabeto actual, unicidad global; luego retry `P2002` (tope razonable); compatibilidad legacy | G8.6 |
| D5 | Reutilizar `GastroDiscountTemplate` + `DiscountTemplateRenderer`; `courtesyLabel` (o `benefitLabel` si es claramente mejor, sin renombrar campos canónicos); en `COURTESY_ONLY` nunca renderizar `0%` | G8.7 |

### Slices (reconstruidos sobre el repo)

| ID | Tema | Schema |
|---|---|---|
| ✅ **G8.1** | Hardening + profile scope: selector de local en `/gastro/descuentos/cortesia`, fix `coerce.boolean` del preview, `validFrom<validTo`, guard `publicEventId`, `createdByOrigin/UserId`, exponer `visibility` + badge/filtro — `9c87348` | NINGUNO |
| ✅ **G8.2** | Aislamiento de lifecycle: nunca `qrToken` en `COURTESY_ONLY` (reactivación + scanner master), cancelada = terminal, cortesía inmutable tras el envío, cancelar campaña ⇒ claims `CANCELLED`, sin aviso "vencido"/contadores — `d2143f7` | NINGUNO |
| ✅ **G8.3** | Approval + agreement (Opción A): owner → `PENDING_REVIEW` + claims retenidos; reutiliza approve/reject + agreement gate; admin-origin auto-ACTIVE; sin retroactividad | NINGUNO (esperado) |
| ✅ **G8.4** | Claims/entrega: entrega post-aprobación idempotente, reenvío, resumen robusto ante fallos parciales, `/me` oculta claims de padre inactivo | NINGUNO |
| ✅ **G8.5** (`a8a3b78`) | Scanner: tests de aislamiento A/B (QR + shortCode), indicar "Cortesía" en resultado y reemplazar el `valueLabel` `0%` por el beneficio real (master token ya cerrado en G8.2) | NINGUNO |
| ✅ **G8.6** (`5bf21d5`) | ShortCode: retry P2002, largo 6 (D4), visible en card/email/`/me`, formato legacy | NINGUNO |
| ✅ **G8.7** (`3a51c87`) | Studio unificado descuento+cortesía: `courtesyLabel` (D5), render context, fin del `0%`, preset, acceso desde el flujo, fix typo ruta admin `discuentos` | NINGUNO |
| ✅ **G8.8** (`bd77fce`) | Emails/notificaciones: aprobada/rechazada (reutiliza `GASTRO_LIFECYCLE`), shortCode en email, `audit-labels`, `sendQrEmail` admin | NINGUNO |
| ✅ **G8.9** (`ffbded3`) | Portal Gastro: listado/detalle por local, estados humanos, acciones por lifecycle/origen, solicitud "pendiente de aprobación", audiencia congelada, métricas, Studio con gate, empty states, cross-profile | NINGUNO |
| ✅ **G8.10** (`2682cf6`) | Admin: cola con badge + contexto de cortesía, review (requester/audiencia/retenidos) + panel de acuerdo G5, approve/reject/cancel/redeliver por lifecycle, filtro + métricas en listado, sin `qrToken`, `sendQrEmail` bloqueado, audit labels, scoping summary/status | NINGUNO |
| ✅ **G8.11** (`a2b8786`, `13c2992`, `c591f0a`) | Accounting D1: regla canónica por funding (validation → discount → campaign → `DEBIT_COURTESY`), exclusión backend + guard allocate/ledger, G6 operativo vs facturable, WARNING legacy; reversa `DEBIT_COURTESY` **DEFERRED**; DB integration **PASS** (local); datos de producción no auditados | NINGUNO |
| ✅ **G8.12** | Regresión de extremo a extremo. Sin bug de código. DB de lifecycle/scanner/portal sigue en Prisma falso; accounting A–H en PostgreSQL real | NINGUNO |
| ✅ **G8.13** | Cierre, readiness, checklist QA manual, contextos. G8 COMPLETE | NINGUNO |

**Dependencias:** G8.3 usa D2/D3; G8.6 usa D4; G8.7 usa D5; G8.11 usa D1. Si algún slice requiere migration → **detenerse antes de crearla**.

---

## G9 — UX complementaria gastro

Mejoras pequeñas que **no** deben mezclarse con Cortesías.

| ID | Tema |
|---|---|
| G9.1 | Share local WhatsApp (URL pública canónica) |
| G9.2 | Share general (Web Share API + fallback) |
| G9.3 | Polish mini map / location (post G7.10.7) |
| G9.4 | Scanner UX listado (username / local / status) |
| G9.5 | Cards taxonomy UX (chips overflow) |
| G9.6 | QA / polish final UX gastro |

---

## Reglas de arranque

1. G8.1+ solo con confirmación explícita; un commit por slice; sin push/deploy hasta ventana acordada.
2. No duplicar dominios; no romper tenant ni `gastroProfile` isolation; no alterar semántica G5/G6 sin necesidad demostrada y autorización.
3. G9 puede correr en paralelo a G8 solo si no toca dominio Cortesía.
