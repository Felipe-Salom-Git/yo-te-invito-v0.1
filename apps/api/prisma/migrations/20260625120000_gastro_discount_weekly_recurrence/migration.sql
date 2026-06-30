-- CreateEnum
CREATE TYPE "GastroDiscountValidityMode" AS ENUM ('DATE_RANGE', 'WEEKLY_RECURRING');

-- CreateEnum
CREATE TYPE "GastroWeekday" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- AlterTable
ALTER TABLE "GastroDiscount" ADD COLUMN "validityMode" "GastroDiscountValidityMode" NOT NULL DEFAULT 'DATE_RANGE',
ADD COLUMN "validWeekday" "GastroWeekday";
