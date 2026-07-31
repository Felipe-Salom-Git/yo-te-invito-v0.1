# V3.2 Slice 8 — Admin pendientes consolidados (cierre)

**Fecha:** 2026-07-31
**Rama:** `feat/v1-s03-api-foundation`
**Auditoría previa:** [`V3_2_VISUAL_DISCOVERY_AUDIT.md`](./V3_2_VISUAL_DISCOVERY_AUDIT.md) §10

---

## Decisión

Los módulos “Cola de eventos pendientes” y “Pendientes operativos” **no eran duplicados**:

| Fuente | Contenido |
|--------|-----------|
| `pendingEvents` | Eventos en aprobación (`PENDING`) |
| `draftEvents` | Borradores |
| `pendingGastroDiscounts` | Descuentos gastro en revisión/negociación |

**No se eliminó** `pendingEvents` ni se cambió `GET /admin/dashboard`.

Se unificó la UX en un solo bloque **Pendientes de revisión** con tabs.

---

## Implementación

### Nuevo

`AdminPendingReviewSection` — tabs:

1. Eventos para aprobar
2. Borradores
3. Descuentos gastro

- Contador total en el encabezado
- Tab por defecto: el primer tipo con ítems (prioridad aprobación)
- CTAs por tab hacia listados admin existentes
- Empty states por tab
- Ancla `#pendientes-revision`

### Ajustes

- `AdminDashboardClient` — un solo módulo de pendientes; botón header apunta al nuevo ancla
- `AdminPendingEventsQueue` — props opcionales `emptyTitle` / `emptyDescription`
- Eliminado `AdminOperationalPendingSection` (lógica absorbida; sin consumidores)

### Sin cambios

- Endpoint / contrato `AdminDashboardResponse`
- KPIs superiores
- Verticales / links operativos

---

## Archivos

| Archivo | Cambio |
|---------|--------|
| `AdminPendingReviewSection.tsx` | Creado |
| `AdminDashboardClient.tsx` | Composición unificada |
| `AdminPendingEventsQueue.tsx` | Empty copy configurable |
| `AdminOperationalPendingSection.tsx` | Eliminado |
| Checklist V3.2 | Slice 8 cerrado |
| Este documento | Cierre |

---

## Validaciones

```bash
pnpm --filter web run build
git diff --check
```

---

## QA manual

Pendiente:

- sin pendientes / solo PENDING / solo DRAFT / solo gastro / combinación
- mobile + teclado en tabs
