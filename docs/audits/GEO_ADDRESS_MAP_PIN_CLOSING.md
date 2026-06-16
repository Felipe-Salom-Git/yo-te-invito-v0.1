# GEO — Dirección a Maps + pin editable — closing audit

Fecha: 2026-06-15  
Rama: `feat/v1-s03-api-foundation`

## Backend

| Item | Detalle |
|---|---|
| Endpoint | `POST /geo/resolve-address` |
| Provider | Google Geocoding API (`maps.googleapis.com/maps/api/geocode/json`) |
| Auth | JWT (`JwtOrDevAuthGuard`) |
| Rate limit | 30 req/min por usuario |
| Cache | In-memory 15 min por dirección normalizada |
| Env | `GOOGLE_GEOCODING_API_KEY` (fallback dev: `GOOGLE_MAPS_API_KEY`) |
| Auditoría | `GEO_ADDRESS_RESOLVED` |

### Payload / respuesta

Schemas en `packages/shared/src/schemas/geo.ts`:

- Body: `{ address, city, province, country?, context }`
- Contextos: `EVENT`, `GASTRO`, `RENTAL_LOCATION`, `EXCURSION_OPERATOR`, `EXCURSION_MEETING_POINT`
- Response: `{ lat, lng, formattedAddress, provider: 'google', confidence, placeId? }`

### Errores manejados

- Dirección incompleta (400)
- `ZERO_RESULTS` (400)
- Dirección ambigua / múltiples resultados LOW confidence (400)
- `OVER_QUERY_LIMIT` (429)
- `REQUEST_DENIED` / key no configurada (503)
- Rate limit interno (429)

Migración: `20260615200000_geo_address_resolved_audit`

---

## Frontend

| Item | Detalle |
|---|---|
| Componente | `AddressMapPicker` (`apps/web/components/location/AddressMapPicker.tsx`) |
| Wrappers | `EventLocationFields`, `RentalLocationFields` |
| Repo | `repos.geo.resolveAddress` → `POST /geo/resolve-address` |
| Pin editable | Google Maps JS (draggable marker) o fallback OSM `LatLngMapPreview` |
| UX | Botón «Ubicar en el mapa», estados stale/manual/resolving |

### Formularios aplicados

| Módulo | Archivo(s) | `geoContext` |
|---|---|---|
| Eventos (productora) | `ProducerEventFormFields.tsx` | `EVENT` |
| Publicaciones generales | `EventCategoryPublicationFields.tsx` | `EVENT` |
| Gastronómicos | `GastroLocalForm.tsx` (admin + portal) | `GASTRO` |
| Rentals locales | `admin/rentals/locales/nuevo`, `.../editar` | `RENTAL_LOCATION` |
| Operadores excursión | `admin/excursiones/operadores/nuevo`, `.../editar` | `EXCURSION_OPERATOR` |
| Excursiones | `admin/excursiones/[id]/editar`, operador excursiones nuevo/editar | `EXCURSION_MEETING_POINT` |

### Campos reutilizados

Sin migraciones de entidad nuevas. Se persisten campos existentes vía `LocationValue`:

- `province`, `city`, `address`
- `lat`, `lng` (mapeados a `geoLat`/`geoLng` en API)
- `placeId` (opcional, `googlePlaceId`)

Fichas públicas ya consumían `geoLat`/`geoLng` para embeds de mapa; no requirieron cambios adicionales.

---

## QA transversal

| Módulo | Crear | Editar | Pin auto | Pin manual | Ficha pública |
|---|---|---|---|---|---|
| Eventos | Pendiente manual | Pendiente manual | Implementado | Implementado | Existente (geoLat/geoLng) |
| Gastro | Pendiente manual | Pendiente manual | Implementado | Implementado | Existente |
| Rentals | Pendiente manual | Pendiente manual | Implementado | Implementado | Existente |
| Operadores excursión | Pendiente manual | Pendiente manual | Implementado | Implementado | Existente |
| Excursiones | Pendiente manual | Pendiente manual | Implementado | Implementado | Existente |

Builds locales (2026-06-15):

```bash
pnpm --filter shared run build   # OK
pnpm --filter api run build      # OK
pnpm --filter web run build      # OK
```

---

## Deploy requerido

1. `prisma migrate deploy` (audit `GEO_ADDRESS_RESOLVED`)
2. Configurar `GOOGLE_GEOCODING_API_KEY` en API (VPS)
3. Redeploy API + Web

---

## Pendientes

- QA manual en staging/prod con key de Geocoding habilitada
- Restringir key de Geocoding por IP/referrer en Google Cloud Console
- Hotel profile usa `EventLocationFields` con contexto `EVENT` (fuera de alcance spec)

---

## Recomendación

Listo para push y redeploy. Pasar a QA manual verificando «Ubicar en el mapa» en cada módulo y persistencia del pin tras guardar/editar.
