# V3.2 Slice 10 — Categorías Próximamente + ADMIN (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`

## Cambios

- Shared `category-availability.ts`: `event` + `gastro` = `comingSoon`.
- FE: overlay gateway, nav disabled, `/categoria/*` screen, sitemap sin event/gastro.
- API: `publicWhere` excluye coming-soon; ADMIN bypass vía `OptionalJwtOrDevAuthGuard`.
- Portales `/admin` `/producer` `/gastro` sin bloqueo.

## Reactivar

En `packages/shared/src/category-availability.ts` poner `event`/`gastro` en `'public'` y re-agregar URLs al sitemap.

## Validación

`pnpm --filter shared|api|web run build`
