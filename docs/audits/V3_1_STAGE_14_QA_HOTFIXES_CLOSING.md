# V3.1 Etapa 14 — Hotfixes QA Manual post-deploy — Cierre

**Fecha:** 2026-06-15  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** Cerrado técnicamente — QA manual browser post-redeploy recomendado

---

## 1. Hallazgos QA (post-deploy V3.1)

| Área | Hallazgo |
|------|----------|
| Scanner PWA | Sin pantalla de login clara; menú operativo incompleto; PWA/offline poco visible |
| Scanner users | Modal crear usuario no centrado; autocomplete cambiaba ciudad y redirigía a `/explore` |
| Admin | Sin eliminación definitiva segura de publicaciones incorrectas |
| Público | Faltaban fichas de local rental y operador excursión agrupando publicaciones |
| Admin banners | Crear banner reemplazaba la lista en lugar de agregar |
| Ciudad/navbar | Ciudades duplicadas por slug/minúsculas; selector redirigía siempre a `/explore` |
| Navbar | Selector de ciudad apelmazado en doble fila (responsive) |
| Categorías | “Más para hacer” no incluía eventos en categorías no-evento |
| Legales | QA manual reporta todos los documentos publicados (incl. `/legal/productores`) |

---

## 2. Slices ejecutados

| Slice | Commit | Resumen |
|-------|--------|---------|
| 14.1 | `0ad9564` | Login JWT scanner, menú operativo, PWA install, offline/sync, estado sesión |
| 14.2 | `d747f96` | Modal centrado crear usuario scanner; aislamiento autocomplete/ciudad |
| 14.3 | `89108d5` | Hard delete admin seguro con `CONTENT_HAS_HISTORY` + audit log |
| 14.4 | `fa641af` | Páginas `/rentals/locales/[id]` y `/excursiones/operadores/[id]` + APIs públicas |
| 14.5 | `0ce6fc9` | Creación banner editorial actualiza lista (`setQueryData` + invalidate) |
| 14.6 | `7c5e97a` | Normalización ciudad (`city-normalization.ts`); navbar filtra sin ir a explore |
| 14.7 | `b8da2c3` | Navbar responsive: selector más compacto, label CIUDAD oculto en tablet |
| 14.8 | `4224500` | Carrusel cruzado de eventos en “Más para hacer” para todas las categorías |
| 14.9 | *(este commit)* | Documentación de cierre y verificación legales |

---

## 3. Fix scanner (14.1)

- `/` → login; `/door` → scanner (solo con sesión JWT válida).
- Menú: escanear, seleccionar evento/descuento, descargar PDF, guardar offline, sincronizar, instalar PWA, cerrar sesión.
- Estado online/offline, usuario scanner, cuenta padre, evento seleccionado.
- Manifest PWA existente confirmado; build `scanner` OK.

---

## 4. Fix admin delete (14.3)

- Endpoints `DELETE /admin/*/hard-delete` para eventos, gastro, rental-locations, excursion-operators.
- Bloqueo si hay órdenes, pagos, tickets, scans, transferencias o reviews.
- Modal frontend con confirmación `ELIMINAR`.
- Audit log antes de purge.

---

## 5. Fix páginas locales (14.4)

- `GET /public/rental-locations/:id` (existente) + `GET /public/excursion-operators/:id` (nuevo).
- Fichas públicas con hero, contacto, ubicación y cards de publicaciones activas.
- Links desde detalle rental/excursión a ficha del local/operador.

---

## 6. Fix banners (14.5)

- `AdminCategoryEditorialBannerPanel`: tras crear, `setQueryData` con respuesta del servidor + invalidate.
- Múltiples banners conviven; reorder y active/inactive sin pisar lista.

---

## 7. Fix ciudades/navbar (14.6–14.7)

- Helper `resolveCanonicalCityValue` / `cityDisplayLabel` en `@yo-te-invito/shared`.
- Selector deduplica ciudades; muestra labels legibles (espacios, no guiones).
- Cambio de ciudad en `/home`, `/categoria/*` y `/explore` mantiene ruta con `?city=`.
- Navbar: select más angosto; label “CIUDAD” oculto en tablet; ciudad en drawer mobile (patrón existente).

**Pendiente opcional:** script read-only + backfill de ciudades históricas en DB (no ejecutado en esta etapa).

---

## 8. Fix “Más para hacer” (14.8)

- `fetchCrossCategoryItems` incluye eventos recomendados cuando la categoría actual no es `event`.
- Respeta ciudad/tenant; carruseles vacíos no se renderizan.

---

## 9. Estado legales publicados

Según QA manual post-deploy, **todos los documentos públicos fueron publicados** en Admin:

| Slug público | Documento |
|--------------|-----------|
| `/legal/terminos` | Términos generales |
| `/legal/privacidad` | Privacidad |
| `/legal/compras-cancelaciones-reembolsos` | Compra/cancelación/reembolso |
| `/legal/productores` | Productores |
| `/legal/gastronomicos` | Gastronómicos |
| `/legal/rentals` | Rentals |
| `/legal/hoteles` | Hoteles |
| `/legal/referidos` | Referidos |
| `/legal/transferencia-tickets` | Transferencia de tickets |

- Build Next.js genera SSG para los 9 slugs (`generateStaticParams`).
- `/legal/productores` ya no debe dar 404 con versión publicada en prod.
- Wizard productora puede aceptar `producer_terms` y enviar a revisión si doc publicado.

---

## 10. QA ejecutado (automatizado)

| Check | Resultado |
|-------|-----------|
| `shared:build` | PASS |
| `api:build` | PASS |
| `web:build` | PASS |
| `scanner:build` | PASS |
| QA browser scanner login/PWA | Pendiente post-redeploy |
| QA browser admin hard delete | Pendiente post-redeploy |
| QA browser fichas rental/operador | Pendiente post-redeploy |
| QA browser banners múltiples | Pendiente post-redeploy |
| QA browser ciudad/navbar | Pendiente post-redeploy |
| QA browser “Más para hacer” | Pendiente post-redeploy |
| QA browser legales publicados | Confirmado por QA manual pre-hotfix |

---

## 11. Pendientes

1. **Redeploy** `feat/v1-s03-api-foundation` en VPS (api + web + scanner) con commits 14.1–14.9.
2. **QA manual browser** matriz ampliada en `V3_1_STAGE_0_MANUAL_QA_SERVER_CHECKLIST.md` §8 (scanner) y nuevas rutas locales/operadores.
3. **Backfill ciudades** en DB: script read-only para listar variantes + script opcional de normalización (no destructivo sin confirmación).
4. **Smoke** `pnpm --filter api run smoke:v31-category-banners` en entorno con API HTTP (local build sin servidor → SKIP aceptable).

---

## Recomendación

**Sí — redeployar y retomar QA manual.** Los 9 slices son fixes acotados con builds verdes; no se tocó Getnet/pagos ni `.env`. Tras deploy, validar prioritariamente scanner PWA, hard delete admin con/sin historial, y carruseles cruzados en `/categoria/gastro`.
