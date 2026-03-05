# Frontend Conventions — apps/web and apps/scanner

## Non-Negotiable Rules
- Do not add libraries unless explicitly requested
- No massive refactors
- Keep new files ~300–400 lines max (split into components/hooks/services)
- Shared contracts/schemas from packages/shared are the source of truth

---

## Next.js (apps/web)
- App Router
- Prefer Server Components by default
- Use Client Components only when needed:
  - forms and complex interactions
  - TanStack Query hooks
  - browser-only APIs

Routing structure:
- (public): home, discovery, public details
- (auth): login/register
- (producer): producer portal routes
- (admin): admin portal routes
- (referrer): referrer portal routes
- (user): user portal routes

---

## Data Fetching
- TanStack Query is the standard
- Use stable query keys and consistent invalidation
- Centralize API calls in lib/api (no duplicated fetch logic)

---

## Forms & Validation
- Zod schemas define validation rules
- Prefer schemas in packages/shared/schemas
- UI displays human-friendly error messages
- Normalize inputs (trim, email lowercase, etc.)

---

## Auth & Role Guards
- NextAuth for authentication
- Role is available in session and used for route protection
- Apply guards in middleware or layout-level protection for portals

---

## UI Organization
- components/ui: atomic UI elements
- components/modules: domain components (ticket-card, event-carousel, review-list)
- lib/: API clients, query, helpers, auth utilities

---

## Scanner PWA (apps/scanner)
Door-mode requirements:
- High contrast UI
- Big tap targets
- Immediate success/failure feedback
- Minimal screens for speed

Offline strategy (V2 advanced):
- IndexedDB for:
  - event snapshot (allowed tickets)
  - offline scan queue
- Explicit sync status screen
- Report conflicts if server rejects a queued scan

---

## Observability
- Sentry enabled in web + scanner
- Capture:
  - network failures
  - sync failures
  - rendering exceptions
- Avoid logging sensitive personal data