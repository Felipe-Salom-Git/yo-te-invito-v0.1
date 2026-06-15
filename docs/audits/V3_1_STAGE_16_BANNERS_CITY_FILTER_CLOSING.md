# V3.1 Hotfix — Banners admin + selector «¿Dónde estás?» (cierre)

**Fecha:** 2026-06-15  
**Rama:** `feat/v1-s03-api-foundation`

---

## Banners admin

### Causa

- Mutaciones admin reemplazaban el cache de React Query cuando la respuesta parcial tenía un solo ítem (merge insuficiente).
- `invalidateQueries` inmediato sobre la query admin podía provocar race con `setQueryData`.
- Smoke de desactivación contaba todos los banners activos de la categoría (fallaba con datos reales en producción).

### Fix

- `syncAdminEditorialBannerList`: merge por ID, nunca reduce la lista ante respuestas parciales; acepta array directo o `{ data: [] }`.
- `refetchAdminEditorialBannerList`: refetch en background tras mutaciones.
- Smoke: valida solo IDs creados por el test.

### QA banners

| Caso | Resultado |
|------|-----------|
| Builds shared/api/web | OK |
| Crear A/B/C en Admin | Fix aplicado — QA manual pendiente en VPS |
| Reordenar / activar / desactivar | Fix cache + refetch |
| Smoke sin tocar banners reales | Ajustado |

---

## Selector ciudad

### Causa

- El selector podía redirigir a `/explore` desde rutas no-discovery (corregido en etapa 16; reforzado).
- Home/categorías leían `?city=` solo desde URL, ignorando `localStorage`.
- Carruseles secundarios (highlights Home, «Más para hacer») no filtraban por ciudad.
- Copy genérico «Ciudad» sin pregunta clara al usuario.
- Labels con guiones en datos legacy.

### Fix

- UX **«¿Dónde estás?»** + ciudad legible (`cityDisplayLabel` / `cityNavbarLabel`).
- `useDiscoveryCityFilter`: URL + storage como fuente única de filtro.
- `useSyncDiscoveryCityUrl`: sincroniza storage → `?city=` en home/categoría/explore.
- Filtro aplicado en: Home (highlights + carruseles), categorías, eventos por fecha, CrossCategoryRails («Más para hacer»).
- En fichas detalle: guarda ciudad + toast «La ciudad se aplicará al volver a los listados».
- API: `cityWhereInput` con variantes normalizadas en list/search de eventos.

### Pantallas filtradas

- `/home`
- `/categoria/eventos`
- `/categoria/gastro`
- `/categoria/rental`
- `/categoria/excursion`
- `/explore` (query param existente)
- «Más para hacer» (cross-category rails)

---

## Auditoría ciudades (read-only — pendiente VPS)

Ejecutar en producción/staging:

```bash
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "Event" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "GastroProfile" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "RentalLocation" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
sudo -u postgres psql -d yo_te_invito -c 'SELECT city, COUNT(*) FROM "ExcursionOperator" WHERE city IS NOT NULL GROUP BY city ORDER BY lower(city);'
```

| Tabla | Resultado |
|-------|-----------|
| Event | Pendiente ejecución en VPS |
| GastroProfile | Pendiente |
| RentalLocation | Pendiente |
| ExcursionOperator | Pendiente |

**Backfill:** no ejecutado — requiere auditoría + aprobación explícita.

---

## Comandos

| Comando | Resultado |
|---------|-----------|
| `pnpm --filter shared run build` | OK |
| `pnpm --filter api run build` | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter web run lint` | N/A (sin script lint en web) |
| `pnpm --filter api run smoke:v31-category-banners` | Pendiente (requiere DB) |

---

## Pendientes

- Hard delete queda para etapa posterior.
- Backfill ciudad opcional pendiente de aprobación.
- Auditoría SQL en entorno con datos reales.
- QA manual visual navbar mobile + Admin banners.

---

## Deploy

**Requerido:** sí — `yti-api`, `yti-web`, rebuild `shared`.
