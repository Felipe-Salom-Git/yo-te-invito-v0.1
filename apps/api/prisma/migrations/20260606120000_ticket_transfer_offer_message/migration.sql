-- Ticket transfer offer: optional message + reject timestamp (Etapa 3)

ALTER TABLE "TicketTransferOffer" ADD COLUMN "message" TEXT;
ALTER TABLE "TicketTransferOffer" ADD COLUMN "rejectedAt" TIMESTAMP(3);
