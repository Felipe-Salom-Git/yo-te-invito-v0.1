# Roadmap y análisis — Integración a base de datos real y salida del modo demo

**Fecha:** 2025-03-06  
**Objetivo:** Conectar el frontend a la API/PostgreSQL, eliminar LocalStorage como persistencia y dejar de depender del modo demo (usuarios/seed en memoria).

**Decisión:** Los pagos se mantienen en **versión demo** (confirmación demo, sin integración a pasarelas de pago ni permisos a plataformas de pago).

Este documento sigue el flujo de trabajo de `PROJECT_RULES.md` y `AI_WORKFLOW_RULES.md`. La integración se ejecuta **slice por slice, fase por fase**.

---

## 1. Estado actual

### 1.1 Frontend (apps/web)

- **Repositories:** Toda la UI usa `useRepositories()`. El provider está en `app/providers.tsx` y **siempre** inyecta `LocalRepository` (no se pasa `repositories`).
- **LocalRepository** (`repositories/LocalRepository.ts`): Implementa la interfaz `Repositories` contra **LocalDB** (IndexedDB vía `lib/local-db/LocalDB.ts`). Incluye: events, ticketTypes, tickets, orders, users, reviews, referrals, courtesies, metrics, producers, scanner, payouts, gastro, resale.
- **ApiRepository** (`repositories/ApiRepository.ts`): Misma interfaz pero cada método lanza `NotImplemented: ApiRepository.<name>`. Pensado para reemplazar con llamadas HTTP al backend.
- **Auth:** NextAuth con Credentials provider; `lib/auth/demo-users.ts` y `validateAnyUser()` validan usuario/contraseña contra datos **en memoria** (demo). No hay JWT ni sesión contra la API.
- **Config demo:** Admin configuración (contacto, categorías) persiste en `localStorage`. Algunas pantallas usan `TENANT_ID = 'tenant-demo'` o `PRODUCER_ID = 'producer-demo'` fijos.

### 1.2 Backend (apps/api)

- **Stack:** NestJS + Prisma + PostgreSQL (según `PROJECT_ARCHITECTURE.md`).
- **Módulos existentes:** me, admin, producer, tickets, order-expiration, fraud, audit, courtesies, reviews, referrals, public-payments, foundation-test.
- **Auth:** DevAuthGuard (header `X-Dev-User-Id`) en desarrollo; preparado para RBAC con RequireRole.
- **Contratos:** `packages/shared` es la fuente de verdad (Zod, tipos). API debe exponer endpoints que devuelvan formas compatibles con `repositories/interfaces.ts` del frontend.

### 1.3 Dependencias entre capas

- La UI **no** importa LocalDB ni ApiRepository directamente; solo `useRepositories()`. Cambiar de Local a API es **solo** cambiar la instancia que recibe `RepositoriesProvider`.
- Los **query keys** (TanStack Query) y la forma de uso (queryFn que llama a `repos.events.list()`, etc.) se mantienen; solo el resultado debe venir del servidor.
- Autenticación: hoy el frontend no envía token a ningún backend; cuando se use API real, habrá que enviar sesión (JWT o cookie) en cada request y alinear NextAuth con el backend (login contra API, guardar token/sesión).

---

## 2. Análisis de brechas

### 2.1 Repositorio vs API

| Área | LocalRepository (actual) | ApiRepository (objetivo) | Backend actual |
|------|---------------------------|---------------------------|----------------|
| **events** | list, search, trending, getDetail, getTicketTypes, create, update | Mismo | Producer/Admin tienen eventos; falta alinear rutas públicas (list, search, trending, getDetail) y contrato exacto |
| **ticketTypes** | create, update | Mismo | Producer; alinear DTO con frontend |
| **tickets** | listByOwner, listByEvent, get, create, update, delete | Mismo | Módulo tickets; alinear listByOwner/listByEvent |
| **orders** | get, listByBuyer, create, confirmDemoPayment | Mismo | Order-expiration / public-payments; confirmDemoPayment es demo → sustituir por flujo pago real |
| **users** | getMe, getMyTickets, createReferrer, getPreferences, updatePreferences, list, updateRole | Mismo | Me + Admin; asegurar getMe, preferences, list, updateRole |
| **reviews** | list, create | Mismo | Módulo reviews |
| **referrals** | lookup, listLinks, listLinksByUser, createLink, listCommissionsByUser, requestCommission, listCommissionRequestsForEvent, confirmCommissionPayout | Mismo | Módulo referrals |
| **courtesies** | list, create, fetchTicketTypes | Mismo | Módulo courtesies |
| **metrics** | getEventMetrics, getPlatformMetrics | Mismo | Producer (event-metrics), Admin (platform-metrics) |
| **producers** | get | Mismo | Producer module |
| **scanner** | scan, listScanLogs | Mismo | Endpoints de validación + logs |
| **payouts** | listAll, listByProducer, listByEvent, updateStatus, create | Mismo | Verificar si existe módulo payouts en API |
| **gastro** | listContent, createContent, updateContent, listDiscounts, createDiscount, updateDiscount, listValidations, recordValidation | Mismo | Verificar si existe módulo gastro en API |
| **resale** | get, listActive, listByEvent, create, purchase | Mismo | Verificar si existe módulo resale en API |

**Conclusión:** La interfaz `Repositories` está definida; falta (1) que la API exponga endpoints que mapeen 1:1 a cada método y (2) implementar en `ApiRepository` las llamadas `fetch()` a esa API con la forma de respuesta esperada.

### 2.5 Inventario de endpoints (Fase 0)

Base URL API: `http://localhost:3001` (o `NEXT_PUBLIC_API_URL`). Auth: header `Authorization: Bearer <token>` o `X-Dev-User-Id` en desarrollo.

| Repo | Método frontend | Método HTTP | Path API | Estado API |
|------|------------------|-------------|----------|------------|
| **events** | list | GET | `/public/events` ?tenantId, page, limit, city, category, producerId, status | ✅ Existe |
| **events** | search | GET | `/public/events/search` ?tenantId, q, city, category, page, limit | ✅ Existe |
| **events** | trending | GET | `/public/events/trending` ?tenantId, limit | ✅ Existe |
| **events** | getDetail | GET | `/public/events/:id` ?tenantId | ✅ Existe |
| **events** | getTicketTypes | GET | `/public/events/:eventId/ticket-types` ?tenantId | ✅ Existe |
| **events** | create | POST | `/producer/events` o `/admin/events` (body: EventCreateDto) | ❌ Falta |
| **events** | update | PATCH | `/producer/events/:eventId` o `/admin/events/:eventId` | ❌ Falta |
| **ticketTypes** | create | POST | `/producer/events/:eventId/ticket-types` (body) | ❌ Falta |
| **ticketTypes** | update | PATCH | `/producer/events/:eventId/ticket-types/:id` | ❌ Falta |
| **tickets** | listByOwner | GET | `/me/tickets` (user from auth) | ✅ Existe (me) |
| **tickets** | listByEvent | GET | `/scanner/events/:eventId/tickets` o nuevo `/producer/events/:eventId/tickets` | Parcial (scanner) |
| **tickets** | get | GET | `/tickets/:id` o similar | ❌ Falta |
| **tickets** | create | POST | (interno: al confirmar orden) | Via orders |
| **tickets** | update | PATCH | `/tickets/:id` | ❌ Falta (revoke en admin) |
| **tickets** | delete | DELETE | `/tickets/:id` | ❌ Falta |
| **orders** | get | GET | `/public/orders/:orderId` ?tenantId | ✅ Existe |
| **orders** | listByBuyer | GET | `/me/orders` (user from auth) | ❌ Falta |
| **orders** | create | POST | `/public/orders` ?tenantId (body CreateOrderDto) | ✅ Existe |
| **orders** | confirmDemoPayment | POST | `/public/payments/:paymentId/demo-confirm` | ✅ Demo (se mantiene) |
| **users** | getMe | GET | `/me` | ✅ Existe |
| **users** | getMyTickets | GET | `/me/tickets` | ✅ Existe |
| **users** | createReferrer | POST | `/admin/users/referrer` o similar | ❌ Falta |
| **users** | getPreferences | GET | `/me/preferences` | ❌ Falta |
| **users** | updatePreferences | PATCH | `/me/preferences` | ❌ Falta |
| **users** | list | GET | `/admin/users` ?tenantId | ❌ Falta |
| **users** | updateRole | PATCH | `/admin/users/:userId/role` | ❌ Falta |
| **reviews** | list | GET | `/public/events/:id/reviews` ?tenantId, page, limit | ✅ Existe |
| **reviews** | create | POST | `/events/:eventId/reviews` (body, auth) | ✅ Existe (root) |
| **referrals** | lookup | GET | `/public/referral/:code` | ✅ Existe |
| **referrals** | listLinks | GET | `/events/:eventId/referral-links` (auth) | ✅ Existe |
| **referrals** | listLinksByUser | GET | `/me/referral-links` | ❌ Falta |
| **referrals** | createLink | POST | `/events/:eventId/referral-links` (auth) | ✅ Existe |
| **referrals** | listCommissionsByUser | GET | `/me/commissions` | ❌ Falta |
| **referrals** | requestCommission | POST | `/me/commissions/request` | ❌ Falta |
| **referrals** | listCommissionRequestsForEvent | GET | `/producer/events/:eventId/commission-requests` | ❌ Falta |
| **referrals** | confirmCommissionPayout | POST | `/admin/commissions/:id/confirm` | ❌ Falta |
| **courtesies** | list | GET | `/events/:eventId/courtesies` (auth) | ✅ Existe |
| **courtesies** | create | POST | `/events/:eventId/courtesies` (auth) | ✅ Existe |
| **courtesies** | fetchTicketTypes | GET | `/events/:eventId/ticket-types` (auth) | ✅ Existe |
| **metrics** | getEventMetrics | GET | `/producer/events/:eventId/metrics` | ✅ Existe |
| **metrics** | getPlatformMetrics | GET | `/admin/platform/metrics` | ✅ Existe |
| **producers** | get | GET | `/public/producers/:id` o `/producer/me` | ❌ Falta |
| **scanner** | scan | POST | `/scanner/scan` (body qrPayload, auth) | ✅ Existe |
| **scanner** | listScanLogs | GET | `/scanner/events/:eventId/logs` | ❌ Falta |
| **payouts** | listAll | GET | `/admin/payouts` | ❌ Módulo falta |
| **payouts** | listByProducer | GET | `/producer/payouts` | ❌ Módulo falta |
| **payouts** | listByEvent | GET | `/admin/payouts?eventId=` | ❌ Módulo falta |
| **payouts** | updateStatus | PATCH | `/admin/payouts/:id` | ❌ Módulo falta |
| **payouts** | create | POST | `/producer/payouts` | ❌ Módulo falta |
| **gastro** | listContent, createContent, updateContent, listDiscounts, createDiscount, updateDiscount, listValidations, recordValidation | Varios | ❌ Módulo falta |
| **resale** | get, listActive, listByEvent, create, purchase | Varios | ❌ Módulo falta |
| **auth** | login | POST | `/auth/login` (body email, password) → { token, user } | ❌ Falta |

Rutas actuales de la API (referencia): `public/events`, `public/orders`, `public/referral`, `public/payments`, `me`, `producer/events`, `admin`, `scanner`, `events` (courtesies, referrals, reviews), `tickets`.

### 2.2 Autenticación

- **Hoy:** Login con email/password contra `demo-users` en memoria; sesión JWT de NextAuth (solo frontend).
- **Objetivo:** Login contra API (p. ej. `POST /auth/login` o NextAuth con provider que llame a la API); API devuelve token/sesión; frontend guarda token y lo envía en cada request (Authorization header o cookie).
- **Tareas:** Definir contrato de login en `packages/shared`; implementar en API el endpoint de login y la validación de JWT en guards; en web, configurar NextAuth (o flujo custom) para usar ese login y adjuntar el token a las llamadas de `ApiRepository`.

### 2.3 Tenant / multi-tenant

- Frontend usa `tenantId` (p. ej. `tenant-demo`) en muchas queries. La API debe aceptar tenant (header, query o derivado del usuario) y filtrar por él donde aplique.

### 2.4 Datos “demo” a eliminar o reemplazar

- **Seed LocalDB:** Dejar de usar `lib/local-db/seed.ts` y páginas como `/dev/seed`, `/dev/local-db` como fuente de datos (o mantener solo para pruebas E2E opcionales).
- **Configuración admin (contacto, categorías):** Hoy en localStorage; pasar a API (tablas o config en DB) y que el frontend las pida al backend.
- **confirmDemoPayment:** Reemplazar por flujo de pago real (webhook + actualización de orden/tickets en API).
- **IDs fijos:** Sustituir `TENANT_ID`, `PRODUCER_ID` fijos por valores que vengan de sesión o contexto (tenant del usuario, producer del usuario).

---

## 3. Roadmap por fases y slices

La integración se ejecuta **paso a paso, slice por slice, fase por fase**. Cada slice es una unidad de trabajo verificable.

### Fase 0 — Preparación y contrato (sin quitar LocalStorage)

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **0.1** | Lista de endpoints por método de `Repositories`; inventario en §2.5. | ✅ Hecho |
| **0.2** | Asegurar en `packages/shared` schemas Zod y tipos para request/response; API y web comparten contrato. | ✅ Hecho (auth login) |
| **0.3** | Gaps en tabla §2.5; opcional: `docs/api/ENDPOINTS.md` con detalle por path. | ✅ Hecho |

### Fase 1 — API lista para el frontend

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **1.1** | Auth: POST /auth/login → JWT; guard JWT; CORS y NEXT_PUBLIC_API_URL. | ✅ Hecho |
| **1.2** | Events producer: POST/PATCH events; POST/PATCH ticket-types. | ✅ Hecho |
| **1.3** | Orders: GET /me/orders. Tickets: GET por evento (producer). | ✅ Hecho |
| **1.4** | Users: GET/PATCH /me/preferences; admin: users list, updateRole, createReferrer. | ✅ Hecho |
| **1.5** | Referrals: me/referral-links, me/commissions, commission-requests, confirm. | ✅ Hecho |
| **1.6** | Scanner: GET logs. Producers: GET /public/producers/:id. | ✅ Hecho |
| **1.7** | Payouts: módulo admin + producer según PayoutsRepo. | ✅ Hecho |
| **1.8** | Gastro: módulo stub (list vacío; create/update 501). | ✅ Hecho |
| **1.9** | Resale: módulo stub (list vacío; create/purchase 501). | ✅ Hecho |

### Fase 2 — ApiRepository implementado

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **2.1** | Cliente HTTP (lib/api/client.ts): base URL, Authorization, mapeo respuestas. | ✅ Hecho |
| **2.2** | ApiRepository: events, ticketTypes, tickets, orders, users, reviews. | ✅ Hecho |
| **2.3** | ApiRepository: referrals, courtesies, metrics, producers, scanner. | ✅ Hecho |
| **2.4** | ApiRepository: payouts, gastro, resale. | ✅ Hecho |
| **2.5** | Tests smoke: scripts/smoke-api.ts (events, me, orders, tickets). | ✅ Hecho |

### Fase 3 — Conmutación Frontend: Local → API

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **3.1** | RepositoriesProvider: NEXT_PUBLIC_USE_API → ApiRepository o LocalRepository. | ✅ Hecho |
| **3.2** | Probar flujos: home, evento, checkout, mis tickets, admin, producer, gastro, referrer. | Pendiente |
| **3.3** | confirmDemoPayment ya funciona con USE_API (crea payment + demo-confirm). | ✅ Hecho |

### Fase 4 — Auth real

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **4.1** | NextAuth Credentials: login contra API; guardar token en sesión. | ✅ Hecho |
| **4.2** | Cliente HTTP: token de sesión en header Authorization. | ✅ Hecho |
| **4.3** | Con USE_API=true: login contra API; demo-users solo cuando USE_API=false. | ✅ Hecho |

### Migraciones (aplicar antes de USE_API o Fase 5)

Migrations: `20260306150000_add_user_preferences`, `20260306160000_add_referral_commission`, `20260306170000_add_payout`.
Ejecutar: `pnpm db:migrate`. Las migraciones fueron aplicadas en esta sesión. Para setups nuevos, ejecutar antes de `NEXT_PUBLIC_USE_API=true`.

### Fase 5 — Retirada del modo demo

| Slice | Descripción | Estado |
|-------|-------------|--------|
| **5.1** | Config plataforma (contacto, categorías) en API; frontend vía repositorio. | ✅ Hecho |
| **5.2** | Condicionar seed y /dev/*: aviso cuando USE_API=true. | ✅ Hecho |
| **5.3** | Tenant/producer desde sesión (useTenant, useProducerId en producer pages). | ✅ Hecho |
| **5.4** | Actualizar DEVELOPER_USERS, guías y roadmap. | ✅ Hecho |

---

## 4. Riesgos y consideraciones

- **Compatibilidad de contratos:** Cualquier diferencia entre lo que devuelve la API y lo que espera `Repositories` (nombres de campos, anidación, códigos de estado) obligará a mapear en el cliente o a cambiar la API; por eso la Fase 0 es crítica.
- **Pagos:** En esta versión se mantiene `confirmDemoPayment` (demo); el flujo de pago real (pasarela, webhooks) se planificará aparte.
- **Imágenes y archivos:** Si la API usa almacenamiento externo (S3/R2), las URLs de imágenes (coverImageUrl, media, etc.) ya vendrán de la API; el frontend solo las muestra. La subida de archivos desde el frontend requerirá endpoints multipart y posiblemente pre-signed URLs.
- **Performance:** Primera carga y listados (eventos, tickets, órdenes) deben poder paginarse y, si hace falta, cachearse (TanStack Query ya ayuda); la API debe soportar paginación donde el frontend la use.

---

## 5. Criterios de “listo para producción” (checklist)

- [ ] Toda la interfaz `Repositories` está implementada en `ApiRepository` contra endpoints reales.
- [ ] Login y sesión se gestionan contra la API; el token se envía en todas las llamadas autenticadas.
- [ ] No se usa LocalStorage ni LocalDB como fuente de datos de producción; opcionalmente solo en dev sin API.
- [ ] Configuración de plataforma (contacto, categorías) viene de la API.
- [ ] No quedan constantes demo (tenant/producer fijos) en flujos de producción.
- [ ] Documentación actualizada (rutas, usuarios de prueba si los hay, variables de entorno) y este roadmap reflejado en el estado actual.

---

## 6. Próximos pasos recomendados

1. **Ejecutar Fase 0** (inventario de endpoints y gaps) y dejar documentado en `docs/api/` o en un anexo de este archivo.
2. Priorizar en la API: auth (login + JWT), eventos (list/detail/ticketTypes), órdenes y tickets, y después el resto de dominios (referrals, courtesies, payouts, gastro, resale, scanner, metrics).
3. Implementar el cliente HTTP y los primeros métodos de `ApiRepository` (p. ej. events + auth) y validar con la conmutación por env antes de seguir con el resto.

---

*Fin del documento. Cualquier implementación concreta debe seguir el plan de ejecución por fases y las reglas de PROJECT_RULES y AI_WORKFLOW_RULES.*
