# GEO / Maps Stage Closing

**Fecha:** 2026-06-23  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** Completado (código + docs). Pendiente operativo: deploy VPS + keys Google + QA producción.

---

## Slices cerrados

| Slice | Commit | Resumen |
|-------|--------|---------|
| GEO 0 | `7957994` | Auditoría `GEO_MAPS_STAGE_AUDIT.md` |
| GEO 1 | `36d0bd9` | `GeoRefService`, `GET /geo/provinces`, `GET /geo/localities` |
| GEO 2 | `ed457ab` | `GeoRepo` + `useGeoProvinces` / `useGeoLocalities` |
| GEO 3 | `6b0e763` | UI dinámica provincia/localidad + fallback manual |
| GEO 4 | `0382547` | Dirección compuesta geocoding; no sobrescribir `address` |
| GEO 5 | `f098b8a` | Fichas públicas sin duplicar ubicación |
| GEO 6 | `fca2cb4` | `loading=async` en loader Maps JS |
| GEO 7 | (este doc) | QA técnico + contextos actualizados |

---

## Cambios principales

1. **Georef Argentina** como fuente backend de provincias y localidades (cache 24h / 12h).
2. **Google Geocoding** solo para resolver pin/coords (`POST /geo/resolve-address`).
3. **Formularios:** provincia y ciudad desde API; opción «No encuentro mi localidad»; dirección = calle y altura.
4. **Geocoding:** compone internamente `calle, ciudad, provincia, Argentina` sin guardar dirección compuesta en DB.
5. **Fichas públicas:** `formatPublicLocationDisplay` evita duplicar city/province en address.
6. **Bug fix:** `AddressMapPicker` ya no reemplaza `address` con `formattedAddress` de Google.

---

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| `GET` | `/geo/provinces` | Público | Lista provincias Georef |
| `GET` | `/geo/localities?province=Río Negro` | Público | Localidades por provincia |
| `POST` | `/geo/resolve-address` | JWT | Geocoding Google |

---

## Frontend

| Pieza | Ubicación |
|-------|-----------|
| Hooks | `useGeoProvinces`, `useGeoLocalities` — `apps/web/lib/query/geo.ts` |
| Query keys | `geoKeys` — `apps/web/lib/query/keys.ts` |
| Repo | `repos.geo.listProvinces`, `listLocalities`, `resolveAddress` |
| UI | `ProvinceCitySelect` (Georef + fallback catálogo), `AddressMapPicker`, `EventLocationFields`, `RentalLocationFields`, `GastroProvinceCityFields` |
| Display público | `formatPublicLocationDisplay`, `formatPublicLocationText` — `lib/maps/public-location.ts` |

### Formularios afectados

- Productora / eventos (`ProducerEventFormFields`)
- Admin publicaciones generales (`EventCategoryPublicationFields`)
- Portal gastro (`GastroLocalForm`)
- Admin rentals locales (`RentalLocationFields`)
- Operadores excursión (`RentalLocationFields`)
- Excursiones (`EventLocationFields`)
- Registro gastro (`GastroProvinceCityFields`)
- Portal hotel (`HotelProfileForm` — mismo patrón)

---

## Variables de entorno

| Variable | App | Uso |
|----------|-----|-----|
| `GOOGLE_GEOCODING_API_KEY` | API | Geocoding server-side |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Web | Maps JS (pin interactivo) |

Georef: sin key.

---

## QA realizado

### Backend (build)

```bash
pnpm --filter shared run build   # OK
pnpm --filter api run build      # OK
```

### Frontend (build)

```bash
pnpm --filter web run build      # OK (ECONNREFUSED en SSG por API offline — esperado local)
```

### Manual

- [ ] Provincia dinámica en formularios (requiere API + Georef en runtime)
- [ ] Localidad manual
- [ ] Ubicar en mapa con dirección compuesta
- [ ] Fichas públicas sin duplicación
- [ ] Mobile
- [ ] Producción post-deploy

---

## Comandos ejecutados

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```

---

## Warnings Google Maps

| Warning | Acción |
|---------|--------|
| `loading=async` | Corregido: param `loading=async` en script URL |
| `google.maps.Marker` deprecated | Documentado — no migrar a `AdvancedMarkerElement` en esta etapa |
| `ERR_BLOCKED_BY_CLIENT` | Adblock/extensión — no es bug del proyecto |

---

## Pendientes operativos

- [ ] `GOOGLE_GEOCODING_API_KEY` en VPS (`/opt/yoteinvito/apps/api/.env`)
- [ ] Restricción IP Google Cloud para key Geocoding
- [ ] `prisma migrate deploy` si falta audit `GEO_ADDRESS_RESOLVED`
- [ ] Redeploy API + Web
- [ ] QA manual producción post-deploy

---

## Pendientes futuros

- [ ] Migración a `google.maps.marker.AdvancedMarkerElement`
- [ ] Cache persistente Georef (Redis) si el tráfico lo justifica
- [ ] Smoke automatizado `GET /geo/provinces` en CI

---

## Riesgos / notas

- Datos legacy con slugs en province/city: `provinceLabelFromValue` / `cityLabelFromValue` siguen resolviendo al cargar formularios.
- Si Georef falla, UI usa catálogo estático `ARGENTINA_PROVINCES` como fallback (provincias turísticas limitadas).
- `resolve-address` sigue autenticado; provincias/localidades son públicas.

---

## Hotfix GEO post-deploy (2026-06-23)

**Problemas corregidos:**

- Localidades duplicadas en select (Georef devuelve el mismo nombre con IDs distintos; ej. San Carlos de Bariloche ×2 en Río Negro).
- Pin/mapa no se actualizaba tras geocoding exitoso (mapa montado sin recentrar; `mapEpoch` + `panTo`).

**Causa raíz:**

- Backend deduplicaba por `id`, no por nombre normalizado.
- Frontend mezclaba fallback local con datos Georef cuando `data?.length` era falsy durante carga.
- `MapCanvas` no recentraba de forma confiable al resolver nueva dirección.

**QA:**

- [x] Build shared + api + web
- [x] Verificado Georef raw: 149 filas → 143 nombres únicos normalizados para Río Negro
- [ ] QA manual producción post-deploy (Quime 695 / Mitre 250, Bariloche)

---

## Hotfix GEO — address input en geocoding (2026-06-23)

**Problema corregido:**

- La calle/altura escrita en «Dirección / punto de encuentro» no se incluía al resolver el pin; Google geocodificaba solo ciudad/provincia.

**Causa raíz:**

- El handler «Ubicar en el mapa» podía leer un `value.address` desactualizado (closure de React) en lugar del texto visible del input.
- La query enviada a geocoding no quedaba trazable de forma explícita en el contrato frontend → backend.

**Solución:**

- `AddressMapPicker` lee la dirección desde ref del input al resolver y compone `query` con `composeFullAddress({ address, city, province, country })`.
- Validación explícita: provincia, ciudad y dirección obligatorias antes de llamar a Google.
- Backend acepta campo opcional `query` y lo usa como string de geocoding; fallback a composición con campos separados.
- Log sanitizado en API: `Geocoding context=… query="…"`.
- Debug en frontend solo en development: `[geo] resolve payload`.

**QA:**

- [x] Build shared + api + web
- [ ] QA manual producción: Quime 695 / Mitre 250 en Bariloche; cambio de dirección re-ubica pin; dirección vacía muestra error sin llamar a Google

---

## Referencias

- Auditoría: `docs/audits/GEO_MAPS_STAGE_AUDIT.md`
- Cierre previo pin: `docs/audits/GEO_ADDRESS_MAP_PIN_CLOSING.md`
- Pendientes: `docs/context/CONTEXT_PENDIENTES.md`
