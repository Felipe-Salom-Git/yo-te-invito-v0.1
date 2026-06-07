# V3.1 Slice 10 — Category editorial banners smoke

**Fecha:** 2026-06-14  
**Alcance:** Banners editoriales por categoría (admin CRUD + público ordenado). Sin Getnet/pagos.

## Decisión de modelo

- **Nuevo:** `CategoryEditorialBanner` (imagen GCS, título, subtítulo, CTA opcional, `isActive`, `sortOrder`).
- **Conservado:** `CategoryBannerItem` (picker de eventos destacados, máx. 5).
- **Prioridad pública:** editorial activo → hero; si no hay editorial → eventos (manual/automático).

## Migración

`20260614120000_category_editorial_banners` — tabla + índices + `AuditAction` (CREATED/UPDATED/ACTIVATED/DEACTIVATED/REORDERED).

## Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| GET | `/admin/category-editorial-banners?category=` | Lista admin (activos e inactivos) |
| POST | `/admin/category-editorial-banners` | Crear |
| PATCH | `/admin/category-editorial-banners/:id` | Editar / activar / desactivar |
| POST | `/admin/category-editorial-banners/:id/reorder` | Subir/Bajar (`direction: up\|down`) |
| GET | `/public/category-editorial-banners?tenantId=&category=` | Activos ordenados (máx. 5) |

Event banners sin cambios: `/admin/category-banners`, `/public/category-banners`.

## Smoke automatizado

```bash
pnpm db:up
cd apps/api && pnpm exec prisma migrate deploy
pnpm --filter api run smoke:v31-category-banners
```

**Cubre:** seed 2 banners, orden público, edición, swap reorder, desactivar/reactivar, audit sample, cleanup.

## Smoke manual UI

| Ruta | Verificar |
|------|-----------|
| `/admin/categorias` → tab vertical → **Banner de categoría** | Crear banner (GCS), editar, vista previa, ↑↓, desactivar con confirmación |
| `/categoria/event` | Hero editorial si hay activos; si no, eventos/fallback vacío |
| `/categoria/gastro` | Idem |
| `/categoria/rental` | Idem |
| `/categoria/excursion` | Idem |
| `/categorias` | Gateway sin regresión (hotel Próximamente) |
| `/home` | Sin duplicar hero (no consume editorial en V3.1) |

## CTA

- Etiqueta + enlace obligatorios juntos o ninguno.
- Rutas internas `/…` o URL `http(s)://` validada (`safeCtaHrefOptionalSchema`).
- Externos: `target="_blank"` + `rel="noopener noreferrer"`.

## Riesgos pendientes

- Home no muestra banners editoriales (solo landings `/categoria/*`).
- `imageObjectKey` opcional; sin cleanup GCS al desactivar (patrón global de orphans).
- Máximo 5 banners por categoría (admin + público).
