# Gastro promotional events (eventos publicitarios de locales)

G12.2 (V3.3) — a gastro local publishes **events without ticketing** that live in the regular Events
catalogue. They reuse `Event`; no `GastroEvent` model.

## Model

| Field | Value |
|-------|-------|
| `Event.gastroProfileId` | owner local (nullable FK → `GastroProfile`, `ON DELETE RESTRICT`, index `(tenantId, gastroProfileId, status)`) |
| `producerProfileId` | always `null` — DB CHECK `producerProfileId IS NULL OR gastroProfileId IS NULL` |
| `producerId` | creating user (legacy column, no FK) |
| `category` | `event` (never `gastro`: that is the local's own page-event, `GastroProfile.publicEventId`) |
| `isTicketingEnabled` / `isGeneralPublication` | `false` / `true` (same as producer «Solo publicidad») |
| `EventMedia` | gallery (first image = `coverImageUrl`) |
| `EventTag` / `subcategoryId` | event taxonomy (`ContentTagSelector` / `SubcategorySelect` with `category="event"`) |

Migration: `20261102170000_event_gastro_promo_owner` (additive). Owner helper:
`resolveEventOwnerKind` / `isGastroPromoEvent` (`packages/shared/src/schemas/gastro-promo-events.ts`).

## API (`GastroPromoEventsController`, `GastroRolesGuard`, ADMIN | GASTRO_OWNER, Zod)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/gastro/promo-events?profileId=` | events of that local only |
| POST | `/gastro/promo-events` | `profileId` required; `submitForReview` → `PENDING` (local must be ACTIVE) |
| GET / PATCH | `/gastro/promo-events/:id` | access = membership of the event's local (or ADMIN in tenant) |
| POST | `/gastro/promo-events/:id/submit` | `DRAFT` / `CANCELLED` (rejected) → `PENDING` + ops email |
| POST | `/gastro/promo-events/:id/archive` | soft delete (`deletedAt`, `CANCELLED`) |

Producer CRUD (`assertEventOwnedByUser`) rejects gastro promo events for non-admins; producer ticket
types reject them for everyone; the producer events list excludes them.

## Lifecycle

Same as producer publicity events: `DRAFT` → `PENDING` → ADMIN approve (`APPROVED` + `publishedAt`)
or reject (`CANCELLED`, can be re-submitted). Editing an `APPROVED` event keeps it published (same
rule as producers).

## Portal

`/gastro/contenido` — tabs **Publicaciones** (`GastroPublicationsPanel`) | **Eventos**
(`GastroPromoEventsPanel` + `GastroPromoEventForm`), `?tab=eventos`. Images upload with the gastro
GCS scope (`entityId` = local). Logic: `apps/web/lib/gastro/gastroPromoEvents.ts`.

Tests: `test:gastro-promo-event-ownership`, `test:gastro-promo-events`.
