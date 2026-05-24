# Auditoría Legal Admin — Slice 1

**Proyecto:** Yo Te Invito  
**Slice:** 1 (auditoría) · **2–4 (backend + UI admin — 2026-05-24)**  
**Fecha auditoría:** 2026-05-24  

### Slice 2 — implementado

| Entregable | Estado |
|------------|--------|
| Enums + modelos Prisma (`LegalDocument`, `LegalDocumentVersion`, `UserLegalAcceptance`) | ✅ `20260524120000_legal_documents` |
| `AuditAction` legal (`LEGAL_DOCUMENT_*`) | ✅ |
| Schemas Zod `packages/shared/src/schemas/legal-documents.ts` | ✅ |
| Módulo `apps/api/src/modules/legal/` | ✅ |
| `GET /admin/legal-documents`, `/:key`, `/:key/versions` | ✅ ADMIN |
| `GET /public/legal/:slug?tenantId=` | ✅ solo PUBLIC + PUBLISHED |
| Seed idempotente `pnpm --filter api run seed:legal-documents` | ✅ |
| Smoke `pnpm --filter api run test:legal-documents` | ✅ (requiere API + dev auth) |
| Backend draft/publish + AuditLog mutaciones | ✅ Slice 3 |
| UI admin `/admin/legales` | ✅ Slice 4 |
| Páginas web `/legal/[slug]` (9 slugs públicos, server + ISR) | ✅ Slice 5 |
| Aceptación usuario (`/me/legal/*`) | ✅ Slice 6 |
| Footer + integración checkout/registro | ⏳ slice 7 |

---
**Fuentes:** `apps/api/prisma/schema.prisma`, `apps/api/src/modules/admin/*`, `apps/api/src/modules/subcategories/*`, `apps/api/src/modules/audit/*`, `apps/web/app/(portal)/admin/*`, `apps/web/repositories/*`, `packages/shared/src/schemas/*`, `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md` § Legal y Footer

---

## Resumen ejecutivo

| Área | Estado |
|------|--------|
| Modelo `LegalDocument` / versionado / aceptación usuario | **Backend ✅** (UI/aceptación pendiente) |
| Rutas `/admin/legales`, `/legal/[slug]` (web) | **✅** |
| API admin/público para documentos legales | **Lectura + mutaciones ✅** (draft/publish slice 3) |
| Textos legales operativos | **Hardcoded** en constantes UI (referidos, transferencia tickets) |
| `PlatformConfig` | Existe — solo contacto y categorías |
| `AuditLog` | Existe — acciones `LEGAL_DOCUMENT_*` en schema (log en seed; mutaciones en slice 3) |
| `User.preferences` | JSON legacy — sin aceptación de términos |
| Checklist V2 § Legal | **100 % pendiente** |

**Recomendación:** Implementar módulo dedicado `legal-documents` siguiendo el patrón **Subcategories** (controller admin + controller público + service + schemas en `packages/shared`) y UI admin alineada con **Subcategorías / Auditoría / Usuarios**. No reutilizar `PlatformConfig`, `GastroContent` ni `Event` para textos legales.

---

## 1. Estado actual encontrado

### 1.1 Prisma / base de datos

| Recurso | Ubicación | ¿Sirve para legales? | Notas |
|---------|-----------|----------------------|-------|
| `PlatformConfig` | `schema.prisma` L635–645 | **Parcial** | `tenantId` único; `contactEmail/Phone/Address`, `categories` JSON. No almacena textos legales. |
| `AuditLog` + `AuditAction` | L1727–1772 | **Reutilizable** | Patrón `before`/`after`/`metadata`; hay que **extender enum** con acciones legales. |
| `User.preferences` | `User` L657 | **No** | Marcado deprecated en shared; solo ciudad/notificaciones/favoritos legacy. |
| `ContentSubcategory` | L731+ | **No** | Taxonomía de discovery, no documentos legales. |
| `GastroContent` | L318–338 | **No** | Editorial por local; sin versionado ni publicación legal. |
| `Event.isGeneralPublication` | L777 | **No** | “Publicaciones generales” = eventos informativos, no TyC. |
| `legalName` en perfiles | `ProducerProfile`, `GastroProfile`, `HotelProfile` | **No** | Razón social del negocio, no aceptación de términos. |
| `LegalDocument`, `LegalDocumentVersion`, `UserLegalAcceptance` | — | **Ausente** | Búsqueda en repo: 0 coincidencias. |

**Tenant isolation:** Todos los modelos operativos relevantes llevan `tenantId`. La propuesta legal debe hacer lo mismo (`LegalDocument.tenantId`, `UserLegalAcceptance.tenantId`).

### 1.2 Textos legales hoy (hardcoded)

| Texto | Ubicación | Alcance |
|-------|-----------|---------|
| Disclaimer referido | `apps/web/lib/producer/referral-display.ts` → `REFERRAL_LEGAL_DISCLAIMER_*` | UI referidos / productor |
| Aviso transferencia tickets | `packages/shared/src/constants/ticket-transfer.ts` → `TICKET_TRANSFER_LEGAL_NOTICE` | Modal crear + página aceptar transferencia |
| Términos de propuesta comercial | Campo `terms` en `ReferralCommercialProposal` (negocio entre partes) | No es TyC de plataforma |
| Copy legal en docs | `docs/referrals/REFERRALS_V2.md`, checklist V2 | Redacción de referencia, no administrable |

No hay archivos markdown estáticos en `apps/web` para TyC/privacidad. No hay rutas bajo `/legal`.

### 1.3 `PlatformConfig` y contacto

- **API:** `GET/PATCH /admin/config` — `AdminConfigService`, guards `ADMIN`.
- **Shared:** `packages/shared/src/schemas/platform-config.schema.ts`.
- **Frontend:** `PlatformConfigRepo` en `ApiRepository` → `/admin/config`; `usePlatformConfig()` en Footer y admin contactos.
- **Observación:** El Footer público consume config vía endpoint **admin** (con tenant por defecto `tenant-demo`). Para legales públicos conviene **`GET /public/legal/...`** sin rol admin (ver §4).

### 1.4 `AuditLog`

- **Escritura:** `AuditService.logAction()` — usado en review-disputes, referrals payment, public-reviews.
- **Lectura admin:** `GET /admin/audit-logs` — filtros paginados, resumen humano (`admin-audit-summary.util.ts`).
- **Shared:** `packages/shared/src/schemas/audit.ts` — enum de acciones debe mantenerse **sincronizado** con Prisma.
- **Gap:** Ninguna acción tipo `LEGAL_*` hoy.

### 1.5 Preferencias de usuario

- `GET/PATCH /me/preferences` — schema legacy en `user.schema.ts` (ciudad, notificaciones).
- Portal V1 usa tablas `UserFavorite`, `UserExpectedEvent`, etc.
- **Sin** campo ni tabla de aceptación de términos.

### 1.6 Aceptación de términos

| Flujo | ¿Registra versión legal? |
|-------|---------------------------|
| Registro / auth | No |
| Checkout | No — `checkoutFormSchema` sin checkbox legal |
| Solicitar productor/gastro/hotel | No — solo `legalName` opcional (razón social) |
| Aceptar propuesta referido | Registra acuerdo comercial, no TyC plataforma |
| Transferencia ticket | Muestra `legalNotice` estático desde API |

### 1.7 Contenido “administrable” existente (patrones, no reutilizar)

| Feature | Patrón | Lección para legales |
|---------|--------|----------------------|
| Subcategorías | `AdminSubcategoriesController` + `PublicSubcategoriesController` + `SubcategoriesService` | **Mejor referencia** para CRUD + lectura pública |
| Publicaciones generales | Eventos con `isGeneralPublication` | Moderación de eventos, no versionado de texto |
| Admin contactos | Form simple + `repos.platformConfig.update` | Formulario admin simple; legal necesita editor + versiones |
| Gastro contenido | draft/published por bloque | Estados útiles; falta historial inmutable |

### 1.8 Rutas admin existentes (patrón visual / UX)

Rutas bajo `apps/web/app/(portal)/admin/`:

| Ruta | Page | Client pattern |
|------|------|----------------|
| `/admin` | `page.tsx` | `AdminDashboardClient` + `AdminOperationalLinks` |
| `/admin/eventos` | thin page | `AdminEventsPageClient` — tabs, filtros URL, tabla + mobile cards |
| `/admin/usuarios` | thin page | `AdminUsersPageClient` — filtros URL, tabla + cards |
| `/admin/auditoria` | thin page | `AdminAuditPageClient` — filtros URL, paginación, solo lectura |
| `/admin/categorias` | thin page | `AdminSubcategoriesPageClient` — tabs por categoría, CRUD inline |
| `/admin/reviews` | KPI + export | Reporte reputación |
| `/admin/contactos` | inline form | Config plataforma (contacto) |

**Convenciones UI recurrentes:**

- `PageContainer` + `SectionTitle` + link `← Admin`
- Filtros en URL (`useAdmin*UrlFilters`)
- React Query + `repos.*` (no `fetch` en componentes salvo legacy `lib/api/admin.ts`)
- Tabla desktop + cards mobile en listados densos
- Nav lateral: `portalNavConfig.ts` — **no incluye** legales aún

### 1.9 Backend admin existente

- **Monolito controller:** `AdminController` (`@Controller('admin')`) — eventos, usuarios, config, audit, applications, gastro, etc.
- **Módulos satélite con controller propio:** `admin/subcategories` (recomendado para legal).
- **Guards:** `@UseGuards(JwtOrDevAuthGuard, RolesGuard)` + `@RequireRole(Role.ADMIN)`.
- **Validación:** `ZodValidationPipe` + schemas desde `@yo-te-invito/shared`.
- **Servicios:** un service por dominio; Prisma en service; auditoría vía `AuditService` inyectado donde aplica.

`AdminModule` no importa ningún módulo legal.

### 1.10 Rutas públicas Next.js

Grupo `app/(public)/` — home, explore, checkout, categorías, fichas. **Sin** `legal/`.

El checklist V2 prevé footer con enlaces legales (pendiente); navbar audit menciona “Sin legales” en footer.

### 1.11 Checklist V2 — alcance legal pendiente

En `docs/dev/Yo_Te_Invito_Checklist_V2_Produccion.md`:

- § Footer público: enlaces términos, privacidad, compra/cancelación.
- § Legal y responsabilidades: 10 tipos de documento + registro versión aceptada + procedimiento soporte interno.
- § Registro y onboarding: aceptación obligatoria general + por perfil + links desde formularios.

Todo coherente con un módulo nuevo; nada implementado en código.

---

## 2. Catálogo de documentos (document keys)

Claves estables (enum) alineadas con el checklist y el pedido del slice:

| `documentKey` | Título sugerido (admin) | Audiencia | Público |
|---------------|-------------------------|-----------|---------|
| `TERMS_GENERAL` | Términos y condiciones generales | Todos | Sí |
| `PRIVACY_POLICY` | Política de privacidad | Todos | Sí |
| `PURCHASE_REFUND_POLICY` | Compra, cancelación y reembolso | Compradores | Sí |
| `PRODUCER_TERMS` | Condiciones productores/productoras | Productor | Sí |
| `GASTRO_TERMS` | Condiciones gastronómicos | Gastro | Sí |
| `RENTAL_TERMS` | Condiciones rentals / equipos | Rental | Sí |
| `HOTEL_TERMS` | Condiciones hoteles | Hotel | Sí |
| `REFERRER_TERMS` | Condiciones referidos | Referrer | Sí |
| `TICKET_TRANSFER_TERMS` | Transferencia de tickets | Usuarios con tickets | Sí |
| `INTERNAL_SUPPORT_PROCEDURES` | Procedimientos internos de soporte | Solo admin | **No** |

**Notas:**

- `INTERNAL_SUPPORT_PROCEDURES` debe tener `visibility: INTERNAL` y quedar fuera de API pública.
- Los disclaimers hardcoded de referidos/transferencia pueden **migrarse** a snippets o a secciones de `REFERRER_TERMS` / `TICKET_TRANSFER_TERMS` en slices posteriores (mantener constantes como fallback hasta migración).

---

## 3. Propuesta de modelo Prisma

### 3.1 Enums

```prisma
enum LegalDocumentKey {
  TERMS_GENERAL
  PRIVACY_POLICY
  PURCHASE_REFUND_POLICY
  PRODUCER_TERMS
  GASTRO_TERMS
  RENTAL_TERMS
  HOTEL_TERMS
  REFERRER_TERMS
  TICKET_TRANSFER_TERMS
  INTERNAL_SUPPORT_PROCEDURES
}

enum LegalDocumentVisibility {
  PUBLIC      // lectura en /legal y API pública
  INTERNAL    // solo admin
}

enum LegalDocumentVersionStatus {
  DRAFT       // editable
  PUBLISHED   // inmutable; es la versión vigente si publishedAt más reciente
  ARCHIVED    // histórico; ya no vigente
}
```

### 3.2 `LegalDocument` (cabecera por tenant + key)

```prisma
model LegalDocument {
  id          String              @id @default(cuid())
  tenantId    String
  key         LegalDocumentKey
  title       String              // título admin / público
  visibility  LegalDocumentVisibility @default(PUBLIC)
  description String?             // nota interna admin
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt

  tenant   Tenant                 @relation(fields: [tenantId], references: [id])
  versions LegalDocumentVersion[]

  @@unique([tenantId, key])
  @@index([tenantId])
}
```

**Seed:** Al crear tenant (o migración), insertar las 10 filas `LegalDocument` con título por defecto y versión vacía opcional.

### 3.3 `LegalDocumentVersion` (contenido versionado)

```prisma
model LegalDocumentVersion {
  id              String                     @id @default(cuid())
  tenantId        String
  legalDocumentId String
  versionNumber   Int                        // autoincrement por documento (1, 2, 3…)
  status          LegalDocumentVersionStatus @default(DRAFT)
  contentFormat   String                     @default("markdown") // markdown | html
  content         String                     @db.Text
  summary         String?                    // changelog corto para admin
  publishedAt     DateTime?
  publishedById   String?
  createdById     String
  createdAt       DateTime                   @default(now())
  updatedAt       DateTime                   @updatedAt

  tenant        Tenant        @relation(fields: [tenantId], references: [id])
  legalDocument LegalDocument @relation(fields: [legalDocumentId], references: [id], onDelete: Cascade)
  acceptances   UserLegalAcceptance[]

  @@unique([legalDocumentId, versionNumber])
  @@index([tenantId, legalDocumentId, status])
  @@index([tenantId, publishedAt])
}
```

**Reglas de negocio:**

- Solo **una** versión `PUBLISHED` vigente por `LegalDocument` (la de `publishedAt` máxima).
- Editar contenido **solo** en `DRAFT`; publicar copia a `PUBLISHED` o promueve draft → published y archiva la anterior.
- **No** actualizar `content` de una fila `PUBLISHED` (inmutabilidad).

### 3.4 `UserLegalAcceptance`

```prisma
model UserLegalAcceptance {
  id                     String   @id @default(cuid())
  tenantId               String
  userId                 String
  legalDocumentId        String
  legalDocumentVersionId String
  documentKey            LegalDocumentKey // denormalizado para queries
  acceptedAt             DateTime @default(now())
  ipAddress              String?
  userAgent              String?
  context                String?  // registration | checkout | portal_producer | ticket_transfer | manual

  tenant  Tenant               @relation(fields: [tenantId], references: [id])
  user    User                 @relation(fields: [userId], references: [id], onDelete: Cascade)
  version LegalDocumentVersion @relation(fields: [legalDocumentVersionId], references: [id])

  @@unique([userId, legalDocumentVersionId])
  @@index([tenantId, userId])
  @@index([tenantId, documentKey, userId])
  @@index([legalDocumentId, userId])
}
```

**Consulta “¿usuario aceptó vigente?”:** Comparar última aceptación del usuario para `documentKey` con `version.id` de la versión `PUBLISHED` actual.

### 3.5 Extensión `AuditAction` (sugerida)

```
LEGAL_DOCUMENT_VERSION_CREATED
LEGAL_DOCUMENT_VERSION_UPDATED
LEGAL_DOCUMENT_VERSION_PUBLISHED
LEGAL_DOCUMENT_VERSION_ARCHIVED
LEGAL_USER_ACCEPTANCE_RECORDED
```

`entityType`: `LegalDocument` | `LegalDocumentVersion` | `UserLegalAcceptance`.

### 3.6 Alternativas descartadas

| Alternativa | Motivo de descarte |
|-------------|-------------------|
| JSON en `PlatformConfig` | Sin versionado, sin auditoría fina, mezcla concerns |
| Archivos en repo / MD en `public/` | No administrable por admin en producción |
| Reutilizar `GastroContent` | Modelo por local/evento; sin keys legales ni aceptación |
| Solo `User.preferences` | No auditable; deprecated; sin FK a versión |

---

## 4. Propuesta de endpoints

### 4.1 Admin — `LegalDocumentsAdminController`

Base: `@Controller('admin/legal-documents')`  
Guards: `JwtOrDevAuthGuard`, `RolesGuard`, `Role.ADMIN`

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Lista documentos del tenant (key, title, visibility, versión publicada actual, draft pendiente) |
| `GET` | `/:documentKey` | Detalle documento + metadatos |
| `GET` | `/:documentKey/versions` | Lista versiones (paginada; filtros status) |
| `GET` | `/:documentKey/versions/:versionId` | Contenido completo de una versión |
| `POST` | `/:documentKey/versions` | Crear borrador (desde cero o duplicar última publicada) |
| `PATCH` | `/:documentKey/versions/:versionId` | Editar borrador (`DRAFT` only) |
| `POST` | `/:documentKey/versions/:versionId/publish` | Publicar → archiva publicada anterior |
| `POST` | `/:documentKey/versions/:versionId/archive` | Archivar borrador o versión antigua |

**Params:** `documentKey` validado con Zod enum (shared).  
**Body crear/editar:** `content`, `contentFormat`, `summary?`, `title?` (opcional override cabecera).

Cada mutación relevante → `AuditService.logAction`.

### 4.2 Público — `PublicLegalDocumentsController`

Base: `@Controller('public/legal')`  
Sin auth (tenant vía query `tenantId` como subcategorías públicas).

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/` | Índice: key, title, slug, `publishedAt` (solo `visibility=PUBLIC` con versión publicada) |
| `GET` | `/:documentKey` | Versión **publicada** vigente: `versionNumber`, `content`, `contentFormat`, `publishedAt` |
| `GET` | `/:documentKey/versions/:versionNumber` | Lectura histórica pública (opcional slice 3+; útil si URL incluye versión) |

**No exponer** `INTERNAL_SUPPORT_PROCEDURES`.

### 4.3 Usuario autenticado — `MeLegalController` o en `MeController`

Base: `@Controller('me/legal')`  
Guards: JWT usuario autenticado.

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/requirements` | Documentos requeridos según rol/perfil + si falta aceptación vigente |
| `GET` | `/acceptances` | Historial de aceptaciones del usuario |
| `POST` | `/accept` | Body: `{ documentKey, versionId?, context }` — registra aceptación de versión vigente (o `versionId` explícito) |

Validaciones:

- `versionId` debe ser la versión `PUBLISHED` actual (o la indicada si política lo permite).
- Idempotencia: `@@unique([userId, legalDocumentVersionId])` → 200 si ya aceptó.

### 4.4 Schemas shared (nuevo archivo)

`packages/shared/src/schemas/legal-documents.ts`:

- Enums / `legalDocumentKeySchema`
- Query/body/response para admin list, version CRUD, public read, me accept
- Export en `packages/shared/src/index.ts`

### 4.5 Slug público (frontend)

Mapeo estable key → path (en config frontend, no en DB obligatorio):

| Key | Ruta pública sugerida |
|-----|----------------------|
| `TERMS_GENERAL` | `/legal/terminos` |
| `PRIVACY_POLICY` | `/legal/privacidad` |
| `PURCHASE_REFUND_POLICY` | `/legal/compras-y-reembolsos` |
| `PRODUCER_TERMS` | `/legal/productores` |
| `GASTRO_TERMS` | `/legal/gastronomicos` |
| `RENTAL_TERMS` | `/legal/rentals` |
| `HOTEL_TERMS` | `/legal/hoteles` |
| `REFERRER_TERMS` | `/legal/referidos` |
| `TICKET_TRANSFER_TERMS` | `/legal/transferencia-tickets` |

---

## 5. Propuesta de UI

### 5.1 Rutas frontend (App Router)

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/admin/legales` | `AdminLegalDocumentsPageClient` | Tabla/grid: 10 documentos, estado (sin publicar / vigente vN / borrador), última fecha, acciones |
| `/admin/legales/[documentKey]` | `AdminLegalDocumentDetailClient` | Vista documento: título, visibility, versión vigente, CTA “Nueva versión” / “Editar borrador” |
| `/admin/legales/[documentKey]/versiones` | `AdminLegalVersionsPageClient` | Lista versiones + filtros status; link a editor |
| `/admin/legales/[documentKey]/versiones/[versionId]` | `AdminLegalVersionEditorClient` | Editor texto (textarea markdown slice 2; rich text opcional post-V2) + preview + publicar |

**Público** (`app/(public)/legal/`):

| Ruta | Componente |
|------|------------|
| `/legal` | Índice con links a documentos públicos |
| `/legal/[slug]` | `LegalDocumentPublicPage` — render markdown/HTML sanitizado |

`[documentKey]` en admin vs `[slug]` en público: mapper en `lib/legal/documentRoutes.ts`.

### 5.2 Patrones UI a copiar

| De | Aplicar en legales |
|----|-------------------|
| `AdminSubcategoriesPageClient` | Listado por “tipo” (keys), acciones por fila |
| `AdminAuditPageClient` | Solo lectura en historial de versiones publicadas |
| `AdminContactosPage` | Formulario simple para metadata (título, visibility) |
| `AdminReviewDisputeDetailPanel` | Panel lateral con confirmación antes de **Publicar** |

**Componentes sugeridos:**

```
components/admin/legal/
  AdminLegalDocumentsPageClient.tsx
  AdminLegalDocumentTable.tsx
  AdminLegalVersionList.tsx
  AdminLegalVersionEditor.tsx
  AdminLegalPublishConfirmModal.tsx
  legal-document-labels.ts
```

### 5.3 Capa datos frontend

```
repositories/interfaces.ts  → AdminLegalRepo, PublicLegalRepo, MeLegalRepo
repositories/ApiRepository.ts
lib/query/legal-documents.ts  → legalDocumentKeys.*
lib/legal/documentRoutes.ts
lib/legal/renderLegalContent.ts  → markdown → HTML (sanitizar)
```

### 5.4 Navegación admin

Añadir en `portalNavConfig.ts` (admin items):

```ts
{ href: '/admin/legales', label: 'Legales' }
```

Y entrada en `AdminOperationalLinks.tsx`.

### 5.5 Integraciones posteriores (fuera slice 1)

| Superficie | Comportamiento |
|------------|----------------|
| Footer | Links a `/legal/*` |
| Checkout | Checkbox + `POST /me/legal/accept` context `checkout` |
| Registro / solicitar perfil | Requirements por rol + links |
| Transferencia tickets | Sustituir constante por fetch `TICKET_TRANSFER_TERMS` |
| Referidos | Opcional: snippet desde `REFERRER_TERMS` o mantener disclaimer corto + link |

---

## 6. Recomendación de implementación por slices

| Slice | Alcance | Entregable |
|-------|---------|------------|
| **2 — Fundación** | Migración Prisma (3 modelos + enum audit), seed 10 documentos, `legal-documents` module, schemas shared, admin list + detalle read-only | Admin ve catálogo; API admin GET |
| **3 — Versionado** | CRUD borradores, publish/archive, auditoría, UI editor + confirm publish | Admin edita y publica sin tocar público aún |
| **4 — Público** | `GET /public/legal/*`, páginas `/legal`, footer links (mínimo) | Visitantes leen TyC publicados |
| **5 — Aceptación usuario** | `UserLegalAcceptance`, `GET/POST /me/legal/*`, requirements por rol | Registro/checkout pueden integrarse |
| **6 — Integración flujos** | Checkout, onboarding perfiles, transferencia, migrar constantes | Checklist § registro/onboarding |
| **7 — Pulido** | Histórico versiones públicas, export PDF opcional, smoke script, admin métricas aceptación | QA producción |

**Orden crítico:** 2 → 3 → 4 antes de 5 (necesitás versión publicada para aceptar).

**Tamaño estimado slice 2–3:** ~15–25 archivos; acotar PRs: backend primero, luego frontend admin.

---

## 7. Riesgos

| Riesgo | Impacto | Mitigación |
|--------|---------|------------|
| Edición accidental de texto **publicado** | Legal/compliance | Inmutabilidad post-publish; solo `DRAFT`; confirm modal |
| Falta de versionado | No se puede probar “qué aceptó el usuario” | `LegalDocumentVersion` + nunca overwrite `PUBLISHED` |
| Aceptación sin `versionId` | Disputas legales | Guardar `legalDocumentVersionId` + `documentKey` + timestamp |
| Documento **interno** visible en API pública | Filtración procedimientos soporte | `visibility=INTERNAL`; tests que assert 404 en público |
| Publicar sin contenido / markdown roto | UX / liability | Validación mínima longitud; preview admin |
| `AuditLog` sin acciones legales | Sin trazabilidad admin | Extender enum + log en publish |
| Footer/checkout antes de slice 4 | Links rotos | Feature flag o ocultar links hasta hay versión publicada |
| Admin config en páginas públicas (patrón actual) | Exponer endpoint admin | Legal **solo** vía `/public/legal` |
| XSS en contenido HTML | Seguridad | Sanitizar render; preferir markdown; CSP |
| Multi-tenant | Mezcla de textos entre tenants | `tenantId` en todas las queries; tests |
| Migrar constantes referidos/tickets | Texto divergente | Slice 6; documentar diff antes de borrar constantes |

---

## 8. Smoke tests sugeridos

### 8.1 API (`apps/api/scripts/` o ampliar smoke existente)

Con `X-Dev-User-Id` admin y usuario normal:

1. **Seed:** tenant tiene 10 `LegalDocument`.
2. **Admin:** `POST .../TERMS_GENERAL/versions` → borrador v1.
3. **Admin:** `PATCH` borrador con contenido.
4. **Admin:** `POST .../publish` → status `PUBLISHED`, anterior archivada si existía.
5. **Público:** `GET /public/legal/TERMS_GENERAL?tenantId=` → contenido publicado; **no** devuelve `INTERNAL_SUPPORT_PROCEDURES`.
6. **Usuario:** `POST /me/legal/accept` con `documentKey: TERMS_GENERAL` → 201; repetir → 200 idempotente.
7. **Usuario:** `GET /me/legal/requirements` → `TERMS_GENERAL` no pendiente.
8. **Admin:** Publicar v2 → usuario con solo v1 aceptada aparece “pendiente” en requirements.
9. **Audit:** `GET /admin/audit-logs?action=LEGAL_DOCUMENT_VERSION_PUBLISHED` contiene evento.

### 8.2 Manual UI

| # | Paso | Esperado |
|---|------|----------|
| 1 | `/admin/legales` como ADMIN | Lista 10 documentos |
| 2 | Crear borrador TyC | Editor guarda |
| 3 | Publicar con confirmación | Versión vigente visible en detalle |
| 4 | `/legal/terminos` sin login | HTML/markdown renderizado |
| 5 | Usuario acepta en checkout (slice 6) | Registro en admin export o DB |
| 6 | Mobile | Tabla admin usable (cards) |

### 8.3 Regresión

- Referidos y transferencia siguen mostrando avisos (constantes o API) hasta slice 6.
- `pnpm --filter api run smoke:api` sigue verde (no romper auth admin).

---

## 9. Referencias de código (patrones)

**Subcategorías admin (controller dedicado):**

```30:68:apps/api/src/modules/subcategories/admin-subcategories.controller.ts
@Controller('admin/subcategories')
@UseGuards(JwtOrDevAuthGuard, RolesGuard)
@RequireRole(Role.ADMIN)
export class AdminSubcategoriesController {
  // GET list, POST create, PATCH update, DELETE remove
}
```

**Auditoría operativa:**

```17:34:apps/api/src/modules/audit/audit.service.ts
  async logAction(params: LogActionParams): Promise<void> {
    await this.prisma.auditLog.create({ ... });
  }
```

**Admin categorías (UI CRUD):**

```26:40:apps/web/components/admin/subcategories/AdminSubcategoriesPageClient.tsx
export function AdminSubcategoriesPageClient() {
  const listQuery = useAdminSubcategories(tab);
  // mutations via repos.subcategories.*
}
```

**Aviso legal estático transferencia:**

```1:3:packages/shared/src/constants/ticket-transfer.ts
export const TICKET_TRANSFER_LEGAL_NOTICE =
  'Yo Te Invito solo facilita la transferencia técnica del ticket...';
```

---

## 10. Próximo paso (Slice 2)

1. Aprobar modelo §3 y catálogo de keys §2.
2. Crear migración Prisma + seed.
3. Implementar `LegalDocumentsModule` (admin + public + me) con schemas shared.
4. PR acotado: backend + tests script; frontend admin list en PR separado si hace falta.

**Slice 2–8 (2026-05-24):** módulo legal cerrado técnicamente (QA, `smoke:legal`, docs `docs/legal/LEGAL_ADMIN_MODULE.md`). Integración producto completa. **Pendiente negocio:** redacción legal profesional; bloqueos duros portal; migrar avisos hardcoded.

### Slice 8 — QA (2026-05-24)

| Área | Resultado |
|------|-----------|
| `pnpm --filter api run build` | ✅ |
| `pnpm --filter api run smoke:legal` | Ejecutar con API + dev auth |
| Admin RBAC | ✅ `Role.ADMIN`; 401 sin auth; 403 usuario USER |
| Público INTERNAL/DRAFT | ✅ 404 |
| Una PUBLISHED por doc | ✅ transacción publish |
| Aceptación por versionId | ✅ + re-pendiente tras nueva publish |
| Markdown | ✅ renderer seguro (sin HTML crudo) |
| Checklist redacción | ❌ no marcado (placeholders) |
