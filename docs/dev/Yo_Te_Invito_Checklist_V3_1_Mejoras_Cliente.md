# Yo Te Invito — Checklist V3.1

## Mejoras cliente, UX, estética y funcionalidad

> Objetivo: ordenar los ajustes solicitados por cliente luego de revisión visual/mobile, separando problemas de diseño, mejoras funcionales, carga de contenido, administración y mejoras futuras.
>
> Esta checklist está pensada para trabajar por slices pequeños en Cursor / Antigravity, evitando mega refactors y respetando la arquitectura actual del proyecto.

---

## 0. Criterio general de V3.1

- [ ] Mantener estética dark premium de Yo Te Invito.
- [ ] Mantener verde como acento principal.
- [ ] No copiar identidad visual de sitios de referencia; solo tomar inspiración de estructura/UX.
- [ ] Priorizar mobile first.
- [ ] Evitar cambios globales que rompan Eventos, Gastro, Rentals o Excursiones.
- [ ] Trabajar por slices chicos y auditables.
- [ ] Actualizar documentación/contextos al cerrar cada bloque.

---

# 1. Correcciones visuales generales / Mobile

## 1.1 Fondo global oscuro

- [x] Agregar fondo negro/dark global a toda la aplicación pública — Slice 2: `globals.css`, `layout.tsx`, `(public)/layout.tsx`.
- [x] Evitar que el navegador en modo claro muestre fondos blancos — `color-scheme: dark` en `html` + fondo en `html`/`body`/`main`.
- [x] Revisar `html`, `body`, layouts públicos y contenedores principales.
- [x] Confirmar que home, categorías, explore y fichas públicas respeten la estética dark/green — wrapper público `bg-bg`; impresión ticket sin cambios (`@media print`).

**Prioridad:** Alta  
**Tipo:** Visual / Global  
**Pantallas:** Global público

---

## 1.2 Menú superior y categorías duplicadas

- [x] Revisar la home/categoría donde aparecen dos bloques similares — Slice 3: hero tabs + `HomeCategoryStrip`.
- [x] Definir si se deja solo carrusel superior o solo board inferior — mobile: solo tabs del hero; desktop (`md+`): strip editorial.
- [x] Evitar repetición visual innecesaria en mobile — `HomeCategoryStrip` con `hidden md:block`.
- [x] Evaluar transformar las categorías en carrusel horizontal más sutil — tabs del hero con scroll horizontal en mobile.
- [x] Confirmar que el botón del carrito y el navbar no se vean afectados.

**Prioridad:** Alta  
**Tipo:** UX / Visual  
**Pantallas:** Home pública, categorías públicas, mobile

---

## 1.3 Calendario tapa/oculta filtros

- [x] Revisar comportamiento del calendario mensual en mobile — Slice 2: `SubcategoryRail`, `EventDiscoveryViewToggle`, `EventCalendarModal`.
- [x] Evitar que el calendario tape los filtros por subcategoría — controles debajo de chips en mobile; modal `z-[70]` + bottom sheet en mobile.
- [x] Ajustar z-index, layout, apertura/cierre o ubicación del calendario — lock scroll body, Escape, overlay click.
- [x] Confirmar que filtros y calendario sean usables en pantallas chicas.
- [x] Revisar especialmente `/categoria/event` y cualquier vista con filtros por fecha.

**Prioridad:** Alta  
**Tipo:** Bug visual / UX  
**Pantallas:** Categoría Eventos / filtros

---

## 1.4 Etiquetas sobre cards públicas

- [x] Revisar etiquetas/badges en cards públicas — Slice 2: `getContentCardPrimaryBadge` / `getContentCardSecondaryBadge`.
- [x] En eventos, mantener etiquetas útiles como “Recitales”, “Fiesta”, “Teatro”, etc.
- [x] En excursiones, evitar mostrar etiquetas genéricas como “Excursión”.
- [x] En excursiones, mostrar solo subcategorías útiles como “Nieve”, “Lagos”, “Trekking”, “Aventura”.
- [x] En gastronomía, mostrar tipo de local: “Restaurante”, “Cafetería”, “Bar”, etc.
- [x] En rentals, mostrar “Alquiler” o subcategoría útil según contexto.
- [x] Ocultar etiquetas genéricas cuando no aporten valor.

**Prioridad:** Media/Alta  
**Tipo:** Estética / Contenido dinámico  
**Pantallas:** Home, categorías, explore, cards públicas

---

## 1.5 Mejorar estética del detalle de excursión

- [x] Dar una vuelta de diseño al detalle público de excursión — Slice 3: `ExcursionDetailInfoGrid`, section headings, cards sidebar.
- [x] Diferenciar mejor título, subtítulos, cuerpo y bloques informativos.
- [x] Evitar que todo se vea como un único bloque de texto.
- [x] Evaluar uso de cards internas, íconos, separadores y acentos verdes.
- [x] Separar información clave: horario, punto de encuentro, duración, ubicación, descripción, condiciones — ubicación/operador/subcategoría en grid; horarios en card operador (sin horarios estructurados nuevos).
- [x] Revisar especialmente mobile.

**Prioridad:** Media/Alta  
**Tipo:** Visual / UX  
**Pantallas:** Detalle excursión

---

## 1.6 Alternativa visual a “Ver más” en descripción

- [x] Revisar comportamiento actual de “Ver más” para descripciones largas — Slice 2: `PublicDescriptionBlock`.
- [x] Evaluar alternativa más clara:
  - “Leer descripción completa”.
  - Modal/popup.
  - Bottom sheet en mobile.
  - Acordeón expandible.
- [x] Evitar scroll interno dentro del div de descripción — preview con `overflow-hidden` + altura máxima.
- [x] Mantener accesibilidad: foco, cierre con Escape, cierre al tocar fuera.

**Prioridad:** Media  
**Tipo:** UX / Lectura  
**Pantallas:** Detalles de publicaciones

---

## 1.7 Descripciones largas con scroll interno

- [x] Corregir casos donde el texto supera el alto del div y se genera scroll interno.
- [x] Cortar el texto visualmente al límite definido.
- [x] Agregar botón “Leer más”.
- [x] Abrir modal/popup con el detalle completo.
- [x] Aplicar a eventos, excursiones, gastronomía y rentals si corresponde — `PlaceDetailView` + bloques existentes vía `RentalDescriptionBlock` / `GastroAboutSection`.
- [x] Evitar que el texto largo rompa cards o fichas mobile.

**Prioridad:** Alta  
**Tipo:** Bug UX / Visual  
**Pantallas:** Detalles públicos

---

# 2. Imágenes, galería y carga multimedia

## 2.1 Medidas recomendadas de imágenes

- [x] Aclarar en cada carga el tamaño recomendado de imagen — Slice 1: `imageUploadHints.ts` + `ImageUploadHint` en formularios GCS principales.
- [x] Definir medidas por tipo de imagen:
  - Imagen principal / portada.
  - Imagen de encabezado.
  - Galería.
  - Banners.
  - Cards/listados.
  - Logo/local/productora si aplica.
- [x] Mostrar ayuda visible en formularios, por ejemplo:
  - “Recomendado: 1080 x 1080 px”.
  - “Formato recomendado: JPG, PNG o WebP”.
  - “Peso máximo sugerido: X MB”.
- [x] Validar si todas las imágenes pueden usar 1080 x 1080 o si conviene recomendar medidas específicas por uso — medidas por rol (cover 1200×675, galería 1080×1080, logo 512×512, etc.).

**Prioridad:** Alta  
**Tipo:** UX Admin / Contenido

---

## 2.2 Imagen de encabezado / portada

- [x] Informar tamaño recomendado para imagen de encabezado — Slice 1 (`variant: cover`).
- [ ] Evaluar si alcanza con indicar medidas o si hace falta herramienta de recorte.
- [x] En V3.1 resolver mínimo con texto de recomendación clara.
- [ ] Para más adelante evaluar:
  - Cropper.
  - Reposicionamiento.
  - Preview mobile/desktop.

**Prioridad:** Alta  
**Tipo:** Carga contenido / UX

---

## 2.3 Orden de fotos en galería

- [x] Confirmar comportamiento actual de galería — `sortOrder` en API; array orden en formulario.
- [x] Agregar opción para reordenar fotos una vez subidas — Slice 5: Subir/Bajar en `RentalProductImagesForm`.
- [x] Permitir mover fotos arriba/abajo o drag & drop — Etapa 12 Slice 12.1: `SortableImageList` + botones fallback.
- [x] Guardar orden persistente — índice del array → `sortOrder` vía `normalizeRentalProductImages`.
- [x] Usar ese orden en detalle público y cards si corresponde — `productGallery.ts` + `rentalProductImagesFromEvent` ordenan por `sortOrder`.

**Prioridad:** Media  
**Tipo:** Funcional / Admin

---

# 3. Subcategorías y filtros

## 3.1 Selección múltiple de subcategorías

- [x] Permitir seleccionar más de una subcategoría por publicación — Slice 8 fase 1 (excursiones).
- [x] Aplicar especialmente a excursiones — Slice 8 (`ExcursionSubcategoryMultiSelect`, solo formularios excursión).
- [ ] Revisar si también aplica a eventos, gastronomía y rentals — fuera fase 1.
- [x] Ajustar modelo/API — `EventSubcategory` + `subcategoryIds`; `Event.subcategoryId` legacy intacto.
- [x] Ajustar filtros públicos — `subcategoryFilterWhere` (principal o adicional).
- [x] Compatibilidad contenido existente — backfill SQL + payload `subcategoryId` solo.

**Prioridad:** Alta  
**Tipo:** Funcional / Modelo de datos

---

## 3.1.1 Validación DB y smoke post-subcategorías (Slice 8.5)

- [x] Script smoke `pnpm --filter api run smoke:v31-subcategories` — Slice 8.5.
- [x] Doc smoke `docs/audits/V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md`.
- [x] Cleanup `EventSubcategory` en `smoke:v31-stabilization`.
- [x] `prisma generate` + `shared` / `api` / `web` lint + build OK.
- [ ] Docker/Postgres local (`pnpm db:up`) — bloqueado: Docker Desktop no corriendo.
- [ ] `prisma migrate deploy` — 3 migraciones: `20260610120000_*`, `20260611120000_*`, `20260612120000_event_subcategories`.
- [ ] `prisma migrate status` OK.
- [ ] `smoke:v31-stabilization` PASS con DB.
- [ ] `smoke:v31-subcategories` PASS con DB.
- [ ] Smoke manual UI: create/edit excursión 2+ subcategorías, detalle, filtros categoría/explore.
- [ ] Regresión manual: links externos, horarios, ubicación, cards otras verticales sin multi-select.

**Prioridad:** Alta (pre-requisito Slice 9 — admin archivar)  
**Tipo:** QA / Estabilización

---

## 3.2 Nuevas subcategorías para excursiones

- [x] Agregar más opciones de subcategorías para excursiones — Slice 1: `seed:subcategories` idempotente (+7 nuevas).
- [x] Opciones iniciales sugeridas:
  - Verano.
  - Invierno.
  - Terrestres.
  - Lagos.
  - Nieve.
  - Trekking.
  - Aventura.
  - Familiar.
  - Naturaleza.
  - Navegación.
  - Montaña.
  - City tours.
- [x] Dejar estructura flexible para agregar nuevas desde Admin o seed controlado.

**Prioridad:** Alta  
**Tipo:** Contenido / Admin / Filtros

---

## 3.3 Botones de filtros más sutiles

- [x] Revisar estética de botones de filtros — Etapa 2 slice 2.1: pills `SubcategoryFilterChip`.
- [x] Evaluar diseño tipo carrusel horizontal — `SubcategoryRail` + explore category chips.
- [x] Tomar como referencia visual ideas de Central Ticket, sin copiar identidad.
- [x] Reducir peso visual de filtros en mobile — altura ~40px, scroll horizontal.
- [x] Mantener accesibilidad y claridad — `aria-pressed`, focus ring, `snap-x`.

**Prioridad:** Media  
**Tipo:** Visual / UX

---

# 4. Maps / ubicación

## 4.1 Maps falla en operador

- [ ] Auditar falla de Google Maps en panel operador/productor — pendiente smoke prod/referrer si persiste tras Slice 2.
- [x] Revisar carga de API key, restricciones de dominio, permisos y errores en consola — Slice 2: `LocationPickerMap` separa missing key / load error / loading.
- [ ] Confirmar si falla solo en producción o también en local/staging.
- [x] Corregir visualización y selección de ubicación — fallback manual con mensaje claro + `min-h` en loading.
- [x] Mantener fallback manual operativo.

**Prioridad:** Alta  
**Tipo:** Bug funcional / Integración

---

## 4.2 Maps en excursiones

- [x] Agregar ubicación/mapa en carga de excursiones — operador + override excursión (`EventLocationFields`).
- [x] Mostrar mapa en detalle público de excursión cuando exista ubicación — `EventLocationModal` + `ExcursionSchedulePublicSections`.
- [x] Permitir cargar punto de salida, ubicación principal o recorrido aproximado — `meetingPoint` + geo operador/excursión.
- [x] Definir campos mínimos:
  - Dirección o punto de encuentro.
  - Ciudad.
  - Provincia.
  - Coordenadas.
  - Texto aclaratorio opcional.

**Prioridad:** Alta  
**Tipo:** Funcional / Publicación excursiones

---

# 5. Links, redes y enlaces externos

## 5.1 Links en excursiones y restaurantes

- [x] Permitir cargar enlaces externos en excursiones — Slice 6: campos en `ExcursionOperator` + admin operador.
- [x] Aplicar también a gastronomía/restaurants — Slice 6: `GastroProfile` + portal/admin gastro.
- [x] Campos sugeridos:
  - Sitio web.
  - Instagram.
  - Facebook.
  - TikTok.
  - WhatsApp — vía `contactPhone` existente + CTA WhatsApp (sin campo duplicado).
  - YouTube.
  - Link de reservas.
  - Link externo personalizado — `socialLinks.externalUrl`.
- [x] Mostrar los links en detalle público de forma clara y segura — `PublicExternalLinksCard`.
- [x] Abrir links externos en nueva pestaña — `target="_blank"` + `rel="noopener noreferrer"`.
- [x] Validar URLs — `safeExternalUrlOptionalSchema` en shared + Zod en API.

**Prioridad:** Alta  
**Tipo:** Funcional / Admin / Público

---

## 5.2 Palabras cliqueables dentro de descripciones

- [x] Evaluar soporte para enlaces dentro de textos largos — Etapa 12: bloque “Links relacionados” (no inline).
- [ ] Permitir que ciertas palabras lleven a páginas informativas externas o internas — V3.2; no HTML libre.
- [x] Alternativa recomendada:
  - Campo de “links relacionados”.
  - Editor enriquecido controlado.
  - Markdown limitado.
- [x] Evitar HTML libre inseguro — URLs https validadas; `PublicRelatedLinksCard`.
- [x] Definir si se habilita en V3.1 o queda para V3.2 — V3.1: links relacionados; inline → V3.2.

**Prioridad:** Media  
**Tipo:** Funcional / Seguridad / Contenido

---

# 6. Resúmenes, descripciones y límites de caracteres

## 6.1 Aumentar resumen público

- [x] Revisar límite actual del resumen, hoy aprox. 220 caracteres.
- [x] Aumentar límite a 400 o 500 caracteres — Slice 4: **500** (`PUBLIC_SUMMARY_MAX_LENGTH`).
- [x] Aplicar en paneles de carga — `RentalSummaryField`, productora, gastro, admin publicaciones.
- [x] Ajustar validaciones frontend/backend/shared schemas + `trimToPublicSummary` en API.
- [x] Revisar cómo impacta en cards públicas y detalles — cards mantienen `line-clamp`; detalle sin cambio de layout.

**Prioridad:** Alta  
**Tipo:** Funcional / UX Admin

---

## 6.2 Subtítulos/resúmenes en publicaciones

- [x] Ampliar límite de subtítulos/resúmenes en publicaciones — Slice 4.
- [x] Pasar de 200 caracteres a 400/500 caracteres — resumen **500**; subtítulo productora **400** (`PUBLIC_SUBTITLE_MAX_LENGTH`).
- [x] Mantener corte visual en cards para no romper diseño.
- [x] Mostrar contador de caracteres en formularios — Slice 1 + Slice 4: contadores reflejan nuevos límites.

**Prioridad:** Alta  
**Tipo:** Formularios / Validación

---

# 7. Excursiones — datos faltantes

## 7.1 Horarios en excursiones

- [x] Agregar campo de horarios en excursiones — Slice 7: campos texto en `Event` + `ExcursionScheduleFormFields` (admin operador + legacy).
- [x] Evitar que el horario quede escondido dentro de la descripción — Slice 7: `ExcursionSchedulePublicSections` fuera de `RentalDescriptionBlock`.
- [x] Evaluar estructura:
  - Horario de inicio (`departureTime`).
  - Horario de fin aproximado — no implementado (MVP texto; usar `durationText` / `scheduleNotes`).
  - Duración (`durationText`).
  - Días disponibles (`availableDaysText`).
  - Observaciones (`scheduleNotes`).
- [x] Mostrar horario en detalle público de forma visible — Slice 7: `/excursiones/[id]`.
- [x] Evaluar si cards públicas deben mostrar horario o solo fecha/ciudad — Etapa 12: una línea metadata (`getExcursionCardScheduleLine`) si hay datos.

**Prioridad:** Alta  
**Tipo:** Funcional / Excursiones

---

## 7.2 Preguntas frecuentes por excursión

- [ ] Para más adelante, agregar FAQs por excursión.
- [ ] Permitir cargar preguntas y respuestas desde panel.
- [ ] Mostrar en detalle público como acordeón.
- [ ] Tomar contenido de referencia de Turisur cuando corresponda.

**Prioridad:** Baja / Más adelante  
**Tipo:** Funcional / Contenido

---

## 7.5 Consolidación post-migraciones (Slice 6 + 7 + 8)

- [x] `prisma generate` + `prisma validate` OK — Slice 7.5.
- [ ] Migraciones `20260610120000_*`, `20260611120000_*` y `20260612120000_event_subcategories` aplicadas en local (requiere Docker/Postgres).
- [x] Script smoke `pnpm --filter api run smoke:v31-stabilization` — Slice 7.5.
- [x] Doc smoke `docs/audits/V3_1_SLICE_7_5_STABILIZATION_SMOKE.md`.
- [x] Revisión estática gastro/excursión links + horarios + ubicación (sin fixes de código).
- [x] `shared` / `api` / `web` lint + build OK.
- [ ] Smoke manual UI con DB (checklist §7 en doc smoke).
- [ ] `prisma migrate deploy` en producción antes de Slice 9.
- [ ] Ver también §3.1.1 (Slice 8.5) para smoke subcategorías y checklist UI ampliado.

**Prioridad:** Alta (pre-requisito Slice 9)  
**Tipo:** QA / Estabilización

---

# 8. Favoritos / “Lo espero”

## 8.1 Aclarar botón “Lo espero”

- [x] Revisar texto y función del botón “Lo espero” — Etapa 2 slice 2.3.
- [x] Definir si representa:
  - Me interesa. ✓ (elegido)
  - Quiero recibir alerta. (vía preferencias, no en el CTA)
  - Avisarme cuando haya novedades. (tooltip)
  - Lista de espera. ✗
- [x] Cambiar copy si genera confusión — «Me interesa».
- [x] Posibles alternativas evaluadas (ver audit Etapa 2).
- [x] Agregar tooltip o microcopy — `EXPECTED_EVENT_BUTTON_TITLE`.

**Prioridad:** Media  
**Tipo:** UX / Producto

---

# 9. Buscador y navegación

## 9.1 Buscador “Explorá Bariloche”

- [x] Revisar experiencia actual del buscador grande — Etapa 2 slice 2.2.
- [x] Evaluar quitar modal/buscador gigante — sin modal; input compacto.
- [x] Propuesta alternativa (fase 1):
  - Buscador simple en barra superior. — pendiente navbar global.
  - Input compacto por palabra clave. ✓ `PublicSearchBar`
  - Búsqueda desde navbar o header. — pendiente.
  - Filtros avanzados dentro de páginas de categoría. ✓ explore «Más filtros»
- [x] Definir comportamiento en mobile — compact, sin fullscreen.
- [x] Revisar impacto en home y categorías — home + explore.

**Prioridad:** Media/Alta  
**Tipo:** UX / Navegación

---

# 10. SEO / Google / Marca

## 10.1 Logo en resultados de Google

- [x] Revisar favicon y metadata del sitio — Etapa 12.6.
- [ ] Confirmar que Google pueda detectar logo/marca — manual GSC/recrawl (no inmediato).
- [x] Agregar o revisar:
  - Favicon.
  - Apple touch icon.
  - Manifest.
  - Open Graph image.
  - Schema.org Organization — `SiteOrganizationJsonLd` en layout.
  - Metadata global.
- [ ] Verificar indexación con Google Search Console — manual post-deploy.

**Prioridad:** Media  
**Tipo:** SEO / Marca

---

# 11. Admin general

## 11.1 Eliminar publicaciones/locales desde Admin (Slice 9 — archivar/dar de baja)

- [x] Baja lógica sin delete físico — `PAUSED`/`APPROVED` eventos; `isActive` rental/excursion; `SUSPENDED` gastro.
- [x] Eventos y contenidos (`/admin/eventos`) — Archivar / Restaurar con confirmación.
- [x] Excursiones (producto `Event` + operador `isActive`) — acciones en ficha operador.
- [x] Gastronomía/locales — Suspender / Activar (existente) + audit log Slice 9.
- [x] Rentals — local `deactivate/activate` + archivar productos (event pause).
- [x] Hoteles — Etapa 12 Slice 12.2: `/admin/hoteles` archivar/restaurar (`SUSPENDED`/`ACTIVE`).
- [x] Confirmación modal (`AdminArchiveConfirmModal`) — avisa que no borra historial.
- [x] Auditoría — `EVENT_POSTPONED`, `EVENT_RESTORED`, gastro/rental/excursion actions.
- [x] Smoke `smoke:v31-admin-archive` + doc `V3_1_SLICE_9_ADMIN_ARCHIVE_SMOKE.md`.
- [ ] Smoke manual UI (checklist §7 doc Slice 9).

**Prioridad:** Alta  
**Tipo:** Admin / Seguridad operativa

---

## 11.2 Admin categorías — creación de banners (Slice 10)

- [x] En Admin > Categorías, permitir crear/cargar banners editoriales (`AdminCategoryEditorialBannerPanel`).
- [x] No solo ordenar o elegir eventos — modelo `CategoryEditorialBanner` + GCS `platform/banner`.
- [x] Carga simple:
  - Imagen.
  - Título.
  - Subtítulo.
  - Categoría asociada.
  - Estado activo/inactivo.
  - Orden (↑↓).
- [x] CTA opcional (ruta interna o http(s) validada).
- [x] Público: hero `/categoria/[category]` prioriza editorial; fallback eventos (`useCategoryHeroBanner`).
- [x] Eventos destacados conservados como fallback (`AdminCategoryBannerPanel`).
- [x] Hoteles sin cambios (Próximamente).
- [x] Smoke `smoke:v31-category-banners` + doc `V3_1_SLICE_10_CATEGORY_BANNERS_SMOKE.md`.
- [ ] Smoke manual UI (tabla en doc Slice 10).

**Prioridad:** Alta  
**Tipo:** Admin / Contenido visual

---

# 12. Productoras / carga de eventos

## 12.1 Mejorar carga de eventos en 3 pasos (Slice 11)

- [x] Wizard 3 pasos en creación y edición (`ProducerEventWizardProgress`, `wizardStep`).
- [x] Patrón registro: progress + Siguiente/Atrás + validación por paso.
- [x] Pasos: (1) datos, (2) fecha/ubicación/entradas, (3) imagen/revisión/publicación.
- [x] Reutiliza `ProducerEventFormFields`, submit y GCS sin duplicar lógica.
- [x] Ticket types/tandas post-guardado en `/producer/events/[id]`.
- [x] Doc `V3_1_SLICE_11_PRODUCER_EVENT_WIZARD_SMOKE.md`.
- [ ] Smoke manual UI mobile.

**Prioridad:** Alta  
**Tipo:** UX Productora / Formularios

---

## 12.2 Términos y condiciones para eventos (Slice 12 — Caso A/B, Etapa 11)

- [x] Aviso legal en paso 3 wizard (`ProducerEventPublicationLegalNotice`).
- [x] Link `/legal/productores`.
- [x] Migración `EVENT_PUBLICATION` + `UserLegalAcceptance.eventId` — `20260610130000_event_publication_legal_acceptance`.
- [x] Endpoints `GET/POST /producer/events/:eventId/legal/*` — aceptación por evento.
- [x] Bloqueo backend `DRAFT → PENDING` sin aceptación (`LEGAL_ACCEPTANCE_REQUIRED`).
- [x] UI: registrar aceptación + deshabilitar envío a revisión si falta.
- [ ] **`producer_terms` publicado por cliente** — en BD local solo DRAFT; `/legal/productores` → 404 hasta publish manual.
- [x] Docs: `V3_1_STAGE_11_*` + `V3_1_SLICE_12_EVENT_PUBLICATION_LEGAL_SMOKE.md`.
- [x] Smoke: `smoke:v31-event-publication-legal`.

**Prioridad:** Alta  
**Tipo:** Legal / Productora / Admin

---

# 13. Publicación detalle — lectura completa

## 13.1 Modal/popup para detalle completo

- [ ] En detalles de publicaciones, evitar scroll interno dentro de bloques.
- [ ] Limitar altura del texto visible.
- [ ] Agregar botón “Leer más”.
- [ ] Abrir popup/modal con el texto completo.
- [ ] Cerrar con botón visible y fondo overlay.
- [ ] Adaptar a mobile como bottom sheet si queda mejor.

**Prioridad:** Alta  
**Tipo:** UX / Detalle público

---

# 14. Cards públicas y diseño editorial

## 14.1 Rediseño de cards públicas estilo editorial / Central Ticket (Slice 13 fase 1)

- [x] Fase 1 en `ContentCard` — fecha afiche, badges sutiles, título poster, dark premium.
- [x] Rediseño completo por vertical (§14.2) — Etapa 3 slices 3.1–3.4.
- [x] Mantener identidad de Yo Te Invito:
  - Fondo dark.
  - Verde como acento.
  - Estética premium/turística.
  - No copiar colores ni marca de terceros.
- [x] Probar una card más editorial con:
  - Imagen protagonista grande.
  - Fecha destacada en bloque lateral o inferior.
  - Título con mayor jerarquía.
  - Ubicación clara.
  - Badge/categoría menos invasiva.
  - Acción secundaria tipo guardar/favorito — en ficha evento (`EventEngagementRow`).
- [x] Aplicar primero a eventos — fase 2 Etapa 3.
- [x] Evaluar adaptación a excursiones, gastronomía y rentals — Etapa 3.
- [x] Mantener compatibilidad con carruseles horizontales mobile.
- [x] Evitar que la nueva card rompa home, categoría, explore y carruseles cruzados — build OK; QA browser pendiente.

**Prioridad:** Media/Alta  
**Tipo:** Visual / UX / Discovery  
**Pantallas:** Home, Categorías, Explore, carruseles públicos

---

## 14.2 Variantes de card por vertical

- [x] Eventos: fecha + lugar + precio desde + productor — Etapa 3.1.
- [x] Excursiones: subcategoría + ciudad + horario/duración si existe — Etapa 3.2 (duración si viene en payload list).
- [x] Gastronomía: tipo de local + ciudad + rating — Etapa 3.3.
- [x] Rentals: local + subcategoría + CTA disponibilidad — Etapa 3.4.
- [x] Mantener una base visual común, pero metadata específica por categoría.

**Prioridad:** Media  
**Tipo:** Visual / Arquitectura UI

---

# 15. Reviews / valoraciones

## 15.1 Cambiar escala visible de valoraciones a 5/5 (Slice 13)

- [x] Helper `ratingDisplay.ts` — conversión visual 10→5.
- [x] UI pública: cards, fichas, reviews summary/card, perfiles comentarista.
- [x] Definir si el cambio será:
  - Solo visual, convirtiendo internamente 10 → 5. ✓ (Etapa 3)
  - O cambio real de modelo/validación a escala 1–5. — pendiente cliente.
- [x] Recomendación inicial: mantener compatibilidad interna y migrar visualmente primero.
- [x] Mostrar estrellas de 1 a 5 en UI pública.
- [x] Ajustar formularios de carga de reseñas para que el usuario valore con 5 estrellas — Etapa 3.5.
- [x] Ajustar filtros públicos de reviews si actualmente filtran de 1 a 10 — Etapa 3.6.
- [x] Revisar promedios, badges y textos — Etapa 3.7.
- [x] Revisar paneles de:
  - Productora.
  - Gastro.
  - Hotel.
  - Admin reviews.
  - Perfil público de comentarista.
- [x] Revisar si las valoraciones B2B productor ↔ referido también deben pasar a escala 5/5 — se mantiene 1–10 (privado).

**Prioridad:** Media/Alta  
**Tipo:** UX / Reviews / Modelo visual

---

## 15.2 Estrategia recomendada para ratings

- [x] Conversión visual 10 → 5 en público (Slice 13).
- [x] Sin migrar DB.
- [x] Helper centralizado `formatPublicRatingLabel`.
- [x] Evitar duplicar lógica en componentes — `ratingDisplay.ts` centralizado Etapa 3.
- [ ] Luego evaluar migración real a 1–5 si el cliente confirma.

**Prioridad:** Media  
**Tipo:** Técnica / Producto

---

# 16. Revisión por pantalla

## 16.1 Home pública

- [ ] Fondo dark global.
- [ ] Revisar menú de categorías superior.
- [ ] Evitar duplicación con cards inferiores.
- [x] Evaluar buscador compacto en navbar/header — fase 1 en home/explore; navbar pendiente.
- [ ] Revisar banners desde Admin.
- [ ] Probar nuevas cards editoriales.

---

## 16.2 Categoría Eventos

- [ ] Calendario no debe tapar filtros.
- [x] Filtros más sutiles — Etapa 2 slice 2.1.
- [x] Cards con badges correctos — Etapa 3 fase 2 eventos.
- [x] Probar card tipo poster con fecha destacada — Etapa 3.1.
- [ ] Cards con badges correctos.
- [ ] Revisar subcategorías múltiples si aplica.
- [ ] Probar card tipo poster con fecha destacada.

---

## 16.3 Categoría Excursiones

- [x] Subcategorías múltiples (fase 1 excursiones) — Slice 8.
- [ ] Nuevas subcategorías.
- [ ] Maps/ubicación.
- [x] Horarios visibles — Slice 7 (detalle público + carga admin).
- [ ] Links externos/redes.
- [x] Cards sin etiqueta genérica “Excursión” — subcategoría prioritaria Etapa 3.2.
- [ ] Detalle con mejor diseño visual.
- [ ] Probar card tipo poster adaptada a excursiones.

---

## 16.4 Gastronomía / Restaurants

- [ ] Agregar links externos/redes.
- [ ] Revisar si aplica maps.
- [ ] Revisar resumen ampliado.
- [ ] Revisar etiquetas/badges.
- [ ] Confirmar diseño de detalle público.
- [x] Probar rating visible en escala 5/5 — Etapa 3.3.

---

## 16.5 Rentals / Equipos

- [ ] Revisar si nuevas cards editoriales aplican sin romper UX de alquiler.
- [ ] Mantener CTA de disponibilidad.
- [ ] No mezclar con estética de eventos con fecha/entrada.
- [ ] Mantener copy anti-alojamiento.

---

## 16.6 Admin

- [ ] Eliminar publicaciones/locales.
- [ ] Crear banners por categoría.
- [ ] Revisar límites de caracteres.
- [ ] Revisar cargas con tamaños recomendados de imágenes.
- [ ] Revisar subcategorías múltiples si se implementa.

---

## 16.7 Productora

- [ ] Carga de eventos en 3 pasos.
- [ ] Aceptación de términos legales.
- [ ] Mejorar formularios largos.
- [ ] Mostrar recomendaciones de imágenes.
- [ ] Revisar preview de card pública si se rediseñan cards.

---

# 17. Priorización sugerida

## 17.1 Bloque urgente V3.1-A — Bugs visuales y UX crítica

- [ ] Fondo dark global.
- [ ] Calendario que tapa filtros.
- [ ] Scroll interno en descripciones.
- [ ] Menú/categorías duplicadas.
- [ ] Etiquetas genéricas en cards.
- [ ] Maps fallando en operador.

---

## 17.2 Bloque V3.1-B — Carga de contenido y formularios

- [ ] Medidas recomendadas de imágenes.
- [ ] Ampliar resúmenes a 400/500 caracteres.
- [ ] Links externos/redes en excursiones y gastronomía.
- [x] Horarios en excursiones — Slice 7.
- [ ] Reordenar galería.
- [x] Subcategorías múltiples (fase 1 excursiones) — Slice 8.

---

## 17.3 Bloque V3.1-C — Admin y operación

- [x] Admin puede archivar/dar de baja publicaciones/locales (Slice 9).
- [x] Admin puede crear banners (Slice 10).
- [x] Productora carga eventos en 3 pasos (Slice 11).
- [x] Aviso legal al publicar (Slice 12 Caso B); bloqueo duro pendiente.

---

## 17.4 Bloque V3.1-D — Mejoras visuales no bloqueantes

- [ ] Rediseñar detalle excursión.
- [ ] Nueva alternativa a “Ver más”.
- [x] Botones/filtros más sutiles estilo carrusel — Etapa 2.
- [x] Mejorar buscador “Explorá Bariloche” — Etapa 2 fase 1.
- [x] Revisar “Lo espero” — → «Me interesa».
- [x] Rediseñar cards públicas estilo poster/editorial — fase 1 (Slice 13); §14.2 completo pendiente.
- [x] Probar nueva card primero en eventos — fase 1 global `ContentCard`.
- [x] Adaptar variante de card para excursiones, gastro y rentals (fase 2) — Etapa 3.

---

## 17.5 Bloque V3.1-E — Reviews / reputación

- [x] Auditar escala actual de reviews 1–10 — Slice 13; interno sin cambio.
- [x] Definir estrategia 5/5: visual primero (Slice 13).
- [x] Ajustar componentes públicos de estrellas — Slice 13.
- [x] Ajustar formularios de reseña (escala 5 visual) — Etapa 3.5.
- [x] Ajustar filtros de reviews — Etapa 3.6.
- [x] Ajustar reportes admin (siguen 1–10) — UI 5/5; CSV interno 1–10 Etapa 3.7.
- [x] Revisar impacto en ranking, promedio y reputación — sin cambio backend.
- [x] JSON-LD `bestRating: 5` — Etapa 3.8.

---

## 17.6 Bloque futuro V3.2

- [ ] FAQs por excursión.
- [ ] Palabras cliqueables dentro de descripciones.
- [ ] Cropper/reposicionamiento de imágenes.
- [ ] SEO avanzado con logo en Google/Search Console.
- [ ] Editor enriquecido seguro para textos largos.
- [ ] Migración real de ratings 1–10 a 1–5 si se confirma.

---

# 18. Nota de alcance recomendada

Para no mezclar demasiadas cosas en un solo bloque:

## V3.1 inmediata

Corregir bugs visuales, fondo dark, calendario, textos largos, etiquetas, maps y límites de caracteres.

## V3.1 funcional

Subcategorías múltiples, horarios, links, galería ordenable, admin eliminar publicaciones y banners.

## V3.1 visual/producto

Cards editoriales, filtros más sutiles, detalle excursión, buscador y ratings 5/5 visibles.

## V3.2

FAQs, editor enriquecido, palabras cliqueables, cropper de imágenes, SEO fino y migraciones estructurales.

---

# 19. Slice 14 — QA integral pre-deploy

> Doc: `docs/audits/V3_1_PRE_DEPLOY_QA_CLOSING.md`

## 19.1 Automatizado (2026-06-14)

- [x] Migraciones V3.1 identificadas (5).
- [x] `prisma migrate deploy` OK.
- [x] `prisma migrate status` OK.
- [x] `shared:build` OK.
- [x] `api:lint` OK.
- [x] `api:build` OK.
- [x] `web:lint` OK.
- [x] `web:build` OK.
- [x] `smoke:v31-stabilization` OK (API HTTP SKIP aceptable).
- [x] `smoke:v31-subcategories` OK (API HTTP SKIP aceptable).
- [x] `smoke:v31-admin-archive` OK.
- [x] `smoke:v31-category-banners` OK.
- [x] Sin features nuevas en Slice 14.
- [x] Getnet/pagos no tocados.

## 19.2 QA manual pendiente (browser)

- [ ] Discovery público (`/`, `/home`, `/categorias`, `/explore`, `/categoria/*`).
- [ ] Fichas públicas (eventos, excursiones, gastro, rentals, hoteles).
- [ ] Admin (archivar, banners, auditoría).
- [ ] Productora (wizard create/edit, legal informativo).
- [ ] Legal (`producer_terms` DRAFT; Caso A no completo).
- [ ] Ratings/cards mobile.
- [ ] Maps prod (API key, referrer).

## 19.3 Deploy VPS

- [ ] `git pull origin feat/v1-s03-api-foundation`.
- [ ] `prisma migrate deploy` en VPS (bloqueante si pending).
- [ ] `pnpm build` + restart `yti-api yti-web yti-scanner`.
- [ ] `curl -I` health público/API/scanner.
- [ ] Confirmar política merge `main` vs deploy directo desde rama.

## 19.4 Pendientes no bloqueantes post-V3.1

- [ ] Legal Caso A (`EVENT_PUBLICATION` + bloqueo) — requiere `producer_terms` publicado.
- [ ] JSON-LD `bestRating: 5`.
- [ ] Formulario review escala 5 visual.
- [ ] Cards editoriales fase 2 (§14.2).
- [x] Drag & drop galería — Etapa 12.1.
- [x] Hoteles archivar — Etapa 12.2.
- [x] Links embebidos en descripciones (§5.2) — bloque links relacionados; inline V3.2.
- [ ] FAQs excursiones.

**Recomendación Slice 14:** listo para deploy técnico; QA manual browser pendiente para cierre cliente 100%.

---

# 20. Hotfix — Admin gastro no aparece en discovery público

> Doc: `docs/audits/V3_1_HOTFIX_ADMIN_GASTRO_DISCOVERY_SMOKE.md`

## 20.1 Causa y fix (2026-06-14)

- [x] Causa: sync `publicEventId` incompleto en `updateStatus` / `update` admin.
- [x] Fix: `syncActiveProfilePublicEvent` + filtro gastro en discovery.
- [x] Smoke `smoke:v31-admin-gastro-discovery` OK.
- [x] Sin migración Prisma.

## 20.2 QA manual pendiente

- [ ] Crear local en `/admin/gastronomicos/nuevo` (ACTIVE + publicar).
- [ ] Verificar `/categoria/gastro` y `/explore?category=gastro`.
- [ ] Ficha `/restaurants/[publicEventId]`.
- [ ] Suspender / reactivar desde admin.
- [ ] Locales prod existentes sin `publicEventId`: reactivar desde admin.

## 20.3 Reparación datos prod

```sql
SELECT id, "displayName", status, "publicEventId"
FROM "GastroProfile"
WHERE status = 'ACTIVE' AND "publicEventId" IS NULL;
```

Reactivar cada perfil desde admin dispara sync sin script destructivo.

---

# 21. Hotfix — Link público gastro incorrecto

> Doc: `docs/audits/V3_1_HOTFIX_GASTRO_PUBLIC_LINKS.md`

## 21.1 Fix links (2026-06-14)

- [x] Causa: redirect `/restaurants/:id` → `/gastronomicos/:id` mezclaba `publicEventId` con `profileId`.
- [x] Cards discovery → `/restaurants/[publicEventId]` (sin `?tenantId=` por defecto).
- [x] Admin/canónico → `/gastronomicos/[profileId]`.
- [x] Helper centralizado `getContentDetailHref` actualizado.
- [x] Sin cambios API/Prisma.

## 21.2 QA manual pendiente

- [ ] Click card en `/categoria/gastro` y `/explore?category=gastro`.
- [ ] URL sin `/gastronomicos/[publicEventId]`.
- [ ] Ficha con contenido.

---

# 22. Hotfix — className visible en descripciones

> Doc: `docs/audits/V3_1_HOTFIX_PUBLIC_DESCRIPTION_CLASSNAME.md`

- [x] Causa: `RENTAL_DETAIL_SECTION_TITLE` = clases Tailwind pasadas como `sectionTitle`.
- [x] Separado `RENTAL_DETAIL_SECTION_HEADING_CLASS` vs `RENTAL_DETAIL_DESCRIPTION_LABEL`.
- [x] Gastro «Propuesta gastronómica»; rentals «Detalle del producto».
- [ ] QA manual fichas públicas sin texto de clase visible.

---

# 23. Etiquetas / Tags de publicaciones

## 23.1 Admin — creación de etiquetas

- [x] Crear módulo de administración de etiquetas en `/admin` (CRUD dedicado o subsección de contenido).
- [x] Permitir crear, editar, activar/desactivar y archivar etiquetas.
- [x] Evitar duplicados o etiquetas demasiado similares (normalización, validación de nombre, sugerencias al crear).
- [x] Definir formato recomendado tipo hashtag (`#nieve`, `#recitales`, `#bariloche`, `#familia`, `#promo`).
- [x] Definir si las etiquetas son globales o por vertical:
  - Eventos.
  - Gastronomía.
  - Excursiones.
  - Rentals.
  - Hoteles (cuando corresponda).
- [ ] Permitir buscar publicaciones por etiqueta desde Admin (listado filtrado por tag).

**Prioridad:** Media/Alta  
**Tipo:** Admin / Contenido / Búsqueda  
**Pantallas:** `/admin/*` (módulo etiquetas), búsqueda admin de publicaciones

---

## 23.2 Publicaciones — etiquetas en carga de contenido

- [x] Al cargar una publicación desde cualquier portal, permitir agregar etiquetas.
- [x] Aplicar a:
  - Eventos de productora.
  - Excursiones.
  - Gastronomía.
  - Rentals.
  - Hoteles (cuando estén activos).
- [x] Permitir seleccionar etiquetas existentes (autocomplete o chips).
- [x] Definir si perfiles comerciales pueden crear etiquetas o solo elegir las creadas por Admin.
- [x] Validar cantidad máxima de etiquetas por publicación.
- [x] Mostrar ayuda visual:
  - «Agregá etiquetas para mejorar la búsqueda en Explorar».
  - «Ejemplo: nieve, cena, teatro, aventura».
- [x] Usar etiquetas como parte del buscador/explorer (`/explore`, búsqueda pública).
- [x] Permitir filtrar o encontrar publicaciones por etiqueta.
- [x] Mostrar etiquetas en:
  - Modal de publicación (`ContentPreviewModal`).
  - Página pública de publicación.
  - Cards públicas solo si no saturan visualmente.
- [x] Evitar mostrar demasiadas etiquetas en cards (límite visual + truncado).

> Doc cierre Etapa 4: `docs/audits/V3_1_STAGE_4_TAGS_CLOSING.md`

**Prioridad:** Alta  
**Tipo:** Funcional / Discovery / UX carga  
**Pantallas:** Portales productora/gastro/hotel/excursión/rental; `/explore`; fichas públicas; cards home/categoría

---

# 24. Scanner PWA / usuarios scanner / operación offline

## 24.1 Crear usuario scanner desde Productoras, Proveedores y Gastros

- [x] En paneles de Productora y Gastro, agregar opción para crear usuario scanner (`/producer/scanners`, `/gastro/scanners` — Slice 5.2). Operador excursión pendiente (sin portal).
- [x] Permitir configurar email/usuario y contraseña inicial (Slice 5.2).
- [x] Asociar el usuario scanner a la cuenta padre (tenant + perfil comercial) — backend `ScannerAccount` (Slice 5.1).
- [x] Definir permisos limitados (modelo): rol `SCANNER` + tabla dedicada, sin membership de portal (Slice 5.1).
- [x] Validar permisos limitados (modelo + scope API — Slices 5.1, 5.7). Pendiente: E2E formal rol SCANNER sin rutas `/producer`.
  - [x] Solo acceder al scanner (rol `SCANNER` + redirect post-login a PWA).
  - [x] No acceder al panel administrativo completo (sin membership de portal).
  - [x] No modificar publicaciones (sin endpoints de edición para SCANNER).
  - [x] Scope API: no validar eventos/descuentos de otra cuenta padre.
- [x] Permitir activar/desactivar usuarios scanner (Slice 5.2).
- [x] Permitir resetear contraseña desde la cuenta padre (Slice 5.2). Admin `/admin/usuarios` pendiente.
- [x] Opción visible para copiar o abrir link del Scanner PWA (`ScannerPwaCta` — Slice 5.3).

**Prioridad:** Alta  
**Tipo:** Seguridad / Roles / Portal operativo  
**Pantallas:** `/producer/*`, `/gastro/*`, portal operador excursión; `/admin/usuarios` (reset)

---

## 24.2 Link para descargar o instalar Scanner PWA

- [x] En paneles de Productora y Gastro, mostrar CTA (`ScannerPwaCta` — Slice 5.3). Operador excursión pendiente.
  - [x] «Abrir Scanner».
  - [x] «Instalar Scanner PWA» / instrucciones.
  - [x] «Copiar link del Scanner».
- [x] Instrucciones Android/Chrome e iPhone/Safari en `ScannerPwaCta`.
- [x] Manifest + iconos en `apps/scanner/public` (Slice 5.3).
- [ ] Verificar en producción `scanner.yoteinvito.club` (deploy manual).

**Prioridad:** Alta  
**Tipo:** PWA / UX Operativa  
**Pantallas:** Portales productora/gastro/operador; `apps/scanner` (manifest, icons)

---

## 24.3 Scanner con cámara del dispositivo

- [x] Cámara con `html5-qrcode` en `/door` (Slice 5.4).
- [x] Copy de permisos + estado en `QrCameraScanner`.
- [x] Error entendible si el navegador bloquea permisos.
- [x] Botón reintentar cámara.
- [ ] QA manual Android Chrome / iPhone Safari / desktop webcam.
- [x] Alternativa manual — pestaña Manual (Slice 5.5).

**Prioridad:** Alta  
**Tipo:** Scanner / Mobile / QR  
**Pantallas:** `scanner.yoteinvito.club` / `apps/scanner`

---

## 24.4 Selección de evento o descuento dentro del Scanner

- [x] Selector evento/descuento en PWA (`GET /scanner/scan-targets` — Slice 5.6).
- [x] Solo publicaciones del perfil padre (`ScannerAccount`).
- [x] Separación productora (eventos) vs gastro (descuentos).
- [x] Scope API en scan/tickets/gastro (Slice 5.7).
- [x] Última selección en `localStorage`.
- [x] Contexto: título, fecha, estado, conteos tickets/validaciones.

> **Etapa 5 cerrada (código slices 5.1–5.8):** `docs/audits/V3_1_STAGE_5_CLOSING.md`  
> Smokes: `smoke:v31-scanner-accounts`, `smoke:v31-scanner-scope`  
> **Etapa 6 cerrada (código slices 6.1–6.8):** `docs/audits/V3_1_STAGE_6_SCANNER_OFFLINE_CLOSING.md`  
> Smokes: `smoke:v31-ticket-list-pdf`, `smoke:v31-ticket-list-pdf-permissions`  
> Pendiente operativo: QA manual Android/iPhone en puerta; JWT login PWA prod.

**Prioridad:** Alta  
**Tipo:** Scanner / Permisos / Operación  
**Pantallas:** Scanner PWA; API `/scanner/*`

---

## 24.5 Descargar listado de entradas en PDF

- [x] Desde el scanner o panel padre, permitir descargar listado de entradas en PDF.
- [x] El PDF debe incluir:
  - Nombre del evento.
  - Fecha del evento.
  - Comprador.
  - Tipo de entrada.
  - Estado.
  - Código/identificador.
  - Estado de validación.
- [x] Definir si incluye QR o solo datos de control — **sin QR completo**; código corto + sufijo parcial (`docs/audits/V3_1_STAGE_6_TICKET_LIST_PDF_SMOKE.md`).
- [x] Agregar fecha/hora de generación del PDF.
- [x] Agregar aviso de seguridad: «Listado de control interno».
- [x] Validar permisos antes de permitir descarga (rol scanner, productora, admin).

**Prioridad:** Media/Alta  
**Tipo:** Operación / PDF / Control acceso  
**Pantallas:** Scanner PWA; `/producer/events/[id]` (o equivalente panel padre)

---

## 24.6 Scanner offline con listado descargado

- [x] Permitir guardar listado local para operar scanner offline.
- [x] El usuario scanner debe poder descargar/sincronizar listado antes del evento.
- [x] El scanner debe funcionar sin internet usando ese listado local.
- [x] Registrar validaciones offline localmente.
- [x] Cuando vuelva internet, sincronizar validaciones con backend.
- [x] Resolver conflictos:
  - Entrada ya usada online.
  - Entrada validada en otro dispositivo.
  - QR inválido.
  - Listado desactualizado.
- [x] Mostrar estado claro:
  - Online.
  - Offline.
  - Pendiente de sincronizar.
  - Sincronizado.
  - Error de sincronización.
- [x] Definir límite de seguridad para uso offline (ventana temporal, revocación, versión de listado) — `expiresAt` 48h + versión snapshot.
- [x] Agregar advertencia operativa: «Sincronizá antes de abrir puertas».

**Prioridad:** Alta  
**Tipo:** Scanner / Offline-first / Seguridad operativa  
**Pantallas:** Scanner PWA (`apps/scanner`); API sync validaciones

---

# 25. Eventos con múltiples fechas

> **Slice 7.1 (2026-06-10):** Base técnica — modelo `EventOccurrence`, `TicketType.occurrenceId` opcional, schemas shared, helpers compatibilidad, `EventOccurrencesService`, smoke `smoke:v31-event-occurrences`. Doc: `docs/audits/V3_1_STAGE_7_EVENT_OCCURRENCES_MODEL_SMOKE.md`.
>
> **Etapa 7 cerrada (código slices 7.1–7.10):** `docs/audits/V3_1_STAGE_7_MULTI_DATE_EVENTS_CLOSING.md`  
> Smokes: `smoke:v31-event-occurrences`; docs por slice en `docs/audits/V3_1_STAGE_7_*`  
> Pendiente operativo: QA manual puerta multi-fecha; §25.3 cambio de fecha → Etapa 8.

## 25.1 Múltiples fechas por evento

- [x] **Base técnica:** modelo `EventOccurrence` + relación con `Event` y `TicketType` (Slice 7.1).
- [x] Permitir que una productora cargue un evento con múltiples fechas (Slice 7.2 — `EventOccurrencesEditor`, CRUD API).
- [x] Cada fecha debe tener su propia configuración operativa (Slice 7.2 — venue, capacity, status por occurrence).
- [x] Para cada fecha, permitir cargar:
  - [x] Fecha y horario.
  - [x] Lugar si cambia.
  - [x] Capacidad/stock.
  - [x] Tipos de entrada (Slice 7.3).
  - [x] Precio por tipo de entrada.
  - [x] Estado de venta (occurrence status + ticket type sales).
- [x] Definir si las fechas comparten:
  - [x] Misma portada.
  - [x] Misma descripción.
  - [x] Misma ubicación (default evento; override por occurrence).
  - [x] Mismos términos.
- [x] Mostrar en detalle público selector de fecha cuando el evento tenga más de una (Slice 7.5 — `EventDateSelector`).
- [x] Al comprar, el usuario debe elegir fecha antes de seleccionar entradas (Slice 7.5/7.6).
- [x] Evitar mezclar stock entre fechas distintas (Slice 7.3 — ticket types por occurrence).
- [x] En Admin y Productora, mostrar ventas separadas por fecha (Slice 7.4 admin badge + stats API; productora por tab fecha).

**Prioridad:** Alta  
**Tipo:** Modelo de datos / Checkout / Productora  
**Pantallas:** `/producer/events/*`, `/admin/eventos`, `/events/[id]`, checkout

---

## 25.2 Entradas por fecha

- [x] Cada fecha del evento debe tener sus propios tipos de entradas (Slice 7.3).
- [x] Permitir que una fecha tenga entradas diferentes a otra (Slice 7.3).
- [x] Permitir activar/desactivar ventas por fecha (occurrence PAUSED + ticket type status).
- [x] Evitar que una entrada comprada para una fecha valide en otra fecha (Slice 7.8 — `WRONG_OCCURRENCE`).
- [x] En el ticket, mostrar claramente:
  - [x] Evento.
  - [x] Fecha elegida.
  - [x] Horario.
  - [x] Tipo de entrada.
  - [x] QR asociado a esa fecha (ticket ligado a `occurrenceId`; validación scanner por fecha).

**Prioridad:** Alta  
**Tipo:** Tickets / Stock / Checkout  
**Pantallas:** Checkout, `/me/tickets/[ticketId]`, scanner, panel productora

---

## 25.3 Cambio de fecha de entrada por parte del usuario

- [x] Si el evento tiene múltiples fechas, permitir que el usuario solicite o realice cambio de fecha (Etapa 8 slices 8.2–8.5).
- [x] Definir reglas (Slice 8.1 — `docs/tickets/TICKET_DATE_CHANGE_POLICY.md`):
  - Hasta cuántas horas antes se puede cambiar — **24 h** (origen o destino, más restrictivo).
  - Si depende de disponibilidad — **sí**, stock en destino.
  - Si requiere aprobación de productora — **auto** mismo tipo/precio; manual si diferencia.
  - Si puede tener costo adicional — **no en V1** (diferencia → manual/bloqueo).
- [x] Solo permitir cambio si la entrada:
  - Está válida.
  - No fue usada.
  - No fue revocada.
  - No fue transferida en estado pendiente (`TRANSFER_PENDING`).
- [x] Registrar auditoría del cambio (`TICKET_DATE_CHANGE_*`).
- [x] Notificar al usuario por email + in-app (Slice 8.6).
- [x] Actualizar ticket/occurrence; QR `yti:v1:` sin regenerar; scanner por BD (Slice 8.5).
- [x] Mostrar historial del cambio en detalle de orden/ticket (`/me/tickets`, `/me/orders`) (Slice 8.7).

> **Etapa 8 cerrada (código slices 8.1–8.8):** `docs/audits/V3_1_STAGE_8_TICKET_DATE_CHANGE_CLOSING.md`  
> Smoke: `smoke:v31-ticket-date-change`  
> Pendiente: flag manual por evento; cobro diferencia precio; QA puerta manual.

**Prioridad:** Media/Alta  
**Tipo:** Usuario / Tickets / Reglas negocio  
**Pantallas:** `/me/tickets/[ticketId]`; portal productora (aprobación si aplica)

---

# 26. Transferencia de entradas

## 26.1 Confirmar estado actual de transferencia (QA)

> **Etapa 9 cerrada (2026-06-10):** `docs/audits/V3_1_STAGE_9_TICKET_TRANSFER_CLOSING.md`. Smokes `smoke:v31-ticket-transfer-flow` + `smoke:user-portal`. QA manual prod/móvil pendiente operativo.

- [x] Auditar si la transferencia de entradas entre usuarios ya está activa en producción (código en rama activa; verificación prod ops pendiente).
- [x] Confirmar flujo completo:
  - Usuario emisor selecciona ticket.
  - Ingresa email del receptor.
  - Receptor recibe notificación.
  - Receptor acepta o rechaza.
  - Ticket cambia de titular.
  - QR anterior queda invalidado si corresponde.
- [x] Confirmar restricciones (`TicketTransferEligibilityService`):
  - No transferir tickets usados.
  - No transferir tickets revocados.
  - No transferir tickets vencidos.
  - No transferir tickets con disputa o estado inconsistente (cambio fecha pending).
- [x] Revisar emails transaccionales de transferencia (`TICKET_TRANSFER_*` incl. EXPIRED).
- [x] Revisar visualización en `/me` (tickets, actividad, notificaciones).
- [x] Agregar QA manual específico de transferencia (matriz en `V3_1_STAGE_9_TICKET_TRANSFER_CLOSING.md`).

**Prioridad:** Alta  
**Tipo:** QA / Usuario / Tickets  
**Pantallas:** `/me/tickets`, `/me/activity`, scanner; doc `docs/user/TICKET_TRANSFER.md`

---

# 27. Horarios de locales gastronómicos

## 27.1 Mantener carga actual de horarios

- [x] Mantener la forma actual de carga de horarios para no romper el flujo existente.
- [x] Confirmar que los horarios actuales se sigan mostrando correctamente en ficha pública (`/restaurants/[id]`, `/gastronomicos/[id]`).
- [x] Mantener compatibilidad con datos ya cargados en `GastroProfile` / formularios portal y admin.

**Prioridad:** Alta  
**Tipo:** Compatibilidad / Gastro  
**Pantallas:** `/gastro/*`, `/admin/gastronomicos/*`, ficha pública gastro

---

## 27.2 Horarios independientes por día

- [x] Agregar opción avanzada para cargar horarios por día de la semana.
- [x] Permitir configurar independientemente:
  - Lunes, martes, miércoles, jueves, viernes, sábado, domingo.
- [x] Permitir marcar un día como cerrado.
- [x] Permitir más de una franja horaria por día (ej.: 12:00–15:00 y 20:00–00:00).
- [x] Permitir copiar horarios de un día a otros días.
- [x] Mostrar en ficha pública de forma clara.
- [x] Destacar si el local está abierto o cerrado según día/hora actual.
- [x] Definir fallback si el local solo tiene cargado el horario simple actual (mostrar legacy sin romper).

**Prioridad:** Media/Alta  
**Tipo:** Gastro / UX carga / Ficha pública  
**Pantallas:** `GastroLocalForm` (portal + admin); ficha pública gastro

---

# 31. Legales pendientes — Etapa 11 (2026-06-10)

> Cierre: `docs/audits/V3_1_STAGE_11_LEGAL_CLOSING.md`

## 31.1 Auditoría publicación documentos

- [x] Slice 11.1 — tabla estado 10 documentos, slugs, draft/published — `V3_1_STAGE_11_LEGAL_PUBLICATION_AUDIT.md`.
- [x] Script audit: `audit-legal-publication-status.ts`.
- [ ] Publicación manual textos aprobados en `/admin/legales` (cliente/asesor).

## 31.2 `producer_terms`

- [x] Slice 11.2 — slug `productores`, verificación links — `V3_1_STAGE_11_PRODUCER_TERMS_PUBLICATION.md`.
- [ ] Versión **PUBLISHED** en prod/local (pendiente aprobación cliente).

## 31.3 Aceptación `EVENT_PUBLICATION`

- [x] Slice 11.3 — modelo, endpoints, UI aceptación — `V3_1_STAGE_11_EVENT_PUBLICATION_LEGAL_ACCEPTANCE.md`.

## 31.4 Bloqueo publicar evento

- [x] Slice 11.4 — backend + frontend wizard — `V3_1_STAGE_11_EVENT_PUBLICATION_LEGAL_BLOCKING.md`.

## 31.5 QA cierre etapa

- [x] Slice 11.5 — matriz QA + builds — `V3_1_STAGE_11_LEGAL_CLOSING.md`.
- [ ] QA manual browser registro/checkout/portal/productora (matriz §11 doc cierre).

**Prioridad:** Alta  
**Tipo:** Legal / Admin / Productora  
**Bloqueante go-live:** publicar `terms_general`, `privacy_policy`, `purchase_refund_policy`, `producer_terms`.

---

# 28. Fechas visibles en publicaciones

## 28.1 Ocultar fechas de alta en publicaciones públicas

- [x] Revisar dónde se muestran fechas de alta/carga de publicaciones — Etapa 2 slice 2.4.
- [x] Ocultar fecha de creación en publicaciones públicas donde no aporta valor — `shouldShowPublicEventDate`.
- [x] Aplicar a:
  - Gastronomía.
  - Rentals.
  - Excursiones (si no corresponde mostrar fecha de carga).
  - Hoteles (cuando estén activos).
- [x] Evitar textos tipo «Publicado el…» en fichas públicas de contenido (no legal).
- [x] Mantener fecha de alta solo en Admin si sirve para gestión interna.

**Prioridad:** Alta  
**Tipo:** UX pública / Contenido  
**Pantallas:** Fichas públicas gastro/rental/excursión/hotel; cards; modal preview

---

## 28.2 Eventos muestran fecha del evento, no fecha de carga

- [x] En eventos, mostrar únicamente la fecha real del evento (`startAt`) — Etapa 2 slice 2.5.
- [ ] Si el evento tiene múltiples fechas (§25), mostrar:
  - Próxima fecha disponible.
  - Selector/listado de fechas.
- [x] Evitar confusión entre fecha de publicación y fecha del evento — cards/modal/highlights.
- [x] Revisar cards, modal, detalle público, checkout y tickets — fichas evento ya usaban `startAt`; cards corregidas.

**Prioridad:** Alta  
**Tipo:** Eventos / UX pública  
**Pantallas:** `ContentCard`, `/events/[id]`, checkout, `/me/tickets`

---

# 29. Limpieza de perfiles y sidebars

## 29.1 Eliminar flujo viejo de carga/solicitud de perfiles

- [x] Quitar de paneles de usuario la opción de cargar o solicitar perfiles (flujo pre-registro V2) — Etapa 1 slices 1.2.
- [x] Eliminar o desactivar enlace `/profiles` si ya no se usa — redirect por rol (slice 1.1); sin selector UI.
- [x] Confirmar que el registro único por perfil (`/register`) sea el único flujo válido.
- [x] Revisar enlaces internos que todavía apunten a `/profiles` — navbar/footer/login actualizados; `/profiles` solo como router OAuth.
- [x] Revisar navbar, footer, sidebars, CTAs y páginas de onboarding.
- [x] Si se deja redirect, redirigir a una página válida según rol — `rolePortalHome.ts`.
- [x] Evitar que usuarios accedan a pantallas antiguas de solicitud de perfil — `/cuenta/solicitar-*` → redirect.
- [ ] QA manual browser post-deploy (matriz en `V3_1_STAGE_1_PROFILES_NAVIGATION_CLOSING.md` §5).

**Prioridad:** Alta  
**Tipo:** Limpieza UX / Onboarding / Rutas  
**Pantallas:** `/profiles`, `/me/account`, navbar (`userNavConfig`), portales

---

## 29.2 Sidebar único según rol/perfil

- [x] Cada usuario debe ver únicamente el sidebar correspondiente a su rol/perfil activo — `PortalLayoutShell` + `portalNavConfig` (sin cambio estructural; validado Etapa 1).
- [x] Usuario estándar: solo sidebar de usuario (`/me/*`).
- [x] Productora: solo sidebar de productora (`/producer/*`).
- [x] Gastro: solo sidebar de gastro (`/gastro/*`).
- [x] Hotel: solo sidebar de hotel (`/hotel/*`).
- [x] Referido: solo sidebar de referido (`/referrer`).
- [x] Scanner: solo acceso scanner (sin panel completo) — redirect PWA en `rolePortalHome.ts`.
- [x] Admin: solo sidebar de administración (`/admin/*`); no mostrar sidebar de usuario estándar.
- [x] Evitar mezcla de opciones entre portales (`portalNavConfig`, `PortalLayoutShell`).
- [x] Confirmar comportamiento post-login según rol — slice 1.4.
- [x] Confirmar redirects por rol — `ProfileProtectedLayout` sin `/profiles`.
- [x] Revisar usuarios con múltiples roles si existieran y definir prioridad (excepción: cuenta maestro documentada) — ver `V3_1_STAGE_1_PROFILES_NAVIGATION_CLOSING.md` §6–7.
- [ ] QA manual browser por rol (§5 doc cierre).

**Prioridad:** Alta  
**Tipo:** Roles / UX / Seguridad navegación  
**Pantallas:** Todos los portales; `lib/navigation/portalNavConfig.ts`; post-login redirects

---

## 29.3 Usuario ADMIN deja de ver portal estándar

- [x] Cuando un usuario pasa a ser ADMIN, debe ver únicamente opciones de Admin — menú navbar reducido (slice 1.5).
- [x] No debe mostrarse sidebar estándar de usuario en sesión ADMIN — `/me/layout` redirect.
- [x] Revisar accesos a:
  - `/me` — redirect `/admin` (no maestro).
  - `/profiles` — redirect `/admin`.
  - Menú usuario (navbar) — Panel admin.
  - Sidebar mobile — vía `getUserMenuLoggedInItems`.
- [x] Definir si Admin puede acceder manualmente a `/me` o si se redirige a `/admin` — **redirect** salvo maestro.
- [x] Recomendación V3.1: redirigir Admin a `/admin` y ocultar navegación estándar salvo acciones estrictamente necesarias.
- [ ] QA manual con cuenta ADMIN real (no maestro).

**Prioridad:** Alta  
**Tipo:** Admin / Roles / UX  
**Pantallas:** `/admin`, `/me`, navbar, `ProfileProtectedLayout`

---

# 30. Orden sugerido de slices (tanda V3.1 — cliente)

> Los slices 1–14 y hotfixes §20–22 corresponden a la tanda inicial V3.1. La tabla siguiente ordena la **nueva tanda** solicitada por cliente para implementación futura.

| Slice sugerido | Bloque |
| -------------- | ------------------------------------------------ |
| V3.1 Slice 14  | Limpieza `/profiles` + sidebars por rol |
| V3.1 Slice 15  | Etiquetas Admin + etiquetas en publicaciones — **Etapa 4 cerrada** |
| V3.1 Slice 16  | Scanner: usuarios scanner + link PWA — **Etapa 5.1–5.3 cerrada** |
| V3.1 Slice 17  | Scanner cámara + selección evento/descuento — **Etapa 5.4–5.7 cerrada** |
| V3.1 Slice 18  | Scanner offline + PDF listado entradas — **cerrado §24.5–24.6** (`V3_1_STAGE_6_SCANNER_OFFLINE_CLOSING.md`) |
| V3.1 Slice 19  | Múltiples fechas por evento + entradas por fecha |
| V3.1 Slice 20  | Cambio de fecha de entrada |
| V3.1 Slice 21  | Horarios gastronómicos por día |
| V3.1 Slice 22  | Limpieza fechas visibles en publicaciones |
| V3.1 Slice 23  | QA transferencia de entradas |

**Nota:** El Slice 14 de QA pre-deploy (§19) ya está cerrado técnicamente. Los slices 14–23 de esta tabla son una **nueva numeración de producto** para la segunda tanda V3.1; al implementar, documentar en `docs/audits/` con sufijo coherente (ej. `V3_1_SLICE_14_PROFILES_SIDEBARS_SMOKE.md`).

**Recomendación — primer slice a implementar:** **V3.1 Slice 14 — Limpieza `/profiles` + sidebars por rol** (§29). Reduce confusión en paneles, corrige navegación ADMIN, elimina flujo viejo de solicitud/carga de perfiles; alto impacto UX y seguridad de navegación; no depende de cambios grandes de modelo (múltiples fechas, scanner offline, etiquetas).

