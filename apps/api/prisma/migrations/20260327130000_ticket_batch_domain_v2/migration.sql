-- TicketBatch domain: base TicketType + child batches; backfill from legacy rows.

CREATE TYPE "TicketBatchStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'CLOSED', 'SOLD_OUT', 'SKIPPED');

ALTER TABLE "TicketType" ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "ticketTemplateId" TEXT;

UPDATE "TicketType" AS tt
SET "tenantId" = e."tenantId"
FROM "Event" AS e
WHERE e."id" = tt."eventId";

ALTER TABLE "TicketType" ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "TicketType" ADD CONSTRAINT "TicketType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "TicketBatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "baseQuantity" INTEGER NOT NULL,
    "rolloverQuantity" INTEGER NOT NULL DEFAULT 0,
    "effectiveQuantity" INTEGER NOT NULL,
    "reservedQuantity" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" "TicketBatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketBatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TicketBatch_ticketTypeId_orderIndex_key" ON "TicketBatch"("ticketTypeId", "orderIndex");
CREATE INDEX "TicketBatch_ticketTypeId_idx" ON "TicketBatch"("ticketTypeId");
CREATE INDEX "TicketBatch_eventId_idx" ON "TicketBatch"("eventId");
CREATE INDEX "TicketBatch_tenantId_idx" ON "TicketBatch"("tenantId");

ALTER TABLE "TicketBatch" ADD CONSTRAINT "TicketBatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TicketBatch" ADD CONSTRAINT "TicketBatch_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketBatch" ADD CONSTRAINT "TicketBatch_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

WITH paid AS (
    SELECT oi."ticketTypeId", COALESCE(SUM(oi.quantity), 0)::int AS q
    FROM "OrderItem" oi
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status = 'PAID'
    GROUP BY oi."ticketTypeId"
),
pending AS (
    SELECT oi."ticketTypeId", COALESCE(SUM(oi.quantity), 0)::int AS q
    FROM "OrderItem" oi
    INNER JOIN "Order" o ON o.id = oi."orderId"
    WHERE o.status = 'PENDING_PAYMENT'
    GROUP BY oi."ticketTypeId"
)
INSERT INTO "TicketBatch" (
    "id", "tenantId", "eventId", "ticketTypeId", "orderIndex", "name",
    "startAt", "endAt", "baseQuantity", "rolloverQuantity", "effectiveQuantity",
    "reservedQuantity", "soldCount", "price", "currency", "status",
    "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    tt."tenantId",
    tt."eventId",
    tt."id",
    0,
    tt."name",
    COALESCE(tt."salesStartAt", e."startAt", NOW()),
    COALESCE(tt."salesEndAt", e."endAt", e."startAt" + interval '365 days'),
    tt."capacityTotal",
    0,
    tt."capacityTotal",
    COALESCE(pending.q, 0),
    COALESCE(paid.q, 0),
    tt."price",
    tt."currency",
    CASE
        WHEN NOW() > COALESCE(tt."salesEndAt", e."endAt", e."startAt" + interval '365 days') THEN 'CLOSED'::"TicketBatchStatus"
        WHEN COALESCE(paid.q, 0) + COALESCE(pending.q, 0) >= tt."capacityTotal" THEN 'SOLD_OUT'::"TicketBatchStatus"
        WHEN NOW() >= COALESCE(tt."salesStartAt", e."startAt", NOW()) THEN 'ACTIVE'::"TicketBatchStatus"
        ELSE 'SCHEDULED'::"TicketBatchStatus"
    END,
    NOW(),
    NOW()
FROM "TicketType" tt
INNER JOIN "Event" e ON e."id" = tt."eventId"
LEFT JOIN paid ON paid."ticketTypeId" = tt."id"
LEFT JOIN pending ON pending."ticketTypeId" = tt."id";

ALTER TABLE "OrderItem" ADD COLUMN "ticketBatchId" TEXT;

UPDATE "OrderItem" oi
SET "ticketBatchId" = tb."id"
FROM "TicketBatch" tb
WHERE tb."ticketTypeId" = oi."ticketTypeId" AND tb."orderIndex" = 0;

ALTER TABLE "Ticket" ADD COLUMN "ticketBatchId" TEXT;

UPDATE "Ticket" t
SET "ticketBatchId" = oi."ticketBatchId"
FROM "OrderItem" oi
WHERE t."orderItemId" = oi."id" AND oi."ticketBatchId" IS NOT NULL;

UPDATE "Ticket" t
SET "ticketBatchId" = (
    SELECT tb."id" FROM "TicketBatch" tb
    WHERE tb."ticketTypeId" = t."ticketTypeId"
    ORDER BY tb."orderIndex" ASC
    LIMIT 1
)
WHERE t."ticketBatchId" IS NULL AND t."ticketTypeId" IS NOT NULL;

CREATE INDEX "OrderItem_ticketBatchId_idx" ON "OrderItem"("ticketBatchId");
CREATE INDEX "Ticket_ticketBatchId_idx" ON "Ticket"("ticketBatchId");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_ticketBatchId_fkey" FOREIGN KEY ("ticketBatchId") REFERENCES "TicketBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_ticketBatchId_fkey" FOREIGN KEY ("ticketBatchId") REFERENCES "TicketBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
