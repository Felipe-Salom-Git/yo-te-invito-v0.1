# V3.1 Etapa 16 — Banners, ciudades y navbar (cierre)

**Fecha:** 2026-06-15  
**Rama:** `feat/v1-s03-api-foundation`

---

## Resumen

Hotfix QA para banners editoriales admin, normalización de ciudades, selector de ciudad contextual en navbar y layout responsive del navbar.

**Hard delete:** no incluido en esta etapa (pendiente posterior).

---

## Slice 16.1 — Admin banners

### Problema

Al crear un banner editorial desde Admin, el listado quedaba como si fuera el único banner (race entre `setQueryData` e `invalidateQueries`, y mutaciones que no sincronizaban cache).

### Fix

- `syncAdminEditorialBannerList` centraliza actualización de cache admin tras create/update/reorder/activate/deactivate.
- Se evita invalidar la query admin inmediatamente tras create (solo invalidación de cache pública).
- Merge defensivo si la API devolviera un único ítem parcial.
- Smoke `smoke:v31-category-banners`: validación de desactivación solo sobre IDs creados por el smoke (no cuenta banners reales en DB).

### Commit

`279a872` — `fix(admin): preserve editorial banner list on create`

---

## Slice 16.2 — Normalización y display de ciudades

### Problema

Variantes de ciudad (`San Carlos de Bariloche`, `san-carlos-de-bariloche`, `san carlos de bariloche`) aparecían como ciudades distintas; la UI mostraba guiones.

### Fix

- Helpers en `@yo-te-invito/shared`: `formatCityLabel`, `cityToSlug`, `slugToCityLabel`, `cityNavbarLabel` (alias/wrappers sobre helpers existentes).
- `city-filter.util.ts` en API: filtro OR con variantes normalizadas en `list` y `search` de eventos públicos.
- Respuestas públicas de eventos devuelven `cityDisplayLabel` en listados.
- Dedupe en `useNavbarDiscoveryCities` por `normalizeCityKey`.

### Auditoría SQL (read-only — pendiente en VPS/producción)

```bash
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "Event" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "GastroProfile" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "RentalLocation" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "ExcursionOperator" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
```

**Backfill:** no ejecutado. Primero correr auditoría en entorno con datos reales.

### Commit

`a38e871` — `fix(discovery): normalize city labels and dedupe filters`

---

## Slice 16.3 — Navbar: filtrar contexto sin ir a Explore

### Problema

Cambiar ciudad desde rutas no-discovery redirigía a `/explore`. Home y categorías no aplicaban `?city=`.

### Fix

- `buildNavbarCityNavigationHref`: rutas `other` ya no redirigen a Explore (retorna `''`).
- `useNavbarCitySelection`: en rutas `other` guarda preferencia en `localStorage` sin navegar.
- Home y `/categoria/*` leen `?city=` y filtran carruseles vía `useHomeCarousels` / `useCategoryCarousels` / `useEventsByDate`.
- Persistencia URL ↔ storage para recargas.

### Commit

`8bcc216` — `fix(navbar): filter current context when changing city`

---

## Slice 16.4 — Navbar responsive

### Problema

Navbar apelmazado; selector de ciudad en doble fila (ciudad junto a links principales).

### Fix

- Ciudad movida al cluster derecho (Logo | Nav | … | Ciudad | Carrito | Menú).
- Selector compacto (`max-w ~7rem`, `text-xs`, truncate, `title` con nombre completo).
- Mobile: selector visible en header + opción en drawer.
- `cityNavbarLabel` para labels cortos.

### Commit

`bffbfed` — `style(navbar): compact city selector and improve responsive layout`

---

## QA ejecutado

| Caso | Resultado |
|------|-----------|
| Builds `shared`, `api`, `web` | OK |
| Crear múltiples banners (código) | Fix aplicado — QA manual pendiente en Admin |
| Reordenar / desactivar banners | Fix cache — QA manual pendiente |
| Ciudad deduplicada en selector | OK (helpers + dedupe) |
| Ciudad sin guiones en API/cards | OK (`cityDisplayLabel`) |
| Navbar cambia ciudad sin ir a Explore | OK (rutas discovery + storage en otras) |
| Navbar mobile sin doble fila | OK (layout) — QA visual pendiente |
| Smoke banners | Ajustado — requiere DB local/VPS |

---

## Comandos de verificación

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
pnpm --filter api run smoke:v31-category-banners   # con DB disponible
```

---

## Pendientes

- Hard delete de publicaciones (etapa posterior).
- Auditoría SQL de ciudades en producción + backfill opcional documentado.
- QA manual en VPS tras deploy (`git pull` + rebuild `yti-api`, `yti-web`).

---

## Deploy

**Requerido:** sí — cambios en API (filtro ciudad), web (navbar + admin banners) y shared.
