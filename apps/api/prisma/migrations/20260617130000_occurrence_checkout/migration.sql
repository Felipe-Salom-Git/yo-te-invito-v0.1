-- V3.1 Etapa 7 Slices 7.6+ — occurrence on checkout/tickets

ALTER TABLE "Order" ADD COLUMN "occurrenceId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN "occurrenceId" TEXT;
ALTER TABLE "Ticket" ADD COLUMN "occurrenceId" TEXT;
ALTER TABLE "UserCartItem" ADD COLUMN "occurrenceId" TEXT;

CREATE INDEX "Order_occurrenceId_idx" ON "Order"("occurrenceId");
CREATE INDEX "OrderItem_occurrenceId_idx" ON "OrderItem"("occurrenceId");
CREATE INDEX "Ticket_occurrenceId_idx" ON "Ticket"("occurrenceId");
CREATE INDEX "UserCartItem_occurrenceId_idx" ON "UserCartItem"("occurrenceId");

ALTER TABLE "Order" ADD CONSTRAINT "Order_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserCartItem" ADD CONSTRAINT "UserCartItem_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "EventOccurrence"("id") ON DELETE SET NULL ON UPDATE CASCADE;
