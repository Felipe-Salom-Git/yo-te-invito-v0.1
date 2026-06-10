# V3.1 Etapa 12 — Slice 12.6 — Marca / SEO técnico

## Assets auditados

| Asset | Ruta | Estado |
|-------|------|--------|
| Favicon | `/brand/logo.png` | Existe (771×775) |
| OG image | `/brand/logo_2.png` | En `layout.tsx` metadata |
| Manifest | `/manifest.json` | Iconos brand |
| Apple touch | `/brand/logo.png` | metadata icons |

## Cambios

- `SiteOrganizationJsonLd` en `app/layout.tsx` — schema.org `Organization` con `name`, `url`, `logo`.
- Icons metadata: `icon`, `apple`, `shortcut` explícitos.

## Manual post-deploy

- GSC inspeccionar URL home.
- Rich Results Test Organization.
- Esperar recrawl (no garantiza logo en SERP de inmediato).

## Comandos

- `pnpm --filter web run build` — PASS
