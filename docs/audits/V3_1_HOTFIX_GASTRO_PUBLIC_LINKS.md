# V3.1 Hotfix — Links públicos gastronómicos

**Fecha:** 2026-06-14  
**Problema:** Cards gastro abrían `/gastronomicos/[publicEventId]?tenantId=tenant-demo` sin contenido.

---

## Causa

1. **`next.config.js`** redirigía permanentemente `/restaurants/:id` → `/gastronomicos/:id`, mezclando IDs:
   - Discovery usa `Event.id` (= `publicEventId`)
   - `/gastronomicos/[id]` espera `GastroProfile.id`
2. **`getContentDetailHref`** agregaba siempre `?tenantId=tenant-demo` aunque la página ya usa ese default.

## Fix

| Pieza | Cambio |
|-------|--------|
| `next.config.js` | Eliminado redirect `/restaurants` → `/gastronomicos` |
| `contentRoutes.ts` | Gastro discovery → `/restaurants/[publicEventId]`; perfil → `/gastronomicos/[profileId]`; sin query tenant por defecto |
| `heroModel.ts`, `EventCard.tsx`, `publicReviewRoutes.ts`, `gastro-follow-href.ts` | Usan helper centralizado |

## Rutas finales

| Origen | ID | Ruta |
|--------|-----|------|
| Card discovery / explore / categoría | `Event.id` (publicEventId) | `/restaurants/[publicEventId]` |
| Admin CTA / perfil canónico | `GastroProfile.id` | `/gastronomicos/[profileId]` |
| **Incorrecto** | `publicEventId` en `/gastronomicos/` | Ya no ocurre |

## QA manual

- [ ] `/categoria/gastro` → click card → `/restaurants/[id]` sin `?tenantId=`
- [ ] `/explore?category=gastro` → idem
- [ ] Ficha carga contenido
- [ ] `/gastronomicos/[profileId]` desde admin sigue OK
- [ ] Eventos/rentals/excursiones sin regresión

## Smoke API

`pnpm --filter api run smoke:v31-admin-gastro-discovery` — valida sync + href esperado documentado.
