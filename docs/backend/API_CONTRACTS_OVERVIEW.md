# API Contracts Overview
Project: Tiketera "Yo Te Invito"

This document provides a high-level overview of the **API structure and endpoint contracts**.

Purpose:

- Help developers understand API responsibilities
- Help AI tools (Cursor / Antigravity) generate correct code
- Define consistent patterns for endpoints
- Avoid breaking contracts during development

The API follows a **REST architecture** implemented with **NestJS**.

Base path recommended:

/api/v1

---

# Global API Rules

## Response Format

All API responses should follow a consistent structure.

Success response:

{
  success: true,
  data: {...},
  meta?: {...}
}

Error response:

{
  success: false,
  error: {
    code: "ERROR_CODE",
    message: "Human readable message"
  }
}

---

# Authentication

Authentication methods:

- NextAuth session (web)
- JWT access token (API clients / scanner)

Auth header:

Authorization: Bearer <token>

---

# Role Based Access Control

Roles:

ADMIN
PRODUCER_OWNER
PRODUCER_STAFF
GASTRO_OWNER
REFERRER
SCANNER
USER

Each endpoint must specify the required role(s).

---

# Core API Modules

Modules correspond to backend folders:

auth
users
producers
gastro
events
ticketing
orders
scanner
referrals
reviews
payouts
admin
exports
audit

---

# Auth Module

Handles login, session validation, and token refresh.

POST /auth/login

Input:

email
password

Output:

user
accessToken
refreshToken

---

POST /auth/refresh

Input:

refreshToken

Output:

newAccessToken

---

GET /auth/me

Auth required.

Returns current user profile.

---

# Users Module

Admin or self-service user management.

GET /users/me

Returns the authenticated user's profile.

---

PATCH /users/me

Update user settings.

Fields:

name
phone
preferences

---

Admin only:

GET /users

List platform users.

---

PATCH /users/{userId}/status

Change user status.

Possible status:

active
suspended

---

# Producers Module

Producer organization management.

GET /producers/{slug}

Public endpoint.

Returns producer public profile.

---

POST /producers

Create producer profile.

Role required:

PRODUCER_OWNER

---

PATCH /producers/{producerId}

Update producer profile.

---

# Gastro Module

Restaurant or gastronomy profiles.

GET /gastro/{slug}

Public profile endpoint.

---

POST /gastro

Create gastro profile.

---

PATCH /gastro/{gastroId}

Update editorial content and info.

---

# Events Module

Event lifecycle and management.

GET /events

Public listing endpoint.

Filters:

city
category
date
producer

---

GET /events/{eventId}

Public event detail.

Includes:

- ticket types
- media
- producer info

---

POST /events

Create event.

Roles:

PRODUCER_OWNER
PRODUCER_STAFF

---

PATCH /events/{eventId}

Edit event.

---

POST /events/{eventId}/submit

Move event to pending approval.

---

POST /events/{eventId}/approve

Admin only.

Changes status to approved.

---

POST /events/{eventId}/pause

Pause ticket sales.

---

POST /events/{eventId}/cancel

Cancel event.

---

# Ticketing Module

Ticket types and batches.

POST /events/{eventId}/ticket-types

Create ticket type.

Fields:

name
price
description

---

PATCH /ticket-types/{ticketTypeId}

Update ticket type.

---

POST /ticket-types/{ticketTypeId}/batches

Create ticket batch.

Fields:

batchNumber
qtyTotal
startsAt
endsAt

---

GET /events/{eventId}/tickets

List tickets for event.

Role:

Producer staff or admin.

---

# Orders Module

Handles ticket purchases.

POST /orders

Create order.

Input:

eventId
items:
  ticketTypeId
  quantity

Output:

order summary
payment info

---

POST /orders/{orderId}/confirm

Confirm payment (V1 demo flow).

Creates tickets.

---

GET /orders/{orderId}

Returns order with tickets.

---

# Scanner Module

Door validation.

POST /scanner/validate

Input:

qrCode

Output:

result
ticket info

Possible results:

valid
already_used
invalid
revoked

---

POST /scanner/sync

Batch sync for offline scans.

Input:

list of scans

Output:

validation results

---

GET /scanner/event/{eventId}/snapshot

Download allowed tickets snapshot for offline validation.

---

# Referrals Module

Referral system for promoters.

POST /referrals

Create referral link.

Fields:

eventId
referrerId

---

GET /referrals/{referrerId}

List referral links and stats.

---

GET /referrals/{referrerId}/sales

List attributed orders.

---

# Reviews Module

User reviews and ratings.

POST /reviews

Create review.

Fields:

targetType
targetId
scores
comment

---

GET /reviews/{targetType}/{targetId}

List reviews.

---

# Payouts Module

Producer payout workflow.

POST /payouts

Create payout request.

Fields:

eventId
bankInfo

---

GET /payouts

List payout requests.

---

PATCH /payouts/{payoutId}

Admin updates payout status.

Possible states:

requested
pending
processing
sent
rejected

---

# Admin Module

Platform administration.

GET /admin/events/pending

List events awaiting approval.

---

POST /admin/events/{eventId}/approve

Approve event.

---

POST /admin/events/{eventId}/reject

Reject event.

---

POST /admin/tickets/{ticketId}/revoke

Revoke ticket.

---

# Exports Module

Export data for producers/admin.

GET /exports/events/{eventId}/tickets

Export tickets list.

Formats:

PDF
CSV

---

GET /exports/events/{eventId}/sales

Export sales report.

---

# Audit Module

Audit logs for compliance.

GET /audit

Admin only.

Filters:

entityType
actor
dateRange

---

# Error Codes

Common error codes:

AUTH_REQUIRED
FORBIDDEN
NOT_FOUND
VALIDATION_ERROR
TICKET_ALREADY_USED
TICKET_INVALID
ORDER_NOT_FOUND
EVENT_NOT_APPROVED

---

# Versioning

All endpoints should be versioned.

Example:

/api/v1/events

Future breaking changes must increment version:

/api/v2