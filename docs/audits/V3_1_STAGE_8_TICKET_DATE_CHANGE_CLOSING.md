# V3.1 Etapa 8 — Cambio de fecha de entrada (cierre)

**Fecha:** 2026-06-10  
**Estado:** Cerrado con observaciones

---

## 1. Objetivo

Permitir al titular de una entrada cambiar de fecha en eventos multi-fecha, con reglas, solicitud usuario, elegibilidad, aprobación auto/manual, aplicación ticket/QR, notificaciones e historial.

---

## 2. Slices ejecutados

| Slice | Descripción | Doc |
|-------|-------------|-----|
| 8.1 | Política + constantes | `V3_1_STAGE_8_DATE_CHANGE_POLICY.md` |
| 8.2 | Modelo + solicitud usuario | `V3_1_STAGE_8_DATE_CHANGE_REQUEST_SMOKE.md` |
| 8.3 | Elegibilidad centralizada | `V3_1_STAGE_8_DATE_CHANGE_ELIGIBILITY_SMOKE.md` |
| 8.4 | Aprobación productora | `V3_1_STAGE_8_DATE_CHANGE_APPROVAL_SMOKE.md` |
| 8.5 | Aplicación ticket/stock | `V3_1_STAGE_8_DATE_CHANGE_APPLY_SMOKE.md` |
| 8.6 | Notificaciones/email | `V3_1_STAGE_8_DATE_CHANGE_NOTIFICATIONS_SMOKE.md` |
| 8.7 | Historial ticket/orden | `V3_1_STAGE_8_DATE_CHANGE_HISTORY_SMOKE.md` |
| 8.8 | Cierre QA | este documento |

---

## 3. Política final

Ver `docs/tickets/TICKET_DATE_CHANGE_POLICY.md`.

- Ventana: **24 h** antes de origen o destino.
- Stock obligatorio en destino.
- Auto-aprobación: mismo nombre + precio de ticket type.
- Sin cobro diferencia V1.
- QR `yti:v1:` **sin cambio**; scanner usa `occurrenceId` en BD.

---

## 4. Modelo

`TicketDateChangeRequest` + migración `20260618120000_ticket_date_change`.

---

## 5. Estados

`PENDING` | `APPROVED` | `REJECTED` | `APPLIED` | `CANCELLED`

---

## 6. API

| Ruta | Rol |
|------|-----|
| `GET /me/tickets/:id/date-change-options` | Usuario |
| `POST /me/tickets/:id/date-change-requests` | Usuario |
| `GET /me/tickets/:id/date-change-history` | Usuario |
| `GET /producer/events/:eventId/date-change-requests` | Productora |
| `POST /producer/date-change-requests/:id/approve` | Productora |
| `POST /producer/date-change-requests/:id/reject` | Productora |

---

## 7. QA ejecutado

| Check | Resultado |
|-------|-----------|
| `pnpm --filter shared run build` | OK |
| `npx nest build` (API) | OK |
| `pnpm --filter web run build` | OK |
| `smoke:v31-ticket-date-change` | Pendiente migración local si dev server bloquea `prisma generate` |

---

## 8. Pendientes

- Flag `Event.dateChangeRequiresApproval` en wizard productora.
- Cobro diferencia de precio integrado.
- QA manual puerta post-cambio en dispositivo.
- `pnpm --filter scanner run build` — sin cambios scanner (QR id-only).

---

## 9. Recomendación

Pasar a **V3.1 Etapa 9 — Transferencia de entradas** (QA §26) tras aplicar migración en entornos y smoke con datos multi-fecha.
