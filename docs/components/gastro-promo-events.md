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

## Location (G12.4)

- Form radio: **«Usar ubicación del local»** (default, no map, shows the local's name / address / city /
  province) or **«Usar otra ubicación»** («Nombre del lugar (opcional)» + `EventLocationFields`, the same
  modern picker as the gastro profile and producer events — Georef + `/geo/resolve-address` + pin).
- Payload: local → `{ useLocalLocation: true }` (API copies `venueAddress` / `city` / `province` /
  `geoLat` / `geoLng` from the local); custom → `{ useLocalLocation: false, venueName, venueAddress, city,
  province, geoLat, geoLng, googlePlaceId }` (Zod: province + city + address required, pin both or none).
- Switching mode discards the other mode's values; coordinates are never mixed. Response exposes
  `usesLocalLocation` (`venueMatchesLocal`), `geoLat`, `geoLng`, `googlePlaceId`.
- G12.2 clients without the flag: create without address = local; update without the flag = partial patch.
- Helpers: `apps/api/src/modules/gastro/gastro-promo-event-venue.util.ts`, `apps/web/lib/gastro/gastroPromoEvents.ts`.

## Public

- Discovery: same queries as any `event` (`/public/events`, search, calendar, trending). Visible only
  while `APPROVED`, not past (event visibility rule) and the local is `ACTIVE`
  (`publicParentEntitiesActiveWhere`). Ticketing rails (`hasTicketing=true`: Destacados / Próximos)
  exclude them, exactly like producer publicity events; «Recientes», subcategory rails, date /
  calendar, `/explore` and search include them. While `event` is «comingSoon» (V3.2) only preview
  roles see the Events catalogue.
- Card: same `EventCard` / `ContentCard`; `producerName` = local name, `gastroOrganizer` = `{ id, displayName, logoUrl }`.
- Detail `/events/:id`: `EventPublicityInfoCard` («Organiza {local}» + «Ver ficha del local»), hero CTA
  «Más información» (any publicity event), no ticket types / checkout, `EventGallerySection`
  (EventMedia, swipe lightbox), `PublicShareButton` (G11) with `/events/:id`.
- Local page `/gastronomicos/:id`: `GastroLocalEventsSection` (Descuentos → **Eventos** → Publicaciones),
  `GET /public/events?category=event&gastroProfileId=`; cards via `toGastroLocalEventCards`.

## Admin

`/admin/eventos`: column **Origen** (`AdminEventOwnerCell`: «Local gastronómico» · local · owner),
filter **Origen** (`origin=producer|gastro|platform`), inline **Aprobar / Rechazar**
(`AdminGastroPromoEventModeration`, generic `POST /admin/events/:id/approve|reject`), «Ver local».
Dashboard «Revisar» → `/admin/eventos?view=pending&origin=gastro`. Approve / reject notifications go to
the local's members with `/gastro/contenido?profileId=…&tab=eventos`.

Tests: `test:gastro-promo-event-ownership`, `test:gastro-promo-events`, `test:gastro-promo-event-admin`,
`test:g12-gastro-promo-events-db` (PostgreSQL, rolled back), `test:event-location`.
