# V3.1 Hotfix — className visible en descripciones públicas

**Fecha:** 2026-06-14  
**Síntoma:** Texto visible `text-base font-semibold text-white sm:text-lg` en fichas gastro/rentals.

---

## Causa

`RENTAL_DETAIL_SECTION_TITLE` en `rentalDetailUi.ts` guardaba **clases Tailwind**, no copy.  
`RentalDescriptionBlock` las pasaba a `PublicDescriptionBlock` como `sectionTitle` → se renderizaban como `<h2>`.

En `RentalProductDetailContent` la misma constante se usaba correctamente como `className` en «Galería».

## Fix

| Constante nueva | Uso |
|-----------------|-----|
| `RENTAL_DETAIL_SECTION_HEADING_CLASS` | `className` en `<h2>` |
| `RENTAL_DETAIL_DESCRIPTION_LABEL` | Texto «Detalle del producto» en rentals |

`PublicDescriptionBlock`: `sectionTitle={null}` oculta heading; default «Descripción».

Títulos por vertical:
- Gastro: «Propuesta gastronómica»
- Rentals: «Detalle del producto»
- Excursiones: heading externo «Sobre la excursión» (`sectionTitle={null}`)
- Eventos: `PublicDescriptionBlock` directo (default «Descripción»)

## QA manual

- [ ] `/gastronomicos/[id]`, `/restaurants/[id]` — sin clase Tailwind visible
- [ ] `/rentals/[id]` — «Detalle del producto»
- [ ] `/events/[id]`, `/excursiones/[id]`, `/hoteles/[id]` — sin regresión
- [ ] «Leer más» OK
