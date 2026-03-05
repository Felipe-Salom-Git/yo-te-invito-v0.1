# Core Data Schema
Project: Tiketera "Yo Te Invito"

This document defines the **core data model** used by the platform.

The schema is designed to:

- support the V1 marketplace + ticketing system
- scale into V2 features (payments, queues, antifraud, analytics)
- remain compatible with Prisma ORM
- avoid major refactors as the platform grows

---

# Core Domain Entities

The platform revolves around the following entities:

- Tenant
- User
- ProducerProfile
- GastroProfile
- ReferrerProfile
- Event
- EventMedia
- TicketType
- TicketBatch
- Order
- OrderItem
- Ticket
- TicketScanLog
- CourtesyGrant
- ReferralLink
- ReferralAttribution
- ReferralCommission
- Review
- PayoutRequest
- AuditLog
- Discount
- DiscountRedemption

---

# Tenant

Represents a logical instance of the platform.

This allows future support for:

- multiple cities
- enterprise clients
- franchise-style deployments

Fields (Slice 02):

- id (cuid)
- name
- isActive
- createdAt
- updatedAt
- deletedAt

---

# User

Base user entity used across the system.

Fields (Slice 02):

- id (cuid)
- tenantId
- email
- passwordHash (optional)
- firstName
- lastName
- phone (optional)
- role (Role enum)
- status (UserStatus enum)
- emailVerified (optional)
- createdAt
- updatedAt
- deletedAt

Relation: User → Tenant

Indexes: [tenantId], @@unique([tenantId, email]), [tenantId, role]

Possible roles (Role enum):

- ADMIN
- PRODUCER_OWNER
- PRODUCER_STAFF
- GASTRO_OWNER
- REFERRER
- SCANNER
- USER

Possible status values (UserStatus enum):

- ACTIVE
- SUSPENDED
- DELETED

---

# ProducerProfile

Represents an event producer organization.

Fields:

- id
- tenantId
- ownerUserId
- displayName
- slug
- editorialContent
- ratingAvg
- ratingCount
- status
- createdAt
- updatedAt

Possible status:

- active
- pending
- blocked

---

# GastroProfile

Represents restaurants or gastronomy businesses.

Fields:

- id
- tenantId
- ownerUserId
- displayName
- slug
- editorialContent
- address
- geoLat
- geoLng
- verificationStatus
- ratingAvg
- ratingCount
- createdAt
- updatedAt

Verification status:

- pending
- verified
- rejected

---

# ReferrerProfile

Represents users that promote events and earn commissions.

Fields:

- id
- tenantId
- userId
- code
- commissionModel
- status
- createdAt
- updatedAt

Commission models:

- percent
- fixed

Status values:

- active
- suspended

---

# Event

Represents an event created by a producer.

Fields:

- id
- tenantId
- producerId
- title
- description
- startAt
- endAt
- city
- venueName
- venueAddress
- geoLat
- geoLng
- status
- capacityTotal
- coverImageUrl
- isTicketingEnabled
- publishedAt
- createdAt
- updatedAt
- deletedAt

Possible status values:

- draft
- pending
- approved
- paused
- cancelled
- deleted

Events can optionally disable ticketing for **promotional listings**.

---

# EventMedia

Stores media assets associated with events.

Fields:

- id
- eventId
- type
- url
- sortOrder

Possible media types:

- image
- video

---

# TicketType

Represents a category of ticket within an event.

Examples:

- VIP
- General
- Promo

Fields:

- id
- eventId
- name
- description
- priceCents
- currency
- isActive
- maxPerOrder
- createdAt
- updatedAt

---

# TicketBatch

Represents sequential ticket batches for a TicketType.

Example:

General ticket
- Batch 1
- Batch 2
- Batch 3

Fields:

- id
- ticketTypeId
- batchNumber
- startsAt
- endsAt
- qtyTotal
- qtySold
- status
- createdAt
- updatedAt

Possible status:

- scheduled
- active
- closed

Important rule:

Only **one active batch per TicketType** can be sold at a time.

---

# Order

Represents a purchase transaction.

Fields:

- id
- tenantId
- eventId
- buyerUserId
- buyerEmail
- buyerName
- buyerPhone
- status
- paymentProvider
- paymentReference
- totalCents
- createdAt
- updatedAt

Possible status:

- draft
- paid
- cancelled
- refunded

Payment providers (V2):

- demo
- mercadopago
- getnet

---

# OrderItem

Represents a line item inside an order.

Fields:

- id
- orderId
- ticketTypeId
- batchId
- qty
- unitPriceCents
- lineTotalCents

---

# Ticket

Represents a single issued ticket.

Fields:

- id
- tenantId
- eventId
- orderId
- ticketTypeId
- batchId
- status
- qrPayload
- qrHash
- usedAt
- usedByScannerUserId
- createdAt
- updatedAt

Possible status:

- valid
- used
- revoked
- refunded

Recommended indexes:

- unique(qrHash)
- eventId + status
- orderId

---

# TicketScanLog

Records all ticket scans performed by scanners.

Fields:

- id
- tenantId
- eventId
- ticketId
- scannerUserId
- scannedAt
- result
- metadata

Possible results:

- ok
- already_used
- invalid
- revoked
- offline_queued

Metadata may include:

- device information
- scanner version
- door location

---

# CourtesyGrant

Represents complimentary tickets issued by producers.

Fields:

- id
- eventId
- ticketTypeId
- qty
- mode
- issuedByUserId
- notes
- createdAt

Possible modes:

- consumes_batch
- free_capacity

---

# ReferralLink

Unique link used by a referrer to promote an event.

Fields:

- id
- tenantId
- eventId
- referrerId
- code
- url
- status
- createdAt
- updatedAt

Possible status:

- active
- disabled

---

# ReferralAttribution

Tracks which order was generated from a referral.

Fields:

- id
- orderId
- referralLinkId
- attributedAt
- source
- commissionCents

Possible sources:

- url
- cookie
- manual

---

# ReferralCommission

Represents the payment state of a referral commission.

Fields:

- id
- referralAttributionId
- status
- requestedAt
- paidAt
- notes

Possible status:

- pending
- requested
- paid
- rejected

---

# Review

Stores reviews and ratings left by users.

Fields:

- id
- tenantId
- userId
- targetType
- targetId
- scoreService
- scoreAttention
- scorePlace
- comment
- createdAt

Possible target types:

- producer
- gastro
- excursion
- rental
- event

---

# PayoutRequest

Represents a payout request submitted by a producer.

Fields:

- id
- tenantId
- eventId
- producerId
- status
- amountCents
- bankInfoSnapshot
- requestedByUserId
- createdAt
- updatedAt

Possible status:

- requested
- pending
- processing
- sent
- rejected

---

# AuditLog

Tracks sensitive platform actions.

Fields:

- id
- tenantId
- actorUserId
- action
- entityType
- entityId
- before
- after
- createdAt
- ip
- userAgent

Examples of audited actions:

- EVENT_APPROVED
- EVENT_CANCELLED
- TICKET_REVOKED
- PAYOUT_STATUS_CHANGED
- ADMIN_INTERVENTION

---

# Discount

Represents a promotion created by a gastronomy business.

Fields:

- id
- gastroId
- title
- description
- code
- startsAt
- endsAt
- status
- createdAt
- updatedAt

Possible status:

- active
- paused
- expired

---

# DiscountRedemption

Tracks usage of discounts.

Fields:

- id
- discountId
- validatedByUserId
- redeemedAt
- origin
- metadata

Possible origins:

- web
- qr
- manual