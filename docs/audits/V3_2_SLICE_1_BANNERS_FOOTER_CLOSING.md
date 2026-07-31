# V3.2 Slice 1 — Banners, subcategorías y footer (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Auditoría previa:** [`V3_2_VISUAL_DISCOVERY_AUDIT.md`](./V3_2_VISUAL_DISCOVERY_AUDIT.md)

---

## Objetivo

Mejoras visuales de bajo riesgo: protagonismo del hero de categoría, autoplay más rápido, quitar el heading “Subcategorías”, alinear verde del footer al accent principal `#16a34a`.

---

## Cambios

### Category hero

| Antes | Después |
|-------|---------|
| `h-[34vh] min-h-[220px] max-h-[320px]` | `h-[46vh] min-h-[320px] max-h-[440px]`; md `h-[50vh]` hasta `max-h-[520px]` |
| Autoplay `7000` ms inline | Constante `CATEGORY_HERO_AUTOPLAY_MS = 3500` |
| Título hasta `md:text-4xl`, desc `line-clamp-1` | Título hasta `md:text-5xl`, desc `line-clamp-2` |

Preservado: playlist editorial + publicaciones, dots, flechas, pausa en hover, loop, sin timer en `HomeHero`.

### Subcategorías

- Eliminado `<CategorySectionHeading title="Subcategorías" />` en `SubcategoryRail`.
- `aria-label="Subcategorías"` en el `<section>` para accesibilidad.
- Chips, scroll, empty/loading y filtros intactos.

### Footer

- `footerStyles.ts`: hovers de contacto/legales/crédito → `hover:text-accent` (antes `accent-soft`).
- `FooterInstagramHighlight`: textos/ícono/bordes hover en `text-accent` / `border-accent`; glows `rgba(22,163,74,…)` alineados a `--accent-rgb`.
- No se eliminó `accent-soft` del design system global.

---

## Archivos tocados

- `apps/web/components/categories/CategoryHeroBanner.tsx`
- `apps/web/components/categories/SubcategoryRail.tsx`
- `apps/web/components/footer/FooterInstagramHighlight.tsx`
- `apps/web/components/footer/footerStyles.ts`
- `docs/dev/Yo_Te_Invito_Checklist_V3_2_Mejoras_Visuales.md`
- `docs/audits/V3_2_SLICE_1_BANNERS_FOOTER_CLOSING.md` (este)

---

## Validaciones

```bash
pnpm --filter shared run build
pnpm --filter web run build
git diff --check
```

---

## QA manual

Pendiente en navegador:

- `/categoria/event|gastro|rental|excursion` — altura, autoplay ~3.5s, pause hover, dots/flechas
- Ausencia del título “Subcategorías” con chips operativos
- `/home` sin autoplay
- Footer en home/explore/ficha — verde alineado a botones

---

## Fuera de alcance

- Playlist / fuentes de banner
- Home autoplay
- Cards, reviews, GEO, Admin, bloqueo de categorías
