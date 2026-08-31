# V3.3 — Etapa 6 — Auditoría QR Studio (Descuentos Gastro)

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**HEAD al auditar:** `76f576b` (`docs(v3.3): close gastro discounts stage context`)  
**Slice:** 6.0 (solo auditoría + decisiones; sin implementación de funcionalidad)

No reaudita V3.3 completa ni reabre Etapa 5. Alcance: Ticket Canvas Studio y extensión mínima para diseño visual de cupones Gastro.

Checklist origen: **D1** — `Yo_Te_Invito_Checklist_V3_3_Funcional_Operativa.md` § D.

---

## 1. Estado real — Ticket Canvas

### 1.1 Persistencia

Modelo Prisma `TicketTemplate` (1:1 opcional vía `TicketType.ticketTemplateId`, `onDelete: SetNull`):

| Campo | Uso |
|-------|-----|
| `tenantId` | aislamiento |
| `name` | etiqueta de diseño |
| `canvasWidth` / `canvasHeight` | px lógicos (240–900) |
| `backgroundType` | `SOLID` \| `IMAGE` |
| `backgroundValue` | hex, URL o **data URL** (estudio tickets) |
| `elementsJson` | capas (máx. 40) |
| `qrZoneJson` | rectángulo QR **fuera** de `elementsJson` |
| `version` | incrementa en cada PUT |

No hay historial de versiones, undo server-side ni marketplace.

### 1.2 Schema (`packages/shared/src/schemas/ticket-template.schema.ts`)

- Tipos de capa: `TEXT`, `IMAGE`, `LOGO`, `DYNAMIC`, `DIVIDER`, `SHAPE`. **No** existe tipo `QR` en capas (el QR es zona separada).
- Rectángulos **normalizados 0–1**, origen arriba-izquierda.
- Campos dinámicos ticket-only: `eventName`, `eventDate`, `venueName`, `city`, `holderName`, `orderCode`, `ticketTypeName`, `batchName`, `ticketId`, `disclaimer`.
- `content` = texto libre (máx. 2000). `fieldKey` = binding dinámico.
- Imágenes: HTTPS **o** `data:image/...` (hasta 500 000 chars) — pensado para preview local del estudio de tickets.

Zona QR schema: `w`/`h` mín. **0.14**. API endurece a **0.18** + margen `0.04` (`ProducerTicketTemplateService`).

### 1.3 API

```
GET/PUT/DELETE /producer/events/:eventId/ticket-types/:ticketTypeId/ticket-template
```

Ownership: event `producerId` o `ADMIN`. Validación Zod + reglas QR (margen, tamaño mín., **ningún elemento intersecta zona QR**).

Payload QR del ticket (`yti:v1:…`) **nunca** se persiste en la plantilla.

### 1.4 Editor UI

| Pieza | Acoplamiento |
|-------|----------------|
| `TicketStudioClient` | `ticketTemplateKeys`, `TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS`, tipos de ticket |
| `TicketStudioCanvas` | drag pointer; placeholder QR; tipos `TicketTemplateElement` |
| Preview comprador | `TicketTemplateRenderer` + `resolveBuyerDynamicField` |
| Fallback | `DefaultBuyerTicket` si no hay plantilla o parse falla |
| Print | `@media print` en `globals.css` + CTA «Imprimir ticket» |
| Export PNG/PDF server | **no existe** — print del browser |

Drag: pointer events (desktop). Resize de zona QR: clamp cliente + validación API. Autosave: **no** (Guardar explícito). Undo: **no**.

### 1.5 GCS

`POST /uploads/public-image` — scopes existentes incluyen `gastro` + purposes `cover` | `gallery` | `logo` | `content`. **No** hace falta bucket nuevo. Scope `gastro` + `entityId` = `GastroProfile.id`.

---

## 2. Por qué no reutilizar el modelo `TicketTemplate`

`TicketTemplate` está ligado a:

- `TicketType` / evento / productora
- Bindings de comprador (`holderName`, `orderCode`, `ticketId`)
- data URLs persistibles (inaceptable para Gastro V1: Etapa 6 prohíbe base64 persistido)
- Ownership productor, no `GastroOwnershipService`

Forzar Gastro en la misma tabla mezclaría tenants/roles y rompería 1:1 `ticketTypeId`.

**Opción B (generalizar TicketTemplate) — rechazada.**  
**Opción C (VisualTemplate Prisma genérico + dos hijos) — prematura** para Etapa 6; Etapa 7 (Actividades) puede reutilizar schema/renderer, no el modelo Gastro.

### Arquitectura elegida — Opción A

```
GastroDiscountTemplate   (Prisma, 1:0..1 por GastroDiscount)
        │
        └── design JSON validado por schema shared
              (primitives visuales extraídas de TicketTemplate)
```

Reutilizar **comportamiento**, no el modelo:

| Reutilizar | No reutilizar |
|------------|----------------|
| Rects 0–1, zIndex, style, tipos de capa | Modelo `TicketTemplate` |
| Zona QR separada + márgenes/mínimos | Bindings de ticket |
| Regla: capas no tapan QR | data URL persistido |
| Layout editor 3 columnas | Ownership productor |
| Renderer absoluto % + `TicketQrImage` | `TicketStudioClient` tal cual |
| Print browser | Canva.com / librería canvas nueva |

---

## 3. Decisiones Etapa 6

### 3.1 Scope del template

**1 `GastroDiscount` → 0..1 `GastroDiscountTemplate`.**

Motivo: ownership ya resuelto por `discountId`; cada promo puede tener diseño propio; sin override perfil/descuento.

Copy desde otro descuento del mismo perfil: **diferido** (presets cubren el arranque). Si se agrega después: snapshot independiente (como Etapa 4).

### 3.2 Presentación vs seguridad

El JSON **no** puede contener ni override:

`discountId`, `claimId`, `qrToken`, `qrPayload`, `shortCode` valor, `tenantId`, `gastroProfileId`, `status`.

QR renderizado = `buildGastroDiscountQrPayload(discountId, claim.qrToken)` (o placeholder seguro en el editor).  
Short code = `GastroDiscountClaim.shortCode` en render real; preview editor usa dummy (`ABC-123`).

Editar el template **no** escribe `GastroDiscount.pendingUpdate`. No re-aprobación comercial.

### 3.3 Bindings dinámicos V1

| `fieldKey` | Fuente |
|------------|--------|
| `gastroName` | `GastroProfile.displayName` |
| `discountTitle` | `displayTitle` / título canónico |
| `discountValue` | `type` + `value` formateados (nunca texto manual que sustituya el beneficio) |
| `discountValidity` | vigencia AR existente |
| `shortCode` | claim (render) / placeholder (studio) |

Texto libre `TEXT`: copy decorativo limitado (máx. 2000, igual tickets). No sustituye bindings canónicos.

V1 **no** incluye email, user id, nombre de usuario.

### 3.4 Fallback

Sin template o JSON inválido o error de render → `GastroDiscountQrCard` actual. **Nunca** ocultar un QR válido.

Preset “producto” (Clásico) = JSON constante versionado, no fila Prisma. Restablecer = DELETE del custom → fallback.

### 3.5 Moderación visual

V1: sin workflow extra. Texto libre permitido; beneficio/QR/shortCode siempre vienen de bindings/zona QR (no editables como payload).

### 3.6 Admin

GET/PUT/DELETE del template con `Role.ADMIN` (mismo servicio, `assertCanOperateProfile` ya admite admin). Preview en detalle admin. Sin biblioteca global.

Descuentos `createdByOrigin=ADMIN` usan el mismo flujo (fallback primero).

### 3.7 Mobile

Editor completo: desktop/tablet. Mobile: preview + presets + guardar; copy si drag es limitado. No bloquear lo básico.

### 3.8 Dependencias

**Ninguna librería nueva de canvas.** Reutilizar pointer-drag del estudio de tickets. QR display: `TicketQrImage` / `api.qrserver.com` existente. Sin estilos de QR (logos en módulos, degradados).

### 3.9 Export

V1: visualizar + **imprimir / PDF desde el browser**. PNG/PDF server-side: **diferido**.

### 3.10 Copy template entre descuentos

**Diferido** (no bloquea V1). Presets = punto de partida.

---

## 4. Modelo Prisma propuesto (no implementado en 6.0)

```
GastroDiscountTemplate
  id
  tenantId
  gastroDiscountId   @unique
  name
  canvasWidth / canvasHeight
  backgroundType / backgroundValue   // SOLID hex | IMAGE https (no data URL)
  elementsJson
  qrZoneJson
  version
  createdAt / updatedAt
  createdByUserId?  onDelete: SetNull
  updatedByUserId?  onDelete: SetNull
```

Relación: `GastroDiscount.visualTemplate` 1:0..1. `onDelete: Cascade` al borrar el descuento (presentación, no trazabilidad de claims). Deep Delete de User: SetNull en creator/updater. **No** modificar `AdminDeepDeleteService` más allá de lo que Cascade ya cubre.

Migración nueva (después de `20260831140000_gastro_discount_v3_lifecycle`).

---

## 5. API propuesta

Portal Gastro (ownership: `discountId` → `gastroProfileId` → `assertCanOperateProfile`):

```
GET    /gastro/discounts/:id/visual-template
PUT    /gastro/discounts/:id/visual-template
DELETE /gastro/discounts/:id/visual-template
```

Admin (mismo servicio):

```
GET/PUT/DELETE /admin/gastronomicos/:profileId/descuentos/:discountId/visual-template
```

Tenant siempre del JWT. PUT valida Zod shared (bounds, URLs HTTPS, QR mín., no overlap, máx. elementos).

Audit: `GASTRO_DISCOUNT_TEMPLATE_CREATED` | `UPDATED` | `RESET`.

Claims (`/me/gastro-discounts`, vista pública de reclamo): incluir `visualTemplate` **nullable** (JSON ya validado) + datos de render (`discountType`/`value`, `shortCode`). El cliente **ignora** cualquier payload QR que viniera en el JSON.

---

## 6. Slices (confirmados)

| Slice | Objetivo |
|-------|----------|
| **6.0** | Esta auditoría |
| **6.1** | Primitives visuales shared + schema Gastro + tests de no-regresión TicketTemplate |
| **6.2** | Prisma + API persistencia + ownership/tenant + audit |
| **6.3** | Renderer + fallback + bindings |
| **6.4** | UI `/gastro/descuentos/[id]/qr-studio` |
| **6.5** | Integración `/me/descuentos` + reclamo público |
| **6.6** | Presets + reset + admin preview + mobile copy |
| **6.7** | Hardening + closing técnico |

---

## 7. Riesgos / deuda (pre-implementación)

| Ítem | Tratamiento |
|-------|-------------|
| Ticket schema permite data URL | Gastro **no** lo permite; tickets no se tocan en persistencia |
| Schema QR min 0.14 vs API 0.18 | Gastro alineará schema+API a 0.18; tickets sin cambio de API |
| `audit.ts` shared desfasado vs Prisma | Agregar solo acciones nuevas de template |
| Print físico / scan hardware | QA global V3.3 (igual tickets) |
| Copy-from-other-discount | Diferido |
| PNG export server | Diferido |
| Digest / campañas | Fuera de alcance (Etapa 8) |

---

## 8. Builds 6.0

Sin cambios de código. Validación de que el árbol arranca limpio queda para 6.1 (primer código).
