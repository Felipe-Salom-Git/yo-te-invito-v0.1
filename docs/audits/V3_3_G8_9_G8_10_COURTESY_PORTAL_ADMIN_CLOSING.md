# V3.3 — G8.9 + G8.10 — Portal Gastro y Admin de cortesías (cierre)

**Branch:** `feat/v1-s03-api-foundation` · **HEAD inicial:** `860068a` · **Estado:** COMPLETADO (local). **Sin push. Sin deploy. Producción congelada.**
**Migrations:** NINGUNA. G8.11 (accounting) **NO iniciado**.

| Slice | Commit | Resumen |
|---|---|---|
| G8.9 Portal Gastro | `ffbded3` | Listado/detalle de cortesías por local, estados humanos, acciones válidas, solicitud pendiente de aprobación, audiencia, métricas, Studio, empty states, cross-profile |
| G8.10 Admin | `2682cf6` | Cola con badge y contexto, review, acuerdo G5, approve/reject/cancel/redeliver por lifecycle, listado con filtro + métricas, sin master QR, audit labels, scoping |

Principio intacto: una cortesía es `GastroDiscount(COURTESY_ONLY)` + `GastroCourtesyCampaign` + `GastroDiscountClaim(COURTESY)`. No se creó backoffice, ruta, Studio, scanner ni sistema de auditoría paralelos.

## G8.9 — Portal Gastro

### Listado por local (G8.9.1 / G8.9.3 / G8.9.11)
- Misma ruta `/gastro/descuentos` con filtro **Todos / Descuentos / Cortesías** persistido en la URL (`?tipo=cortesias`); el nav "Cortesías" apunta ahí (antes iba al formulario). El cambio de local conserva `tipo` y `profileId`.
- Cada cortesía (`GastroCourtesyListItem`) muestra campaña, beneficio real (`resolveCourtesyBenefitLabel`, nunca `0%`), estado humano, audiencia ("3 destinatarios · 2 por email · 1 seguidor"), retenidos, disponibles, usados, cancelados, vigencia y fecha de creación. Badges **Cortesía / Descuento** (`GastroDiscountKindBadge`) en portal y admin.
- API: `listMyDiscounts` agrega `courtesyMetrics` con **una** query de claims (sin N+1, `loadCourtesyMetricsByDiscount`). **Hardening:** el fallback legacy por `eventId` ahora solo trae filas **sin** `gastroProfileId` (antes una fila de otro local apuntando al evento del local podía listarse). Mismo fix en el listado admin.
- Cache: la query del listado se dispara solo con el local resuelto (`enabled: !!profileId`), clave `gastroKeys.discounts(profileId)`; el cliente además descarta filas de otro local.

### Estados y acciones (G8.9.2 / G8.9.3)
`packages/shared/src/gastro-courtesy-presentation.ts`:
- `resolveCourtesyDisplayState` → Pendiente de aprobación / Activa / Rechazada / Cancelada / Vencida / Archivada (una ACTIVE vencida se muestra "Vencida").
- `resolveCourtesyActions({ actor, status, archivedAt, validTo, createdByOrigin, pendingDeliveryClaims })` decide las acciones: `cancelRequest` (owner, pendiente), `cancelCampaign` (activa; owner solo si la creó el local), `editDesign` (pendiente o activa), `approve`/`reject`/`markNegotiation` (admin, pendiente), `redeliver` (admin, activa con entregas pendientes); `edit` y `sendMasterQrEmail` nunca.
- **Backend:** el owner ya no puede cancelar una cortesía creada por ADMIN (posible financiación con Courtesy Credit, D2) → 403 `GASTRO_COURTESY_ADMIN_ORIGIN_OWNER_BLOCKED_MESSAGE`. ADMIN sigue pudiendo.

### Solicitar cortesía (G8.9.4 / G8.9.5)
- `/gastro/descuentos/cortesia` → "Solicitar cortesía"; textos aclaran que queda **pendiente de aprobación** y que nadie recibe nada antes. Confirmación "Confirmar solicitud"; resultado "**Solicitud enviada para revisión**" con links a la solicitud y a las cortesías del local (siempre con `profileId`). El formulario se limpia y se invalida el listado del local.
- Audiencia: se reutiliza el preview existente (`GastroCourtesyAudienceSummary`: emails individuales, seguidores, duplicados) + aviso de que se congela al enviar. Después del request no se recalcula (test: un seguidor nuevo no cambia el total).

### Métricas (G8.9.6)
- `computeCourtesyCampaignMetrics` reutiliza los buckets exclusivos de G8.8 y agrega audiencia (`manual / followers / registered`) y `pendingDeliveryClaims` (padre aprobado, usable, nunca enviado). Retenido ≠ disponible ≠ entregado.
- Owner: Destinatarios, Retenidos (solo si > 0), Disponibles, Entregados, Usados, Cancelados, Vencidos (solo si > 0). El panel operacional genérico (QR general, "claims emitidos") **no** se muestra al owner en cortesías.

### Retirar solicitud (G8.9.7)
"Cancelar solicitud" con confirmación (sin wording "Eliminar") → padre `CANCELLED`, claims retenidos `CANCELLED`, sin entrega, sin reactivación (reutiliza G8.8). Cancelar una activa: "Cancelar cortesía" con confirmación de que es terminal.

### Studio (G8.9.8)
"Editar diseño" abre el Studio unificado de G8.7 (beneficio real, QR individual y shortCode del claim en render). Se oculta (y la página del Studio lo bloquea) para cortesías rechazadas, canceladas, vencidas o archivadas. **No** se agregó restricción backend: no existía una restricción real (documentado como diferido).

### Detalle (G8.9.9)
- `GET /gastro/discounts/:id/summary` incluye `courtesy` (campaña, `benefitLabel`, descripción, mensaje, vigencia, alta, origen, métricas). Legacy sin campaña → `courtesy: null` (mensaje "cortesía histórica").
- `GastroCourtesyDetailPanel` + `GastroDiscountDetailContent` (mismo componente owner/admin, `actor`): estado, beneficio, vigencia, audiencia, métricas, motivo de rechazo. La lista de destinatarios muestra email, origen ("Email individual" / "Seguidor del local"), estado ("Retenido" mientras está pendiente) y entrega; **nunca** shortCode/QR.
- **Hardening:** `operational-metrics` de una cortesía ya no devuelve `recentShortCodes` (los shortCodes se canjean a mano en el scanner; las validaciones recientes solo muestran códigos ya usados).

### Empty states (G8.9.10)
`resolveCourtesyEmptyState`: 0 cortesías → "Todavía no creaste cortesías para este local." + [Crear cortesía] (solo local ACTIVE); tab vacío con cortesías en otros tabs → indica dónde están ("Este local tiene 2 pendientes de aprobación.").

## G8.10 — Admin

- **Cola (G8.10.1):** dashboard (`AdminPendingReviewSection`) y `listPendingDiscounts` distinguen Cortesía/Descuento (badge) y para cortesías muestran local, campaña, beneficio, destinatarios, vigencia, origen y estado (`courtesy` en `adminDashboardPendingGastroDiscountSchema`, métricas en la cola admin).
- **Review (G8.10.2):** `AdminGastroCourtesyReviewPanel` — local, campaña, beneficio, audiencia desglosada, retenidos y demás métricas, vigencia, origen, **solicitante** (`createdBy` = usuario del campaign/discount), mensaje, motivo de rechazo. Todo cargado por `loadDiscount` (tenant + local de la ruta).
- **Approve/Reject (G8.10.3):** reutiliza G8.3 sin cambios de dominio. Botones por `resolveCourtesyActions`; confirmaciones y toasts con wording de cortesía; errores de dominio del server se muestran tal cual (p. ej. "El local no tiene acuerdo comercial vigente…").
- **Acuerdo (G8.10.4):** el panel G5 existente (`AdminGastroDiscountCommercialContextPanel`, mismo endpoint/editor) se muestra junto a la revisión de la cortesía: valor por validación, moneda, multiplicador, vigencia.
- **Reintentar entrega (G8.10.5):** mismo endpoint `POST /admin/gastro-discount-tickets/:discountId/courtesy/redeliver`. Visible solo si la cortesía está activa y hay `pendingDeliveryClaims > 0`; no reenvía a quien ya tiene `emailSentAt` (test: `attempted === 1`, `skippedAlreadySent === 2`).
- **sendQrEmail (G8.10.6):** PUBLIC → sin cambios. COURTESY_ONLY → bloqueado en backend (`canIssueMasterQr`, ya existía) y oculto en UI. **Fix:** el detalle admin exponía `qrToken` crudo; ahora `qrToken`/`qrPayload` son `null` para cortesías.
- **Audit labels (G8.10.7):** sin sistema nuevo. `resolveCourtesyAuditActionLabel` (shared) etiqueta como cortesía las filas con `after.courtesy`/`metadata.courtesy`, entidad `GastroCourtesyCampaign` o acciones `GASTRO_DISCOUNT_COURTESY_*` ("Cortesía gastro aprobada", "Solicitud de cortesía retirada por el local", …). Usado por el resumen API y por el badge web. Se agregó el flag `courtesy` a negociación y archivo/desarchivo; `GASTRO_DISCOUNT_COURTESY_CREATED/SENT` sumados al enum shared (ya existían en Prisma). Acción, `entityType` e ids canónicos sin cambios.
- **Listado (G8.10.8 / G8.10.9):** `ADMIN → Gastronomía → Local` con filtro Todos / Descuentos / Cortesías (misma ruta y tabs). Filas de cortesía: estado humano + destinatarios, retenidos, disponibles, entregados, usados, cancelados. Sin cambios contables.
- **Legacy (G8.10.10):** cortesías ACTIVE previas siguen visibles/cancelables; sin requester → "Sin registro"; sin campaña → `courtesy: null` y la página carga. No se exige historial de aprobación ni de acuerdo.
- **Security (G8.10.11):** `assertDiscountInProfile` (reutiliza `loadDiscount`) protege `GET .../summary` (ruta anidada: antes **devolvía el summary de cualquier descuento del tenant**; plana: cuando viene `?profileId=`) y `PATCH /admin/gastro-discount-tickets/:id/status?profileId=`. Detail/approve/reject/cancel/metrics/redeliver ya estaban scoped (404).

## Componentes / módulos nuevos

| Archivo | Propósito |
|---|---|
| `packages/shared/src/gastro-courtesy-presentation.ts` | Estados humanos, acciones válidas, guard de origen, labels de auditoría (puro; API + web) |
| `gastroCourtesyCampaignMetricsSchema` (`schemas/gastro-courtesy-discounts.ts`) | Métricas por campaña (owner + admin) |
| `gastroDiscountSummaryCourtesySchema` (`schemas/gastro-discount-summary.ts`) | Bloque `courtesy` del summary |
| `apps/api/.../gastro-discount-metrics.util.ts` (`computeCourtesyCampaignMetrics`, `loadCourtesyMetricsByDiscount`) | Cálculo batched de métricas de cortesía |
| `apps/web/lib/gastro/courtesy-portal.ts` | `?tipo=`, audiencia, tarjetas de métricas, empty states |
| `apps/web/components/gastro/GastroDiscountKindBadge.tsx`, `GastroDiscountListItem.tsx` | Badge Cortesía/Descuento; fila de descuento |
| `apps/web/components/gastro/courtesy/*` | Badge de estado, fila, empty state, panel de detalle, diálogos de solicitud |

## Validaciones

- Builds: shared ✅ · api ✅ · web ✅ · scanner ✅
- Tests PASS: `gastro-courtesy-portal` (nuevo, + `courtesy-portal.assert` web), `admin-gastro-courtesy` (nuevo, 75 checks), `gastro-courtesy-hardening`, `-lifecycle`, `-approval`, `-delivery`, `-scanner`, `-studio`, `-emails`, `gastro-cross-profile-isolation`, `gastro-short-code-retry`, `admin-gastro-discount-profile-scope`, `gastro-owner-discount-scope`, `gastro-lifecycle-notifications`, `gastro-discount-archive/-origin/-qr/-expiry`, `gastro-multi-local`; regresión `benefit-commercial-agreements`, `discount-visual-template`, `gastro-discount-visual-persist`, `discount-visual-render`, `scanner-manual-short-code`, `gastro-courtesy-credit-funding`, `courtesy-credit-ledger`, `benefit-settlement-hardening`; asserts `gastro-courtesy-lifecycle` (shared) y `courtesy-scope` (web).
- **DB integration: NOT RUN** (Postgres local apagado; Prisma en memoria sobre servicios reales).

## QA manual (post-deploy, checklist)

1. Owner con 2 locales: "Cortesías" en el nav → lista del local A; cambiar a B → solo B (sin flash de A).
2. "Crear cortesía" → formulario conserva el local; enviar → "Solicitud enviada para revisión"; la fila aparece "Pendiente de aprobación" con N retenidos, 0 disponibles.
3. Detalle pendiente: "Cancelar solicitud" (confirmación) → "Cancelada", destinatarios "Cancelado", sin emails; no hay "Editar diseño".
4. Admin: dashboard muestra badge "Cortesía" con beneficio/destinatarios/vigencia/origen → Moderar → panel de revisión + acuerdo; sin acuerdo, Aprobar bloqueado con mensaje.
5. Aprobar → entregados N; forzar un fallo de email → "Reintentar entrega" envía solo al pendiente.
6. Rechazar con motivo → owner ve "Rechazada" + motivo; claims cancelados.
7. Cortesía creada por admin: el owner no ve "Cancelar cortesía".
8. Auditoría: las filas de cortesía dicen "Cortesía gastro …".
9. Admin listado del local: filtro Cortesías; métricas por fila.

## Diferido

- Cancelar solicitudes pendientes de **descuentos normales** (no implementado; el lifecycle de descuentos no cambió).
- Restricción backend del Studio por lifecycle (hoy solo UI; no existía restricción real).
- `admin/gastronomicos/[profileId]/descuentos/[discountId]/page.tsx` ya superaba 400 líneas antes de este trabajo (~600 ahora): split pendiente.
- **G8.11 Accounting (D1):** exclusión de cortesías financiadas, elegibilidad de no financiadas, cash/barter, reversa de ledger — **NO iniciado**. Hoy los canjes de cortesía siguen siendo facturables.

## Working tree

Sin cambios de este trabajo sin commitear. No incluidos a propósito: `.cursorignore` (untracked) y `packages/shared/src/benefit-settlement-operations.assert.ts` (solo CRLF).
