# V3.1 Etapa 9 — Transferencia de entradas (auditoría Slice 9.1)

**Fecha:** 2026-06-10  
**Rama:** `feat/v1-s03-api-foundation`  
**Estado:** Auditoría completada — implementación parcial con gaps documentados  
**Checklist:** §26.1 — **no cerrado** (pendiente QA slices 9.2–9.6)

---

## 1. Resumen ejecutivo

La transferencia personal de entradas **está implementada** de punta a punta (API, UI portal `/me`, emails, scanner, cron de expiración, smoke parcial en `smoke:user-portal`). No existe marketplace/reventa (`/reventa` eliminado; `POST /tickets/:id/transfer` → **410 Gone**).

El flujo principal emisor → oferta → receptor acepta/rechaza → ticket destino con **nuevo QR** está operativo en código. Hay **gaps** en multi-fecha (`occurrenceId`), visibilidad post-transferencia del emisor, email de expiración, helper centralizado de elegibilidad y smoke dedicado.

**Estrategia QR:** al aceptar se crea un **ticket nuevo** con `qrPayload` distinto; el ticket origen pasa a `TRANSFERRED` (QR viejo rechazado por scanner). Durante `TRANSFER_PENDING` el QR original también es rechazado.

---

## 2. Backend encontrado

### 2.1 Modelos (Prisma)

| Modelo | Propósito |
|--------|-----------|
| `Ticket` | Estados `VALID`, `USED`, `REVOKED`, `TRANSFER_PENDING`, `TRANSFERRED`; `ownerUserId`, `activeTransferOfferId`, `transferredFromTicketId`, `occurrenceId` |
| `TicketTransferOffer` | Oferta con `acceptToken`, `status` (`AVAILABLE`, `RESERVED`, `COMPLETED`, `CANCELLED`, `EXPIRED`), `sellerUserId`, `buyerUserId`, `message`, `rejectedAt`, `expiresAt` |
| `TicketTransfer` | Log histórico al completar (`fromUserId`, `toUserId`, `destinationTicketId`) |

Migraciones relevantes: `remove_resale_marketplace`, `ticket_transfer_offer_message`.

### 2.2 Servicios y controladores

| Archivo | Rol |
|---------|-----|
| `me-ticket-transfer.controller.ts` | Endpoints portal `/me/*` |
| `ticket-transfer-offer.service.ts` | Lógica create/cancel/reject/accept/lookup/list/expire |
| `ticket-transfer-scheduler.service.ts` | Cron expiración (cada 15 min prod / 10 min dev) |
| `ticket-transfer-notification.util.ts` | Variables email + URLs |
| `ticket-transfer.service.ts` | **Legacy** transfer directa (sin uso; endpoint 410) |
| `me-activity.service.ts` | Incluye transferencias en actividad |

### 2.3 Endpoints

```
POST   /me/tickets/:ticketId/transfer-offers     { recipientEmail?, buyerUserId?, message?, expiresInHours? }
GET    /me/ticket-transfer-offers?role=sent|received|all&status=...
GET    /me/ticket-transfer-offers/lookup/:token
POST   /me/ticket-transfer-offers/:offerId/cancel
POST   /me/ticket-transfer-offers/:offerId/reject
POST   /me/ticket-transfer-offers/:token/accept
GET    /me/activity/transfers                  (vía MeActivityService)
```

**Legacy eliminado:**

```
POST   /tickets/:ticketId/transfer   → 410 Gone
```

### 2.4 Estados y transiciones

**Ticket:**

| Estado | Significado |
|--------|-------------|
| `VALID` | Transferible (si cumple reglas) |
| `TRANSFER_PENDING` | Oferta activa; QR bloqueado en scanner |
| `TRANSFERRED` | Cesión completada; titular `ownerUserId` = null |
| `USED` / `REVOKED` | No transferible |

**Oferta (`TicketTransferOfferStatus`):**

| Estado | Cuándo |
|--------|--------|
| `AVAILABLE` | Creada |
| `RESERVED` | Reservada (enum existe; flujo actual usa sobre todo `AVAILABLE`) |
| `COMPLETED` | Aceptada |
| `CANCELLED` | Cancelada por emisor **o rechazada por receptor** (`rejectedAt` distingue rechazo) |
| `EXPIRED` | Cron / lookup detecta vencimiento |

### 2.5 Reglas backend actuales (`assertTransferableTicket`)

Implementadas en `ticket-transfer-offer.service.ts` (método privado, no exportado):

1. Ticket existe en tenant.
2. `ownerUserId ===` emisor.
3. `status === VALID`.
4. `!usedAt && !revokedAt`.
5. Evento no finalizado (`endAt ?? startAt >= now`).
6. Sin oferta activa (`AVAILABLE` / `RESERVED`) en el ticket.
7. Receptor: usuario `ACTIVE` del tenant; `recipientEmail` o `buyerUserId`; no auto-transferencia.
8. Al crear: ticket → `TRANSFER_PENDING`, `activeTransferOfferId` seteado.
9. Al cancelar/rechazar/expirar: ticket → `VALID`, offer → `CANCELLED`/`EXPIRED`.
10. Al aceptar: origen `TRANSFERRED` + `ownerUserId: null`; destino nuevo `VALID` con **nuevo** `qrPayload`; log `TicketTransfer`.

**No validado hoy:**

- Estado del evento (cancelado/archivado).
- `occurrence` vencida/cerrada (multi-fecha V3.1 Etapa 7).
- Re-validación explícita `usedAt`/`revokedAt` en `accept` (solo chequea `TRANSFER_PENDING`).
- Códigos de error granulares (`TICKET_ALREADY_USED`, `TRANSFER_ALREADY_PENDING`, etc.) — se usa `TICKET_NOT_TRANSFERABLE` / `CONFLICT` genéricos.

### 2.6 Scheduler

- `TicketTransferSchedulerService`: `@Cron` cada 15 min (10 min en dev).
- `TICKET_TRANSFER_CRON_ENABLED=false` desactiva.
- `expireOffer`: restaura ticket a `VALID`, audit `TICKET_TRANSFER_EXPIRED`.
- **Sin** email/notificación in-app al expirar.

### 2.7 Auditoría (`AuditLog`)

`metadata.transferEvent`: `TICKET_TRANSFER_CREATED`, `CANCELLED`, `REJECTED`, `EXPIRED`, `ACCEPTED`, `SOURCE_LOCKED`.

---

## 3. Frontend encontrado

### 3.1 Rutas

| Ruta | Componente | Función |
|------|------------|---------|
| `/me/tickets` | listado agrupado (`ticket-groups.ts`) | Buckets: próximos, pasados válidos, usados, inactivos (incl. `TRANSFERRED`/`REVOKED`) |
| `/me/tickets/[ticketId]` | `MeBuyerTicketPanel` + `TicketTransferPanel` + hints de estado | Detalle, QR, transferir/cancelar |
| `/me/ticket-transfer/[token]` | página dedicada | Lookup, aceptar, rechazar |
| `/me/activity?tab=transfers` | `TransferOfferRow` | Historial enviadas/recibidas |
| `/me/notifications` | labels `TRANSFER_*` | Bandeja in-app |

### 3.2 Repositorio / hooks

- `ApiRepository`: métodos `listTransferOffers`, `createTransferOffer`, `cancel`, `accept`, `lookup`, `reject`.
- `lib/query/me-portal.ts`: `useTicketTransferMutations`, `useTicketTransferLookup`, `useMeTransferOffers`.

### 3.3 UI transferencia

- `TicketTransferPanel`: crear (email opcional, mensaje, horas), cancelar, copiar enlace, aviso legal.
- `canTransfer` viene del API (`MeTicketDetail`).
- QR visual: `isTicketEntryBlocked` oculta overlay en `TRANSFER_PENDING` / `TRANSFERRED` (`DefaultBuyerTicket`, `TicketTemplateRenderer`).
- Impresión: footer indica “No válido para ingreso” si bloqueado.

### 3.4 Preferencias push

`MePushAlertPreferences`: toggle `notifyTransferOffers`.

---

## 4. Emails encontrados

### 4.1 Templates registrados (`email-template.registry.ts`)

| Template ID | Caller | Destinatario |
|-------------|--------|--------------|
| `TICKET_TRANSFER_RECEIVED` | `create` | Receptor (`buyerUserId` seteado) |
| `TICKET_TRANSFER_ACCEPTED` | `accept` | Emisor |
| `TICKET_TRANSFER_REJECTED` | `reject` | Emisor |
| `TICKET_TRANSFER_CANCELLED` | `cancel` | Receptor (si `buyerUserId`) |

Documentación Markdown en `docs/emails/Transferencias y recordatorios/`.

### 4.2 No implementado

- `TICKET_TRANSFER_EXPIRED` — existe doc `TICKET_TRANSFER_EXPIRED.md` pero **no** está en registry ni se dispara en `expireOffer`.
- Email al crear oferta **sin** `recipientEmail`/`buyerUserId` (solo enlace compartido manualmente).

### 4.3 Notificaciones in-app

Kinds: `TRANSFER_OFFER_PENDING`, `TICKET_TRANSFER_ACCEPTED`, `TICKET_TRANSFER_REJECTED`, `TICKET_TRANSFER_CANCELLED`.  
Fallo email: `void ...catch()` — no rompe flujo.

---

## 5. Scanner encontrado

`ScannerService.validate` (`apps/api/src/scanner/scanner.service.ts`):

- `TRANSFER_PENDING` → `isValid: false`, `message: 'invalid'`, reason `INVALID`.
- `TRANSFERRED` → idem.
- `REVOKED` → `message: 'revoked'`.
- `USED` → `ConflictException` / `ALREADY_USED`.
- Ticket destino `VALID` con nuevo QR → acepta (doble-scan protegido con `updateMany` atómico).

Offline sync (`ticket-list-export.service.ts`): mismos estados; código `transferred` para pending/transferred.

Smoke: `smoke:user-portal` valida rechazo de `TRANSFER_PENDING` si hay ticket + scanner token.

---

## 6. Restricciones actuales (matriz)

| Restricción | Backend create | Backend accept | UI oculta botón | Scanner |
|-------------|----------------|----------------|-----------------|---------|
| No dueño | ✓ | N/A | ✓ (`canTransfer`) | N/A |
| Ticket usado | ✓ | implícito vía estado | ✓ | ✓ |
| Ticket revocado | ✓ | implícito | ✓ | ✓ |
| Evento pasado | ✓ | no re-chequea | ✓ | N/A |
| Oferta pendiente duplicada | ✓ | N/A | ✓ | ✓ (pending) |
| Auto-transferencia | ✓ | ✓ | N/A | N/A |
| Receptor no registrado | ✓ (email) | N/A | N/A | N/A |
| Evento cancelado | ✗ | ✗ | ✗ | N/A |
| Occurrence vencida | ✗ | ✗ | ✗ | N/A |
| Ticket con cambio fecha pending | no revisado | no revisado | no revisado | N/A |

---

## 7. Riesgos

| # | Riesgo | Severidad | Detalle |
|---|--------|-----------|---------|
| R1 | Emisor ve ticket `TRANSFERRED` en `/me/tickets` | Media | `getMyTickets` incluye tickets con `ownerUserId: null` si `order.buyerEmail` coincide — tras aceptar el emisor original sigue viendo el ticket origen (bucket inactivos) con QR bloqueado |
| R2 | Multi-fecha rota al aceptar | **Alta** | `accept` no copia `occurrenceId` al ticket destino → scanner puede fallar `WRONG_OCCURRENCE` |
| R3 | QR screenshot del emisor | Baja (mitigado) | Mismo QR durante `TRANSFER_PENDING` rechazado; tras accept el QR viejo sigue en BD pero estado `TRANSFERRED` rechaza scan |
| R4 | Rechazo UI como “Cancelada” | Baja | `reject` pone offer `CANCELLED`; labels no distinguen `rejectedAt` |
| R5 | Sin email expiración | Baja | Usuario no notificado cuando vence oferta |
| R6 | `TicketTransferService` legacy huérfano | Muy baja | Código muerto; confusión para mantenedores |
| R7 | Aceptar sin re-validar evento pasado | Media | Si el evento termina durante pending, accept podría completarse |

---

## 8. Gaps (para slices 9.2–9.6)

| ID | Gap | Slice sugerido |
|----|-----|----------------|
| G1 | Helper centralizado `isTicketTransferable` / eligibility service | 9.3 |
| G2 | Copiar `occurrenceId` (y campos multi-fecha) al ticket destino | 9.2 |
| G3 | Excluir tickets `TRANSFERRED` del listado emisor (solo `ownerUserId` o destino recibido) | 9.2 |
| G4 | Códigos error específicos + mensajes UI | 9.3 |
| G5 | Email/notificación `TICKET_TRANSFER_EXPIRED` | 9.4 |
| G6 | Smoke dedicado `smoke:v31-ticket-transfer-flow` | 9.2 / 9.6 |
| G7 | QA manual matriz cierre | 9.6 |
| G8 | Validar interacción con `TicketDateChangeRequest` pendiente | 9.3 |
| G9 | Label UI “Rechazada” vs “Cancelada” en ofertas | 9.2 |

---

## 9. QA mínimo (Slice 9.1)

| Prueba | Resultado |
|--------|-----------|
| API local corriendo (`pnpm run -w dev`) | ✓ verificado en entorno dev |
| Smoke `smoke:user-portal` | **Pendiente Slice 9.2** — requiere `SMOKE_USER_EMAIL` + `SMOKE_USER_PASSWORD`; aceptación destructiva requiere `SMOKE_ALLOW_DESTRUCTIVE=1` |
| QA manual emisor/receptor | **Pendiente Slice 9.2** — sin ejecución manual en esta auditoría |

Cobertura automatizada existente en `apps/api/scripts/smoke-user-portal.ts`:

- Crear oferta → `TRANSFER_PENDING`
- Scanner rechaza QR pending
- Cancelar → restaura `VALID`
- Lookup + reject con `recipientEmail`
- Accept con segundo usuario (destructivo, opt-in)
- Legacy 410

---

## 10. Documentación existente

| Doc | Estado |
|-----|--------|
| `docs/user/TICKET_TRANSFER.md` | **Vigente** — alineado con implementación salvo gaps G2/G5 |
| `docs/emails/EMAIL_MATRIX.md` | Cubre 4 templates; falta EXPIRED |
| Checklist V3.1 §26.1 | Abierto |
| `BACKEND_CONTEXT.md` / `FRONTEND_CONTEXT.md` | Mencionan transferencias; sin sección Etapa 9 cerrada |

---

## 11. Recomendación de slices siguientes

| Slice | Prioridad | Foco |
|-------|-----------|------|
| **9.2** | Alta | Flujo emisor/receptor E2E, `occurrenceId`, visibilidad post-transfer, smoke flow |
| **9.3** | Alta | `TicketTransferEligibilityService`, errores granulares, evento/occurrence |
| **9.4** | Media | Email expiración + smoke templates |
| **9.5** | Media | Documentar estrategia QR + QA scanner regresión |
| **9.6** | Media | Matriz QA + cierre §26.1 |

---

## 12. Archivos clave (referencia)

```
apps/api/src/modules/me/me-ticket-transfer.controller.ts
apps/api/src/modules/me/ticket-transfer-offer.service.ts
apps/api/src/modules/me/ticket-transfer-scheduler.service.ts
apps/api/src/scanner/scanner.service.ts
apps/web/components/me/TicketTransferPanel.tsx
apps/web/app/(portal)/me/ticket-transfer/[token]/page.tsx
apps/web/lib/tickets/ticket-status-ui.ts
docs/user/TICKET_TRANSFER.md
```
