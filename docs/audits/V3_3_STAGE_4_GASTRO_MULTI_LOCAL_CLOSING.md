# V3.3 — Etapa 4 — Cierre Gastro Multi-local

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`

---

## 1. Arquitectura elegida

**Opción A:** `User` + `UserGastroMembership` (N) → `GastroProfile` = propuesta/local.

Sin entidades nuevas (`GastroOrganization`, `GastroLocation`, etc.).

Documento de diseño: `docs/audits/V3_3_STAGE_4_GASTRO_MULTI_LOCAL_ARCHITECTURE.md`

---

## 2. Modelo conceptual

```
Cuenta Gastro (User + memberships)
└── GastroProfile[] (cada uno = propuesta/local independiente)
      ├── status propio (DRAFT/PENDING/ACTIVE/REJECTED/SUSPENDED)
      ├── publicEventId único
      ├── ubicación/contactos (snapshot)
      ├── ScannerAccount[] (parentProfileId)
      └── GastroDiscount[] (gastroProfileId)
```

Reutilización de dirección/contactos: **copy/prefill** al crear (no referencia compartida).

---

## 3. Prisma/migraciones

| Item | Detalle |
|------|---------|
| Modelos nuevos | **Ninguno** |
| Migraciones Etapa 4 | **Ninguna** |
| Ejecutadas contra DB | **NO EJECUTADO** (sin Docker/DB local en esta sesión) |

El schema existente ya soportaba N memberships por usuario.

---

## 4. Ownership

**`GastroOwnershipService`** centraliza:

- `listManagedProfiles` / `listOperationalProfiles`
- `assertCanManageProfile` (portal: DRAFT/PENDING/ACTIVE)
- `assertCanOperateProfile` (ACTIVE)
- `resolveManagedProfileId` / `resolveOperationalProfileId`
- `findSetupShellProfile` (onboarding sin `publicEventId`)

**`ProfilesAuthorizationService`:**

- `hasGastroAccess` → portal (incluye PENDING)
- `hasActiveGastroOperationalAccess` → descuentos/scanners
- `canManageGastroProfile` → permite PENDING para edición

---

## 5. Portal Gastro

| Feature | Implementación |
|---------|----------------|
| Listado | `GET /gastro/locations` + UI `GastroLocationsList` |
| Selector | `GastroLocationSelector` + `GastroActiveLocationContext` (`?profileId=`) |
| Crear propuesta | `/gastro/local/nuevo` + `POST /gastro/locations` |
| Editar | `GET/PATCH /gastro/local?profileId=` |
| Estados | `GastroLocationStatusBadge` |

---

## 6. Reutilización ubicación/contactos

- UI: checkboxes copiar ubicación / contactos desde local existente
- API: `copyFromProfileId` en `gastroLocalCreateSchema` + merge server-side en `applyCopyFromProfile`
- **Snapshot:** editar la copia no altera el origen
- **No** se copian imágenes/galería automáticamente

---

## 7. Approval workflow

| Evento | Comportamiento |
|--------|----------------|
| Registro gastro | `createGastroActive` → `PENDING` |
| Nuevo local adicional | `createAdditionalLocal` → `PENDING` |
| Completar shell (primer local) | Mantiene `PENDING` del registro |
| Admin aprueba | `POST /admin/profiles/gastro/:id/approve` → `ACTIVE` + sync visibility evento |
| Admin rechaza | `POST /admin/profiles/gastro/:id/reject` → `REJECTED` |
| Locales ACTIVE previos | Sin cambios |

Discovery público: solo `GastroProfile.status === ACTIVE` (`public-gastro-locations.service`).

---

## 8. Admin

- Cola: `GET /admin/profiles/gastro/pending`
- Aprobar/rechazar: endpoints dedicados
- Panel existente: `/admin/gastronomicos` con filtro/status patch (ACTIVE, REJECTED, SUSPENDED)

Notificaciones in-app para aprobación: **no implementadas** (sin `NotificationKind` nuevo).

---

## 9. Scanner

- Sin cambios Scanner V3 (username auth intacto)
- `ScannerAccountsService` ya soportaba N perfiles + picker en portal
- `parentProfileId` sigue siendo la unidad de scope

---

## 10. Discounts

- CRUD portal scoped por `?profileId=` (default: primer ACTIVE)
- Requiere perfil operativo ACTIVE con `publicEventId`
- `GastroDiscount.gastroProfileId` sin cambio de schema

---

## 11. Discovery

- Cada propuesta ACTIVE = publicación independiente (`publicEventId` único)
- Misma coordenada no deduplica
- PENDING/REJECTED excluidos de listado público

---

## 12. Backward compatibility

| Caso | Resultado |
|------|-----------|
| Usuario con 1 local ACTIVE | Endpoints sin `profileId` resuelven ese perfil |
| `GET /gastro/local` | Compatible |
| Memberships existentes | Preservadas |
| Scanner existente | `parentProfileId` intacto |

---

## 13. Builds/tests

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | **PASS** |
| `pnpm --filter web run build` | **PASS** |
| `pnpm --filter scanner run build` | **PASS** |
| `pnpm --filter api run build` | **FAIL** (104 errores TS preexistentes, no introducidos por Etapa 4 — `email: string \| null` post Scanner V3) |
| `prisma validate` | **PASS** |
| `pnpm --filter api run test:gastro-multi-local` | **PASS** |
| DB smoke / migraciones ejecutadas | **NO EJECUTADO** |

---

## 14. QA manual pendiente

Acumulado para cierre global V3.3:

- Cuenta gastro existente: portal, local ACTIVE visible
- Nuevo local: crear, queda PENDING, no público
- Reutilización: copiar dirección/teléfono/WhatsApp, editar copia, origen intacto
- Mismo lugar dos propuestas (Restaurante + Cafetería)
- Admin: ver pendiente, aprobar, rechazar, publicación tras aprobación
- Scanner: elegir local, crear, scope correcto
- Descuentos: elegir local, pertenencia correcta
- Mobile: selector, formulario, estados

---

## 15. Riesgos/deuda

| Riesgo/Deuda | Notas |
|--------------|-------|
| API build roto (pre-existente) | Errores `email \| null` en varios servicios |
| Sin notificaciones aprobación | Admin panel + badge portal |
| `getOwnedProfile` local en discounts service | Wrapper sobre ownership — nombre legacy |
| `ScannerAccountsService.getManagedGastroProfileIds` | Duplica lógica ownership (deuda menor) |
| Páginas descuentos detalle/editar | No todas pasan `profileId` en URL aún (usan default ACTIVE) |

---

## 16. Commits

```
612fd2d docs(v3.3): design gastro multi-local architecture
f582517 feat(v3.3): support multiple gastro locations per account
3d7481d feat(v3.3): add multi-location gastro portal
d037b4c feat(v3.3): add gastro location approval workflow
4135e41 refactor(v3.3): scope gastro operations by location
```

(+ commit cierre pendiente: `docs(v3.3): close gastro multi-location stage`)

---

## Auditoría estática — supuestos singulares

| Patrón | Estado |
|--------|--------|
| `GastroLocalService` singular | **Corregido** |
| `createGastroActive` bloqueo N=1 | **Corregido** |
| `hasGastroAccess` solo ACTIVE | **Corregido** |
| `gastro-portal-discounts.getOwnedProfile` | **Refactorizado** (usa ownership) |
| `gastro-dashboard.resolveProfile` | **Refactorizado** |
| `scanner-accounts.getManagedGastroProfileIds` | **Deuda** (funcional, no centralizado) |
| Endpoints sin `profileId` | **Compatibilidad deliberada** (default primer ACTIVE) |
