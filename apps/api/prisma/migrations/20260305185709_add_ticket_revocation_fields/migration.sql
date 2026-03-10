-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "revokedAt" TIMESTAMP(3),
ADD COLUMN     "revokedByUserId" TEXT,
ADD COLUMN     "revokedNote" TEXT,
ADD COLUMN     "revokedReason" TEXT;
