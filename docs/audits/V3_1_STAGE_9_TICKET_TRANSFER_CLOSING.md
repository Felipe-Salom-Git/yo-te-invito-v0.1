# V3.1 Etapa 9 — Transferencia de entradas (cierre)

**Fecha:** 2026-06-10  
**Estado:** Cerrado con observaciones  
**Rama:** `feat/v1-s03-api-foundation`

---

## 1. Objetivo

Auditar, verificar y endurecer la transferencia personal de entradas entre usuarios registrados (sin marketplace/reventa).

---

## 2. Slices ejecutados

| Slice | Doc |
|-------|-----|
| 9.1 Auditoría | `V3_1_STAGE_9_TICKET_TRANSFER_AUDIT.md` |
| 9.2 Flujo emisor/receptor | `V3_1_STAGE_9_TICKET_TRANSFER_FLOW_SMOKE.md` |
| 9.3 Restricciones | `V3_1_STAGE_9_TICKET_TRANSFER_RESTRICTIONS.md` |
| 9.4 Emails | `V3_1_STAGE_9_TICKET_TRANSFER_EMAILS_SMOKE.md` |
| 9.5 QR/scanner | `V3_1_STAGE_9_TICKET_TRANSFER_QR_SMOKE.md` |
| 9.6 Cierre | este documento |

---

## 3. Estado final

Flujo **operativo**: crear oferta → pending → aceptar/rechazar/cancelar/expirar → ticket destino con QR nuevo. Scanner bloquea pending/transferred. Emails y notificaciones conectados (incl. expiración).

---

## 4. Modelo / estados

`TicketTransferOffer` + `TicketTransfer` + estados ticket `TRANSFER_PENDING` / `TRANSFERRED`.

---

## 5. API

Ver `docs/user/TICKET_TRANSFER.md` y auditoría 9.1.

---

## 6. UI

`/me/tickets/[ticketId]`, `/me/ticket-transfer/[token]`, `/me/activity?tab=transfers`, `/me/notifications`.

---

## 7. Matriz QA

| Área | Automatizado | Manual pendiente |
|------|--------------|------------------|
| Crear/cancelar/pending | smoke:user-portal | — |
| Aceptar/rechazar | smoke:user-portal (opt-in destructivo) | UI móvil |
| Restricciones | smoke:v31-ticket-transfer-flow | tickets edge en BD |
| Emails | smoke:email-template (por ID) | SMTP real |
| Scanner | smoke:user-portal | Puerta PWA prod |
| Multi-fecha | occurrenceId en accept | E2E occurrence scan |
| Regresión compra | — | smoke:user-portal checkout |

---

## 8. Comandos ejecutados

| Comando | Resultado |
|---------|-----------|
| `npx nest build` (api) | OK |
| `pnpm --filter web run build` | OK |
| `pnpm --filter api run smoke:v31-ticket-transfer-flow` | OK |

---

## 9. Pendientes / riesgos

- `TicketSource.TRANSFER` no existe en Prisma — destino hereda `source` del origen.
- `TicketTransferService` legacy sin endpoint activo (410).
- QA producción §26.1 «activa en producción» requiere verificación ops.
- Ticket `TRANSFERRED` con `ownerUserId` aún emisor (pre-accept pending) visible en listado — esperado.

---

## 10. Siguiente etapa

Puede avanzarse a **V3.1 Etapa 10 — Gastronomía: horarios avanzados** salvo hotfix ops en transferencias prod.
