# V3.2 Slice 4 — Selector de ciudad buscable (cierre)

**Fecha:** 2026-07-31  
**Rama:** `feat/v1-s03-api-foundation`  
**Auditoría:** [`V3_2_VISUAL_DISCOVERY_AUDIT.md`](./V3_2_VISUAL_DISCOVERY_AUDIT.md) §6

---

## Objetivo

Permitir filtrar ciudades al escribir, persistiendo **solo** una opción del catálogo (sin inventar texto al blur), con teclado, vacíos claros y dependencia provincia → ciudad.

---

## Cambios

### `SearchableCombobox` (`components/ui/SearchableCombobox.tsx`)

- Input + listbox (ARIA combobox).
- Filtro vía `normalizeLocalityKey` (sin tildes/mayúsculas/espacios extra).
- Commit solo al elegir opción (mouse/touch/Enter).
- Blur / Escape / click fuera: revierte el texto al label seleccionado (no persiste inventos).
- Limpiar selección, empty state, flechas ↑↓.

### `ProvinceCitySelect`

- Ciudad pasa de `<Select>` nativo a `SearchableCombobox`.
- Provincia sigue select nativo.
- Fallback manual (`No encuentro mi localidad` + input) **preservado** (`allowManualLocality`, default `true`).
- Dedupe Georef / ARGENTINA intacto; hooks `useGeoProvinces` / `useGeoLocalities` sin cambio.

### `PreferredCitySelect` (registro comprador + `/me/account`)

- Combobox sobre catálogo `preferredCityOptions` (estricto al seleccionar).

### `ExploreCityFilter`

- Combobox sobre catálogo discovery (incluye “Todas las ciudades”).

### Normalización

- `lib/geo/locality-normalize.ts` — compartido UI + dedupe location.

---

## Cobertura de formularios

| Flujo | Cómo se beneficia |
|-------|-------------------|
| Registro comprador | `PreferredCitySelect` |
| Registro productora | N/A (sin ciudad) |
| Registro gastro / hotel | `ProvinceCitySelect` |
| Admin/Portal eventos, gastro, rentals, excursiones | `EventLocationFields` / `RentalLocationFields` / gastro fields → `ProvinceCitySelect` |
| Perfil `/me/account` | `PreferredCitySelect` |
| Explore | `ExploreCityFilter` |

---

## Fuera de alcance

- Cambiar payload API (sigue guardando labels).
- Quitar fallback manual en flujos que ya lo tenían.
- Schema Zod nuevo (validación existente de formularios).

---

## Validaciones

```bash
pnpm --filter shared run build
pnpm --filter web run build
git diff --check
```

---

## QA manual

Pendiente: buscar Bariloche parcial/sin tildes; inventar ciudad y blur; cambiar provincia; payload; mobile/teclado.
