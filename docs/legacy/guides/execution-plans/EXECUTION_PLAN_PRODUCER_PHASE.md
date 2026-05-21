# Execution Plan — Fase Productora (Alta prioridad)

> **Histórico:** referencias a `LocalRepository` / `@demo.local` no aplican. Ver [DEMO_REMOVAL.md](./DEMO_REMOVAL.md).

## Objetivo

Implementar las funcionalidades faltantes del rol **Productora** para acercar la app a los objetivos definidos en `docs/project/ROLES_OBJECTIVES_SPEC.md`:

1. Dashboard con métricas por evento y recaudación
2. Crear/editar eventos (dedicar rutas o mantener modal, según consistencia)
3. Gestión de tandas (lotes con fechas y precio)
4. Payouts (solicitar retiro, historial)
5. Referidos standalone (CRUD, asignar eventos, crear referido)

**Modo:** LocalStorage maqueta. Sin backend real.

---

## Estado actual

| Item | Estado |
|------|--------|
| Dashboard | Shell con PlatformMetrics; falta métricas por evento del productor |
| Crear/editar evento | Modal en `/producer/events`; funciona |
| Tipos de entrada | Creación inline en event detail; sin tandas (saleStart/saleEnd) |
| Payouts | No existe |
| Referidos por evento | Existe `/producer/events/[id]/referrals` |
| Referidos standalone | No existe |

---

## Archivos a crear o modificar

### Nuevos

- `apps/web/lib/schemas/payout.ts` — Schema Zod para solicitud de retiro
- `apps/web/repositories/interfaces.ts` — Interfaces `PayoutRequest`, `PayoutsRepo`
- `apps/web/lib/local-db/seed.ts` — Colección `payoutRequests`, datos demo
- `apps/web/lib/local-db/app-db.ts` — Índices para `payoutRequests`
- `apps/web/repositories/LocalRepository.ts` — Implementación `PayoutsRepo`
- `apps/web/repositories/ApiRepository.ts` — Placeholder `PayoutsRepo`
- `apps/web/lib/query/payouts.ts` — Hooks `usePayoutRequests`, `useCreatePayout`
- `apps/web/lib/query/keys.ts` — `payoutsKeys`
- `apps/web/app/(portal)/producer/payouts/page.tsx` — Lista + solicitar retiro
- `apps/web/app/(portal)/producer/referrals/page.tsx` — Referidos standalone
- `apps/web/components/producer/PayoutRequestForm.tsx` — Formulario solicitud
- `apps/web/components/producer/ReferralCard.tsx` — Card de referido con acciones
- `docs/modules/producer-payouts.md` — Documentación del módulo
- `docs/modules/producer-referrals.md` — Documentación del módulo

### Modificados

- `apps/web/repositories/interfaces.ts` — `TicketTypeResponse` con `saleStart?`, `saleEnd?`; `TicketTypesRepo.create` acepta esos campos
- `apps/web/repositories/LocalRepository.ts` — Crear/actualizar tandas con fechas; `PayoutsRepo`
- `apps/web/lib/local-db/seed.ts` — `payoutRequests`; algunos ticketTypes con `saleStart`/`saleEnd`
- `apps/web/app/(portal)/producer/page.tsx` — Usar métricas por evento (suma recaudación, tickets vendidos por producer)
- `apps/web/app/(portal)/producer/events/[eventId]/page.tsx` — Formulario tandas con fechas; link a payouts desde evento
- `apps/web/app/(portal)/producer/layout.tsx` — Nav con Payouts y Referidos (si no existe)
- `apps/web/context/RepositoriesContext` — Registrar `payouts` en `Repositories`
- `apps/web/repositories/context.tsx` — Exportar `PayoutsRepo`

---

## Pasos de implementación

### Paso 1 — Interfaces y repos Payouts

1. Definir `PayoutRequest` en interfaces:
   - `id`, `tenantId`, `eventId`, `producerId`, `status`, `amountCents`, `requestedByUserId`, `createdAt`
   - Status: `REQUESTED`, `PENDING`, `PROCESSING`, `SENT`, `REJECTED`
2. Definir `PayoutsRepo`: `listByProducer(producerId)`, `listByEvent(eventId)`, `create(input)`
3. Agregar `payoutRequests` a `APP_DB_INDEXES` y `APP_COLLECTIONS`
4. Implementar en `LocalRepository` y placeholder en `ApiRepository`
5. Registrar en `Repositories` y provider

### Paso 2 — Seed y schemas Payouts

1. Crear `lib/schemas/payout.ts` con `payoutRequestSchema`
2. Seed: 1–2 `payoutRequests` demo para eventos del productor
3. Query hooks y keys

### Paso 3 — UI Payouts

1. `producer/payouts/page.tsx`:
   - Lista de solicitudes por evento
   - Botón "Solicitar retiro"
   - Modal o formulario con monto, datos bancarios (titular, banco, CBU)
2. `PayoutRequestForm` reutilizable
3. Link en layout/productor: "Payouts"

### Paso 4 — Tandas (extensión de ticket types)

1. Extender `TicketTypeResponse` con `saleStart?: string`, `saleEnd?: string`, `order?: number`
2. Actualizar `TicketTypesRepo.create` para aceptar estos campos
3. Actualizar formulario en event detail: campos fecha inicio/fin por tanda
4. Seed: algunos ticketTypes con `saleStart`/`saleEnd` de ejemplo

### Paso 5 — Dashboard productor mejorado

1. `MetricsRepo.getEventMetrics(eventId)` — ya existe
2. Para eventos del productor: llamar `getEventMetrics` por evento y agregar:
   - Total recaudado
   - Total tickets vendidos
   - Gráfico o lista de ventas por evento (opcional)
3. Mostrar KPIs en dashboard

### Paso 6 — Referidos standalone

1. Crear `ReferralsRepo.listByProducer(producerId)` o equivalente:
   - En LocalDB: `referralLinks` tiene `eventId`; para "referidos del productor" necesitamos referrers asignados a eventos del productor.
   - Alternativa: `ReferrerProfile` con `producerId`; o derivar de `referralLinks` filtrando por eventos del productor.
2. Para maqueta: asumir que los referrers son usuarios con rol REFERRER; la productora los "asigna" creando ReferralLinks a sus eventos.
3. Página `/producer/referrals`:
   - Lista de referidos (usuarios REFERRER o links agrupados por referrer)
   - Crear referido: formulario (email, nombre) que crea usuario REFERRER + link a evento
   - Asignar eventos: multi-select de eventos
4. Referir a `ReferralLinkSummary` y `createLink` existentes

### Paso 7 — Crear usuario referido (Productora da de alta)

1. Extender `UsersRepo` o crear `ReferrersRepo`:
   - `createReferrer(producerId, input: { email, firstName, lastName })` → crea User con rol REFERRER y opcionalmente ReferrerProfile
2. En LocalDB: `db.create('users', { ...input, role: 'REFERRER' })`
3. En demo-users: los referidos creados por productora se agregan a demo-users para login (o se documenta que son solo LocalDB)
4. Formulario en `/producer/referrals`: "Dar de alta referido"

### Paso 8 — Documentación y navegación

1. Crear `docs/modules/producer-payouts.md`, `producer-referrals.md`
2. Actualizar layout productor con links a Payouts y Referidos
3. Actualizar `DEVELOPER_USERS.md` si hace falta

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| `ReferrerProfile` no existe en LocalDB | Usar usuarios con rol REFERRER; asignación = ReferralLink por evento |
| Payouts sin backend | Todo en LocalRepository; ApiRepository con stubs |
| Cambios en Prisma/schema | No se modifican; solo frontend y LocalDB |

---

## Posibles violaciones de reglas

- **Archivos >400 líneas:** Evitar; separar `PayoutRequestForm`, `ReferralCard` en componentes.
- **Nuevas dependencias:** No.
- **Prisma:** No.
- **Arquitectura:** Respeta capas (UI → hooks → repos).

---

## Plan de smoke test

1. Login como `producer@demo.local` / `demo`
2. Dashboard: ver métricas (tickets, recaudación)
3. Eventos: crear evento, editar, agregar tanda con fechas
4. Payouts: solicitar retiro, ver historial
5. Referidos: listar, crear referido, asignar evento, ver links
6. Event detail: crear tipo de entrada con saleStart/saleEnd

---

## Orden de ejecución sugerido

1. Paso 1 + 2 (Payouts repos, seed, schemas)
2. Paso 3 (UI Payouts)
3. Paso 4 (Tandas)
4. Paso 5 (Dashboard)
5. Paso 6 + 7 (Referidos standalone + crear referido)
6. Paso 8 (Docs, nav)

---

## Implementación realizada (session actual)

- [x] Paso 1 + 2: Payouts repos, seed, schemas
- [x] Paso 3: UI Payouts (producer/payouts, PayoutRequestForm)
- [x] Paso 4: Tandas (saleStart, saleEnd en ticket types)
- [x] Paso 5: Dashboard mejorado (métricas por evento, recaudación)
- [x] Referidos standalone: página que lista eventos y enlaza a referrals por evento
- [ ] Paso 7: Crear usuario referido (pendiente)
- [x] Paso 8: Nav productor (Dashboard, Eventos, Referidos, Payouts)

---

## Aprobación

Antes de implementar más, confirmar:

- [ ] Scope aceptado (payouts, tandas, dashboard, referidos standalone)
- [ ] Enfoque LocalRepository sin tocar backend
- [ ] Orden de pasos aprobado
- [ ] Crear referido = crear User con rol REFERRER en LocalDB (demo-users manual o automático)
