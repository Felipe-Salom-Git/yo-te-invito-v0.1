# V3.1 Etapa 11 — Cierre Legales pendientes

**Fecha:** 2026-06-10  
**Estado:** **Cerrado con observaciones** — técnica completa; publicación contenido real pendiente cliente.

---

## 1. Objetivo de etapa

Auditar y cerrar flujos legales V3.1: publicación administrable, `producer_terms`, aceptación por evento (`EVENT_PUBLICATION`), bloqueo al publicar, QA integrado.

---

## 2. Slices ejecutados

| Slice | Entregable |
|-------|------------|
| 11.1 | `V3_1_STAGE_11_LEGAL_PUBLICATION_AUDIT.md` |
| 11.2 | `V3_1_STAGE_11_PRODUCER_TERMS_PUBLICATION.md` |
| 11.3 | Migración + endpoints + UI aceptación |
| 11.4 | Bloqueo backend + frontend wizard |
| 11.5 | Este documento + actualización checklists |

---

## 3. Estado documentos legales (local)

10 documentos catálogo; **0 publicados**; 10 DRAFT v1 importados desde `docs/legal/`.

---

## 4. Documentos publicados

Ninguno en entorno auditado. **No marcar checklist de publicación `[x]`.**

---

## 5. Pendientes aprobación cliente

- Todos los documentos en `docs/legal/*.md`.
- Prioridad go-live: `terms_general`, `privacy_policy`, `purchase_refund_policy`, **`producer_terms`**.

---

## 6. Registro

- Integración SIGNUP operativa en código.
- **Bloqueado en práctica** sin docs publicados (`canProceed: false`).

---

## 7. Checkout

- Integración CHECKOUT operativa.
- Requiere `terms_general` + `purchase_refund_policy` publicados.

---

## 8. Portal access

- Banner `PortalLegalPendingBanner` para verticales comerciales.
- Requiere docs verticales publicados.

---

## 9. Productora event publication

- `EVENT_PUBLICATION` + `eventId` en `UserLegalAcceptance`.
- Endpoints producer legal.
- UI paso 3 wizard (edición).

---

## 10. Bloqueo duro

- `PATCH` evento → `PENDING` valida aceptación + doc publicado.
- Draft editable sin aceptación.

---

## 11. Matriz QA

### Legal Admin

| Caso | Estado |
|------|--------|
| `/admin/legales` carga | ✅ |
| Draft / historial / publish UI | ✅ (código) |
| Internal no público | ✅ |

### Registro / Checkout / Portal

| Caso | Estado |
|------|--------|
| Links legales presentes | ✅ |
| Aceptación obligatoria (código) | ✅ |
| Flujo completo sin docs publicados | ⚠️ Bloqueado — esperado |

### Productora

| Caso | Estado |
|------|--------|
| Draft sin aceptar | ✅ |
| PENDING sin aceptar | ✅ Bloqueado |
| Aceptar + PENDING | ✅ (con doc publicado) |
| `/legal/productores` | ❌ 404 sin publish |

### Público

| Caso | Estado |
|------|--------|
| Footer links | ✅ rutas; ❌ contenido sin publish |
| Internal oculto | ✅ |

---

## 12. Comandos ejecutados

```bash
npx prisma migrate deploy
npx prisma generate
pnpm --filter shared run build
pnpm --filter api run lint
pnpm --filter api run build
pnpm --filter web run lint
pnpm --filter web run build
pnpm --filter api run smoke:legal          # si API + credenciales
pnpm --filter api run smoke:v31-event-publication-legal
```

---

## 13. Riesgos / pendientes Etapa 12

- Publicación manual de textos aprobados (cliente).
- QA manual browser matriz registro/checkout/portales.
- Migrar disclaimers hardcoded a docs publicados.
- Bloqueos duros otras verticales (gastro descuentos, referidos pago) — fuera de alcance Etapa 11.
