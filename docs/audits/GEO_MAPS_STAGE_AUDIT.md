# GEO / Maps Stage — Auditoría inicial

**Fecha:** 2026-06-23  
**Etapa:** GEO / Maps completa (Georef + dirección compuesta + fichas públicas)  
**Estado previo:** `GEO_ADDRESS_MAP_PIN_CLOSING.md` (resolve-address + AddressMapPicker)

---

## 1. Resumen ejecutivo

Yo Te Invito ya tiene geocoding server-side (`POST /geo/resolve-address`) y un picker de mapa (`AddressMapPicker`) integrado en formularios de eventos, gastro, rentals y excursiones. El **problema principal** es que provincia/ciudad usan un catálogo estático limitado (`ARGENTINA_PROVINCES`) y el campo **dirección** puede quedar contaminado con la respuesta formateada de Google (ciudad + provincia + país) en lugar de solo calle/altura.

**Objetivo de la etapa:** Georef Argentina para provincias/localidades, dirección compuesta solo para geocoding, fallback manual de localidad, y fichas públicas sin duplicar ubicación.

---

## 2. Backend actual

| Item | Ubicación | Detalle |
|------|-----------|---------|
| Módulo | `apps/api/src/modules/geo/` | `GeoModule`, `GeoController`, `GeoService`, `maps-config.ts` |
| Endpoint | `POST /geo/resolve-address` | Auth `JwtOrDevAuthGuard` |
| Geocoding | `GeoService.resolveAddress` | Google Geocoding API |
| Composición query | `buildQuery()` en `geo.service.ts` | `[address, city, province, country]` — **ya compone internamente** |
| Labels | `cityLabelFromValue` / `provinceLabelFromValue` (shared) | Convierte slugs del catálogo estático a labels |
| Cache | In-memory Map | TTL 15 min por query normalizada |
| Rate limit | Por userId | 30 req/min |
| Audit | `GEO_ADDRESS_RESOLVED` | Metadata: context, confidence, query (sin API key) |
| Env | `GOOGLE_GEOCODING_API_KEY` | Fallback dev: `GOOGLE_MAPS_API_KEY` |
| Errores | ZERO_RESULTS, REQUEST_DENIED, OVER_QUERY_LIMIT, etc. | Mensajes sanitizados, sin stack al cliente |

**No existe aún:** `GeoRefService`, `GET /geo/provinces`, `GET /geo/localities`.

---

## 3. Frontend actual

| Componente / capa | Archivo | Rol |
|-------------------|---------|-----|
| `AddressMapPicker` | `components/location/AddressMapPicker.tsx` | Input dirección + botón «Ubicar en el mapa» + pin draggable |
| `ProvinceCitySelect` | `components/location/ProvinceCitySelect.tsx` | Select provincia/ciudad desde catálogo estático |
| `EventLocationFields` | `components/location/EventLocationFields.tsx` | ProvinceCitySelect + AddressMapPicker |
| `RentalLocationFields` | `components/location/RentalLocationFields.tsx` | Idem para rentals/operadores |
| `GastroProvinceCityFields` | `components/location/GastroProvinceCityFields.tsx` | Wrapper ProvinceCitySelect (registro gastro) |
| `GeoRepo` | `repositories/interfaces.ts` + `ApiRepository.ts` | Solo `resolveAddress` |
| `useGoogleMaps` | `components/location/useGoogleMaps.ts` | Loader script Maps JS (`libraries=places`) |
| Query keys | `lib/query/keys.ts` | **Sin keys geo** |
| Hooks geo | — | **No existen** `useGeoProvinces` / `useGeoLocalities` |

### Bug detectado en `AddressMapPicker`

Tras geocoding exitoso, línea ~150:

```ts
address: result.formattedAddress || value.address,
```

Esto **sobrescribe** `address` con la dirección completa de Google (ej. `San Carlos de Bariloche, Río Negro, Argentina`), violando el modelo deseado (calle/altura en `address`).

### Catálogo estático

| Fuente | Path |
|--------|------|
| Shared (canónico) | `packages/shared/src/location/argentina-locations.ts` — `ARGENTINA_PROVINCES` |
| Web re-export | `apps/web/components/location/argentina-locations.ts` |
| Helpers labels | `packages/shared/src/location/labels.ts`, `apps/web/components/location/location.utils.ts` |

~10 provincias turísticas con ciudades limitadas. No cubre todas las localidades argentinas.

---

## 4. Formularios afectados

| Módulo | Archivo(s) | Componente ubicación | `geoContext` |
|--------|------------|----------------------|--------------|
| Productora / eventos | `ProducerEventFormFields.tsx` | `EventLocationFields` | `EVENT` |
| Admin publicaciones | `EventCategoryPublicationFields.tsx` | `EventLocationFields` | `EVENT` |
| Portal gastro | `GastroLocalForm.tsx` | `EventLocationFields` | `GASTRO` |
| Admin excursiones | `admin/excursiones/[id]/editar/page.tsx` | `EventLocationFields` | `EXCURSION_MEETING_POINT` |
| Excursiones operador | `.../excursiones/nuevo`, `.../editar` | `EventLocationFields` | `EXCURSION_MEETING_POINT` |
| Admin rentals locales | `admin/rentals/locales/nuevo`, `.../editar` | `RentalLocationFields` | `RENTAL_LOCATION` |
| Operadores excursión | `admin/excursiones/operadores/nuevo`, `.../editar` | `RentalLocationFields` | `EXCURSION_OPERATOR` |
| Portal hotel | `HotelProfileForm.tsx` | `EventLocationFields` | `EVENT` (fuera de spec estricta, mismo patrón) |
| Registro gastro | `RegisterGastroStep.tsx` | `GastroProvinceCityFields` | Sin mapa |
| Registro hotel | `RegisterHotelStep.tsx` | `ProvinceCitySelect` | Sin mapa |

**Fuera de alcance etapa:** productora contacto (solo city texto), pagos, ticketera, checkout, scanner, footer, emails, legales.

---

## 5. Campos de persistencia (Prisma)

| Modelo | province | city | address / venueAddress | geoLat/geoLng | googlePlaceId |
|--------|----------|------|------------------------|---------------|---------------|
| `Event` | ✅ | ✅ | `venueAddress` | ✅ | ✅ |
| `GastroProfile` | ✅ | ✅ | `address` | ✅ | ✅ |
| `HotelProfile` | ✅ | ✅ | `address` | ✅ | ✅ |
| `RentalLocation` | ✅ | ✅ | `address` | ✅ | ✅ |
| `ExcursionOperator` | ✅ | ✅ | `address` | ✅ | ✅ |

Mappers en `location.utils.ts`: `eventFieldsFromLocationValue`, `rentalLocationPayloadFromLocationValue`, `gastroLocationPayloadFromLocationValue`, etc.

**Convención actual UI → API:**

- `LocationValue.province` — slug del catálogo estático o label según entidad
- `LocationValue.city` — slug o label (convertido con `cityLabelFromValue` al persistir)
- `LocationValue.address` — debería ser calle/altura; hoy puede quedar formateado por Google

**Post-etapa:** province/city como **nombres legibles** desde Georef (con fallback manual).

---

## 6. Fichas públicas

| Ruta | Componente | Display actual |
|------|------------|----------------|
| `/events/[id]` | `EventLocationSection` | `venueAddress, city` (sin province en texto) |
| `/gastronomicos/[id]` | `GastroPublicDetailContent` | address + city + province (riesgo duplicación) |
| `/rentals/[id]` | `RentalLocalCard` + modal | merge local/evento |
| `/excursiones/[id]` | `PlaceDetailView` | evento + operador |
| `/hoteles/[id]` | modal ubicación | address + city |

Helpers: `apps/web/lib/maps/public-location.ts` — coords-first, sin dedupe address/city/province.

**Riesgo:** si `address` contiene ciudad/provincia y además se muestra `city`/`province`, hay duplicación visual.

---

## 7. Schemas shared

`packages/shared/src/schemas/geo.ts`:

- `resolveAddressBodySchema` — `{ address, city, province, country?, context }`
- `resolveAddressResponseSchema` — `{ lat, lng, formattedAddress, provider, confidence, placeId? }`
- Contextos: `EVENT`, `GASTRO`, `RENTAL_LOCATION`, `EXCURSION_OPERATOR`, `EXCURSION_MEETING_POINT`

**Agregar en etapa:** schemas para provincias/localidades Georef.

---

## 8. Variables de entorno

| Variable | Uso |
|----------|-----|
| `GOOGLE_GEOCODING_API_KEY` | API server-side geocoding |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps JS en browser (pin interactivo) |

Georef: API pública sin key.

---

## 9. Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| `formattedAddress` sobrescribe `address` | **Alta** | Slice GEO 4 — no reemplazar address visible |
| Catálogo estático incompleto | **Alta** | Georef + fallback manual |
| Georef caído / lento | Media | Cache server 24h/12h + fallback catálogo local |
| Registro sin auth necesita provincias | Media | Endpoints `GET /geo/*` públicos (solo lectura) |
| Datos legacy con slugs | Media | `cityLabelFromValue` sigue resolviendo slugs; Georef usa nombres |
| `google.maps.Marker` deprecated | Baja | Documentar; migrar solo si cambio seguro |
| `loading=async` warning | Baja | Evaluar en slice 6 |
| `ERR_BLOCKED_BY_CLIENT` | Baja | Adblock — no es bug del proyecto |
| Key Geocoding no en VPS | Alta (ops) | Pendiente operativo documentado |

---

## 10. Decisiones tomadas

1. **Georef solo en backend** — frontend consume `GET /geo/provinces` y `GET /geo/localities`.
2. **Google solo para geocoding final, mapa, pin, coords, placeId.**
3. **Provincias/localidades públicas** (sin JWT) — datos de referencia; `resolve-address` sigue autenticado.
4. **Persistir nombres legibles** de Georef en `province`/`city`; localidad manual como texto libre.
5. **No reemplazar `address`** con `formattedAddress` de Google.
6. **Catálogo `ARGENTINA_PROVINCES`** como fallback UI si Georef falla.
7. **Sin migración Prisma** — campos existentes suficientes.
8. **No migrar `AdvancedMarkerElement`** salvo cambio trivial (slice 6).

---

## 11. Plan de slices

| Slice | Objetivo | Commit |
|-------|----------|--------|
| **GEO 0** | Esta auditoría | `docs(geo): audit maps stage` |
| **GEO 1** | `GeoRefService` + endpoints + cache + schemas | `feat(geo): add georef provinces and localities` |
| **GEO 2** | `GeoRepo` + query keys + hooks | `feat(web): add geo query hooks for georef` |
| **GEO 3** | UI dinámica + localidad manual + placeholder calle | `feat(geo): use dynamic province and locality fields` |
| **GEO 4** | Dirección compuesta solo geocoding; fix formattedAddress | `feat(geo): compose full address for map resolution` |
| **GEO 5** | Display público sin duplicados | `fix(geo): normalize public location display` |
| **GEO 6** | Warnings Google Maps (seguro) + docs | `chore(maps): improve google maps loading warnings` o docs |
| **GEO 7** | QA + cierre + contextos/checklist | `docs(geo): close maps georef stage` |

---

## 12. Referencias

- Cierre previo: `docs/audits/GEO_ADDRESS_MAP_PIN_CLOSING.md`
- Auditoría Maps histórica: `docs/audits/MAPS_LOCATION_AUDIT.md`
- Pendientes ops: `docs/context/CONTEXT_PENDIENTES.md` § GEO / Maps
- Georef API: `https://apis.datos.gob.ar/georef/api`

---

## 13. Slice GEO 1 — implementado (2026-06-23)

| Item | Detalle |
|------|---------|
| Servicio | `GeoRefService` (`apps/api/src/modules/geo/georef.service.ts`) |
| Endpoints | `GET /geo/provinces`, `GET /geo/localities?province=...` (públicos) |
| Cache | Provincias 24h, localidades 12h (in-memory) |
| Schemas | `geoProvinceOptionSchema`, `geoLocalityOptionSchema`, `composeFullAddress` en `packages/shared/src/schemas/geo.ts` |
| Auth | Solo `POST /geo/resolve-address` requiere JWT |
