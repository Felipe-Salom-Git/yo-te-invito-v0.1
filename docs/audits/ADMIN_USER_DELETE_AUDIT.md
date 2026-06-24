# Auditoría — Eliminación segura de usuarios (Admin)

**Proyecto:** Yo Te Invito  
**Fecha:** 2026-06-23  
**Fuentes:** `apps/api/prisma/schema.prisma` (`User`, relaciones), `apps/api/scripts/lib/smoke-cleanup.ts`, `apps/api/src/modules/admin/admin-content-purge.service.ts`

---

## Resumen ejecutivo

| Decisión | Detalle |
|----------|---------|
| Estrategia | **Hard delete** solo si `canDelete=true` tras preflight; sin cascade destructivo sobre historial operativo |
| Regla de oro | Si el usuario tiene **publicaciones activas** (`Event.deletedAt IS NULL`), bloquear y pedir borrar/archivar primero |
| Cuenta maestro | `MASTER_USER_EMAIL` — nunca eliminable |
| Self-delete | Admin autenticado no puede eliminarse a sí mismo |
| Último ADMIN | Bloquear si es el único `ADMIN` activo del tenant |
| Auditoría | `ADMIN_USER_DELETED` al eliminar; `ADMIN_USER_DELETE_BLOCKED` opcional al rechazar por blockers |

---

## Relaciones revisadas (`User`)

| Relación Prisma | Modelo | onDelete / FK | Clasificación |
|-----------------|--------|---------------|---------------|
| `producerMemberships` | `UserProducerMembership` | Cascade | Perfil sin eventos → limpiar perfil huérfano |
| `gastroMemberships` | `UserGastroMembership` | Cascade | Bloquear si descuentos/contenido/evento público |
| `hotelMemberships` | `UserHotelMembership` | Cascade | Bloquear si `publicEventId` |
| `referrerMemberships` | `UserReferrerMembership` | Cascade | Bloquear si acuerdos/comisiones/asignaciones |
| `events` (vía `Event.producerId` legacy) | `Event` | — | **Blocker** si `deletedAt` null |
| `events` (vía `producerProfileId`) | `Event` | SetNull en profile | **Blocker** si publicación activa |
| `ownedTickets` | `Ticket` | — | **Blocker** |
| `ordersAsBuyer` | `Order` | SetNull | **Blocker** (historial comercial) |
| `payments` (vía orders) | `Payment` | — | **Blocker** |
| `reviews` | `Review` | SetNull | **Blocker** (reseñas públicas) |
| `reviewDisputesRequested` | `ReviewDisputeRequest` | **Restrict** | **Blocker** |
| `commercialRelationshipReviews` | `CommercialRelationshipReview` | — | **Blocker** |
| `referralCommissions` | `ReferralCommission` | — | **Blocker** |
| `courtesyGrants` | `CourtesyGrant` | sin Cascade | **Blocker** |
| `gastroCourtesyCampaignsCreated` | `GastroCourtesyCampaign` | — | **Blocker** |
| `inboxItemsCreated` | `InboxItem` | **Restrict** | **Blocker** |
| `scannerAccountAsScanner` / `scannerAccountsManaged` | `ScannerAccount` | Cascade | **Blocker** (cuentas scanner activas) |
| `ticketDateChangeRequests` | `TicketDateChangeRequest` | — | **Blocker** |
| `transferOffersSold` / `transferOffersBought` | `TicketTransferOffer` | — | **Blocker** si existen |
| `gastroDiscountClaims` | `GastroDiscountClaim` | — | **Warning** — auto-limpiable |
| `favorites` | `UserFavorite` | Cascade | **Warning** |
| `expectedEvents` | `UserExpectedEvent` | Cascade | **Warning** |
| `userCart` | `UserCart` / `UserCartItem` | Cascade | **Warning** |
| `notifications` | `UserNotification` | Cascade | **Warning** |
| `pushSubscriptions` | `UserPushSubscription` | Cascade | **Warning** |
| `legalAcceptances` | `UserLegalAcceptance` | Cascade | **Warning** |
| `producerFollows` / `gastroFollows` | Follows | Cascade | **Warning** |
| `auditLog` (actorId string, sin FK) | `AuditLog` | — | **Blocker** si `actorId` = user (historial admin) |

**No tocar en este slice:** pagos (integración), ticketera checkout, scanner UX, GEO, footer, email verification flows.

---

## Blockers implementados

| `type` | Condición | Mensaje (ES) |
|--------|-----------|--------------|
| `PROTECTED_MASTER` | email = `MASTER_USER_EMAIL` | Cuenta maestro protegida |
| `SELF_DELETE` | actorId === userId | No podés eliminar tu propia cuenta desde admin |
| `LAST_ADMIN` | único ADMIN del tenant | No se puede eliminar el último administrador |
| `EVENTS` | eventos activos (`deletedAt` null) por `producerId` o `producerProfileId` | Publicaciones asociadas — borrar o archivar primero |
| `GASTRO_DISCOUNTS` | `GastroDiscount` en perfiles del usuario | Perfil gastronómico con descuentos |
| `GASTRO_CONTENT` | `GastroContent` en perfiles del usuario | Contenido editorial gastronómico |
| `GASTRO_PUBLIC_EVENT` | `GastroProfile.publicEventId` | Local con publicación pública |
| `HOTEL_PUBLIC_EVENT` | `HotelProfile.publicEventId` | Hotel con publicación pública |
| `REFERRER_AGREEMENTS` | acuerdos comerciales activos | Perfil referido con acuerdos |
| `REFERRER_PROPOSALS` | propuestas pendientes/históricas | Propuestas comerciales de referido |
| `REFERRER_PAYMENT_REQUESTS` | solicitudes de pago | Solicitudes de pago de referido |
| `REFERRER_EVENT_ASSIGNMENTS` | asignaciones a eventos | Asignaciones de referido en eventos |
| `ORDERS` | `Order.buyerUserId` | Órdenes de compra |
| `TICKETS` | `Ticket.ownerUserId` | Entradas emitidas |
| `PAYMENTS` | pagos en órdenes del usuario | Pagos asociados |
| `REVIEWS` | `Review.userId` | Reseñas públicas |
| `REVIEW_DISPUTES` | `ReviewDisputeRequest.requestedByUserId` | Disputas de reseñas |
| `COMMERCIAL_REVIEWS` | `CommercialRelationshipReview` | Reseñas B2B |
| `REFERRAL_COMMISSIONS` | comisiones de referido | Comisiones de referido |
| `COURTESY_GRANTS` | cortesías creadas | Cortesías emitidas |
| `GASTRO_COURTESY_CAMPAIGNS` | campañas de cortesía gastro | Campañas de cortesía |
| `SCANNER_ACCOUNTS` | scanner o parent | Cuentas scanner vinculadas |
| `INBOX_ITEMS` | `InboxItem.createdByUserId` | Ítems de bandeja creados |
| `TICKET_DATE_CHANGES` | solicitudes de cambio de fecha | Cambios de fecha de entrada |
| `TICKET_TRANSFERS` | ofertas/transferencias | Transferencias de entradas |
| `AUDIT_LOG_ACTOR` | `AuditLog.actorId` | Historial de auditoría como actor |

---

## Warnings (no bloquean; se limpian al eliminar)

| `type` | Auto-limpieza |
|--------|---------------|
| `FAVORITES` | `userFavorite.deleteMany` |
| `EXPECTED_EVENTS` | `userExpectedEvent.deleteMany` |
| `CART` | `userCartItem` + `userCart` |
| `NOTIFICATIONS` | `userNotification` + delivery logs |
| `PUSH_SUBSCRIPTIONS` | `userPushSubscription` |
| `LEGAL_ACCEPTANCES` | cascade al borrar user |
| `GASTRO_DISCOUNT_CLAIMS` | `gastroDiscountClaim.deleteMany` |
| `FOLLOWS` | producer/gastro follows |

---

## Datos auxiliares limpiados en delete exitoso

Orden inspirado en `smoke-cleanup.ts` (solo cuando **no hay blockers**):

1. Desvincular transferencias activas de tickets del usuario
2. Eliminar perfiles comerciales huérfanos sin contenido
3. Limpiar warnings (favoritos, carrito, notificaciones, push, claims, tokens email)
4. `user.delete` (cascade memberships, legal acceptances, etc.)

**Nunca borrar en delete de usuario:** órdenes, pagos, tickets, eventos, reviews, auditoría existente.

---

## Endpoints

| Método | Ruta | Rol | Descripción |
|--------|------|-----|-------------|
| `GET` | `/admin/users/:userId/delete-preflight` | ADMIN | Solo lectura; devuelve `AdminUserDeletePreflight` |
| `DELETE` | `/admin/users/:userId` | ADMIN | Ejecuta preflight; 409 `USER_DELETE_BLOCKED` si hay blockers |

---

## QA manual (checklist)

- [ ] Usuario de prueba sin publicaciones → `canDelete=true` → elimina OK + audit log
- [ ] Productora con evento → bloqueo backend + UI con blockers
- [ ] Usuario con tickets/órdenes → bloqueo
- [ ] Cuenta maestro → bloqueo
- [ ] Self-delete admin → bloqueo
- [ ] Modal mobile sin overflow

**Implementación (2026-06-23):** backend `admin-user-delete.util.ts`, endpoints preflight + delete, frontend `AdminUserDeleteModal`, builds OK. QA manual pendiente en entorno con API.

---

## Riesgos / pendientes

- Perfiles comerciales vacíos en DRAFT: se eliminan con el usuario si no tienen contenido; revisar si conviene archivar en lugar de hard delete en producción futura.
- `AuditLog.actorId` no tiene FK: registros históricos quedan con id de usuario eliminado (aceptable).
- Filtro `userId` en `/admin/eventos` no existe aún; preflight usa `producerProfileId` cuando aplica.
