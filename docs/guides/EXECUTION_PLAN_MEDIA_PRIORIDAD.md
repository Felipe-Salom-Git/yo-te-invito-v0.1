# Execution Plan — Media Prioridad (4 Slides)

## Objetivo general

Implementar los 4 ítems de **media prioridad** según `docs/project/ROLES_OBJECTIVES_SPEC.md`:

1. **Gastro**: Contenido, descuentos, validaciones
2. **Usuario**: Configuración completa — Perfil, preferencias, historial
3. **Admin**: Aprobación de payouts — Revisar y aprobar retiros
4. **Admin**: Gestión de roles — Asignar roles a usuarios

**Modo:** LocalStorage maqueta. Respetar `PROJECT_RULES.md` y `AI_WORKFLOW_RULES.md`.

---

# Slide 1 — Gastro: contenido, descuentos, validaciones

## Objetivo

Dashboard gastro con contenido editorial, CRUD descuentos y log de validaciones.

## Estado actual

- Shell `/gastro`
- Eventos con categoría `gastro` ya existen
- No hay modelo Discount ni ValidationLog

## Archivos a crear

- `repositories/interfaces.ts`: `GastroContent`, `Discount`, `DiscountValidationLog`, `GastroRepo`
- `lib/local-db/seed.ts`: colecciones `gastroContent`, `discounts`, `discountValidations`
- `app/(portal)/gastro/layout.tsx` (nav)
- `app/(portal)/gastro/contenido/page.tsx`
- `app/(portal)/gastro/descuentos/page.tsx`
- `app/(portal)/gastro/validaciones/page.tsx`

## Pasos

1. Definir interfaces y repo
2. Seed demo
3. Rutas con CRUD básico

---

# Slide 2 — Usuario: configuración completa

## Objetivo

Perfil editable, preferencias (ciudad, notificaciones), historial (eventos asistidos, esperados).

## Estado actual

- `/cuenta`, `/cuenta/preferencias`, `/cuenta/configuracion`, `/cuenta/eventos-asistidos`, `/cuenta/eventos-esperados` existen como shells

## Archivos a modificar

- `repositories/interfaces.ts`: `UserProfile`, `UserPreferences`, extensión `UsersRepo`
- Seed y LocalDB para preferencias
- Páginas cuenta con formularios funcionales

---

# Slide 3 — Admin: aprobación de payouts

## Objetivo

Admin puede revisar solicitudes de retiro (REQUESTED) y aprobar/rechazar.

## Estado actual

- `PayoutsRepo` existe; producer crea payouts
- No hay ruta admin para aprobar

## Archivos a crear/modificar

- `PayoutsRepo.updateStatus(id, status)` o `approve(id)`, `reject(id)`
- `app/(portal)/admin/payouts/page.tsx` — lista, acciones Aprobar/Rechazar

---

# Slide 4 — Admin: gestión de roles

## Objetivo

Admin puede asignar rol a usuarios (lista usuarios, cambiar rol).

## Estado actual

- Usuarios en LocalDB y demo-users
- Sin UI para asignar roles

## Archivos a crear/modificar

- `UsersRepo.list(tenantId)`, `UsersRepo.updateRole(userId, role)` (o extender)
- Seed: usuarios en `users` collection
- `app/(portal)/admin/usuarios/page.tsx` o `/admin/roles` — lista, selector de rol

---

# Checklist final

- [ ] Gastro: contenido, descuentos, validaciones
- [ ] Usuario: perfil, preferencias, historial
- [ ] Admin: aprobación payouts
- [ ] Admin: gestión de roles
