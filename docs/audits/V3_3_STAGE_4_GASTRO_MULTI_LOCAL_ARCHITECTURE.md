# V3.3 — Etapa 4 — Arquitectura Gastro Multi-local

**Fecha:** 2026-08-31  
**Branch:** `feat/v1-s03-api-foundation`  
**Slice:** 4.1 (solo diseño; sin migración definitiva en este slice)

---

## Estado actual

### Prisma

| Modelo | Rol actual |
|--------|------------|
| `User` | Cuenta autenticada; rol `GASTRO_OWNER` |
| `GastroProfile` | Unidad operativa = **propuesta/local** público: ubicación, contactos, `publicEventId`, `status`, descuentos, scanners |
| `UserGastroMembership` | Relación N:M usuario ↔ perfil (`@@unique([userId, profileId])`) — **ya permite N perfiles por usuario** |
| `ScannerAccount` | `parentProfileId` → `GastroProfile` |
| `GastroDiscount` | `gastroProfileId` → `GastroProfile` |
| `GastroContent` | Por perfil / evento público |
| `Event` | Discovery vía `GastroProfile.publicEventId` (único por propuesta) |

`ProfileStatus` ya incluye: `DRAFT`, `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`.

**No hay** entidades `GastroOrganization`, `GastroLocation` ni `GastroBrand` en el schema.

### Servicios (supuestos singulares)

| Ubicación | Problema |
|-----------|----------|
| `ProfileRegistrationService.createGastroActive` | Bloquea segundo perfil; crea con `status: ACTIVE` |
| `GastroLocalService.getOwnedProfile` | `findFirst` solo `ACTIVE` |
| `GastroLocalService.createMyLocal` | Actualiza único perfil; error si ya hay `publicEventId` |
| `GastroPortalDiscountsService.getOwnedProfile` | Mismo patrón singular |
| `GastroDashboardService.resolveProfile` | Mismo patrón singular |
| `ProfilesAuthorizationService.hasGastroAccess` | Requiere perfil `ACTIVE` — bloquea portal con `PENDING` |
| `ProfilesAuthorizationService.canManageGastroProfile` | Requiere perfil `ACTIVE` |

### Infraestructura admin existente

- `GET /admin/profiles/gastro/pending` + `POST .../approve`
- `GET/PATCH /admin/gastronomicos` con cambio de `status` (incl. `REJECTED`, `SUSPENDED`)
- `GastroPublicEventSyncService` ya mapea `ACTIVE` → evento `APPROVED`; otros → `PAUSED`

### Scanner

`ScannerAccountsService.getManagedGastroProfileIds` ya lista N perfiles `ACTIVE` y el portal tiene picker cuando N > 1.

---

## Supuestos singulares encontrados

1. **Un usuario Gastro = un `GastroProfile` operativo** en servicios de portal (local, descuentos, dashboard).
2. **Registro** impide alta de segundo perfil.
3. **Portal API** exige perfil `ACTIVE` para cualquier acceso (`hasGastroAccess`).
4. **Alta de local** = actualizar shell existente, no crear propuesta nueva.
5. **Aprobación** no aplicada en registro (`createGastroActive` → `ACTIVE` directo).

No se encontró constraint Prisma que limite a 1 perfil por usuario.

---

## Alternativas evaluadas

### Opción A — `GastroProfile` = propuesta/local (recomendada)

```
User (GASTRO_OWNER)
  └── UserGastroMembership (N)
        └── GastroProfile (propuesta/local)
              ├── publicEventId (único)
              ├── status (independiente)
              ├── ScannerAccount[]
              └── GastroDiscount[]
```

Reutilización de dirección/contacto: **UX copy/prefill → snapshot propio** (sin entidad ubicación compartida).

### Opción B — Organización + ubicación + propuesta

```
GastroOrganization → GastroLocation → GastroProfile
```

Más expresivo pero requiere 2–3 modelos nuevos, migración pesada y cambios transversales sin beneficio inmediato para Etapa 4.

### Opción C — Solo `GastroLocation` compartida

Introduce acoplamiento rígido entre propuestas en la misma dirección (contactos distintos por propuesta se vuelven ambiguos). Rechazada.

---

## Decisión

**Opción A** — ampliar el modelo existente sin nuevas entidades Prisma.

Motivos:

- `UserGastroMembership` ya modela N perfiles.
- `GastroProfile` ya es la unidad pública/operativa con `status`, `publicEventId`, descuentos y scanners.
- Reutilización = copiar campos al crear (no referencia compartida).
- Aprobación por perfil con `ProfileStatus.PENDING` existente.
- Menor riesgo para usuarios actuales (1 perfil sigue funcionando).

**No se crean** `GastroOrganization`, `GastroLocation`, `GastroBrand`, `GastroBranch`, `GastroVenue`.

---

## Modelo conceptual

```
CUENTA GASTRO (User + memberships)
│
├── Centro / Restaurante          [GastroProfile #1, ACTIVE]
│     ├── dirección (snapshot)
│     ├── WhatsApp A
│     ├── scanners → parentProfileId = #1
│     └── descuentos → gastroProfileId = #1
│
├── Centro / Cafetería            [GastroProfile #2, PENDING]
│     ├── misma dirección (copiada, editable)
│     ├── WhatsApp B
│     └── sin publicación hasta aprobación
│
└── Cerro / Restaurante           [GastroProfile #3, ACTIVE]
      └── ...
```

Estados **independientes** por propuesta. Un `PENDING` no bloquea otros `ACTIVE`.

---

## Impacto Prisma

**Sin modelos nuevos** en Etapa 4.

Posibles cambios futuros (fuera de alcance): `NotificationKind` para aprobación de locales.

Migración: **ninguna obligatoria** para multi-local; datos existentes ya son válidos (1 membership → 1 profile).

---

## Impacto API

| Área | Cambio |
|------|--------|
| Ownership | `GastroOwnershipService`: `listManagedGastroProfiles`, `assertCanManageProfile`, `resolveProfileId` |
| Portal access | `hasGastroAccess` → membership con perfil `DRAFT/PENDING/ACTIVE` |
| Operaciones | Descuentos/scanners/dashboard requieren perfil `ACTIVE` + `profileId` explícito o default |
| Endpoints nuevos | `GET /gastro/locations`, `POST /gastro/locations` |
| Endpoints existentes | `GET/PATCH /gastro/local?profileId=` (compat: sin param = perfil primario) |
| Registro | `createGastroActive` → `PENDING`; permitir N perfiles |
| Admin | Reutilizar `/admin/gastronomicos` + cola `profiles/gastro/pending`; `reject` vía status `REJECTED` |
| Discovery | Solo `ACTIVE`; `publicEventId` por propuesta; misma coordenada ≠ dedup |

---

## Impacto frontend

| Área | Cambio |
|------|--------|
| Portal | Listado «Mis locales», selector de local activo (URL `?profileId=`) |
| Crear propuesta | Flujo nuevo + opción «usar datos existentes» (prefill formulario) |
| Secciones | Local, contenido, descuentos, scanners, dashboard scoped al `profileId` |
| Estados | Badge `PENDING` / `REJECTED` visible en portal |

---

## Impacto Scanner

Sin rediseño Scanner V3. `parentProfileId` sigue apuntando al `GastroProfile` correcto. Picker cuando N > 1 (ya existe). Solo asegurar que `getManagedGastroProfileIds` use ownership centralizado.

---

## Impacto descuentos

`GastroDiscount.gastroProfileId` sin cambio. CRUD portal recibe/resuelve `profileId`. Etapa 5 (re-aprobación, vencidos, admin create) no se implementa aquí.

---

## Migración

1. **Datos existentes:** perfiles `ACTIVE` con membership → sin acción.
2. **Código:** eliminar guards de singularidad; centralizar ownership.
3. **Comportamiento nuevas altas (Slice 4.4):** `PENDING` hasta aprobación admin.
4. **Sin reset DB** ni migración manual para usuarios.

---

## Compatibilidad

| Caso | Comportamiento |
|------|----------------|
| Usuario con 1 local ACTIVE | Igual que antes; endpoints sin `profileId` resuelven ese perfil |
| `GET /gastro/local` | Sigue funcionando (perfil primario ACTIVE o más reciente gestionable) |
| Scanner existente | `parentProfileId` preservado |
| Deep delete | Sin ampliación; ownership por `profileId` ya alineado |

---

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Endpoints sin `profileId` operan sobre perfil equivocado con N > 1 | Default explícito: primer ACTIVE; UI fuerza selector |
| `hasGastroAccess` demasiado permisivo | Separar `hasGastroPortalAccess` vs operaciones `ACTIVE` |
| Aprobación sin notificación | Deuda; admin panel + status visible en portal |
| Métricas dashboard mezcladas | Dashboard scoped por `profileId` |
| Código legacy `findFirst` | Auditoría estática en Slice 4.6 |

---

## Respuestas a preguntas de diseño

| # | Respuesta |
|---|---------|
| 1 | `GastroProfile` = propuesta/local público y operativo |
| 2 | Sí, es la unidad natural de propuesta |
| 3 | Sí, `UserGastroMembership` permite N a nivel DB |
| 4 | Servicios listados arriba asumen singularidad |
| 5 | No hace falta entidad organización en Etapa 4 |
| 6 | No hace falta entidad ubicación física compartida |
| 7 | Copy/prefill sin modelo compartido |
| 8 | Cada propuesta tiene su `publicEventId` único |
| 9 | `ScannerAccount.parentProfileId` = propuesta correcta |
| 10 | `GastroDiscount.gastroProfileId` = propuesta correcta |
| 11 | Deep delete por perfil; sin cambio estructural |
| 12 | Admin usa colas y `/admin/gastronomicos` existentes |
