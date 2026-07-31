# V3.2 — Auditoría técnica y matriz visual (Slice 0)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Alcance:** Solo análisis y documentación. Sin cambios funcionales.  
**Checklist:** [`docs/dev/Yo_Te_Invito_Checklist_V3_2_Mejoras_Visuales.md`](../dev/Yo_Te_Invito_Checklist_V3_2_Mejoras_Visuales.md)

---

## 1. Resumen ejecutivo

### Estado actual

El descubrimiento público V2/V3.1 está maduro: Home (`HomeHero` + rails + `ContentCard` + `ContentPreviewModal`), landings `/categoria/*` (`CategoryHeroBanner` + `SubcategoryRail` + carruseles), Explore (`PublicSearchBar` → `GET /public/events/search`), Reviews V2 (escala interna **1–10**, UI **1–5**), GEO Georef (`ProvinceCitySelect`), Maps (`geoLat`/`geoLng` + modal), Footer V2 (tokens `accent` / `accent-soft`), Admin dashboard con dos bloques de pendientes **no equivalentes**.

### Principales componentes

| Área | Componentes clave |
|------|-------------------|
| Banners | `HomeHero`, `CategoryHeroBanner`, `buildCategoryHeroPlaylist`, `useCategoryHeroBanner` |
| Cards | `ContentCard`, `ExpandedContentCardOverlay`, `ContentPreviewModal`, `GastroDiscountPublicCard`, `EventCard` (legacy/me) |
| Subcategorías | `SubcategoryRail` → título hardcodeado `"Subcategorías"` |
| GEO | `ProvinceCitySelect`, `useGeoProvinces` / `useGeoLocalities`, fallback `ARGENTINA_PROVINCES` + texto libre manual |
| Explore | `PublicSearchBar`, `ExplorePageContent`, `useExploreEvents` |
| Reviews | `ReviewSummary`, `ReviewForm`, `RatingInput`, `lib/reviews/ratingDisplay.ts` |
| Maps | `EventLocationModal`, `lib/maps/public-location.ts`, `AddressMapPicker` |
| Admin | `AdminDashboardClient`, `AdminPendingEventsQueue`, `AdminOperationalPendingSection` |
| Footer | `FooterFull`, `FooterInstagramHighlight`, `footerStyles.ts`, tokens en `globals.css` |

### Principales dependencias

- Contratos: `packages/shared` (events, reviews, gastro discounts, admin-dashboard, geo).
- Repos web: `ApiRepository` + interfaces; hooks TanStack Query.
- Endpoints públicos: `/public/events/*`, `/public/category-banners`, `/public/category-editorial-banners`, `/public/gastro-*`, `/public/reviews*`, `/geo/*`, `/admin/dashboard`.

### Conclusión general

V3.2 es viable por slices pequeños. Varios supuestos de producto requieren matiz:

1. **Autoplay** solo existe en banners de **categoría** (7000 ms), no en Home.
2. **Admin “cola duplicada”** no es duplicado real: pendientes de aprobación ≠ borradores + descuentos gastro.
3. **Búsqueda** actual es parcial case-insensitive **solo en `title`** — insuficiente para sugerencias multi-campo.
4. **Reviews** ya convierten 1–10 → 1–5 en UI; caritas pueden ser cambio visual sin migración.
5. **Gratis** en descuentos es hardcodeado en `GastroDiscountPublicCard`, independiente del valor.

### Nivel de riesgo

**Medio-alto** en Slice 10 (bloqueo Eventos/Gastro) y Slice 2 (cards globales). **Medio** en búsqueda predictiva y banner gastro con descuentos. **Bajo** en footer color, título Subcategorías, autoplay categoría, badge Gratis.

---

## 2. Arquitectura encontrada

### Frontend

```
UI → hooks TanStack Query → repositories/interfaces → ApiRepository → ApiClient → NestJS
```

Sin `fetch` directo en componentes públicos auditados. Query keys centralizadas en `lib/query/keys.ts`.

### Backend

```
Controller → Zod (shared) → Service → Prisma → PostgreSQL
```

Tenant isolation vía `tenantId` en queries públicas.

### Repositories / endpoints / contracts (muestra)

| Dominio | Repo / método | Endpoint | Schema shared |
|---------|---------------|----------|---------------|
| Search | `events.search` | `GET /public/events/search` | `EventsSearchQuery` |
| List | `events.list` | `GET /public/events` | list query |
| Editorial banners | `categoryEditorialBanners.getPublic` | `GET /public/category-editorial-banners` | category banners |
| Publication banners | category banners repo | `GET /public/category-banners` | |
| Reviews summary | reviews hooks | `GET /public/reviews/summary` | `reviewEntitySummaryQuerySchema` |
| Reviews list | | `GET /public/reviews` | `publicReviewsListQuerySchema` |
| Gastro discounts | `publicGastro.*` | públicos gastro discounts | gastro discount schemas |
| GEO | `geo.listProvinces` / `listLocalities` | `GET /geo/provinces`, `GET /geo/localities` | |
| Admin dash | `adminDashboard.getDashboard` | `GET /admin/dashboard` | `admin-dashboard.ts` |

---

## 3. Banners

### 3.1 Home (`/home`)

| Ítem | Evidencia |
|------|-----------|
| Componente | `apps/web/components/home/HomeHero.tsx` |
| Orquestación | `HomeLanding.tsx` → featured/trending por categoría |
| Altura | `h-[72vh] min-h-[520px]` — protagonista |
| Playlist | Hasta 6 items; `mapFeaturedItemToHeroModel` |
| Autoplay | **No existe** — solo controles ← → manuales |
| Pausa / loop | N/A (sin timer) |
| Editoriales | Home **no** usa banners editoriales de categoría |

### 3.2 Categorías (`/categoria/*`)

| Ítem | Evidencia |
|------|-----------|
| Componente | `CategoryHeroBanner.tsx` (compartido) |
| Usado en | `CategoryLandingPage.tsx`, `EventDiscoveryContent.tsx` |
| Hook | `useCategoryHeroBanner.ts` |
| Altura | `h-[34vh] min-h-[220px] max-h-[320px]` — ~mitad de Home |
| Playlist | `buildCategoryHeroPlaylist`: editoriales (máx 5) **primero**, luego publicaciones (máx 5), dedupe por `id` |
| Fuentes | 1) `useCategoryEditorialBanner` 2) `useCategoryBanner` 3) fallback `events.list` sort `recent` si hay editorial y cero banners de publicación |
| Autoplay | `setInterval` **7000 ms**; pausa en `onMouseEnter` / resume `onMouseLeave`; loop `% models.length` |
| Interacción | dots + flechas; al click index se actualiza (timer sigue si no paused) |
| Animación | Framer Motion fade/slide |
| Imagen faltante | Gradiente + ✦ |
| Mobile | Misma altura relativa; CTAs secundarios ocultos en xs |

### 3.3 Confirmación: editoriales no reemplazan publicaciones

**Confirmado.** Tras Etapa 16 (`V3_1_STAGE_16_BANNERS_RENDERING_CLOSING.md`), la playlist combina ambas fuentes. Carruseles inferiores no se vacían por editoriales.

### 3.4 Título `Subcategorías`

| Ítem | Valor |
|------|-------|
| Archivo | `SubcategoryRail.tsx` L57 |
| Render | `<CategorySectionHeading title="Subcategorías" />` |
| Slice posterior | Quitar solo ese heading; conservar chips/`SubcategoryCard`/`SubcategoryFilterChip` |

### 3.5 Banner gastronómico + descuentos

Hoy el hero gastro usa la misma playlist editorial + publicaciones de **locales** (vía category banners / events `category=gastro`). **No incluye** descuentos como slides.

Para incorporar descuentos sin romper playlist:

| Enfoque | Notas |
|---------|-------|
| Adaptador FE | Mapear `PublicGastroDiscountListItem` → `HeroViewModel` (imagen, título, CTA `/descuentos/:id`) |
| Query extra | Reutilizar listado público de descuentos vigentes |
| Normalización vigencia | Filtrar ACTIVE + `DATE_RANGE` vigente + `WEEKLY_RECURRING` válido hoy |
| Riesgos | Sin imagen; duplicar local; mezclar CTA local vs descuento; vencidos/recurrentes; empujar publicaciones reales |

Recomendación: adaptador FE + filtro de vigencia en shared helpers existentes; cupo separado (p. ej. máx N descuentos intercalados), no reemplazar publicaciones.

### 3.6 Riesgos banners

- Unificar altura Home vs categoría sin romper mobile.
- Reducir 7000→~3500 sin centralizar deja timers duplicados si se copia el patrón a Home.
- Intercalar descuentos puede empujar slides editoriales/publicaciones fuera del top visual.

---

## 4. Cards

### 4.1 Componentes compartidos

| Componente | Rol |
|------------|-----|
| `ContentCard` | Card principal discovery (Home, Explore, categoría, rails) |
| `contentCardPresentation.ts` | Badges, subtitle, location, meta, price, date, CTAs |
| `ExpandedContentCardOverlay` | Hover desktop (md+) |
| `ContentPreviewModal` (+ Meta/Actions/Chips/Expanded) | Preview modal |
| `ContentRail` | Carrusel horizontal |
| `ContentTagChips` | Etiquetas |

### 4.2 Cards específicas / legacy

| Componente | Uso |
|------------|-----|
| `GastroDiscountPublicCard` | Rail descuentos (`GastroDiscountsRail`) |
| `EventCard` | `/me` recomendaciones, `Carousel` legacy |
| `PublicProducerEventCard` | Perfil productora |
| `GastroLocationCard` | Algunos listados gastro con “Ver ubicación” |
| `RentalLocalCard` / excursion cards | Locales/operadores |

### 4.3 Superficies de uso de `ContentCard`

Home rails, Explore grid, Category landing / Event discovery, CrossCategoryRails, related sections, rentals/excursiones listados que mapean a `ContentCardItem`.

### 4.4 Campos visibles (ContentCard)

| Capa | Campos típicos |
|------|----------------|
| Compacta | Cover; badge primario (subcategoría) / secundario rental; título; subtitle (location o gastro summary); meta (producer / city / schedule / CTA rental); price chip (solo eventos); ★ rating; tags; **gastro**: `gastroPromoImageUrl` esquina superior derecha + chip `Cupón · …` |
| Hover (overlay md+) | Título, fragmento description/summary, location, meta, rating, price, CTA (“Comprar” / “Ver local” / rental CTA) |
| Modal | Cover, badge, título, description, date, location, rating, chips, CTA detalle, similares |

### 4.5 Dónde aparece cada dato

| Dato | Compacta | Hover | Modal |
|------|----------|-------|-------|
| Título | Sí | Sí | Sí |
| Resumen | Gastro subtitle | Parcial | Modal description/summary |
| Descripción | No (salvo trunc gastro) | Fragmento | Ampliada |
| Localidad/ciudad | Subtitle/meta (casi siempre) | Sí | Sí |
| Fecha | Bloque poster eventos | — | Sí eventos |
| Precio | Eventos `fromPrice>0` | Sí | Sí |
| Gratis | Solo card descuento (hardcoded) | — | — |
| % | Solo `GastroDiscountPublicCard` si `PERCENT` | — | Ficha descuento |
| Local/productora | Meta / ProducerMeta | Sí | Sí |
| Etiquetas/tags | Sí | Chips modal | Sí |
| Subcategoría | Badge primario | — | Badge |
| Valoración / count | ★ avg (count en hover/modal) | Sí | Sí |

### 4.6 Matriz visual actual

| Vertical | Vista compacta actual | Hover actual | Modal actual | Datos repetidos | Componente principal | Riesgo al modificar |
|----------|----------------------|--------------|--------------|-----------------|----------------------|---------------------|
| Eventos | Fecha poster + título + venue·city + producer + price + ★ + tags | Desc + location + price + CTA Comprar | Desc + fecha + location + CTA | City en compacta y hover | `ContentCard` | Alto (ticketing CTA) |
| Local gastronómico | Título + summary + city meta + ★ enfatizado + **mini promo** | Desc + location + Ver local | Desc + location | City / summary | `ContentCard` + promo fields | Medio-alto |
| Descuento gastronómico | Imagen + badge **Gratis** + título + local + summary + `value%`/`$` + fechas | N/A (link directo) | Ficha `/descuentos/[id]` | — | `GastroDiscountPublicCard` | Medio (QR/claim no en card) |
| Rental | Badge Alquiler + título + local·city + CTA alquiler | Overlay rental | Modal rental CTA | Local/city | `ContentCard` | Medio (copy rental) |
| Excursión | Título + city + schedule line | Desc + schedule | Modal | Schedule vs meta | `ContentCard` | Medio |
| Hotel | Discovery “Próximamente”; ficha `/hoteles/[id]` | Limitado en rails (hotel filtrado en home) | Ficha hotel | — | Hotel screens | Bajo si no se toca V3.2 cards |

### 4.7 Matriz deseada (producto — no implementar)

| Vertical | Compacta deseada | Hover deseado | Modal deseado |
|----------|------------------|---------------|---------------|
| Eventos | Título, resumen, etiquetas, ★ promedio | Fragmento desc + metadatos (fecha/venue) | Desc ampliada + fechas + CTA ficha |
| Local gastro | Título, resumen, etiquetas, ★ (sin mini-preview descuentos) | Fragmento + ciudad/horarios si aporta | Desc + CTA local |
| Descuento gastro | Título descuento, nombre local, vigencia, beneficio **sin % automático ni Gratis** | Fragmento condiciones | Desc + vigencia completa (rango/recurrencia) + CTA |
| Rental | Título, resumen, etiquetas, ★ | Fragmento + local | Desc + CTA |
| Excursión | Título, resumen, etiquetas, ★ | Fragmento + schedule | Desc + CTA |
| Hotel | (si aplica) título, resumen, etiquetas, ★ | Fragmento | Desc + CTA |

---

## 5. Gastro

### 5.1 Cards de locales

- Discovery: `ContentCard` con `category=gastro` (Event público / publicEventId → `/restaurants/[id]` o `/gastronomicos/[profileId]`).
- Mini-preview descuentos: campos `gastroPromoImageUrl` + `gastroPromoLabel` en summary API (`public-events.service.ts` toma **primer** `gastroDiscounts` del evento).
- Render: `ContentCard.tsx` esquina superior derecha + chip “Cupón · …”.
- Eliminar mini-preview: **cambio de render** suficiente para UI; opcionalmente dejar de seleccionar/adjuntar promo en listados (ahorro payload/caché). **No** afecta ficha gastro ni QR. Otras pantallas que usen `ContentCard` dejarían de mostrar promo.

### 5.2 Cards de descuentos

| Ítem | Evidencia |
|------|-----------|
| Card | `GastroDiscountPublicCard.tsx` |
| Modal detalle | Página `/descuentos/[id]` (+ claim flows) |
| Tipo | Prisma `GastroDiscountType`: `PERCENT` \| `FIXED` |
| Formato valor | `PERCENT` → `` `${value}%` ``; else `` `$${value}` `` |
| Badge Gratis | Hardcoded siempre (L34–36) — **no** deriva de precio 0 |
| Vigencia UI | `formatGastroDiscountValidityRangeLabel(validFrom, validTo, discountDate)` |
| WEEKLY | Portales/admin usan `validityMode` + `validWeekday`; card pública **no** muestra “Todos los X” aún (solo rango/legacy date) |
| Legacy `discountDate` | Sigue en helper de label y modelo Prisma |

### 5.3 Cambio para beneficio no porcentual

Centralizar `formatGastroDiscountBenefit(d)` que respete tipo (y futuro texto libre si se agrega al modelo). Quitar badge Gratis. Extender label de vigencia para `WEEKLY_RECURRING`.

### 5.4 Compartido vs específico

- Locales discovery: `ContentCard` compartido.
- Descuentos: card específica; no pasan por hover/modal de ContentCard.

---

## 6. Formularios GEO

### Inventario

| Pantalla | Componente ciudad | Fuente | Texto libre | Guarda | Georef | Fallback manual |
|----------|-------------------|--------|-------------|--------|--------|-----------------|
| Registro comprador | `Input` ciudad libre | Ninguna catálogo | Sí | Label texto | No | N/A |
| Registro productora | Solo displayName | — | — | — | — | — |
| Registro gastro | `GastroProvinceCityFields` → `ProvinceCitySelect` | Georef + ARGENTINA | Sí (opción manual) | Label nombre | Sí | Sí |
| Registro hotel | `ProvinceCitySelect` | Georef + ARGENTINA | Sí manual | Label | Sí | Sí |
| Admin/Productora Eventos | `EventLocationFields` | Idem + AddressMapPicker | Sí manual | Label + geo | Sí | Sí |
| Admin/Portal Gastro | `EventLocationFields` / Gastro form | Idem | Sí | Label + geo | Sí | Sí |
| Admin Rentals locales | `RentalLocationFields` | Idem | Sí | Label + geo | Sí | Sí |
| Admin Excursiones / operadores | `EventLocationFields` / `RentalLocationFields` | Idem | Sí | Label + geo | Sí | Sí |
| Explore ciudad | `ExploreCityFilter` | Catálogo ciudades explore (no combobox Georef completo) | No (select) | Query URL | Parcial | — |

### Piezas técnicas

- Hooks: `useGeoProvinces`, `useGeoLocalities` (`lib/query/geo.ts`).
- Repo: `GeoRepo` → `/geo/provinces`, `/geo/localities`.
- Select nativo vía `Select` UI — **no** hay Combobox/Command palette reutilizable para ciudades.
- Autocomplete Google existe solo en `LocationPickerMapGoogle` (Places), no para catálogo Georef.
- Persistencia: labels de nombre (no IDs Georef) en la mayoría de flujos.

### Recomendación posterior

Crear `ProvinceCityCombobox` reutilizable sobre Georef: filtrar por escritura, **solo** seleccionar del catálogo; restringir/ocultar fallback manual donde producto lo exija (hoy el manual está embebido en `ProvinceCitySelect`).

---

## 7. Explorer

### Flujo actual

1. `PublicSearchBar`: estado local `q`; submit → `/explore?q=...` (**sin debounce**, sin sugerencias).
2. `useExploreUrlFilters` sincroniza URL ↔ filtros.
3. Formulario Explore aplica draft → URL (`handleSubmit`).
4. `useExploreEvents` → `repos.events.search` → `GET /public/events/search`.
5. Query key: `exploreKeys.search(searchQuery)`.
6. UI: loading skeletons, empty, `QueryError`.

### Backend search (`public-events.service.ts`)

| Capacidad | Evidencia |
|-----------|-----------|
| Coincidencia parcial | Sí — Prisma `contains` |
| Case insensitive | Sí — `mode: 'insensitive'` |
| Acentos | **No** normalización unaccent dedicada |
| Campos | **Solo `title`** |
| No busca | summary, description, local, productora, tags, subcategorías (tags/subcat son filtros aparte, no `q`) |
| Ciudad | Filtro separado `cityWhereInput` |
| Tag | Schema/API lo aceptan; Explore arma `tag` en query, pero `ApiRepository.events.search` **no reenvía** `tag` al GET (gap FE) |
| Paginación | page/limit |

### Capacidad predictiva

| Opción | Veredicto |
|--------|-----------|
| **A** Reusar endpoint + debounce | Viable como MVP **débil**: `limit` bajo + debounce. Limitaciones: solo título; payload `EventSummary` pesado; no cubre tags/local/productora. |
| **B** Endpoint sugerencias | **Recomendado** para el alcance de producto. |

### Diseño sugerido Opción B

- `GET /public/events/suggestions?q=&tenantId=&limit=8`
- Respuesta mínima: `{ id, title, category, coverImageUrl?, subcategoryName?, producerName? }`
- Categorías: respetar feature flags de disponibilidad (Slice 10)
- Debounce 300 ms FE; cancelación via query key
- Riesgos: QPS; mitigar `min length ≥ 2`, rate limit, índice en `title`
- Protección: mismo `publicWhere` que listados (APPROVED, no deleted, visibilidad)

---

## 8. Reviews

### Escala real

| Capa | Escala |
|------|--------|
| Persistencia `Review.overallRating` | **1–10** (V2) |
| Legacy `Review.score` | 1–5 sincronizado |
| Aspectos | 1–10 (`reviewRatingScoreSchema`) |
| API summary avg | Interno 1–10 |
| UI pública | Conversión a **/5** (`ratingDisplay.ts`) |
| Formulario | `RatingInput` estrellas 1–5 → `visualStarsToInternalTen` (2,4,6,8,10) |

### Contratos / endpoints

- `GET /public/reviews/summary`, `GET /public/reviews`
- Create autenticado vía reviews module / me
- Commercial B2B: `CommercialRelationshipReview` (overall 1–10 + legacy rating 1–5) — **separado** del discovery público

### Componentes

| Rol | Archivos |
|-----|----------|
| Resumen | `ReviewSummary` (siempre visible avg + count + aspects) |
| Listado | `ReviewCard`, `EventReviewsSection` |
| Formulario | `ReviewForm` — **montado siempre** si `!hideForm` (no acordeón) |
| Estrellas input | `RatingInput` |
| Cards discovery | ★ vía `formatPublicRatingLabel` |

### Disclosure

No hay acordeón “Ver más” hoy: summary + filtros + lista + form expanden la sección completa.

### Recomendación caritas

**Cambio visual + conversión existente 1–10 → 5 niveles** (`internalTenToVisualStars`). No migrar DB. Centralizar mapeo caritas en el mismo helper para cards/summary/form. Evitar migración real a 1–5 sin aprobación (rompe ranking bayesiano y aspectos).

---

## 9. Mapas

### Campos disponibles

| Entidad | address | city | province | geoLat/geoLng | googlePlaceId |
|---------|---------|------|----------|---------------|---------------|
| Event | `venueAddress` | sí | sí | sí | sí |
| GastroProfile | sí | sí | sí | sí | sí |
| RentalLocation | sí | sí | sí | sí | sí |
| ExcursionOperator | sí | sí | sí | sí | sí |
| HotelProfile | sí (patrón similar) | sí | sí | sí | sí |
| Excursión producto | puede heredar operador | | | | |

Helpers: `hasPublicLocationForMapLink`, embed `buildPublicGoogleMapsEmbedSrc`.

### Componentes existentes

- Formulario: `AddressMapPicker`, `LocationPickerMap` (+ Google/fallback), `useGoogleMaps`
- Público: `EventLocationModal` — texto de dirección + CTA “Abrir en Google Maps” (link externo; **sin** iframe embebido hoy). Helper `buildPublicGoogleMapsEmbedSrc` existe pero no se usa en ese modal.
- Secciones “Ver ubicación” en event/gastro/rental/excursion abren el mismo patrón de modal/link.
- Script Maps JS (`useGoogleMaps`) solo en pickers de portal (`AddressMapPicker` / `LocationPickerMap`), no en discovery público.
- **No** hay mini-mapa en cards/carruseles hoy.
- Listados/search: `EventSummary` **no** incluye `geoLat`/`geoLng` (solo ficha/DTOs de detalle).

### Estrategia preview recomendada

1. **No** instanciar Maps en carruseles/Home.
2. En ficha o `ContentPreviewModal`: reutilizar botón → modal existente; si se quiere preview visual, embed lazy o Static Maps **solo** ahí (hoy el modal es link-out).
3. Opcional: snapshot estático (Static Maps API) solo en detalle — evaluar cuota.
4. Fallback textual si faltan coords.

### Riesgos

Cuota Google, CLS, hydration, múltiples iframes si se agrega embed, API key restrictions, items sin geo, payloads de listado sin coordenadas.

---

## 10. Dashboard Admin

### Estructura

- Página: `app/(portal)/admin/page.tsx` → `AdminDashboardClient`
- Endpoint único: `GET /admin/dashboard`
- Query: `useAdminDashboard` (+ payouts aparte)

### Comparación de módulos

| Dato o acción | Cola de eventos pendientes | Pendientes operativos | Duplicado | Único |
|---------------|---------------------------:|----------------------:|----------:|------:|
| Eventos `PENDING` aprobación | Sí (`pendingEvents`) | No | — | Cola |
| CTA Revisar ficha productora | Sí | — | — | Cola |
| Eventos `DRAFT` | No | Sí (`draftEvents`) | — | Operativos |
| Descuentos gastro pendientes | No | Sí | — | Operativos |
| KPI counters | Sección KPI arriba | — | Contadores vs listas | KPIs |
| Link “Ver todos pendientes” | Sí `/admin/eventos?view=pending` | Drafts / gastro links | — | Ambos links distintos |

**Conclusión:** no son duplicados. Eliminar el primer bloque **pierde** la cola de aprobación rápida. Recomendación: renombrar/clarificar UX o fusionar visualmente en un solo layout con pestañas, **sin** borrar datos de `pendingEvents`. Si producto insistía en “duplicado”, actualizar el Slice 8 tras esta evidencia.

---

## 11. Footer

### Archivos

`components/footer/*`, `footerStyles.ts`, `FooterInstagramHighlight.tsx`, `globals.css`, `tailwind.config.ts`.

### Tokens

| Elemento | Token o valor actual | Token esperado |
|----------|---------------------|---------------|
| Verde global botones | `--color-accent: #16a34a` (`bg-accent`) | Mantener |
| Verde soft / chips glow | `--color-accent-soft: #4ade80` | Usar con criterio |
| Bordes footer Instagram | `border-accent/55` | Alinear a `accent` si se percibe “más claro” |
| Instagram icon / títulos | `text-accent-soft` + glow `rgba(74,222,128,…)` | Posible causa del “verde claro” |
| Shadows hardcoded | `rgba(34,197,94,…)` (#22c55e) en Instagram + ContentCard hover | Reemplazar por accent / accent-rgb |
| Links footer | `hover:text-accent` / `accent-soft` | Unificar a accent principal |
| Focus | `navFocusRing` | OK |

El footer **sí** usa tokens de marca, pero Instagram highlight mezcla `accent-soft` + hex #22c55e/#4ade80 en sombras, percibido más claro que botones `#16a34a`.

---

## 12. Restricción Eventos y Gastronomía

### Superficies públicas a inventariar / proteger

| Superficie | Rutas / archivos |
|------------|------------------|
| Gateway | `/`, `/categorias` — `CATEGORY_GATEWAY_OPTIONS` incluye event+gastro |
| Home | `/home` — tabs/rails event+gastro |
| Navbar | `publicNavConfig` `category-event`, `category-gastro` |
| Categoría | `/categoria/event`, `/categoria/gastro` |
| Fichas | `/events/[eventId]`, `/restaurants/[id]`, `/gastronomicos/[id]`, `/descuentos/[id]`, `/descuentos/reclamo/*` |
| Explore / search / trending / recommended | `/explore`, endpoints públicos |
| Cross rails / related | Category landings |
| Sitemap | `sitemap.ts` incluye categoría event/gastro + listados |
| Content alias | `/content/[id]` |
| Portales privados | `/producer/*`, `/gastro/*`, `/admin/*` — **mantener** |

### Auth ADMIN

- NextAuth session → `session.user.role`
- `useRole().hasRole(Role.ADMIN)`
- Layouts portal: `ProfileProtectedLayout` / `ProtectedLayout`
- JWT API en requests autenticados; **endpoints `/public/*` no exigen auth hoy**

### Alternativas

| Alt | Descripción | Veredicto |
|-----|-------------|-----------|
| 1 | Solo frontend | **Insuficiente** — API sigue exponiendo datos |
| 2 | Public endpoints auth opcional + bypass ADMIN | Viable; complica CDN/caché anónima |
| 3 | Endpoints públicos vs preview ADMIN | Claro aislamiento; más rutas |
| 4 | Feature flags categoría + canal preview admin | **Recomendada** |

### Recomendación arquitectónica

**Alternativa 4** (flags centralizados, p. ej. `categoryAvailability`) aplicada en services públicos (`list`/`search`/`trending`/`recommended`/`banners`/sitemap) + UI gateway/navbar. Preview ADMIN vía:

- header/cookie de sesión en requests que ya mandan JWT desde el web autenticado, **o**
- rutas `/admin/preview/...` que reutilizan services internos.

No borrar modelos. Rentals/Excursiones quedan públicos. Portales comerciales sin flag de bloqueo.

---

## 13. Archivos candidatos por slice

| Slice futuro | Archivos candidatos | Tipo de cambio | Riesgo |
|--------------|---------------------|----------------|--------|
| 1 Banners/subcat/footer | `CategoryHeroBanner.tsx`, `SubcategoryRail.tsx`, `FooterInstagramHighlight.tsx`, `footerStyles.ts`, `globals.css`, posiblemente `ContentCard` shadows | UI tokens + CSS + intervalo | Bajo-medio |
| 2 Cards generales | `ContentCard.tsx`, `contentCardPresentation.ts`, `ExpandedContentCardOverlay.tsx`, `ContentPreviewModal*` | Presentación | **Alto** |
| 3 Gastro cards | `GastroDiscountPublicCard.tsx`, `discount-status-ui.ts`, `ContentCard` promo block, `public-events.service` promo attach | UI + opcional payload | Medio |
| 4 Ciudad combobox | `ProvinceCitySelect.tsx` (+ nuevo combobox), register steps, `EventLocationFields`, `RentalLocationFields`, `GastroProvinceCityFields` | UX forms | Medio |
| 5 Suggest search | `PublicSearchBar.tsx`, `explore` hooks/keys, `ApiRepository`, nuevo controller/service/shared schema | FE+API | Medio |
| 6 Reviews caritas | `ratingDisplay.ts`, `RatingInput`, `ReviewSummary`, `ReviewForm`, `EventReviewsSection`, cards ★ | UI + helpers | Medio (consistencia) |
| 7 Mini mapa | `ContentPreviewModal`, detail sections, `EventLocationModal`, `public-location.ts` | UI lazy | Medio (Maps cost) |
| 8 Admin dash | `AdminDashboardClient.tsx` (composición) | UI only si se reorganiza | **Bajo si no se borra pendingEvents**; alto si se elimina cola real |
| 9 Banner gastro dto | `useCategoryHeroBanner`, `CategoryHeroBanner`, mappers hero, public discounts query | FE (+ filter) | Medio |
| 10 Próximamente | `categoryGatewayConfig`, `publicNavConfig`, category pages, public events/gastro services, `sitemap.ts`, feature flag module | FE+API | **Alto** |

---

## 14. Riesgos de regresión

### Alto

- Modificar `ContentCard` global sin variantes por vertical.
- Bloqueo Event/Gastro solo en UI (API/sitemap/search siguen).
- Bloquear portales `/producer` `/gastro` por error de flag.
- Eliminar cola Admin de `pendingEvents` creyendo duplicado.
- Migrar reviews a 1–5 en DB sin plan.

### Medio

- Sugerencias search sin filtro de categorías bloqueadas.
- Banner gastro: descuentos vencidos/recurrentes mal filtrados.
- Combobox ciudad rompiendo fallback manual donde aún se necesita.
- Mini mapas en carruseles (cuota/CLS).
- `%` / Gratis en descuentos FIXED/texto.

### Bajo

- Quitar título “Subcategorías”.
- Intervalo autoplay categoría.
- Ajuste color footer Instagram.
- Ocultar `gastroPromoImageUrl` solo en render.

---

## 15. Preguntas o decisiones pendientes

1. **Admin Slice 8:** ¿Producto acepta renombrar/reorganizar en lugar de eliminar la cola de aprobación, dado que no es duplicado?
2. **Beneficio gastro no porcentual:** ¿Se agregará tipo `TEXT`/`CUSTOM` al enum o solo se deja de forzar `%` sobre `PERCENT`/`FIXED`?
3. **Registro comprador:** ¿La ciudad preferida debe pasar a catálogo estricto o permanece texto libre intencional?
4. **Preview ADMIN categorías bloqueadas:** ¿JWT en `/public/*` (Alt 2/4 híbrida) o rutas `/admin/preview` (Alt 3)?
5. **Home autoplay:** ¿Producto quiere autoplay también en `HomeHero`, o solo acelerar categorías?

---

## 16. Validaciones (Slice 0)

Ejecutar al cierre:

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```

Este slice solo toca Markdown; fallos de build se documentan como preexistentes.

---

## 17. Orden de implementación (ajuste por evidencia)

1. Slice 0 — esta auditoría.  
2. Slice 1 — banners categoría (altura + autoplay 7s→~3.5s), Subcategorías, footer.  
3. Slice 8 — **redefinir** tras evidencia (no borrar cola de aprobación a ciegas).  
4. Slice 2 — cards generales con matriz por vertical.  
5. Slice 3 — gastro cards / Gratis / %.  
6. Slice 4 — combobox ciudad.  
7. Slice 5 — sugerencias (**Opción B**).  
8. Slice 6 — caritas (conversión visual).  
9. Slice 7 — mini mapa lazy en detalle/modal.  
10. Slice 9 — descuentos en banner gastro.  
11. Slice 10 — Próximamente + flags API (**último** entre features, como checklist original).  
12. QA integral.

Motivo del ajuste Slice 8 temprano: es UI admin de bajo riesgo **si** se corrige el alcance; evita trabajo basado en supuesto falso de duplicación.
