# Domain Model — Relationship Map
Project: Tiketera "Yo Te Invito"

This document provides a **high-level domain relationship map** and the core invariants
that keep the system consistent across Web, Scanner, and API.

Use it as a reference for:
- Prisma relations
- API module boundaries
- UI screens and data flows
- Jobs/caching strategy in V2

---

# 1) Domain Graph (Core)

Tenant
- Users
- Producers
- Gastro Profiles
- Referrers
- Events
- Orders
- Tickets
- Reviews
- Audit Logs
- Payout Requests

---

# 2) Core Entity Relationships

## User and Profiles

User
- belongs to: Tenant
- may own: ProducerProfile (Producer Owner)
- may own: GastroProfile (Gastro Owner)
- may have: ReferrerProfile (Referrer)
- may act as: Scanner operator (SCANNER role)
- creates: Reviews
- performs: Audit actions (as actor)
- issues: CourtesyGrants (producer staff/owner)
- submits: PayoutRequests (producer staff/owner)

ProducerProfile
- belongs to: Tenant
- owned by: User (ownerUserId)
- has many: Events

GastroProfile
- belongs to: Tenant
- owned by: User (ownerUserId)
- has many: Discounts
- has many: DiscountRedemptions (through Discounts)

ReferrerProfile
- belongs to: Tenant
- references: User
- has many: ReferralLinks
- has many: ReferralCommissions (through attribution)

---

## Events and Ticketing

Event
- belongs to: Tenant
- belongs to: ProducerProfile
- has many: EventMedia
- has many: TicketTypes
- has many: Orders
- has many: Tickets
- has many: CourtesyGrants
- has many: ReferralLinks
- has many: TicketScanLogs
- may have many: PayoutRequests

EventMedia
- belongs to: Event

TicketType
- belongs to: Event
- has many: TicketBatches
- referenced by: OrderItems
- referenced by: Tickets

TicketBatch
- belongs to: TicketType
- referenced by: OrderItems
- referenced by: Tickets

---

## Orders and Tickets

Order
- belongs to: Tenant
- belongs to: Event
- may belong to: User (buyerUserId is nullable to allow guest checkout in V1)
- has many: OrderItems
- has many: Tickets
- may have: ReferralAttribution (0..1)

OrderItem
- belongs to: Order
- references: TicketType
- references: TicketBatch

Ticket
- belongs to: Tenant
- belongs to: Event
- may belong to: Order (nullable for courtesy tickets)
- references: TicketType
- references: TicketBatch
- has many: TicketScanLogs
- may be marked used by: User (scanner operator)

TicketScanLog
- belongs to: Tenant
- belongs to: Event
- belongs to: Ticket
- references: User (scanner operator)

---

## Courtesy Tickets

CourtesyGrant
- belongs to: Event
- may reference: TicketType (nullable for “free capacity” mode)
- issued by: User
- results in: one or more Tickets (implementation can vary)
  - Either create Tickets immediately
  - Or reserve capacity and mint Tickets later (V2 option)

---

## Referrals

ReferralLink
- belongs to: Tenant
- belongs to: Event
- belongs to: ReferrerProfile
- has many: ReferralAttributions

ReferralAttribution
- belongs to: Order
- belongs to: ReferralLink
- may create: ReferralCommission record (recommended for tracking payout state)

ReferralCommission (recommended V2)
- belongs to: ReferralAttribution
- has a payout state:
  pending -> requested -> paid (or rejected)

---

## Reviews / Ratings

Review
- belongs to: Tenant
- belongs to: User
- targets one of:
  - ProducerProfile
  - GastroProfile
  - Excursion listing (future)
  - Rental listing (future)
  - Event (optional feature)

---

## Payouts

PayoutRequest
- belongs to: Tenant
- belongs to: Event
- belongs to: ProducerProfile
- requested by: User
- tracks payout state:
  requested -> pending -> processing -> sent (or rejected)

---

## Auditing

AuditLog
- belongs to: Tenant
- actor: User
- targets: entityType + entityId
- stores: before/after snapshots
- used for:
  - compliance
  - dispute resolution
  - admin oversight

---

# 3) Key Invariants (Must Hold)

## Event lifecycle
- Events move through:
  draft -> pending -> approved -> paused/cancelled -> deleted (soft delete)
- Only approved events are publicly sellable when ticketing is enabled.

## Ticket batch (tandas)
- Only ONE TicketBatch can be ACTIVE per TicketType.
- Only ACTIVE batches can be sold.
- When ACTIVE batch sells out or ends:
  - next batch becomes ACTIVE automatically (backend rule).

## Ticket uniqueness
- Ticket.qrHash must be unique.
- A ticket can only be USED once.

## Scanner validation (online)
- Validation must be atomic:
  - read ticket status
  - update to USED
  - create scan log
  - all in one transaction

## Scanner validation (offline, V2)
- The client validates locally using a downloaded snapshot.
- Each offline scan must be queued for sync.
- Sync endpoint must detect conflicts:
  - if already used server-side => return conflict result

## Referral attribution
- One Order can have at most ONE referral attribution.
- Attribution should be snapshot-based (commission value stored at time of purchase).

## Auditing
- Sensitive actions MUST create AuditLog entries:
  - event approval/cancellation
  - ticket revoke/refund
  - pricing/batch changes
  - payout status changes
  - admin interventions

---

# 4) Suggested Module Boundaries (API)

- auth: session/token handling, role extraction
- users: user profiles, roles, status
- producers: producer profile + editorial content
- gastro: gastro profile + discounts + redemptions
- events: event CRUD + approval workflow + media
- ticketing: ticket types, batches, minting tickets
- orders: demo purchase V1, real payments V2
- scanner: validate and sync scans
- referrals: links, attribution, commissions
- reviews: ratings and comments
- payouts: payout requests and status workflow
- audit: audit log creation and querying
- exports: PDF/CSV generation (V2 via jobs)

---

# 5) Typical Flows (End-to-End)

## Purchase (V1 demo)
1) Web: user selects TicketType
2) API: create Order (draft)
3) API: confirm “paid” (demo flow)
4) API: mint Tickets with unique qrHash
5) API: email PDF/QR (or allow download)

## Door scan (online)
1) Scanner reads QR
2) API validates atomically
3) Ticket becomes USED
4) ScanLog created
5) Scanner UI shows OK / FAIL

## Referral sale
1) Public user visits event via ReferralLink
2) Web stores attribution (cookie or URL)
3) API creates Order
4) API stores ReferralAttribution with commission snapshot
5) Referrer portal shows sales and commission state

---

# 6) V2 Extensions (Optional Add-ons)

- Resale listing:
  - PublicListing belongs to Ticket
  - anti-fraud rules and limits
- Payments:
  - PaymentIntent / PaymentTransaction tables
  - Webhooks processing + reconciliation jobs
- Jobs:
  - exports, PDFs, emails, metrics aggregation
- Cache:
  - Redis cache for Home carousels + public event pages