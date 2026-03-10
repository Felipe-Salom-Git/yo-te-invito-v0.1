-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'ORDER_EXPIRED';

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "expiredAt" TIMESTAMP(3);
