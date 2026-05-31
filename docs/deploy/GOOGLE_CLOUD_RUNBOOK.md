# Google Cloud Runbook — Yo Te Invito

**Etapa A (manual):** cerrada — Mayo/Junio 2026.  
**Etapa B (Cursor/código):** pendiente — ver §6.

> **Regla:** no guardar en el repo API keys completas, JSON de service account, passwords ni valores de `.env` productivos. Solo nombres, IDs públicos y variables esperadas.

**Producción web:** `https://yoteinvito.club` · **API:** `https://api.yoteinvito.club` · **Scanner:** `https://scanner.yoteinvito.club`

---

## 1. Proyecto Google Cloud

| Campo | Valor |
|-------|--------|
| Nombre visible | Yoteinvito Maps |
| Project ID | `yoteinvito-1721413433327` |
| Project Number | `570038579416` |
| Billing | Activo |
| Email técnico (colaborador) | `felipe.e.salom@gmail.com` |

### 1.1 Presupuesto y alertas

| Estado | Nota |
|--------|------|
| **Pendiente** | Confirmar en consola si existe presupuesto con alertas. Recomendado: umbrales **50%**, **80%**, **100%** del presupuesto mensual. |

### 1.2 Secretos y repositorio

- Las API keys y claves JSON de service account **solo** en gestor de secretos / `.env` en VPS (permisos `600`).
- No commitear `.env`, `*.json` de credenciales GCP ni keys en documentación.
- Rotar keys si hubo exposición accidental.

---

## 2. Google Cloud Storage (producción)

### 2.1 Decisión operativa

| Tema | Decisión |
|------|----------|
| Bucket staging | **Omitido** — trabajo directo sobre producción en esta fase |
| Acceso público al bucket | **No** — bucket privado; prevención de acceso público habilitada |
| Imágenes públicas futuras | Bucket separado **`yti-prod-public-assets`** — ver [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) |
| Backups / tickets / facturas | Bucket privado **`yti-prod-storage`** |

### 2.2 Bucket productivo

| Campo | Valor |
|-------|--------|
| Nombre | `yti-prod-storage` |
| URI | `gs://yti-prod-storage` |
| Región | `southamerica-east1` |
| Storage class | Standard |
| Control de acceso | Uniform bucket-level access |
| Acceso público | No público |
| Soft delete | 7 días |
| Versionado de objetos | Desactivado |
| Política de retención | Lifecycle `backups/postgres/` → delete a **30 días** |

### 2.3 Service Account (backend)

| Campo | Valor |
|-------|--------|
| Nombre | `yti-backend-storage` |
| Email | `yti-backend-storage@yoteinvito-1721413433327.iam.gserviceaccount.com` |
| Unique ID | `108652449718564983813` |
| Rol sobre bucket (actual) | **Storage Object Admin** (Administrador de objetos de Storage) |

**Nota IAM:** el rol actual es aceptable para etapa inicial (upload, reemplazo, cleanup, backups). En hardening futuro valorar roles más restrictivos (p. ej. por prefijo o bucket dedicado backups vs media).

### 2.4 Storage — estado y pendientes (Etapa B)

**Estrategia documentada:** [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) — bucket privado + bucket público separado; upload vía backend; prefijos `public/` y `private/`.

**Backups (cerrado 2026-05-31):**

- [x] Script + runbook [`GCS_BACKUPS_RUNBOOK.md`](./GCS_BACKUPS_RUNBOOK.md)
- [x] VPS: credencial SA, `.pgpass`, timer systemd 03:30, restore drill
- [x] Lifecycle `backups/postgres/` → delete 30 días
- [x] Checksum portable en script

**Upload / media (Storage V2 — cerrado en código, Jun 2026):**

- [x] Estrategia público vs privado documentada
- [x] Bucket `yti-prod-public-assets` + CORS
- [x] Módulo upload NestJS V1 — `POST /uploads/public-image` + ownership portal
- [x] Integración formularios web (Admin + productora/gastro/hotel) → URLs GCS en BD
- [x] `next/image` — `remotePatterns` en web
- [x] Data-URL audit/migrate (`storage:audit-data-urls`, `storage:migrate-data-urls`)
- [x] Orphan audit/cleanup (`storage:audit-orphans`, `storage:cleanup-orphans` — dry-run default)
- [x] Smoke global `smoke:storage-global` — [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) §22
- [ ] Migración data-URL masiva producción (post-backup manual)
- [ ] Cleanup huérfanos producción (manual post-audit; **no** `--confirm` desde CI)
- [ ] CDN `cdn.yoteinvito.club` (opcional fase 2)

### 2.5 Variables de entorno (API — referencia, sin valores)

Ver tabla completa en [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) §5. Resumen:

| Variable | Uso |
|----------|-----|
| `GCS_PROJECT_ID` | `yoteinvito-1721413433327` |
| `GCS_PRIVATE_BUCKET` | `yti-prod-storage` |
| `GCS_PUBLIC_BUCKET` | `yti-prod-public-assets` |
| `GCS_SERVICE_ACCOUNT_KEY_FILE` | Ruta JSON SA en VPS |
| `GCS_PUBLIC_BASE_URL` | Base URL assets públicos (vacío → storage.googleapis.com) |
| `GCS_SIGNED_URL_TTL_SECONDS` | TTL URLs firmadas bucket privado |
| `UPLOAD_MAX_IMAGE_MB` | Default 5 |
| `UPLOAD_ALLOWED_IMAGE_MIME_TYPES` | `image/jpeg,image/png,image/webp` |

**Backups (script ops):** `BACKUP_GCS_BUCKET` / `GOOGLE_APPLICATION_CREDENTIALS` en `/opt/yoteinvito/.ops/backup-gcs.env`.

---

## 3. Google Maps Platform

### 3.1 API Key web (producción)

| Campo | Valor |
|-------|--------|
| Nombre en consola | `YTI Web Maps PROD` |
| Valor de la key | **No documentar** — solo en `.env` / secretos |
| Uso | Solo **frontend / browser** — no usar Service Account para Maps JS |

### 3.2 APIs habilitadas y restringidas en la key

- Maps JavaScript API
- Places API (New)
- Geocoding API

**No habilitar** salvo necesidad futura: Directions, Routes, Distance Matrix, Static Maps, Embed, etc.

### 3.3 Restricción de aplicación

- Tipo: **Sitios web** (HTTP referrers)
- Referrers permitidos:
  - `https://yoteinvito.club/*`
  - `https://www.yoteinvito.club/*`

### 3.4 Variables frontend

| Variable | App | Notas |
|----------|-----|--------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | `apps/web` | Key restringida por referrer; fallback OSM si ausente |

Código existente: `apps/web/components/location/useGoogleMaps.ts`, `LocationPickerMapFallback.tsx`.

OAuth login Google (distinto de Maps): ver [`CONFIG_GOOGLE_RESEND.md`](../guides/CONFIG_GOOGLE_RESEND.md).

### 3.5 Pendientes Maps (Etapa B)

- [ ] Configurar `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.production` del VPS (sin commitear)
- [ ] Integrar autocomplete en formularios (eventos, gastro, rentals, hoteles, productoras)
- [ ] Persistir dirección legible + `lat`/`lng`
- [ ] Mapa / botón «Ver ubicación» en fichas públicas
- [ ] Smoke: autocomplete, guardado, mapa público, fallback OSM

---

## 4. Google Search Console

| Campo | Valor |
|-------|--------|
| Dominio | `yoteinvito.club` |
| Tipo de propiedad esperado | **Dominio** (DNS) |
| Verificación | Registro **TXT** en DNS DonWeb |

| Estado | Nota |
|--------|------|
| **Pendiente confirmar en repo** | Crear propiedad y verificar TXT en consola; marcar checklist cuando esté verde en GSC |

### 4.1 Pendientes SEO técnico (Etapa B)

- [ ] Verificación DNS TXT confirmada
- [ ] `sitemap.xml` público y envío en GSC
- [ ] `robots.txt` validado
- [ ] Indexación home, explore, categorías, fichas públicas
- [ ] `noindex` en portales privados, checkout, órdenes, tickets, admin
- [ ] Cobertura / errores en GSC
- [ ] Core Web Vitals (con tráfico)
- [ ] JSON-LD / rich results cuando corresponda
- [ ] Procedimiento SEO post-deploy

---

## 5. Relación con VPS DonWeb

| Recurso | Runbook |
|---------|---------|
| Deploy app, SSH, UFW, secretos rotados | [`DONWEB_PRODUCTION_RUNBOOK.md`](./DONWEB_PRODUCTION_RUNBOOK.md) §24–25 |
| Hardening seguridad | [`PRODUCTION_SECURITY_HARDENING_AUDIT.md`](../audits/PRODUCTION_SECURITY_HARDENING_AUDIT.md) |

El bucket privado **existe**; **backups cerrados**. **Upload API V1** operativo con `GCS_PUBLIC_BUCKET` — [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md). Pendiente: integración formularios y BD.

---

## 6. Próximos slices — Etapa B (Cursor/código)

Orden sugerido:

| # | Slice | Alcance |
|---|--------|---------|
| B1 | **Cloud docs + env** | Variables documentadas en runbook/VPS; plantillas `.env.example` sin valores reales |
| B2 | **Backups GCS** | [x] Cerrado 2026-05-31 — [`GCS_BACKUPS_RUNBOOK.md`](./GCS_BACKUPS_RUNBOOK.md) |
| B3 | **Storage strategy** | [x] Arquitectura documentada — [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) |
| B4 | **Storage backend** | [x] Storage V2 — API upload + portales web + audit/migrate data-URL + orphan cleanup + smoke global ([`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) §22); pendiente ops prod migración/cleanup |
| B5 | **Maps frontend** | Key en prod web, autocomplete, lat/lng, fichas públicas |
| B6 | **SEO / GSC** | sitemap, robots, metadata, JSON-LD, no-index rutas privadas |

**No hacer en Etapa A:** SDK en código, cambios Prisma por storage, Nginx/systemd salvo lo que requiera un slice explícito.

---

## Referencias

| Documento | Uso |
|-----------|-----|
| [`Yo_Te_Invito_Checklist_V2_Produccion.md`](../dev/Yo_Te_Invito_Checklist_V2_Produccion.md) | § Google Cloud, GSC, SEO |
| [`GCS_BACKUPS_RUNBOOK.md`](./GCS_BACKUPS_RUNBOOK.md) | Backups PostgreSQL → GCS |
| [`GCS_STORAGE_STRATEGY.md`](./GCS_STORAGE_STRATEGY.md) | Estrategia buckets público/privado, uploads, CORS |
| [`CONTEXT_PENDIENTES.md`](../context/CONTEXT_PENDIENTES.md) | Backlog GCP |
| [`AI_ENTRYPOINT.md`](../context/AI_ENTRYPOINT.md) | Resumen operativo |
| [`PREPRODUCTION_DEPLOY_AUDIT.md`](../audits/PREPRODUCTION_DEPLOY_AUDIT.md) | Arquitectura storage/Maps |
