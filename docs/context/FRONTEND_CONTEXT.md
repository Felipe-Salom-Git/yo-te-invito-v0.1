# FRONTEND_CONTEXT.md
## Project: Yo Te Invito — Frontend Web
## Mode: LocalStorage Edition (Backend-ready architecture)

This document explains the current frontend architecture, domain rules, development boundaries, and implementation roadmap for the **Yo Te Invito** web frontend.

It is intended for:
- AI coding assistants
- frontend developers
- reviewers
- future backend integration work

---

# 1. Project Goal

Build the web frontend of **Yo Te Invito**, an event discovery and ticketing platform, using a backend-ready architecture while temporarily persisting data in **localStorage**.

The frontend must support a complete demo flow:

Intro  
→ Home  
→ Explore Events  
→ Event Detail  
→ Checkout  
→ Ticket Issuance  
→ My Tickets  
→ QR View  

The key objective is to **avoid future refactors** when switching from LocalStorage to a real API backend.

---

# 2. Tech Stack

- **Next.js** (App Router)
- **React**
- **TypeScript**
- **TailwindCSS**
- **TanStack Query**
- **Zod**
- **NextAuth** (prepared for future integration)
- **Framer Motion** (for intro/splash animation)

---

# 3. Branding

## Color Palette
- **Black** → primary background
- **Green** → accents, highlights, scan line, glow
- **White** → main contrast text

## Logo
Current logo asset path:

`apps/web/public/brand/logo.png`

It must be used through a centralized reusable component:

`components/brand/Logo.tsx`

The logo should appear in:
- Navbar
- Splash intro
- Login/Auth-related pages
- Branding blocks / landing areas

---

# 4. Core Frontend Principles

## 4.1 No direct persistence access from UI
UI components must **never** access:
- localStorage directly
- fetch directly
- API logic directly
- repository implementation details

All persistence access must flow through repository abstractions.

## 4.2 Query-first UI
UI should consume data through:
- TanStack Query hooks
- repository interfaces

This keeps the app ready for:
- local mode now
- API mode later

## 4.3 Small slices only
Implementation must be done in small, isolated slices.
Avoid large rewrites and avoid refactoring multiple unrelated areas at once.

## 4.4 Domain consistency matters
Frontend labels, statuses, and flow names must match the product domain and future backend contracts.

---

# 5. Data Access Architecture

The frontend uses a repository-based architecture.

## Data Flow

UI Components  
↓  
Query Hooks (TanStack Query)  
↓  
Repository Interfaces  
↓  
Local Repository (current) / API Repository (future)

## Current Persistence
- LocalStorage
- Seeded demo data
- Local repositories

## Future Persistence
- API backend
- Same repository interfaces
- UI should remain mostly unchanged

---

# 6. Expected Folder Structure

```txt
apps/web
│
├─ app
│   ├─ page.tsx
│   ├─ home/
│   ├─ explore/
│   ├─ events/[eventId]/
│   ├─ checkout/[eventId]/
│   ├─ my-tickets/
│   ├─ profile/
│   └─ ...
│
├─ components
│   ├─ brand/
│   │   └─ Logo.tsx
│   │
│   ├─ layout/
│   │   ├─ AppShell.tsx
│   │   ├─ Navbar.tsx
│   │   └─ PageContainer.tsx
│   │
│   ├─ splash/
│   │   └─ SplashIntro.tsx
│   │
│   ├─ events/
│   │   ├─ EventCard.tsx
│   │   ├─ EventGrid.tsx
│   │   └─ EventDetail sections...
│   │
│   ├─ tickets/
│   │   ├─ TicketCard.tsx
│   │   ├─ TicketStatusBadge.tsx
│   │   └─ TicketQrModal.tsx
│   │
│   ├─ checkout/
│   └─ domain/
│
├─ hooks
│   ├─ queryKeys.ts
│   ├─ useEvents.ts
│   ├─ useOrders.ts
│   ├─ useTickets.ts
│   └─ ...
│
├─ repositories
│   ├─ eventRepository.ts
│   ├─ orderRepository.ts
│   ├─ ticketRepository.ts
│   │
│   ├─ local/
│   │   ├─ LocalEventRepository.ts
│   │   ├─ LocalOrderRepository.ts
│   │   └─ LocalTicketRepository.ts
│   │
│   ├─ api/
│   │   ├─ ApiEventRepository.ts
│   │   ├─ ApiOrderRepository.ts
│   │   └─ ApiTicketRepository.ts
│   │
│   └─ RepositoryProvider.tsx
│
├─ lib
│   ├─ introStorage.ts
│   ├─ domainLabels.ts
│   ├─ seedDemoData.ts
│   └─ ...