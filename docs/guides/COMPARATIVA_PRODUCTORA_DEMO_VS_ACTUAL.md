# Comparativa: Pantalla Productora — Demo vs Proyecto Actual

**Referencia:** `docs/context/FRONTEND_DEMO_NOTES.md`, `docs/rules/PROJECT_RULES.md`, `docs/rules/AI_WORKFLOW_RULES.md`

---

## 1. Resumen

| Aspecto | Demo (Yo-Te-Invito Demo) | Actual (yo-te-invito-v0.1) |
|---------|--------------------------|----------------------------|
| **Rutas** | `/productora`, `/productora/eventos`, `/productora/eventos/nuevo`, `/productora/eventos/[id]` | `/producer`, `/producer/events`, modal crear/editar, `/producer/events/[eventId]` |
| **Layout** | Navbar horizontal + `main` centrado | Sidebar lateral (`PortalSidebar`) |
| **Datos** | `useAppStore()` (in-memory / LocalStorage) | `useRepositories()` → API (o LocalRepository) |
| **Crear evento** | Ruta dedicada `/productora/eventos/nuevo` | Modal en `/producer/events` |

---

## 2. Diferencias Enumeradas

### 2.1 Dashboard principal (`/productora` vs `/producer`)

| # | Demo | Actual | Acción sugerida |
|---|------|--------|------------------|
| 1 | **Summary cards por ciclo de vida**: Eventos Activos, Próximos Eventos, Eventos Pasados (por `date`) | **KPIs globales**: Tickets vendidos, Recaudación, Scans, Eventos (total) | Añadir cards por ciclo de vida (activos/próximos/pasados) o sección equivalente |
| 2 | **Header con CTA**: "+ Crear Evento" → `/productora/eventos/nuevo` prominente | "Gestionar eventos" y "Payouts" como links secundarios | CTA principal "+ Crear evento" más destacado en dashboard |
| 3 | **ProductoraEventCard** con: nombre, fecha, ubicación, badge estado, vendidas, ingresos, link "Ver Detalle" | Lista simple con título, métricas, link "Gestionar" (sin badge de estado, sin imagen) | Crear/reutilizar card tipo `ProductoraEventCard` con badge y métricas por evento |
| 4 | **Grids separados** por grupo: Activos, Próximos, Pasados | **Lista única** "Métricas por evento" (top 5) | Implementar agrupación por ciclo de vida (activos, próximos, pasados) |
| 5 | **Empty state** con CTA "Crear tu Primer Evento" | Sin empty state explícito en dashboard | Añadir empty state en dashboard cuando no hay eventos |

### 2.2 Lista de eventos (`/productora/eventos` vs `/producer/events`)

| # | Demo | Actual | Acción sugerida |
|---|------|--------|------------------|
| 6 | **Tabla** con columnas: Evento, Fecha, Ubicación, Capacidad, Estado, Vendidas, Acciones | **Cards** horizontales ( título, ciudad/fecha, botones Gestionar/Editar) | Opción: vista tabla además de cards, o alinear columnas |
| 7 | **Capacidad** visible: "X / capacidad" por evento | No se muestra capacidad en la lista | Mostrar capacidad (si está en el modelo) |
| 8 | **Badge de estado** en cada fila | No hay badge en lista de eventos productor | Añadir badge de estado (DRAFT, PENDING, APPROVED, etc.) |
| 9 | **Ruta nueva evento**: `/productora/eventos/nuevo` (página dedicada) | **Modal** en misma página para crear/editar | Mantener modal (más ágil) o evaluar ruta dedicada según UX |
| 10 | Header "+ Crear Evento" | Botón "Crear evento" | Alinear copy |

### 2.3 Crear evento (`nuevo` vs modal)

| # | Demo | Actual | Acción sugerida |
|---|------|--------|------------------|
| 11 | **Tandas en el mismo formulario** de creación (nombre, precio, cupo por tanda) | Tandas/tipos de entrada se crean **después**, en detalle del evento | Documentar: flujo actual (crear evento → luego tandas) es válido; demo crea evento+tandas en un paso |
| 12 | Campos: name, date, location, capacity | Campos: título, fecha inicio, ciudad, lugar, imagen, dirección, lat/lng | Actual tiene más campos (imagen, ubicación). OK mantener. |
| 13 | Validación: suma de cupos tandas ≤ capacidad | Sin validación explícita en UI | Validar en frontend si se añade creación de tandas en el mismo formulario |

### 2.4 Detalle de evento (`/productora/eventos/[id]` vs `/producer/events/[eventId]`)

| # | Demo | Actual | Acción sugerida |
|---|------|--------|------------------|
| 14 | **Información del evento** en Card (nombre, fecha, ubicación, capacidad) | Sección con título, venue, fecha | Mantener estructura actual; asegurar que todos los datos relevantes se muestran |
| 15 | **Métricas**: vendidas, ingresos, tickets por origen (general, rrpp_a, rrpp_b, cortesía) | Tickets vendidos con filtro ALL/VALID/USED/REVOKED; métricas por evento | Evaluar agrupar tickets por origen (general, referido, cortesía) si el modelo lo soporta |
| 16 | **Modal Cortesía** para generar tickets de cortesía (buyerName, dni, type) | Ruta `/producer/events/[id]/courtesies` | Actual ya tiene módulo cortesías; verificar que el flujo sea equivalente |
| 17 | **Tabla de tickets** con opción revocar | Lista de tickets con filtros | Comprobar que revocación está disponible |
| 18 | Badge de estado grande en header | No hay badge en detalle | Añadir badge de estado en header del detalle |
| 19 | **Tandas** editables en detalle | Tipos de entrada (tandas) en sección "Tandas / Tipos de entrada" con creación | Estructura similar; confirmar que CRUD de tandas está completo |
| 20 | Links a referidos y contenido dentro del detalle | Links Courtesías, Referidos, Payouts | Actual tiene más opciones; alinear navegación |

### 2.5 Layout y navegación

| # | Demo | Actual | Acción sugerida |
|---|------|--------|------------------|
| 21 | **Navbar** horizontal (igual que home/admin) | **Sidebar** lateral (PortalSidebar) | Mantener sidebar (consistente con admin, gastro, referrer) |
| 22 | Sin sidebar | Sidebar: Dashboard, Eventos, Referidos, Payouts | OK. Demo no tiene referrals/payouts en layout productora; actual sí. |
| 23 | `main` con `max-w-7xl mx-auto` | `max-w-5xl` en layout producer | Evaluar si ampliar ancho para grids de 3 columnas |

### 2.6 Modelo de datos y fuentes

| # | Demo | Actual | Acción sugerida |
|---|------|--------|------------------|
| 24 | `event.tandas[]` con `sold`, `price`, `quota`; `getTicketsByEvent`, `getEventsByProductora` | `EventDetail`, `TicketTypeResponse`, `repos.events`, `repos.metrics.getEventMetrics` | Mapear `tandas` → ticket types + métricas; repos ya abstraen |
| 25 | Ciclo de vida por `event.date` (isEventPast, isEventActive, isEventFuture) | Sin agrupación por fecha en dashboard | Implementar helpers/filtros por startAt para agrupar |
| 26 | `event.status` (pendiente, activo, etc.) | `status`: DRAFT, PENDING, APPROVED, PAUSED, CANCELLED | Normalizar labels y colores; usar `getStatusLabel` / `getStatusColor` o equivalente |

---

## 3. Plan de trabajo sugerido (priorizado)

Siguiendo `PROJECT_RULES.md` y `AI_WORKFLOW_RULES.md`:

### Fase 1 — UX de alto impacto (sin cambios de backend)

1. **ProductoraEventCard** (o equivalente): crear componente que muestre nombre, fecha, ubicación, badge estado, vendidas, ingresos y link. Reutilizar en dashboard y opcionalmente en lista.
2. **Agrupación por ciclo de vida** en dashboard: Eventos Activos, Próximos, Pasados usando `startAt`.
3. **Summary cards** en dashboard: Eventos Activos, Próximos, Pasados (además de KPIs actuales).
4. **Badge de estado** en lista y detalle de eventos.
5. **Empty state** en dashboard cuando no hay eventos.
6. **CTA "+ Crear evento"** más prominente en dashboard.

### Fase 2 — Mejoras de consistencia

7. Vista **tabla** opcional en lista de eventos (o mejorar cards con columnas).
8. Mostrar **capacidad** en lista si el API lo devuelve.
9. **Ancho de layout** para grids de 3 columnas si procede.
10. Labels y colores de estado unificados (utilidad compartida).

### Fase 3 — Evaluación

11. Creación de **tandas en el mismo formulario** de evento (requiere definir contrato API).
12. Agrupación de **tickets por origen** (general, referido, cortesía) si el modelo lo permite.
13. Ruta dedicada `/producer/events/nuevo` vs modal (decisión de producto).

---

## 4. Archivos afectados (referencia)

- `apps/web/app/(portal)/producer/page.tsx` — Dashboard
- `apps/web/app/(portal)/producer/events/page.tsx` — Lista eventos
- `apps/web/app/(portal)/producer/events/[eventId]/page.tsx` — Detalle
- `apps/web/components/` — Crear `ProductoraEventCard` o reutilizar `Card` + `Badge`
- `apps/web/lib/` o `lib/domainLabels.ts` — Helpers estado, fecha (cycle helpers)
- `docs/context/FRONTEND_DEMO_NOTES.md` — Actualizar sección 3 tras cambios

---

## 5. Reglas a respetar

- Cambios mínimos y planificados (`PROJECT_RULES.md`).
- Plan de ejecución antes de implementar (`AI_WORKFLOW_RULES.md`).
- Reutilizar componentes existentes; no añadir librerías sin aprobación.
- Archivos &lt; 400 líneas; documentación actualizada.
- Repositorios/interfaces como abstracción; sin lógica de API en UI.
