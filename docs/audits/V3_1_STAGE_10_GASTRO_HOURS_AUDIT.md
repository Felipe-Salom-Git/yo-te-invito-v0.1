# V3.1 Etapa 10 — Slice 10.1 — Auditoría horarios gastronómicos

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`  
**Alcance:** Solo auditoría y documentación (sin cambios funcionales en este slice).

---

## 1. Estado actual

Los locales gastronómicos (`GastroProfile`) persisten horarios en **JSON estructurado**, no en texto libre. El formato vigente es el mismo que rentals/excursiones operador: `RentalOpeningHours` (bloques `weekday` / `saturday` / `sunday` + `exceptions` por fecha).

| Capa | Estado |
|------|--------|
| Prisma | `openingHours` JSONB + `openingHoursNote` TEXT desde migración `20260520140000_gastro_local_discount_flow` |
| Shared | `gastro-locations.ts` valida con `rentalOpeningHoursSchema` |
| API portal | `GastroLocalService` create/update con `writeGastroOpeningHours` |
| API admin | `AdminGastroLocationsService` mismo patrón |
| API pública | `PublicGastroLocationsService.mapDetail` → `parseRentalOpeningHours` |
| Web formulario | `GastroLocalForm` + `OpeningHoursEditor` (3 bloques agrupados) |
| Ficha pública | `GastroLocationCard` → `RentalLocalCard` → `RentalOpeningHoursSummary` |

**No existe hoy:** horario independiente por día (lun–dom), modo simple/avanzado, cálculo abierto/cerrado, ni campo `openingHoursWeekly`.

---

## 2. Campos actuales

### Prisma — `GastroProfile`

| Campo | Tipo | Uso |
|-------|------|-----|
| `openingHours` | `Json?` | Horario estructurado `RentalOpeningHours` |
| `openingHoursNote` | `String?` | Nota libre opcional (máx. 500 en Zod) |

### Shared — `RentalOpeningHours`

```ts
{
  weekday: { isOpen: boolean; ranges: { open: "HH:mm"; close: "HH:mm" }[] },
  saturday: { ... },
  sunday: { ... },
  exceptions: { date: "YYYY-MM-DD"; label: string; isOpen: boolean; ranges: [...] }[]
}
```

Validación actual en `openingHoursRangeSchema`: **`open` debe ser estrictamente menor que `close`** → no admite franjas nocturnas (ej. 20:00–02:00).

`parseRentalOpeningHours` migra en lectura shapes legacy (`weekend` único, o días `monday`–`sunday` antiguos) al formato rental actual.

---

## 3. Formularios actuales

| Pantalla | Componente | Horario |
|----------|------------|---------|
| Portal `/gastro/local` | `GastroLocalForm` mode=`owner` | `OpeningHoursEditor` + nota |
| Admin `/admin/gastronomicos/nuevo` | `GastroLocalForm` mode=`admin` | Igual |
| Admin `/admin/gastronomicos/[id]/editar` | `GastroLocalForm` | Precarga `initial.openingHours` |

`OpeningHoursEditor` agrupa:
- **Lunes a viernes** (un bloque)
- **Sábado**
- **Domingo**
- Excepciones por fecha

Cada bloque: checkbox abierto/cerrado, una o más franjas, botón “+ Agregar horario”.

---

## 4. Ficha pública actual

| Ruta | Vista | Horario |
|------|-------|---------|
| `/restaurants/[id]` | `GastroLocationDetailView` | Sidebar `GastroLocationCard` |
| `/gastronomicos/[id]` | Misma vista con `locationId` | Igual |

Muestra líneas compactas vía `formatRentalOpeningHoursSummary`:
- `Lun a Vie · …`
- `Sáb · …`
- `Dom · …`
- Excepciones y nota si existen

**No hay** badge abierto/cerrado ni listado día a día.

Cards de discovery/listado **no** muestran horario (solo nombre, ciudad, banner).

---

## 5. Datos legacy

- Gastro siempre usó JSONB desde el inicio (`20260520140000`); rentals migró de TEXT a JSON en `20260519160000`.
- Datos existentes en `openingHours` son JSON `RentalOpeningHours` o shapes legacy parseables por `parseRentalOpeningHours`.
- `openingHoursNote` es texto libre complementario.
- No hay evidencia de horario en campo `description`/`detail` como sustituto estructurado.

---

## 6. Estrategia recomendada

### Mantener simple (actual)

- Conservar `openingHours` + `openingHoursNote` sin cambios destructivos.
- Formulario: opción **“Usar horario simple”** con `OpeningHoursEditor` actual.

### Agregar avanzado (opcional)

- Nuevo campo `openingHoursWeekly` JSONB con días `monday`–`sunday`, cada uno array de franjas `{ open, close }`.
- Nuevo campo `openingHoursMode`: `'simple' | 'weekly'` (default `'simple'`).
- Nota general: reutilizar `openingHoursNote` en ambos modos.
- Backend acepta ambos; respuesta pública incluye ambos + `mode`.
- Ficha pública: si `mode === 'weekly'` y hay datos → listado semanal + abierto/cerrado; si no → fallback a simple.

### Inferencia de modo

Preferir campo explícito `openingHoursMode` sobre inferir solo por presencia de JSON (más claro al editar y al hacer PATCH parcial).

---

## 7. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Datos existentes en `openingHours` | No migrar; default `mode=simple`; lectura sin cambio |
| Validación nocturna | Schema semanal separado que permita `close <= open` (cruza medianoche) |
| Solapamientos | Validar en shared con timeline extendido (48h) |
| Timezone | Usar `America/Argentina/Buenos_Aires` (mismo que eventos públicos) |
| UI mobile | Editor por día en acordeón; franjas en fila flexible |
| PATCH parcial borra horario | Solo actualizar campo del modo activo; no nullificar el otro al cambiar modo |
| JSON-LD / SEO | Revisar si `LocalBusiness` emite horarios (pendiente slice 10.6) |

---

## 8. Propuesta de slices siguientes

| Slice | Entregable |
|-------|------------|
| 10.2 | Migración Prisma, schemas shared, helpers, API, smoke |
| 10.3 | `WeeklyOpeningHoursEditor` + integración portal/admin |
| 10.4 | Múltiples franjas + validación nocturna/solapamiento |
| 10.5 | Copiar horario entre días |
| 10.6 | `getGastroOpenStatus` + ficha pública |
| 10.7 | Fallback legacy explícito |
| 10.8 | QA matriz + cierre checklist §27 |

---

## 9. Confirmación

- **Código funcional:** no modificado en Slice 10.1.
- **Solo documentación:** este archivo + actualizaciones menores de contexto si corresponde.
