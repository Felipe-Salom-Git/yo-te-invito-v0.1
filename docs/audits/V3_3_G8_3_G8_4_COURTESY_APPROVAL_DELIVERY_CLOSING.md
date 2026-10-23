# V3.3 — G8.3 + G8.4 — Aprobación de cortesías, gate de acuerdo comercial y entrega post-aprobación (cierre)

**Branch:** `feat/v1-s03-api-foundation` · **HEAD inicial:** `934b86d` · **Commit de código:** `ead150f` · **Estado:** COMPLETADO (local). **Sin push. Sin deploy. Producción congelada.**
**Migrations:** NINGUNA.

## 1. Decisión de modelo (Opción A, sin migration)

Una cortesía = `GastroDiscount(visibility=COURTESY_ONLY)` + `GastroCourtesyCampaign` + `GastroDiscountClaim(type=COURTESY)`. No se creó ningún enum ni campo.

**Representación de un claim retenido:** `claim.status = ACTIVE` + `type = COURTESY` + padre en `PENDING_REVIEW` o `COMMISSION_NEGOTIATION`.

**Invariante:** claim utilizable ⇔ `claim.status = ACTIVE` ∧ padre redimible (`ACTIVE`/`APPROVED`). El scanner ya lo exigía (`isParentDiscountRedeemable`), por lo que la protección es backend, no frontend.

Helpers compartidos (`packages/shared/src/gastro-courtesy-lifecycle.ts`): `isCourtesyPendingApproval`, `initialCourtesyDiscountStatus`, `isCourtesyClaimRetained`, `isClaimVisibleToRecipient`, `isCourtesyClaimPendingDelivery`.

## 2. G8.3 — Aprobación + agreement

- **Owner:** `sendCourtesy` crea en una transacción Serializable: discount `PENDING_REVIEW` (`qrToken=null`, `gastroProfileId`, `createdByOrigin`, `createdByUserId`), campaña, un claim por destinatario y el débito opcional de Courtesy Credit. No envía emails. Responde `discountStatus: 'PENDING_REVIEW'`, `pendingApproval: true`.
- **Audiencia congelada** al momento del request (no se recalculan seguidores).
- **Admin (cola existente):** el listado/detalle de descuentos expone `visibility` y `courtesy` (local, campaña, título, beneficio, destinatarios, validez, origen, estado, contadores de entrega). Approve / Reject reutilizan los endpoints existentes.
- **Gate:** aprobar exige `BenefitCommercialAgreement` CURRENT (tenant + gastroProfile) vía `resolveApplicable`; sin acuerdo → `BENEFIT_AGREEMENT_NOT_FOUND`. No se copian `unitPrice`/`barterMultiplier` a la campaña. Se exige también para cortesías financiadas con Courtesy Credit (gate comercial; la contabilidad es G8.11).
- **Vencida al aprobar:** `GASTRO_COURTESY_EXPIRED_AT_APPROVAL` (hay que rechazar).
- **Aprobación single-winner:** `updateMany` condicionado por estado; el segundo approve falla con 400 y no re-entrega.
- **Admin-created:** valida perfil + agreement CURRENT antes de crear; nace `ACTIVE` y entrega (`trigger ADMIN_CREATE`).
- **Reject:** discount → `REJECTED` y claims `ACTIVE` → `CANCELLED` en la misma transacción; sin emails, sin reactivación (`updateDiscountStatus` ya bloquea).
- **Legacy `ACTIVE`:** sin cambios ni backfill.
- **Endurecimientos:** `/me` y la vista pública del claim ocultan claims de cortesía con padre pendiente/rechazado; alertas a seguidores filtran `visibility: 'PUBLIC'`.

## 3. G8.4 — Entrega post-aprobación

- Nuevo `GastroCourtesyDeliveryService.deliverCampaign(trigger APPROVAL | ADMIN_CREATE | REDELIVER)`.
- Usa la plantilla `GASTRO_DISCOUNT_QR_COURTESY` con el QR/shortCode **individual** de cada claim, nunca `discount.qrToken`.
- No crea ni recalcula claims. Idempotente: `claim.emailSentAt != null` se omite.
- Un fallo de email **no** revierte la aprobación ni duplica claims; queda `emailSendError` y `emailSentAt = null`. Reintento solo sobre esos claims: `POST /admin/gastro-discount-tickets/:discountId/courtesy/redeliver`.
- Auditoría: `GASTRO_DISCOUNT_COURTESY_CREATED`, `GASTRO_DISCOUNT_APPROVED {courtesy, agreementId}`, `GASTRO_DISCOUNT_COURTESY_SENT {trigger, sent, failed, skipped}`.
- Cancelar tras la aprobación mantiene G8.2 (ACTIVE no usados → `CANCELLED`, usados preservados).

## 4. UI (mínima)

Portal owner: mensaje "enviada a revisión". Admin: panel de revisión de cortesía, sin QR maestro/preview/editor de publicación, botón "Reintentar entrega", badge "Cortesía" en tabla y dashboard.

## 5. Tests

`test:gastro-courtesy-approval`, `test:gastro-courtesy-delivery` (nuevos, con `scripts/lib/courtesy-fake-db.ts`, Prisma en memoria sobre los servicios reales), más hardening/lifecycle actualizados y el assert compartido. **DB integration: NO EJECUTADA** (sin PostgreSQL).

## 6. Diferido / conocido

- Textos de notificación al owner (pendiente/aprobada/rechazada) y contenido del acuerdo en el email → G8.8.
- El owner no puede cancelar su propia solicitud pendiente.
- Métricas de claims cuentan claims retenidos (revisar en G8.10/G8.11).
- Scanner (G8.5), shortCode (G8.6), Studio (G8.7), Portal (G8.9), Admin polish (G8.10), Accounting (G8.11), tests globales (G8.12), QA (G8.13): **NO iniciados**.
- Preexistente, no tocado: `scripts/smoke-user-portal.ts`, errores de tipos en `test-gastro-courtesy-credit-funding.util.ts`, `smoke-v31-admin-gastro-discovery.ts` (aridad), vitest en web `tsc`, CRLF en `benefit-settlement-operations.assert.ts`.

## 7. QA manual pendiente (post-deploy)

1. Owner envía cortesía → queda "Pendiente"; destinatario no la ve en `/me`, sin email; scanner rechaza QR/shortCode.
2. Admin sin acuerdo: Aprobar bloqueado. Con acuerdo: Aprobar → emails con QR individual → aparece en `/me`.
3. Rechazar → claims cancelados, sin emails.
4. Forzar fallo de email → aprobada igual; "Reintentar entrega" envía solo pendientes.
5. Cancelar tras aprobar → no usados cancelados, usados preservados.
