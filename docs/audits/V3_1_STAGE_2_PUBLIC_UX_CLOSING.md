# V3.1 Etapa 2 — Cierre UX pública

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`

## 1. Objetivo de la etapa

Corregir UX pública pendiente sin tocar backend: filtros más sutiles, buscador simplificado, copy de engagement en eventos, y reglas de fechas visibles en cards/modal/fichas.

## 2. Slices ejecutados

| Slice | Commit | Resumen |
| ----- | ------ | ------- |
| 2.1 | `style(web): refine public filter chips` | Chips pill horizontales, carrusel subcategorías, explore con chips de categoría |
| 2.2 | `refactor(web): simplify public search experience` | `PublicSearchBar` → `/explore?q=...`; home + explore compactos |
| 2.3 | `copy(web): clarify expected event action` | «Lo espero» → «Me interesa» + tooltip |
| 2.4 | `fix(web): hide public creation dates` | `shouldShowPublicEventDate` — sin fecha en gastro/rental/excursión |
| 2.5 | `fix(web): use event date in public event views` | Cards/modal/highlights usan `startAt` solo en `event` |
| 2.6 | `docs: close v31 stage 2 public ux` | Este documento + checklist |

## 3. Cambios principales

- **Filtros:** `SubcategoryFilterChip` / `SubcategoryRail` — pills `rounded-full`, borde liviano, scroll horizontal `snap-x`. Explore: fila de categorías + «Más filtros» colapsable.
- **Buscador:** `PublicSearchBar` (default | compact). Home debajo del hero; Explore reemplaza input pesado del formulario.
- **Me interesa:** `lib/engagement/expected-event-copy.ts`; `EventEngagementRow` + tab expected en `/me/preferences`.
- **Fechas:** `lib/public/publicContentDates.ts` + `contentCardPresentation` — fecha de card solo en eventos (`startAt`); `PlaceDetailView` oculta schedule en no-eventos.

## 4. Matriz QA

| Pantalla | Filtros | Buscador | Fechas | Copy | Build | Manual browser |
| -------- | ------- | -------- | ------ | ---- | ----- | -------------- |
| Home | N/A | Compact bar | Cards evento OK | N/A | ✓ | Pendiente |
| Explore | Chips + avanzados | `q` URL | Por categoría | N/A | ✓ | Pendiente |
| Categoría event | SubcategoryRail | N/A | `startAt` | N/A | ✓ | Pendiente |
| Categoría excursión | Multi-select chips | N/A | Sin fecha alta | N/A | ✓ | Pendiente |
| Gastro / rental | Rail | N/A | Sin fecha card | N/A | ✓ | Pendiente |
| Ficha evento | N/A | N/A | Schedule `startAt` | Me interesa | ✓ | Pendiente |
| Fichas gastro/rental/exc | N/A | N/A | Sin schedule evento | N/A | ✓ | Pendiente |
| `/me/preferences` expected | N/A | N/A | N/A | Me interesa | ✓ | Pendiente |

## 5. Decisión final — filtros

Chips horizontales con estado activo verde suave (`border-accent/50 bg-accent/15`). Subtítulos opcionales en subcategorías. Explore: categorías siempre visibles; ciudad/fechas/subcategoría en panel «Más filtros».

## 6. Decisión final — buscador

Input compacto por palabra clave redirige a `/explore?q=...`. Filtros avanzados permanecen en `/explore`. Sin modal fullscreen. Navbar global sin buscador en esta etapa (pendiente Etapa 3 si aplica).

## 7. Decisión final — «Me interesa»

| Antes | Después |
| ----- | ------- |
| «Lo espero» | **«Me interesa»** (activo: «✓ Me interesa») |
| Sin tooltip | «Guardalo para recibir novedades y recordatorios del evento.» |

Comportamiento: guarda en `/me/expected-events`; alertas según preferencias de notificaciones. No es lista de espera ni compra.

## 8. Reglas finales — fechas visibles

- **Eventos (`category === 'event'`):** mostrar `startAt` en cards, modal, highlights y ficha.
- **Gastro, rental, excursión, hotel:** no mostrar badge de fecha de evento ni `EventScheduleSection` en ficha place.
- **Admin / portal:** `createdAt` / `updatedAt` sin cambios.
- **Reviews:** fecha de reseña (`createdAt`) se mantiene — no es fecha de publicación del local.

## 9. Pendientes / riesgos

- QA manual en browser (mobile + desktop) no ejecutado en CI.
- Buscador en navbar/header global no implementado.
- Calendario tapando filtros en categoría eventos — no abordado en Etapa 2.
- Múltiples fechas de evento (§25) — fuera de alcance; solo `startAt` único.
- Producer dashboard copy histórico «lo espero» en analytics — no bloqueante.

## 10. Comandos ejecutados

```bash
pnpm --filter web run build
```

(`apps/web` no expone script `lint` separado; build incluye lint + typecheck.)
