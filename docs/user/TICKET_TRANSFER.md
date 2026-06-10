# Transferencia personal de tickets

Yo Te Invito facilita la **transferencia técnica** de un ticket entre usuarios registrados. **No** hay marketplace, **no** hay pagos entre usuarios, **no** hay comisiones ni liquidación por reventa en la plataforma.

Si las partes acuerdan una reventa de forma personal, pueden usar la transferencia para cambiar el titular del ticket. Cualquier acuerdo económico ocurre **por fuera** de Yo Te Invito.

## Modelo

| Entidad | Rol |
|---------|-----|
| `TicketTransferOffer` | Operación pendiente (estado técnico `AVAILABLE` = **Pendiente** en UI) |
| `TicketTransfer` | Log histórico al completar |
| Ticket origen | `TRANSFER_PENDING` mientras hay oferta activa; `TRANSFERRED` al completar |
| Ticket destino | Nuevo registro con **nuevo `qrPayload`** y `ownerUserId` = receptor |

Campos opcionales en la oferta: `message` (nota al receptor), `rejectedAt` (si el receptor rechaza).

## Reglas

- Solo usuarios registrados (emisor y receptor con sesión).
- Solo tickets `VALID`, no usados ni revocados.
- El evento no debe haber finalizado (`endAt` o `startAt` en el pasado).
- Una oferta activa (`AVAILABLE` / `RESERVED`) por ticket.
- No transferir a uno mismo.
- `recipientEmail` en create resuelve al usuario del tenant; fija `buyerUserId`.
- Al crear oferta: QR original bloqueado (scanner inválido).
- Al cancelar, rechazar o expirar: origen vuelve a `VALID`.
- Al aceptar: origen `TRANSFERRED` (definitivo); receptor recibe ticket nuevo con **nuevo `qrPayload`** y mismo `occurrenceId` si aplica (multi-fecha).
- Expiración automática: cron cada 15 min (10 min en dev); variable `TICKET_TRANSFER_CRON_ENABLED=false` para desactivar; email `TICKET_TRANSFER_EXPIRED` a emisor/receptor.
- Elegibilidad centralizada: `TicketTransferEligibilityService` (usado / revocado / vencido / pending / evento cancelado / cambio fecha pending).

## API (portal)

```
POST   /me/tickets/:ticketId/transfer-offers     { recipientEmail?, message?, expiresInHours? }
GET    /me/ticket-transfer-offers?role=sent|received|all
GET    /me/ticket-transfer-offers/lookup/:token
POST   /me/ticket-transfer-offers/:offerId/cancel
POST   /me/ticket-transfer-offers/:offerId/reject
POST   /me/ticket-transfer-offers/:token/accept
```

Legacy (eliminado):

```
POST   /tickets/:ticketId/transfer   → 410 Gone (usar transfer-offers)
```

## Auditoría

Eventos en `AuditLog.metadata.transferEvent`: `TICKET_TRANSFER_CREATED`, `TICKET_TRANSFER_CANCELLED`, `TICKET_TRANSFER_REJECTED`, `TICKET_TRANSFER_EXPIRED`, `TICKET_TRANSFER_ACCEPTED`.

## UI

- Detalle ticket `/me/tickets/:id` — **Transferir ticket** + aviso legal
- Actividad `/me/activity?tab=transfers` — aceptar / rechazar
- Aceptación `/me/ticket-transfer/[token]` — lookup, aceptar, rechazar, aviso legal

## Venta primaria (sin cambios)

Checkout, órdenes, pagos con pasarela (Getnet / Mercado Pago cuando aplique) y emisión de tickets por compra siguen en el flujo de eventos — **no** es transferencia entre usuarios.

## Referencias

- Migración marketplace: `20260605120000_remove_resale_marketplace`
- Migración mensaje/rechazo: `20260606120000_ticket_transfer_offer_message`
- Smokes: `pnpm --filter api run smoke:v31-ticket-transfer-flow`, `smoke:user-portal` (sección transfer).
- Cierre Etapa 9: `docs/audits/V3_1_STAGE_9_TICKET_TRANSFER_CLOSING.md`
