# System Overview
Project: Tiketera "Yo Te Invito"

This document explains how the system works at a high level.

AI systems must read this document before implementing features
to understand how modules interact and how data flows through the system.

The goal of this document is to define:

- System architecture layers
- Main modules
- Data flow
- Responsibility boundaries
- Development constraints

This prevents mixing responsibilities between frontend, backend and database.

---

# 1. High Level System Flow

At a high level, the system follows a standard layered architecture.

User
↓
Frontend Application (Next.js / React)
↓
API Layer (NestJS Controllers)
↓
Application / Business Logic (Services)
↓
Persistence Layer (Prisma ORM)
↓
Database (PostgreSQL)

Each layer has a clear responsibility.

No layer should bypass another layer.

Example rule:

Frontend must never query the database directly.

All data must pass through the API layer.

---

# 2. Main System Layers

The system is divided into four main layers.

---

## Frontend Layer

Technology:

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS
- TanStack Query
- Zod (client validation)
- NextAuth

Responsibilities:

- UI rendering
- user interaction
- form handling
- calling API endpoints
- caching via TanStack Query
- authentication session handling

Important rules:

- No business logic in UI components
- No database logic
- API requests must go through centralized API clients

Frontend apps:

apps/web
apps/scanner

apps/web:
Marketplace + portals.

apps/scanner:
Ticket validation PWA.

---

## API Layer

Technology:

- NestJS
- TypeScript

Responsibilities:

- expose REST endpoints
- validate requests
- enforce RBAC
- orchestrate services
- format API responses

Controllers must remain thin.

Controllers should only:

1) validate input
2) call services
3) return formatted responses

Controllers must NOT:

- contain business logic
- access database directly

---

## Application / Service Layer

This is the **core business logic layer**.

Location:

apps/api/src/modules/**/services

Responsibilities:

- implement domain logic
- enforce business rules
- coordinate repositories
- trigger side effects (emails, jobs)

Examples:

EventService
TicketService
OrderService
ReferralService
ScannerService

Examples of logic handled here:

- activating ticket batches
- validating ticket scans
- calculating referral commissions
- generating tickets after purchase

All business rules must live here.

---

## Persistence Layer

Technology:

- Prisma ORM

Responsibilities:

- database access
- queries
- transactions
- indexing strategy

All database interactions must go through Prisma.

Rules:

- No raw SQL unless necessary
- No database access outside services
- No Prisma calls from controllers

---

## Database Layer

Technology:

PostgreSQL

Responsibilities:

- persistent storage
- relational integrity
- indexing
- transactional guarantees

The database stores:

- users
- events
- tickets
- orders
- referrals
- reviews
- payouts
- audit logs

Schema definitions are documented in:

CORE_SCHEMA.md

---

# 3. Main System Modules

The backend is organized into domain modules.

Each module encapsulates its own logic.

Modules live in:

apps/api/src/modules/

---

## Auth

Handles:

- authentication
- token validation
- session management

---

## Users

Handles:

- user profiles
- role management
- account status

---

## Producers

Handles:

- producer organizations
- editorial content
- event ownership

---

## Gastro

Handles:

- restaurants
- discount promotions
- validation logs

---

## Events

Handles:

- event creation
- event approval workflow
- event media
- event lifecycle

---

## Ticketing

Handles:

- ticket types
- ticket batches
- ticket minting

Structure:

Event
 └ TicketType
     └ TicketBatch

---

## Orders

Handles:

- purchases
- order creation
- payment confirmation
- ticket issuance

---

## Scanner

Handles:

- ticket validation
- door scanning
- scan logs
- offline sync (V2)

---

## Referrals

Handles:

- referral links
- attribution
- commission tracking

---

## Reviews

Handles:

- ratings
- comments
- score aggregation

---

## Payouts

Handles:

- producer payout requests
- payout status tracking

---

## Admin

Handles:

- event approvals
- moderation
- platform configuration

---

## Exports

Handles:

- CSV exports
- PDF generation

In V2 this should run through background jobs.

---

## Audit

Handles:

- platform audit logs
- action tracking
- compliance support

---

# 4. Data Flow

A typical request follows this path.

Client Request
↓
API Endpoint
↓
Zod Validation
↓
Service Layer
↓
Prisma Query
↓
Database
↓
Service Processing
↓
API Response
↓
Client

Example:

User purchases ticket.

Step 1:
Frontend sends request.

POST /orders

Step 2:
Controller validates input.

Step 3:
OrderService creates order.

Step 4:
Prisma inserts order record.

Step 5:
Service generates tickets.

Step 6:
API returns order + ticket data.

---

# 5. AI Development Boundaries

AI tools must follow these boundaries.

---

## UI Logic

UI logic must stay inside frontend components.

Allowed:

- rendering
- form validation
- API calls
- state management

Not allowed:

- business rules
- database queries

---

## Business Logic

Business logic must live in the service layer.

Examples:

- ticket validation
- commission calculations
- batch activation
- order processing

Never implement business rules in controllers.

---

## Database Access

All database access must go through Prisma.

Rules:

Controllers → Services → Prisma → Database

Never:

Controller → Prisma → Database

---

## API Contracts

Endpoints must follow contracts defined in:

API_CONTRACTS_OVERVIEW.md

Do not change endpoint structures without updating documentation.

---

## Schema Changes

Database schema changes must follow:

PRISMA_SCHEMA_GENERATION_GUIDE.md

Never introduce new entities without updating:

CORE_SCHEMA.md

---

# 6. Scalability Considerations (V2)

The architecture is prepared for future extensions.

Planned upgrades:

Payments
- MercadoPago
- GetNet
- Webhooks

Jobs / Queues
- BullMQ
- async exports
- email sending

Caching
- Redis
- Home page caching
- Event page caching

Scanner Offline Mode
- IndexedDB snapshot
- scan sync endpoint

Observability

- Sentry
- structured logging
- OpenTelemetry (optional)

---

# 7. Reference Documents

Developers and AI tools should reference:

PROJECT_ARCHITECTURE.md
FOLDER_STRUCTURE.md
CORE_SCHEMA.md
DOMAIN_MODEL.md
API_CONTRACTS_OVERVIEW.md
PRISMA_SCHEMA_GENERATION_GUIDE.md

before implementing new features.

# AI Development Boundaries

AI systems working in this repository must respect the following boundaries:

Frontend
- UI only
- API calls
- client state

Backend Controllers
- request handling
- validation
- calling services

Services
- business logic
- orchestration

Prisma Layer
- database access only

No layer should implement responsibilities belonging to another layer.