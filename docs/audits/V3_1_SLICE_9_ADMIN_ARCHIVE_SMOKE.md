# V3.1 Slice 9 — Admin archivar/dar de baja publicaciones y locales

**Fecha:** 2026-06-06  
**Alcance:** Baja lógica / archivado admin sin deletes físicos de historial operativo. Getnet/pagos sin cambios.

---

## 1. Auditoría previa (estrategia por entidad)

| Entidad | Estado existente | Estrategia Slice 9 | Delete físico previo |
|---------|------------------|--------------------|----------------------|
| **Event** (eventos, excursiones, rentals, general) | `EventStatus`: DRAFT, PENDING, APPROVED, **PAUSED**, CANCELLED; `deletedAt` soft | **Archivar** = `PAUSED`; **Restaurar** = `APPROVED` | No en flujo admin nuevo |
| **Excursión (producto)** | `Event` `category=excursion` | Mismos endpoints event pause/restore | — |
| **Rental producto** | `Event` `category=rental` | pause/restore vía event endpoints | — |
| **GastroProfile** | `ProfileStatus` incl. **SUSPENDED** | Reutiliza `PATCH .../status` ACTIVE/SUSPENDED + **audit nuevo** | No |
| **RentalLocation** | `isActive` + `deletedAt` | **Dar de baja** = `isActive=false` (sin `deletedAt`) | `DELETE` existente hace soft delete — UI usa deactivate |
| **ExcursionOperator** | `isActive` + `deletedAt` | **Dar de baja** = `isActive=false` | `DELETE` soft — UI usa deactivate |
| **HotelProfile** | Admin limitado (aprobar pendientes) | **Fuera de Slice 9** — Próximamente | — |
| **ContentSubcategory** | Referencia catálogo | No archivar en este slice | — |

**Principio:** órdenes, tickets, pagos, reviews, referrals, audit logs y descuentos **no se borran**.

---

## 2. Migración Prisma

`20260613120000_admin_content_lifecycle_audit` — solo enum `AuditAction`:

- `EVENT_RESTORED`
- `GASTRO_PROFILE_SUSPENDED` / `GASTRO_PROFILE_ACTIVATED`
- `RENTAL_LOCATION_DEACTIVATED` / `RENTAL_LOCATION_ACTIVATED`
- `EXCURSION_OPERATOR_DEACTIVATED` / `EXCURSION_OPERATOR_ACTIVATED`

Archivar evento reutiliza `EVENT_POSTPONED` (status `PAUSED`).

```bash
cd apps/api && pnpm exec prisma migrate deploy
```

---

## 3. Endpoints API (ADMIN)

| Método | Ruta | Acción |
|--------|------|--------|
| POST | `/admin/events/:eventId/pause` | Archivar (`PAUSED`) + audit |
| POST | `/admin/events/:eventId/restore` | Restaurar (`APPROVED`) + audit |
| POST | `/admin/rental-locations/:id/deactivate` | `isActive=false` |
| POST | `/admin/rental-locations/:id/activate` | `isActive=true` |
| POST | `/admin/excursion-operators/:id/deactivate` | `isActive=false` |
| POST | `/admin/excursion-operators/:id/activate` | `isActive=true` |
| PATCH | `/admin/gastronomicos/:profileId/status` | ACTIVE/SUSPENDED + audit (existente, mejorado) |

Body opcional: `{ "reason": "..." }` (`adminContentLifecycleBodySchema`).

---

## 4. Visibilidad pública

- Listados/search/calendar/trending: ya filtran `status: APPROVED`.
- **Nuevo:** `public-content-availability.util.ts` — oculta eventos rental/excursion si `rentalLocation` u `excursionOperator` está inactivo (`isActive=false` o `deletedAt` set).
- Detalle público `GET /public/events/:id`: 404 si no `APPROVED` o padre inactivo (vía `publicWhere`).
- Gastro: público ya filtra `GastroProfile.status: ACTIVE`.

Acceso directo a URL archivada → **404** (patrón existente).

---

## 5. UI Admin

| Pantalla | Acciones |
|----------|----------|
| `/admin/eventos` | Archivar / Restaurar (`AdminEventLifecycleActions`) |
| `/admin/rentals/locales/[id]` | Dar de baja / Reactivar local + archivar productos |
| `/admin/excursiones/operadores/[id]` | Dar de baja / Reactivar operador + archivar excursiones |
| `/admin/gastronomicos` | Suspender / Activar (ya existía + confirmación) |

Modal `AdminArchiveConfirmModal` — avisa que no borra historial.

---

## 6. Smoke automatizado

```bash
pnpm --filter api run smoke:v31-admin-archive
```

Verifica: pause → PAUSED, oculto público, restore → APPROVED, operador `isActive=false`, filtros padre inactivo, audit logs, cleanup efímero.

Regresión V3.1:

```bash
pnpm --filter api run smoke:v31-stabilization
pnpm --filter api run smoke:v31-subcategories
```

---

## 7. Smoke manual sugerido

1. Admin → evento aprobado → Archivar → no aparece en `/explore` ni `/categoria/event`.
2. Restaurar → vuelve a aparecer.
3. Gastro → Suspender → no en `/gastronomicos/[id]` público.
4. Rental local → Dar de baja → productos no en explore.
5. Operador excursión → Dar de baja → excursiones ocultas.
6. `/admin/auditoria` — ver acciones nuevas.

---

## 8. Riesgos pendientes

1. **DELETE legacy** en rental/excursion operators sigue disponible vía API — no usar desde UI; preferir deactivate.
2. **Hoteles** sin flujo archivar en Slice 9.
3. **Eventos CANCELLED** no se restauran automáticamente (solo `PAUSED` → `APPROVED`).
4. **Prod:** aplicar migración audit antes de deploy API.

---

## 9. Archivos principales

- `apps/api/src/modules/admin/admin-content-lifecycle.service.ts`
- `apps/api/src/common/utils/public-content-availability.util.ts`
- `apps/api/scripts/smoke-v31-admin-archive.ts`
- `apps/web/components/admin/AdminEventLifecycleActions.tsx`
- `apps/web/components/admin/AdminRentalLocationLifecycleActions.tsx`
- `apps/web/components/admin/AdminExcursionOperatorLifecycleActions.tsx`
