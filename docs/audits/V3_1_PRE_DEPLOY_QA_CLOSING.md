# V3.1 Pre-Deploy QA Closing — Slice 14

**Fecha:** 2026-06-14  
**Rama activa:** `feat/v1-s03-api-foundation`  
**Alcance:** Estabilización, smokes, builds, documentación pre-deploy. **Sin features nuevas.** Getnet/pagos no tocados.

---

## 1. Resumen Slices 0–13

| Slice | Tema | Estado |
|-------|------|--------|
| 0 | Auditoría funcional | ✓ Doc |
| 1 | Hints imagen + contadores | ✓ |
| 2 | Dark global, leer más, badges, calendario mobile | ✓ |
| 3 | Menú/categorías + detalle excursión | ✓ |
| 4 | Resúmenes 500 / subtítulo 400 | ✓ |
| 5 | Galería Subir/Bajar | ✓ |
| 6 | Links externos gastro/excursiones | ✓ + migración |
| 7 | Horarios/ubicación excursiones | ✓ + migración |
| 7.5 | Smoke post-migraciones 6+7 | ✓ |
| 8 | Subcategorías múltiples (excursiones) | ✓ + migración |
| 8.5 | Smoke subcategorías | ✓ |
| 9 | Admin archivar/dar de baja | ✓ + migración |
| 10 | Banners editoriales admin | ✓ + migración |
| 11 | Wizard productora 3 pasos | ✓ |
| 12 | Legal publicación Caso B (informativo) | ✓ |
| 13 | Ratings 5/5 visual + ContentCard fase 1 | ✓ |
| **14** | **QA integral pre-deploy** | **Este documento** |

---

## 2. Migraciones V3.1

| Migración | Slice | Estado local |
|-----------|-------|--------------|
| `20260610120000_external_links_gastro_excursion` | 6 | ✓ Aplicada |
| `20260611120000_excursion_schedule_fields` | 7 | ✓ Aplicada |
| `20260612120000_event_subcategories` | 8 | ✓ Aplicada |
| `20260613120000_admin_content_lifecycle_audit` | 9 | ✓ Aplicada |
| `20260614120000_category_editorial_banners` | 10 | ✓ Aplicada |

**Total migraciones en repo:** 78  
**`prisma migrate deploy`:** OK — no pending  
**`prisma migrate status`:** `Database schema is up to date!`  
**Migraciones adicionales:** ninguna detectada fuera de la lista V3.1.

---

## 3. Comandos ejecutados (2026-06-14)

```bash
pnpm db:up                                          # OK — postgres running
cd apps/api && pnpm exec prisma migrate deploy      # OK — no pending
cd apps/api && pnpm exec prisma migrate status       # OK — up to date
pnpm db:generate                                    # OK
pnpm exec nx run shared:build                       # OK
pnpm exec nx run api:lint                           # OK
pnpm exec nx run api:build                          # OK
pnpm exec nx run web:lint                           # OK
pnpm exec nx run web:build                          # OK (ECONNREFUSED en SSG fetch — API no levantada; build exitoso)
```

---

## 4. Smokes V3.1

| Script | Resultado | Notas |
|--------|-----------|-------|
| `smoke:v31-stabilization` | **PASS** (exit 0) | DB: columnas, CRUD links/schedule OK. **SKIP** PATCH/API HTTP (`fetch failed` — API no levantada). Aceptable: lógica DB validada. |
| `smoke:v31-subcategories` | **PASS** (exit 0) | DB: junction, primary, filtros OK. **SKIP** API detail HTTP. Aceptable. |
| `smoke:v31-admin-archive` | **PASS** (exit 0) | DB: pause/restore, operator inactive filter. |
| `smoke:v31-category-banners` | **PASS** (exit 0) | DB: CRUD editorial, reorder, deactivate. |

### Smokes con API levantada (opcional pre-deploy)

Si se quiere validar endpoints HTTP admin:

```bash
pnpm --filter api run start:dev   # o pnpm dev:api
# En otra terminal, con credenciales admin o SMOKE_ALLOW_DEV_AUTH=1:
pnpm --filter api run smoke:v31-stabilization
pnpm --filter api run smoke:v31-subcategories
```

**Auth skip:** cuando API no corre o no hay JWT admin, PATCH/detail HTTP → SKIP (no falla el smoke). Documentado en Slice 7.5/8.5.

---

## 5. Seed subcategorías

```bash
pnpm --filter api run seed:subcategories
```

| Criterio | Decisión |
|----------|----------|
| ¿Requerido para deploy? | **No** si prod ya tiene subcategorías |
| ¿Destructivo? | **No** — idempotente, solo agrega faltantes |
| ¿Demo automático? | **No** reintroducido |
| ¿Cuándo correr? | DB nueva o tenant sin subcategorías excursiones |

---

## 6. QA manual — checklists (pendiente ejecución en browser)

### 6.1 Discovery público

| Ruta | Validar |
|------|---------|
| `/`, `/home` | Dark global, carruseles, cards editoriales, ratings `/5` |
| `/categorias` | Gateway, hotel Próximamente |
| `/explore` | Grid cards, sin scroll horizontal |
| `/categoria/event` | Hero editorial o fallback eventos, subcategorías |
| `/categoria/gastro` | Idem |
| `/categoria/rental` | CTA alquiler, sin layout evento |
| `/categoria/excursion` | Subcategorías múltiples en filtros |

### 6.2 Fichas públicas

| Ruta | Validar |
|------|---------|
| `/events/[id]` | Leer más, rating 5/5, archivado oculto |
| `/excursiones/[id]` | Horarios, punto encuentro, links, ubicación override/heredada |
| `/gastronomicos/[id]`, `/restaurants/[id]` | Links externos, rating 5/5 |
| `/rentals/[id]` | Sin layout evento, galería orden |
| `/hoteles/[id]` | Próximamente / ficha si aplica |

### 6.3 Admin

| Ruta | Validar |
|------|---------|
| `/admin/eventos` | Archivar/restaurar |
| `/admin/gastronomicos` | Suspender/activar |
| `/admin/rentals` | Desactivar/activar local |
| `/admin/excursiones` | Desactivar/activar operador |
| `/admin/categorias` | Banners editoriales CRUD, GCS, ↑↓, fallback eventos |
| `/admin/auditoria` | Logs lifecycle + banners |

### 6.4 Productora

| Ruta | Validar |
|------|---------|
| `/producer/events/new?mode=ticketed` | Wizard 3 pasos, hints, cover GCS |
| `/producer/events/new?mode=publicity` | Idem |
| `/producer/events/[id]/edit` | Datos persisten entre pasos, enviar revisión |
| `/producer/events/[id]` | Ticket types/tandas post-guardado |

### 6.5 Legal

- `producer_terms` → DRAFT salvo publicación manual en `/admin/legales`.
- Paso 3 wizard → aviso informativo, **sin** bloqueo.
- `/legal/productores` → según versión publicada/disponible.

### 6.6 Ratings / cards

- Público muestra `X.X/5`.
- Admin reportes siguen escala interna 1–10.
- Formularios review sin cambio escala interna.
- Mobile carruseles sin rotura.
- JSON-LD `bestRating: 5` → **pendiente**.

### 6.7 Maps

| Item | Estado |
|------|--------|
| Maps operador/productor local | Validar manual |
| Fallback manual sin key | Implementado (Slice 2) |
| API key + referrer prod | **Pendiente validación VPS** |
| Excursión ubicación propia/heredada | Smoke DB OK; UI manual pendiente |

---

## 7. Riesgos antes de producción

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Migraciones no aplicadas en VPS | **Bloqueante** | `prisma migrate deploy` antes de restart |
| QA manual browser no ejecutado | Media | Checklist §6 en staging |
| API HTTP smokes no corridos con API up | Baja | DB smokes OK; opcional con `dev:api` |
| `producer_terms` DRAFT — sin bloqueo legal | Baja | Caso B documentado; Caso A post-publicación |
| Maps prod sin validar key/referrer | Media | Probar picker en VPS tras deploy |
| `web:build` ECONNREFUSED en SSG | Baja | Esperado sin API; no bloquea build |
| Rama `feat/v1-s03-api-foundation` vs `main` | Proceso | Confirmar merge/deploy policy con equipo |

---

## 8. Checklist deploy VPS

**Rama:** `feat/v1-s03-api-foundation` (confirmar merge a `main` según decisión del proyecto).

```bash
ssh -p 5230 deploy@179.43.124.145
cd /opt/yoteinvito

git status --short
git branch --show-current
git pull origin feat/v1-s03-api-foundation

pnpm install --frozen-lockfile

cd apps/api
npx prisma generate
npx prisma migrate deploy
npx prisma migrate status    # debe: Database schema is up to date!
cd /opt/yoteinvito

pnpm build

sudo systemctl restart yti-api yti-web yti-scanner

curl -I https://yoteinvito.club
curl -I https://api.yoteinvito.club/health
curl -I https://scanner.yoteinvito.club
```

**Reglas:**

- No deploy si `migrate status` muestra pending.
- No tocar `main` salvo instrucción explícita.
- No ejecutar seeds destructivos ni demo automático.
- Getnet/pagos: sin cambios en este bloque.

**Post-deploy smoke (opcional en VPS):**

```bash
cd apps/api && pnpm run smoke:v31-stabilization
pnpm run smoke:v31-admin-archive
pnpm run smoke:v31-category-banners
```

---

## 9. Pendientes V3.1 no bloqueantes

- Legal Caso A (`EVENT_PUBLICATION` + bloqueo backend) — requiere `producer_terms` publicado.
- JSON-LD `bestRating: 5`.
- Formulario review escala 5 visual (interno sigue 1–10).
- Cards editoriales fase 2 por vertical (§14.2).
- Drag & drop galería (solo Subir/Bajar).
- Hoteles archivar.
- Links embebidos en descripciones (§5.2).
- FAQs excursiones.
- Maps prod key/referrer.
- Multi-subcategorías otras verticales.
- QA manual browser (checklist §6).

---

## 10. Recomendación final

| Criterio | Estado |
|----------|--------|
| Migraciones V3.1 | ✓ OK local |
| Builds/lints | ✓ OK |
| Smokes DB V3.1 | ✓ OK (4/4 exit 0) |
| Features nuevas Slice 14 | ✓ Ninguna |
| Getnet/pagos | ✓ No tocados |
| QA manual browser | ⏳ Pendiente |

### Veredicto

**Listo para deploy técnico** desde `feat/v1-s03-api-foundation` **si**:

1. Se ejecuta `prisma migrate deploy` en VPS (5 migraciones V3.1).
2. Se acepta QA manual browser como paso post-deploy o en staging previo.
3. Se documenta que legal bloqueante (Caso A) **no** está activo.

**No listo** para considerar V3.1 “cerrado al 100% cliente” hasta completar QA manual §6 y publicar `producer_terms` si se requiere bloqueo legal.

---

## Referencias smoke por slice

- `V3_1_SLICE_7_5_STABILIZATION_SMOKE.md`
- `V3_1_SLICE_8_5_SUBCATEGORIES_SMOKE.md`
- `V3_1_SLICE_9_ADMIN_ARCHIVE_SMOKE.md`
- `V3_1_SLICE_10_CATEGORY_BANNERS_SMOKE.md`
- `V3_1_SLICE_11_PRODUCER_EVENT_WIZARD_SMOKE.md`
- `V3_1_SLICE_12_EVENT_PUBLICATION_LEGAL_SMOKE.md`
- `V3_1_SLICE_13_PUBLIC_CARDS_RATINGS_SMOKE.md`
