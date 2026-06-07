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
- [ ] Permitir mover fotos arriba/abajo o drag & drop — drag & drop fuera de alcance Slice 5.
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

- [ ] Revisar estética de botones de filtros.
- [ ] Evaluar diseño tipo carrusel horizontal.
- [ ] Tomar como referencia visual ideas de Central Ticket, sin copiar identidad.
- [ ] Reducir peso visual de filtros en mobile.
- [ ] Mantener accesibilidad y claridad.

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

- [ ] Agregar ubicación/mapa en carga de excursiones.
- [ ] Mostrar mapa en detalle público de excursión cuando exista ubicación.
- [ ] Permitir cargar punto de salida, ubicación principal o recorrido aproximado.
- [ ] Definir campos mínimos:
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

- [ ] Evaluar soporte para enlaces dentro de textos largos.
- [ ] Permitir que ciertas palabras lleven a páginas informativas externas o internas.
- [ ] Alternativa recomendada:
  - Campo de “links relacionados”.
  - Editor enriquecido controlado.
  - Markdown limitado.
- [ ] Evitar HTML libre inseguro.
- [ ] Definir si se habilita en V3.1 o queda para V3.2.

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
- [ ] Evaluar si cards públicas deben mostrar horario o solo fecha/ciudad — pendiente; cards siguen sin horario estructurado.

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

- [ ] Revisar texto y función del botón “Lo espero”.
- [ ] Definir si representa:
  - Me interesa.
  - Quiero recibir alerta.
  - Avisarme cuando haya novedades.
  - Lista de espera.
- [ ] Cambiar copy si genera confusión.
- [ ] Posibles alternativas:
  - “Me interesa”.
  - “Avisarme”.
  - “Quiero ir”.
  - “Esperar novedades”.
- [ ] Agregar tooltip o microcopy si se mantiene.

**Prioridad:** Media  
**Tipo:** UX / Producto

---

# 9. Buscador y navegación

## 9.1 Buscador “Explorá Bariloche”

- [ ] Revisar experiencia actual del buscador grande.
- [ ] Evaluar quitar modal/buscador gigante.
- [ ] Propuesta alternativa:
  - Buscador simple en barra superior.
  - Input compacto por palabra clave.
  - Búsqueda desde navbar o header.
  - Filtros avanzados dentro de páginas de categoría.
- [ ] Definir comportamiento en mobile.
- [ ] Revisar impacto en home y categorías.

**Prioridad:** Media/Alta  
**Tipo:** UX / Navegación

---

# 10. SEO / Google / Marca

## 10.1 Logo en resultados de Google

- [ ] Revisar favicon y metadata del sitio.
- [ ] Confirmar que Google pueda detectar logo/marca.
- [ ] Agregar o revisar:
  - Favicon.
  - Apple touch icon.
  - Manifest.
  - Open Graph image.
  - Schema.org Organization.
  - Metadata global.
- [ ] Verificar indexación con Google Search Console.

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
- [ ] Hoteles — fuera Slice 9 (Próximamente).
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

## 12.2 Términos y condiciones para eventos (Slice 12 — Caso B)

- [x] Aviso informativo en paso 3 wizard (`ProducerEventPublicationLegalNotice`).
- [x] Link `/legal/productores`.
- [ ] **Bloqueo duro pendiente** — `producer_terms` no publicado oficialmente (Caso A).
- [ ] Registrar aceptación por evento (`EVENT_PUBLICATION` + `eventId`) — requiere migración.
- [ ] Impedir publicación si no acepta — pendiente Caso A.
- [x] Doc `V3_1_SLICE_12_EVENT_PUBLICATION_LEGAL_SMOKE.md`.

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
- [ ] Rediseño completo por vertical (§14.2).
- [ ] Mantener identidad de Yo Te Invito:
  - Fondo dark.
  - Verde como acento.
  - Estética premium/turística.
  - No copiar colores ni marca de terceros.
- [ ] Probar una card más editorial con:
  - Imagen protagonista grande.
  - Fecha destacada en bloque lateral o inferior.
  - Título con mayor jerarquía.
  - Ubicación clara.
  - Badge/categoría menos invasiva.
  - Acción secundaria tipo guardar/favorito.
- [ ] Aplicar primero a eventos.
- [ ] Evaluar adaptación a excursiones, gastronomía y rentals.
- [ ] Mantener compatibilidad con carruseles horizontales mobile.
- [ ] Evitar que la nueva card rompa home, categoría, explore y carruseles cruzados.

**Prioridad:** Media/Alta  
**Tipo:** Visual / UX / Discovery  
**Pantallas:** Home, Categorías, Explore, carruseles públicos

---

## 14.2 Variantes de card por vertical

- [ ] Eventos: fecha + lugar + precio desde + productor.
- [ ] Excursiones: subcategoría + ciudad + horario/duración si existe.
- [ ] Gastronomía: tipo de local + ciudad + rating.
- [ ] Rentals: local + subcategoría + CTA disponibilidad.
- [ ] Mantener una base visual común, pero metadata específica por categoría.

**Prioridad:** Media  
**Tipo:** Visual / Arquitectura UI

---

# 15. Reviews / valoraciones

## 15.1 Cambiar escala visible de valoraciones a 5/5 (Slice 13)

- [x] Helper `ratingDisplay.ts` — conversión visual 10→5.
- [x] UI pública: cards, fichas, reviews summary/card, perfiles comentarista.
- [ ] Definir si el cambio será:
  - Solo visual, convirtiendo internamente 10 → 5.
  - O cambio real de modelo/validación a escala 1–5.
- [ ] Recomendación inicial: mantener compatibilidad interna y migrar visualmente primero.
- [ ] Mostrar estrellas de 1 a 5 en UI pública.
- [ ] Ajustar formularios de carga de reseñas para que el usuario valore con 5 estrellas.
- [ ] Ajustar filtros públicos de reviews si actualmente filtran de 1 a 10.
- [ ] Revisar promedios, badges y textos:
  - “4.7/5”.
  - “5 estrellas”.
  - “Valoración promedio”.
- [ ] Revisar paneles de:
  - Productora.
  - Gastro.
  - Hotel.
  - Admin reviews.
  - Perfil público de comentarista.
- [ ] Revisar si las valoraciones B2B productor ↔ referido también deben pasar a escala 5/5.

**Prioridad:** Media/Alta  
**Tipo:** UX / Reviews / Modelo visual

---

## 15.2 Estrategia recomendada para ratings

- [x] Conversión visual 10 → 5 en público (Slice 13).
- [x] Sin migrar DB.
- [x] Helper centralizado `formatPublicRatingLabel`.
- [ ] Evitar duplicar lógica en componentes.
- [ ] Luego evaluar migración real a 1–5 si el cliente confirma.

**Prioridad:** Media  
**Tipo:** Técnica / Producto

---

# 16. Revisión por pantalla

## 16.1 Home pública

- [ ] Fondo dark global.
- [ ] Revisar menú de categorías superior.
- [ ] Evitar duplicación con cards inferiores.
- [ ] Evaluar buscador compacto en navbar/header.
- [ ] Revisar banners desde Admin.
- [ ] Probar nuevas cards editoriales.

---

## 16.2 Categoría Eventos

- [ ] Calendario no debe tapar filtros.
- [ ] Filtros más sutiles.
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
- [ ] Cards sin etiqueta genérica “Excursión”.
- [ ] Detalle con mejor diseño visual.
- [ ] Probar card tipo poster adaptada a excursiones.

---

## 16.4 Gastronomía / Restaurants

- [ ] Agregar links externos/redes.
- [ ] Revisar si aplica maps.
- [ ] Revisar resumen ampliado.
- [ ] Revisar etiquetas/badges.
- [ ] Confirmar diseño de detalle público.
- [ ] Probar rating visible en escala 5/5.

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
- [ ] Botones/filtros más sutiles estilo carrusel.
- [ ] Mejorar buscador “Explorá Bariloche”.
- [ ] Revisar “Lo espero”.
- [x] Rediseñar cards públicas estilo poster/editorial — fase 1 (Slice 13); §14.2 completo pendiente.
- [x] Probar nueva card primero en eventos — fase 1 global `ContentCard`.
- [ ] Adaptar variante de card para excursiones, gastro y rentals (fase 2).

---

## 17.5 Bloque V3.1-E — Reviews / reputación

- [x] Auditar escala actual de reviews 1–10 — Slice 13; interno sin cambio.
- [x] Definir estrategia 5/5: visual primero (Slice 13).
- [x] Ajustar componentes públicos de estrellas — Slice 13.
- [ ] Ajustar formularios de reseña (escala 5 visual).
- [ ] Ajustar filtros de reviews.
- [ ] Ajustar reportes admin (siguen 1–10).
- [ ] Revisar impacto en ranking, promedio y reputación.
- [ ] JSON-LD `bestRating: 5`.

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
- [ ] Drag & drop galería.
- [ ] Hoteles archivar.
- [ ] Links embebidos en descripciones (§5.2).
- [ ] FAQs excursiones.

**Recomendación Slice 14:** listo para deploy técnico; QA manual browser pendiente para cierre cliente 100%.

