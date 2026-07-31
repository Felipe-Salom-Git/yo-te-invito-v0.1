# V3.2 Slice 2 — Cards públicas por vertical (cierre)

**Fecha:** 2026-07-31
**Rama:** `feat/v1-s03-api-foundation`
**Auditoría:** [`V3_2_VISUAL_DISCOVERY_AUDIT.md`](./V3_2_VISUAL_DISCOVERY_AUDIT.md) §4

---

## Objetivo

Simplificar la vista compacta de `ContentCard` (título, resumen, etiquetas, valoración) y mover localidad/fecha/schedule/precio a hover y modal, con matriz explícita por vertical.

---

## Matriz implementada

| Vertical | Compacta | Hover (md+) | Modal |
|----------|----------|-------------|-------|
| Eventos | Título, resumen, badge, tags, ★ | Fecha, venue·city, productora, desc, precio, CTA Comprar | Sin cambio mayor (fecha/location/desc/CTA) |
| Gastro | Título, resumen, badge, tags, ★ (+ mini-promo diferida a Slice 3) | City/location, desc, CTA Ver local | Summary/desc + location |
| Rental | Título, resumen, badge Alquiler, tags, ★ | Local·city, CTA alquiler, desc | CTA rental preservado |
| Excursión | Título, resumen, badge, tags, ★ | Location, schedule, desc, CTA | Intacta |
| Hotel | Misma matriz genérica si aparece en rails | Location + desc | Intacta |

### Compacta — oculto

- Ciudad / localidad / provincia
- Bloque fecha poster (eventos)
- Precio
- ProducerMeta / schedule / CTA rental como línea meta
- Descripción extensa (solo resumen truncado)

### Gastro mini-preview

**No eliminada** en este slice (reservado Slice 3). Sigue `gastroPromoImageUrl` / `gastroPromoLabel`.

---

## Implementación

- `getContentCardPresentation` / `getContentCardCompactSummary` / `resolveContentCardVertical` en `contentCardPresentation.ts`
- `ContentCard` consume la matriz
- `ExpandedContentCardOverlay` recibe `presentation` + `startAt` para fecha en hover
- Modal: body usa `description || summary` para todas las verticales
- Glow hover card alineado a accent `#16a34a`

---

## Archivos

| Archivo | Cambio |
|---------|--------|
| `lib/home/contentCardPresentation.ts` | Matriz + compact summary |
| `components/home/ContentCard.tsx` | Compacta simplificada |
| `components/home/ExpandedContentCardOverlay.tsx` | Hover por vertical |
| `components/home/ContentPreviewModal.tsx` | Summary fallback en body |
| Checklist + este cierre | Docs |

---

## Validaciones

```bash
pnpm --filter shared run build
pnpm --filter web run build
git diff --check
```

---

## QA manual

Pendiente: Home, Explore, categorías, rails; evento/gastro/rental/excursión; mobile sin hover; modal teclado.
