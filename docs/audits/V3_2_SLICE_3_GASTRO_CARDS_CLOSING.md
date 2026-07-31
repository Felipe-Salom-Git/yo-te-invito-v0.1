# V3.2 Slice 3 — Cards gastronómicas / descuentos (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Auditoría:** [`V3_2_VISUAL_DISCOVERY_AUDIT.md`](./V3_2_VISUAL_DISCOVERY_AUDIT.md) §5

---

## Objetivo

Corregir la presentación pública de descuentos (sin badge `Gratis`, beneficio tipado, vigencia semanal) y quitar la mini-preview de cupones en cards de locales.

---

## Cambios

### Helpers (`discount-status-ui.ts`)

| Helper | Comportamiento |
|--------|----------------|
| `formatGastroDiscountBenefit` | `PERCENT` → `N%`; `FIXED` → `$N` (nunca `%` automático) |
| `formatGastroDiscountValidityLabel` | `WEEKLY_RECURRING` → `Todos los {día}`; si no, rango/legacy vía `formatGastroDiscountValidityRangeLabel` |

### Card pública de descuento

- Eliminado badge verde hardcodeado `Gratis`.
- Compacta: título, local, beneficio, vigencia, summary.
- Hover: fragmento de `detail` si difiere del summary.
- CTA: sigue yendo a `/descuentos/[id]` (claim/QR intactos).

### Ficha `/descuentos/[id]`

- Beneficio y vigencia vía helpers.
- Prefijo `Recurrencia:` vs `Vigencia:` según modo.
- Local + claim form sin cambios de flujo.

### Sección en ficha de local

- `GastroDiscountsSection` reutiliza los mismos helpers (incluye weekly).

### Locales discovery (`ContentCard`)

- Removido render de `gastroPromoImageUrl` (esquina) y chip `Cupón · …`.
- Campos pueden seguir viniendo de la API; **solo UI** — no se borran descuentos ni se cambia claim/QR.

---

## Archivos

| Archivo | Cambio |
|---------|--------|
| `lib/gastro/discount-status-ui.ts` | Benefit + validity semanal |
| `components/gastro/GastroDiscountPublicCard.tsx` | Sin Gratis; layout Slice 3 |
| `components/gastro/GastroDiscountsSection.tsx` | Helpers compartidos |
| `app/(public)/descuentos/[id]/page.tsx` | Vigencia completa |
| `components/home/ContentCard.tsx` | Sin mini-preview |
| Checklist + este cierre | Docs |

---

## Fuera de alcance

- Banner gastro + descuentos (Slice 9).
- Emisión / claim / scanner QR.
- Dejar de adjuntar `gastroPromo*` en API (opcional; no requerido).

---

## Validaciones

```bash
pnpm --filter shared run build
pnpm --filter web run build
git diff --check
```

---

## QA manual

Pendiente: rango actual/futuro, weekly hoy/otro día, inactivo, local con/sin descuentos, mobile/desktop.
