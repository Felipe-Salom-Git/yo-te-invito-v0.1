# Technical SPEC: Slice 05 — Ticketing Core (Orders + TicketTypes + Tickets + QR)

## 1) Domain Overview
The Ticketing Core module introduces the foundational commerce capabilities for the Yo Te Invito marketplace. This slice covers listing available ticket types for an event, creating orders, and generating unique, non-guessable tickets with QR payloads. 

**Key Objectives & Constraints for V1:**
- **Endpoints:** All public ticketing flows must reside under `/public/*` (e.g., `/public/events`, `/public/orders`). No `/api/v1` prefixes.
- **Tenant Context:** Multi-tenant isolation is enforced via a required `tenantId` query parameter.
- **Selling Rules:** Ticket purchases are strictly restricted to events with `status = APPROVED` and `deletedAt = null`.
- **Soft Delete:** Uses `deletedAt`. Entities with a set `deletedAt` are invisible to the public. 
- **Stock Control:** The system must prevent overselling via basic atomic capacity checks or constrained updates.
- **Payments:** V1 handles order creation, but assumes automated or placeholder mock approvals (no real payment gateway integration in this slice).

## 2) Prisma Models & Relations
The following models must be added to `schema.prisma`:

### Model: `TicketType`
- `id` (String, `@id`, UUID or cuid)
- `eventId` (String)
- `name` (String)
- `description` (String?)
- `price` (Decimal)
- `currency` (String, `@default("ARS")`)
- `capacityTotal` (Int)
- `capacityAvailable` (Int)
- `maxPerOrder` (Int `@default(10)`)
- `salesStartAt` (DateTime?)
- `salesEndAt` (DateTime?)
- `status` (`TicketTypeStatus`)
- `createdAt` (DateTime `@default(now())`)
- `updatedAt` (DateTime `@updatedAt`)
- `deletedAt` (DateTime?)

**Relations & Indexes:**
- `event` -> `Event` (via `eventId`)
- `@@index([eventId, status])`

### Model: `Order`
- `id` (String, `@id`, UUID or cuid)
- `tenantId` (String)
- `status` (`OrderStatus`)
- `buyerEmail` (String)
- `buyerFirstName` (String)
- `buyerLastName` (String)
- `buyerDocument` (String?)
- `totalAmount` (Decimal)
- `currency` (String)
- `createdAt` (DateTime `@default(now())`)
- `updatedAt` (DateTime `@updatedAt`)

**Relations & Indexes:**
- `tenant` -> `Tenant` (via `tenantId`)
- `items` -> `OrderItem[]`
- `tickets` -> `Ticket[]`
- `@@index([tenantId, buyerEmail])`

### Model: `OrderItem`
- `id` (String, `@id`, UUID or cuid)
- `orderId` (String)
- `ticketTypeId` (String)
- `quantity` (Int)
- `unitPrice` (Decimal)
- `subtotal` (Decimal)
- `createdAt` (DateTime `@default(now())`)

**Relations:**
- `order` -> `Order` (via `orderId`)
- `ticketType` -> `TicketType` (via `ticketTypeId`)
- `tickets` -> `Ticket[]`

### Model: `Ticket`
- `id` (String, `@id`, UUID or cuid)
- `orderId` (String)
- `orderItemId` (String)
- `ticketTypeId` (String)
- `eventId` (String)
- `qrPayload` (String, `@unique`) - *Used for non-guessable access control generation (e.g., cuid)*
- `status` (`TicketStatus`)
- `createdAt` (DateTime `@default(now())`)
- `updatedAt` (DateTime `@updatedAt`)

**Relations & Indexes:**
- `order` -> `Order` (via `orderId`)
- `orderItem` -> `OrderItem` (via `orderItemId`)
- `ticketType` -> `TicketType` (via `ticketTypeId`)
- `event` -> `Event` (via `eventId`)
- `@@index([eventId, status])`
- `@@index([orderId])`

## 3) Enums
Add to Prisma and Zod representations:

- `TicketTypeStatus`: `ACTIVE` | `PAUSED`
- `OrderStatus`: `PENDING` | `PAID` | `CANCELLED` | `REFUNDED`
- `TicketStatus`: `VALID` | `USED` | `REVOKED`

*(Note: We do not use `DELETED` in enums due to the `deletedAt` standard for soft deletion).*

## 4) Shared Schemas (`packages/shared`)
Update or create schemas in `packages/shared/src/schemas/ticketing.ts`.

### Schema: Queries
- `ticketTypesQuerySchema`:
  - `tenantId`: string (required)
- `orderDetailsQuerySchema`:
  - `tenantId`: string (required)

### Schema: Bodies
- `createOrderDtoSchema`:
  - `eventId`: string (uuid/cuid)
  - `buyer`: object (`email` required email format, `firstName` string, `lastName` string, `document` optional string)
  - `items`: array (min 1) of objects (`ticketTypeId`: string, `quantity`: number min 1)

### Schema: Responses
- `TicketTypeResponseSchema`: Omit `capacityAvailable` for security, or output a boolean/enum like (`AVAILABLE`, `SOLD_OUT`) unless exact remaining units are explicitly desired. Returns `price`, `name`, `description`, `maxPerOrder`.
- `OrderResponseSchema`: Combines `Order`, nested `OrderItem`s, and nested `Ticket`s (representing full summary).
- `TicketResponseSchema`: Contains `qrPayload`, `status`, and `ticketType` name/id.

## 5) API Contract
Endpoints utilize the global `ZodValidationPipe` and `AllExceptionsFilter`.

**1. List Ticket Types**
- **GET** `/public/events/:eventId/ticket-types?tenantId=...`
- **Logic:** Returns a list of `ACTIVE` ticket types for the specified `eventId`. Event must be `APPROVED` and `deletedAt: null`.

**2. Create Order**
- **POST** `/public/orders?tenantId=...`
- **Body:** Validated by `createOrderDtoSchema`.
- **Logic:** Calculates subtotal/total based on DB prices (never trust client prices). Validates event statuses and capacity constraints. Deducts capacity and generates an `Order`, `OrderItem`s, and instantiated `Ticket`s (with `PAID` order and `VALID` tickets for V1 scoping).
- **Response:** `201 Created` with `OrderResponseSchema` data.

**3. Retrieve Order (Optional but recommended)**
- **GET** `/public/orders/:orderId?tenantId=...`
- **Logic:** Returns full details containing associated Tickets and their `qrPayload` strings.

## 6) Business Rules & Query Logic
- **Authorization/Scope Context:**
  - `tenantId` strictly scopes all event and order fetching.
  - Event prerequisite validation: If the provided `eventId` corresponds to an event that is `DRAFT`, belongs to another tenant, or has `deletedAt !== null`, throw `NOT_FOUND`.
- **Stock Control & Transaction:**
  - Order creation must be enclosed in a `$transaction`.
  - Fetch TicketType with row lock if possible or use atomic updates (e.g., `update: { capacityAvailable: { decrement: quantity } }`).
  - Condition: `where: { capacityAvailable: { gte: quantity } }`.
  - If the decrement query fails to match, throw a `CONFLICT` exception representing insufficient availability.
- **QR Generation:**
  - `qrPayload` must be generated randomly on the backend at Ticket creation time. We will use a `cuid()` or crypto-secure string. It must be marked as `@unique`.
- **Idempotency (Recommended V1 consideration):**
  - Clients could optionally pass an `Idempotency-Key` header.
- **Price Integrity:**
  - The client provides `ticketTypeId` and `quantity`. The backend fetches the authoritative `price` from the DB to write `OrderItem.unitPrice` and aggregate `Order.totalAmount`.

## 7) Error Handling
- **`VALIDATION_FAILED` (400):** Generic structure returned on missing `tenantId`, bad email format, or schema failures.
- **`NOT_FOUND` (404):** Event not found, Event not `APPROVED`, Event belongs to another tenant, or TicketType not found/inactive.
- **`CONFLICT` (409):** Triggered when `quantity` requested exceeds `TicketType.capacityAvailable` or `maxPerOrder`.

## 8) Acceptance Criteria
- Endpoints answer cleanly matching `/public/*` prefix pattern.
- Orders accurately map price computations exclusively from database truths.
- `$transaction` surrounds Order persistence to bind `Order`, `OrderItem`, and `Ticket` inserts.
- Stock is safely decremented to preclude overselling.
- Non-guessable `qrPayload` exists per generated ticket.
- DRAFT or PAUSED events reject purchase flows with `NOT_FOUND`.

## 9) Smoke Tests (curl)
**1. Fetch Types**
```bash
curl -X GET "http://localhost:3000/public/events/<EVENT_ID>/ticket-types?tenantId=<TENANT_ID>"
```
*Expect: `200 OK` with listed tickets.*

**2. Create Order (Success)**
```bash
curl -X POST "http://localhost:3000/public/orders?tenantId=<TENANT_ID>" \
-H "Content-Type: application/json" \
-d '{
  "eventId": "<EVENT_ID>",
  "buyer": { "email": "buyer@test.com", "firstName": "John", "lastName": "Doe" },
  "items": [{ "ticketTypeId": "<TICKET_TYPE_ID>", "quantity": 2 }]
}'
```
*Expect: `201 Created` with valid order containing 2 tickets and QR lengths.*

**3. Create Order (Oversell Conflict)**
```bash
curl -X POST "http://localhost:3000/public/orders?tenantId=<TENANT_ID>" \
# Request quantity 999 where capacity is explicitly 10.
```
*Expect: `409 Conflict` representing sold out condition.*

**4. Create Order (Invalid Event Status)**
```bash
# Request against a DRAFT Event
curl -X POST "http://localhost:3000/public/orders?tenantId=<TENANT_ID>" \ ...
```
*Expect: `404 NOT_FOUND` as DRAFT events do not exist in the public purchase scope.*

## 10) Documentation Updates
A markdown document matching this spec has been published to `docs/modules/ticketing.md`. It explains model hierarchies, API payloads, shared zod validations, preventing overselling boundaries, and error boundaries for the Slice 05 ticketing core.
