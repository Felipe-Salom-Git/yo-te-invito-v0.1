# Auditoría de cierre — Footer público completo

**Proyecto:** Yo Te Invito (`apps/web` + `apps/api`)  
**Bloque:** Footer público completo (Slices 1–5)  
**Fecha:** 2026-05-24  
**Método:** Revisión de código, configs, documentación y alineación con `PUBLIC_FOOTER_AUDIT.md` / `PUBLIC_FOOTER_SMOKE.md`. Smoke manual en navegador recomendado para ítems marcados «Manual».

---

## 1. Resumen ejecutivo

El bloque **Footer público completo** quedó implementado de forma coherente con la arquitectura acordada en los cinco slices. La variante por ruta funciona vía `getFooterVariant` + `RouteAwareFooter`; el contacto público usa `GET /public/platform-config` sin depender de `/admin/config`; la UI full dark premium está modularizada en `components/footer/*`; legales y slugs se mantienen intactos.

**Veredicto:** **OK con observaciones menores** — apto para cerrar el bloque y avanzar al siguiente. No se requiere mini-slice correctivo. Las observaciones son producto/contenido (datos reales, publicación legal, QA físico) o decisiones ya documentadas (`/categorias` sin footer global).

---

## 2. Archivos revisados

| Área | Archivos |
|------|----------|
| Orquestación | `apps/web/components/Footer.tsx`, `RouteAwareFooter.tsx`, `app/layout.tsx` |
| UI footer | `apps/web/components/footer/*` (11 archivos) |
| Config / visibilidad | `footerVisibility.ts`, `footerPublicConfig.ts`, `footerLegalLinks.ts`, `footerPublicContact.ts` |
| Hooks / repos | `usePublicPlatformConfig.ts`, `usePlatformConfig.ts`, `ApiRepository.ts` (`publicPlatformConfig`) |
| Backend | `public-platform-config.controller.ts`, `public-platform-config.service.ts`, `public.module.ts` |
| Shared | `packages/shared/src/schemas/platform-config.schema.ts`, `constants/legal-documents.ts` |
| Legal inline | `components/legal/LegalDocumentPage.tsx` |
| Gateway | `components/category-gateway/CategoryGatewayFooter.tsx` |
| Docs | `PUBLIC_FOOTER_AUDIT.md`, `PUBLIC_FOOTER_SMOKE.md`, checklist V2, `CONTEXT_PENDIENTES.md`, `FRONTEND_CONTEXT.md`, `BACKEND_CONTEXT.md` |

---

## 3. Estado general del bloque

| Slice | Entregable | Estado |
|-------|------------|--------|
| 1 | Auditoría + arquitectura | OK |
| 2 | `footerVisibility`, `RouteAwareFooter`, `footerPublicConfig`, sin doble pie gateway/legal | OK |
| 3 | `GET /public/platform-config`, `usePublicPlatformConfig` | OK |
| 4 | Footer full dark premium modular | OK |
| 5 | Responsive, a11y, `PUBLIC_FOOTER_SMOKE.md` | OK |

---

## 4. Renderizado por rutas

Fuente: `getFooterVariant()` en `footerVisibility.ts`.

### Variante `full`

| Ruta | Variante código | Notas |
|------|-----------------|-------|
| `/` | `full` | Durante overlay gateway el pie global queda fuera de viewport; tras redirect → `/home` con full |
| `/home` | `full` | OK |
| `/explore` | `full` | OK |
| `/categoria/event` | `full` | OK |
| `/categoria/gastro` | `full` | OK |
| `/categoria/rental` | `full` | OK |
| `/categoria/excursion` | `full` | OK |
| `/events/[id]` | `full` | OK |
| `/restaurants/[id]` | `full` | OK |
| `/rentals/[id]` | `full` | OK — página con `pb-24` mobile para sticky CTA |
| `/excursiones/[id]` | `full` | OK |
| `/hoteles`, `/hoteles/[id]` | `full` | OK |
| `/referrers` | `full` | OK |
| `/categorias` | **`hidden`** | **Decisión Slice 2:** solo `CategoryGatewayFooter` (no footer global full) |
| `/producers/*`, `/users/*` | `full` | Default público |

**Aclaración `/categorias`:** el brief de QA a veces lista «footer full» en gateway; la implementación correcta es **`hidden`** + pie editorial propio (`Ir al inicio` / `Explorar todo`) para evitar doble footer. Las landings por categoría (`/categoria/*`) sí llevan footer full.

### Variante `minimal`

| Ruta | Variante | Contenido |
|------|----------|-----------|
| `/legal/*` | `minimal` | ©, contacto compacto, 3 legales esenciales |
| `/checkout`, `/checkout/*` | `minimal` | Idem |

### Variante `hidden`

| Ruta | Variante |
|------|----------|
| `/me`, `/me/*` | `hidden` |
| `/producer`, `/producer/*` | `hidden` |
| `/admin`, `/admin/*` | `hidden` |
| `/gastro`, `/gastro/*` | `hidden` |
| `/hotel`, `/hotel/*` | `hidden` |
| `/referrer`, `/referrer/*` | `hidden` |
| `/cuenta/*` | `hidden` |
| `/login`, `/register/*`, `/logout` | `hidden` |
| `/categorias` | `hidden` |
| `/r/*` | `hidden` |

---

## 5. Duplicaciones detectadas o descartadas

| Escenario | Resultado |
|-----------|-----------|
| Doble footer en `/categorias` | **Descartado** — global `hidden`; solo `CategoryGatewayFooter` |
| Doble/triple pie en `/legal/[slug]` | **Descartado** — global `minimal` + una línea de versión en artículo (sin © duplicado ni grid legales repetido) |
| `CategoryGatewayFooter` + `Footer` global | **OK en `/categorias`** — global no renderiza |
| Links legales inline duplicados | **No** — artículo remite al pie del sitio, no lista 9 slugs |
| Navbar + footer crítico | **Sin duplicación crítica** — ver §6 |

---

## 6. Relación con Navbar V2

**No presente en footer** (grep en `components/footer/`): selector de ciudad, carrito, menú usuario, drawer mobile, navegación de portales.

**Presente como accesos secundarios** (`footerPublicConfig.ts`):

- Explorar → `/explore`
- Categorías → `/categorias`
- Inicio → `/home`
- Mi portal → `/profiles`
- Mis tickets → `/me/tickets`
- Verticales + legales + soporte

**Coherencia:** el navbar mantiene acciones primarias (sticky, carro, cuenta); el footer complementa descubrimiento y compliance sin competir visualmente (`footerStyles`: links secundarios, sin sticky).

---

## 7. Links legales

| Criterio | Estado |
|----------|--------|
| `footerLegalLinks.ts` existe | OK |
| 9 slugs alineados con `LEGAL_SLUG_TO_KEY` | OK — `terminos`, `privacidad`, `compras-cancelaciones-reembolsos`, `transferencia-tickets`, `productores`, `gastronomicos`, `rentals`, `hoteles`, `referidos` |
| Rutas `/legal/*` | OK |
| Condiciones por vertical/perfil | OK — no eliminados |
| Documento no publicado → 404 | Esperado (contenido admin); routing correcto |
| Links obligatorios visibles en `full` | OK — grid completo en `FooterLegalSection` |

Variante `minimal`: `FOOTER_LEGAL_LINKS_ESSENTIAL` (3 documentos núcleo usuario).

---

## 8. Enlaces por vertical

Config: `FOOTER_VERTICAL_LINKS` en `footerPublicConfig.ts`.

| Label | href | Estado |
|-------|------|--------|
| Eventos | `/categoria/event` | OK |
| Gastronomía | `/categoria/gastro` | OK |
| Equipos y rentals | `/categoria/rental` | OK |
| Excursiones | `/categoria/excursion` | OK |
| Hoteles | `/hoteles` | OK — badge **Próximamente** (`comingSoon`), `aria-label` «Hoteles, próximamente» |

- No apunta a `/categoria/hotel`.
- Copy de rentals en institucional: «rentals» genérico; sin emoji alojamiento en footer (anti-alojamiento vive en `lib/rentals/publicCopy` en fichas).

---

## 9. Contacto público / platform config

### Backend

| Ítem | Estado |
|------|--------|
| `GET /public/platform-config?tenantId=` | OK — sin auth |
| Service solo `select` contactEmail/Phone/Address | OK |
| No expone `categories` ni flags admin | OK |
| `whatsappPhone`, `instagramUrl`, `websiteUrl` en respuesta | `null` hasta datos reales (campos reservados) |

### Frontend

| Ítem | Estado |
|------|--------|
| Footer usa `usePublicPlatformConfig` | OK — `FooterFull`, `FooterMinimal` |
| No usa `/admin/config` en footer | OK |
| Admin `/admin/contactos` sigue `platformConfig.get` | OK |
| Invalidación cache pública al guardar contacto | OK — `publicPlatformConfigKeys` |
| Fallback placeholder | OK — `footerPublicContact.ts` + leyenda demo |
| Sin fetch directo en componentes | OK — TanStack Query + repo |

**Riesgo descartado:** 401/403 en páginas públicas por config admin.

---

## 10. Redes sociales y desarrolladores

| Ítem | Estado |
|------|--------|
| Placeholders Instagram / Sitio web | OK — `href: null`, UI «Pendiente», `aria-disabled="true"` |
| Sin `href="#"` | OK — grep sin coincidencias en `components/footer/` |
| URLs API válidas | OK — `footerSocialUtils.isSafeExternalUrl` + `displayHref` |
| Externos | OK — `target="_blank"`, `rel="noopener noreferrer"`, `aria-label` |
| Desarrollador | OK — texto «Equipo desarrollador (placeholder)», sin links hasta URLs reales |
| Leyenda datos pendientes | OK |

---

## 11. Copy de confianza

`FOOTER_TRUST_ITEMS` (Slice 4/5):

- Tickets digitales con QR  
- Validación QR en el acceso  
- Resumen antes de confirmar  
- Soporte y legales publicados  

**No afirma:** pagos reales, proveedor de pago, soporte 24/7, reservas hoteleras.

**Adecuado** para checkout demo actual.

---

## 12. UI dark premium

| Criterio | Implementación |
|----------|----------------|
| Fondo dark | `bg-black`, borde `border-white/10` |
| Acento verde | `hover:text-accent`, badges Próximamente |
| Texto muted | `text-text-muted` en cuerpo |
| Jerarquía | Títulos sección uppercase; grid 12 cols desktop |
| Sin glow excesivo | OK |
| No estética dashboard | OK — editorial, no tablas |

---

## 13. Responsive mobile

Implementación Slice 5 (`footerStyles.ts`, `FooterFull`):

| Criterio | Estado código |
|----------|---------------|
| `overflow-x-clip`, `min-w-0`, `break-words` | OK |
| Links `min-h-11` mobile | OK |
| Grid 1 col → 2 (`sm`) → 12 (`lg`) | OK |
| `safe-area-inset-bottom` | OK |
| Rentals + sticky CTA | OK — `pb-24` en contenido; footer en flujo al scroll |
| Navbar sticky | OK — sin solapamiento con footer (orden DOM: main → footer) |

**Manual pendiente:** verificación visual 320/375/414 en dispositivo real (checklist smoke).

---

## 14. Accesibilidad

| Criterio | Estado |
|----------|--------|
| `role="contentinfo"` | OK |
| `aria-label` en navs y redes externas | OK |
| Foco visible | OK — `navFocusRing` |
| Próximamente | Badge + texto, no solo color |
| Placeholders no clickeables | OK |
| Teclado | OK en código; manual recomendado |
| Contraste | Aceptable en tokens del tema; WCAG formal opcional |

---

## 15. Documentación y checklist

| Documento | Estado |
|-----------|--------|
| `PUBLIC_FOOTER_AUDIT.md` | OK — Slices 1–5 + cierre bloque |
| `PUBLIC_FOOTER_SMOKE.md` | OK — guía QA |
| `Yo_Te_Invito_Checklist_V2_Produccion.md` § Footer | OK — ítems bloque `[x]`; post-bloque datos reales `[ ]` |
| `CONTEXT_PENDIENTES.md` | OK — referencias audit + smoke |
| `FRONTEND_CONTEXT.md` | OK — footer + API pública |
| `BACKEND_CONTEXT.md` | OK — `GET /public/platform-config` |

**Checklist vs realidad:** los ítems marcados completados corresponden a código entregado. Los pendientes post-bloque (Instagram, contacto real, legales publicados, QA físico) están explícitos y no deben marcarse aún.

---

## 16. Riesgos o deudas pendientes

| Prioridad | Ítem |
|-----------|------|
| Producto | Instagram, contacto y web/red desarrollador reales |
| Producto | Publicar documentos legales en `/admin/legales` |
| Producto | Persistir `instagramUrl` / `websiteUrl` en BD si se editan desde admin |
| Baja | `FOOTER_QUICK_LINKS` define `requiresAuth` en Mis tickets pero el link se muestra siempre (redirect en `/me` si no hay sesión) — aceptable |
| Baja | QA manual navegador no ejecutada en esta auditoría (solo código) |
| Fuera de bloque | Navbar global en portales mobile (doble chrome) — navbar audit, no footer |
| Fuera de bloque | Checkout minimal aún muestra pie legal — evaluar `hidden` si producto pide más foco |

---

## 17. Fixes aplicados durante la auditoría

**Ninguno.** No se detectaron errores evidentes que justifiquen cambio de código en esta pasada. La implementación coincide con documentación de slices 2–5.

---

## 18. Resultado final

| Dimensión | Resultado |
|-----------|-----------|
| Arquitectura | OK |
| Rutas / variantes | OK |
| UI full / minimal / hidden | OK |
| Legales | OK |
| Contacto público | OK |
| Sin regresión navbar | OK |
| Sin regresión portales | OK |
| Documentación | OK |

**Bloque Footer público completo: cerrado para V2** (OK con observaciones menores de producto y QA manual).

---

## 19. Próximos pasos recomendados

1. Ejecutar smoke manual (`PUBLIC_FOOTER_SMOKE.md`) en 375px y desktop; marcar ítems `[ ]`.
2. Cargar contacto real en `/admin/contactos` y verificar que el footer deja el placeholder.
3. Publicar slugs legales críticos (`terminos`, `privacidad`, `compras-cancelaciones-reembolsos`).
4. Al tener URLs reales, actualizar `FOOTER_SOCIAL_LINKS` / API o campos Prisma futuros.
5. Pasar al siguiente bloque del checklist producción V2 sin mini-slice footer.

---

## Referencias

- `docs/audits/PUBLIC_FOOTER_AUDIT.md`
- `docs/audits/PUBLIC_FOOTER_SMOKE.md`
- `docs/audits/NAVBAR_RESPONSIVE_AUDIT.md`
- `docs/legal/LEGAL_ADMIN_MODULE.md`
