# V3.1 Etapa 12 — Cierre extras no bloqueantes

## Objetivo

Cerrar extras V3.1: galería DnD, hoteles archivar, cards excursiones, maps copy, links seguros, SEO marca.

## Slices

| Slice | Tema | Doc smoke |
|-------|------|-----------|
| 12.1 | Drag & drop galería | `V3_1_STAGE_12_GALLERY_DRAG_DROP_SMOKE.md` |
| 12.2 | Hoteles archivar | `V3_1_STAGE_12_ADMIN_HOTEL_ARCHIVE_SMOKE.md` |
| 12.3 | Cards horario excursión | `V3_1_STAGE_12_EXCURSION_CARD_SCHEDULE_SMOKE.md` |
| 12.4 | Maps excursiones | `V3_1_STAGE_12_EXCURSION_MAPS_SMOKE.md` |
| 12.5 | Links relacionados | `V3_1_STAGE_12_RELATED_LINKS_SMOKE.md` |
| 12.6 | SEO marca | `V3_1_STAGE_12_BRAND_SEO_SMOKE.md` |
| 12.7 | QA cierre | Este doc |

## QA por bloque

| Bloque | Build | Manual browser |
|--------|-------|----------------|
| Galería DnD | OK | Pendiente |
| Hoteles admin | OK | Pendiente |
| Cards excursión | OK | Pendiente |
| Maps | OK (previo + copy) | Pendiente |
| Links | OK | Pendiente |
| SEO | OK | curl/GSC manual |

## Comandos ejecutados

- `pnpm --filter shared run build` — PASS
- `pnpm --filter api` nest build — PASS
- `pnpm --filter web run build` — PASS

## Pendientes / riesgos

- Migración DB aplicar en entorno con `prisma migrate deploy`.
- `prisma generate` EPERM si dev server bloquea DLL Windows.
- QA manual browser §19.2 checklist sigue pendiente global.
- Touch drag galería: solo fallback botones en mobile.

## Recomendación V3.2

- Palabras cliqueables inline (descartado por seguridad — links bloque OK).
- Extender `relatedLinks` a eventos/rentals si negocio lo pide.
- Touch DnD galería con librería liviana si UX lo requiere.
