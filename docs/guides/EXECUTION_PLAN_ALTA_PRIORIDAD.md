# Execution Plan — Alta Prioridad (5 Slides)

## Objetivo general

Implementar los 5 ítems de **alta prioridad** definidos en `docs/project/ROLES_OBJECTIVES_SPEC.md` y `docs/frontend/ROADMAP_FRONTEND_MAQUETA.md`:

1. **Reventa listing público** — `/reventa/[listingId]` para compra por reventa
2. **Admin: cola de aprobación** — Moderar eventos (aprobar, pausar, cancelar)
3. **Admin: eventos sin tiquetera** — Crear eventos promocionales sin venta de tickets
4. **Admin: excursiones/rentals** — CRUD de excursiones y alquileres
5. **Referido: dashboard completo** — Ventas, comisiones, solicitar/confirmar cobro

**Modo:** LocalStorage maqueta. Sin backend real. Respetar `PROJECT_RULES.md` y `AI_WORKFLOW_RULES.md`.

---

# Slide 1 — Reventa listing público

## Objetivo

Permitir a usuarios comprar tickets listados en reventa oficial en `/reventa/[listingId]`.

## Estado actual

- No existe ruta `/reventa`
- Checkout existe para compra directa en `/checkout/[eventId]`
- Tickets tienen `ownerUserId`, `status`, `eventId`

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `repositories/interfaces.ts` | `ResaleListing`, `ResaleRepo` |
| `lib/local-db/seed.ts` | Colección `resaleListings`, datos demo |
| `lib/local-db/app-db.ts` | Índices `resaleListings` |
| `repositories/LocalRepository.ts` | Implementación `ResaleRepo` |
| `repositories/ApiRepository.ts` | Placeholder `ResaleRepo` |
| `app/(public)/reventa/[listingId]/page.tsx` | Página pública de listing |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `repositories/interfaces.ts` | Interfaces `ResaleListing`, `ResaleRepo` |
| `repositories/context.tsx` | Registrar `resale` en `Repositories` |
| `lib/query/keys.ts` | `resaleKeys` |
| Navbar / Home | Link a reventa o explorar listings |

## Pasos de implementación

1. Definir `ResaleListing`: `id`, `ticketId`, `eventId`, `sellerUserId`, `askingPriceCents`, `status`, `createdAt`
2. `ResaleRepo`: `get(listingId)`, `listByEvent(eventId)`, `create(input)`, `purchase(listingId, buyerUserId)` (demo: transfiere ticket)
3. Seed: 1–3 listings demo
4. Página `/reventa/[listingId]`: mostrar evento, ticket tipo, precio, botón "Comprar" → checkout demo
5. Reutilizar flujo de pago existente o simplificar (confirmDemoPayment para reventa)

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Transferencia de ticket sin Ledger real | Solo actualizar `ownerUserId` en LocalDB para maqueta |

## Smoke test

- [ ] Ir a `/reventa/[id]` con listing del seed
- [ ] Ver datos del evento y precio
- [ ] Comprar como usuario logueado → ticket pasa a comprador

---

# Slide 2 — Admin: cola de aprobación

## Objetivo

Moderar eventos: aprobar, pausar, cancelar. Cola de eventos pendientes.

## Estado actual

- `EventDetail` tiene `status` (ej. `approved`, `draft`, `pending`)
- Admin eventos es shell (`/admin/eventos`)

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `app/(portal)/admin/eventos/queue/page.tsx` | Cola aprobación (opcional, puede estar en eventos) |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `repositories/interfaces.ts` | `EventsRepo.update(eventId, { status })` ya existe |
| `repositories/LocalRepository.ts` | Asegurar que `update` cambie `status` |
| `app/(portal)/admin/eventos/page.tsx` | Lista eventos, filtro por status, acciones Aprobar/Pausar/Cancelar |

## Pasos de implementación

1. `EventsRepo.list()`: añadir filtro opcional `status` a la query
2. Seed: agregar 1–2 eventos con `status: 'pending'` para cola
3. Admin eventos: lista con tabs o filtros (pendientes / aprobados / pausados / cancelados)
4. Acciones por evento: Aprobar, Pausar, Cancelar → `repos.events.update(id, { status })`
5. Invalidar queries tras mutación

## Riesgos

Ninguno crítico.

## Smoke test

- [ ] Admin → Eventos: ver cola pendiente
- [ ] Aprobar evento → cambia a aprobado
- [ ] Pausar/Cancelar evento

---

# Slide 3 — Admin: eventos sin tiquetera

## Objetivo

Crear eventos promocionales sin venta de tickets (`isTicketingEnabled: false`).

## Estado actual

- `EventDetail` tiene `isTicketingEnabled`
- Seed ya tiene eventos sin ticketing (ej. Feria de Arte Urbano)
- No hay ruta `/admin/eventos/nuevo`

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `app/(portal)/admin/eventos/nuevo/page.tsx` | Formulario crear evento sin tiquetera |
| `components/admin/EventCreateForm.tsx` | Formulario reutilizable (si >100 líneas) |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `repositories/interfaces.ts` | `EventsRepo.create` ya acepta `isTicketingEnabled` |
| `repositories/LocalRepository.ts` | Asegurar `create` con `isTicketingEnabled: false` por defecto en admin |
| `app/(portal)/admin/layout.tsx` | Link "Eventos nuevo" o botón en admin/eventos |
| `lib/schemas/event.ts` | Schema Zod para validación (opcional) |

## Pasos de implementación

1. Crear ruta `/admin/eventos/nuevo`
2. Formulario: título, descripción, ciudad, venue, fecha inicio/fin, categoría, `isTicketingEnabled: false` fijo
3. Llamar `repos.events.create({ ...input, tenantId, isTicketingEnabled: false, status: 'approved' })`
4. Redirect a `/admin/eventos` tras éxito
5. Admin eventos: botón "Crear evento promocional"

## Riesgos

Ninguno crítico.

## Smoke test

- [ ] Admin → Eventos nuevo → crear evento sin ticketing
- [ ] Evento visible en lista y en explore/home

---

# Slide 4 — Admin: excursiones/rentals CRUD

## Objetivo

CRUD completo de excursiones y alquileres (rentals) desde admin.

## Estado actual

- Excursiones/rentals se modelan como eventos con `category: 'excursion' | 'rental'`
- `PlaceDetailView` muestra detalle por `id` y `variant`
- No hay admin para excursiones ni rentals

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `app/(portal)/admin/excursiones/page.tsx` | Lista + crear excursión |
| `app/(portal)/admin/excursiones/nuevo/page.tsx` | Formulario alta |
| `app/(portal)/admin/excursiones/[id]/editar/page.tsx` | Formulario edición |
| `app/(portal)/admin/rentals/page.tsx` | Lista + crear rental |
| `app/(portal)/admin/rentals/nuevo/page.tsx` | Formulario alta |
| `app/(portal)/admin/rentals/[id]/editar/page.tsx` | Formulario edición |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `repositories/interfaces.ts` | `EventsRepo.list` con `category` ya soportado |
| `app/(portal)/admin/layout.tsx` | Nav: Excursiones, Rentals |

## Pasos de implementación

1. Listar eventos con `category: 'excursion'` y `category: 'rental'`
2. Formulario create/edit: mismo shape que evento (título, ciudad, venue, fechas, descripción, capacityTotal)
3. Create: `repos.events.create({ ...input, category, tenantId })`
4. Update: `repos.events.update(id, patch)`
5. Delete: no existe `delete` en repo; opcional: agregar o marcar status `cancelled`
6. Reutilizar estructura de `admin/eventos` donde aplique

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Duplicación de formularios | Extraer `EventFormBase` compartido si es posible |

## Smoke test

- [ ] Admin → Excursiones: listar, crear, editar
- [ ] Admin → Rentals: listar, crear, editar
- [ ] Ver excursión/rental en `/excursiones/[id]` y `/rentals/[id]`

---

# Slide 5 — Referido: dashboard completo

## Objetivo

Dashboard referido con: ventas por evento, comisiones, solicitar cobro, confirmar cobro.

## Estado actual

- `/referrer` existe: KPIs básicos, lista de links
- `ReferralLinkSummary` tiene `attributedOrdersCount`
- No hay modelo de comisión ni solicitud de cobro

## Archivos a crear

| Archivo | Propósito |
|---------|-----------|
| `repositories/interfaces.ts` | `ReferralCommission`, `ReferralCommissionsRepo` (o extender ReferralsRepo) |
| `lib/local-db/seed.ts` | Colección `referralCommissions` demo |
| `app/(portal)/referrer/eventos/page.tsx` | Eventos asignados |
| `app/(portal)/referrer/eventos/[id]/page.tsx` | Detalle: ventas, comisión, solicitar/confirmar cobro |
| `app/(portal)/referrer/configuracion/page.tsx` | Shell: cambio de contraseña (placeholder) |
| `components/referrer/CommissionRequestForm.tsx` | Formulario solicitar comisión |
| `components/referrer/CommissionRow.tsx` | Fila comisión con acciones |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `repositories/interfaces.ts` | `ReferralCommission`, `ReferralCommissionsRepo` o métodos en `ReferralsRepo` |
| `repositories/LocalRepository.ts` | Implementar lógica comisiones |
| `app/(portal)/referrer/page.tsx` | Enlaces a eventos, resumen comisiones |
| `app/(portal)/referrer/layout.tsx` | Crear si no existe; nav: Dashboard, Eventos, Configuración |

## Pasos de implementación

1. Definir `ReferralCommission`: `id`, `referrerId`, `eventId`, `referralLinkId`, `amountCents`, `status` (`PENDING`, `REQUESTED`, `PAID`, `REJECTED`), `requestedAt`, `paidAt`
2. `ReferralsRepo`: `listCommissionsByUser(userId)`, `requestCommission(commissionId)`, `confirmPayout(commissionId)` (productor confirma)
3. Para maqueta: comisión = `attributedOrdersCount * 50` (demo)
4. Referrer evento detail: ventas atribuidas, monto comisión, botón "Solicitar cobro" → crea/actualiza commission
5. Productor (o admin): ver solicitudes, botón "Confirmar cobro" → status PAID
6. Referrer: ver estado de solicitudes (PENDING, REQUESTED, PAID)

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Productor debe ver solicitudes de comisión | Añadir sección en producer/events/[id]/referrals o producer/referrals |

## Smoke test

- [ ] Referrer: ver eventos asignados, ventas, comisión
- [ ] Solicitar cobro de comisión
- [ ] Productor: confirmar cobro
- [ ] Referrer: ver comisión como cobrada

---

# Checklist final (alta prioridad)

## Slide 1 — Reventa

- [ ] `ResaleListing` y `ResaleRepo` definidos
- [ ] Seed con listings demo
- [ ] Página `/reventa/[listingId]` funcional
- [ ] Compra demo por reventa
- [ ] Documentación: `docs/modules/resale-listing.md`

## Slide 2 — Admin cola aprobación

- [ ] Admin eventos: lista con filtro por status
- [ ] Acciones Aprobar / Pausar / Cancelar
- [ ] Seed con eventos `pending`
- [ ] Documentación: actualizar `docs/modules/admin-eventos.md`

## Slide 3 — Admin eventos sin tiquetera

- [ ] Ruta `/admin/eventos/nuevo`
- [ ] Formulario crear evento promocional (sin ticketing)
- [ ] Creación exitosa y visibilidad en catálogo
- [ ] Documentación: actualizar `docs/modules/admin-eventos.md`

## Slide 4 — Admin excursiones/rentals

- [ ] `/admin/excursiones` — listar, crear, editar
- [ ] `/admin/rentals` — listar, crear, editar
- [ ] Nav admin actualizado
- [ ] Documentación: `docs/modules/admin-excursiones-rentals.md`

## Slide 5 — Referido dashboard

- [ ] `/referrer/eventos` — eventos asignados
- [ ] `/referrer/eventos/[id]` — ventas, comisión, solicitar/confirmar cobro
- [ ] `/referrer/configuracion` — shell
- [ ] Modelo comisiones en LocalDB
- [ ] Productor puede confirmar cobro
- [ ] Documentación: `docs/modules/referrer-dashboard.md`

## Reglas y validaciones

- [ ] No nuevas dependencias sin aprobación
- [ ] Archivos <400 líneas
- [ ] Código en inglés; comentarios bilingües
- [ ] Build estable
- [ ] Smoke tests descritos ejecutados

---

# Orden de ejecución sugerido

1. **Slide 2** (Admin cola) — Dependencias mínimas, mejora admin existente
2. **Slide 3** (Admin eventos sin tiquetera) — Extiende admin eventos
3. **Slide 4** (Admin excursiones/rentals) — CRUD sobre eventos por categoría
4. **Slide 1** (Reventa) — Nuevo dominio, más trabajo
5. **Slide 5** (Referido dashboard) — Más complejo por comisiones y flujo productor-referido

---

# Aprobación

Antes de implementar, confirmar:

- [ ] Scope de los 5 slides aceptado
- [ ] Orden de ejecución aprobado
- [ ] Enfoque LocalRepository sin tocar backend
- [ ] Documentación por módulo aceptada
