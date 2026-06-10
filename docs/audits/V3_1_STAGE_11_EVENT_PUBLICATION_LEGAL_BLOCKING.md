# V3.1 Etapa 11 — Slice 11.4 — Bloqueo duro publicación evento

**Fecha:** 2026-06-10

---

## Backend

**Archivo:** `producer-events-crud.service.ts`

Antes de `DRAFT → PENDING`:

```typescript
await this.eventPublicationLegal.assertCanSubmitEventForReview(...)
```

| Error | Código | Cuándo |
|-------|--------|--------|
| Doc no publicado | `LEGAL_DOCUMENT_NOT_PUBLISHED` | Sin `producer_terms` PUBLISHED |
| Sin aceptación | `LEGAL_ACCEPTANCE_REQUIRED` | Sin aceptación vigente para `eventId` + versión actual |

**No bloquea:**
- Guardar draft (`status: DRAFT`).
- Editar eventos ya `PENDING` / `APPROVED` sin transición a PENDING.
- `create` — siempre crea `DRAFT`.

---

## Frontend

**`ProducerEventEditForm`:**
- `legalBlocksSubmit` cuando `form.status === 'pending'` y falta aceptación.
- Botón deshabilitado + mensaje explícito.
- Errores API mostrados vía `getErrorMessage` (mensaje del backend).

**`ProducerEventPublicationLegalNotice`:**
- Muestra estado: no publicado / pendiente aceptación / aceptado (versión).

---

## Versión legal nueva

Si admin publica nueva versión de `producer_terms`:
- `requiresNewAcceptance: true` en GET status.
- Usuario debe volver a aceptar antes de enviar a revisión.

---

## QA

| Escenario | Resultado esperado |
|-----------|-------------------|
| Crear draft sin aceptar | ✅ Permitido |
| Enviar a revisión sin aceptar | ❌ Bloqueado BE + FE |
| Aceptar → enviar | ✅ Permitido |
| Doc no publicado | ❌ `LEGAL_DOCUMENT_NOT_PUBLISHED` |
| Evento ya APPROVED editar campos | ✅ Sin re-aceptación |
| Admin approval cola | ✅ Sin cambios |

---

## Smoke

`pnpm --filter api run smoke:v31-event-publication-legal`
