# Reviews V2 — Smoke tests

Checklist para cerrar el bloque de valoraciones públicas + B2B.

## Prerrequisitos

```bash
pnpm db:migrate
pnpm --filter api exec prisma generate
pnpm --filter api run demo:seed          # admin@demo.local / demo
pnpm --filter api run demo:seed-curated  # eventos + gastro@demo.local
pnpm dev   # API :3001 + web :3000
```

Para cobertura automática casi completa: `demo:seed` + `demo:seed-curated` (crea admin y gastro). Productora/referido/B2B requieren `demo:load` o registro manual.

Usuarios demo habituales (password `demo`):

| Email | Rol |
|-------|-----|
| admin@demo.local | ADMIN |
| producer@demo.local | PRODUCER_OWNER |
| gastro@demo.local | GASTRO_OWNER |
| user@demo.local | USER |
| referrer@demo.local | REFERRER |

## Automatizado (API)

```bash
pnpm --filter api run smoke:reviews-v2
```

Cubre: listados públicos V2, `recommended`, sin filtrar `rankingScore`, `POST /me/reviews`, perfil usuario, productora (listado + reply), gastro summary, admin hide/restore/reply, B2B con 4 aspectos.

Los casos marcados **skip** no fallan el script (falta usuario demo o relación productora↔referido).

## Manual — UI

### 1. Reseña pública gastro

1. Iniciar sesión como `user@demo.local`.
2. Abrir ficha gastro (`/gastronomicos/[id]` o evento categoría gastro).
3. Completar formulario V2: 4 aspectos 1–10 + comentario (≥10 caracteres).
4. Verificar listado con desglose de aspectos y promedio /10.

### 2. Perfil comentarista

1. Ir a `/users/[userId]` del usuario que comentó.
2. Ver tier, promedio y listado de reseñas visibles.

### 3. Productora — comentarios y disputa

1. `producer@demo.local` → `/producer/comments`.
2. Ver resumen 1–10, filtros, aspectos en tarjetas.
3. Responder una reseña → réplica visible en ficha pública.
4. (Opcional) Solicitar revisión → estado `IN_REVIEW`; admin en `/admin/review-disputes` acepta/rechaza.

### 4. Gastro / hotel — réplica

1. `gastro@demo.local` → `/gastro/valoraciones` → responder (autor «Establecimiento»).
2. Si hay hotel demo → `/hotel/valoraciones`.

### 5. Ranking (sin exponer score interno)

1. `/categoria/gastro` → carruseles «Más recomendados» / «Mejor puntuados».
2. `/home` → carril «Más recomendados».
3. Detalle de evento: **no** debe mostrar `rankingScore` ni `bayesianRating`.

### 6. B2B separado de público

1. `producer@demo.local` → `/producer/referrals` → referido asociado.
2. Valoración comercial: 4 aspectos 1–10 + comentario.
3. Confirmar que **no** aparece en `/public/reviews` ni en fichas públicas.
4. `referrer@demo.local` → valorar productora (4 aspectos distintos).

## Criterio de cierre del bloque

- [x] `pnpm --filter api run smoke:reviews-v2` → **0 failed** (skips OK si faltan usuarios productora/referido)
- [ ] Manual 1–4 verificado en entorno local (UI)
- [x] Docs `REVIEWS_V2.md` y `CONTEXT_PENDIENTES.md` al día
- [x] Fix DI: `GastroModule` / `HotelModule` importan `ReviewsModule`

## Pendiente fuera de este bloque

- `viewCount` / `recentScore` para trending real
- Emails de notificaciones en disputas
