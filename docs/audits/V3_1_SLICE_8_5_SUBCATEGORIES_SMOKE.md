# V3.1 Slice 8.5 — Validación DB y smoke post-subcategorías

**Fecha:** 2026-06-06  
**Alcance:** Validar en DB real las migraciones acumuladas Slices 6–8 y smoke funcional. Sin features nuevas.

---

## 1. Resumen ejecutivo

| Ítem | Estado sesión 8.5 |
|------|-------------------|
| `pnpm db:up` | **Falló** — Docker Desktop no corriendo (`dockerDesktopLinuxEngine` pipe missing) |
| `prisma migrate deploy` | **Falló** — P1001 `localhost:5433` unreachable |
| `prisma migrate status` | **Falló** — mismo error |
| `smoke:v31-stabilization` | **No ejecutado** (sin DB) |
| `smoke:v31-subcategories` | **Creado**; **no ejecutado** (sin DB) |
| `prisma generate` | OK |
| `shared` / `api` / `web` lint + build | OK |

**Conclusión:** Slice 8.5 queda **parcialmente cerrado** — scripts y build listos; validación DB/UI **pendiente** hasta levantar Docker/Postgres.

---

## 2. Migraciones a aplicar (en orden)

1. `20260610120000_external_links_gastro_excursion`
2. `20260611120000_excursion_schedule_fields`
3. `20260612120000_event_subcategories`

### Comandos cuando Docker esté disponible

```bash
pnpm db:up
cd apps/api
pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
cd ../..
pnpm --filter api run smoke:v31-stabilization
pnpm --filter api run smoke:v31-subcategories
```

Opcional con API en `:3001`:

```bash
pnpm dev:api   # otra terminal
pnpm dev:web   # smoke manual UI
```

---

## 3. Smoke automatizado

### `smoke:v31-stabilization` (Slices 6 + 7 + schema Slice 8)

**Archivo:** `apps/api/scripts/smoke-v31-stabilization.ts`

- Columnas `GastroProfile`, `ExcursionOperator`, `Event` (schedule), `EventSubcategory.isPrimary`
- Roundtrip efímero operador + excursión (schedule/location) + gastro links
- Limpieza `EventSubcategory` en cleanup (Slice 8.5 fix)
- Opcional API: `GET /public/events/:id` (falla si API up y detalle incorrecto); `PATCH /admin/excursion-operators/:id` (skip en 401/403 sin auth admin — ver `V3_1_SLICE_7_5_STABILIZATION_SMOKE.md` §4)

### `smoke:v31-subcategories` (Slice 8 — nuevo en 8.5)

**Archivo:** `apps/api/scripts/smoke-v31-subcategories.ts`

| Check | Descripción |
|-------|-------------|
| Schema | Tabla `EventSubcategory`; columnas `eventId`, `subcategoryId`, `isPrimary` |
| Unique | Índice único `(eventId, subcategoryId)` vía `pg_indexes` |
| Create | Excursión con 2 subcategorías; `Event.subcategoryId` = principal |
| Junction | 2 filas; exactamente una `isPrimary=true` |
| Edit | Cambio de principal vía `subcategoryId`; sync sin duplicados |
| Filter | `subcategoryFilterWhere` + query Prisma por subcategoría **secundaria** |
| Detail shape | `mapEventSubcategoriesPublic` (2 entradas) |
| Backfill | Muestra si evento legacy con `subcategoryId` tiene fila junction |
| API opcional | `GET /public/events/:id` → `subcategories[]` length ≥ 2 |

Marcador: `[smoke-test] v31-subcategories`. Sin datos demo permanentes.

---

## 4. Smoke manual UI (pendiente)

Con `pnpm dev:api` + `pnpm dev:web`:

1. Admin → operador excursión → nueva excursión con 2+ subcategorías; usar ↑ para principal.
2. `/excursiones/[id]` — badge principal en hero; grid «Tipos de excursión» si >1.
3. `/categoria/excursion` — filtrar por subcategoría secundaria → excursión visible.
4. `/explore?category=excursion` — mismo filtro.
5. Regresión: links gastro/excursión, horarios, ubicación, `PublicExternalLinksCard` vacío oculto, maps fallback.
6. Confirmar eventos/gastro/rentals siguen con `SubcategorySelect` single.

---

## 5. Regresión estática (sin DB) — OK

Revisión de código Slice 8.5 (sin cambios productivos salvo smokes):

- `SubcategorySelect` sin cambios → otras verticales intactas.
- `PublicExternalLinksCard` — retorna null si vacío.
- `subcategoryFilterWhere` en `public-events.service` list/search/calendar.
- Cards usan `subcategoryName` de FK principal (`listSummarySelect` + join `subcategory`).
- Getnet/pagos: no tocados.

---

## 6. Archivos modificados en Slice 8.5

- `apps/api/scripts/smoke-v31-subcategories.ts` (nuevo)
- `apps/api/scripts/smoke-v31-stabilization.ts` — cleanup `EventSubcategory`
- `apps/api/package.json` — script `smoke:v31-subcategories`
- Este documento + actualizaciones contexto/checklist/audit

**Fixes de código productivo:** ninguno.

---

## 7. Riesgos antes de Slice 9 (admin archivar)

1. **Bloqueante deploy:** las 3 migraciones deben aplicarse en prod/staging antes de API/web con Slices 6–8.
2. **Validación local:** iniciar Docker Desktop → repetir comandos §2.
3. **Backfill:** eventos con solo `subcategoryId` pre-migración reciben fila junction al `migrate deploy`; smoke subcategorías lo verifica.
4. **Smoke manual UI:** no realizado en esta sesión.
5. **Prod sin `seed:subcategories`:** `smoke:v31-subcategories` requiere ≥2 subcategorías `excursion` activas en tenant.

---

## 8. Criterios de cierre

| Criterio | Estado |
|----------|--------|
| Docker/Postgres | Documentado — no disponible |
| `migrate deploy` 3 migraciones | Pendiente DB |
| `migrate status` OK | Pendiente DB |
| `smoke:v31-stabilization` OK | Pendiente DB |
| `smoke:v31-subcategories` OK | Script listo; pendiente DB |
| Smoke manual UI | Pendiente |
| lint/build | OK |
| Getnet/pagos | No tocados |
