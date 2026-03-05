# Prisma Schema Generation Guide
Project: Tiketera "Yo Te Invito"

This document defines how the **Prisma database schema** must be generated
based on the platform's domain model.

Its purpose is to guide AI tools (Cursor, Antigravity) and developers to:

- generate the correct `schema.prisma`
- avoid introducing unexpected entities
- enforce consistent relations
- maintain compatibility with the documented Core Schema

This guide must be followed when creating or modifying database models.

---

# Database Engine

Database: PostgreSQL

ORM: Prisma

Primary key format:

- UUID recommended
- generated via database or Prisma

Example:

id String @id @default(uuid())

---

# Global Model Rules

All models must follow these conventions.

Primary key:

id String @id @default(uuid())

Timestamps:

createdAt DateTime @default(now())
updatedAt DateTime @updatedAt

Soft delete (when required):

deletedAt DateTime?

---

# Multi-Tenancy

Most core entities must include:

tenantId String

Relation:

tenant Tenant @relation(fields: [tenantId], references: [id])

This allows future multi-tenant deployments.

Entities that require tenantId:

- User
- ProducerProfile
- GastroProfile
- ReferrerProfile
- Event
- Order
- Ticket
- Review
- AuditLog
- PayoutRequest

---

# Core Models

The following models must exist.

Do not introduce additional core entities unless explicitly required.

Tenant
User
ProducerProfile
GastroProfile
ReferrerProfile
Event
EventMedia
TicketType
TicketBatch
Order
OrderItem
Ticket
TicketScanLog
CourtesyGrant
ReferralLink
ReferralAttribution
ReferralCommission
Review
PayoutRequest
AuditLog
Discount
DiscountRedemption

---

# Event Relations

Event must relate to:

ProducerProfile
TicketType
Ticket
Order
EventMedia
ReferralLink
CourtesyGrant

Relation examples:

producerId String
producer ProducerProfile @relation(fields: [producerId], references: [id])

---

# Ticketing Structure

Ticketing is structured as:

Event
 └ TicketType
     └ TicketBatch

Tickets reference both:

- TicketType
- TicketBatch

Ticket must also reference:

Event
Order (nullable)

Example:

ticketTypeId String
batchId String

---

# Order Structure

Order must contain:

- eventId
- buyerUserId (nullable for guest checkout)

Order has many:

OrderItems
Tickets

OrderItem references:

- ticketType
- ticketBatch

---

# Ticket Constraints

Ticket must enforce:

Unique QR hash

Example:

qrHash String @unique

Recommended indexes:

@@index([eventId, status])
@@index([orderId])

---

# Ticket Batches

TicketBatch belongs to TicketType.

Rules:

- Only one ACTIVE batch per TicketType.
- Batch determines availability window.

Fields:

ticketTypeId
batchNumber
startsAt
endsAt
qtyTotal
qtySold

---

# Scanner Logs

TicketScanLog must track:

- ticketId
- eventId
- scannerUserId
- result
- scannedAt

Recommended index:

@@index([eventId, scannedAt])

---

# Referral System

Structure:

ReferrerProfile
 └ ReferralLink
      └ ReferralAttribution
           └ ReferralCommission

ReferralAttribution must reference:

- Order
- ReferralLink

Commission should snapshot the value at purchase time.

---

# Courtesy Tickets

CourtesyGrant represents free tickets.

Fields:

eventId
ticketTypeId (optional)
qty
mode

Mode options:

consumes_batch
free_capacity

---

# Reviews

Review targets multiple entity types.

Use polymorphic relation pattern:

targetType String
targetId String

Possible targets:

producer
gastro
excursion
rental
event

---

# Payout Requests

PayoutRequest must reference:

ProducerProfile
Event
User (requester)

States:

requested
pending
processing
sent
rejected

---

# Audit Logs

AuditLog stores sensitive platform actions.

Fields:

actorUserId
action
entityType
entityId
before
after

before/after should be JSON.

Example:

before Json?
after Json?

---

# Discount System

GastroProfile
 └ Discount
      └ DiscountRedemption

Discount fields:

title
description
code
startsAt
endsAt
status

DiscountRedemption fields:

discountId
validatedByUserId
redeemedAt
origin

---

# Recommended Indexes

Ticket:

@@index([eventId, status])
@@index([orderId])

Orders:

@@index([eventId, status])

TicketScanLog:

@@index([eventId, scannedAt])

Events:

@@index([producerId])
@@index([status])

---

# Migration Strategy

Rules:

- Never drop columns without migration review
- Prefer additive migrations
- Avoid renaming columns in production without compatibility layer

---

# Seed Data

Recommended seed scripts:

- Admin user
- Example tenant
- Example producer
- Example event
- Basic categories

---

# AI Tool Rules (Cursor / Antigravity)

When generating Prisma models:

1. Only create entities listed in the Core Schema.
2. Follow the relations defined in the Domain Model.
3. Do not introduce new entities unless explicitly instructed.
4. Maintain consistent naming with the schema documentation.
5. Ensure indexes and constraints are respected.

If uncertainty exists, reference:

CORE_SCHEMA.md
DOMAIN_MODEL.md