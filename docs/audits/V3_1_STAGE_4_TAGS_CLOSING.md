# V3.1 Etapa 4 — Etiquetas / Tags — Cierre

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`

## 1. Objetivo

Etiquetas de contenido administrables, asignables en portales por vertical, visibles en discovery público y filtrables en Explorar.

## 2. Slices ejecutados

| Slice | Commit | Resumen |
| ----- | ------ | ------- |
| 4.1 | `586233d` | Modelo Prisma `ContentTag` / `EventTag`, API admin + público, smoke modelo |
| 4.2 | `ae9cd29` | UI Admin `/admin/etiquetas` |
| 4.3 | `d7f0349` | Tags en eventos de productora (API + formularios) |
| 4.4 | `99c6ec4` | Tags en gastro, excursiones y rentals (API + formularios) |
| 4.5 | *(este commit)* | `ContentTagChips` en modal, cards y fichas públicas |
| 4.6 | *(este commit)* | Filtro `?tag=slug` en `/explore` + `GET /public/events/search` |
| 4.7 | *(este commit)* | Doc cierre + checklist §23 |

## 3. Modelo y reglas

- Tags en `Event` vía `EventTag` (many-to-many).
- `categoryScope`: `null` = global; valor vertical = solo esa vertical + globales.
- Máximo **10** tags por publicación (`MAX_CONTENT_TAGS_PER_PUBLICATION`).
- Slug único por tenant; duplicados → 409 en admin.
- Gastro: tags en el `Event` público vinculado (`publicEventId`).

## 4. Superficies UI

| Área | Tags |
| ---- | ---- |
| Admin | `/admin/etiquetas` CRUD |
| Productora | Crear/editar evento |
| Gastro | `GastroLocalForm` (portal + admin) |
| Excursiones | Admin operador nuevo/editar + legacy editar |
| Rentals | Admin producto nuevo/editar |
| Público modal | `ContentPreviewModal` |
| Público cards | `ContentCard` (máx. 2 + contador) |
| Fichas | `/events`, `/excursiones`, `/rentals`, gastro |
| Explorar | `?tag=slug` + banner activo |

## 5. API pública relevante

- `GET /public/tags?tenantId&category` — selector y chips
- `GET /public/events/search?tag=slug` — filtro explorar
- Listados públicos (`list`, `search`, `trending`) incluyen `tags[]` en summaries

## 6. Comandos QA

```bash
pnpm --filter shared run build
cd apps/api && npx nest build
pnpm --filter web run build
pnpm --filter api run smoke:v31-tags-model   # requiere DB local
```

### Smoke manual (API levantada)

1. Crear tag `#Nieve` scope excursion en admin.
2. Asignar a una excursión → ver chips en ficha y card (home/categoría).
3. Click chip → `/explore?tag=nieve&category=excursion` con resultados filtrados.
4. Quitar filtro desde banner en Explorar.

## 7. Pendiente fuera de Etapa 4

- Admin: buscar publicaciones por etiqueta (listado filtrado).
- Hoteles: tags cuando vertical esté activa.
- Perfiles comerciales creando tags (hoy solo admin + selección).
