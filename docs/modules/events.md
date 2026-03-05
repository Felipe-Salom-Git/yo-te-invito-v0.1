# Technical SPEC: Slice 04 — Events Domain (Database + Public Read API)

## 1) Domain Overview
The Events Domain module allows public users to browse, search, and view detailed information for events hosted on the Yo Te Invito marketplace. This slice covers the database definitions and public read APIs required to serve event lists and details. 

**Key Constraints for V1:**
- **Routes:** Endpoints MUST be scoped under `/public/events` (without a `/api/v1` prefix).
- **Controller Strategy:** Update the existing stub in `apps/api/src/public/public-events.controller.ts`.
- **Tenant Context:** Multi-tenant isolation is enforced via a required `tenantId` query parameter since domain resolution is not yet implemented.
- **Visibility Restrictions:** Event queries must strictly return items with `status = APPROVED` and `deletedAt = null`. Soft-deleted or draft/paused events are invisible to the public.

## 2) Prisma Models
The following models must be added to `schema.prisma`:

### Model: `Event`
- `id` (String, `@id`, `@default(uuid())` or cuid)
- `tenantId` (String)
- `producerId` (String) - *Logical reference for now*
- `title` (String)
- `description` (String)
- `startAt` (DateTime)
- `endAt` (DateTime?)
- `city` (String)
- `venueName` (String)
- `venueAddress` (String)
- `geoLat` (Float?)
- `geoLng` (Float?)
- `status` (`EventStatus`)
- `capacityTotal` (Int?)
- `coverImageUrl` (String?)
- `isTicketingEnabled` (Boolean)
- `publishedAt` (DateTime?)
- `createdAt` (DateTime `@default(now())`)
- `updatedAt` (DateTime `@updatedAt`)
- `deletedAt` (DateTime?)

**Relations:**
- Belongs to `Tenant` (via `tenantId`)
- Has many `EventMedia` (via `event.media`)

### Model: `EventMedia`
- `id` (String, `@id`, `@default(uuid())` or cuid)
- `eventId` (String)
- `type` (`EventMediaType`)
- `url` (String)
- `sortOrder` (Int `@default(0)`)
- `createdAt` (DateTime `@default(now())`)
- `deletedAt` (DateTime?)

**Relations:**
- Belongs to `Event` (via `eventId`)

## 3) Indexing Strategy
To optimize the public read experience—especially given multi-tenant constraints and date-based filtering—Prisma models must declare the following indexes:

**On `Event`:**
- `@@index([tenantId])`
- `@@index([tenantId, status])`
- `@@index([tenantId, status, deletedAt, startAt])` *(Optimizes the primary public listing query which sorts active items by date)*
- `@@index([city])`

**On `EventMedia`:**
- `@@index([eventId])`

## 4) Shared Schemas
Updates must be made to `packages/shared/src/schemas/events.ts`.

### Enums
Add or update the Zod enum equivalents for:
- `EventStatus`: `DRAFT` | `PENDING` | `APPROVED` | `PAUSED` | `CANCELLED` (Note: `DELETED` is strictly excluded; soft delete logic relies on `deletedAt`).
- `EventMediaType`: `IMAGE` | `VIDEO`

### Query Schemas
- `eventsListQuerySchema`:
  - `tenantId`: string (required)
  - `page`: number (default 1)
  - `limit`: number (default 20, max 100)
  - `city`: string (optional)
  - `dateFrom`: string/date ISO (optional)
  - `dateTo`: string/date ISO (optional)
  - *Validation Rule:* Implement a `.refine()` to ensure `dateFrom <= dateTo`.

### Response Schemas
- `EventMediaSchema`: Reflects `EventMedia` base fields.
- `EventSummarySchema`: Subset of `Event` properties specifically for the listing view (e.g., includes `coverImageUrl` but omits heavy nested media relationships or secondary descriptions if applicable).
- `EventDetailSchema`: Extends `EventSummarySchema` offering full data, including a nested array representation of `EventMediaSchema`.
- `EventsPaginatedResponseSchema`: Structured to include `data` (Array of `EventSummarySchema`) and `meta` (Object: `{ page, limit, total, totalPages }`).

## 5) API Contract
All validation relies on the existing `ZodValidationPipe` globally registered in the monorepo.

### List Endpoint
- **Request:** `GET /public/events`
- **Query Params:** Requires `tenantId`, accepts `page`, `limit`, `city`, `dateFrom`, `dateTo`.
- **Response:** `EventsPaginatedResponseSchema` (200 OK)

### Detail Endpoint
- **Request:** `GET /public/events/:id`
- **Query Params:** Requires `tenantId`.
- **Response:** `EventDetailSchema` (200 OK)
- **Error Types:** `VALIDATION_FAILED` (400) on malformed queries, `NOT_FOUND` (404) if rules are violated.

## 6) Query Logic
The queries must be optimized against N+1 bottlenecks and unused payload bloat.

**List Query Mechanism (`GET /public/events`):**
- **Clause Building:** Query `Prisma.event.findMany`. Filters include strictly matched `tenantId`, `status: 'APPROVED'`, `deletedAt: null`. Apply `city` and date boundaries (`startAt` via `gte` and `lte`) conditionally if provided via the validated struct.
- **Fields Selection:** Use Prisma's `select` (NOT `include`) to surgically return only the fields defined in `EventSummarySchema`.
- **Pagination Strategy:** Apply offset limits: `skip = (page - 1) * limit` and `take = limit`. Execute alongside `Prisma.event.count` to calculate metadata.

**Detail Query Mechanism (`GET /public/events/:id`):**
- **Clause Building:** Query `Prisma.event.findFirst`. Filters include matched `id`, `tenantId`, `status: 'APPROVED'`, `deletedAt: null`.
- **Eager Loading:** Retrieve relations natively via Prisma's `include`. specifically: `include: { media: true }` (ensure `deletedAt: null` is checked via `media: { where: { deletedAt: null } }` if soft delete applies to child records).

## 7) Edge Cases
1. **Invalid Dates:** If a `dateFrom` is larger than `dateTo`, the `ZodValidationPipe` catches the `refine` trigger and inherently returns a native `VALIDATION_FAILED` wrapper.
2. **Missing `tenantId`:** Results synchronously in a `VALIDATION_FAILED` 400 error.
3. **Information Leakage:** If the requested ID belongs to another tenant, is `PAUSED`/`DRAFT`, or has been soft-deleted (`deletedAt != null`), it must surface natively as a generic `NOT_FOUND` rather than a permission error, preventing resource enumeration.
4. **Pagination Negatives/Bloat:** Inputs such as `page=-1` or `limit=9999` are constrained tightly by `eventsListQuerySchema` max bounds handling.

## 8) Acceptance Criteria
- Endpoints answer on `/public/events` explicitly.
- The `PublicEventsController` replaces the stub with real Prisma integrations.
- Shared schemas in `packages/shared/src/schemas/events.ts` host all structural validation.
- Missing `tenantId` drops early with `VALIDATION_FAILED`.
- Only `status === APPROVED` && `deletedAt === null` are retrievable.

## 9) Smoke Tests
Execute the following verification manual steps to prove data boundary rigidity:

1. **Test Material Seed:**
   - Seed `1 DRAFT event` and `1 APPROVED event` connected identically to the same `tenantId`.
2. **Listing Verification:**
   - Query `GET /public/events?tenantId={tenantId}`.
   - Assert the result payload contains only the `APPROVED` event.
3. **Detail Success Verification:**
   - Query `GET /public/events/{approvedEventId}?tenantId={tenantId}`.
   - Assert standard HTTP `200` alongside relational media values.
4. **Detail Isolation Verification:**
   - Query `GET /public/events/{draftEventId}?tenantId={tenantId}`.
   - Assert generic HTTP `404 NOT_FOUND` is surfaced.
5. **Validation Error Constraints Check:**
   - Query `GET /public/events?tenantId={tenantId}&page=-1`.
   - Assert HTTP `400 VALIDATION_FAILED` blocks resolution.

## 10) Documentation Updates
This document serves as the `docs/modules/events.md` file layout and specifies the current database and endpoint designs, entity boundaries, soft deletion standards, and implementation expectations for the Events module.
