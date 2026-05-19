# Ticketing E2E — Phase 0 inventory & Phase 7 fixes

**Purpose:** Capture the current domain and the ticket purchase → visibility path after Phase 0 / Phase 7 work.

## Domain inventory (relevant pieces)

| Piece | Role |
|--------|------|
| `Role` | `USER`, portals, etc. No `buyer` role; buyers are `USER` (or others buying with their account). |
| `Order` | `PENDING_PAYMENT` → `PAID`; holds `buyerEmail`, names, optional **`buyerUserId`** (logged-in checkout). |
| `OrderItem` | Line + `ticketBatchId` for batch pricing/stock. |
| `Payment` | `DEMO` / `GETNET`; demo confirm marks payment `APPROVED` and order `PAID`. |
| `Ticket` | Created on successful payment; `ownerUserId` set for **Mis tickets**; `qrPayload` unique. |
| `ReferralLink` + `ReferralAttribution` | Optional on order create via `referralCode`. |

## E2E flow (demo)

1. Event `APPROVED`, `isTicketingEnabled`, active `TicketType` + batch stock.
2. `POST /public/orders` with `tenantId`, buyer, items, optional `referralCode`, optional **`buyerUserId`** (must match buyer email, same tenant).
3. `POST /public/orders/:orderId/payments` `{ provider: "DEMO" }`.
4. `POST /public/payments/:paymentId/demo-confirm` → issues tickets, sets `ownerUserId` from **`order.buyerUserId`** or case-insensitive email match to `User`.
5. Buyer sees tickets: `GET /me/tickets` or `GET /me/tickets/:ticketId` (auth).

## Canonical sale URL (for later referral work)

- Checkout: `/checkout/[eventId]` with `tenantId` query when needed.
- Referral attribution: existing `referralCode` on `POST /public/orders` (cookie / query on frontend).

## Issues fixed in Phase 7

1. **`TicketsRepo.get`** always returned `null` — added **`GET /me/tickets/:ticketId`** and wired `ApiRepository.tickets.get`.
2. **Tickets missing for logged-in buyers** when email lookup failed (casing) or before `ownerUserId` was stored — **`Order.buyerUserId`** + case-insensitive user lookup at issuance; **`GET /me/tickets`** also lists tickets tied to a **PAID** order with buyer email match when `ownerUserId` is still null (legacy rows).

## Smoke checks

- Curated seed + demo user: create order on an event with ticketing → demo pay → tickets appear under **Mis tickets** and **Ver detalle** opens QR.
- Logged-in checkout: same email as session; optional `buyerUserId` sent from web.

---

## Phase 3 + 8 (referral checkout, métricas productor, favoritos)

- **Link de venta:** APIs que exponen `referralLink.url` usan checkout con `?tenantId=&ref=`; `/r/[code]` redirige al mismo checkout y renueva cookie `yti_ref`.
- **GET /public/referral/:code** incluye `checkoutUrl` además de `eventId` / `tenantId`.
- **Métricas productor:** `GET /producer/events/:eventId/metrics` incluye `referralPerformance[]` (pedidos PAID atribuidos por link, tickets, bruto en centavos).
- **Favoritos / esperados:** `favoriteEventIds` y `expectedEventIds` en JSON de `User` (`GET/PATCH /me/preferences`); home muestra riel “Tus favoritos”; cuenta tiene `/cuenta/favoritos`; “Eventos esperados” une lista guardada + tickets válidos.
