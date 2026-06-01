# Project Architecture — Tiketera “Yo Te Invito”

## Purpose
This document defines the official architecture for the **Tiketera – Yo Te Invito** monorepo, including app boundaries, core design decisions, and a clear path to scale into **V2** (real payments, queues/jobs, caching, advanced auditing, antifraud).

---

## Stack
- Monorepo: Nx + pnpm workspaces
- Web: Next.js (App Router) + React + TypeScript + TailwindCSS + TanStack Query + Zod + NextAuth
- Scanner PWA: Next.js PWA + Service Worker + IndexedDB + (optional) Background Sync
- API: NestJS + Prisma + PostgreSQL
- Redis (V2 recommended): rate limiting, cache, queues
- Jobs (V2 recommended): BullMQ
- Emails: `MailProvider` — Resend or DonWeb SMTP (`MAIL_PROVIDER`)
- File Storage: S3-compatible (Cloudflare R2 / AWS S3) or Cloudinary (client-defined)
- Observability: Sentry (frontend + backend), Pino structured logs, optional OpenTelemetry

---

## Monorepo Apps & Responsibilities

### apps/web
Main web application (Next.js App Router).

Responsibilities:
- Public marketplace UI (Netflix-like Home, carousels, search/filter)
- Public details: event, producer, restaurant, excursions, rentals
- Auth flows: login/register
- Role-based portals:
  - Producer portal (events, tickets, courtesy, referrals, payouts, exports)
  - Gastro portal (content, discounts, validation logs)
  - Referrer portal (assigned events, sales metrics, commissions)
  - User portal (preferences, attended/saved events)
  - Admin portal (approvals, global management, platform config)

### apps/scanner
Door-mode PWA for ticket validation (online/offline).

Responsibilities:
- Operator auth (V2 recommended mandatory)
- QR scanning
- Atomic online validation
- Offline queue + sync (V2 advanced)
- Scan logs (who/when/result)

### apps/api
Backend API (NestJS).

Responsibilities:
- Authentication and authorization (RBAC)
- Domain modules: events, ticketing, orders, referrals, reviews, payouts, admin
- Scanner endpoints (validate + sync)
- Audit logging
- Integrations (emails, storage, payments V2, AFIP V2)
- Exports/PDF generation (V2 via jobs)

### packages/shared
Shared contracts between frontend and backend:
- Types, enums, Zod schemas
- Helpers (money, dates, ids)
- Request/response contract shapes

---

## Key Domain Concepts
- Marketplace content (events + editorial presence providers)
- Ticketing (types + batches + tickets)
- Door validation (scanner)
- Referrals & commissions
- Reviews/ratings
- Payout requests and admin oversight
- Auditing for sensitive actions

---

## Core Status Enums

Event status:
- draft
- pending
- approved
- paused
- cancelled
- deleted

Ticket status:
- valid
- used
- revoked
- refunded

Order status:
- draft
- paid
- cancelled
- refunded

Referral commission status:
- pending
- requested
- paid
- rejected

Payout status:
- requested
- pending
- processing
- sent
- rejected

---

## Critical Rules
- Soft-delete for core entities where applicable (events, ticket types, etc.)
- Backend enforces “only active batch is sellable”
- Online scan must be atomic (transaction)
- Audit logs are mandatory for sensitive actions
- Redis caching (V2) for Home and public event pages

---

## Scanner Strategy

Online (V1):
- QR → API validate endpoint → transaction → mark used → log scan.

Offline (V2 advanced):
- Pre-download “allowed list” snapshot for an event
- Store in IndexedDB
- Local validation + enqueue scans for sync
- When online:
  - batch sync endpoint processes queue
  - conflicts are reported (e.g., ticket already used elsewhere)

---

## V2 Roadmap (no massive refactor)
- Real payments + webhooks + retries + reconciliation
- BullMQ jobs for PDFs/exports/emails/aggregated metrics
- Full offline scanner with conflict resolution
- Public resale with antifraud rules and limits
- AFIP/TusFacturas invoicing integration
- Redis caching for key public surfaces