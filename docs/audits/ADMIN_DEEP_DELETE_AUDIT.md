# Admin Deep Delete — Auditoría de impacto

**Proyecto:** Yo Te Invito  
**Fecha:** 2026-06-23  
**Relacionado:** `ADMIN_USER_DELETE_AUDIT.md` (delete seguro), `admin-content-purge.service.ts` (hard-delete con guardia de historial)

---

## Principio

**No delete ciego.** Flujo: click eliminar → preflight → modal de impacto → confirmación fuerte (`ELIMINAR`) → delete transaccional → audit log con snapshot.

**Eliminación visible vs historial crítico:** el ADMIN ve la entidad como eliminada (listados, login, público). Tickets, órdenes, pagos, cupones escaneados, reviews y `AuditLog` se **conservan** salvo datos auxiliares sin valor legal.

---

## Entidades soportadas

| `entityType` | Modelo Prisma | Etiqueta admin |
|--------------|---------------|----------------|
| `USER` | `User` | `/admin/usuarios` |
| `PRODUCER` | `ProducerProfile` | `/admin/productoras` |
| `GASTRO` | `GastroProfile` | `/admin/gastronomicos` |
| `HOTEL` | `HotelProfile` | `/admin/hoteles` |
| `EVENT` | `Event` | `/admin/eventos` |
| `EXCURSION_OPERATOR` | `ExcursionOperator` | `/admin/excursiones` |
| `RENTAL_LOCATION` | `RentalLocation` | `/admin/rentals` |

---

## Clasificación de impacto

```ts
type DeleteImpactLevel =
  | 'CASCADE_DELETE'   // se elimina físicamente
  | 'SOFT_DELETE'      // deletedAt / status / isActive
  | 'ANONYMIZE'        // usuario: email/nombre
  | 'CRITICAL_HISTORY' // se conserva; advertencia fuerte
  | 'BLOCKER';         // impide delete (política dura)
```

| Nivel | Ejemplos | Acción en deep delete |
|-------|----------|------------------------|
| `CASCADE_DELETE` | favoritos, carrito, push subs, notificaciones, claims no usados, ticket types sin ventas | `delete` |
| `SOFT_DELETE` | eventos, locales, productoras, descuentos, scanners | `soft_delete` |
| `ANONYMIZE` | usuario con historial | `detach` + `User.status=DELETED` |
| `CRITICAL_HISTORY` | tickets, órdenes, pagos, reviews, claims USED, validaciones scanner | `keep` |
| `BLOCKER` | self-delete, último admin, cuenta maestro | `block` — **no bypass con force** |

---

## Relaciones por entidad

### USER

| Tipo impacto | Relación | Severidad | Acción |
|--------------|----------|-----------|--------|
| BLOCKER | `PROTECTED_MASTER`, `SELF_DELETE`, `LAST_ADMIN` | blocker | block |
| SOFT_DELETE | `Event` (producerId / producerProfileId) | warning | soft_delete |
| SOFT_DELETE | `GastroProfile` / `HotelProfile` membresías | warning | soft_delete |
| CRITICAL_HISTORY | `Order`, `Ticket`, `Payment` | critical | keep |
| CRITICAL_HISTORY | `Review`, disputes, B2B reviews | critical | keep |
| CASCADE_DELETE | favorites, cart, notifications, push | info | delete |
| ANONYMIZE | `User` con historial crítico | critical | detach |

**Ejecución:** sin historial crítico → hard delete (como delete seguro). Con historial → soft delete + anonimizar email/nombre; eventos y perfiles comerciales se ocultan; historial operativo intacto.

### PRODUCER (`ProducerProfile`)

| Tipo | Relación | Acción |
|------|----------|--------|
| SOFT_DELETE | `Event` (`producerProfileId`) | soft_delete |
| CRITICAL_HISTORY | órdenes/tickets/pagos/reviews por evento | keep |
| SOFT_DELETE | `ScannerAccount` (parent PRODUCER) | soft_delete |
| CASCADE_DELETE | memberships si único miembro | delete |

### GASTRO (`GastroProfile`)

| Tipo | Relación | Acción |
|------|----------|--------|
| SOFT_DELETE | `publicEventId` → Event | soft_delete |
| SOFT_DELETE | `GastroDiscount` | soft_delete (CANCELLED) |
| CASCADE_DELETE | claims ACTIVE (no usados) | delete |
| CRITICAL_HISTORY | claims USED, `GastroDiscountValidation` | keep |
| CASCADE_DELETE | `GastroContent`, followers | delete |
| SOFT_DELETE | `ScannerAccount` (parent GASTRO) | soft_delete |
| CRITICAL_HISTORY | reviews del evento público | keep |

### HOTEL (`HotelProfile`)

| Tipo | Relación | Acción |
|------|----------|--------|
| SOFT_DELETE | `publicEventId` | soft_delete |
| SOFT_DELETE | perfil `SUSPENDED` | soft_delete |

### EVENT

| Tipo | Relación | Acción |
|------|----------|--------|
| SOFT_DELETE | evento (`deletedAt`, `CANCELLED`) | soft_delete |
| CASCADE_DELETE | media, tags, occurrences, ticket types sin ventas | delete |
| CRITICAL_HISTORY | orders, tickets, payments, scans, reviews | keep |
| SOFT_DELETE | `GastroDiscount` hijo | soft_delete |

### RENTAL_LOCATION / EXCURSION_OPERATOR

| Tipo | Relación | Acción |
|------|----------|--------|
| SOFT_DELETE | local/operador (`deletedAt`, `isActive=false`) | soft_delete |
| SOFT_DELETE | productos/excursiones (`Event`) | soft_delete |
| CRITICAL_HISTORY | historial por producto | keep |

---

## Política de ejecución

| Situación | Comportamiento |
|-----------|----------------|
| `blockerCount > 0` (política) | `canDelete=false`; no `force` |
| Historial crítico | `requiresExtraConfirmation=true`; checkbox + `acknowledgedCriticalHistory` |
| Contenido operativo | `requiresForce=true`; payload `force: true` |
| `confirmationText` | debe ser `ELIMINAR` |
| Audit | `ADMIN_DEEP_DELETE_EXECUTED` con `preflightSnapshot`; `ADMIN_DEEP_DELETE_BLOCKED` al rechazar |

---

## Endpoints

| Método | Path | Rol |
|--------|------|-----|
| `GET` | `/admin/deep-delete/:entityType/:entityId/preflight` | ADMIN |
| `DELETE` | `/admin/deep-delete/:entityType/:entityId` | ADMIN |

Body delete: `{ force?, confirmationText, acknowledgedCriticalHistory? }`

---

## Protecciones (siempre)

- No eliminar cuenta maestro (`MASTER_USER_EMAIL`)
- No self-delete desde admin
- No eliminar último `ADMIN` del tenant

---

## QA manual (pendiente staging)

Ver checklist § Admin Deep Delete en `Yo_Te_Invito_Checklist_Unificada_Depurada.md`.

---

## Riesgos

- Perfiles huérfanos si falla transacción a mitad — mitigado con `$transaction`
- `AuditLog.actorId` sin FK — conservado a propósito
- Force delete en prod con pagos reales — requiere confirmación explícita; preferir staging primero
