# Roadmap — Alineación Productora con Demo

**Objetivo:** Incorporar lo faltante de la demo sin modificar lo que el proyecto actual tiene más completo.

**Referencias:** `COMPARATIVA_PRODUCTORA_DEMO_VS_ACTUAL.md`, `PROJECT_RULES.md`, `AI_WORKFLOW_RULES.md`

---

## Principios

- **No modificar** lo ya más completo en el proyecto actual (sidebar, repositorios, API existente, cortesías).
- **Reutilizar** componentes existentes (`Card`, `Button`, `Badge`, `Modal`, `Input`).
- **Respetar** arquitectura: repositorios, validación Zod, capas API.

---

## Fase 1 — Asignación de referidos (estilo demo)

La demo asigna **referidos asociados a la productora** a eventos: lista de referrers con checkboxes, guardar selección.

### 1.1 API

| Endpoint | Descripción |
|----------|-------------|
| `GET /producer/referrers` | Lista usuarios REFERRER del tenant (para asignar a eventos) |
| `GET /events/:eventId/referral-links` | Ya existe; incluir `referrerId` en cada link para saber quién está asignado |
| `PUT /events/:eventId/referrals` | Body: `{ referrerIds: string[] }`. Crear links para nuevos, eliminar para quitados. Código auto si falta. |

### 1.2 Frontend

- Página `/producer/events/[eventId]/referrals`: sección **Asignar referidos al evento**.
- Lista de referrers con checkboxes (estilo demo).
- Botón "Guardar asignación" llama a PUT.
- Mantener creación manual de links (código + label) como secundario.

---

## Fase 2 — Tandas (prioridad alta)

La demo carga tandas en el formulario de creación y las muestra en tabla con progreso.

### 2.1 Crear evento con tandas

- **Modal crear evento**: añadir sección "Tandas de venta" con campos por tanda (nombre, precio, cupo).
- Botón "+ Agregar tanda".
- Validación: suma de cupos ≤ capacidad total (si se define capacidad).
- Al crear evento: `POST /producer/events` y luego `POST .../ticket-types` por cada tanda (o batch si existe).

### 2.2 Detalle evento — Tabla de tandas

- Tabla con columnas: Nombre, Precio, Cupo, Vendidas, Disponibles, Progreso (barra).
- Usar `repos.events.getTicketTypes` y métricas para vendidas.
- Mantener formulario de crear tanda existente.

### 2.3 API (si hace falta)

- `POST /producer/events/:eventId/ticket-types/batch` — crear múltiples tipos en una llamada (opcional, para simplificar).

---

## Fase 3 — UX Dashboard y lista

Sin tocar lógica de datos existente.

### 3.1 Dashboard productor

- Summary cards: Eventos Activos, Próximos, Pasados (además de KPIs actuales).
- Agrupación por ciclo de vida (startAt) en grids.
- Componente `ProductoraEventCard`: nombre, fecha, ubicación, badge estado, vendidas, ingresos, link.
- Empty state con CTA "Crear tu primer evento".
- CTA "+ Crear evento" más destacado.

### 3.2 Lista de eventos

- Badge de estado en cada card.
- Mostrar capacidad (X / total) si el API lo devuelve.
- Layout `max-w-5xl` → `max-w-7xl` si se usan grids de 3 columnas.

### 3.3 Detalle evento

- Badge de estado en header.
- Ventas por origen (general, referido, cortesía) si el modelo lo permite.

---

## Orden de ejecución

| # | Tarea | Archivos principales |
|---|-------|----------------------|
| 1 | API: GET /producer/referrers | referrals, admin-users |
| 2 | API: PUT /events/:id/referrals | referrals.service, controller |
| 3 | Incluir referrerId en list referral-links | referrals.service |
| 4 | UI: asignación referidos en referrals page | producer/events/[id]/referrals |
| 5 | Tandas en modal crear evento | producer/events page, event form |
| 6 | Tabla tandas en detalle evento | producer/events/[eventId]/page |
| 7 | Dashboard: cards ciclo vida, ProductoraEventCard | producer/page, components |
| 8 | Badge estado en lista y detalle | producer/events/* |

---

## Archivos a crear/modificar

- `apps/api/src/modules/referrals/` — referrers list, assign endpoint
- `apps/api/src/modules/producer/` — referrers controller si aplica
- `apps/web/app/(portal)/producer/events/[eventId]/referrals/page.tsx`
- `apps/web/app/(portal)/producer/events/page.tsx` — tandas en modal
- `apps/web/app/(portal)/producer/events/[eventId]/page.tsx` — tabla tandas, badge
- `apps/web/app/(portal)/producer/page.tsx` — dashboard
- `apps/web/components/producer/ProductoraEventCard.tsx` (nuevo)
- `apps/web/lib/eventCycleHelpers.ts` — isEventPast, isEventActive, isEventFuture

---

## Reglas

- Sin nuevas librerías.
- Archivos < 400 líneas.
- Documentación actualizada en `FRONTEND_DEMO_NOTES.md` tras cambios.
