# V3.1 Etapa 11 — Slice 11.1 — Auditoría publicación documentos legales

**Fecha:** 2026-06-10  
**Tenant auditado:** `tenant-demo` (local)  
**Script:** `pnpm --filter api exec tsx scripts/audit-legal-publication-status.ts`

---

## 1. Estado legal actual

| Área | Estado |
|------|--------|
| Módulo Legal Admin (técnico) | ✅ Cerrado (2026-05-24) — `/admin/legales`, draft/publish, `/legal/[slug]` |
| Contenido redactado en repo | ✅ `docs/legal/*.md` importado como DRAFT vía `seed:legal-content` |
| Versiones **PUBLISHED** en BD local | ❌ **Ninguna** — los 10 documentos tienen solo DRAFT v1 |
| Bootstrap / placeholder prod | ⚠️ Documentado en checklist — reemplazar antes de go-live |
| Aceptación SIGNUP/CHECKOUT/PORTAL | ✅ Integrada en código; **bloqueada operativamente** sin docs publicados |
| `EVENT_PUBLICATION` | ⏳ Slice 11.3+ (migración en este bloque) |

**Conclusión:** La plataforma está lista para publicación manual desde Admin; **no hay aprobación/publicación real del cliente** en el entorno auditado.

---

## 2. Tabla de documentos

| Documento | Key | Slug | Draft | Publicado | SIGNUP | CHECKOUT | PORTAL | Visibilidad | Requiere aprobación cliente | Acción pendiente |
|-----------|-----|------|-------|-----------|--------|----------|--------|-------------|----------------------------|------------------|
| Términos generales | `terms_general` | `terminos` | v1 ✅ | ❌ | ✅ | ✅ | ✅ | PUBLIC | ✅ | Revisar + publicar en `/admin/legales` |
| Privacidad | `privacy_policy` | `privacidad` | v1 ✅ | ❌ | ✅ | — | — | PUBLIC | ✅ | Revisar + publicar |
| Compra/cancelación/reembolso | `purchase_refund_policy` | `compras-cancelaciones-reembolsos` | v1 ✅ | ❌ | — | ✅ | — | PUBLIC | ✅ | Revisar + publicar |
| Productores | `producer_terms` | `productores` | v1 ✅ | ❌ | — | — | ✅ | PUBLIC | ✅ | **Crítico** — bloquea Caso A eventos |
| Gastronómicos | `gastro_terms` | `gastronomicos` | v1 ✅ | ❌ | — | — | ✅ | PUBLIC | ✅ | Revisar + publicar |
| Rentals | `rental_terms` | `rentals` | v1 ✅ | ❌ | — | — | ✅ | PUBLIC | ✅ | Revisar + publicar |
| Hoteles | `hotel_terms` | `hoteles` | v1 ✅ | ❌ | — | — | ✅ | PUBLIC | ✅ | Revisar + publicar |
| Referidos | `referrer_terms` | `referidos` | v1 ✅ | ❌ | — | — | ✅ | PUBLIC | ✅ | Revisar + publicar |
| Transferencia tickets | `ticket_transfer_terms` | `transferencia-tickets` | v1 ✅ | ❌ | — | — | ✅ | PUBLIC | ✅ | Revisar + publicar |
| Procedimiento soporte | `support_internal_procedure` | *(sin slug)* | v1 ✅ | ❌ | — | — | — | **INTERNAL** | ✅ | Solo uso admin; no publicar como PUBLIC |

---

## 3. Slugs revisados

Públicos (9): `terminos`, `privacidad`, `compras-cancelaciones-reembolsos`, `productores`, `gastronomicos`, `rentals`, `hoteles`, `referidos`, `transferencia-tickets`.

Interno: `support_internal_procedure` — sin ruta pública (correcto).

Fuente: `packages/shared/src/constants/legal-documents.ts` · `LEGAL_ADMIN_MODULE.md` §2.

---

## 4. Estado draft / published

- **Draft:** los 10 documentos tienen versión `DRAFT` v1 con contenido importado desde `docs/legal/` (títulos profesionales, no placeholder seed).
- **Published:** 0 documentos con versión `PUBLISHED`.
- **Archivados:** 0.

---

## 5. Links públicos revisados (código)

| Origen | Links | Estado sin publish |
|--------|-------|-------------------|
| Footer `FOOTER_LEGAL_LINKS` | 9 slugs | Rutas existen → **404** hasta publicar |
| Footer esencial checkout | `terminos`, `privacidad`, `compras-cancelaciones-reembolsos` | Idem |
| Registro `RegisterWizard` | `GET /public/legal/requirements?context=SIGNUP` | `canProceed: false` si falta publish |
| Checkout `/me/cart`, `/checkout/*` | CHECKOUT requirements | Bloqueado sin publish |
| Portales comerciales | `PortalLegalPendingBanner` PORTAL_ACCESS | Banner pendiente sin publish |
| Productora wizard | `/legal/productores` | Link OK; página 404 sin publish |

---

## 6. Documentos internos

- `support_internal_procedure` — `visibility: INTERNAL`, sin slug.
- `GET /public/legal/:slug` devuelve 404 para internal (correcto).
- No aparece en footer ni registro.

---

## 7. Riesgos

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Go-live sin publicar `terms_general` / `privacy_policy` | Alta | Publicar antes de abrir registro público |
| `producer_terms` en DRAFT bloquea publicación de eventos (post 11.4) | Media | Publicar cuando asesoría apruebe |
| Footer con 9 links → 404 masivo | Media | Publicar docs o ocultar links no publicados (no implementado) |
| Contenido `docs/legal/` no sustituye asesoría | Legal | Cliente debe aprobar antes de publish |
| Prod bootstrap temporal (Mayo 2026) | Alta | Reemplazar en `/admin/legales` |

---

## 8. Pendientes cliente / asesor legal

1. Revisar y aprobar cada archivo en `docs/legal/`.
2. Publicar manualmente en `/admin/legales` (no usar `seed:legal-content --publish` en prod sin revisión).
3. Prioridad: `terms_general`, `privacy_policy`, `purchase_refund_policy`, **`producer_terms`**.
4. Confirmar aclaraciones productor ↔ referido (Slice Legal Content 2).
5. Migrar disclaimers hardcoded (transferencia, referidos) a docs publicados (post-V3.1).

---

## 9. Pasos manuales para publicar (checklist operativo)

1. `pnpm --filter api run seed:legal-content -- --dry-run` — verificar mapeo.
2. `pnpm --filter api run seed:legal-content` — actualizar borradores si hubo cambios en `docs/legal/`.
3. Ingresar como ADMIN → `/admin/legales`.
4. Por cada documento aprobado:
   - Abrir detalle → revisar borrador (preview Markdown).
   - Ajustar texto si hace falta → Guardar borrador.
   - **Publicar** → confirmar versión v1 (o siguiente).
5. Verificar público: `/legal/{slug}` carga sin 404.
6. Verificar registro: `GET /public/legal/requirements?context=SIGNUP` → `canProceed: true`.
7. `pnpm --filter api run smoke:legal` — PASS con API + dev auth.

**No marcar checklist `[x]` de redacción/publicación hasta completar pasos 4–6 en el entorno objetivo.**

---

## QA Slice 11.1

| Prueba | Resultado local |
|--------|-----------------|
| `/admin/legales` carga | ✅ (requiere ADMIN + sesión) |
| Draft visible en admin | ✅ 10 documentos DRAFT v1 |
| `/legal/terminos` publicado | ❌ 404 (sin PUBLISHED) |
| Documento internal no público | ✅ sin slug |
| Script audit JSON | ✅ `audit-legal-publication-status.ts` |
