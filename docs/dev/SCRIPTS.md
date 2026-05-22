# Scripts developer — referencia técnica (IA / dev)

**Guía principal en español:** [guides/DEVELOPER_SCRIPTS_GUIDE.md](../guides/DEVELOPER_SCRIPTS_GUIDE.md)  
**Smokes y E2E:** [guides/SMOKE_TESTS_GUIDE.md](../guides/SMOKE_TESTS_GUIDE.md)  
**Índice:** [guides/README.md](../guides/README.md)

**Regla:** pago demo sí · datos demo automáticos no · usuario maestro `felipe.e.salom@gmail.com`

---

## Tabla rápida (raíz + api)

| Comando | Riesgo | DB |
|---------|--------|-----|
| `pnpm dev` / `dev:api` / `dev:web` / `dev:scanner` | Bajo | No |
| `pnpm db:generate` / `db:migrate` / `db:up` / `db:down` / `db:studio` | Bajo–Medio | Schema/infra |
| `pnpm db:cleanup-content` | Medio | Sí (preserva Felipe) |
| `pnpm db:reset-dangerous -- --confirm` | Alto | Toda la BD |
| `pnpm db:seed` | Medio | Opt-in env |
| `pnpm --filter api run seed:subcategories` | Bajo | Catálogo |
| `pnpm --filter api run user:*` | Bajo–Medio | Ver guía |
| `pnpm --filter api run smoke:*` | Bajo–Alto | Ver SMOKE_TESTS_GUIDE |
| `pnpm --filter api run smoke:referrals` | Alto | Referidos V2 — productor + referido + evento |
| `pnpm --filter api run test:referral-*` | No | Util % / propuestas / solicitudes pago |
| `pnpm --filter api run smoke:cleanup` | Medio | Artefactos smoke |
| `pnpm e2e:portal` / `e2e:notifications` | Bajo* | E2E UI |

\* Requiere `E2E_USER_EMAIL` + `E2E_USER_PASSWORD`.

---

## Eliminados

`demo:seed`, `demo:load`, `db:reset`, `smoke` (sin sufijo), `smoke:reviews-v2` — ver [guides/DEMO_REMOVAL.md](../guides/DEMO_REMOVAL.md).

---

## Legacy

Planes y slices históricos: [legacy/guides/](../legacy/guides/README.md).
