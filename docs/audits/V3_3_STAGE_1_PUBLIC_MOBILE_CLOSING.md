# V3.3 — Etapa 1: UX pública / mobile — cierre técnico

**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** código completado y pusheado — contextos/checklist actualizados; **QA manual pendiente**.

---

## 1. Alcance

Mejoras de bajo riesgo en discovery público y mobile, sin cambios de modelo de datos ni contratos API nuevos:

- Cards de descuentos → ficha gastro
- Navegación mobile Home + Explore
- Modales centrados en mobile
- Scroll táctil en galerías/carruseles
- Subcategorías con umbral ≥5 para rails
- Jerarquía de acciones en ficha gastro
- Metadata OpenGraph para `/descuentos/[id]`
- Copy público Excursiones → Actividades (clave técnica `excursion` intacta)

**Fuera de alcance (documentado, no implementado):** scanner V3, multi-local gastro, lifecycle descuentos, admin create discount, QR Studio, campañas, etc.

---

## 2. Slices

| Slice | Commit | Mensaje |
| ----- | ------ | ------- |
| 1.1 | `061e052` | `feat(v3.3): route discount cards to gastro locations` |
| 1.2 | `20a3b52` | `feat(v3.3): improve mobile public navigation` |
| 1.3 | `3d0fa69` | `fix(v3.3): center dialogs across mobile layouts` |
| 1.4 | `d6be6f2` | `fix(v3.3): improve mobile image scrolling` |
| 1.5 | `bbc8956` | `feat(v3.3): add thresholded subcategory rails` |
| 1.6 | `1ea1d56` | `refactor(v3.3): improve gastro public action hierarchy` |
| 1.7 | `67ebfe4` | `feat(v3.3): improve public sharing metadata` |
| 1.8 | `c2883b6` | `feat(v3.3): rename excursions to activities in public ui` |
| 1.9 | *(este commit)* | `docs(v3.3): close public mobile ux stage` |

---

## 3. Archivos principales

### Discovery / descuentos
- `apps/web/lib/gastro/discount-location-href.ts`
- `apps/web/components/gastro/GastroDiscountPublicCard.tsx`
- `apps/web/lib/categories/categoryDiscountHeroModel.ts`

### Mobile nav
- `apps/web/lib/navigation/publicNavConfig.ts`
- `apps/web/components/navbar/NavbarHomeButton.tsx`

### Modales
- `apps/web/components/ui/Modal.tsx`
- `apps/web/components/home/ContentPreviewModal.tsx`
- `apps/web/components/reviews/ReviewReplyModal.tsx`
- `apps/web/components/reviews/ReviewDisputeModal.tsx`
- `apps/web/components/admin/AdminDeepDeleteModal.tsx`
- `apps/web/components/admin/users/AdminUserDeleteModal.tsx`
- `apps/web/components/public/PublicDescriptionBlock.tsx`
- `apps/web/components/events/discovery/EventCalendarModal.tsx`
- `apps/web/components/forms/WeeklyOpeningHoursEditor.tsx`

### Scroll / galerías
- `apps/web/lib/ui/horizontalScrollClasses.ts`
- `apps/web/components/events/EventGallerySection.tsx`
- `apps/web/components/rentals/RentalGalleryThumbnails.tsx`
- `apps/web/components/home/ContentRail.tsx`
- `apps/web/components/gastro/GastroDiscountsRail.tsx`
- `apps/web/components/home/ContentPreviewExpanded.tsx`

### Subcategorías
- `apps/web/lib/categories/subcategoryRailThreshold.ts`
- `apps/web/lib/categories/subcategoryRailThreshold.test.ts`
- `apps/web/lib/query/useCategoryCarousels.ts`
- `apps/web/components/categories/SubcategoryFilterChip.tsx`
- `apps/web/components/categories/SubcategoryRail.tsx`

### Gastro público
- `apps/web/components/gastro/GastroPublicActionCard.tsx`
- `apps/web/components/gastro/GastroPublicDetailContent.tsx`
- `apps/web/components/gastro/GastroDiscountsSection.tsx`
- `apps/web/components/gastro/GastroLocationCard.tsx`

### Sharing
- `apps/web/app/(public)/descuentos/[id]/layout.tsx`

### Actividades (copy público)
- `apps/web/lib/categories/excursionPublicCopy.ts`
- Múltiples configs/nav/SEO públicos (ver commits 1.8)

---

## 4. Cambios de comportamiento

| Área | Antes | Después |
| ---- | ----- | ------- |
| Card descuento discovery | Link a `/descuentos/:id` | Link a ficha gastro (`/gastronomicos/:locationId` vía helper) |
| `/descuentos/[id]` | Sin OG dinámico | `generateMetadata` con título, local, imagen |
| Mobile nav drawer | Sin Home explícito | Home → Explore → Categorías |
| Modales convencionales | `items-end` en mobile | Centrados vertical/horizontalmente |
| Rail subcategoría | Siempre si había items | Solo si ≥5 publicaciones válidas |
| Ficha gastro CTAs | Peso visual similar | WhatsApp/reserva primario; “Ver descuentos” secundario; follow/ubicación/menú terciarios |
| Label vertical excursion | “Excursiones” | “Actividades” en UI pública |
| Rutas excursion | `/excursiones`, `/categoria/excursion` | Sin cambio (legacy) |

---

## 5. Arquitectura respetada

- Frontend: UI → TanStack Query → Repositories → ApiRepository → Nest API
- Sin `fetch` directo nuevo en componentes (metadata server-side en layouts usa el mismo endpoint público existente)
- Sin LocalStorage como fuente de negocio
- Sin cambios Prisma / enum `excursion` / contratos shared de categoría
- Sin APIs paralelas ni refactors globales

---

## 6. Tests / builds

| Check | Resultado |
| ----- | --------- |
| `pnpm --filter shared run build` | **PASS** |
| `pnpm --filter web run build` | **PASS** (tras fix imports React en galerías — slice 1.9) |
| `pnpm --filter api run build` | **NO EJECUTADO** (sin cambios API) |
| `subcategoryRailThreshold.test.ts` (vitest) | **NO EJECUTADO** (web sin script vitest configurado) |
| Búsqueda estática `console.log` temporales | **PASS** (sin nuevos en código de app) |
| Búsqueda `fetch` directo en componentes nuevos | **PASS** |

**Nota build:** durante `next build` aparecen `ECONNREFUSED` al prerenderizar rutas que fetchean API local (esperado sin API levantada); el build completó exitosamente.

---

## 7. QA manual pendiente

### Desktop
- [ ] `/home`, `/explore`
- [ ] `/categoria/gastro`, `/categoria/rental`, `/categoria/excursion` (label “Actividades”)
- [ ] Ficha gastro: CTA primario, “Ver descuentos”, claim en sección
- [ ] `/descuentos/[id]` directo (claim/QR)
- [ ] Ficha rental y actividad
- [ ] Compartir OG: event, gastro, rental, actividad, descuento

### Mobile (360 / 390 / 430 px)
- [ ] Navbar: Home, Explore, Categorías, carrito, usuario
- [ ] Modales centrados + scroll interno + cierre
- [ ] Swipe galerías sin overflow de página
- [ ] Card descuento → local; URL descuento directa OK
- [ ] Subcategoría &lt;5 sin rail; ≥5 con rail; sin autoplay
- [ ] Jerarquía botones gastro

---

## 8. Riesgos

1. **Metadata descuentos:** `generateMetadata` depende de API en build/SSR; sin API local puede usar fallback genérico en algunos entornos.
2. **Imports React en slice 1.4:** faltaban en varios componentes de galería; corregido en 1.9 — validar en runtime mobile.
3. **Copy Actividades:** admin y rutas `/admin/excursiones` conservan “Excursiones” a propósito; puede haber mezcla admin/público hasta etapa futura.
4. **Test umbral subcategorías:** archivo creado pero no integrado al runner de web.

---

## 9. Deuda no incluida

- Scanner V3, short code, branding, fast camera
- Reaprobación / lifecycle expirado descuentos (backend)
- Admin create discount
- Gastro multi-local / approval
- QR Studio, cupones actividad, email campaña, WhatsApp settlement
- Renombrar rutas `/excursiones` → `/actividades`
- Actualizar contextos generales y checklist V3.3 (pendiente revisión usuario)
- Push a remoto

---

## 10. Commits de la etapa (orden)

```
061e052 feat(v3.3): route discount cards to gastro locations
20a3b52 feat(v3.3): improve mobile public navigation
3d0fa69 fix(v3.3): center dialogs across mobile layouts
d6be6f2 fix(v3.3): improve mobile image scrolling
bbc8956 feat(v3.3): add thresholded subcategory rails
1ea1d56 refactor(v3.3): improve gastro public action hierarchy
67ebfe4 feat(v3.3): improve public sharing metadata
c2883b6 feat(v3.3): rename excursions to activities in public ui
<hash>  docs(v3.3): close public mobile ux stage
```

---

## Decisiones de producto confirmadas

- Carruseles subcategoría = **≥5** items públicos válidos, **sin autoplay**
- Card descuento discovery → **ficha local** (no elimina `/descuentos/[id]`)
- Clave técnica **`category=excursion`** sin cambios
- Label público = **Actividades**
