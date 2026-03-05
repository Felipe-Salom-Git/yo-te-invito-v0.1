# Backend Architecture Overview

## Overview

The backend of **Yo Te Invito** follows a modular architecture built with **NestJS + Prisma**.

The system is designed to support a **multi-tenant event marketplace platform**.

Key goals:

- scalability
- modular domain design
- strict validation
- consistent API contracts
- safe ticket lifecycle

---

# Architecture Layers

The system is divided into clear layers.


Client
↓
API Controllers
↓
Validation Layer (Zod)
↓
Service Layer (Business Logic)
↓
Persistence Layer (Prisma)
↓
PostgreSQL


---

# API Principles

All endpoints follow the same principles:

### Validation

Every endpoint validates:


query
params
body


using **Zod schemas stored in `packages/shared`**.

---

### Error Handling

All errors follow the standard format:


{
statusCode
code
message
details
timestamp
path
}


---

### Transactions

Critical operations use **Prisma transactions**, especially:

- ticket issuance
- scan validation
- stock reservation
- courtesy issuance

---

# Domain Modules

The backend is organized by domain modules.

---

## Identity

Handles authentication and multi-tenant isolation.

Models:


Tenant
User
Role


---

## Events

Manages event lifecycle.

Features:

- event creation
- approval workflow
- public event listing
- event discovery

Models:


Event
EventMedia


---

## Ticketing

Responsible for ticket creation and lifecycle.

Features:

- ticket types
- orders
- ticket issuance
- QR generation

Models:


TicketType
Order
OrderItem
Ticket


---

## Scanner

Handles door validation.

Features:

- atomic ticket validation
- scan logs
- offline scanner support

Models:


TicketScanLog


---

## Courtesies

Allows producers to generate courtesy tickets.

Features:

- courtesy grants
- capacity validation
- courtesy ticket issuance

Models:


CourtesyGrant


---

## Referrals

Tracks the origin of ticket sales.

Features:

- referral links
- immutable attribution

Models:


ReferralLink
ReferralAttribution


---

## Reviews

Allows users to rate events.

Models:


Review


---

## Audit Logging

Tracks sensitive actions in the system.

Models:


AuditLog


---

# Scanner Architecture

The scanner is designed for **high reliability during events**.

Two modes exist:

### Online Mode


Scanner
↓
POST /scanner/scan
↓
Atomic validation
↓
TicketScanLog


---

### Offline Mode


Scanner
↓
IndexedDB ticket cache
↓
local validation
↓
scan queue
↓
sync when online


---

# Ticket Lifecycle


TicketType
↓
Order
↓
Ticket Issuance
↓
QR generation
↓
Door scan
↓
Ticket USED


Possible states:


VALID
USED
REVOKED


---

# Multi-Tenant Design

All major models include:


tenantId


This ensures complete data isolation between tenants.

---

# Shared Package

`packages/shared` is the **single source of truth** for:

- Zod schemas
- API contracts
- enums

This ensures frontend and backend always share the same types.

---

# Scalability Considerations

The system is designed to support future infrastructure such as:


Redis
BullMQ
S3 storage
Payment providers
Observability tools


---

# Future Backend Phases

Next development phases include:

- Payment provider integrations
- marketplace features
- recommendation systems
- analytics and reporting