# V3.1 Etapa 13 — Slice 13.2 — Gastro card subtitles

**Fecha:** 2026-06-10  
**Estado:** Cerrado (código + build; QA visual browser pendiente manual)

## Problema

En carruseles/cards gastro, a veces el subtítulo bajo el título mostraba solo la ciudad (`San Carlos de Bariloche`) en lugar de la propuesta/descripción del local.

## Decisión UX

| Línea | Contenido |
|-------|-----------|
| Título | Nombre del restaurant/local |
| Subtítulo principal | `summary` → `description` → `Restaurant · {subcategoryName}` → `city` (fallback) |
| Metadata menor | Ciudad (si no es ya el subtítulo) |

## Helper centralizado

`apps/web/lib/home/contentCardPresentation.ts`:

- `getGastroCardSubtitleLine`
- `getGastroCardCityMetaLine`
- `getContentCardSubtitleLine` (gastro vs otras verticales)
- `getContentCardMetaLine` — gastro devuelve ciudad como tercera línea

## Componentes actualizados

- `ContentCard.tsx` — subtítulo + ciudad como meta
- `ExpandedContentCardOverlay.tsx` — hover desktop gastro
- `ContentPreviewModal.tsx` — cuerpo con `summary`/`description`; ciudad separada

## Links gastro (sin cambio)

Discovery cards → `/restaurants/[publicEventId]` (`getContentDetailHref`).  
Admin canónico → `/gastronomicos/[profileId]`.

## Rutas a probar

Home carruseles, `/categoria/gastro`, `/explore?category=gastro`, modal preview, cards con/sin descripción, con rating/descuento.

## Regresión

Eventos, excursiones y rentals sin cambio de prioridad de metadata.

## Comandos

```bash
pnpm exec nx run web:lint   # OK 2026-06-10
pnpm exec nx run web:build  # OK 2026-06-10
```
