# V3.3 — Roadmap G8 / G9

**Estado:** G8.0 (discovery) **COMPLETADO** — [`V3_3_G8_COURTESY_DISCOVERY.md`](../audits/V3_3_G8_COURTESY_DISCOVERY.md). G8.1+ **bloqueado** hasta confirmación explícita del operador.

```text
G8.0: DONE (docs only)
G8.1+: NOT STARTED
G9:    NOT STARTED
```

---

## Orden general

```text
✅ G1–G7 — Expansión gastro + QA/hardening
✅ G7.10 — QA fixes + onboarding (desplegado, R0)
✅ G7.11 / G7.12 — Post-QA + Operación de Liquidaciones (local, sin push/deploy)
✅ G8.0 — Discovery cortesías (docs)
⏭ G8 — Cortesías: EXTENDER la arquitectura existente
⏭ G9 — UX complementaria gastro (no contaminar G8)
```

---

## G8 — Cortesías Gastro

### Principio

Una cortesía **no es una entidad nueva**: es `GastroDiscount(visibility = COURTESY_ONLY)` + `GastroCourtesyCampaign` + `GastroDiscountClaim(type = COURTESY)`. G8 **extiende** eso. **No** se crea `CourtesyCoupon`, ni segundo Studio, ni segundo scanner. `CourtesyGrant` es de tickets y no se mezcla.

| Dominio | Rol |
|---|---|
| **Courtesy Campaign** | Beneficio que un local regala a usuarios (descuento oculto + claims) |
| **CourtesyCreditLedgerEntry** | Saldo BARTER del partner; solo puede **financiar** una campaña (`sourceCourtesyCampaignId`) |

### Decisiones pendientes del operador (ver discovery §10)

| ID | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| D1 | ¿Canje de cortesía facturable? A) sí (hoy) · B) nunca · C) solo no financiadas | C como mínimo | G8.11 |
| D2 | ¿Owner puede financiar con su crédito? | Admin-only en G8 | G8.3 / G8.11 |
| D3 | ¿Cortesía de owner requiere aprobación + agreement? | Sí; admin-origin auto-ACTIVE | G8.3 |
| D4 | ShortCode: ¿mantener 6 o acortar? | Mantener 6 + retry P2002 + mostrar | G8.6 |
| D5 | Studio: ¿campo `courtesyLabel` nuevo o mapear `discountLabel`? | Campo nuevo + render context | G8.7 |

### Slices (reconstruidos sobre el repo)

| ID | Tema | Schema |
|---|---|---|
| **G8.1** | Hardening + profile scope: selector de local en `/gastro/descuentos/cortesia`, fix `coerce.boolean` del preview, `validFrom<validTo`, guard `publicEventId`, `createdByOrigin/UserId`, exponer `visibility` + badge/filtro | NINGUNO |
| **G8.2** | Aislamiento de lifecycle: nunca `qrToken` en `COURTESY_ONLY` (reactivación + scanner master), bloquear `type/value` y sincronizar campaña al editar, excluir de aviso "vencido"/contadores, cancelar campaña ⇒ claims `CANCELLED` | NINGUNO |
| **G8.3** | Approval + agreement (Opción A): owner → `PENDING_REVIEW` + claims retenidos; reutiliza approve/reject + agreement gate; admin-origin auto-ACTIVE; sin retroactividad | NINGUNO (esperado) |
| **G8.4** | Claims/entrega: entrega post-aprobación idempotente, reenvío, resumen robusto ante fallos parciales, `/me` oculta claims de padre inactivo | NINGUNO |
| **G8.5** | Scanner: tests de aislamiento A/B (QR + shortCode), master token rechazado, indicar "Cortesía" en resultado | NINGUNO |
| **G8.6** | ShortCode: retry P2002, largo 6 (D4), visible en card/email/`/me`, formato legacy | NINGUNO |
| **G8.7** | Studio unificado descuento+cortesía: `courtesyLabel` (D5), render context, fin del `0%`, preset, acceso desde el flujo, fix typo ruta admin `discuentos` | NINGUNO |
| **G8.8** | Emails/notificaciones: aprobada/rechazada (reutiliza `GASTRO_LIFECYCLE`), shortCode en email, `audit-labels`, `sendQrEmail` admin | NINGUNO |
| **G8.9** | Portal Gastro: listado/detalle de campañas por local, métricas, cancelar/reenviar | NINGUNO |
| **G8.10** | Admin: cola con badge/filtro, aprobar con agreement visible, detalle de campaña, panel QR sin `qrToken` | NINGUNO |
| **G8.11** | Accounting (según D1): elegibilidad por `claim.type`, reversa de `DEBIT_COURTESY`, reporte; **auditar datos reales primero**; semántica G5/G6 solo con autorización | NINGUNO (esperado) |
| **G8.12** | Tests: cross-profile, tenant, approval/agreement, economía financiada vs no | — |
| **G8.13** | QA + docs + cierre | — |

**Dependencias:** G8.1 y G8.2 no dependen de D1–D5 (pueden ir primero). Si algún slice requiere migration → **detenerse antes de crearla**.

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
