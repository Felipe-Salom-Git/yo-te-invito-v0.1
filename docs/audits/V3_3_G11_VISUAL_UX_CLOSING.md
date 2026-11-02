# V3.3 — G11 Visual / UX follow-ups after G10 (closing)

**Fecha:** 2026-11-02 · **Rama:** `feat/v1-s03-api-foundation` · **Estado:** G11.1 + G11.2 **COMPLETE en código**, local, **sin push / sin deploy**, **sin migrations**, sin cambios de API ni de lógica económica (settlements / agreements / payments intactos).

## Commits

| Subetapa | Commit | Slice |
|----------|--------|-------|
| G11.1 | `9ce5899` | Flechas del carrusel de descuentos (`RailScrollArrows` + `useHorizontalRailScroll`, compartido con `ContentRail`) |
| G11.1 | `8e31ebc` | Sin `0%` / `$0` en publicaciones de descuento (`formatGastroDiscountBenefit` → `null` si `value ≤ 0`) |
| G11.1 | `3870c4e` | Swipe táctil en galerías (`ImageGalleryLightbox` único; publicaciones, fichas, rentals, excursiones, productoras) |
| G11.1 | `c239374` | Nuevos iconos de valoración (`RatingFaceIcon`, `public/icons/ratings/rating-face-{1..5}.png`) |
| G11.1 | `fda6bb8` | shortCode visible en QR web (`ManualShortCodeBlock`, formato `XXX-XXX` como el mail) |
| G11.2 | `64655f5` | Compartir unificado bajo el título en modal minimizado y fichas (`PublicShareButton`) |
| G11.2 | `528e0bc` | «Valorar» desplegable (`ReviewForm` colapsable, alineado a `ReviewSummary`) |
| G11.2 | `ea4b3b3` | Portadas oficiales Eventos / Actividades / Rentals (gateway + hero vacío de landing) |
| G11.2 | `de8a7c7` | Scanners del portal gastro: todos, agrupados por local |
| G11.2 | (este commit) | Cierre, regresión y handoff |

## G11.2 — decisiones

| Tema | Regla |
|------|-------|
| **Compartir** | Un solo componente `PublicShareButton`: Web Share si existe; si no, menú WhatsApp (`wa.me/?text=`, sin teléfono destino) + «Copiar enlace». Ubicación: **debajo del título** (prop `titleAction` en los heroes; modal `ContentPreviewModal`). |
| **URL compartida** | `buildPublicShareUrl` (`lib/share/publicShare.ts`): ruta pública canónica, **sin query** (nunca `tenantId`), sin rutas `/gastro/`, `/admin/`, `/me/`. Único hash permitido: `#publicacion-{contentId}`. Eventos / places dejaron de compartir `window.location.href`. |
| **Superficies con compartir** | Modal minimizado (todas las verticales), eventos, places, local gastro (reemplaza el card lateral de G9), cada publicación gastro (ancla), hoteles, actividades, rentals, descuento gastro, cupón de actividad, productora; listado de locales del portal (G9, mismo componente). |
| **Valorar** | `ReviewForm` arranca cerrado; toggle «Escribir valoración» / «Ocultar» con `aria-expanded` / `aria-controls`; foco al primer control al abrir y vuelve al toggle al cerrar; submit y `key={reviewFormKey}` sin cambios (se cierra tras publicar). |
| **Portadas** | Assets locales `public/home/covers/{eventos,actividades,rentals}.jpg` vía `HOME_COVER_IMAGES` en `categoryGatewayConfig` (mecanismo de config existente) + `imagePosition` para encuadre desktop. Gastronomía sin cambios. También en el hero vacío de `/categoria/{event,excursion,rental}`. |
| **Scanners gastro** | `/gastro/scanners` lista **todos** los scanners de la cuenta, una sección por local (incluye locales sin scanners, «Principal», «Local activo»). El local activo solo se resalta, no filtra. Aislamiento server-side sin cambios: `listForGastro` → `parentProfileId ∈ locales gestionados` del tenant. |

## Regresión G11.2

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | PASS |
| `pnpm --filter api run build` | PASS |
| `pnpm --filter web run build` | PASS |
| `pnpm --filter scanner run build` | PASS |
| `test:public-share` (+ `test:gastro-location-share` G9) | PASS |
| `test:home-covers` | PASS |
| `test:gastro-scanners-grouped` | PASS |
| G11.1: `test:gastro-discount-benefit-label`, `test:public-gallery-swipe`, `test:rating-face-icons`, `test:web-qr-short-code` | PASS |
| `test:gastro-multi-local`, `test:gastro-empty-states`, `test:gastro-card-chips`, `test:scanner-manual-short-code`, `test:gastro-courtesy-studio` | PASS |
| Web `tsc` suelto | Solo el PREEXISTING `vitest` |

**QA visual (página temporal con componentes reales + datos mock, no commiteada):** compartir bajo el título en hero y modal; fallback WhatsApp / Copiar con URL sin `tenantId`; `Escape` cierra el menú sin cerrar el modal; «Valorar» abre/cierra con foco correcto; portadas cargan en mobile y desktop con texto legible; scanners agrupados (principal, local activo, local vacío). La base local no tiene contenido público, así que **no** se probó contra datos reales.

## QA manual pendiente (post-deploy)

1. Compartir desde celular (Web Share nativo) en: modal del home, evento, local, publicación (abre la ficha y salta al ancla), hotel, actividad, rental, descuento, cupón de actividad, productora. Verificar que ningún enlace lleve `?tenantId=`.
2. Desktop sin Web Share: menú WhatsApp / Copiar enlace.
3. «Valorar» cerrado por defecto → abrir → publicar → toast + vuelve a cerrarse.
4. `/categorias`: portadas Eventos / Actividades / Rentals en mobile y desktop; landing de categoría vacía muestra la portada.
5. `/gastro/scanners` con 0 locales, locales sin scanners y varios locales con varios scanners; crear scanner desde la sección de un local preselecciona ese local.
6. G11.1: flechas del carrusel de descuentos (desktop), sin `0%`, swipe en galerías desde celular, iconos de valoración, shortCode bajo el QR.

## Riesgos / pendientes

- G9: el card lateral «Compartir» de la ficha gastro se reemplazó por el botón bajo el título (pedido explícito de G11.2).
- Filtros de reseñas (`<select>`) siguen con texto: `<option>` no admite imágenes.
- Admin `AdminGastroPendingEditPanel` puede seguir mostrando `0%` en el diff interno (fuera de alcance).
- `ReviewForm` usa `useId` para ids del panel/comentario (antes `review-comment` fijo, duplicable).
