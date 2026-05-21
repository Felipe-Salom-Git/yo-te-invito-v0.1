-- Remove resale marketplace (personal ticket transfer only; no peer-to-peer payments).
-- Demo/dev: tickets in RESALE_PENDING → VALID; clear activeResaleListingId.
-- Note: RESALE_PENDING may remain as an unused label on PostgreSQL enum "TicketStatus".
-- Prisma schema no longer maps it; no new rows should use it after this migration.

-- ── 1. Normalize data ───────────────────────────────────────────────────────
UPDATE "ResaleListing"
SET
  "status" = 'CANCELLED',
  "cancelledAt" = COALESCE("cancelledAt", NOW()),
  "updatedAt" = NOW()
WHERE "status" = 'ACTIVE';

UPDATE "Ticket"
SET
  "status" = 'VALID',
  "activeResaleListingId" = NULL,
  "updatedAt" = NOW()
WHERE "status" = 'RESALE_PENDING';

UPDATE "Ticket"
SET
  "activeResaleListingId" = NULL,
  "updatedAt" = NOW()
WHERE "activeResaleListingId" IS NOT NULL;

-- ── 2. Drop resale tables / columns ─────────────────────────────────────────
ALTER TABLE "Ticket" DROP CONSTRAINT IF EXISTS "Ticket_activeResaleListingId_fkey";
DROP INDEX IF EXISTS "Ticket_activeResaleListingId_key";
ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "activeResaleListingId";

DROP TABLE IF EXISTS "ResaleListing";
DROP TYPE IF EXISTS "ResaleListingStatus";
