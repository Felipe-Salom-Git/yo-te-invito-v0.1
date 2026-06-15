# V3.1 Hotfix — Filtro de ciudad en Explore (cierre)

**Fecha:** 2026-06-15  
**Rama:** `feat/v1-s03-api-foundation`

---

## Motivo de sacar ciudad del navbar

El selector en navbar generaba comportamiento confuso:

- Intentaba filtrar contextos distintos (Home, categorías, fichas) con redirects y query params.
- Apelmazaba el layout, especialmente en mobile (doble fila).
- No filtraba de forma predecible el contenido visible.

**Decisión de producto:** el navbar vuelve a ser solo navegación; los filtros de descubrimiento viven en **Explore**.

---

## Cambios navbar

- Eliminado `NavbarCitySlot`, selector desktop/mobile y sección ciudad del drawer mobile.
- Eliminados hooks/archivos: `useNavbarCitySelection`, `useSyncDiscoveryCityUrl`, `useDiscoveryCityFilter`, `navbarCityConfig`, `navbarCityStorage`.
- Layout: logo + links + carrito + menú (mobile: logo + carrito + hamburger).
- Removido filtro contextual por ciudad en Home y landings de categoría.

---

## Nuevo comportamiento Explore

- Componente `ExploreCityFilter` con copy **«¿Dónde estás?»**.
- Select deduplicado (`groupCitiesByProvince` + `normalizeCityKey`).
- Labels legibles (`formatCityLabel` / `cityDisplayLabel`) — sin guiones en UI.
- Cambio de ciudad aplica filtro al instante (`router.replace` + `?city=`).
- Resetea paginación (`page: 1`).
- Conserva categoría, fechas, tags y subcategoría activos.
- Opción «Todas las ciudades» + link «Ver todo — quitar filtro de ciudad».
- Empty state específico: *No encontramos publicaciones para esta ciudad con esos filtros.*

---

## Normalización visual / filtrado

Helpers en `@yo-te-invito/shared`: `normalizeCityKey`, `formatCityLabel`, `cityQueryValue`.

- URL Explore normaliza `city` con `cityQueryValue`.
- API (`cityWhereInput` en `public-events.service`) compara variantes slug/espacios/case.

---

## QA ejecutado

| Caso | Resultado |
|------|-----------|
| Navbar sin selector ciudad | OK |
| Mobile sin doble fila | OK (build + layout) |
| Explore filtra por ciudad | OK (auto-apply + URL) |
| Ciudad sin guiones | OK (`cityDisplayLabel`) |
| Ciudad deduplicada | OK |
| Limpiar filtro ciudad | OK |
| Filtros combinados | OK (query existente) |
| Builds shared/api/web | OK |

---

## Auditoría SQL (read-only — pendiente VPS)

```bash
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "Event" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "GastroProfile" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "RentalLocation" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "ExcursionOperator" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
```

| Tabla | Resultado |
|-------|-----------|
| Event | Pendiente |
| GastroProfile | Pendiente |
| RentalLocation | Pendiente |
| ExcursionOperator | Pendiente |

---

## Pendientes

- Backfill ciudad opcional (requiere auditoría + aprobación).
- Hard delete queda para etapa posterior.

---

## Deploy

**Requerido:** sí — `yti-web` (cambios frontend). API sin cambios nuevos en este slice (normalización ya en etapa anterior).
