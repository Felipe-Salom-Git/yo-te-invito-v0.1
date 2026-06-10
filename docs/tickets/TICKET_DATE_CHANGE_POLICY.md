# Política de cambio de fecha de entrada (V3.1 Etapa 8)

**Versión:** V1  
**Fecha:** 2026-06-10  
**Estado:** Definida — implementación slices 8.2–8.8

---

## 1. Objetivo

Permitir que el **titular actual** de una entrada cambie la fecha/función cuando el evento tiene **múltiples fechas** (`EventOccurrence`), sin reembolsos ni cobros adicionales en V1.

---

## 2. Alcance V1

| Incluido | Excluido |
|----------|----------|
| Solicitud desde `/me/tickets/[ticketId]` | Cobro de diferencia de precio |
| Auto-aprobación reglas simples | Reembolsos |
| Aprobación manual productora | Pagos / Getnet |
| Aplicación ticket + stock | Eventos single-date |
| Auditoría persistente | UI productora avanzada (filtros masivos) |
| Notificaciones in-app + email | Flag por evento “siempre manual” (TODO Etapa 9+) |

---

## 3. Reglas de elegibilidad

Un ticket **puede** solicitar cambio si cumple **todas**:

1. El usuario es el **titular actual** (`ownerUserId` o comprador con email de orden pagada).
2. `status === VALID`.
3. No fue usado (`usedAt` null).
4. No revocado.
5. No en transferencia pendiente (`TRANSFER_PENDING` ni `activeTransferOffer`).
6. El evento tiene **≥ 2** `EventOccurrence` activas (multi-fecha).
7. El ticket tiene `occurrenceId` (fecha origen).
8. La fecha destino pertenece al **mismo evento**, está `ACTIVE`, con stock.
9. Existe **tipo de entrada compatible** en destino (mismo `name` + mismo `price`).
10. Dentro de la **ventana temporal**: ≥ 24 h antes del inicio de la fecha **origen** y del inicio de la fecha **destino** (la más restrictiva gana).
11. No hay otra solicitud `PENDING` para el mismo ticket.

### Bloqueos explícitos

| Condición | Resultado |
|-----------|-----------|
| Ticket usado | Bloqueado |
| Ticket revocado | Bloqueado |
| `TRANSFER_PENDING` | Bloqueado |
| Evento single-date | Acción oculta |
| Destino agotado | No listado / error |
| Destino cancelada/pausada | No listado |
| Misma fecha origen y destino | Bloqueado |
| Fuera de ventana 24 h | Bloqueado |
| Diferencia de precio sin tipo compatible | Requiere aprobación manual o bloqueo |

---

## 4. Ventana temporal

- Constante: `TICKET_DATE_CHANGE_WINDOW_HOURS = 24` (`packages/shared/src/constants/ticket-date-change.ts`).
- Cálculo: `now + 24h <= min(fromOccurrence.startAt, toOccurrence.startAt)`.
- Ticket “vencido”: si la fecha origen ya pasó (`endAt ?? startAt < now`), no elegible.

---

## 5. Disponibilidad y stock

- El destino debe tener `TicketType` compatible con `capacityAvailable >= 1`.
- Al **aplicar** el cambio (transacción):
  - `capacityAvailable++` en tipo origen (si existe).
  - `capacityAvailable--` en tipo destino (condición atómica `gte: 1`).
- No se tocan pagos ni montos de la orden original.

---

## 6. Aprobación

### Auto-aprobación (V1)

Aplicar de inmediato si:

- Todas las validaciones de elegibilidad pasan.
- Mismo evento.
- Tipo compatible con **mismo precio** (string decimal igual).
- Sin flag manual de evento (futuro).

Flujo: `PENDING` → `APPROVED` → `APPLIED` en la misma transacción.

### Aprobación productora (manual)

Requerida si:

- No hay tipo compatible al mismo precio (`PRICE_MISMATCH` / `NO_COMPATIBLE_TICKET_TYPE`).
- Política manual del evento (TODO: campo `Event.dateChangeRequiresApproval`).

Estados: `PENDING` hasta que productora aprueba o rechaza.

### Rechazo

Productora puede rechazar con motivo opcional → `REJECTED`. El ticket no cambia.

---

## 7. Diferencia de precio (V1)

- **No** se cobra diferencia automáticamente.
- Si el precio en destino difiere: **no auto-aprobar**; solicitud queda `PENDING` para revisión manual.
- Si no hay tipo equivalente: bloquear o pendiente manual según caso.
- Gestión de cobro manual: fuera de V1 (contacto soporte/productora).

---

## 8. QR y scanner

**Decisión V1:** el payload QR es `yti:v1:{random}` — **no codifica fecha**.

| Aspecto | Comportamiento |
|---------|----------------|
| QR físico/digital | **Se mantiene** (`qrPayload` sin cambio) |
| Validación scanner | Backend resuelve `ticket.occurrenceId` actualizado |
| Fecha incorrecta en puerta | Resultado `WRONG_OCCURRENCE` |
| Tickets legacy sin occurrence | Sin cambio de fecha (single-date) |

No se regenera QR al aplicar cambio; el ticket visual muestra la nueva fecha desde API.

---

## 9. Transferencias

| Estado transferencia | Cambio de fecha |
|---------------------|-----------------|
| `TRANSFER_PENDING` | **No permitido** |
| Transferido — nuevo titular | El **titular actual** puede solicitar |
| Después de cambio aplicado | Transferencia posterior conserva nueva fecha |

---

## 10. Modelo de datos

### `TicketDateChangeRequest`

| Campo | Tipo | Notas |
|-------|------|-------|
| `id` | cuid | PK |
| `tenantId` | string | |
| `ticketId` | string | FK Ticket |
| `requestedByUserId` | string | FK User |
| `fromOccurrenceId` | string | FK EventOccurrence |
| `toOccurrenceId` | string | FK EventOccurrence |
| `fromTicketTypeId` | string? | snapshot |
| `toTicketTypeId` | string? | tipo destino compatible |
| `status` | enum | ver §11 |
| `message` | string? | mensaje usuario |
| `rejectReason` | string? | motivo rechazo |
| `reviewedByUserId` | string? | productora |
| `reviewedAt` | DateTime? | |
| `appliedAt` | DateTime? | |
| `createdAt` / `updatedAt` | DateTime | |

**Siempre persistir** solicitudes (incluso auto-aprobadas) para auditoría e historial.

---

## 11. Estados de solicitud

| Estado | Significado |
|--------|-------------|
| `PENDING` | Esperando aprobación productora |
| `APPROVED` | Aprobada, pendiente de aplicación (transitorio en auto-flujo) |
| `REJECTED` | Rechazada por productora |
| `APPLIED` | Cambio efectivo en ticket |
| `CANCELLED` | Cancelada (futuro / admin) |

Estados de elegibilidad UI:

- `canRequest: true` — puede abrir modal.
- `canRequest: false` + `reasons[]` — mensajes al usuario.

---

## 12. Auditoría

`AuditAction` (Prisma):

- `TICKET_DATE_CHANGE_REQUESTED`
- `TICKET_DATE_CHANGE_APPROVED`
- `TICKET_DATE_CHANGE_REJECTED`
- `TICKET_DATE_CHANGE_APPLIED`

`entityType`: `TicketDateChangeRequest` o `Ticket` según evento.

---

## 13. Notificaciones y emails (slices 8.6+)

| Evento | Usuario | Productora | Email template |
|--------|---------|------------|----------------|
| Solicitud creada (pending) | In-app | In-app alerta | `TICKET_DATE_CHANGE_REQUESTED` |
| Pendiente manual | — | `TICKET_DATE_CHANGE_PENDING_PRODUCER` | Sí |
| Aprobada/aplicada auto | In-app | — | `TICKET_DATE_CHANGE_APPLIED` |
| Rechazada | In-app | — | `TICKET_DATE_CHANGE_REJECTED` |

Fallo de email **no** bloquea el flujo.

---

## 14. API (resumen)

| Método | Ruta | Rol |
|--------|------|-----|
| GET | `/me/tickets/:ticketId/date-change-options` | Usuario |
| POST | `/me/tickets/:ticketId/date-change-requests` | Usuario |
| GET | `/producer/events/:eventId/date-change-requests` | Productora |
| POST | `/producer/date-change-requests/:id/approve` | Productora |
| POST | `/producer/date-change-requests/:id/reject` | Productora |

---

## 15. Riesgos y pendientes

| Riesgo | Mitigación |
|--------|------------|
| Race en stock | Transacción Prisma + `updateMany` con `gte` |
| Doble apply | Idempotencia: si `APPLIED`, retornar estado |
| Ticket usado entre solicitud y aprobación | Re-validar elegibilidad al aprobar/aplicar |
| Courtesía sin order | Soportada si tiene `ticketTypeId` + `occurrenceId` |

**TODO futuro:**

- `Event.dateChangeRequiresApproval` en wizard productora.
- Cobro diferencia de precio integrado.
- Cancelación de solicitud por usuario.
- Admin global de solicitudes.

---

## 16. Referencias

- Etapa 7: `docs/audits/V3_1_STAGE_7_MULTI_DATE_EVENTS_CLOSING.md`
- Checklist §25.3: `docs/dev/Yo_Te_Invito_Checklist_V3_1_Mejoras_Cliente.md`
- Constantes: `packages/shared/src/constants/ticket-date-change.ts`
