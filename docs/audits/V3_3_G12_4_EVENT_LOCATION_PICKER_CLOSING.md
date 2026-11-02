# V3.3 — G12.4 Selector moderno de ubicación para eventos (closing)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation` · **Estado:** **G12.4 COMPLETE en código**, local,
**sin push / sin deploy**. Base: G12.3 (`9cfd88b`).

**HEAD inicial:** `9cfd88b` · **Migration nueva:** **NO** — `Event` ya tenía `venueAddress`, `city`, `province`,
`geoLat`, `geoLng` y `googlePlaceId`. Sin backfill masivo.

## Commits

| Slice | Commit | Cambio |
|-------|--------|--------|
| 12.4-A | `92364ee` | Validación compartida por campo (`validateLocationFields`, `MODERN_LOCATION_REQUIREMENTS`) + prop `errors` en `EventLocationFields`; perfil gastro con errores en el campo correcto (ya no todo en Provincia) y ciudad obligatoria (igual que la API) |
| 12.4-B | `ad27d4c` | Evento gastro: «Usar ubicación del local» (default, sin mapa) / «Usar otra ubicación» (selector moderno); API guarda el pin propio; cambiar de modo descarta los valores del otro modo |
| 12.4-C | `6b1ed19` | Productora `/producer/events/new` y `/[eventId]/edit`: reglas modernas, errores inline por campo, edición precarga provincia / ciudad / dirección / lat / lng; legacy sin ubicación sigue guardando |
| 12.4-D | `1f71cc6` | Compatibilidad: errores de ubicación se limpian al cambiar la ubicación; HTTP end-to-end |
| 12.4-E | (este commit) | Regresión, builds, docs |

## Un solo sistema de ubicación

Todos los formularios usan `EventLocationFields` = `ProvinceCitySelect` (Georef + fallback
`ARGENTINA_PROVINCES`) + `AddressMapPicker` (`/geo/resolve-address`, pin arrastrable, `LatLngMapPreview`
sin API key). Mapeo `locationValueFromEventFields` / `eventFieldsFromLocationValue`. **No** se creó otro
servicio de Maps ni otro componente de mapa.

## Gastro — ubicación del evento

- **Local (default):** el formulario no muestra mapa; muestra el resumen del local (nombre, dirección,
  ciudad, provincia). Payload `{ useLocalLocation: true }` → la API copia dirección + pin del local.
- **Otra ubicación:** «Nombre del lugar (opcional)» + selector moderno. Zod exige provincia + ciudad +
  dirección (`useLocalLocation: false`) y pin completo o ninguno. Coordenadas siempre del lugar elegido,
  nunca mezcladas con las del local.
- **Cambio de modo:** custom → local reemplaza todo por el local; local → custom arranca vacío.
- **Respuesta:** `usesLocalLocation` (comparando con el local), `googlePlaceId`, `geoLat`, `geoLng`.
- **Clientes G12.2:** sin `useLocalLocation`, crear sin dirección = local; editar sin el flag = patch parcial legacy.

## Productora — reglas

- **Estricto** (crear, o editar cambiando la ubicación): provincia + ciudad + dirección si se completó
  cualquier campo o al publicar; pin completo o ninguno.
- **Legacy sin tocar:** un evento viejo sin provincia / pin abre y guarda igual (solo se valida el pin
  a medias y la regla presencial previa al publicar).
- Errores junto al campo (`province`, `city`, `venueAddress`, `locationMap`); el wizard vuelve al paso 2.
- Sin cambios en checkout, ticket types, referidos, cortesías ni aprobación.

## Regresión

| Check | Resultado |
|-------|-----------|
| Nuevo: `test:event-location` (validador, mapeo, producer strict / draft / publish / legacy / pin a medias / lat-lng en `buildUpdatePayload`) | PASS |
| `test:gastro-promo-events` (local / custom / switch / legacy), `test:gastro-promo-event-ownership`, `test:gastro-promo-event-admin` | PASS |
| **DB (PostgreSQL local, rollback):** `test:g12-gastro-promo-events-db` | PASS |
| **HTTP end-to-end (API compilada, dev auth, datos temporales borrados, 0 restos):** usar local → dirección + pin del local · custom sin provincia / ciudad 400 · custom con pin propio · aprobar · detalle público con lugar + coordenadas · custom → local · local → custom sin pin (sin coordenadas del local) · productora legacy sin ubicación 200 · productora guarda lat / lng / provincia / placeId · usuario ajeno 403 | 10/10 PASS |
| Público / G12.1–G12.3: hero layout, modal top offset, share, galería swipe, event summary, visibilidad, QR overlay, denuncias, vistas por local | PASS |
| Gastro: multi-local, empty states, chips; `test:ticket-template-schema` | PASS |
| `pnpm --filter shared/api/web/scanner run build` | PASS (los 4) |

**Total suites:** 18 PASS. **QA visual mobile (página temporal con componentes reales + repos mock, no
commiteada) 320 / 375 / 390 / 430:** sin scroll horizontal (ancho del documento = viewport), iframe del mapa
dentro del viewport, submit custom vacío con errores por campo, geocoding completa el pin y el payload,
volver a «Usar ubicación del local» quita el mapa y el payload custom.

## Deploy (cuando el operador lo indique)

Sin migrations. `shared` build **antes** de la API → builds → restart api / web (viaja con G12.1 + G12.2 si
todavía no se desplegaron).

## QA manual pendiente (post-deploy)

1. Portal gastro → Eventos → crear con «Usar ubicación del local»: sin mapa; detalle público con la
   dirección del local.
2. Crear / editar con «Usar otra ubicación»: provincia → ciudad → dirección → «Buscar en mapa» → mover pin;
   errores junto a cada campo; volver a «local» y guardar.
3. Productora: crear evento con mapa; editar uno existente (precarga provincia / ciudad / dirección / pin);
   editar un evento viejo sin provincia sin tocar la ubicación y guardar.
4. Celular real 320–430: el mapa y los selects no desbordan.

## Riesgos / pendientes

- Eventos legacy siguen sin provincia / pin hasta que alguien los edite (sin backfill, por diseño).
- Sin `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` el mapa es el iframe de vista previa (pin no arrastrable); el
  geocoding vía `/geo/resolve-address` funciona igual.
- `event` sigue «comingSoon» (sin cambios).
