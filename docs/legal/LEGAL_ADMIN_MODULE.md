# Módulo Legal Admin — Referencia operativa

Documentación de cierre (Slice Legal Admin 8). El módulo permite administrar documentos legales versionados, publicarlos al sitio público y registrar aceptación por usuario en flujos clave.

> **Aviso:** El contenido base vive en `docs/legal/*.md` y se importa como **borrador** (`seed:legal-content`). La **publicación** y la revisión por asesoría legal profesional quedan a cargo del cliente en `/admin/legales`.

---

## 1. Modelos (Prisma)

| Modelo | Propósito |
|--------|-----------|
| `LegalDocument` | Catálogo por `tenantId` + `key` (único). Metadata: título, visibilidad, perfiles, flags de requerimiento. |
| `LegalDocumentVersion` | Versiones `DRAFT` / `PUBLISHED` / `ARCHIVED`. Contenido Markdown. |
| `UserLegalAcceptance` | Aceptación por `userId` + `documentVersionId` + `context`. |

**Enums:** `LegalDocumentVisibility` (`PUBLIC` | `INTERNAL`), `LegalAcceptanceContext` (`SIGNUP`, `CHECKOUT`, `PROFILE_ONBOARDING`, `PORTAL_ACCESS`).

**Migración:** `20260524120000_legal_documents`.

---

## 2. Catálogo de documentos (`key`)

| Key | Slug público | Visibilidad |
|-----|--------------|-------------|
| `terms_general` | `terminos` | PUBLIC |
| `privacy_policy` | `privacidad` | PUBLIC |
| `purchase_refund_policy` | `compras-cancelaciones-reembolsos` | PUBLIC |
| `producer_terms` | `productores` | PUBLIC |
| `gastro_terms` | `gastronomicos` | PUBLIC |
| `rental_terms` | `rentals` | PUBLIC |
| `hotel_terms` | `hoteles` | PUBLIC |
| `referrer_terms` | `referidos` | PUBLIC |
| `ticket_transfer_terms` | `transferencia-tickets` | PUBLIC |
| `support_internal_procedure` | *(sin slug)* | INTERNAL |

Definiciones seed: `packages/shared/src/constants/legal-documents.ts`.

---

## 3. Endpoints API

### Admin (`ADMIN` + JWT o `X-Dev-User-Id` en dev)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/admin/legal-documents` | Lista documentos |
| GET | `/admin/legal-documents/:key` | Detalle + draft/publicado |
| GET | `/admin/legal-documents/:key/versions` | Historial |
| PATCH | `/admin/legal-documents/:key` | Metadata |
| POST | `/admin/legal-documents/:key/draft` | Crear/actualizar borrador |
| POST | `/admin/legal-documents/:key/publish` | Publicar borrador; archiva `PUBLISHED` anterior |

### Público (sin auth)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/public/legal/requirements?tenantId=&context=&profileType=` | Documentos requeridos + `documentVersionId` |
| GET | `/public/legal/:slug?tenantId=` | Solo `PUBLIC` + versión `PUBLISHED`; 404 si draft/internal |

### Usuario autenticado

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/me/legal/requirements?context=&profileType=` | Pendientes de aceptar |
| POST | `/me/legal/accept` | `{ documentVersionIds, context }` |
| GET | `/me/legal/acceptances` | Historial |

---

## 4. Rutas frontend

| Ruta | Rol |
|------|-----|
| `/admin/legales` | Admin — listado |
| `/admin/legales/[documentKey]` | Admin — editor, preview, publicar |
| `/admin/legales/[documentKey]/versiones` | Admin — historial |
| `/legal/[slug]` | Público — documento publicado (ISR 60s) |

**Integración producto:** `Footer`, `RegisterWizard`, `/me/cart`, `/checkout`, `/checkout/[eventId]`, banner en portales comerciales (`PortalLegalPendingBanner`).

### 4b. UI listado admin (`/admin/legales`) — Legales V2

| Vista | Comportamiento |
|-------|----------------|
| Desktop (`md+`) | Tabla administrativa con `overflow-x-auto` en el cuadro y `min-w-[900px]`; perfiles en texto (`max-w-[140px]`). |
| Mobile (`<md`) | Cards apiladas (`AdminLegalDocumentsMobileCard`). |

**Layout portales (compartido):** cuerpo `max-w-screen-2xl` vía `PORTAL_BODY_CLASS` (`apps/web/lib/navigation/portalLayoutClasses.ts`); `PageContainer` en rutas `(portal)/*` no aplica `max-w-6xl` adicional (`PortalPageContext`).

---

## 5. Flujo de publicación

1. Ejecutar seed (crea documentos + borrador placeholder v1, **sin** auto-publish).
2. Admin edita borrador (`POST .../draft`) con Markdown ≥ 20 caracteres y sin placeholder seed.
3. Admin publica (`POST .../publish`):
   - La versión `PUBLISHED` anterior pasa a `ARCHIVED`.
   - Solo una versión `PUBLISHED` por documento.
   - AuditLog: `LEGAL_DOCUMENT_DRAFT_SAVED`, `LEGAL_DOCUMENT_PUBLISHED`, `LEGAL_DOCUMENT_ARCHIVED` (si aplica), `LEGAL_DOCUMENT_UPDATED` en metadata.
4. Público ve contenido en `/legal/{slug}`.

**No se puede** editar directamente una versión `PUBLISHED`; siempre vía nuevo borrador.

---

## 6. Flujo de aceptación

1. El sistema determina documentos activos `PUBLIC` con flag según `context` y `appliesToProfiles`.
2. Compara con `UserLegalAcceptance` para la versión publicada actual.
3. UI muestra checkboxes con links a `/legal/{slug}`.
4. Tras confirmar, `POST /me/legal/accept` guarda `documentVersionId` + `context` + timestamp (+ IP/UA opcional).
5. Si admin publica **nueva versión**, el usuario vuelve a tener requisitos pendientes para ese documento.

**Registro:** aceptación **después** de `register` + `signIn` (requiere `userId`).

**Checkout invitado:** checkbox obligatorio; persistencia en DB solo al autenticarse.

---

## 7. Carga inicial en entorno

```bash
# Migración
pnpm --filter api exec prisma migrate deploy

# Catálogo + borradores placeholder (idempotente)
pnpm --filter api run seed:legal-documents

# Importar Markdown redactado desde docs/legal/ → DRAFT (no publica)
pnpm --filter api run seed:legal-content -- --dry-run
pnpm --filter api run seed:legal-content

# Publicar documentos necesarios desde /admin/legales (manual)
```

Variables: `LEGAL_SEED_TENANT_ID` (default `tenant-demo`).

---

## 7b. Importar contenido legal base (`docs/legal/`)

**Archivos fuente** (mapeo en `apps/api/scripts/lib/legal-content-import-map.ts`):

| Archivo | `LegalDocument.key` |
|---------|---------------------|
| `01_TERMINOS_Y_CONDICIONES_GENERALES.md` | `terms_general` |
| `02_POLITICA_DE_PRIVACIDAD.md` | `privacy_policy` |
| `03_POLITICA_COMPRA_CANCELACION_REEMBOLSO.md` | `purchase_refund_policy` |
| `04_CONDICIONES_PRODUCTORES.md` | `producer_terms` |
| `05_CONDICIONES_GASTRONOMICOS.md` | `gastro_terms` |
| `06_CONDICIONES_RENTALS.md` | `rental_terms` |
| `07_CONDICIONES_HOTELES.md` | `hotel_terms` |
| `08_CONDICIONES_REFERIDOS.md` | `referrer_terms` |
| `09_CONDICIONES_TRANSFERENCIA_TICKETS.md` | `ticket_transfer_terms` |
| `10_PROCEDIMIENTO_INTERNO_SOPORTE.md` | `support_internal_procedure` (`INTERNAL`) |

**Excluidos:** `00_INDICE_LEGAL_Y_RESPONSABILIDADES.md`, `LEGAL_ADMIN_MODULE.md`.

**Comportamiento `seed:legal-content`:**

| Flag | Efecto |
|------|--------|
| *(ninguno)* | Crea/actualiza **DRAFT**; no toca `PUBLISHED` |
| `--dry-run` | Solo muestra mapeo y acciones |
| `--force` | Sobrescribe borrador aunque ya tenga contenido real |
| `--publish` | Publica borradores importados (⚠️ usar solo con revisión; advertencia en consola) |

**Flujo recomendado:**

1. Revisar/editar Markdown en `docs/legal/`.
2. `pnpm --filter api run seed:legal-content -- --dry-run`
3. `pnpm --filter api run seed:legal-content`
4. Entrar a `/admin/legales` → revisar cada borrador.
5. Publicar manualmente cuando el cliente apruebe.
6. `pnpm --filter api run smoke:legal`

---

## 8. Validación en staging

### Smokes automatizados (API en marcha + `DEV_AUTH_ENABLED=true`)

```bash
pnpm --filter api run test:legal-documents
pnpm --filter api run test:me-legal-acceptance   # requiere SMOKE_USER_* o dev user
pnpm --filter api run smoke:legal                # ambos en secuencia
```

### Manual UI

Ver checklist: `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`.

---

## 9. Seguridad (revisión slice 8)

| Control | Estado |
|---------|--------|
| Admin solo `Role.ADMIN` | ✅ `RolesGuard` |
| INTERNAL no expuesto en `/public/legal/*` | ✅ 404 |
| DRAFT no expuesto públicamente | ✅ 404 hasta publish |
| Aceptación solo versión `PUBLISHED` + doc `PUBLIC` | ✅ validado en `MeLegalService` |
| Sin edición directa de PUBLISHED | ✅ solo draft/publish |
| Frontend usa `LegalDocumentsRepo` (no fetch cliente ad hoc en forms) | ✅ |
| Páginas públicas SSR: `fetchPublicLegalDocument` server-only | ✅ |
| Markdown sin `dangerouslySetInnerHTML` | ✅ `LegalMarkdownPreview` (subset seguro) |
| Sin `User.preferences` para legales | ✅ |
| Sin datos demo auto en legales | ✅ seed explícito |

---

## 10. Riesgos pendientes (no técnicos)

- [ ] Redacción legal real de cada documento (hoy placeholder en borradores).
- [ ] Cláusulas productor ↔ referido, pagos externos, rol de portal.
- [ ] Procedimiento interno de soporte (`support_internal_procedure`) — contenido operativo.
- [ ] Bloqueos duros en portales (publicar evento, descuentos, etc.) si faltan términos — slice futuro.
- [ ] Migrar avisos hardcoded (`ticket-transfer`, referidos) a documentos publicados.

---

## 11. Referencias

- Auditoría inicial: `docs/audits/LEGAL_ADMIN_AUDIT.md`
- QA smoke manual: `docs/dev/LEGAL_ADMIN_QA_SMOKE.md`
- Backend: `docs/context/BACKEND_CONTEXT.md` §8
- Frontend: `docs/context/FRONTEND_CONTEXT.md`
