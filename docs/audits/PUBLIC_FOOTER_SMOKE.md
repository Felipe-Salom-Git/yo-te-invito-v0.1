# Smoke Footer Público — Yo Te Invito

**Proyecto:** `apps/web`  
**Bloque:** Footer público completo (Slices 1–5)  
**Fecha:** 2026-05-24  
**Referencias:** `PUBLIC_FOOTER_AUDIT.md`, `NAVBAR_RESPONSIVE_SMOKE.md`

---

## 1. Objetivo

Verificar que el footer público cumple variantes por ruta, diseño dark premium, accesibilidad básica, ausencia de overflow horizontal y no duplica navegación crítica del navbar.

**Modo de ejecución:** revisión de implementación (Slice 5) + guía manual en navegador con `pnpm run -w dev`.

---

## 2. Rutas revisadas

### Variante `full` (footer completo)

| Ruta | Código | Manual |
|------|--------|--------|
| `/` | OK — overlay gateway oculta pie global; tras redirect → `/home` | Verificar splash |
| `/home` | OK | [ ] |
| `/explore` | OK | [ ] |
| `/categoria/event` | OK | [ ] |
| `/categoria/gastro` | OK | [ ] |
| `/categoria/rental` | OK | [ ] |
| `/categoria/excursion` | OK | [ ] |
| `/events/[id]` | Manual — ID desde explore | [ ] |
| `/restaurants/[id]` | Manual | [ ] |
| `/rentals/[id]` | OK — página con `pb-24` mobile; footer bajo sticky CTA al scroll | [ ] |
| `/excursiones/[id]` | Manual | [ ] |
| `/hoteles` | OK | [ ] |
| `/hoteles/[id]` | Manual | [ ] |
| `/referrers` | OK | [ ] |

### Variante `hidden`

| Ruta | Código |
|------|--------|
| `/categorias` | OK — solo `CategoryGatewayFooter` |
| `/me`, `/me/*` | OK |
| `/producer`, `/producer/*` | OK |
| `/admin`, `/admin/*` | OK |
| `/gastro`, `/gastro/*` | OK |
| `/hotel`, `/hotel/*` | OK |
| `/referrer`, `/referrer/*` | OK |
| `/cuenta/*` | OK |
| `/login`, `/register/*`, `/logout` | OK |
| `/r/[code]` | OK |

### Variante `minimal`

| Ruta | Código |
|------|--------|
| `/legal/[slug]` | OK — 3 legales + contacto; sin grid completo |
| `/checkout`, `/checkout/[eventId]` | OK |

---

## 3. Breakpoints revisados

| Ancho | Implementación Slice 5 |
|-------|-------------------------|
| 320px | `min-w-0`, `overflow-x-clip`, `break-words`, links `min-h-11` |
| 375px | Idem — columna única, gaps `gap-8` |
| 414px | Idem |
| 768px (`sm`) | Grid 2 columnas; legales 2 cols |
| 1024px (`lg`) | Grid 12 columnas |
| Desktop | `max-w-6xl`, padding `sm:px-6` |

---

## 4. Checklist visual

### Público — desktop

- [x] `/home` — footer full con 5 bloques + barra inferior (código)
- [ ] `/home` — verificación manual
- [x] `/explore` — variante full (código)
- [ ] `/explore` — manual
- [x] `/categoria/event` — verticales + legales (código)
- [ ] `/categoria/event` — manual
- [ ] `/events/[id]` — manual con evento real
- [ ] `/rentals/[id]` — manual; confirmar scroll hasta footer sin solaparse con CTA sticky

### Público — mobile 375px

- [x] Sin `overflow-x` en shell/contenedor (código)
- [x] Links área táctil ≥44px (`min-h-11`) (código)
- [ ] `/home` — manual
- [ ] `/explore` — manual
- [ ] `/categoria/gastro` — manual
- [ ] `/legal/terminos` — minimal, no triple pie

### Gateway / legal

- [x] `/categorias` — sin footer global; gateway footer solo (código)
- [ ] `/categorias` — manual
- [x] `/legal/terminos` — minimal + nota versión artículo (código)
- [ ] `/legal/terminos` — manual

### Portales (sin footer completo)

- [x] `/me` — hidden (código)
- [x] `/admin` — hidden (código)
- [ ] `/me` — manual confirmar ausencia pie global

---

## 5. Checklist accesibilidad

- [x] `role="contentinfo"` en `<footer>`
- [x] `aria-label` en navs (verticales, accesos, legales, redes)
- [x] Redes externas: `rel="noopener noreferrer"` + `target="_blank"`
- [x] Redes sin URL: `aria-disabled="true"`, sin `<a href="#">`
- [x] Foco visible: `navFocusRing` en links
- [x] Hoteles: texto + badge «Próximamente» + `aria-label` en link
- [x] Placeholder social: etiqueta visible «Pendiente»
- [ ] Navegación Tab manual por links del footer
- [ ] Contraste en dispositivo real (opcional)

---

## 6. Checklist links

- [x] Verticales → `/categoria/*` y `/hoteles` (código)
- [x] Hoteles badge Próximamente (código)
- [x] Accesos: `/explore`, `/categorias`, `/home`, `/profiles`, `/me/tickets`
- [x] 9 slugs legales en `footerLegalLinks.ts` sin cambios
- [x] Contacto vía `GET /public/platform-config` (no admin)
- [x] Sin links `#` rotos en redes placeholder
- [ ] Clic manual en cada slug legal publicado

---

## 7. Resultado

| Criterio | Estado |
|----------|--------|
| Variantes por ruta | OK (código + `footerVisibility.ts`) |
| Responsive / overflow | OK (Slice 5 — estilos) |
| Accesibilidad base | OK (Slice 5) |
| Sin doble footer `/categorias` | OK |
| Sin triple footer `/legal/*` | OK |
| No duplica navbar | OK |
| Copy sin pagos reales | OK |

**Veredicto:** bloque listo para cierre V2 sujeto a pasada manual en navegador (ítems `[ ]` arriba).

---

## 8. Pendientes

| Ítem | Notas |
|------|-------|
| Instagram real Yo Te Invito | `FOOTER_SOCIAL_LINKS` / API `instagramUrl` |
| Contacto real | `/admin/contactos` → API pública |
| Web/red equipo desarrollador | `FOOTER_DEVELOPER_CREDIT` |
| Publicar documentos legales | Admin `/admin/legales` — links pueden 404 hasta publish |
| QA en dispositivo físico | iOS/Android real recomendado |
| Playwright E2E footer | Opcional futuro |

---

## Comandos

```bash
pnpm run -w dev
curl "http://localhost:3001/public/platform-config?tenantId=tenant-demo"
```
