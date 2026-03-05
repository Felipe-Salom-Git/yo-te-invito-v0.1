# Yo Te Invito — Project Status

## Overview

**Yo Te Invito** is a hybrid platform that combines:

- Event ticketing
- Tourism discovery
- Experience marketplace
- Gastronomic promotions
- Referral system
- QR-based access control

The platform allows users to:

- discover events
- buy tickets
- generate QR tickets
- validate access at event doors
- track referrals
- review events

The long-term vision is to evolve into a **marketplace for experiences and tourism activities**.

---

# Technology Stack

## Monorepo

- Nx
- pnpm workspaces

## Frontend

- Next.js (App Router)
- React
- TypeScript
- TailwindCSS
- TanStack Query
- Zod

## Scanner App

- Next.js PWA
- IndexedDB
- Offline scan queue
- Background sync

## Backend

- NestJS
- Prisma ORM
- PostgreSQL
- Zod validation

---

# Repository Structure


apps/
web/ → Marketplace + dashboards
scanner/ → Door scanning PWA
api/ → NestJS backend

packages/
shared/ → Zod schemas, enums, API contracts

docs/
architecture/
backend/
frontend/
project/


---

# Current Backend Capabilities

The backend currently supports:

### Event System

- event creation
- event approval
- ticket types
- public event listing
- event discovery & search

### Ticketing

- ticket purchase (demo)
- QR ticket generation
- ticket validation
- ticket scanning
- ticket revocation (planned V1.2)

### Scanner

- online validation endpoint
- atomic scan validation
- offline scanning mode
- local scan queue
- scan synchronization

### Platform Features

- courtesy tickets
- referral links
- review system
- audit logging
- discovery/search

---

# Completed Backend Slices

| Slice | Feature |
|------|--------|
| 01 | Monorepo bootstrap |
| 02 | Identity core |
| 03 | API foundation |
| 04 | Events domain |
| 05 | Ticketing core |
| 06 | Scanner validation |
| 07 | Orders separation |
| 08.2 | Scanner online door mode |
| 08.3 | Scanner offline mode |
| 09 | Courtesy system |
| 10 | Referrals V1 |
| 11 | Reviews V1 |
| 12 | Audit logging |
| 13 | Event discovery |

---

# Current System Status

The system is capable of running a **real event workflow**:


discover event
↓
purchase ticket (demo)
↓
receive QR
↓
scan at door
↓
validate entry


Scanner supports both:

- online validation
- offline validation with sync

---

# Next Phase

The next phase is **Backend V1.2 hardening**, which focuses on:

- ticket lifecycle completion
- capacity protection
- operational metrics
- fraud protection
- system observability

See:


ROADMAP_BACKEND_V1.2.md


---

# Future Milestones

After Backend V1.2 the project will move to:

- Payment integrations
- Marketplace features
- Producer dashboards
- Advanced discovery
- Tourism experiences