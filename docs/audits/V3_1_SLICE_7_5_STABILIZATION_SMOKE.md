# V3.1 Slice 7.5 — Stabilization smoke (post Slice 6 + 7)

**Fecha:** 2026-06-06  
**Alcance:** QA y documentación tras migraciones `20260610120000_external_links_gastro_excursion` y `20260611120000_excursion_schedule_fields`. Sin features nuevas; sin tocar Getnet/pagos.

---

## 1. Resumen ejecutivo

| Área | Estado en esta sesión | Notas |
|------|----------------------|-------|
| `prisma generate` | OK | Prisma Client v5.22.0 |
| `prisma validate` | OK | Schema válido |
| Migraciones en DB local | **Bloqueado** | Docker Desktop no disponible (`localhost:5433` unreachable). Incluye Slice 8 `20260612120000_event_subcategories` pendiente de `migrate deploy`. |
| `shared` / `api` / `web` lint + build | OK | `nx run shared:build`, `api:lint`, `web:lint`, `web:build` |
| Smoke automatizado DB | **Pendiente ejecución** | Script listo: `pnpm --filter api run smoke:v31-stabilization` |
| Revisión estática código | OK | Servicios y UI alineados con campos nuevos |

---

## 2. Comandos

### Siempre (sin DB)

```bash
pnpm db:generate
cd apps/api && pnpm exec prisma validate
pnpm exec nx run shared:build
pnpm exec nx run api:lint
pnpm exec nx run web:lint
pnpm exec nx run web:build
```

### Con Postgres local (Docker)

```bash
pnpm db:up
cd apps/api && pnpm exec prisma migrate deploy
pnpm exec prisma migrate status
pnpm --filter api run smoke:v31-stabilization
```

Opcional (API corriendo en `:3001`):

```bash
# Terminal API: pnpm dev:api

# Sin credenciales admin — PATCH se omite si dev auth no está habilitado o devuelve 401/403:
SMOKE_ALLOW_DEV_AUTH=1 pnpm --filter api run smoke:v31-stabilization

# Con credenciales admin — ejecuta PATCH vía JWT:
SMOKE_USER_EMAIL=felipe.e.salom@gmail.com SMOKE_USER_PASSWORD=<pwd> \
  pnpm --filter api run smoke:v31-stabilization
```

Smoke opcional maps (Slice 2, sin cambios):

```bash
pnpm --filter api run smoke:maps-location
```

---

## 3. Migraciones validadas (estático)

| Migración | Tabla | Columnas |
|-----------|-------|----------|
| `20260610120000_external_links_gastro_excursion` | `GastroProfile` | `bookingUrl`, `socialLinks` |
| | `ExcursionOperator` | `websiteUrl`, `bookingUrl`, `socialLinks` |
| `20260611120000_excursion_schedule_fields` | `Event` | `excursionDepartureTime`, `excursionDurationText`, `excursionAvailableDaysText`, `excursionScheduleNotes`, `excursionMeetingPoint` |

`schema.prisma` y SQL de migración coinciden. **Drift en DB:** verificar con `prisma migrate status` cuando Postgres esté arriba.

---

## 4. Smoke automatizado (`smoke:v31-stabilization`)

**Archivo:** `apps/api/scripts/smoke-v31-stabilization.ts`

1. Conecta a DB.
2. Assert columnas vía `information_schema`.
3. Crea artefactos efímeros marcados `[smoke-test] v31-slice7.5`:
   - `ExcursionOperator` con links.
   - `Event` `category=excursion` con schedule + ubicación override.
   - `GastroProfile` con `bookingUrl` + `socialLinks`.
4. Roundtrip lectura (`readExcursionSchedulePublic`, `readEntitySocialLinks`).
5. Limpia artefactos (sin datos demo permanentes).
6. Opcional (API en `:3001`):
   - `GET /health` + `GET /public/events/:id` — **obligatorio si la API responde**; falla el smoke si el detalle público no coincide.
   - `PATCH /admin/excursion-operators/:id` — **opcional**; auth:
     - Con `SMOKE_USER_EMAIL` + `SMOKE_USER_PASSWORD` → login JWT y PATCH.
     - Sin credenciales → solo intenta `X-Dev-User-Id` si `SMOKE_ALLOW_DEV_AUTH=1`.
     - Si PATCH devuelve **401/403** o no hay auth → `SKIP PATCH admin/excursion-operators — admin auth unavailable` (no falla el smoke).

---

## 5. Revisión estática API / servicios

| Flujo | Archivos | Campos |
|-------|----------|--------|
| Gastro portal | `gastro-local.service.ts` | `websiteUrl`, `bookingUrl`, `socialLinks` read/write |
| Gastro admin | `admin-gastro*.service.ts` | idem |
| Gastro público | `public-gastro-locations.service.ts` | expone links en detalle |
| Operador excursión | `excursion-operators.service.ts` | links + schedule + location override en producto |
| Detalle público evento | `public-events.service.ts` | `excursionSchedule`, `excursionOperator` con links |
| Legacy admin evento | `producer-events-crud.service.ts` | patch schedule en excursiones |

**Getnet/pagos:** no modificados en Slices 6–7 ni en 7.5.

---

## 6. Revisión estática frontend

### Formularios

| Ruta | Componentes clave | Slice |
|------|-------------------|-------|
| `/gastro/local/editar` | `GastroLocalForm` + `ExternalLinksFormFields` | 6 |
| `/admin/gastronomicos/nuevo`, `.../editar` | `GastroLocalForm` | 6 |
| `/admin/excursiones/operadores/nuevo`, `.../editar` | `ExternalLinksFormFields` + `RentalLocationFields` | 6 |
| `/admin/excursiones/operadores/.../excursiones/nuevo\|editar` | `ExcursionScheduleFormFields` + ubicación opcional | 7 |
| `/admin/excursiones/[id]/editar` | schedule + `EventLocationFields` (legacy) | 7 |

### Fichas públicas

| Ruta | Comportamiento verificado (código) |
|------|-----------------------------------|
| `/gastronomicos/[id]`, `/restaurants/[id]` | `PublicExternalLinksCard` — retorna `null` si no hay links/contacto |
| `/excursiones/[id]` | `ExcursionSchedulePublicSections` + `PublicExternalLinksCard` (solo operador) |
| Ubicación excursión | `resolveExcursionPublicLocation` — evento override → fallback operador |
| Maps | `EventLocationModal` + `LocationPickerMap` fallback (Slice 2) sin cambios en 7.5 |

### UX

- **`PublicExternalLinksCard`:** no renderiza si todos los campos están vacíos (`hasExternal && hasContact`).
- **WhatsApp excursión:** solo `ExcursionContactCard`; `PublicExternalLinksCard` **no** recibe `contactPhone` → sin duplicar WhatsApp.
- **WhatsApp gastro:** `GastroContactCard` (WhatsApp) + `PublicExternalLinksCard` puede mostrar `tel:` si hay `contactPhone` — comportamiento previo, no introducido en 7.5.
- **Links externos:** `target="_blank"` + `rel="noopener noreferrer"` en card pública.

---

## 7. Smoke manual recomendado (con DB + web:dev)

Checklist operador:

1. **Gastro:** editar local → cargar website, reservas, Instagram → guardar → abrir `/gastronomicos/[id]` → ver bloque «Reservas y redes».
2. **Operador excursión:** admin nuevo/editar → links + ubicación operador.
3. **Producto excursión:** crear con horario, punto de encuentro, sin ubicación propia → público muestra horarios + ubicación operador.
4. **Override ubicación:** editar excursión, marcar ubicación propia, pin en mapa → público usa evento, nota de herencia si aplica.
5. **Maps fallback:** quitar/invalidar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → formulario muestra fallback manual (Slice 2).
6. **Regresión:** abrir `/events/[id]`, `/rentals/[id]` — sin cambios de horarios/links de excursión.

---

## 8. Riesgos antes de Slice 9 (admin archivar)

1. **Deploy prod:** aplicar las **3** migraciones (`20260610120000_*`, `20260611120000_*`, `20260612120000_event_subcategories`) con `prisma migrate deploy` antes de desplegar API/web con Slices 6–8.
2. **Docker local:** sin Postgres no se ejecutó smoke DB; correr `smoke:v31-stabilization` y `smoke:v31-subcategories` al levantar entorno (ver `V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md`).
3. **Excursiones legacy:** productos creados antes de Slice 7 pueden tener ubicación copiada en `Event`; editar y desmarcar «ubicación propia» limpia override.
4. **Admin editar excursión:** usa `GET /public/events/:id` (solo `APPROVED`); borradores no cargan en ese formulario — comportamiento preexistente.
5. **Horario en cards** de listado — pendiente (§7.1 checklist).
6. **Maps prod/referrer** — smoke productivo pendiente (§4.1).

---

## 9. Archivos tocados en Slice 7.5

- `apps/api/scripts/smoke-v31-stabilization.ts` (nuevo)
- `apps/api/package.json` — script `smoke:v31-stabilization`
- `docs/audits/V3_1_SLICE_7_5_STABILIZATION_SMOKE.md` (este doc)
- Actualizaciones menores en contextos / audit / checklist

**Fixes de código:** ninguno (solo QA + smoke script + docs).
