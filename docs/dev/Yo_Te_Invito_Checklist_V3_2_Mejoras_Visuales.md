# Yo Te Invito — Checklist V3.2

## Mejoras visuales, cards, búsqueda, mapas y acceso por categoría

> Objetivo: implementar la nueva tanda de mejoras solicitadas por el cliente mediante slices pequeños, auditables y con bajo riesgo de regresión.
>
> La arquitectura actual debe mantenerse:
>
> - Frontend: componentes UI → hooks TanStack Query → repositorios → `ApiRepository` → API.
> - Backend: controller → validación Zod → service → Prisma → PostgreSQL.
> - Sin `fetch` directo en componentes.
> - Sin lógica de negocio dentro de controllers.
> - Sin duplicar schemas fuera de `packages/shared`.
> - Sin mega refactors ni cambios globales que afecten verticales no relacionadas.
> - Mantener estética dark premium, fondo negro, blanco y verde de marca.

---

# 0. Reglas generales de implementación

- [ ] Trabajar sobre la rama activa indicada por `AI_ENTRYPOINT.md`.
- [ ] No tocar `main` salvo instrucción explícita.
- [ ] No modificar pagos, checkout, ticketera ni scanner salvo dependencia real de este bloque.
- [ ] Mantener `TICKETING_CREATION_ENABLED` y la estrategia actual de ticketera.
- [ ] No eliminar Eventos ni Gastronomía del modelo o la base de datos.
- [ ] No bloquear el acceso del usuario ADMIN a las categorías restringidas.
- [ ] Preservar tenant isolation.
- [ ] Priorizar mobile first.
- [ ] Mantener accesibilidad: teclado, foco, `aria-*`, Escape y cierre al tocar fuera.
- [ ] Evitar componentes demasiado grandes; crear variantes o componentes específicos cuando corresponda.
- [ ] Actualizar contextos, auditorías y checklist al cerrar cada slice.

---

# 1. Slice 0 — Auditoría técnica y matriz visual

> **Estado:** COMPLETADO — 2026-07-31  
> **Auditoría:** [`docs/audits/V3_2_VISUAL_DISCOVERY_AUDIT.md`](../audits/V3_2_VISUAL_DISCOVERY_AUDIT.md)  
> **Rama:** `feat/v1-s03-api-foundation`

## Resumen de cierre

Auditoría técnica/visual sin cambios funcionales. Hallazgos clave: autoplay solo en `CategoryHeroBanner` (7000 ms; Home sin timer); editoriales + publicaciones en playlist compartida; reviews persistidos 1–10 con UI /5; search solo por `title`; módulos Admin de pendientes **no** son duplicados; badge `Gratis` hardcodeado; mini-preview gastro vía `gastroPromoImageUrl`.

## Riesgos principales

- Alto: cards globales, bloqueo Event/Gastro solo FE, borrar cola Admin de aprobación.
- Medio: sugerencias search, banner gastro+descuentos, combobox ciudad, Maps en listados.
- Bajo: título Subcategorías, intervalo autoplay, color footer.

## Orden de implementación (ajuste por evidencia)

Mantener Slice 1 después de 0. **Replantear Slice 8** (Admin) antes de asumir borrado: la cola de aprobación y “pendientes operativos” tienen datos distintos. Slice 10 (Próximamente) al final, tras cards y search. Detalle en auditoría §17.

## Objetivo

Identificar los componentes, contratos y endpoints realmente utilizados antes de modificar banners, cards, previews, mapas, búsqueda y valoraciones.

## Auditoría frontend

- [x] Identificar el componente de banner usado en Home.
- [x] Identificar el componente de banner usado en páginas de categoría.
- [x] Detectar dónde se configura el tiempo de autoplay.
- [x] Identificar el componente que muestra el título `Subcategorías`.
- [x] Auditar `ContentCard`, `EventCard` y cualquier card específica por vertical.
- [x] Identificar variantes existentes para:
  - [x] Eventos.
  - [x] Gastronomía.
  - [x] Descuentos gastronómicos.
  - [x] Rentals.
  - [x] Excursiones.
  - [x] Hoteles.
- [x] Identificar el hover actual y el modal de preview.
- [x] Detectar dónde se muestra localidad, ciudad, fechas, precio, badges y valoración.
- [x] Identificar la mini-preview de descuentos en cards de locales gastronómicos.
- [x] Identificar el badge `Gratis` en descuentos.
- [x] Auditar el selector actual de provincia/ciudad en todos los formularios.
- [x] Identificar el buscador actual de `/explore` y el contrato usado por `EventsRepo.search`.
- [x] Identificar los módulos duplicados del dashboard Admin.
- [x] Auditar componentes públicos de reviews y formulario de valoración.
- [x] Identificar el token/color usado por el footer y compararlo con el verde global.
- [x] Identificar todas las rutas y accesos públicos de Eventos y Gastronomía.

## Auditoría backend y contratos

- [x] Confirmar escala persistida de reviews:
  - [x] 1–5 (legacy `score` + UI visual).
  - [x] 1–10 (`overallRating` / aspectos V2).
  - [x] conversión parcial entre ambos sistemas (`ratingDisplay.ts`).
- [x] Confirmar endpoints públicos de resumen y listado de reviews.
- [x] Confirmar si la búsqueda actual soporta consultas parciales.
- [x] Confirmar si hace falta endpoint específico de sugerencias.
- [x] Confirmar los campos disponibles para mini mapa:
  - [x] latitud (`geoLat`).
  - [x] longitud (`geoLng`).
  - [x] dirección.
  - [x] ciudad.
  - [x] provincia.
  - [x] Google Place ID, si existe.
- [x] Confirmar cómo se identifican roles ADMIN en frontend y API pública.
- [x] Confirmar todas las rutas directas que deben bloquearse para Eventos y Gastronomía.

## Entregables

- [x] Crear `docs/audits/V3_2_VISUAL_DISCOVERY_AUDIT.md`.
- [x] Documentar componentes compartidos y específicos.
- [x] Documentar contratos que pueden reutilizarse.
- [x] Listar archivos candidatos a modificación por slice.
- [x] Registrar riesgos de regresión.
- [x] No modificar comportamiento funcional en este slice.

## Criterios de aceptación

- [x] Existe una matriz clara de card compacta / hover / modal por vertical.
- [x] Se conoce la escala real de reviews.
- [x] Se conoce el flujo real del buscador.
- [x] Se conocen todas las rutas públicas de Eventos y Gastro.
- [x] Se evita proponer cambios globales sin conocer su impacto.

## Smoke

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```

---

# 2. Slice 1 — Banners, subcategorías y color del footer

> **Estado:** COMPLETADO — 2026-07-31
> **Cierre:** [`docs/audits/V3_2_SLICE_1_BANNERS_FOOTER_CLOSING.md`](../audits/V3_2_SLICE_1_BANNERS_FOOTER_CLOSING.md)

## 2.1 Banners de categoría

- [x] Aumentar el tamaño visual de los banners de categoría.
- [x] Tomar como referencia las proporciones y protagonismo del banner de Home.
- [x] Mantener responsive mobile, tablet y desktop.
- [x] Evitar recortes incorrectos de imagen.
- [x] Mantener overlays y legibilidad del texto.
- [x] No reemplazar publicaciones reales con banners editoriales.
- [x] Mantener banners como contenido complementario.

## 2.2 Velocidad del autoplay

- [x] Identificar el intervalo actual.
- [x] Reducirlo aproximadamente a la mitad.
- [x] Centralizar el valor en una constante o configuración reutilizable.
- [x] No duplicar timers por componente.
- [x] Pausar o controlar autoplay durante interacción manual si el componente actual lo soporta.
- [x] Evitar cambios bruscos o saltos de layout.

## 2.3 Encabezado de subcategorías

- [x] Eliminar el título visible `Subcategorías` en páginas de categoría.
- [x] Mantener chips/carrusel y su semántica accesible.
- [x] Mantener espaciado correcto tras quitar el título.
- [x] Confirmar que no desaparezca ningún filtro funcional.

## 2.4 Verde del footer

- [x] Reemplazar el verde claro del footer por el token de verde principal de la web.
- [x] Evitar colores hex duplicados si existe un token central.
- [x] Revisar bordes, íconos, links, hover y focus del footer.
- [x] Confirmar contraste sobre fondo negro.

## Criterios de aceptación

- [x] Los banners de categoría tienen protagonismo equivalente a Home.
- [x] El autoplay se percibe aproximadamente dos veces más rápido.
- [x] No aparece el título `Subcategorías`.
- [x] El footer utiliza el mismo verde que botones, chips y acentos principales.
- [x] No se pierden publicaciones al existir banners editoriales.

## Smoke manual

- [ ] `/home` desktop y mobile.
- [ ] `/categoria/event` como ADMIN.
- [ ] `/categoria/gastro` como ADMIN.
- [ ] `/categoria/rental`.
- [ ] `/categoria/excursion`.
- [ ] Footer en Home, Explore, categorías y fichas públicas.
- [ ] Confirmar ausencia de scroll horizontal.

---

# 3. Slice 2 — Cards públicas generales

> **Estado:** COMPLETADO — 2026-07-31
> **Cierre:** [`docs/audits/V3_2_SLICE_2_CONTENT_CARDS_CLOSING.md`](../audits/V3_2_SLICE_2_CONTENT_CARDS_CLOSING.md)
>
> Mini-preview gastro (`gastroPromo*`) eliminada en Slice 3 (solo render).

## Objetivo

Simplificar la card compacta y separar correctamente la información de miniatura, hover y modal.

## 3.1 Vista compacta

Mostrar solamente:

- [x] Nombre o título.
- [x] Resumen público.
- [x] Etiquetas relevantes.
- [x] Promedio general de valoración.

Eliminar de la vista compacta general:

- [x] Localidad o ciudad.
- [x] Datos repetidos.
- [x] Descripción extensa.
- [x] Metadatos que ya aparecen en hover/modal.
- [x] Fechas cuando la vertical no las necesite para comprender la oferta.

## 3.2 Hover

- [x] Mostrar un fragmento breve de descripción.
- [x] Mantener límite de líneas.
- [x] Evitar scroll interno.
- [x] Mostrar solo metadatos secundarios relevantes para la vertical.
- [x] Mantener interacción fluida sin cambios bruscos de altura.
- [x] En dispositivos touch, no depender exclusivamente de hover.

## 3.3 Modal de preview

- [x] Mostrar descripción ampliada, pero no necesariamente completa.
- [x] Mostrar fechas para Eventos.
- [x] Mostrar fechas, rango o recurrencia para descuentos. *(ficha `/descuentos/[id]` — Slice 3)*
- [x] Mantener CTA hacia la ficha completa.
- [x] Cerrar con Escape.
- [x] Cerrar al tocar fuera.
- [x] Gestionar correctamente el foco.
- [x] Evitar duplicar la ficha completa dentro del modal.

## 3.4 Arquitectura recomendada

- [x] Crear una matriz de metadatos por categoría.
- [x] Usar variantes específicas en lugar de condicionales desordenados.
- [x] Mantener helpers puros para construir badges y metadata.
- [x] No alterar globalmente cards de Rentals o Excursiones si necesitan reglas propias.

## Criterios de aceptación

- [x] La localidad ya no aparece en la miniatura.
- [x] La miniatura no repite datos.
- [x] Hover y modal agregan información progresivamente.
- [x] Las cards mantienen altura y alineación coherentes.
- [x] Mobile sigue siendo usable sin hover.
- [x] Los enlaces llevan a la ruta correcta por vertical.

## Smoke manual

- [ ] Cards en Home.
- [ ] Cards en Explore.
- [ ] Cards en categoría Eventos.
- [ ] Cards en categoría Gastro.
- [ ] Cards en categoría Rentals.
- [ ] Cards en categoría Excursiones.
- [ ] Modal con teclado.
- [ ] Modal en mobile.

---

# 4. Slice 3 — Cards específicas de Gastronomía

> **Estado:** COMPLETADO — 2026-07-31
> **Cierre:** [`docs/audits/V3_2_SLICE_3_GASTRO_CARDS_CLOSING.md`](../audits/V3_2_SLICE_3_GASTRO_CARDS_CLOSING.md)

## 4.1 Cards de descuentos gastronómicos

### Vista compacta

Mostrar:

- [x] Título del descuento.
- [x] Nombre del local.
- [x] Fecha, rango o día semanal.
- [x] Texto o valor del descuento/beneficio.

Cambios:

- [x] No agregar `%` automáticamente.
- [x] Soportar beneficios no porcentuales.
- [x] Eliminar el badge verde `Gratis`.
- [x] No mostrar metadata heredada de eventos.
- [x] Mantener estado activo/vigente solo cuando aporte valor.

### Hover

- [x] Mostrar fragmento breve del detalle.
- [x] Mostrar condiciones esenciales si existen.
- [x] Evitar texto excesivo.

### Modal

- [x] Mostrar descripción ampliada.
- [x] Mostrar vigencia completa.
- [x] Diferenciar:
  - [x] rango de fechas;
  - [x] fecha única legacy;
  - [x] recurrencia semanal.
- [x] Mostrar local asociado.
- [x] Mantener CTA correspondiente.

## 4.2 Cards de locales gastronómicos

- [x] Eliminar la mini-preview de descuentos de la esquina superior derecha.
- [x] Mantener identidad del local como foco principal.
- [x] Mostrar nombre, resumen, etiquetas y valoración.
- [x] No mostrar contadores o promos superpuestas salvo requerimiento explícito.
- [x] Confirmar que la eliminación sea solo visual y no borre datos de descuentos.

## Criterios de aceptación

- [x] Un descuento fijo o textual no aparece con `%` incorrecto.
- [x] El badge `Gratis` no aparece.
- [x] La card del local no muestra miniaturas de descuentos.
- [x] Se distinguen correctamente fecha/rango y recurrencia semanal.
- [x] No se altera la emisión, claim o validación QR.

## Smoke manual

- [ ] Descuento por rango actual.
- [ ] Descuento rango futuro.
- [ ] Descuento recurrente del día actual.
- [ ] Descuento recurrente de otro día.
- [ ] Descuento inactivo/cancelado.
- [ ] Local con descuentos.
- [ ] Local sin descuentos.
- [ ] Mobile y desktop.

---

# 5. Slice 4 — Selector de ciudad con búsqueda

> **Estado:** COMPLETADO — 2026-07-31
> **Cierre:** [`docs/audits/V3_2_SLICE_4_CITY_COMBOBOX_CLOSING.md`](../audits/V3_2_SLICE_4_CITY_COMBOBOX_CLOSING.md)

## Objetivo

Permitir escribir para filtrar ciudades, pero persistir únicamente una opción válida del catálogo.

## Requisitos UX

- [x] Convertir el select en combobox buscable.
- [x] Permitir escribir texto para filtrar opciones.
- [x] No guardar el texto escrito si no coincide con una opción seleccionada.
- [x] Mostrar claramente el estado sin resultados.
- [x] Permitir limpiar selección.
- [x] Mantener dependencia provincia → ciudad.
- [x] Resetear ciudad cuando cambia la provincia si deja de ser válida.
- [x] Mantener navegación por teclado.
- [x] Mantener labels legibles y sin duplicados.
- [x] No introducir diferencias por mayúsculas, tildes o espacios.

## Formularios a revisar

- [x] Registro comprador.
- [x] Registro productora. *(N/A — sin campo ciudad)*
- [x] Registro gastronómico.
- [x] Registro hotel.
- [x] Admin Eventos.
- [x] Portal Productora.
- [x] Admin Gastro.
- [x] Portal Gastro.
- [x] Admin Rentals.
- [x] Admin Excursiones.
- [x] Perfil/cuenta donde exista ciudad.

## Arquitectura

- [x] Reutilizar `useGeoProvinces` y `useGeoLocalities`.
- [x] Crear un componente reutilizable si todavía no existe.
- [x] No duplicar catálogos dentro de componentes.
- [x] Mantener fallback manual únicamente en los flujos donde ya esté permitido.
- [x] Validar payload con schemas compartidos. *(sin cambio de schemas; labels existentes)*

## Criterios de aceptación

- [x] Se puede buscar `Bariloche` escribiendo parte del nombre.
- [x] Solo se persiste una localidad seleccionada.
- [x] No se puede guardar una ciudad inventada.
- [x] No aparecen duplicados normalizados.
- [x] Funciona con teclado y mobile.

## Smoke manual

- [ ] Buscar por inicio del nombre.
- [ ] Buscar sin tildes.
- [ ] Buscar con mayúsculas/minúsculas.
- [ ] Escribir valor inexistente e intentar guardar.
- [ ] Cambiar provincia después de seleccionar ciudad.
- [ ] Verificar payload enviado a API.

---

# 6. Slice 5 — Búsqueda predictiva en Explore

## Objetivo

Mostrar resultados sugeridos mientras el usuario escribe, antes de ejecutar la búsqueda completa.

## Comportamiento

- [ ] Activar sugerencias a partir de una cantidad mínima de caracteres.
- [ ] Aplicar debounce.
- [ ] Cancelar o ignorar respuestas antiguas.
- [ ] No disparar una consulta por cada tecla sin control.
- [ ] Mostrar estado cargando discreto.
- [ ] Mostrar estado sin coincidencias.
- [ ] Permitir selección con mouse/touch.
- [ ] Permitir navegación con flechas y Enter.
- [ ] Cerrar con Escape.
- [ ] Cerrar al tocar fuera.
- [ ] Mantener la búsqueda final en URL.

## Contenido sugerido

Evaluar coincidencias por:

- [ ] Título o nombre.
- [ ] Local/productora/operador.
- [ ] Etiquetas.
- [ ] Subcategoría.
- [ ] Categoría.

## API y repositorios

- [ ] Reutilizar endpoint actual si soporta búsqueda parcial eficiente.
- [ ] Si no alcanza, crear endpoint público liviano de sugerencias.
- [ ] Agregar schema compartido para query y response si se crea endpoint.
- [ ] Agregar método al repositorio correspondiente.
- [ ] Agregar query key específica.
- [ ] Limitar cantidad de resultados sugeridos.
- [ ] Aplicar visibilidad pública vigente.
- [ ] Respetar categorías temporalmente bloqueadas.

## Criterios de aceptación

- [ ] Las sugerencias aparecen antes de presionar Buscar.
- [ ] No hay parpadeo por respuestas fuera de orden.
- [ ] Seleccionar una sugerencia abre la ficha correcta o aplica la búsqueda acordada.
- [ ] Enter ejecuta búsqueda completa.
- [ ] La URL sigue representando el estado final de búsqueda.
- [ ] No se exponen contenidos no públicos.

## Smoke

- [ ] Consulta corta.
- [ ] Consulta sin resultados.
- [ ] Escritura rápida y borrado.
- [ ] Navegación con teclado.
- [ ] Mobile.
- [ ] Evento vencido no sugerido.
- [ ] Gastro/Eventos bloqueados no sugeridos para público.

---

# 7. Slice 6 — Valoraciones resumidas y caritas

## 7.1 Vista pública resumida

- [ ] Mostrar por defecto solo promedio general.
- [ ] Mostrar cantidad total de valoraciones.
- [ ] Mostrar una carita representativa del promedio.
- [ ] Agregar acción `Ver más`.
- [ ] Expandir distribución, comentarios y contenido secundario al pulsar.
- [ ] Evitar cargar visualmente toda la sección de entrada.

## 7.2 Formulario de valoración

- [ ] Mostrar acción `Valorar`.
- [ ] Expandir formulario al pulsar.
- [ ] Mantener formulario colapsado por defecto.
- [ ] Mantener validaciones, autenticación y permisos existentes.
- [ ] Confirmar envío y estado de éxito/error.

## 7.3 Escala visual con caritas

- [ ] Nivel 1: carita muy insatisfecha, roja.
- [ ] Nivel 2: carita insatisfecha.
- [ ] Nivel 3: carita neutral.
- [ ] Nivel 4: carita conforme.
- [ ] Nivel 5: carita sonriente, verde de marca.
- [ ] Agregar labels accesibles, no depender solo del color.
- [ ] Mantener foco visible y selección por teclado.
- [ ] Mostrar estado seleccionado claramente.

## 7.4 Compatibilidad de escala

### Si backend ya usa 1–5

- [ ] Reemplazar presentación de estrellas por caritas.
- [ ] Mantener contratos y persistencia.

### Si backend todavía usa 1–10

- [ ] Documentar conversión visual 1–10 → 1–5.
- [ ] Mantener conversión centralizada.
- [ ] No redondear de manera diferente entre cards, resumen y formulario.
- [ ] Decidir si formulario envía valores equivalentes 2/4/6/8/10 o si se migra el contrato.
- [ ] No migrar base de datos sin aprobación explícita.

## Criterios de aceptación

- [ ] La sección ocupa poco espacio por defecto.
- [ ] `Ver más` expande correctamente.
- [ ] `Valorar` expande el formulario.
- [ ] No quedan estrellas visibles en el flujo público acordado.
- [ ] La escala es consistente en card, resumen, modal y formulario.
- [ ] Los datos históricos mantienen significado.

## Smoke manual

- [ ] Entidad sin reviews.
- [ ] Entidad con una review.
- [ ] Entidad con muchas reviews.
- [ ] Promedios bajos, medios y altos.
- [ ] Usuario no autenticado intenta valorar.
- [ ] Usuario autenticado valora.
- [ ] Mobile y teclado.

---

# 8. Slice 7 — Mini mapa en publicaciones

## Objetivo

Agregar una previsualización geográfica compacta sin cargar mapas interactivos pesados en todos los carruseles.

## Alcance recomendado

- [ ] Mostrar mini mapa en ficha pública o modal de preview.
- [ ] No crear una instancia interactiva de Google Maps por cada card en carrusel.
- [ ] Cargar mapa interactivo solo al abrir o al entrar en viewport, si corresponde.
- [ ] Mostrar fallback textual si faltan coordenadas.
- [ ] Ocultar bloque si no existe información geográfica suficiente.

## Verticales

- [ ] Eventos.
- [ ] Gastronomía.
- [ ] Rentals.
- [ ] Excursiones.
- [ ] Hoteles, solo si la ficha actual lo permite.

## Contenido

- [ ] Preview visual del mapa.
- [ ] Dirección resumida.
- [ ] Ciudad/provincia si aporta contexto.
- [ ] Acción `Ver ubicación`.
- [ ] Modal o enlace hacia mapa interactivo existente.

## Rendimiento y seguridad

- [ ] Evitar multiplicar consumo de API de Maps.
- [ ] Reutilizar loader actual.
- [ ] No exponer API keys no autorizadas.
- [ ] Evitar layout shift.
- [ ] Definir placeholder de carga.
- [ ] Confirmar funcionamiento con restricciones de Google Cloud.

## Criterios de aceptación

- [ ] Una publicación con coordenadas muestra preview.
- [ ] Una publicación sin coordenadas no muestra un mapa roto.
- [ ] No se cargan decenas de mapas interactivos en Home/Explore.
- [ ] La acción abre la ubicación correcta.
- [ ] Mobile mantiene buena altura y lectura.

## Smoke manual

- [ ] Publicación con address + lat/lng.
- [ ] Publicación solo con address.
- [ ] Publicación sin ubicación.
- [ ] Ubicación de producto con fallback al local/operador.
- [ ] Google Maps bloqueado o sin key.

---

# 9. Slice 8 — Dashboard Admin sin módulo duplicado

> **Estado:** COMPLETADO — 2026-07-31
> **Cierre:** [`docs/audits/V3_2_SLICE_8_ADMIN_PENDING_CLOSING.md`](../audits/V3_2_SLICE_8_ADMIN_PENDING_CLOSING.md)
>
> **Nota:** La auditoría Slice 0 demostró que los módulos no eran duplicados. Se consolidó UX en un único bloque con tabs; no se eliminó `pendingEvents`.

## Objetivo

Resolver la percepción de duplicación sin borrar información operativa (aprobación PENDING, borradores DRAFT, descuentos gastro).

## Auditoría previa

- [x] Comparar fuentes de datos de ambos módulos.
- [x] Comparar tipos de pendientes incluidos.
- [x] Confirmar si existen acciones únicas en el primer módulo.
- [x] Confirmar si existen contadores únicos.
- [x] Confirmar que `Operaciones Pendientes` cubra eventos y descuentos pendientes.

## Implementación

- [x] Unificar composición del dashboard en un solo módulo con tabs.
- [x] No eliminar endpoint ni lógica backend (`GET /admin/dashboard` intacto).
- [x] Preservar CTAs diferenciados por tipo.
- [x] Priorizar visualmente eventos pendientes de aprobación (tab default).
- [x] Mantener CTA de revisión operativa.

## Criterios de aceptación

- [x] Solo queda un bloque principal de pendientes.
- [x] No se pierde ningún tipo de operación.
- [x] Todos los enlaces de revisión siguen funcionando.
- [x] El dashboard se ve equilibrado en desktop y mobile.

## Smoke manual

- [ ] Admin sin pendientes.
- [ ] Admin con eventos pendientes.
- [ ] Admin con descuentos pendientes.
- [ ] Admin con varios tipos de pendientes.
- [ ] Mobile.

---

# 10. Slice 9 — Banner gastronómico con descuentos

## Objetivo

Permitir que el banner/hero de Gastronomía incluya descuentos además de publicaciones de locales.

## Reglas de contenido

- [ ] Mantener banners editoriales administrados.
- [ ] Incorporar descuentos gastronómicos vigentes como candidatos de contenido.
- [ ] No mostrar descuentos inactivos, cancelados, vencidos o no válidos hoy cuando aplique.
- [ ] Diferenciar visualmente local gastronómico y descuento.
- [ ] No reemplazar todos los locales por descuentos.
- [ ] Mantener una playlist equilibrada.
- [ ] Evitar duplicados del mismo descuento/local.

## Datos y contratos

- [ ] Confirmar endpoint público de descuentos disponible.
- [ ] Reutilizar contratos existentes si alcanzan.
- [ ] Si se necesita un view model nuevo, definirlo en shared/repository.
- [ ] Mantener reglas de recurrencia semanal y rango de fechas.

## Criterios de aceptación

- [ ] El banner gastronómico puede mostrar un descuento vigente.
- [ ] También continúa mostrando locales y banners editoriales.
- [ ] No aparecen descuentos vencidos o cancelados.
- [ ] El CTA lleva al descuento o local correcto.
- [ ] No desaparecen las publicaciones reales.

## Smoke manual

- [ ] Sin descuentos activos.
- [ ] Un descuento activo.
- [ ] Varios descuentos activos.
- [ ] Descuento recurrente válido hoy.
- [ ] Descuento recurrente no válido hoy.
- [ ] Descuento vencido.

---

# 11. Slice 10 — Eventos y Gastronomía como Próximamente

## Objetivo

Mostrar Eventos y Gastronomía como `Próximamente` para público general, permitiendo acceso únicamente al usuario ADMIN para demostraciones comerciales.

## 11.1 Gateway y menú de categorías

- [ ] Superponer leyenda `Próximamente` sobre Eventos.
- [ ] Superponer leyenda `Próximamente` sobre Gastronomía.
- [ ] Mantener imagen visible con overlay legible.
- [ ] Mantener Rentals y Excursiones accesibles.
- [ ] Para público/no admin, la card no debe navegar a la categoría.
- [ ] Para ADMIN, la card mantiene navegación normal.
- [ ] Agregar semántica accesible de contenido no disponible.

## 11.2 Protección de rutas frontend

Bloquear para público/no admin:

- [ ] `/categoria/event`.
- [ ] `/categoria/gastro`.
- [ ] rutas equivalentes/aliases identificados en auditoría.
- [ ] accesos desde Home.
- [ ] accesos desde Explore.
- [ ] links cruzados.
- [ ] cards y banners.

Comportamiento sugerido:

- [ ] Mostrar pantalla informativa `Próximamente`.
- [ ] No mostrar error 404 genérico.
- [ ] Mantener CTA hacia categorías habilitadas o Home.

## 11.3 Protección API/backend

- [ ] No confiar únicamente en ocultar botones.
- [ ] Evitar que endpoints públicos entreguen Eventos/Gastro a usuarios no autorizados cuando la restricción esté activa.
- [ ] Permitir acceso ADMIN mediante autenticación explícita.
- [ ] Definir feature flags centralizadas por categoría.
- [ ] Aplicar la regla en:
  - [ ] listados públicos;
  - [ ] búsqueda;
  - [ ] trending;
  - [ ] recommended;
  - [ ] detalle;
  - [ ] banners;
  - [ ] sugerencias predictivas;
  - [ ] carruseles cruzados.
- [ ] Mantener portales internos Admin/Gastro/Productora sin bloqueo accidental.

## 11.4 Configuración recomendada

- [ ] Crear configuración central de disponibilidad por categoría.
- [ ] Evitar condicionales dispersos por páginas.
- [ ] Documentar cómo reactivar Eventos y Gastro cuando el cliente lo decida.
- [ ] Mantener datos y publicaciones intactos.

## Criterios de aceptación

### Público/no autenticado

- [ ] Ve leyenda `Próximamente`.
- [ ] No puede ingresar por click.
- [ ] No puede ingresar por URL directa.
- [ ] No recibe resultados de Eventos/Gastro en Explore o sugerencias.

### Usuario autenticado no ADMIN

- [ ] Mismo comportamiento que público.

### ADMIN

- [ ] Puede ingresar a Eventos.
- [ ] Puede ingresar a Gastronomía.
- [ ] Puede ver cards, banners, fichas y descuentos.
- [ ] Puede usar estas pantallas para demostración.

### Regresión

- [ ] Rentals sigue disponible.
- [ ] Excursiones sigue disponible.
- [ ] Portales privados no quedan bloqueados.
- [ ] No se eliminan datos.

## Smoke manual de roles

- [ ] Incógnito.
- [ ] USER.
- [ ] PRODUCER_OWNER.
- [ ] GASTRO_OWNER.
- [ ] ADMIN.
- [ ] URL directa.
- [ ] Home.
- [ ] Gateway editorial.
- [ ] Explore.
- [ ] Buscador predictivo.
- [ ] Carruseles cruzados.

---

# 12. QA integral V3.2

## Visual

- [ ] Home desktop/mobile.
- [ ] Gateway editorial desktop/mobile.
- [ ] Categoría Rentals desktop/mobile.
- [ ] Categoría Excursiones desktop/mobile.
- [ ] Eventos/Gastro como Próximamente para público.
- [ ] Eventos/Gastro visibles para ADMIN.
- [ ] Footer consistente.
- [ ] Cards sin localidad repetida.
- [ ] Hover sin overflow.
- [ ] Modal sin scroll interno roto.

## Formularios

- [ ] Ciudad buscable en todos los formularios alcanzados.
- [ ] No se guarda texto libre.
- [ ] Provincia y ciudad se mantienen sincronizadas.

## Reviews

- [ ] Caritas 1–5.
- [ ] Promedio general.
- [ ] `Ver más`.
- [ ] `Valorar`.
- [ ] Datos históricos consistentes.

## Maps

- [ ] Preview con ubicación válida.
- [ ] Fallback sin ubicación.
- [ ] Sin múltiples mapas pesados en carruseles.

## Admin

- [ ] Dashboard sin módulo duplicado.
- [ ] Operaciones pendientes completas.

## Gastro

- [ ] Card de descuento sin `%` automático.
- [ ] Sin badge `Gratis`.
- [ ] Local sin mini-preview de descuentos.
- [ ] Banner gastro incluye descuentos vigentes.

## Accesibilidad

- [ ] Navegación por teclado.
- [ ] Focus visible.
- [ ] Labels de caritas.
- [ ] Contraste de Próximamente.
- [ ] Modal y combobox con Escape.
- [ ] Touch targets adecuados.

---

# 13. Smokes técnicos sugeridos

## Build

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```

## Tests existentes relevantes

```bash
pnpm --filter api run test:event-visibility
pnpm --filter api run test:gastro-discount-expiry
pnpm --filter api run test:gastro-discount-qr
```

## Nuevos smokes sugeridos

- [ ] `smoke:v32-category-availability`
  - público no recibe Event/Gastro;
  - ADMIN sí puede acceder;
  - Rental/Excursion permanecen públicas.

- [ ] `smoke:v32-search-suggestions`
  - búsqueda parcial;
  - límites;
  - visibilidad;
  - exclusión de categorías bloqueadas.

- [ ] `smoke:v32-reviews-rating-scale`
  - conversión o persistencia consistente;
  - resumen general;
  - niveles 1–5.

- [ ] `smoke:v32-gastro-banner-discounts`
  - descuentos vigentes;
  - rango y recurrencia;
  - exclusión de vencidos/cancelados.

---

# 14. Riesgos principales

- [ ] Cambiar `ContentCard` globalmente y romper una vertical.
- [ ] Ocultar Eventos/Gastro solo en frontend.
- [ ] Bloquear accidentalmente portales privados.
- [ ] Mostrar contenido restringido en búsqueda predictiva.
- [ ] Convertir reviews de 1–10 a 1–5 de forma inconsistente.
- [ ] Agregar `%` a descuentos no porcentuales.
- [ ] Cargar demasiadas instancias de Google Maps.
- [ ] Romper selección de ciudad con fallback manual existente.
- [ ] Eliminar lógica backend del dashboard que todavía tenga consumidores.
- [ ] Hacer que descuentos reemplacen por completo locales en banner Gastro.
- [ ] Romper accesibilidad al implementar combobox, modales o caritas.

---

# 15. Cierre documental

Al completar cada slice:

- [ ] Actualizar esta checklist con `[x]`.
- [ ] Crear auditoría o cierre en `docs/audits/`.
- [ ] Actualizar `AI_ENTRYPOINT.md`.
- [ ] Actualizar `FRONTEND_CONTEXT.md`.
- [ ] Actualizar `BACKEND_CONTEXT.md` si hubo cambios API/modelo.
- [ ] Actualizar `PROJECT_CONTEXT.md` si cambia disponibilidad pública de categorías.
- [ ] Actualizar `CONTEXT_PENDIENTES.md`.
- [ ] Documentar comandos ejecutados.
- [ ] Registrar migraciones, si existieran.
- [ ] Registrar smoke y QA manual pendiente.
- [ ] Preparar commit pequeño y descriptivo por slice.

---

# 16. Orden recomendado

1. Slice 0 — Auditoría técnica y matriz visual.
2. Slice 1 — Banners, subcategorías y footer.
3. Slice 2 — Cards públicas generales.
4. Slice 3 — Cards específicas de Gastronomía.
5. Slice 4 — Selector de ciudad buscable.
6. Slice 5 — Búsqueda predictiva en Explore.
7. Slice 6 — Valoraciones con caritas.
8. Slice 7 — Mini mapa público.
9. Slice 8 — Dashboard Admin.
10. Slice 9 — Banner Gastro con descuentos.
11. Slice 10 — Categorías Próximamente y control por rol.
12. QA integral y cierre documental.

> Recomendación: implementar el bloqueo de categorías después de estabilizar cards y búsqueda predictiva, para poder aplicar la regla de disponibilidad de manera uniforme sobre todos los puntos de descubrimiento.
