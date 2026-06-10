# V3.1 Etapa 4 — Slice 4.1 — Content tags model smoke

## Objetivo

Validar modelo Prisma, normalización, servicio admin/público y utilidades evento↔tags.

## Comando

```bash
pnpm --filter shared run build
cd apps/api && npx prisma generate
cd apps/api && npx prisma migrate deploy   # si hay DB local
pnpm --filter api run smoke:v31-tags-model
```

## Checks

| Check | Esperado |
|-------|----------|
| Tablas `ContentTag`, `EventTag` | Existen post-migración |
| Unique `tenantId + slug` | Índice presente |
| `#Nieve` → name `Nieve`, slug `nieve` | Normalización OK |
| Duplicado `Nieve` | 409 Conflict |
| Scope `excursion` | Persistido |
| Archivar | `isActive=false` |
| Público | Tag archivada no listada |
| Restaurar | Visible en filtro `category=event` |
| `validateEventTagIds` + `syncEventTags` | Relación evento↔tag OK |

## Endpoints (smoke manual opcional con API levantada)

- `GET /admin/tags` — admin JWT
- `POST /admin/tags` — crear
- `PATCH /admin/tags/:id` — editar
- `POST /admin/tags/:id/archive` / `restore`
- `GET /public/tags?tenantId=...&category=event`

## Etapas siguientes (cerradas)

- 4.2 UI Admin `/admin/etiquetas`
- 4.3–4.4 Formularios por vertical
- 4.5–4.6 Display público + filtro `/explore?tag=`
- Cierre: `docs/audits/V3_1_STAGE_4_TAGS_CLOSING.md`
