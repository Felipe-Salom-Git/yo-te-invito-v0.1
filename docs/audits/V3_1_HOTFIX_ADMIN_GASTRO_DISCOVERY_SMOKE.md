# V3.1 Hotfix — Admin Gastro Public Discovery Smoke

**Fecha:** 2026-06-14  
**Script:** `pnpm --filter api run smoke:v31-admin-gastro-discovery`  
**Alcance:** Validar sync `GastroProfile` → `Event` público para discovery.

---

## Causa corregida

Locales creados/activados desde Admin podían quedar **sin `publicEventId`** o sin evento `APPROVED` cuando:

1. `updateStatus(ACTIVE)` solo sincronizaba si ya existía `publicEventId` o si pasaban checks parciales de campos.
2. `update()` en perfil `ACTIVE` sin `publicEventId` llamaba `syncVisibilityForProfile` (no-op) si el body no tocaba campos de `shouldSyncGastroPublicEventAfterUpdate`.
3. Discovery público no filtraba gastro por estado del perfil (defensa ante desync).

**Fix:** `syncActiveProfilePublicEvent` en `AdminGastroLocationsService`; activación siempre sincroniza; update crea evento si falta; filtro `gastroProfilePublic.status=ACTIVE` en `public-content-availability.util.ts`.

---

## Queries debug (DB)

```sql
-- Perfil gastro
SELECT id, "displayName", status, "publicEventId", "subcategoryId", city, "tenantId"
FROM "GastroProfile"
WHERE "tenantId" = 'tenant-demo'
ORDER BY "createdAt" DESC
LIMIT 20;

-- Evento vinculado
SELECT e.id, e.category, e.title, e.status, e."subcategoryId", e.city, e."tenantId"
FROM "Event" e
JOIN "GastroProfile" g ON g."publicEventId" = e.id
WHERE g."tenantId" = 'tenant-demo';
```

---

## Smoke automático

| Paso | Esperado |
|------|----------|
| `create` admin ACTIVE + publish | `publicEventId` set |
| Event vinculado | `category=gastro`, `status=APPROVED` |
| Query discovery público | count = 1 |
| Detail público | perfil ACTIVE por `publicEventId` |
| `updateStatus` SUSPENDED | count = 0 |
| `updateStatus` ACTIVE | count = 1 |
| DRAFT + publish false | sin `publicEventId` |
| Activar DRAFT | crea `publicEventId` |

**Cleanup:** datos `[smoke-test]` eliminados al finalizar.

---

## QA manual

- [ ] `/admin/gastronomicos/nuevo` → crear local ACTIVE + publicar
- [ ] `/categoria/gastro` → card visible
- [ ] `/explore?category=gastro` → card visible
- [ ] Ficha `/restaurants/[publicEventId]` o `/gastronomicos/[profileId]`
- [ ] Suspender → desaparece
- [ ] Reactivar → vuelve

---

## Locales existentes en prod (sin publicEventId)

Reactivar desde admin (`Suspender` → `Activar`) o editar y guardar con perfil ACTIVE dispara sync y crea el evento público.
