# Yo Te Invito — Especificación de Objetivos por Rol

Documento canónico que define qué debe lograr la plataforma para cada rol de usuario.  
Sirve como referencia para el roadmap y el desarrollo.

---

# 1. Usuarios Generales (Compradores)

## Objetivo
Explorar eventos, comprar entradas, gestionar tickets y participar del mercado de reventa oficial.

## Funcionalidades

| Funcionalidad | Descripción | Estado actual |
|---------------|-------------|---------------|
| **Exploración** | Ver eventos publicados, filtrar por categoría/ciudad/fecha | ✅ Home, Explore, Event detail |
| **Compra** | Seleccionar tandas (lotes con precio y stock), completar pago | ⚠️ Checkout existe; falta tandas explícitas |
| **Pagos** | MercadoPago, GetNet (V2) | ❌ Solo demo payment |
| **Mis tickets** | Ver tickets comprados, QR único | ✅ /me/tickets, /me/tickets/[ticketId] |
| **Reventa oficial** | Listar entradas en /reventa para que otros compren | ❌ No existe |
| **Transferencia** | Marcar ticket como transferible, cambiar portador (nombre, DNI, email) | ❌ No existe |
| **Configuración** | Perfil, preferencias | ⚠️ Parcial: /cuenta |
| **Preferencias** | Ciudad, notificaciones | ⚠️ Shell en /cuenta/preferencias |
| **Eventos asistidos** | Historial de eventos a los que asistió | ⚠️ Shell en /cuenta/eventos-asistidos |
| **Eventos esperados** | Próximos eventos con tickets | ⚠️ Shell en /cuenta/eventos-esperados |

## Rutas objetivo

- `/` → SplashIntro → `/home`
- `/home`, `/explore`, `/events/[id]`, `/restaurants/[id]`, `/excursiones/[id]`, `/rentals/[id]`
- `/checkout`, `/checkout/[eventId]`, `/checkout/success`
- `/me/tickets`, `/me/tickets/[ticketId]`
- `/me/orders`, `/me/orders/[orderId]`
- `/reventa/[listingId]` — Público
- `/cuenta`, `/cuenta/preferencias`, `/cuenta/configuracion`, `/cuenta/eventos-asistidos`, `/cuenta/eventos-esperados`

---

# 2. Productoras de Eventos (/productora)

## Objetivo
Panel corporativo para crear eventos, gestionar tandas, referidos y solicitar retiros.

## Funcionalidades

| Funcionalidad | Descripción | Estado actual |
|---------------|-------------|---------------|
| **Crear/editar eventos** | Nombre, lugar (Google Maps), fechas, capacidades, edades mínimas, banners | ❌ No formulario |
| **Gestión de tandas** | Lotes (ej. Preventa 1, General) con precio, stock, fechas inicio/fin | ❌ Parcial en seed |
| **Dashboard** | Ventas, entradas emitidas, recaudación en tiempo real | ⚠️ Shell |
| **RRPP / Referidos** | Dar de alta referidos, asignar a eventos, rastrear ventas | ⚠️ Por evento en referrals tab |
| **Crear usuario referido** | La productora crea el usuario referido (alta) | ❌ No existe |
| **Payouts** | Solicitar liquidación, enviar datos bancarios | ❌ No existe |
| **Cortesías** | Emitir tickets sin pago | ✅ Tab cortesías |
| **Export CSV/PDF** | Exportar datos | ❌ No existe |

## Rutas objetivo

- `/producer` — Dashboard
- `/producer/events` — Lista de eventos
- `/producer/events/nuevo` — Crear evento
- `/producer/events/[id]` — Detalle (tabs: Resumen, Entradas/Tandas, Tickets vendidos, Cortesías, Referidos, PDF, Exports, Solicitud de pago)
- `/producer/events/[id]/editar`
- `/producer/events/[id]/courtesies`, `/producer/events/[id]/referrals`
- `/producer/referrals` — CRUD referidos, asignar eventos
- `/producer/payouts` — Solicitar retiro, historial

---

# 3. Administradores (/admin)

## Objetivo
Panel maestro: moderar eventos, gestionar órdenes, aprobar payouts y administrar roles.

## Funcionalidades

| Funcionalidad | Descripción | Estado actual |
|---------------|-------------|---------------|
| **Moderar eventos** | Aprobar, pausar, cancelar | ❌ Solo shells |
| **Gestionar órdenes** | Ver todas las órdenes de compra | ⚠️ Admin tickets shell |
| **Aprobar payouts** | Revisar y aprobar solicitudes de retiro | ❌ No existe |
| **Gestionar roles** | Asignar roles a usuarios | ❌ No existe |
| **Eventos sin tiquetera** | Cargar eventos promocionales (sin venta de tickets) | ❌ No existe |
| **Excursiones** | CRUD excursiones | ❌ No existe |
| **Rentals** | CRUD alquileres | ❌ No existe |
| **Auditoría** | Ver logs sensibles | ✅ Shell /admin/audit |
| **Configuración** | Fees, gateways, plantillas | ⚠️ Shell |
| **Intervenciones** | Revocar ticket, resolver incidencias | ❌ No existe |

## Rutas objetivo

- `/admin` — Dashboard
- `/admin/eventos` — Lista, aprobar, pausar, cancelar
- `/admin/eventos/nuevo` — Crear evento sin tiquetera
- `/admin/excursiones`, `/admin/rentals` — CRUD
- `/admin/productoras`, `/admin/tickets`
- `/admin/payouts` — Aprobar solicitudes
- `/admin/configuracion`, `/admin/publicidad`
- `/admin/audit`

---

# 4. RRPP / Referidos

## Objetivo
Vendedores externos con links de referencia; la plataforma atribuye ventas y comisiones.

## Funcionalidades

| Funcionalidad | Descripción | Estado actual |
|---------------|-------------|---------------|
| **Configuración** | Cambio de contraseña, preferencias | ❌ No existe |
| **Eventos asociados** | Lista de eventos asignados por productora | ⚠️ Shell /referrer |
| **Link de venta** | Copiar link único por evento | ⚠️ Parcial en producer referrals |
| **Detalle por evento** | Ventas realizadas, ganancia generada | ❌ No existe |
| **Solicitar comisión** | Solicitar al productor la comisión | ❌ No existe |
| **Confirmar cobro** | Marcar comisión como cobrada | ❌ No existe |

## Rutas objetivo

- `/referrer` — Dashboard
- `/referrer/eventos` — Eventos asignados
- `/referrer/eventos/[id]` — Ventas, ganancia, solicitar/confirmar comisión
- `/referrer/configuracion` — Cambio de contraseña

---

# 5. Gastronómicos (/gastro)

## Objetivo
Gestión de contenido editorial, descuentos y validaciones.

## Funcionalidades

| Funcionalidad | Descripción | Estado actual |
|---------------|-------------|---------------|
| **Contenido** | Imágenes, editorial | ❌ Shell /gastro |
| **Descuentos** | CRUD descuentos, fechas, promos | ❌ No existe |
| **Registro de validaciones** | Fecha, promo, origen de validación | ❌ No existe |

## Rutas objetivo

- `/gastro` — Dashboard
- `/gastro/contenido` — Carga/edición de imágenes y editorial
- `/gastro/descuentos` — CRUD descuentos
- `/gastro/validaciones` — Log de validaciones

---

# 6. Características Transversales

## StockHold (reserva temporal)
- Cuando el usuario inicia la compra, el sistema retiene stock temporalmente (ej. 15 min).
- Evita que otro usuario se lleve los tickets mientras se completa el pago.

## Ledger (trazabilidad)
- Cada ticket tiene un registro inmutable: creado, transferido, revendido, escaneado.
- Verificación de integridad de la cadena.

## Transferencia de entradas
- Tickets transferibles: cambiar portador (nombre, DNI, email).

## Attribution referral
- Links `?ref=` o `/r/[code]` → atribución al referido.
- Orden guarda `originType=referral`, `originId`.

---

# 7. Referencia: Análisis del proyecto Demo

*Fuente: Yo-Te-Invito (Demo). Análisis funcional, sin copiar código.*

| Área | Funcionalidad en Demo |
|------|------------------------|
| **Tandas** | Batches con nombre, precio, capacidad, saleStart, saleEnd; solo una tanda activa por orden |
| **Reventa** | Listar ticket, compra demo, Ledger entries (resale_listed, ticket_transferred) |
| **Payouts** | PayoutRequest, POST crear, GET list, email con bank data |
| **Referrals** | CRUD, asignar eventos, links `?ref=`, atribución en orden |
| **StockHold** | 15 min TTL, hold → create-order o release |
| **Ledger** | LedgerEntry por ticket, hash chain, verify, ticket/event history |
| **Purchases** | hold, release, create-order, simulate |

---

# 8. Priorización sugerida (Frontend maqueta)

Siguiendo `docs/rules/PROJECT_RULES.md`: plan antes de implementar, cambios mínimos, reutilizar existente.

## Alta prioridad
1. **Productora**: Crear/editar evento, tandas, payouts, referidos standalone
2. **Usuario**: Reventa listing público, transferencia de tickets
3. **Admin**: Cola aprobación, eventos sin tiquetera, excursiones/rentals
4. **Referido**: Dashboard con eventos asignados, links, detalle ventas/comisión

## Media prioridad
5. **Gastro**: Contenido, descuentos, validaciones
6. **Usuario**: Configuración completa, preferencias, eventos asistidos/esperados
7. **Admin**: Payouts approval, gestión de roles

## Baja prioridad (V2 / Backend)
8. StockHold (backend)
9. Ledger UI (verificación)
10. Pagos reales (MercadoPago, GetNet)

---

# 9. Referencias

- **`docs/legacy/guides/execution-plans/EXECUTION_PLAN_PRODUCER_PHASE.md`** — Plan histórico Fase Productora (payouts, tandas, referidos)
- `docs/frontend/ROADMAP_FRONTEND_MAQUETA.md`
- `docs/context/FRONTEND_CONTEXT.md`
- `docs/guides/DEVELOPER_USERS.md`
- `docs/rules/PROJECT_RULES.md`
- `docs/rules/AI_WORKFLOW_RULES.md`
