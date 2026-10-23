# V3.3 — G8.5 → G8.8 — Experiencia del cupón de cortesía (cierre)

**Branch:** `feat/v1-s03-api-foundation` · **HEAD inicial:** `0438b95` · **Estado:** COMPLETADO (local). **Sin push. Sin deploy. Producción congelada.**
**Migrations:** NINGUNA. G9 y G8.9+ **NO iniciados**.

| Slice | Commit | Resumen |
|---|---|---|
| G8.5 Scanner | `a8a3b78` | Resultado identifica cortesía y muestra el beneficio real |
| G8.6 ShortCode | `5bf21d5` | Retry de colisión `P2002` (6 chars, alfabeto actual) |
| G8.7 Studio | `3a51c87` | Studio unificado descuento + cortesía; fin del `0%` |
| G8.8 Emails | `bd77fce` | Notificaciones owner, acuerdo comercial, shortCode, métricas, cancelar solicitud |

## G8.5 — Scanner

- El scanner ya exigía claim `ACTIVE` + padre `ACTIVE/APPROVED` (retenidos/rechazados/cancelados/usados inválidos), aislamiento por local A/B y ausencia de master QR (G8.2/G8.3). Se **cubrió con tests** (QR y shortCode manual).
- Único gap funcional real: `valueLabel` mostraba `0%` para cortesías. Ahora `kind: 'DISCOUNT' | 'COURTESY'` + `valueLabel` = beneficio (`discountLabel` de la campaña, `resolveCourtesyBenefitLabel`), y `shortCode` formateado en el resultado.
- `apps/scanner` (`DoorScannerClient`) muestra "Cortesía"/"Descuento" y el beneficio.
- Test: `test:gastro-courtesy-scanner`.

## G8.6 — ShortCode

- `retryOnShortCodeCollision` / `allocateGastroClaimShortCode`: solo reintenta `P2002` cuyo `meta.target` incluye `shortCode`; cualquier otro `P2002` se propaga.
- En cortesías el retry envuelve **toda** la `$transaction` (en Postgres un error aborta la tx); el intento fallido no deja residuos y el siguiente sortea códigos nuevos. Reclamo público: retry alrededor del `create`.
- Compatibilidad: códigos legacy sin tocar; `formatGastroClaimShortCodeForDisplay` acepta 6 chars (`ABC-123`) y legacy.
- Test: `test:gastro-short-code-retry`.

## G8.7 — Studio

- Misma `GastroDiscountTemplate` y `DiscountTemplateRenderer` para ambos. Para cortesía `discountValue` = beneficio (`courtesyLabel`), nunca `0%`; `shortCode` y QR del claim se inyectan al renderizar (el QR es el del claim, nunca master).
- Helpers shared: `resolveDiscountVisualBenefit`, `buildGastroClaimVisualRenderContext`, `buildGastroDiscountStudioPreviewContext`.
- **Bug real**: la web llamaba `.../descuentos/.../visual-template` y la API solo exponía `discuentos` (404). Se agregaron 19 alias canónicos `descuentos` y se corrigió la ruta web.
- Test: `test:gastro-courtesy-studio`.

## G8.8 — Emails / notificaciones

### Contenido (`gastro-lifecycle-email-content.ts`, puro)
Un único builder para descuentos y cortesías (misma semántica comercial). `GASTRO_LIFECYCLE` ahora admite `details` (tabla etiqueta/valor).

- **Owner — solicitud recibida (pendiente):** local, campaña, beneficio, destinatarios, vigencia, estado "Pendiente de aprobación". Sin QR. Se dispara al crear la cortesía del owner (`notifyDiscountPending`).
- **Owner — aprobada:** local, campaña, beneficio, destinatarios, vigencia, estado + **acuerdo comercial**.
- **Owner — rechazada:** muestra **solo** el motivo ya persistido (`rejectionReason` / el pasado por el admin); sin motivo no se inventa nada.
- **Acuerdo (aprobación de cortesía y de descuento normal):** valor reconocido por validación, moneda, multiplicador de canje, vigencia del acuerdo. Se resuelve del `BenefitCommercialAgreement` CURRENT **en el momento de la aprobación** y se pasa a la notificación; **no se persiste** en `GastroDiscount`/`GastroCourtesyCampaign` (verificado por test). La creación admin de descuentos normales también muestra el acuerdo CURRENT cuando existe (informativo, sin gate nuevo); la aprobación de **ediciones** conserva su texto previo, sin acuerdo. Cortesía creada por ADMIN notifica al owner con el acuerdo (paridad con descuento creado por admin).
- **Destinatario (`GASTRO_DISCOUNT_QR_COURTESY`):** nombre, beneficio, QR individual, **shortCode destacado** (HTML + texto), vigencia (desde–hasta), local. G8.4 intacto: aprobación y claims no se duplican, `emailSentAt` controla la entrega, el reintento solo toca pendientes.

### Métricas
- Resumen (`computeGastroDiscountClaimMetrics`): buckets exclusivos used / cancelled / **retained** / expired / available; `deliveredClaims` ⊂ available (cortesía, enviado, ACTIVE). Un claim retenido nunca es disponible ni entregado.
- Operacionales y admin: `availableClaims` excluye usados, cancelados y retenidos; nuevos `retainedClaims`/`cancelledClaims`.
- Métricas de perfil: `totalClaims` excluye claims de cortesías pendientes.
- Sin cambios contables.
- UI: tarjetas "Retenidos (pendiente de aprobación)" / "Entregados" en detalle owner, panel operacional y panel admin.

### Cancelación por el owner
- `updateDiscountStatus` permite `PENDING_REVIEW | COMMISSION_NEGOTIATION → CANCELLED` **solo para cortesías** (`canOwnerCancelPendingCourtesy`): `updateMany` condicionado por estado (un approve concurrente gana; el cancel no lo revierte), claims retenidos → `CANCELLED` en la misma tx, sin email de entrega, `CANCELLED` terminal (no reactivación), audit `GASTRO_DISCOUNT_CANCELLED` con `pendingRequestWithdrawn: true`.
- No existe un estado propio para "retirada por owner": se distingue de `REJECTED` (decisión admin) y se registra por auditoría, sin inventar estado ni migration.
- Web: botón "Cancelar solicitud" (con confirmación) en el detalle del owner.
- **Fuera de alcance (diferido):** cancelar solicitudes pendientes de descuentos normales (el lifecycle actual no cambia; test lo confirma).

### Test
`test:gastro-courtesy-emails` (nuevo): owner pendiente, aprobada, rechazada (con/sin motivo), acuerdo renderizado (HTML + texto) y CURRENT-at-approval, descuento normal con el mismo acuerdo, shortCode en el email del destinatario, reintento de entrega fallida, métricas (retenidos excluidos de available/delivered; used; cancelled; perfil), cancelación del owner (aislamiento por local, sin entrega, sin aprobación posterior, sin reactivación, descuentos normales sin cambios), cortesía creada por admin.

## Validaciones

- Builds: shared ✅ · api ✅ · web ✅ · scanner ✅
- Tests PASS: `gastro-courtesy-hardening`, `-lifecycle`, `-approval`, `-delivery`, `-scanner`, `-studio`, `-emails`, `gastro-short-code-retry`, `gastro-cross-profile-isolation`, `benefit-commercial-agreements`, `gastro-courtesy-credit-funding`, `benefit-settlement-operations`, `discount-visual-template`, más `gastro-lifecycle-notifications`, metrics scope/days, expiry, discount-qr, visual persist/render.
- **DB integration: NO EJECUTADO** (Prisma en memoria, sin Postgres/Docker levantado).
- tsc web: único error preexistente, `lib/categories/subcategoryRailThreshold.test.ts` (módulo `vitest` no instalado), ajeno a este trabajo.

## QA manual (post-deploy, checklist)

1. Owner crea cortesía → recibe email "Solicitud de cortesía recibida" sin QR; destinatarios no reciben nada.
2. Owner abre el detalle → ve "Retenidos" N, "Disponibles" 0 → "Cancelar solicitud" → estado Cancelado, claims cancelados, ADMIN ya no puede aprobar.
3. Owner crea otra → ADMIN aprueba con acuerdo CURRENT → owner recibe email con local/campaña/destinatarios/vigencia y los 4 datos del acuerdo; destinatarios reciben QR + shortCode legible.
4. ADMIN rechaza con motivo → owner recibe email con el motivo.
5. Aprobar un descuento normal → email al owner con el mismo bloque de acuerdo.
6. Escanear QR y shortCode manual del claim → válido una vez; métricas: usado +1, disponible −1.
7. Studio de una cortesía: preview muestra el beneficio (no `0%`) y el shortCode.

## Diferido

- Cancelación por el owner de descuentos normales pendientes.
- `sendQrEmail` admin y `audit-labels` (listados en el roadmap original de G8.8) no se tocaron.
- G8.9+ (portal de campañas, admin queue badges, accounting D1, QA/cierre global).

## Working tree

Sin cambios de este trabajo sin commitear. No incluidos a propósito: `.cursorignore` (untracked) y `packages/shared/src/benefit-settlement-operations.assert.ts` (solo CRLF).
