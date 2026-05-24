# Smoke responsive — Navbar y navegación

**Proyecto:** Yo Te Invito (`apps/web`)  
**Slice:** 10 — Smoke visual responsive final  
**Fecha:** 2026-05-23  
**Contexto:** Cierre del bloque Slices 1–9 (`docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`)

---

## 1. Resumen

Smoke realizado mediante **revisión de implementación** (componentes, layouts, estilos globales) y alineación con criterios de los slices 2–9. No sustituye una pasada manual en navegador en todos los dispositivos; incluye **guía de prueba manual** y rutas dinámicas con datos.

**Correcciones menores aplicadas en Slice 10:**

| Corrección | Archivo |
|------------|---------|
| `scroll-padding-top` alineado a altura sticky del navbar | `apps/web/styles/globals.css` |
| `overflow-x: clip` en `body` | `apps/web/styles/globals.css` |
| `min-w-0 overflow-x-clip` en `<main>` | `apps/web/app/layout.tsx` |
| Foco visible en links del sidebar desktop de portales | `apps/web/components/layout/PortalSidebar.tsx` |

**Veredicto:** el bloque navbar/navegación responsive cumple el alcance acordado. Quedan deudas no bloqueantes (navbar global en portales mobile, footer completo, endpoint dedicado de ciudades).

---

## 2. Rutas públicas revisadas

Leyenda: **OK** = comportamiento esperado según código; **Manual** = requiere verificación visual con datos en local.

| Ruta | Desktop | Tablet | Mobile | Observaciones |
|------|---------|--------|--------|---------------|
| `/home` | OK | OK | OK | Navbar: logo → `/categorias`, casita → `/home` (`md+`), carro, menú ☰. Rails con `min-w-0`. |
| `/explore` | OK | OK | OK | Explorar en barra `md+`; ciudad en navbar desktop y drawer mobile; filtro `?city=` sincronizado. |
| `/categoria/event` | OK | OK | OK | Misma navbar; landing con contenedor acotado. |
| `/categoria/gastro` | OK | OK | OK | Idem. |
| `/categoria/rental` | OK | OK | OK | Idem. |
| `/categoria/excursion` | OK | OK | OK | Idem. |
| `/categorias` | OK | OK | OK | Gateway editorial; `min-h` compensa navbar; footer propio gateway + navbar global. |
| `/events/[id]` | Manual | Manual | Manual | Abrir primer evento desde `/explore` o `/home`. Ver § Rutas dinámicas. |
| `/restaurants/[id]` | Manual | Manual | Manual | Desde explore categoría gastro o listado publicado. |
| `/rentals/[id]` | Manual | Manual | Manual | Desde explore `category=rental`. |
| `/excursiones/[id]` | Manual | Manual | Manual | Desde explore `category=excursion`. |
| `/hoteles` | OK | OK | OK | Listado; navbar estándar. |
| `/hoteles/[id]` | Manual | Manual | Manual | Requiere `publicEventId` de hotel E2E o ficha publicada (`?tenantId=tenant-demo`). |
| `/checkout` | OK | OK | OK | Carro invitado; auth redirige a `/me/cart`. Navbar sin overflow. |

---

## 3. Portales revisados

| Ruta | Desktop | Tablet | Mobile | Observaciones |
|------|---------|--------|--------|---------------|
| `/me` | OK | OK | OK | Sidebar `md+`; `MobilePortalNav`; «Volver al inicio» solo desktop; drawer con enlace público. |
| `/me/cart` | OK | OK | OK | Carro en navbar → `/me/cart` autenticado. |
| `/me/tickets` | OK | OK | OK | Ítem en menú portal mobile. |
| `/me/notifications` | OK | OK | OK | En drawer mobile (cuenta); en barra `lg+` desktop. |
| `/producer` | OK | OK | OK | 6 ítems portal; sidebar desktop. |
| `/producer/events` | OK | OK | OK | Activo sin marcar dashboard padre. |
| `/admin` | OK | OK | OK | 14 ítems en drawer mobile (scroll vertical); sidebar desktop. |
| `/admin/eventos` | OK | OK | OK | |
| `/admin/usuarios` | OK | OK | OK | |
| `/admin/categorias` | OK | OK | OK | |
| `/gastro` | OK | OK | OK | |
| `/gastro/contenido` | OK | OK | OK | |
| `/hotel` | OK | OK | OK | |
| `/referrer` | OK | OK | OK | 3 ítems. |

**Nota mobile portales:** persiste **navbar global + barra «Menú» del portal** (doble chrome). Aceptado en Slice 7; no se ocultó navbar en portales en este bloque.

---

## 4. Breakpoints probados

| Ancho | Uso | Resultado esperado |
|-------|-----|-------------------|
| 360px | Mobile estrecho | Menú ☰ + carro; sin links públicos en fila; sin scroll-x en `body`/`main`. |
| 390px | Mobile común | Idem; área táctil ≥44px en controles críticos (`navTouchTarget`). |
| 430px | Mobile grande | Idem. |
| 768px | Tablet / `md` | Sidebar portal visible; Explorar + ciudad + usuario en barra; sin drawer público. |
| 1024px | Desktop | Logo con texto; notificaciones `lg+`. |
| 1280px | Desktop ancho | `max-w-6xl` navbar centrado. |

**Cómo reproducir:** DevTools → responsive; `pnpm run -w dev`; recorrer rutas de §2 y §3.

---

## 5. Problemas encontrados

| Prioridad | Problema | Ruta | Corrección | Estado |
|-----------|----------|------|------------|--------|
| Media | Posible scroll horizontal en páginas anchas | Global | `overflow-x: clip` en `body` y `main` | **Corregido** |
| Media | Anclas/foco bajo navbar sticky | Global | `scroll-padding-top` en `html` | **Corregido** |
| Baja | Sidebar portal sin anillo de foco unificado | Portales `md+` | `navFocusRing` en `PortalSidebar` | **Corregido** |
| Baja | Doble chrome navbar + portal en mobile | `/me`, `/admin`, etc. | — | **Deuda** (fuera de slice) |
| Baja | Admin: 14 ítems en drawer largo | `/admin` mobile | — | **Deuda** (agrupar en bloque futuro) |
| Baja | Ciudades: heurística sin API `GET /cities` | `/explore` | — | **Deuda** (Slice 5 doc) |
| Info | Smoke sin capturas en todos los breakpoints | — | Este documento + manual | **Documentado** |

---

## 6. Checklist final

- [x] Sin overflow horizontal (mitigado en layout global)
- [x] Navbar no tapa contenido al enfocar/anclar (`scroll-padding-top`)
- [x] Drawer mobile público OK (Escape, backdrop, focus trap)
- [x] Portal mobile nav OK (mismos patrones)
- [x] Carro OK (visible; badge; `aria-label` con conteo)
- [x] Selector ciudad OK (desktop + drawer; provincias; sync `?city=` en explore)
- [x] Usuario/login OK (dropdown desktop; cuenta en drawer mobile; español)
- [x] Accesibilidad básica OK (Slice 9)
- [x] Footer sin Admin público (Slice 8)
- [x] Sidebar desktop en portales
- [ ] Navbar reducido en portales mobile — **pendiente post-bloque**

---

## 7. Rutas dinámicas — cómo probar

Con API y web en local (`pnpm dev` / `dev:api`):

1. **`/events/[id]`** — Ir a `/explore`, abrir primera tarjeta de evento, o usar ID de un evento publicado en tenant `tenant-demo`.
2. **`/restaurants/[id]`** — Explore con categoría gastro; abrir ficha gastronómica.
3. **`/rentals/[id]`** — Explore `?category=rental`.
4. **`/excursiones/[id]`** — Explore `?category=excursion`.
5. **`/hoteles/[id]`** — Variables E2E: `E2E_HOTEL_EMAIL`, `E2E_HOTEL_PASSWORD`; publicar ficha en `/hotel/editar`; URL `/hoteles/{publicEventId}?tenantId=tenant-demo` (ver `e2e/hotel.spec.ts`).

**E2E relacionados:** `e2e/user-portal.spec.ts`, `e2e/hotel.spec.ts`, `e2e/notifications.spec.ts`.

---

## 8. Checklist visual (por grupo)

### Público

| Ítem | Estado |
|------|--------|
| Sin scroll horizontal | OK (post-fix global) |
| Navbar sticky sin tapar foco | OK (`scroll-padding-top`) |
| Logo → `/categorias` | OK |
| Casita → `/home` (`md+`) | OK |
| Explorar → `/explore` (`md+`) | OK |
| Ciudad no rompe layout | OK (`max-w` en selector) |
| Ciudad actualiza explore | OK (`useNavbarCitySelection`) |
| Carro + badge | OK |
| Menú usuario / login | OK (desktop); drawer mobile |
| Menú mobile público abre/cierra | OK |
| Footer sin Admin | OK |
| Escape / outside / Tab | OK (Slice 9) |

### Portales

| Ítem | Estado |
|------|--------|
| Sidebar desktop | OK |
| Menú portal mobile | OK |
| Sin sidebar horizontal mobile | OK (oculto `< md`) |
| Sin triple nav horizontal | OK (eliminado scroll-x sidebar) |
| Doble chrome navbar+portal | Deuda conocida |

---

## 9. Pendientes post-slice

| Tema | Bloque sugerido |
|------|-----------------|
| Footer público completo (legales, verticales, redes) | Checklist V2 — Footer |
| Navbar contextual o minimal en `(portal)` | Mejora UX post-V2 |
| Agrupar ítems admin en mobile (acordeones) | Portal admin UX |
| API pública de ciudades | Backend + navbar |
| Capturas/regresión visual automatizada | QA / Playwright visual |
| `inert` en `<main>` al abrir drawers | Accesibilidad avanzada |

---

## 10. Conclusión

El bloque **Navbar y navegación responsive** queda **cerrado** para V2 con implementación en Slices 2–9, correcciones de smoke en Slice 10 y checklist V2 actualizado. Se recomienda una **pasada manual de 30–45 min** en 360px y 1280px sobre `/home`, `/explore`, `/me` y `/admin` con usuario admin y comprador antes de release, usando esta tabla como guía.

**Lint:** `pnpm nx run web:lint` sigue fallando por errores TS preexistentes ajenos al bloque (rentals admin, gastro gallery, `registerPush`).
