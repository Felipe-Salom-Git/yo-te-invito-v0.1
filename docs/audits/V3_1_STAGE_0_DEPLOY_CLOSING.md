# V3.1 Etapa 0 — Deploy técnico y cierre pre-QA

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`  
**Commit pusheado:** `892f611` (`docs: close v31 stage 13 visual hotfixes`)  
**Estado:** **Parcial** — push OK; deploy VPS pendiente ejecución manual (SSH sin clave en entorno agente)

---

## Estado general

| Campo | Valor |
|-------|--------|
| Estado | Parcial — listo para deploy manual en VPS |
| VPS | `179.43.124.145:5230` — usuario `deploy` — `/opt/yoteinvito` |
| Dominios | `yoteinvito.club`, `api.yoteinvito.club`, `scanner.yoteinvito.club` |
| ¿Merge a `main`? | **No** |

---

## Slice 0.1 — Auditoría repo

| Ítem | Resultado |
|------|-----------|
| Rama | `feat/v1-s03-api-foundation` ✓ |
| Working tree | Limpio ✓ |
| Commits ahead (pre-push) | 77 → pusheados |
| Secretos en staging | No detectados |
| Migraciones nuevas desde pre-deploy | `20260610140000_stage_12_hotel_audit_related_links` (+ etapas 5–11 en repo, 88 total) |
| Documentación | Etapas 11–13 cerradas; Etapa 0 este doc |

**Bloqueantes pre-push:** ninguno  
**No bloqueantes:** QA manual browser; publicación legales; webhook Getnet

---

## Slice 0.2 — Builds y smokes (local, 2026-06-10)

| Check | Resultado | Nota |
|-------|-----------|------|
| shared build | PASS | nx cache |
| api build | PASS* | `nest build` OK; `prisma generate` EPERM con `pnpm run -w dev` activo (lock Windows) |
| web build | PASS | 118 rutas |
| scanner build | PASS | |
| prisma migrate deploy (local) | PASS | Aplicada `20260610140000_*` pendiente |
| smoke:v31-stabilization | PASS | SKIP admin PATCH sin credenciales |
| smoke:v31-subcategories | PASS | |
| smoke:v31-admin-archive | PASS | |
| smoke:v31-category-banners | PASS | |
| smoke:v31-admin-gastro-discovery | PASS | |
| smoke:v31-event-publication-legal | SKIP | No ejecutado (requiere credenciales admin) |
| smoke:v31-gastro-weekly-hours | SKIP | No ejecutado en esta tanda |
| smoke:v31-ticket-transfer-flow | SKIP | No ejecutado (destructivo sin SMOKE_*) |
| smoke:v31-ticket-date-change | SKIP | No ejecutado |
| smoke:v31-event-occurrences | SKIP | No ejecutado |

---

## Slice 0.3 — Push

| Ítem | Resultado |
|------|-----------|
| Rama pusheada | `feat/v1-s03-api-foundation` ✓ |
| Rango remoto | `9b85882..892f611` |
| ¿Se tocó `main`? | No |

---

## Slice 0.4 — Deploy VPS

**Estado:** NO EJECUTADO desde agente (`Permission denied (publickey)`).

Health **pre-deploy** (código anterior en VPS, 2026-06-10):

| Servicio | HTTP |
|----------|------|
| Web | 200 OK |
| API `/health` | 200 OK |
| Scanner | 200 OK |

### Comandos a ejecutar en VPS (deploy manual)

```bash
ssh -p 5230 deploy@179.43.124.145
cd /opt/yoteinvito
git fetch origin
git checkout feat/v1-s03-api-foundation
git pull origin feat/v1-s03-api-foundation
pnpm install --frozen-lockfile
cd apps/api && npx prisma generate && cd ../..
cd apps/api && npx prisma migrate deploy && npx prisma migrate status && cd ../..
pnpm build
sudo systemctl restart yti-api yti-web yti-scanner
sudo systemctl status yti-api yti-web yti-scanner --no-pager
curl -I https://yoteinvito.club
curl -I https://api.yoteinvito.club/health
curl -I https://scanner.yoteinvito.club
```

**Migración esperada en VPS:** verificar si `20260610140000_stage_12_hotel_audit_related_links` y migraciones Etapas 5–11 están pending.

---

## Slice 0.5 — Reparaciones operativas (post-migrate VPS)

Ejecutar tras `migrate deploy`:

```bash
# Gastro ACTIVE sin publicEventId
sudo -u postgres psql -d yo_te_invito -c \
  'SELECT id, "displayName", status, "publicEventId" FROM "GastroProfile" WHERE status = '\''ACTIVE'\'' AND "publicEventId" IS NULL;'

# Migraciones recientes
sudo -u postgres psql -d yo_te_invito -c \
  'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 15;'

# Usuario maestro
cd /opt/yoteinvito
pnpm --filter api run user:inspect -- --email felipe.e.salom@gmail.com
# Si hace falta: pnpm --filter api run user:restore-master
```

**Legales:** no auto-publicar. Revisar en `/admin/legales` estado DRAFT/PUBLISHED.

---

## Slice 0.6 — Smoke técnico post-deploy (VPS)

Tras restart, en VPS:

```bash
cd /opt/yoteinvito
pnpm --filter api run smoke:v31-stabilization
pnpm --filter api run smoke:v31-subcategories
pnpm --filter api run smoke:v31-admin-archive
pnpm --filter api run smoke:v31-category-banners
pnpm --filter api run smoke:v31-admin-gastro-discovery
```

---

## Pendientes post-deploy

| Pendiente | Bloqueante deploy | Bloqueante QA |
|-----------|-------------------|---------------|
| Deploy VPS manual | Sí | Sí |
| QA manual browser (`V3_1_STAGE_0_MANUAL_QA_SERVER_CHECKLIST.md`) | No | Sí |
| Publicación legales reales (cliente) | No | Parcial |
| Webhook Getnet pago real | No | No (demo OK) |
| Scanner móvil puerta real | No | Parcial |
| GSC / Rich Results | No | No |

---

## Decisión `main`

No mergear a `main` hasta QA manual aprobado en servidor.

---

## Resultado final

- **Push:** completado — rama remota actualizada a `892f611`.
- **Deploy VPS:** pendiente ejecución manual con SSH `deploy@179.43.124.145:5230`.
- **QA manual:** puede iniciarse **después** del deploy VPS y health checks post-restart.

Ver checklist operativa: `docs/audits/V3_1_STAGE_0_MANUAL_QA_SERVER_CHECKLIST.md`.
