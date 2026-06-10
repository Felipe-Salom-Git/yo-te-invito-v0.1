# V3.1 Etapa 12 — Slice 12.1 — Drag & drop galería

## Alcance

- Componente reutilizable `SortableImageList` (`apps/web/components/upload/SortableImageList.tsx`).
- Integrado en `RentalProductImagesForm` (HTML5 drag desktop + botones Subir/Bajar + eliminar).
- Afecta automáticamente: rentals productos, productora imágenes, gastro local, hotel portal, excursiones admin, descuentos gastro con galería.

## QA esperado

| Caso | Estado |
|------|--------|
| Subir varias imágenes | Manual pendiente browser |
| Reordenar drag & drop (desktop) | Manual |
| Reordenar botones fallback | Manual |
| Guardar y reabrir formulario | Manual |
| Galería pública respeta `sortOrder` | Sin cambio backend — orden array → `sortOrder` existente |
| Mobile (botones fallback) | Manual |
| GCS upload no roto | Build OK |

## Comandos

- `pnpm --filter web run build` — PASS

## Pendiente Slice 12.2+

- Touch drag nativo limitado en mobile — botones accesibles como fallback.
