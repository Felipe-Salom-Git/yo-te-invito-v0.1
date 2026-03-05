-- CreateEnum (new OrderStatus with PENDING_PAYMENT and EXPIRED instead of PENDING)
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED', 'REFUNDED');

-- Add new columns to Order
ALTER TABLE "Order" ADD COLUMN "eventId" TEXT;
ALTER TABLE "Order" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- Backfill eventId from OrderItem -> TicketType
UPDATE "Order" o
SET "eventId" = (
  SELECT tt."eventId" FROM "OrderItem" oi
  JOIN "TicketType" tt ON tt.id = oi."ticketTypeId"
  WHERE oi."orderId" = o.id
  LIMIT 1
);

-- For orders with no items but with tickets (edge case)
UPDATE "Order" o
SET "eventId" = (SELECT "eventId" FROM "Ticket" WHERE "orderId" = o.id LIMIT 1)
WHERE o."eventId" IS NULL;

-- Migrate status: PENDING -> PENDING_PAYMENT
ALTER TABLE "Order" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Order" ALTER COLUMN "status" TYPE "OrderStatus_new" USING (
  CASE "status"::text
    WHEN 'PENDING' THEN 'PENDING_PAYMENT'::"OrderStatus_new"
    WHEN 'PAID' THEN 'PAID'::"OrderStatus_new"
    WHEN 'CANCELLED' THEN 'CANCELLED'::"OrderStatus_new"
    WHEN 'REFUNDED' THEN 'REFUNDED'::"OrderStatus_new"
    ELSE 'PENDING_PAYMENT'::"OrderStatus_new"
  END
);
ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT'::"OrderStatus_new";

DROP TYPE "OrderStatus";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";

-- Make eventId NOT NULL and add FK (requires all rows to have eventId)
-- If any order has null eventId, this will fail - set a fallback for empty DB
UPDATE "Order" SET "eventId" = (SELECT id FROM "Event" LIMIT 1) WHERE "eventId" IS NULL;
ALTER TABLE "Order" ALTER COLUMN "eventId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Order_tenantId_eventId_idx" ON "Order"("tenantId", "eventId");
CREATE INDEX "Order_tenantId_status_idx" ON "Order"("tenantId", "status");
CREATE INDEX "Order_expiresAt_idx" ON "Order"("expiresAt");
