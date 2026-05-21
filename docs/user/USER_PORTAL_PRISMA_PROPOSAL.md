# Propuesta Prisma — Portal Usuario Final V1

**Estado:** **aplicada** — migración `20260601120000_user_portal_v1`.

Post-migrate: `pnpm --filter api run migrate:user-portal-preferences -- --confirm`

---

## Resumen de cambios

| Área | Acción |
|------|--------|
| `TicketStatus` | + `TRANSFER_PENDING`, `TRANSFERRED` |
| `Ticket` | + campos de transferencia / linaje |
| `TicketTransfer` | + `offerId`, `destinationTicketId` (histórico) |
| **Nuevo** | `TicketTransferOffer` |
| **Nuevo** | `UserCart`, `UserCartItem` |
| **Nuevo** | `UserFavorite` |
| **Nuevo** | `UserExpectedEvent` |
| `User.preferences` | Migrar listas legacy; nuevo shape documentado en shared |

**No se agrega** `OrderStatus.CART` — el carrito vive en `UserCart`; `Order` sigue en `PENDING_PAYMENT`+.

---

## Enums nuevos

```prisma
enum TicketTransferOfferStatus {
  AVAILABLE
  RESERVED
  COMPLETED
  CANCELLED
  EXPIRED
}

enum FavoriteEntityType {
  event
  gastro
  rental
  excursion
  hotel
  discount
}

enum FavoriteProviderType {
  producer
  gastro
  hotel
  excursion_operator
  rental_location
  platform
}
```

### Cambio en enum existente

```diff
 enum TicketStatus {
   VALID
   USED
   REVOKED
+  TRANSFER_PENDING
+  TRANSFERRED
 }
```

---

## Modelo `Ticket` — diff

```diff
 model Ticket {
   ...
   status           TicketStatus @default(VALID)
+  /// Ticket creado por transferencia completada (QR nuevo)
+  transferredFromTicketId String?
+  transferredFromTicket   Ticket?  @relation("TicketTransferLineage", fields: [transferredFromTicketId], references: [id], onDelete: SetNull)
+  transferredToTickets    Ticket[] @relation("TicketTransferLineage")
+  activeTransferOfferId   String?  @unique
+  activeTransferOffer     TicketTransferOffer? @relation(fields: [activeTransferOfferId], references: [id], onDelete: SetNull)
   ...
+  transferOffers TicketTransferOffer[] @relation("TransferOfferSourceTicket")
 }
```

**Notas:**

- `activeTransferOfferId` solo set mientras hay oferta `AVAILABLE`/`RESERVED`.
- Al completar: limpiar `activeTransferOfferId`, `status = TRANSFERRED` en origen.
- Ticket destino: `transferredFromTicketId = origen.id`, `status = VALID`, nuevo `qrPayload`.

---

## Modelo `TicketTransferOffer` — nuevo

```prisma
model TicketTransferOffer {
  id                  String                    @id @default(cuid())
  tenantId            String
  sourceTicketId      String
  destinationTicketId String?                   @unique
  sellerUserId        String
  buyerUserId         String?
  status              TicketTransferOfferStatus @default(AVAILABLE)
  acceptToken         String                    @unique
  expiresAt           DateTime
  reservedAt          DateTime?
  completedAt         DateTime?
  cancelledAt         DateTime?
  idempotencyKey      String?
  createdAt           DateTime                  @default(now())
  updatedAt           DateTime                  @updatedAt

  tenant            Tenant @relation(fields: [tenantId], references: [id])
  sourceTicket      Ticket @relation("TransferOfferSourceTicket", fields: [sourceTicketId], references: [id], onDelete: Cascade)
  destinationTicket Ticket? @relation(fields: [destinationTicketId], references: [id], onDelete: SetNull)
  sellerUser        User   @relation("TransferOfferSeller", fields: [sellerUserId], references: [id])
  buyerUser         User?  @relation("TransferOfferBuyer", fields: [buyerUserId], references: [id], onDelete: SetNull)
  transferLogs      TicketTransfer[]

  @@index([tenantId, sellerUserId, status])
  @@index([tenantId, buyerUserId, status])
  @@index([sourceTicketId, status])
  @@index([expiresAt])
}
```

Relaciones inversas en `User`:

```diff
 model User {
   ...
+  transferOffersSold   TicketTransferOffer[] @relation("TransferOfferSeller")
+  transferOffersBought TicketTransferOffer[] @relation("TransferOfferBuyer")
+  userCart             UserCart?
+  favorites            UserFavorite[]
+  expectedEvents       UserExpectedEvent[]
 }
```

---

## Modelo `TicketTransfer` — diff (log histórico)

```diff
 model TicketTransfer {
   id             String   @id @default(cuid())
   ticketId       String
+  offerId        String?
+  destinationTicketId String?
   fromUserId     String
   toUserId       String
   ...
+  offer          TicketTransferOffer? @relation(fields: [offerId], references: [id], onDelete: SetNull)
 }
```

El registro se crea al **completar** la oferta (no en transferencia inmediata legacy).

---

## Modelo `UserCart` — nuevo

```prisma
model UserCart {
  id        String   @id @default(cuid())
  tenantId  String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant Tenant         @relation(fields: [tenantId], references: [id])
  user   User           @relation(fields: [userId], references: [id], onDelete: Cascade)
  items  UserCartItem[]

  @@unique([tenantId, userId])
  @@index([userId])
}

model UserCartItem {
  id           String   @id @default(cuid())
  cartId       String
  eventId      String
  ticketTypeId String
  quantity     Int
  /// Snapshot al agregar (precio vigente del tipo)
  unitPrice    Decimal  @db.Decimal(12, 2)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  cart       UserCart   @relation(fields: [cartId], references: [id], onDelete: Cascade)
  event      Event      @relation(fields: [eventId], references: [id], onDelete: Cascade)
  ticketType TicketType @relation(fields: [ticketTypeId], references: [id], onDelete: Cascade)

  @@unique([cartId, ticketTypeId])
  @@index([cartId])
}
```

Relaciones inversas: `Event.userCartItems`, `TicketType.userCartItems` (opcional, cascade).

**Checkout:** servicio lee cart → `POST /public/orders` o `POST /me/cart/checkout` crea `Order` `PENDING_PAYMENT` → vacía items del cart.

---

## Modelo `UserFavorite` — nuevo

```prisma
model UserFavorite {
  id                      String              @id @default(cuid())
  tenantId                String
  userId                  String
  entityType              FavoriteEntityType
  entityId                String
  category                String
  providerType            FavoriteProviderType
  providerId              String
  webNotificationsEnabled  Boolean            @default(true)
  emailNotificationsEnabled Boolean           @default(true)
  createdAt               DateTime           @default(now())
  updatedAt               DateTime           @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, entityType, entityId])
  @@index([tenantId, userId])
  @@index([tenantId, userId, entityType])
}
```

`category` almacena `event|gastro|rental|excursion|hotel` (string alineado a `Event.category` / gateway).

---

## Modelo `UserExpectedEvent` — nuevo

```prisma
model UserExpectedEvent {
  id                        String   @id @default(cuid())
  tenantId                  String
  userId                    String
  eventId                   String
  webNotificationsEnabled   Boolean  @default(true)
  emailNotificationsEnabled Boolean  @default(true)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id])
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  event  Event  @relation(fields: [eventId], references: [id], onDelete: Cascade)

  @@unique([tenantId, userId, eventId])
  @@index([tenantId, userId])
}
```

Relación inversa en `Event`: `expectedByUsers UserExpectedEvent[]`.

---

## `User.preferences` JSON — shape objetivo (sin migración de columna)

Tras script de datos, el JSON deja de usar listas de IDs:

```json
{
  "preferredCity": "Bariloche",
  "favoriteCategories": ["event", "gastro"],
  "favoriteSubcategoryIds": ["cuid-1", "cuid-2"],
  "webNotificationsEnabled": true,
  "emailNotificationsEnabled": true,
  "ticketReminder24hEnabled": true,
  "favoriteEntityNotificationsEnabled": true,
  "expectedEventNotificationsEnabled": true,
  "ticketReminderOverrides": {
    "ticket-id": false
  }
}
```

**Script de migración de datos (post-migrate):**

1. Por cada `User` con `preferences.favoriteEventIds[]` → insert `UserFavorite` (`entityType=event`, resolver `providerId` desde `Event.producerProfileId`).
2. Por cada `preferences.expectedEventIds[]` → insert `UserExpectedEvent`.
3. Eliminar claves legacy del JSON (o dejar vacías durante transición).

---

## Impacto en servicios existentes

| Servicio | Cambio requerido |
|----------|------------------|
| `TicketTransferService` | Reemplazar por `TicketTransferOfferService` en portal; legacy endpoint deprecado |
| `ScannerService` | Rechazar `TRANSFER_PENDING`, `TRANSFERRED` |
| `MeService.getPreferences` | Leer nuevo shape; no devolver listas legacy como fuente de verdad |
| `Public orders` | Aceptar checkout desde cart (opcional `cartCheckout` flag) |
| Web `CartContext` | Eliminar del flujo portal; checkout público puede leer cart API en slice 4+ |

---

## Riesgos de migración

1. **Tickets en transferencia inmediata previa** — solo hay logs en `TicketTransfer` sin estado pendiente; no requiere data fix.
2. **Enum `TicketStatus`** — deploy coordinado API + scanner; sin downgrades.
3. **Unique `activeTransferOfferId`** — un offer activo por ticket origen.
4. **Tamaño migración** — no destructiva; tablas nuevas + enum extendido (PostgreSQL `ALTER TYPE ... ADD VALUE`).

---

## SQL preview (generado manualmente, no ejecutar aún)

```sql
-- TicketStatus values
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'TRANSFER_PENDING';
ALTER TYPE "TicketStatus" ADD VALUE IF NOT EXISTS 'TRANSFERRED';

-- Luego CREATE TABLE para UserCart, UserCartItem, UserFavorite, UserExpectedEvent, TicketTransferOffer
-- ALTER TABLE Ticket ADD COLUMN ...
```

Prisma generará el SQL exacto con `pnpm --filter api exec prisma migrate dev --create-only`.

---

## Aprobación siguiente paso

Tras OK de este documento:

1. `prisma migrate dev --create-only` y revisar SQL generado.
2. Script `apps/api/scripts/migrate-user-portal-preferences.ts` (dry-run + confirm).
3. Implementar backend etapa 3.
