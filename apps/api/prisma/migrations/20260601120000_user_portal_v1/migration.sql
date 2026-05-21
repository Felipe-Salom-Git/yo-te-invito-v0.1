-- CreateEnum
CREATE TYPE "TicketTransferOfferStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "FavoriteEntityType" AS ENUM ('event', 'gastro', 'rental', 'excursion', 'hotel', 'discount');

-- CreateEnum
CREATE TYPE "FavoriteProviderType" AS ENUM ('producer', 'gastro', 'hotel', 'excursion_operator', 'rental_location', 'platform');

-- AlterEnum
ALTER TYPE "TicketStatus" ADD VALUE 'TRANSFER_PENDING';
ALTER TYPE "TicketStatus" ADD VALUE 'TRANSFERRED';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN "transferredFromTicketId" TEXT,
ADD COLUMN "activeTransferOfferId" TEXT;

-- AlterTable
ALTER TABLE "TicketTransfer" ADD COLUMN "offerId" TEXT,
ADD COLUMN "destinationTicketId" TEXT;

-- CreateTable
CREATE TABLE "TicketTransferOffer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceTicketId" TEXT NOT NULL,
    "destinationTicketId" TEXT,
    "sellerUserId" TEXT NOT NULL,
    "buyerUserId" TEXT,
    "status" "TicketTransferOfferStatus" NOT NULL DEFAULT 'AVAILABLE',
    "acceptToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "reservedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTransferOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCart" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserCartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserCartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserFavorite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" "FavoriteEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "providerType" "FavoriteProviderType" NOT NULL,
    "providerId" TEXT NOT NULL,
    "webNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserExpectedEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "webNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserExpectedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_activeTransferOfferId_key" ON "Ticket"("activeTransferOfferId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketTransferOffer_destinationTicketId_key" ON "TicketTransferOffer"("destinationTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketTransferOffer_acceptToken_key" ON "TicketTransferOffer"("acceptToken");

-- CreateIndex
CREATE INDEX "TicketTransferOffer_tenantId_sellerUserId_status_idx" ON "TicketTransferOffer"("tenantId", "sellerUserId", "status");

-- CreateIndex
CREATE INDEX "TicketTransferOffer_tenantId_buyerUserId_status_idx" ON "TicketTransferOffer"("tenantId", "buyerUserId", "status");

-- CreateIndex
CREATE INDEX "TicketTransferOffer_sourceTicketId_status_idx" ON "TicketTransferOffer"("sourceTicketId", "status");

-- CreateIndex
CREATE INDEX "TicketTransferOffer_expiresAt_idx" ON "TicketTransferOffer"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserCart_userId_key" ON "UserCart"("userId");

-- CreateIndex
CREATE INDEX "UserCart_tenantId_idx" ON "UserCart"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCart_tenantId_userId_key" ON "UserCart"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserCartItem_cartId_idx" ON "UserCartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCartItem_cartId_ticketTypeId_key" ON "UserCartItem"("cartId", "ticketTypeId");

-- CreateIndex
CREATE INDEX "UserFavorite_tenantId_userId_idx" ON "UserFavorite"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "UserFavorite_tenantId_userId_entityType_idx" ON "UserFavorite"("tenantId", "userId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavorite_tenantId_userId_entityType_entityId_key" ON "UserFavorite"("tenantId", "userId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "UserExpectedEvent_tenantId_userId_idx" ON "UserExpectedEvent"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserExpectedEvent_tenantId_userId_eventId_key" ON "UserExpectedEvent"("tenantId", "userId", "eventId");

-- CreateIndex
CREATE INDEX "TicketTransfer_offerId_idx" ON "TicketTransfer"("offerId");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_transferredFromTicketId_fkey" FOREIGN KEY ("transferredFromTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_activeTransferOfferId_fkey" FOREIGN KEY ("activeTransferOfferId") REFERENCES "TicketTransferOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransfer" ADD CONSTRAINT "TicketTransfer_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "TicketTransferOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferOffer" ADD CONSTRAINT "TicketTransferOffer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferOffer" ADD CONSTRAINT "TicketTransferOffer_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferOffer" ADD CONSTRAINT "TicketTransferOffer_destinationTicketId_fkey" FOREIGN KEY ("destinationTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferOffer" ADD CONSTRAINT "TicketTransferOffer_sellerUserId_fkey" FOREIGN KEY ("sellerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketTransferOffer" ADD CONSTRAINT "TicketTransferOffer_buyerUserId_fkey" FOREIGN KEY ("buyerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCart" ADD CONSTRAINT "UserCart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCart" ADD CONSTRAINT "UserCart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCartItem" ADD CONSTRAINT "UserCartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "UserCart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCartItem" ADD CONSTRAINT "UserCartItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserCartItem" ADD CONSTRAINT "UserCartItem_ticketTypeId_fkey" FOREIGN KEY ("ticketTypeId") REFERENCES "TicketType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavorite" ADD CONSTRAINT "UserFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExpectedEvent" ADD CONSTRAINT "UserExpectedEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExpectedEvent" ADD CONSTRAINT "UserExpectedEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserExpectedEvent" ADD CONSTRAINT "UserExpectedEvent_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
