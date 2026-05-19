# Ticket Canvas Studio (plantilla visual por tipo de ticket)

Documento de contexto para el **editor de diseño** del ticket digital: metadatos persistidos por `TicketType`, preview en el portal productor, validación en API. **No** sustituye aún el render final del ticket en app comprador/emisión; el QR y el flujo de scanner no cambian.

---

## 1. Ruta y alcance (web)

| Ruta | Rol |
|------|-----|
| `/producer/events/[eventId]/ticket-types/[ticketTypeId]/design` | **Ticket Canvas Studio** — edición de plantilla |

- Layout productor: ancho acotado (`max-w-7xl` en layout + `PageContainer` en la página de diseño).
- UI en tres columnas (desktop): **Capas** | **Vista previa** | **Panel derecho** (según pestaña).
- Pestañas superiores: **Configuración general** | **Fondo** | **Capas**. Al seleccionar una capa o la zona QR, el panel derecho puede enfocarse en **Capas** automáticamente.

---

## 2. API (producer)

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/producer/events/:eventId/ticket-types/:ticketTypeId/ticket-template` | Obtener plantilla o `null` |
| `PUT` | mismo path | Upsert (`upsertTicketTemplateDtoSchema`) |
| `DELETE` | mismo path | Quitar plantilla guardada (vuelve al diseño base en UI) |

Implementación: `ProducerTicketTemplateController` + `ProducerTicketTemplateService`. Validación de `elementsJson` con Zod desde `@yo-te-invito/shared`.

---

## 3. Modelo de datos (Prisma)

- **`TicketTemplate`**: `tenantId`, `name`, `canvasWidth`, `canvasHeight`, `backgroundType` (`SOLID` \| `IMAGE`), `backgroundValue`, `elementsJson`, `qrZoneJson`, `version`, timestamps.
- **`TicketType.ticketTemplateId`**: opcional, relación 1:1 con plantilla (`onDelete: SetNull` en tipo de ticket).

---

## 4. Contratos compartidos (`packages/shared`)

Archivo: `src/schemas/ticket-template.schema.ts`.

- Tipos de elemento: `TEXT`, `IMAGE`, `LOGO`, `DYNAMIC`, `DIVIDER`, `SHAPE`.
- Rectángulos normalizados (0–1): `x`, `y`, `w`, `h`, `zIndex`.
- **`style`** (objeto estricto opcional por elemento), campos relevantes para texto:
  - `fontSize`, `color`, `fontWeight`, `textAlign`, `opacity`, `borderRadius`
  - `backgroundColor` — fondo del **rectángulo de la capa** (útil detrás de texto sobre imagen; admite hex o `rgba(...)` hasta 48 caracteres)
  - `textShadow` — `'none' \| 'subtle' \| 'medium' \| 'strong'` (legibilidad sobre foto de fondo)
- Campos dinámicos: `TICKET_TEMPLATE_DYNAMIC_FIELD_KEYS` (`eventName`, `eventDate`, `holderName`, `orderCode`, etc.).
- Zona QR: `ticketTemplateQrZoneSchema` + constante `TICKET_TEMPLATE_DEFAULT_QR_ZONE`.

Tras cambiar el esquema, ejecutar **`pnpm --filter @yo-te-invito/shared build`** para regenerar `dist` y tipos que consume `apps/web`.

---

## 5. Frontend — piezas principales

| Área | Ubicación |
|------|-----------|
| Página | `apps/web/app/(portal)/producer/events/[eventId]/ticket-types/[ticketTypeId]/design/page.tsx` |
| Shell del editor | `components/producer/ticket-studio/TicketStudioClient.tsx` |
| Canvas / preview | `TicketStudioCanvas.tsx` — escala por lado corto del ticket; **vertical** ~210px lado corto (preview más baja que antes); **horizontal** ~368px |
| Orientación / tamaños | `lib/producer/ticket-studio-layout-presets.ts`, `ticket-studio-orientation.ts` |
| Defaults y estado | `lib/producer/ticket-studio-defaults.ts` |
| Reglas QR (cliente) | `lib/producer/ticket-studio-qr-rules.ts` |
| Sombra de texto (CSS) | `lib/producer/ticket-studio-text-shadow.ts` |
| Color + hex | `components/producer/ticket-studio/StudioColorField.tsx` |
| Repositorio | `repositories/interfaces.ts` → `ticketTemplates`; implementación `ApiRepository` |
| Query keys | `lib/query/keys.ts` → `ticketTemplateKeys` |

### UI densa (estudio)

- `Input` / `Select` con `density="dense"` en el estudio.
- Botones de acciones de capas con `Button` `size="xs"`; guardar/restaurar con `size="sm"`.
- Patrón reutilizable en otros formularios del portal si hace falta.

---

## 6. Documentos relacionados

- `docs/tickets/TICKET_TEMPLATE_QR_ZONE.md` — márgenes, mínimos, intersección capa/QR.
- `docs/tickets/TICKET_STUDIO_LAYOUT_PRESETS.md` — portrait vs landscape y presets de tamaño.

---

## 7. Recordatorio de producto

Hasta que un **renderizador server-side o cliente** consuma `TicketTemplate`, los tickets en **Mis tickets** / QR pueden seguir el diseño previo. El estudio **sí** persiste y valida el JSON para uso futuro.
