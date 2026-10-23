# V3.3 G8.0 — Discovery de Cortesías Gastro

**Fecha:** 2026-10-23  
**Rama:** `feat/v1-s03-api-foundation`  
**Alcance:** solo auditoría + docs. **Cero código funcional modificado. Sin migrations. Sin push/deploy.**  
**G8.1+:** NOT STARTED

## 0. Pre-requisito: cross-profile isolation (cierra G7.12)

`pnpm --filter api run test:gastro-cross-profile-isolation`

| Ítem | Resultado |
|---|---|
| Se ejecutó | Sí (`tsx scripts/test-gastro-cross-profile-isolation.util.ts`) |
| Exit code | **0** |
| Assertions | 13 `OK:` impresos, `process.exit(1)` ante la primera falla |
| Silencio del run anterior | **No era comportamiento del test**: fue un artefacto de `Select-Object -Last 1` (agarró la línea vacía final). El test imprime siempre |
| Cobertura | Admin ruta anidada A/B, GASTRO_OWNER A→B, SCANNER A→B y sin `gastroProfileId`, "mismo usuario ≠ mismo local" |
| Cableado real | Los 3 predicados se usan en `admin-gastro.service.ts:524`, `scanner-gastro-discount.service.ts:268`, `scanner-accounts.service.ts:1080` |
| Límite | Prueba **predicados puros**, no filas reales (no hay DB local). Es aislamiento por contrato, no E2E |

**Veredicto: PASS.** G7.12 queda cerrada localmente.

---

## 1. Arquitectura actual (hechos verificados en código)

Una cortesía **no es una entidad propia**. Un envío (`POST /gastro/discounts/courtesy/send`, `gastro-courtesy-discounts.service.ts`) crea en una transacción Serializable:

1. `GastroDiscount` — `visibility = COURTESY_ONLY`, `status = ACTIVE` (nace activo), `type = PERCENT`, `value = 0`, `code = CRS-XXXXXXXX`, **sin `qrToken`**, `discountDate = validTo`.
2. `GastroCourtesyCampaign` — 1:1 con el descuento (`discountId @unique`), por `gastroProfileId`; `title`, `discountLabel`, `message`, `validFrom/To`. **Sin `status` ni `updatedAt`**: su ciclo de vida es el `status` del descuento.
3. Opcional: débito `DEBIT_COURTESY` en `CourtesyCreditLedgerEntry` (solo con `funding`).

Después (fuera de la tx), por destinatario: `GastroDiscountClaim` con `type = COURTESY`, `source = MANUAL_EMAIL | FOLLOWERS`, `qrToken`, `accessToken`, `shortCode`, `courtesyCampaignId`, `recipientName`; luego email `GASTRO_DISCOUNT_QR_COURTESY`.

Rutas de envío:

| Ruta | Quién | `funding` |
|---|---|---|
| `POST /gastro/discounts/courtesy/send` | ADMIN, GASTRO_OWNER (membership ACTIVE al `gastroProfileId` del body) | solo ADMIN (`BENEFIT_CREDIT_FUNDING_ADMIN_ONLY`) |
| `POST /admin/gastro/courtesies/send` | ADMIN | **obligatorio** |
| `GET /gastro/discounts/courtesy/recipients-preview` | ADMIN, GASTRO_OWNER | — |

No existe endpoint para listar/editar/cancelar/reenviar campañas ni métricas por campaña.

### Dominio vs. contabilidad (aclaración pedida)

| Concepto | Qué es | Dónde vive |
|---|---|---|
| **Courtesy Campaign** | Beneficio que un local regala a ciertos usuarios (descuento oculto + claims) | `GastroCourtesyCampaign`, `GastroDiscount(COURTESY_ONLY)`, `GastroDiscountClaim(COURTESY)` |
| **Courtesy Credit Ledger** | Saldo BARTER del partner (append-only) que puede **financiar** campañas | `CourtesyCreditLedgerEntry` |

Se tocan en un único punto: `CourtesyCreditLedgerEntry.sourceCourtesyCampaignId` (`@unique`, `onDelete: Restrict`). Una campaña **no necesita** ledger; el ledger **no define** la campaña. `CourtesyGrant` (módulo `courtesies`) es de tickets de evento y no se mezcla.

---

## 2. Qué ya funciona

- Creación + envío por email, con preview de destinatarios (manual + seguidores, tope 200, dedupe).
- Aislamiento por local: membership por `profileId` (owner), scanner/owner/admin validan contra `discount.gastroProfileId` (ver §0).
- Canje por el scanner **sin código específico**: misma validación que un descuento; crea `GastroDiscountValidation{discountId, claimId}`.
- Exclusión pública: `visibility = PUBLIC` filtrado en listados y en `claim()` público.
- `/me/descuentos`: lista claims PUBLIC_REQUEST y COURTESY juntos (match por `userId` o email; una cortesía enviada antes del registro aparece luego), con título/label de campaña.
- Débito de ledger idempotente por campaña, con lock de fila y chequeo de saldo, en la misma tx.
- Auditoría: `GASTRO_DISCOUNT_COURTESY_CREATED/SENT`, `BENEFIT_CREDIT_DEBITED_FOR_COURTESY`.
- El Studio (`GastroDiscountTemplate`) **técnicamente** acepta un descuento `COURTESY_ONLY` (no hay chequeo de visibility).

---

## 3. Hallazgos (qué falta / qué está mal)

Severidad: 🔴 decisión económica o seguridad · 🟠 bug funcional · 🟡 UX/consistencia.

### Decisiones económicas / seguridad

| # | Hallazgo | Evidencia |
|---|---|---|
| F1 🔴 | **Los canjes de cortesía son facturables.** La elegibilidad de liquidación toma toda `GastroDiscountValidation` con `claimId != null`; no filtra `visibility` ni `claim.type`. Una cortesía canjeada aparece en validaciones pendientes y se valora con el acuerdo (CASH o BARTER). | `benefit-settlement-eligibility.service.ts` (~62-107); `grep visibility/COURTESY` en `benefit-settlements/` solo toca el ledger |
| F2 🔴 | **Doble cargo / lazo de crédito.** Una cortesía **financiada** con crédito (`DEBIT_COURTESY`) igual se factura al canjearse; si se asigna BARTER, el canje **genera crédito nuevo** que financia más cortesías. | F1 + `materializeBarterCreditForAllocation` |
| F3 🔴 | **Las cortesías saltean la aprobación y el agreement gate.** Nacen `ACTIVE`; nunca pasan por PENDING_REVIEW → admin → `benefitAgreements.resolveApplicable`. Un owner puede enviar cortesías a 200 personas sin acuerdo vigente. (Después, si se canjean, el canje cae en `missingAgreements` y **bloquea** refresh/asignación de la liquidación.) | `gastro-courtesy-discounts.service.ts` ~283-300 vs `admin-gastro.service.ts` approve ~724-783 |
| F4 🔴 | **Master QR por reactivación.** `PATCH /gastro/discounts/:id/status` a `ACTIVE` genera `qrToken` si es null (`gastro-discount-metrics.service.ts:362-372`). Una cortesía cancelada y reactivada obtiene `qrToken` → habilita el camino "master token" del scanner (validaciones con `claimId = null`, uso ilimitado, no facturable). | verificado en código |
| F5 🟠 | Débito `DEBIT_COURTESY` **no reversible** (`reverseEntry` solo acepta importes positivos). Si todos los emails fallan o la campaña se cancela, el crédito no vuelve salvo `ADJUSTMENT` manual. | `courtesy-credit-ledger.service.ts` ~314-319 |
| F6 🟠 | Un owner **no puede** financiar (admin-only) → sus cortesías nunca tocan el ledger. El monto debitado es el `imputedValueCents` que escribe el admin; no se calcula. | servicio ~267-274 |

### Bugs funcionales

| # | Hallazgo | Evidencia |
|---|---|---|
| B1 🟠 | `/gastro/descuentos/cortesia` **ignora el selector de local**: llama `getMyLocal()` sin `profileId` → siempre el local por defecto. Multi-local solo puede enviar cortesías al default. Si `getMyLocal` es null, "Cargando local…" infinito. | `apps/web/app/(portal)/gastro/descuentos/cortesia/page.tsx` L16-20, L76-85 |
| B2 🟠 | **Preview con `sendToFollowers=false` se calcula como `true`**: `z.coerce.boolean()` + `String(false)` = `"false"` → `Boolean("false") = true`. El envío real (body JSON) es correcto; el contador del preview puede mentir. | `packages/shared/src/schemas/gastro-courtesy-discounts.ts:75`; `apps/web/lib/api/client.ts:59-60` |
| B3 🟠 | Editar una cortesía por el `PATCH /gastro/discounts/:id` genérico: entra a `pendingUpdate` (revisión admin), permite cambiar `type/value` (una cortesía podría quedar con % real) y **no actualiza `GastroCourtesyCampaign`** → `/me` y email muestran título/label de campaña desfasados del descuento. | `gastro-portal-discounts.service.ts` 341-475; `approvePendingEdit` ~829-884 |
| B4 🟠 | La ruta admin de plantilla visual tiene typo: la API expone `gastronomicos/:profileId/discuentos/...` y el web llama `.../descuentos/.../visual-template` (`ApiRepository.ts:2534`) → 404. Las demás admin (`operational-metrics`, `economic-metrics`) sí usan `discuentos`. | `admin.controller.ts:1352-1387` vs `ApiRepository.ts:2534` |
| B5 🟠 | Envío no atómico en delivery: el loop de claims/shortCode corre fuera de la tx; si un `create` falla, aborta con error (sin resumen) dejando descuento, campaña y claims parciales. `allocateGastroClaimShortCode` es check-then-insert **sin reintento ante P2002**. | servicio ~370-436; `gastro-claim-short-code.util.ts` |
| B6 🟡 | Sin chequeo `validFrom < validTo`. | schema body |
| B7 🟡 | Ruta admin: usa `profile.publicEventId!` sin validar (owner sí lo valida) → error poco claro si es null. | servicio ~277 |
| B8 🟡 | `createdByOrigin` queda en default `GASTRO` incluso si envía un ADMIN; `createdByUserId` del descuento no se setea. Impide distinguir origen. | servicio ~283-300 |

### Visibilidad / UX

| # | Hallazgo |
|---|---|
| U1 🟡 | `GastroDiscountResponse` **no expone `visibility`** → `/gastro/descuentos` muestra la cortesía como un descuento "Activo" más. Sin badge ni filtro (tampoco en admin). |
| U2 🟡 | El portal de cortesías es solo formulario de envío: sin listado, sin métricas por campaña (existe `courtesyClaims`/`publicClaims` en `gastro-discount-metrics.util.ts` pero el detalle no los muestra), sin cancelar/reenviar. |
| U3 🟡 | El cron de expiración pasa cortesías a `EXPIRED` y dispara "Descuento vencido" a los miembros (ruido para un envío puntual). Contadores de dashboard/perfil no excluyen `COURTESY_ONLY`. |
| U4 🟡 | `shortCode` **no se ve** en la tarjeta por defecto (`GastroDiscountQrCard` muestra `qrCode.slice(0,8)…`) ni en el email de cortesía (muestra el token como "código alternativo"). Solo aparece si el Studio tiene un campo DYNAMIC `shortCode`. |
| U5 🟡 | No hay email de aprobación/rechazo/canje para cortesías (no hay aprobación). Sin etiquetas en `audit-labels.ts` para `GASTRO_DISCOUNT_COURTESY_*`. `sendQrEmail` admin falla con cortesías (sin `qrToken`). |
| U6 🟡 | QR dibujado client-side vía `api.qrserver.com` (tercero; el payload viaja en la URL), también en el email. Sin PDF/imagen server. Fuera del alcance G8 salvo decisión. |

---

## 4. Agreement actual

- **Descuento normal:** el agreement es **solo un gate** en `AdminGastroService.approve` (`resolveApplicable(tenant, GASTRO, gastroProfileId)` → `BENEFIT_AGREEMENT_NOT_FOUND`). **No se guarda `agreementId`/precio en el descuento.** El precio se resuelve en la liquidación por `validatedAt` y se **snapshotea en `BenefitSettlementUsageAllocation`** (G5).
- **Descuento creado por admin** (`createDiscountOnBehalf`): nace `ACTIVE`, **sin** chequeo de agreement.
- **Cortesía:** no requiere, no usa y no guarda agreement al enviar. Solo "lo siente" en liquidación (F1/F3).
- **Consecuencia de diseño:** replicar el gate, **no** inventar snapshots nuevos en la cortesía (coherente con descuentos).

## 5. Scanner actual

- `POST /scanner/gastro-discounts/validate` (SCANNER/ADMIN/GASTRO_OWNER) → `ScannerGastroDiscountService.validate`. **Reutiliza exactamente** la validación de descuentos; nunca mira `claim.type` ni `visibility`.
- `gastroProfileId` **no se guarda en la validación**; se deriva de `validation.discount.gastroProfileId` (scope por `assertActorCanAccessDiscount`: admin siempre; scanner por `parentProfileId`; owner por perfil autorizado).
- Camino claim: exige claim `ACTIVE`, no expirado, y descuento padre `ACTIVE|APPROVED` en ventana; marca `USED` + crea validación; unique en `claimId` → `ALREADY_USED`.
- Camino master token (`claimId = null`): requiere `discount.qrToken`; hoy cortesías no lo tienen **salvo F4**.
- Entrada por shortCode soportada (normaliza, busca global, valida tenant + scope).
- **Gap:** el resultado del scan no distingue "Cortesía" de "Descuento" (útil para el operador del local).

## 6. ShortCode actual

| Aspecto | Valor |
|---|---|
| Generador | `apps/api/src/common/gastro-claim-short-code.util.ts` (`crypto.randomInt`) |
| Alfabeto | `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (32, sin 0/O/1/I) |
| Largo | **6** (≈1.07·10⁹ combinaciones). Display `ABC-123` |
| Dónde | **solo `GastroDiscountClaim.shortCode`** (`@unique` **global**, no por tenant). `GastroDiscount` no tiene shortCode |
| Colisión | hasta 25 intentos con `findUnique` previo; **sin retry en P2002** (carrera posible) |
| Compartido | descuento público y cortesía usan la misma función; `ActivityCouponClaim` usa tabla/índice propios |
| Legacy | migración `20260831120000_gastro_claim_short_code` backfilleó 6 hex (pueden tener 0/1) y, ante colisión, 9 chars del id (>6, sin guion en display). El scanner acepta 4-10 alfanuméricos |

**Conclusión:** el código **ya es corto** y compartido; no hay razón técnica para acortarlo (con 5 chars ≈3.3·10⁷, la paradoja del cumpleaños sube el riesgo y hay unique global). Lo que falta es **robustez (retry P2002)** y **mostrarlo** (card, email, Studio). Ver decisión D4.

## 7. Studio actual (QR Studio / `DiscountTemplateRenderer`)

- `GastroDiscountTemplate` es **1:1 por descuento** (`gastroDiscountId @unique`), solo diseño (sin tokens). Cada claim de una campaña **comparte** la plantilla del descuento. No hay biblioteca de plantillas: presets en código (`DISCOUNT_VISUAL_PRESET_META`).
- API owner `GET/PUT/DELETE /gastro/discounts/:id/visual-template` y admin equivalente: `assertDiscountAccess` **no bloquea** `COURTESY_ONLY`.
- Renderer 100 % client (`DiscountTemplateRenderer`, QR vía `TicketQrImage`); lo consumen `/me/descuentos` y `/descuentos/reclamo/[claimId]`.
- **Qué bloquea hoy a la cortesía:** no es un bloqueo de código sino de **contenido**: los campos dinámicos (`gastroName`, `discountTitle`, `discountValue`, `discountValidity`, `shortCode`) no incluyen el `discountLabel` de la campaña, y `discountValue` es obligatorio y se renderiza **`0%`** (la cortesía es `PERCENT/0`). Además el Studio solo es alcanzable **después** del envío (el id del descuento no vuelve al formulario).
- **¿Template adicional?** **No.** Alcanza con: (a) un campo dinámico `courtesyLabel` (o mapear `discountLabel` en `discountValue` cuando `visibility = COURTESY_ONLY`), (b) pasar ese dato en el `renderContext` de `/me` y claim page, (c) preset opcional de cortesía, (d) exponer la entrada al Studio desde el flujo/lista de cortesías. **Un solo Studio** para descuento y cortesía.
- El email de cortesía **ignora** la plantilla (QR plano).

## 8. Accounting actual

- `BenefitSettlementUsageAllocation` nunca distingue origen; una validación de cortesía se asigna igual que cualquier otra (F1).
- `CourtesyCreditLedgerEntry` solo tiene `DEBIT_COURTESY` para campañas **financiadas por admin**.
- Reporte (`benefit-settlement-reporting.service.ts` ~323, ~434) ya muestra `kind: 'COURTESY'` para débitos de campaña.
- **No hay semántica definida** sobre si el canje de una cortesía es: (A) uso facturable, (B) no facturable, (C) facturable solo si no financiada. Debe decidirla el operador (D1) **antes de G8.11**. Cualquier cambio de elegibilidad es una alteración de semántica G5/G6 → requiere autorización explícita.

## 9. Approval: qué falta para `PENDING → ADMIN REVIEW → AGREEMENT → APPROVE/REJECT`

Todo el flujo del descuento ya existe y se puede **reutilizar** sin tocar su semántica:

| Pieza | Estado | Para cortesía |
|---|---|---|
| `GastroDiscountStatus` (PENDING_REVIEW…ACTIVE/REJECTED/CANCELLED/EXPIRED) | existe | reutilizar |
| `AdminGastroService.approve/reject/markCommissionNegotiation` + agreement gate | existe | reutilizar; saltear requisito de imágenes y **no** generar `qrToken` para `COURTESY_ONLY` |
| Notificaciones `GASTRO_LIFECYCLE` (pending/approved/rejected) | existe | reutilizar kinds |
| Admin UI cola de descuentos | existe | agregar badge/filtro cortesía |
| Cortesía nace PENDING_REVIEW (owner) | **falta** | cambio en `sendCourtesy` |
| Entrega diferida hasta aprobar | **falta** | ver opción A |
| Admin-origin auto-ACTIVE (`initialStatusForDiscountOrigin('ADMIN')`) | existe para descuentos | replicar para cortesías admin |

### Diseño recomendado (Opción A, sin schema)

1. Owner envía → se crea `GastroDiscount(COURTESY_ONLY, PENDING_REVIEW)` + campaña + **claims pre-creados sin email** (`emailSentAt = null`). Los destinatarios (incl. snapshot de seguidores) quedan **persistidos como claims**, no en JSON nuevo.
2. Claims no canjeables mientras el padre no esté `ACTIVE|APPROVED` (el scanner ya lo exige) y `/me` los oculta mientras el padre esté pendiente/rechazado.
3. Admin aprueba (mismo `approve`, con agreement gate) → `ACTIVE` → se disparan los emails de los claims con `emailSentAt IS NULL` (idempotente).
4. Rechazo → `REJECTED` + claims `CANCELLED`.
5. Admin que envía → nace `ACTIVE` y entrega inmediata (igual que `createDiscountOnBehalf`).

**Opción B (fallback, con migration):** persistir recipients en la campaña y crear claims al aprobar. Más limpia en datos pero añade columnas; solo si A choca con algo en implementación.

## 10. Decisiones requeridas del operador

| ID | Decisión | Recomendación | Bloquea |
|---|---|---|---|
| **D1** | ¿Un canje de cortesía es facturable? A) sí (hoy) · B) nunca · C) solo no financiadas | **C como mínimo** (evita doble cargo F2 y el lazo de crédito); idealmente B si la cortesía es regalo del local | G8.11 |
| **D2** | ¿Puede un owner financiar con su propio crédito BARTER, o sigue admin-only? | Mantener admin-only en G8; evaluar owner-spend después | G8.3/.11 |
| **D3** | ¿Toda cortesía de owner requiere aprobación admin + agreement? | Sí (equivalente a descuento); admin-origin auto-ACTIVE | G8.3 |
| **D4** | ShortCode: ¿mantener 6 (recomendado) o acortar? | Mantener 6; agregar retry P2002 y mostrarlo | G8.6 |
| **D5** | Studio: ¿campo nuevo `courtesyLabel` o mapear `discountLabel` en `discountValue`? | Campo nuevo + mapeo en render context | G8.7 |

---

## 11. Qué reutilizar / qué NO crear

**Reutilizar:** `GastroDiscount`, `GastroCourtesyCampaign`, `GastroDiscountClaim(COURTESY)`, `GastroDiscountTemplate` + Studio + `DiscountTemplateRenderer`, `ScannerGastroDiscountService`, `AdminGastroService.approve/reject`, `BenefitCommercialAgreement` (solo gate), `BenefitSettlement*`, `CourtesyCreditLedgerEntry`, `GastroLifecycleNotificationsService`, `allocateGastroClaimShortCode`, plantillas `GASTRO_DISCOUNT_QR_COURTESY`.

**NO crear:** `CourtesyCoupon`, segundo Studio/template engine, segundo scanner/validador, tabla de shortcodes, `agreementId`/snapshot en la cortesía, estados persistidos nuevos para pago, enlace Settlement → Discount/Campaña, mezcla con `CourtesyGrant`.

## 12. Migrations / schema

**Probablemente NINGUNA** (Opción A). Candidatos solo si la implementación lo exige — y **se detiene antes de crearla**:

| Candidato | Cuándo | Riesgo |
|---|---|---|
| `GastroCourtesyCampaign.updatedAt` | si se versiona edición de campaña | bajo, nullable/default |
| Columnas de recipients en campaña | solo Opción B | medio; backfill de campañas existentes = n/a |
| Valores de enum `GastroDiscountClaimStatus` | solo si no alcanza `CANCELLED` | medio (enum Postgres) |

Sin cambios de schema necesarios para: shortCode (string libre `@unique`), Studio (`elementsJson` + enum de campos en `packages/shared`), agreement gate, estado de aprobación (enum existente), `courtesyLabel`.

## 13. Riesgos

1. **Económico (F1/F2):** hoy hay cortesías canjeadas que pueden estar en liquidaciones. Antes de cambiar elegibilidad, auditar datos reales (no hay DB local) y decidir qué pasa con liquidaciones ya generadas (los snapshots de allocation son inmutables).
2. **Compatibilidad:** cortesías ya enviadas en producción están `ACTIVE` sin aprobación; el nuevo gate no debe invalidarlas retroactivamente.
3. **Seguridad F4:** master QR en cortesías; corregir antes de exponer reactivación en UI de cortesías.
4. **Hotspot de ruta genérica:** el edit/status genéricos aplican a cortesías; hay que ramificar por `visibility`, no duplicar endpoints.
5. **Tests:** no hay DB local → aislamiento por filas reales sigue como NOT RUN; los slices deben apoyarse en predicados puros + tests de fuente, y documentar el gap.
6. **QR de terceros** (`qrserver`) y emails: fuera de alcance, riesgo conocido.

---

## 14. Roadmap G8 recomendado (reconstruido sobre el repo)

El repo demuestra que **un solo Studio** sirve a descuento y cortesía, y que el **canje** ya está correcto: la estructura propuesta se reorganiza (Studio unificado, scanner = verificación + tests, y se agrega un slice de *hardening* previo porque hay bugs reales en lo existente).

| Slice | Tema | Contenido | Schema |
|---|---|---|---|
| **G8.1** | Hardening + profile scope | B1 selector de local en `/gastro/descuentos/cortesia`; B2 coerce boolean; B6 `validFrom<validTo`; B7 guard `publicEventId`; B8 `createdByOrigin/UserId`; exponer `visibility` y datos de campaña en la respuesta; badge/filtro en listado owner | NINGUNO |
| **G8.2** | Aislamiento de lifecycle | F4 nunca `qrToken` en `COURTESY_ONLY` (reactivación + scanner master rechaza); B3 bloquear `type/value` y sincronizar campaña al editar; excluir cortesías del aviso "vencido" y de contadores; cancelar campaña ⇒ claims `CANCELLED` | NINGUNO |
| **G8.3** | Approval + agreement | Opción A: owner → `PENDING_REVIEW` + claims retenidos; reutilizar approve/reject + agreement gate; admin-origin auto-ACTIVE; sin retroactividad sobre cortesías ya activas | NINGUNO (esperado) |
| **G8.4** | Claims / entrega | Entrega post-aprobación idempotente; reenvío de fallidos; resumen robusto ante errores parciales (B5); `/me` oculta claims de padre no activo; respuesta de envío con shortCodes | NINGUNO |
| **G8.5** | Scanner | Verificación + tests: cortesía A no se valida en local B (QR y shortCode); master token rechazado; resultado indica "Cortesía"; sin cambiar la validación | NINGUNO |
| **G8.6** | ShortCode | Retry P2002; mantener largo 6 (D4); mostrar en card/email/`/me`; formato legacy >6; tests de colisión y legacy | NINGUNO |
| **G8.7** | Studio unificado (descuento + cortesía) | D5: `courtesyLabel`/mapeo; `renderContext` en `/me` y claim page; fin del `0%`; preset de cortesía; acceso al Studio desde el flujo; arreglar typo de ruta admin (B4) | NINGUNO |
| **G8.8** | Emails y notificaciones | Aprobada/rechazada para cortesía (reutiliza `GASTRO_LIFECYCLE`); shortCode en email de cortesía; `audit-labels`; `sendQrEmail` admin consciente de cortesías | NINGUNO |
| **G8.9** | Portal Gastro | Listado/detalle de campañas por local, métricas (`courtesyClaims`), cancelar/reenviar, estados | NINGUNO |
| **G8.10** | Admin | Cola de revisión con badge/filtro cortesía, aprobar con agreement visible, detalle de campaña, panel QR/preview sin qrToken, mensaje en envío financiado | NINGUNO |
| **G8.11** | Accounting | Según D1: elegibilidad por `claim.type`, reversa del débito (F5, vía `REVERSAL`), reporte coherente, **auditar datos reales antes**; cambio de semántica G5/G6 solo con autorización | NINGUNO (esperado) |
| **G8.12** | Tests | Cross-profile, tenant, aprobación/agreement, economía de cortesía financiada vs no | — |
| **G8.13** | QA + docs | Checklist browser, cierre | — |

**Orden/dependencias:** G8.1 y G8.2 son independientes de las decisiones D1–D5 y se pueden hacer primero. G8.3 requiere D3 (y D2). G8.6 requiere D4. G8.7 requiere D5. G8.11 requiere D1.

**Fuera de G8:** QR server-side / quitar `qrserver`, PDF de cupón, upload privado de comprobantes (G7.12), G9.
