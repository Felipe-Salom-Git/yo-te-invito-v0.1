# V3.1 Etapa 11 — Slice 11.2 — Verificación `producer_terms`

**Fecha:** 2026-06-10  
**Continúa:** `V3_1_STAGE_11_LEGAL_PUBLICATION_AUDIT.md`

---

## Slug final

| Campo | Valor |
|-------|-------|
| Key BD / admin | `producer_terms` |
| Slug público | `productores` |
| URL | `/legal/productores` |
| Fuente redacción | `docs/legal/04_CONDICIONES_PRODUCTORES.md` |

---

## Estado published / draft

| Campo | Valor local (2026-06-10) |
|-------|--------------------------|
| Draft | ✅ v1 — «Condiciones para Productores, Productoras y Organizadores — Yo Te Invito» |
| Published | ❌ **No publicado** |
| `isRequiredForPortalAccess` | ✅ `true` (perfil PRODUCER) |
| Flag event publication | No existe campo dedicado — Caso A usa key `producer_terms` + contexto `EVENT_PUBLICATION` |

---

## Flags legales

- **PORTAL_ACCESS:** requerido para productoras (`appliesToProfiles: ['PRODUCER']`).
- **EVENT_PUBLICATION:** implementado en Slice 11.3 — aceptación por `eventId` al enviar a revisión.

---

## Link público

- Footer: `{ href: '/legal/productores', label: 'Productores' }` (`footerLegalLinks.ts`).
- Wizard: `ProducerEventPublicationLegalNotice` → `/legal/productores`.
- **Estado actual:** ruta existe; **contenido 404** hasta publicar en admin.

---

## `ProducerEventPublicationLegalNotice`

- Apunta a slug correcto (`/legal/productores`).
- Slice 11.3+: consulta `GET /producer/events/:eventId/legal/publication-terms`.
- Sin publicación: aviso ámbar + bloqueo al enviar a revisión (Slice 11.4).

---

## Bloqueo operativo

**No se publicó automáticamente** — el cliente/asesor legal debe aprobar y publicar manualmente.

### Checklist acción cliente

1. Revisar `docs/legal/04_CONDICIONES_PRODUCTORES.md` con asesoría.
2. `seed:legal-content --force` si se actualizó el Markdown en repo.
3. `/admin/legales` → `producer_terms` → revisar borrador → **Publicar**.
4. Verificar `/legal/productores` en navegador.
5. Probar wizard productora: aceptar términos + enviar evento draft a revisión.

---

## QA Slice 11.2

| Prueba | Resultado |
|--------|-----------|
| Admin ve `producer_terms` | ✅ |
| Versión publicada | ❌ Pendiente cliente |
| `/legal/productores` | ❌ 404 (esperado sin publish) |
| Aviso wizard sin 404 en link | ✅ (link correcto; destino 404) |
| UI informativa sin bloqueo previo 11.4 | ✅ Caso B → reemplazado por 11.4 con mensaje claro |
