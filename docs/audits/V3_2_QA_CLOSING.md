# V3.2 — Cierre QA / documentación (Slice 11)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`

## Slices implementados

| Slice | Commit tema | Estado |
|-------|-------------|--------|
| 0 Auditoría | docs audit | Hecho |
| 1 Banners/footer | banners | Hecho |
| 8 Admin pending | admin | Hecho |
| 2 Cards | cards | Hecho |
| 3 Gastro cards | gastro cards | Hecho |
| 4 Ciudad combobox | combobox | Hecho |
| 5 Suggest search | suggestions | Hecho |
| 6 Caritas | faces | Hecho |
| 7 Mini mapa | map modal | Hecho |
| 9 Banner descuentos | gastro hero | Hecho |
| 10 Próximamente | availability | Hecho |

## Builds ejecutados

```bash
pnpm --filter shared run build
pnpm --filter api run build
pnpm --filter web run build
```

## QA manual pendiente

Smoke de checklist V3.2 (browser): banners, cards, descuentos, combobox, sugerencias, reviews, mapa modal, banner gastro, coming-soon público vs preview por rol (ADMIN / Productora / Gastro).

Hotfix preview owners: ver `V3_2_SLICE_10_COMING_SOON_CLOSING.md`.

## Reactivar Event/Gastro

`CATEGORY_PUBLIC_AVAILABILITY` → `'public'` + sitemap + quitar `comingSoon` en nav.
