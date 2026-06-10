# V3.1 Etapa 8 Slice 8.1 — Auditoría política cambio de fecha

**Fecha:** 2026-06-10  
**Estado:** Cerrado (diseño)

---

## 1. Modelo actual post-Etapa 7

| Entidad | Campo relevante | Estado |
|---------|-----------------|--------|
| `EventOccurrence` | `startAt`, `status`, `capacity` | OK — multi-fecha |
| `TicketType` | `occurrenceId`, `capacityAvailable`, `price` | OK — stock por fecha |
| `Ticket` | `occurrenceId`, `status`, `qrPayload` | OK |
| `Order` / `OrderItem` | `occurrenceId` | OK — checkout |
| Scanner | `occurrenceId` en scan, `WRONG_OCCURRENCE` | OK |

**No existía** modelo de cambio de fecha antes de Etapa 8.

---

## 2. Decisiones V1 documentadas

| Pregunta | Decisión |
|----------|----------|
| ¿Hasta cuándo? | 24 h antes de origen **o** destino (más restrictivo) |
| ¿Disponibilidad? | Sí — stock en destino obligatorio |
| ¿Aprobación? | Auto si mismo tipo+nombre+precio; manual si no |
| ¿Costo adicional? | No en V1; diferencia de precio → manual/bloqueo |
| ¿Agotado? | No permitir |
| ¿Usado/revocado? | No permitir |
| ¿QR? | Mantener `qrPayload`; actualizar `occurrenceId` |
| ¿Transferencia pending? | No permitir |
| ¿Persistir request? | Siempre, incluso auto-aprobado |

---

## 3. Modelo propuesto

`TicketDateChangeRequest` — ver `docs/tickets/TICKET_DATE_CHANGE_POLICY.md` §10.

---

## 4. Constantes preparadas

- `packages/shared/src/constants/ticket-date-change.ts`
- `packages/shared/src/schemas/ticket-date-change.ts`

---

## 5. Riesgos identificados

1. **Condición de carrera en stock** — mitigar con transacción atómica.
2. **Ticket sin `occurrenceId` en evento multi-fecha** — bloquear con `NO_OCCURRENCE`.
3. **Aprobación con ticket ya usado** — re-validar en approve/apply.
4. **Flag manual por evento** — pendiente; V1 solo usa regla precio/tipo.

---

## 6. Pendientes Slice 8.2+

- Migración Prisma + servicios.
- Endpoints `/me` y `/producer`.
- UI portal usuario y productora.
- Notificaciones (8.6).
- Historial (8.7).
- QA cierre (8.8).

---

## 7. QA Slice 8.1

No QA funcional — solo documentación y constantes shared.
