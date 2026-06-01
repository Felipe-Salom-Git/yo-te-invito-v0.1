# Auditoría Maps / Ubicación — Yo Te Invito (Maps 3)

**Fecha:** 2026-06-01 · **Actualizado Maps 5:** 2026-06-01  
**Alcance:** auditoría técnica de campos de ubicación, formularios, fichas públicas, Google Maps/Places y SEO local.

**Maps 5 (2026-06-01):** migración `20260601190000_add_maps_place_id_and_province` — `googlePlaceId` + `province` (+ `city` en `RentalLocation`) en Prisma, schemas shared, API y formularios. **Deploy VPS:** `npx prisma migrate deploy` en `apps/api` antes de usar en prod. Sin backfill legacy.

**Producción:** `https://yoteinvito.club` · GCP proyecto `yoteinvito-1721413433327` · Key `YTI Web Maps PROD` (referrer-restricted).

---

## 1. Resumen ejecutivo

Yo Te Invito **ya tiene una base significativa de Maps en frontend**, más avanzada de lo que sugiere el checklist V2:

| Área | Estado |
|------|--------|
| **Infra GCP** | Etapa A cerrada: Maps JS + Places (New) + Geocoding habilitados; key restringida por referrer y APIs. |
| **Env** | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` documentada en `.env.example` y runbook; valor **solo en VPS** (pendiente confirmar activación prod). |
| **UI formularios** | Componentes `EventLocationFields`, `RentalLocationFields`, `LocationPickerMap` con **autocomplete Places + mapa + geocoder** cuando hay key; fallback manual + OSM preview sin key. |
| **Persistencia DB** | `address` + `geoLat`/`geoLng` + **`googlePlaceId`** + **`province`** (y `city` en rental local) desde Maps 5. Legacy sin placeId/province sigue válido (nullable). |
| **Fichas públicas** | Botón «Ver ubicación», modal con embed Google Maps (sin API key) y link externo en eventos, gastro, hotel, rentals, excursiones. |
| **JSON-LD** | Event/Gastro/Hotel incluyen `Place`/`PostalAddress`/`GeoCoordinates` cuando hay datos; `province` ya persistible — JSON-LD `addressRegion` pendiente (Maps 9). |
| **Gaps principales** | Backfill legacy; producer solo `city` texto; duplicación `argentina-locations` web vs shared; JSON-LD province; smoke automatizado. |

**Conclusión:** el trabajo pendiente no es «crear Maps desde cero», sino **activar key en prod**, **cerrar gaps de modelo/normalización**, **extender cobertura** (producer, signup flows) y **smokes/documentación**.

---

## 2. Estado por vertical

### 2.1 Eventos (`Event`)

| Campo Prisma | Tipo | Notas |
|--------------|------|-------|
| `city` | `String?` | Label legible (desde select AR o texto) |
| `venueName` | `String?` | Nombre del lugar |
| `venueAddress` | `String?` | Dirección legible |
| `geoLat` / `geoLng` | `Float?` | Coordenadas |
| `province` | — | **No existe**; provincia solo en UI |
| `googlePlaceId` | — | **No existe** |

**Formularios:** `EventLocationFields` (ProvinceCitySelect + LocationPickerMap) en:
- Portal productora create/edit (`ProducerEventFormFields`)
- Admin publicaciones generales (`EventCategoryPublicationFields`)
- Admin excursiones edit legacy (`admin/excursiones/[id]/editar`)

**Ficha pública:** `/events/[eventId]` → `EventLocationSection` (embed + «Abrir en Google Maps») + `EventActionBar` «Ver ubicación».

**JSON-LD:** `buildEventJsonLd` usa `venueName`, `venueAddress`, `city`, `geoLat`/`geoLng`.

---

### 2.2 Excursiones

Dos capas de ubicación:

1. **`ExcursionOperator`** (operador / punto de encuentro del local)
   - Campos: `address`, `city`, `geoLat`, `geoLng` (sin `province`)
   - Formularios admin: `RentalLocationFields` en operadores nuevo/editar

2. **`Event`** (cada excursión publicada)
   - Mismos campos que evento (`venueName`, `venueAddress`, `city`, `geoLat`, `geoLng`)
   - Admin edit excursión: `EventLocationFields`

**Ficha pública:** `/excursiones/[id]` vía `PlaceDetailView` → `EventLocationSection`.  
**Operador en ficha:** `ExcursionOperatorCard` con texto + «Ver ubicación» (modal).

---

### 2.3 Gastro (`GastroProfile`)

| Campo Prisma | Tipo | Notas |
|--------------|------|-------|
| `address` | `String?` | |
| `province` | `String?` | **Sí persistido** (label legible) |
| `city` | `String?` | Label legible |
| `geoLat` / `geoLng` | `Float?` | Requeridos en portal (`requireCoords`) |
| `googlePlaceId` | — | **No existe** |

**Formularios:**
- Portal `/gastro/local/editar`: `GastroLocalForm` → `EventLocationFields`
- Registro `/register/gastro`, solicitud `/cuenta/solicitar-gastro`: `GastroProvinceCityFields` (+ address en apply)
- Signup persiste vía `gastroProfileToPersistInput` (province/city labels)

**Ficha pública:** `/gastronomicos/[id]` → `GastroPublicDetailContent` + `EventLocationModal` (address, geo, city/province en card).

**JSON-LD:** `buildGastroJsonLd` — `Restaurant` con address/province/city/geo.

---

### 2.4 Hoteles (`HotelProfile`)

| Campo Prisma | Tipo | Notas |
|--------------|------|-------|
| `address` | `String?` | |
| `city` | `String?` | Sin `province` en schema |
| `geoLat` / `geoLng` | `Float?` | Requeridos en portal edit (`hotelProfileLocationSchema`) |
| `publicEventId` | `String?` | Ficha pública `/hoteles/[eventId]` |

**Formularios:**
- Portal `/hotel/editar`: `HotelProfileForm` → `EventLocationFields`
- Registro hotel: `ProvinceCitySelect` solo (signup sin address/geo hasta portal)

**Ficha pública:** `/hoteles/[id]` → `HotelPublicDetailContent` + `EventLocationModal`.  
Requisito actual para mostrar mapa: address **y** geoLat/geoLng.

**JSON-LD:** `buildHotelJsonLd` — sin province (no hay columna).

---

### 2.5 Rentals (`RentalLocation` + productos `Event`)

| Entidad | Campos ubicación |
|---------|------------------|
| `RentalLocation` | `address`, `geoLat`, `geoLng` (**sin** `city`/`province` en DB) |
| `Event` (producto rental) | Hereda campos evento; ficha mergea local + evento |

**Formularios admin:** `RentalLocationFields` (ProvinceCitySelect + mapa) — **provincia/ciudad solo UI**, payload API: `rentalLocationPayloadFromLocationValue` → address + geo únicamente.

**Ficha pública:** `/rentals/[id]` → `RentalLocalCard` + `EventLocationModal` (merge rentalLoc ?? event).

**JSON-LD:** producto rental como `Event` (SEO 8).

---

### 2.6 Productoras (`ProducerProfile`)

| Campo | Tipo | Notas |
|-------|------|-------|
| `city` | `String?` | Texto libre en contacto |
| `country` | `String?` | Texto libre |
| address / geo / province | — | **No existen** |

**Formularios:** `ProducerContactForm` — input texto «Ciudad» (sin mapa).  
**Ficha pública:** `/producers/[id]` — muestra city en preview; **sin mapa ni botón ubicación**.

**JSON-LD:** `Organization` — sin address.

---

### 2.7 Platform config

`PlatformConfig.contact.address` — dirección institucional footer/admin (string), sin geo.

---

## 3. Tabla consolidada — campos por modelo (Prisma)

| Modelo | address | city | province | country | venueName | lat/lng | googlePlaceId |
|--------|---------|------|----------|---------|-----------|---------|---------------|
| `Event` | venueAddress | city | — | — | venueName | geoLat/geoLng | — |
| `GastroProfile` | address | city | province | — | — | geoLat/geoLng | — |
| `HotelProfile` | address | city | — | — | — | geoLat/geoLng | — |
| `RentalLocation` | address | — | — | — | name | geoLat/geoLng | — |
| `ExcursionOperator` | address | city | — | — | name | geoLat/geoLng | — |
| `ProducerProfile` | — | city | — | country | — | — | — |
| `ReferrerProfile` | — | city | region | — | — | — | — |

**No hay `googlePlaceId` / `mapsUrl` en ningún modelo.**

---

## 4. Tabla — formularios actuales

| Formulario / ruta | Componente ubicación | Provincia/ciudad | Mapa/autocomplete | Persiste geo | Persiste placeId |
|-------------------|----------------------|------------------|-------------------|--------------|------------------|
| Productora evento create/edit | `EventLocationFields` | Select AR | Sí (si key) | Sí | No |
| Admin publicaciones generales | `EventLocationFields` | Select AR | Sí | Sí | No |
| Admin excursion edit | `EventLocationFields` | Select AR | Sí | Sí | No |
| Admin rental local nuevo/editar | `RentalLocationFields` | Select AR (UI) | Sí | Sí | No |
| Admin excursion operador | `RentalLocationFields` | Select AR (UI) | Sí | Sí (operador) | No |
| Portal gastro local | `GastroLocalForm` | Select AR | Sí | Sí + province | No |
| Portal hotel editar | `HotelProfileForm` | Select AR | Sí | Sí | No |
| Registro gastro | `GastroProvinceCityFields` | Select AR | Parcial* | Apply sí | No |
| Registro hotel | `ProvinceCitySelect` | Select AR | No | Portal después | No |
| Productora contacto | Input texto city | Texto libre | No | No | No |

\* Registro gastro: address/geo en apply flow según schema onboarding; no usa mapa interactivo en wizard inicial.

**Validación:** `validateLocationValue` — province, city, address, coords según contexto. Gastro/hotel portal exigen coords.

---

## 5. Tabla — fichas públicas y visualización

| Ruta | Muestra dirección | Botón «Ver ubicación» | Mapa embebido | Fuente datos | Prioridad Maps |
|------|-------------------|----------------------|---------------|--------------|----------------|
| `/events/[id]` | Sí | Sí (`EventActionBar`) | Sí (`EventLocationSection`) | Event | Alta |
| `/excursiones/[id]` | Sí | Sí | Sí | Event + operador card | Alta |
| `/gastronomicos/[id]` | Sí | Sí (modal) | Sí (modal embed) | GastroProfile | Alta |
| `/hoteles/[id]` | Sí | Sí (modal) | Sí | HotelProfile | Media (vertical Próximamente listing) |
| `/rentals/[id]` | Sí | Sí | Sí | RentalLocation ∪ Event | Alta |
| `/producers/[id]` | Solo city texto | No | No | ProducerProfile | Baja |

**Helpers públicos (sin API key):** `apps/web/lib/events/maps.ts` — URLs Google Maps search/q=lat,lng y embed `output=embed`.

---

## 6. Google Maps — código y configuración existente

### 6.1 Componentes frontend

| Archivo | Rol |
|---------|-----|
| `components/location/useGoogleMaps.ts` | Loader script Maps JS + `libraries=places`; singleton promise |
| `components/location/LocationPickerMap.tsx` | Switch Google vs fallback |
| `components/location/LocationPickerMapGoogle.tsx` | Mapa, marker drag, **Places Autocomplete**, Geocoder |
| `components/location/LocationPickerMapFallback.tsx` | Dirección + lat/lng manual + `LatLngMapPreview` (OSM) |
| `components/location/ProvinceCitySelect.tsx` | Select provincia/ciudad (`ARGENTINA_PROVINCES`) |
| `components/location/argentina-locations.ts` | Catálogo provincias/ciudades (duplicado en `packages/shared`) |
| `components/admin/LatLngMapPreview.tsx` | Preview OSM embed (fallback) |

### 6.2 Variables de entorno

| Variable | Documentada | Uso |
|----------|-------------|-----|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Sí (`.env.example`, `GOOGLE_CLOUD_RUNBOOK.md` §3.4) | Browser-only; sin key → fallback manual |
| `NEXT_PUBLIC_MAP_PREVIEW` | Implícito en `LatLngMapPreview` | `0` oculta preview OSM |

**Riesgo key:** la key es pública por diseño (NEXT_PUBLIC); mitigación = restricción referrer + APIs en GCP. **No commitear valor real.**

### 6.3 Librería

- **Actual:** Maps JavaScript API cargado vía `<script>` directo (no `@googlemaps/js-api-loader` ni `@react-google-maps/api`).
- **Recomendación:** mantener loader actual (ya funciona, sin dependencia extra) salvo necesidad de SSR avanzado.

### 6.4 CSP / Nginx

- No se detectó `Content-Security-Policy` estricta en repo que bloquee `maps.googleapis.com` o `google.com/maps`.
- Embed usa dominios Google/OSM — validar en prod si se agrega CSP global.

### 6.5 Places API (New) vs Autocomplete legacy

El código usa `google.maps.places.Autocomplete` (library clásica en Maps JS). GCP tiene **Places API (New)** habilitada — compatible con el loader actual. Monitorear deprecations Google; migración a `PlaceAutocompleteElement` sería slice futuro si Google lo exige.

---

## 7. SEO / JSON-LD local

| Vertical | Schema | Location en JSON-LD | Gaps |
|----------|--------|---------------------|------|
| Eventos | `Event` | `Place` + `PostalAddress` + `GeoCoordinates` si hay datos | Falta `addressRegion` (province no en Event) |
| Gastro | `Restaurant` | address, province, geo | OK si API devuelve province |
| Hotel | `Hotel` | address, city, geo | Sin province |
| Productora | `Organization` | — | Sin sede |
| Rental/Excursión | `Event` | Como evento | Depende de datos del producto/local |

**Quick win SEO:** enriquecer JSON-LD cuando existan province/geo sin migración (gastro ya; eventos/hotel limitados por schema).

---

## 8. Riesgos técnicos

| Riesgo | Severidad | Detalle |
|--------|-----------|---------|
| Key no configurada en VPS | **Alta** | Formularios caen en fallback manual; UX degradada en prod |
| `placeId` capturado pero no guardado | Media | Pérdida de re-validación / deep links Places |
| Province UI no persistida (Event, Rental, Excursion operator) | Media | Inconsistencia SEO/filtros; city como proxy |
| Duplicación `argentina-locations` web/shared | Baja | Drift entre catálogos |
| RentalLocation sin city en DB | Media | Ficha depende de address texto; explore por city difícil |
| Hotel listing «Próximamente» | Baja | Fichas individuales OK; vertical discovery limitado |
| Costos Places/Geocoding | Media | Autocomplete + geocode on drag — monitorear cuotas/billing alerts |
| Datos legacy sin coords | Media | Fichas sin mapa hasta backfill manual |

---

## 9. Modelo de datos futuro (recomendado)

**Opción conservadora (mínima migración):**

1. Mantener `address`, `city`, `geoLat`, `geoLng` como fuente de verdad.
2. Agregar **`googlePlaceId String?`** opcional en entidades con mapa: `Event`, `GastroProfile`, `HotelProfile`, `RentalLocation`, `ExcursionOperator`.
3. Agregar **`province String?`** en `Event`, `HotelProfile`, `RentalLocation`, `ExcursionOperator` para alinear con gastro y JSON-LD.
4. **No** agregar `mapsUrl` en DB — generar en runtime (`lib/events/maps.ts` o helper shared).

**Opción normalizada (slice mayor):**

- Tipo shared `LocationFields { address, city, province, country, geoLat, geoLng, googlePlaceId }` + mappers por entidad.
- Vista/materialized para explore por city/province.

---

## 10. Quick wins sin migración Prisma

1. **Configurar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en VPS** + rebuild `yti-web` — activa autocomplete/mapa ya implementado.
2. **Smoke manual:** productora evento, gastro local, rental local, hotel editar — verificar pin + guardado API.
3. **Documentar** en runbook que fichas públicas ya tienen «Ver ubicación» (no reimplementar).
4. **Unificar** import de `ARGENTINA_PROVINCES` desde `@yo-te-invito/shared` en web (eliminar duplicado local).
5. **JSON-LD:** pasar province a eventos cuando city contenga info (heurística) — solo si no requiere DB.
6. **Checklist V2:** marcar ítems parcialmente cumplidos (botón ubicación, componentes autocomplete).

---

## 11. Cambios que sí requerirían migración Prisma

| Cambio | Entidades | Motivo |
|--------|-----------|--------|
| `googlePlaceId` | Event, Gastro, Hotel, RentalLocation, ExcursionOperator | Persistir place de Places |
| `province` | Event, Hotel, RentalLocation, ExcursionOperator | Paridad con gastro + SEO |
| `city` en RentalLocation | RentalLocation | Explore/filtros por ciudad del local |
| address/geo en ProducerProfile | ProducerProfile | Mapa en ficha productora |

---

## 12. Plan recomendado — slices Maps 4+

| Slice | Objetivo | DB | Prioridad |
|-------|----------|-----|-----------|
| **Maps 4** | Env VPS + verificación prod + helper URL shared + smoke doc | No | **Alta** |
| **Maps 5** | Migración `googlePlaceId` + `province` + persistir placeId desde UI | Sí | **Hecho (2026-06-01)** — deploy migración VPS pendiente |
| **Maps 6** | Endurecer eventos/excursiones (validación presencial, fallback manual) | No | **Hecho (2026-06-01)** |
| **Maps 7** | Gastro/hotel/rentals: coords opcionales + fallback manual | No | **Hecho (2026-06-01)** |
| **Maps 8** | Helper `lib/maps` + fichas públicas + productoras texto | No | **Hecho (2026-06-01)** |
| **Maps 9** | JSON-LD province/addressCountry/geo | No | **Hecho (2026-06-01)** |
| **Maps 10** | Smoke `smoke:maps-location` + cierre docs | No | **Hecho (2026-06-01)** |

\*Maps 6/9 mejoran calidad sin migración obligatoria; Maps 5 desbloquea placeId/province consistente.

**Vertical primero:** **Eventos + Gastro** (mayor tráfico SEO, componentes ya integrados). Luego **Rentals/Excursiones** (gap province en rental local). **Hotel** cuando vertical salga de Próximamente. **Productoras** al final.

---

## 13. Qué NO conviene hacer todavía

- Migrar a Places API (New) `PlaceAutocompleteElement` sin necesidad urgente.
- Mapas embebidos con API key en fichas públicas (hoy embed sin key es suficiente).
- Geocoding server-side masivo (costo + duplicación con frontend geocoder).
- Ubicación GPS del usuario (privacidad + scope).
- Cambiar `/` o `/home` por este bloque.

---

## 14. Configuración manual pre-implementación (GCP/VPS)

| Paso | Dónde | Estado |
|------|-------|--------|
| Key `YTI Web Maps PROD` con referrers + APIs | GCP Console | Hecho (según contexto) |
| Procedimiento activación VPS + smoke | [`GOOGLE_CLOUD_RUNBOOK.md`](../deploy/GOOGLE_CLOUD_RUNBOOK.md) §3.6–3.7 | **Documentado (Maps 4)** |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `apps/web/.env.production` | VPS `/opt/yoteinvito/...` | **Verificar operador post-deploy** |
| Budget alerts GCP (50% / 80% / 100%) | GCP Billing | **Pendiente manual** — runbook §3.5 |
| `pnpm build` + restart `yti-web` tras setear key | VPS | Post-config operador |
| Smoke manual §3.7 PASS en producción | Manual | Pendiente operador |

---

## 15. Maps 4 aplicado — activación prod documentada

**Slice Maps 4 (2026-06-01):** documentación de activación y smoke; **sin cambios de código ni Prisma**.

| Entregable | Ubicación |
|------------|-----------|
| Variable `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `apps/web/.env.example` + runbook §3.4 |
| Pasos VPS (edit env → build → restart) | Runbook §3.6 |
| Smoke manual 11 pasos | Runbook §3.7 |
| Budget alerts pendientes | Runbook §3.5 |

**Confirmación en VPS:** el operador debe verificar que la key está en `.env.production`, ejecutar rebuild y marcar smoke PASS en checklist.

---

## 16. Checklist recomendado (Maps 3+)

- [x] Auditoría Maps/ubicación (Maps 3 — este documento)
- [x] Documentar activación prod + smoke (Maps 4)
- [ ] Confirmar key activa en VPS producción (operador)
- [ ] Ejecutar smoke manual §3.7 PASS (operador)
- [ ] Budget alerts GCP 50/80/100% (operador)
- [x] Migración `googlePlaceId` + `province` (Maps 5 — código + migración en repo)
- [x] Maps 5 smoke manual documentado (§18)
- [x] Maps 6–10 implementados (audit §19–23)
- [ ] **Operador:** `npx prisma migrate deploy` en VPS + smoke §18 PASS
- [ ] Smoke API: `pnpm --filter api run smoke:maps-location` (con API + datos)
- [ ] Backfill coords en registros legacy sin geo
- [ ] Unificar catálogo provincias (shared)
- [ ] Producer sede pública (opcional)
- [ ] JSON-LD `addressRegion` donde aplique
- [ ] Smoke Maps 10 + cierre Etapa B en checklist V2

---

## 17. Referencias de código

- Prisma: `apps/api/prisma/schema.prisma` — `Event`, `GastroProfile`, `HotelProfile`, `RentalLocation`, `ExcursionOperator`, `ProducerProfile`
- Shared schemas: `packages/shared/src/schemas/{events,gastro-locations,hotel-profile,rental-locations,excursion-operators,profile-onboarding}.ts`
- Location UI: `apps/web/components/location/*`
- Maps URLs: `apps/web/lib/events/maps.ts`
- JSON-LD: `apps/web/lib/seo/jsonld.ts`
- Env: `apps/web/.env.example`

---

## 18. Maps 5 — persistencia placeId y province (2026-06-01)

### Migración

- **Nombre:** `20260601190000_add_maps_place_id_and_province`
- **SQL:** columnas nullable `googlePlaceId`, `province` en `Event`, `HotelProfile`, `RentalLocation`, `ExcursionOperator`; `googlePlaceId` en `GastroProfile` (province ya existía); `city` en `RentalLocation`.

### Entidades cubiertas

| Modelo | googlePlaceId | province | city |
|--------|---------------|----------|------|
| Event | ✅ nuevo | ✅ nuevo | ya existía |
| GastroProfile | ✅ nuevo | ya existía | ya existía |
| HotelProfile | ✅ nuevo | ✅ nuevo | ya existía |
| RentalLocation | ✅ nuevo | ✅ nuevo | ✅ nuevo |
| ExcursionOperator | ✅ nuevo | ✅ nuevo | ya existía |

### UI → API

- `LocationValue.placeId` → `googlePlaceId` al guardar (mappers en `location.utils.ts`).
- Fallback manual: `googlePlaceId = null`, coords/address opcionales como antes.

### Deploy VPS

```bash
cd /opt/yoteinvito/apps/api
npx prisma migrate deploy
pnpm run build   # o rebuild contenedor según runbook
# reiniciar API
cd ../web && pnpm run build && # reiniciar web
```

### Smoke manual Maps 5

1. **Admin evento / productora:** autocomplete → guardar → API/DB: `venueAddress`, `geoLat`, `geoLng`, `googlePlaceId`, `province`.
2. **Gastro local:** editar → guardar → `province`, `googlePlaceId`, coords.
3. **Hotel:** editar ficha → mismos campos.
4. **Rental local admin:** provincia/ciudad del form + mapa → `city`, `province`, `googlePlaceId`.
5. **Excursión operador:** crear/editar → `province`, `googlePlaceId`.
6. **Fallback manual:** dirección sin Places → guardar OK con `googlePlaceId = null`.

### Pendiente post-Maps 5

- **ProducerProfile** sede (address/geo/province) — no incluido.
- **JSON-LD `addressRegion`** — Maps 9.
- **Backfill** registros legacy — fuera de scope Maps 5.
- **Unificar** `ARGENTINA_PROVINCES` en shared — Maps 7.

---

## 19. Maps 6 — Endurecer eventos y excursiones (2026-06-01)

- Validación `validatePresencialEventLocation` — requiere dirección/ciudad/venue al publicar (pending/approved); **coords y placeId opcionales**.
- Productora: `validateProducerEventSubmit` en edit; borradores pueden omitir ubicación.
- Admin excursión: validación coords inválidas + errores en formulario.
- **Fuente de verdad evento:** `venueAddress` (calle) + `city` (label) + `province` + `googlePlaceId` + coords; `venueName` aparte.

## 20. Maps 7 — Gastro, hotel, rentals (2026-06-01)

- Gastro/hotel: coords **opcionales** en schema shared + backend (`geoLat/geoLng` null si fallback manual).
- Validadores `validateGastroLocationValue` / `validateHotelLocationValue` (sin exigir pin).
- Rental/excursion operador: payload completo Maps 5 + validación opcional.
- Ficha hotel: botón ubicación con solo address+city (antes exigía coords).

## 21. Maps 8 — Ver ubicación unificado (2026-06-01)

- Nuevo `apps/web/lib/maps/public-location.ts` + re-export en `lib/events/maps.ts`.
- Helpers: `hasPublicLocationData`, `hasPublicLocationForMapLink`, `buildPublicGoogleMapsHref`.
- Fichas gastro/hotel/rental/excursión usan helper unificado.
- **Productoras:** texto city/country en ficha; sin botón mapa (sin sede exacta — pendiente migración ProducerProfile).

## 22. Maps 9 — JSON-LD local (2026-06-01)

- `buildEventJsonLd`: `province`, `addressCountry: AR`.
- Gastro/hotel: `addressCountry` cuando hay postal.
- Productoras: `PostalAddress` con city/country si existen (sin geo inventado).
- Layouts eventos/excursiones/rentals pasan `province` desde API.

## 23. Maps 10 — Smoke y cierre (2026-06-01)

- Script: `pnpm --filter api run smoke:maps-location` — verifica entidades públicas con address o coords.
- Checklist manual §18 + deploy VPS en runbook §3.8.
- **Deploy post-Maps 5+:**

```bash
cd /opt/yoteinvito/apps/api && npx prisma migrate deploy
cd /opt/yoteinvito && pnpm build
sudo systemctl restart yti-api yti-web
curl https://api.yoteinvito.club/health
curl -I https://yoteinvito.club
```

### Checklist Maps (Etapa B)

- [x] Maps 5 — migración + persistencia placeId/province
- [x] Maps 6 — validación eventos/excursiones
- [x] Maps 7 — gastro/hotel/rentals fallback manual
- [x] Maps 8 — helper público unificado
- [x] Maps 9 — JSON-LD address/geo/province
- [x] Maps 10 — smoke script + docs
- [ ] Operador: `prisma migrate deploy` VPS + smoke PASS
- [ ] Budget alerts GCP
- [ ] Producer sede con mapa (futuro)
