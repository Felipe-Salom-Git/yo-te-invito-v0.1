# V3.2 Hotfix — Horarios gastro nocturnos (cierre)

**Fecha:** 2026-08-30  
**Rama:** `feat/v1-s03-api-foundation`  
**Commit:** `920c5d7` — `fix(gastro): support overnight opening hours validation`

---

## 1. Problema

Al guardar horarios semanales con franjas como:

```txt
12:00 → 16:00
20:00 → 00:00
```

la validación fallaba con *«La hora de apertura debe ser anterior a la de cierre»* porque `00:00` se comparaba como anterior a `20:00` en el mismo día.

Además, el error de horarios se mostraba bajo el campo **Provincia** (`GastroLocalForm` enrutaba `openingHours` → `locationError` → `provinceError`).

---

## 2. Regla vigente

| Rango | Interpretación |
|-------|----------------|
| `12:00 → 16:00` | Mismo día |
| `20:00 → 00:00` | Cierre al día siguiente (medianoche) |
| `20:00 → 02:00` | Cierre al día siguiente |

- Múltiples rangos por día (máx. 4).
- Cierre cruzando medianoche: `close < open` → intervalo overnight.
- Validación de superposición con rangos normalizados (`end += 24h` si overnight).
- `open === close` sigue inválido.

---

## 3. Cambios

| Área | Archivo | Cambio |
|------|---------|--------|
| Shared | `packages/shared/src/schemas/opening-hours.ts` | `normalizeTimeRange`, `isOvernightInterval`, helpers de solapamiento |
| Shared | `packages/shared/src/schemas/gastro-weekly-opening-hours.ts` | Usa helpers compartidos; `validateGastroWeeklyOpeningHoursForSubmit` |
| Web | `apps/web/components/gastro/GastroLocalForm.tsx` | Estado `hoursError` separado; mensaje bajo fieldset horarios; provincia no recibe error de horarios |
| API test | `apps/api/scripts/test-opening-hours.ts` | Matriz casos válidos/inválidos + overnight |

---

## 4. Tests

```bash
pnpm --filter api run test:opening-hours
pnpm --filter shared run build
pnpm --filter web run build
```

Smoke relacionado (Etapa 10 base): `pnpm --filter api run smoke:v31-gastro-weekly-hours`.

---

## 5. QA pendiente

- [ ] Guardar local gastro prod/staging con `20:00 → 00:00` + franja diurna.
- [ ] Confirmar que errores de horarios aparecen bajo horarios, no en Provincia.
- [ ] Deploy VPS si el commit aún no está en producción.

---

## 6. Referencias

- Etapa base: `docs/audits/V3_1_STAGE_10_GASTRO_HOURS_CLOSING.md`
- Smoke intervalos: `docs/audits/V3_1_STAGE_10_GASTRO_HOURS_INTERVALS_SMOKE.md`
