# V3.2 Slice 10 — Categorías Próximamente + preview por rol (cierre + hotfix)

**Fecha:** 2026-07-31 (Slice) · **Hotfix owners:** 2026-08-07
**Rama:** `feat/v1-s03-api-foundation`

## Policy vigente (hotfix)

| Rol | Eventos | Gastronomía | Rentals / Excursiones |
| --- | ---: | ---: | ---: |
| Anonymous | ❌ Próximamente | ❌ Próximamente | ✅ |
| USER | ❌ | ❌ | ✅ |
| PRODUCER_OWNER / PRODUCER_STAFF | ✅ preview | ❌ | ✅ |
| GASTRO_OWNER | ❌ | ✅ preview | ✅ |
| ADMIN | ✅ preview | ✅ preview | ✅ |

**Nota hotfix**

```txt
Eventos:
público bloqueado
ADMIN + Productora (PRODUCER_OWNER, PRODUCER_STAFF) autorizados para preview

Gastronomía:
público bloqueado
ADMIN + Gastronómico (GASTRO_OWNER) autorizados para preview
```

No hay `GASTRO_STAFF` en el enum de roles; no se inventaron roles.

## Cambios

- Shared `category-availability.ts`: `event` + `gastro` = `comingSoon` + `CATEGORY_PREVIEW_ROLES`.
- FE: gateway tiles por categoría, nav mobile role-aware, `/categoria/*` vía `canAccessPublicCategory`.
- API: `publicWhere` excluye solo categorías denegadas según `role` JWT (`OptionalJwtOrDevAuthGuard`).
- Portales `/admin` `/producer` `/gastro` sin bloqueo.
- Test: `pnpm --filter api run test:category-availability` (alias `smoke:v32-category-availability`).

## Reactivar para público

En `packages/shared/src/category-availability.ts` poner `event`/`gastro` en `'public'` y re-agregar URLs al sitemap.

## Validación

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
pnpm --filter api run test:category-availability
git diff --check
```
