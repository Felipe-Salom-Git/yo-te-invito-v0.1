# V3.3 — Etapa 6 — Cierre técnico QR Studio (Descuentos Gastro)

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al cierre de código:** `feb6d1b` (`feat(v3.3): add qr studio presets and admin preview`)  
**Auditoría:** [`V3_3_STAGE_6_QR_STUDIO_AUDIT.md`](./V3_3_STAGE_6_QR_STUDIO_AUDIT.md)

Contextos globales (`AI_ENTRYPOINT.md`, `NEXT_CHAT_HANDOFF.md`, `PROJECT_CONTEXT.md`, `BACKEND_CONTEXT.md`, `FRONTEND_CONTEXT.md`, `CONTEXT_PENDIENTES.md`) y checklist V3.3 **no** se actualizan en este cierre. Pendiente revisión humana.

---

## 1. Objetivo

Editor visual (inspiración Canva, **sin** Canva.com/API/iframe) para cupones QR de `GastroDiscount`.

Separación estricta:

| Presentación | Seguridad / lifecycle |
|--------------|------------------------|
| posición, tamaño, capas, fondo, tipografía, bindings | payload QR, `qrToken`, `shortCode` valor, claim, expiry, Scanner, `pendingUpdate` |

Etapa 5 no se reabrió.

---

## 2. Arquitectura elegida

**Opción A:** modelo Prisma nuevo `GastroDiscountTemplate` (1 `GastroDiscount` → 0..1 template).

**No** se reutilizó el modelo `TicketTemplate` (ligado a `TicketType` / productora / `holderName` / data URLs).  
**No** se creó `VisualTemplate` Prisma genérico (prematuro para Etapa 7).

Se reutilizó **comportamiento** de Ticket Canvas:

| Reutilizado | No tocado / no reutilizado |
|-------------|----------------------------|
| Primitivos shared: rects 0–1, tipos de capa, style, zona QR, márgenes 0.04, min QR 0.18 | `TicketTemplate` Prisma |
| `TicketQrImage` + `buildTicketQrImageUrl` | `TicketStudioClient` |
| Drag pointer + inspector (mismo patrón UX) | Bindings de ticket |
| Print browser (`window.print`) | data URL persistido |
| GCS `POST /uploads/public-image` | Librería canvas nueva |

Renderer de cupón: `DiscountTemplateRenderer` (helpers de ticket: `ticketTextShadowCss`, `qrPixelSizeFromZone`, `anyElementHitsQr`). No se extrajo un `VisualTemplateRenderer` genérico: el motor de tickets sigue en `TicketTemplateRenderer`.

---

## 3. Slices

| Slice | Objetivo | Estado | Commit |
|-------|----------|--------|--------|
| 6.0 | Auditoría Ticket Canvas / diseño QR | ✅ | `4f3b07f` |
| 6.1 | Contrato visual reusable (schema + presets + bindings) | ✅ | `c228827` |
| 6.2 | Persistencia `GastroDiscountTemplate` + API | ✅ | `19bc163` |
| 6.3 | Renderer + fallback + tests de bindings | ✅ | `214e4d9` |
| 6.4 | QR Studio UI + CTA Gastro | ✅ | `409da5e` |
| 6.5 | Integración claim `/me/descuentos` + reclamo público | ✅ | `47a9357` |
| 6.6 | Presets en UI (ya en 6.1) + preview Admin | ✅ | `feb6d1b` |
| 6.7 | Hardening / cierre técnico | ✅ | `b3a0905` |
| 6.7b | Hardening campos canónicos visibles | ✅ | (commit `fix(v3.3): harden gastro qr studio canonical content`) |

Copy desde otro descuento del mismo perfil: **diferido**.

---

## 4. Prisma

**Modelo:** `GastroDiscountTemplate`

| Campo | Notas |
|-------|--------|
| `id` | cuid |
| `tenantId` | FK Tenant |
| `gastroDiscountId` | `@unique` — 1:0..1 |
| `name` | etiqueta de diseño |
| `canvasWidth` / `canvasHeight` | px lógicos (240–900) |
| `backgroundType` | `SOLID` \| `IMAGE` |
| `backgroundValue` | hex/rgba o URL HTTPS |
| `elementsJson` | capas (máx. 40) |
| `qrZoneJson` | zona QR **fuera** de elements |
| `version` | incrementa en PUT |
| `createdByUserId` / `updatedByUserId` | `onDelete: SetNull` |

**Relación:** `GastroDiscount.visualTemplate` ↔ `GastroDiscountTemplate.discount` `onDelete: Cascade`.

**Migración:** `apps/api/prisma/migrations/20260831150000_gastro_discount_visual_template/migration.sql`

**Aplicada contra PostgreSQL local:** **NO EJECUTADO** (sin Docker/DB).

No hay `GastroDiscountClaimTemplate`. El template pertenece al descuento; cada claim aporta datos dinámicos.

---

## 5. Template contract

### Canvas

- Ancho/alto 240–900  
- `backgroundType` SOLID / IMAGE  
- IMAGE: solo HTTPS (sin data URL / http)

### Element types

`TEXT` | `IMAGE` | `LOGO` | `DYNAMIC` | `DIVIDER` | `SHAPE`

**No** existe tipo de capa `QR`. El QR es `qrZoneJson` separado.

### Bindings (`fieldKey`)

`gastroName` | `discountTitle` | `discountValue` | `discountValidity` | `shortCode`

### Límites (reutilizados de Ticket Canvas)

| Límite | Valor |
|--------|-------|
| Elementos | 40 |
| Texto | 2000 |
| URL HTTPS | 2048 |
| QR min w/h | 0.18 (servicio; schema 0.14) |
| Margen QR | 0.04 |
| Capas ∩ QR | rechazado en compile |

Upsert DTO: `.strict()` — rechaza `discountId`, `claimId`, `qrToken`, `shortCode`, `tenantId`, `gastroProfileId`.

### Campos canónicos obligatorios (hardening)

Un template custom **no se guarda** (y un JSON ya persistido **no se renderiza**) si falta alguno de:

| Requisito | Validación |
|----------|-----------|
| Zona QR scannable | `assertVisualQrZoneSafe` — min 0.18, margen 0.04, sin overlap |
| `discountValue` DYNAMIC visible | binding real `GastroDiscount.type` + `value` |
| `shortCode` DYNAMIC visible | valor de `GastroDiscountClaim.shortCode` en claim; dummy solo en Studio |
| `discountTitle` DYNAMIC visible | título canónico del descuento |

Visibilidad mínima (solo campos canónicos): ancho ≥ 0.20, alto ≥ 0.045, `fontSize` ≥ 12, `opacity` ≥ 0.7, dentro del canvas, sin rotación, no tapados por una capa de z-index mayor.

Texto libre (`TEXT`) sigue permitido para copy editorial. No hay detector de porcentajes.

`compileDiscountVisualTemplateDesign` **borra `content` de capas DYNAMIC** para que no quede un valor falso persistido. `resolveDiscountVisualField` no lee `content`.

Templates Etapa 6 anteriores a este hardening (si existieran en DB) sin los bindings: `mapDiscountVisualTemplateRow` → `null` → fallback `GastroDiscountQrCard`.

TicketTemplate **no** hereda estos required fields.

---

## 6. Dynamic fields implementados

| `fieldKey` | Fuente en render real | Studio preview |
|-----------|------------------------|----------------|
| `gastroName` | `GastroProfile.displayName` | nombre del local o demo |
| `discountTitle` | título canónico del descuento | título real o demo |
| `discountValue` | `GastroDiscount.type` + `value` vía `formatDiscountVisualBenefit` | valor real o 20% demo |
| `discountValidity` | vigencia AR existente | vigencia real o demo |
| `shortCode` | **solo** `GastroDiscountClaim.shortCode` | placeholder `ABC-123` |

QR payload: **no** es un `fieldKey`. Se inyecta en render desde `buildGastroDiscountQrPayload(discountId, claim.qrToken)` (me/público) o placeholder en el editor. `TicketQrImage` pinta negro sobre blanco, `margin=14`, `ecc=M`, min 200px. El template no puede cambiar opacidad, colores, rotation ni payload del QR. La zona QR se pinta a `zIndex: 1000` para que ninguna capa la tape.

V1 no incluye email, user id ni nombre de usuario.

Obligatorios en custom template: `discountValue`, `shortCode`, `discountTitle` + zona QR. `gastroName` y `discountValidity` siguen opcionales.

---

## 7. Security

| Invariante | Cómo |
|------------|------|
| QR payload immutable | No hay campo de template para payload. Renderer usa prop `qrPayload` del claim. Compile rechaza texto `yti:gastro-discount:` |
| `qrToken` immutable | No está en el schema; `.strict()` lo rechaza en PUT |
| `shortCode` valor immutable | Binding de render; Studio no edita el valor; compile elimina `content` de DYNAMIC |
| `discountValue` canónico | Siempre `formatDiscountVisualBenefit(type, value)` del `GastroDiscount`; no hay override en template |
| `discountId` / `claimId` / `tenantId` / `gastroProfileId` / `status` | No persistibles en JSON; ownership por URL + tenant server-side |
| HTML/script | No hay tipo HTML. Texto es `string` plano en span. Sin `dangerouslySetInnerHTML` |

Editar el template **no** escribe `GastroDiscount.pendingUpdate`.

---

## 8. Ownership

```
discountId
  → GastroDiscount (tenantId)
  → gastroProfileId
  → GastroOwnershipService.assertCanOperateProfile
```

- Gastro: no se confía en `?profileId=` para autorizar el template.  
- Admin: `Role.ADMIN` saltea membership; el `profileId` de la URL admin debe coincidir con el del descuento.  
- Tenant: siempre el del JWT, nunca del body.

---

## 9. Renderer

1. Si hay template válido + contexto → `DiscountTemplateRenderer`.  
2. Si no hay template / JSON inválido (`mapDiscountVisualTemplateRow` → null) / error de React → `GastroDiscountQrCard` (error boundary).  
3. GET de plantilla corrupta devuelve `{ template: null }` (fallback), no rompe Studio ni claims.

Studio: QR es placeholder blanco; no se pide el token del claim.

Claims existentes (antes de Etapa 6) siguen funcionando: `visualTemplate` null → card estándar.

---

## 10. Ticket Canvas regression

| Pieza | ¿Se tocó? | Validación |
|-------|-----------|------------|
| `TicketStudioClient` / Canvas | **No** | estático |
| `TicketTemplateRenderer` / buyer | **No** | estático |
| `ticket-template.schema.ts` | Reexporta primitivos visuales; data URLs de ticket **siguen** permitidas | `test:ticket-template-schema` **PASS** |
| `ProducerTicketTemplateService` | **No** | — |

QR como `type: 'QR'` en elements sigue rechazado por enum (tickets y gastro).

---

## 11. Routes

### Backend

```
GET/PUT/DELETE /gastro/discounts/:id/visual-template
GET/PUT/DELETE /admin/gastronomicos/:profileId/descuentos/:discountId/visual-template
```

PUT: `ZodValidationPipe(upsertGastroDiscountVisualTemplateDtoSchema)`.

Claims:

- `GET` me gastro discounts: incluye `visualTemplate` mapeado o null + `discountType`/`discountValue`/`shortCode`.  
- `GET` public claim view: igual.

### Frontend

```
/gastro/descuentos/[id]/qr-studio
```

CTA **Diseñar QR** desde detalle Gastro.  
Admin: preview en detalle del descuento (sin editor propio; PUT admin existe por API).

Arquitectura web: UI → TanStack Query → `GastroRepo` / `AdminGastroRepo` → `ApiRepository`. Sin fetch directo en componentes.

---

## 12. GCS

`POST /uploads/public-image`  
- Scope: `gastro`  
- `entityId`: `GastroProfile.id`  
- Purposes: `gallery` (fondo), `logo` (logo/imagen)  
- Solo HTTP(S) público existente. Sin bucket nuevo. Sin data URL. Orphans: misma deuda que el resto de uploads.

---

## 13. Presets

Constantes versionadas (no tabla Prisma). Al aplicar: copia JSON → editable.

| Id | Label |
|----|--------|
| `classic` | Clásico |
| `minimal` | Minimal |
| `premium` | Premium |
| `promo` | Promoción |

**Restablecer diseño:** DELETE del custom → fallback `GastroDiscountQrCard` / default design en Studio. Confirmación en UI.

---

## 14. Admin

- Preview del template custom (o copy de fallback estándar).  
- API PUT/DELETE disponible con `Role.ADMIN`.  
- Sin biblioteca global / marketplace.  
- Descuentos `createdByOrigin=ADMIN`: mismo flujo (fallback primero, Studio opcional).

---

## 15. Builds

| Target | Resultado |
|--------|-----------|
| `pnpm --filter shared run build` | PASS |
| `pnpm --filter api run build` | PASS |
| `pnpm --filter web run build` | PASS (`/gastro/descuentos/[id]/qr-studio` en el tree) |
| `pnpm --filter scanner run build` | PASS |
| `pnpm --filter api exec prisma validate` | PASS |

Scanner: **sin cambios de código**.

---

## 16. Tests

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter api run test:ticket-template-schema` | PASS |
| `pnpm --filter api run test:discount-visual-template` | PASS |
| `pnpm --filter api run test:gastro-discount-visual-persist` | PASS (contrato, sin DB) |
| `pnpm --filter api run test:discount-visual-render` | PASS |
| `pnpm --filter api run test:gastro-discount-qr` | PASS |
| `pnpm --filter api run test:scanner-manual-short-code` | PASS |
| `pnpm --filter api run test:gastro-discount-scan` | **NO EJECUTADO — PostgreSQL no disponible** (`localhost:5433`) |

Ownership cross-tenant / otro perfil: cubierto a nivel de servicio (mismo `assertDiscountAccess` que descuentos). Tests HTTP con DB: no ejecutados.

---

## 17. DB smoke

**NO EJECUTADO — PostgreSQL/Docker no disponible**

Migración `20260831150000_gastro_discount_visual_template` pendiente de aplicar en el entorno con DB.

---

## 18. QA manual

**PENDIENTE — acumulado cierre global V3.3**

Checklist sugerido:

- crear / editar / guardar template; reload persiste  
- preset; restablecer (confirmación)  
- fondo color/imagen; logo GCS; texto libre; campos dinámicos  
- QR no menor al mínimo; no tapar QR  
- scan físico del QR de un claim (payload Etapa 5 intacto)  
- shortCode visible y no editable como valor  
- mobile: preview + preset + guardar; copy de drag desktop  
- claim existente (sin template) y claim nuevo (con template)  
- template missing / inválido → fallback card  
- admin preview; multi-local / cross-profile (403)  
- imprimir cupón (browser print)

---

## 19. Riesgos / deuda reales

- Migración no aplicada localmente.  
- Copy-from-otro-descuento **diferido**.  
- Export PNG/PDF server-side **diferido** (print browser sí).  
- Admin no tiene UI de editor (sí API).  
- Emails de claim no renderizan el template visual (QR payload igual).  
- Tests de ownership HTTP / scan DB no corridos.  
- Autosave y versionado de template: no implementados (igual Ticket Studio).  
- Resize por handles: no; hay drag + inputs numéricos + flechas de teclado.

---

## 20. Commits (Etapa 6)

```
4f3b07f docs(v3.3): audit gastro qr studio architecture
c228827 refactor(v3.3): extract reusable visual template primitives
19bc163 feat(v3.3): add gastro discount visual templates
214e4d9 feat(v3.3): render gastro discount qr templates
409da5e feat(v3.3): add gastro discount qr studio
47a9357 feat(v3.3): use discount templates in qr claims
feb6d1b feat(v3.3): add qr studio presets and admin preview
b3a0905 docs(v3.3): close gastro qr studio stage
```

(más el commit de hardening canónico de este pre-cierre)

---

## 21. Git al cierre documental

```
branch = feat/v1-s03-api-foundation
NO PUSH
```

Working tree esperado: clean tras el commit de este archivo.
