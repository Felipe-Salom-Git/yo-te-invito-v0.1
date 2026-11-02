import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  assertDiscountTransferWouldNotOverpay,
  computeDiscountCashDueCents,
  computeDiscountCashPaidCents,
  moneyCentsToString,
  resolveBenefitTransferDiscountRequirement,
  type BenefitVertical,
} from '@yo-te-invito/shared';

type LockedSettlement = {
  vertical: BenefitVertical;
  gastroProfileId: string | null;
  allocations: ReadonlyArray<{ mode: string; baseAmountCents: bigint; validationId: string }>;
  transfers: ReadonlyArray<{ amountCents: bigint; reversedAt: Date | null; gastroDiscountId: string | null }>;
};

/** D-G10-7 — GASTRO requires a discount, ACTIVITY never accepts one. Runs before any amount check. */
export function assertTransferDiscountRequirement(
  vertical: BenefitVertical,
  gastroDiscountId: string | undefined,
): void {
  const requirement = resolveBenefitTransferDiscountRequirement(vertical, gastroDiscountId);
  if (requirement === 'DISCOUNT_REQUIRED') {
    throw new BadRequestException({
      code: ErrorCode.BENEFIT_TRANSFER_DISCOUNT_REQUIRED,
      message: 'GASTRO transfers must be attributed to a discount (gastroDiscountId)',
    });
  }
  if (requirement === 'DISCOUNT_NOT_ALLOWED') {
    throw new BadRequestException({
      code: ErrorCode.BENEFIT_TRANSFER_DISCOUNT_SCOPE_INVALID,
      message: 'Only GASTRO settlements accept gastroDiscountId',
    });
  }
}

/**
 * G10.D1 — runs INSIDE the register transaction (Serializable + settlement FOR UPDATE):
 * the discount must belong to the settlement's tenant and local, and the new amount must fit in
 * discountCashDue(S, D) − active attributed transfers(S, D). The settlement-level guard stays separate.
 */
export async function assertDiscountTransferAllowed(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    settlement: LockedSettlement;
    gastroDiscountId: string;
    amountCents: bigint;
  },
): Promise<void> {
  const { tenantId, settlement, gastroDiscountId, amountCents } = input;
  const discount = await tx.gastroDiscount.findFirst({
    where: { id: gastroDiscountId, tenantId },
    select: { id: true, gastroProfileId: true },
  });
  if (!discount || !settlement.gastroProfileId || discount.gastroProfileId !== settlement.gastroProfileId) {
    throw new BadRequestException({
      code: ErrorCode.BENEFIT_TRANSFER_DISCOUNT_SCOPE_INVALID,
      message: 'Discount does not belong to the settlement local',
    });
  }

  const cashValidationIds = settlement.allocations
    .filter((a) => a.mode === 'CASH')
    .map((a) => a.validationId);
  const owned =
    cashValidationIds.length === 0
      ? []
      : await tx.gastroDiscountValidation.findMany({
          where: { id: { in: cashValidationIds }, discountId: discount.id },
          select: { id: true },
        });

  const dueCents = computeDiscountCashDueCents(settlement.allocations, new Set(owned.map((v) => v.id)));
  const paidCents = computeDiscountCashPaidCents(settlement.transfers, discount.id);
  if (!assertDiscountTransferWouldNotOverpay(dueCents, paidCents, amountCents)) {
    throw new BadRequestException({
      code: ErrorCode.BENEFIT_SETTLEMENT_DISCOUNT_CASH_OVERPAYMENT,
      message: 'Transfer would exceed the CASH due of this discount in the settlement',
      gastroDiscountId: discount.id,
      discountCashDueCents: moneyCentsToString(dueCents),
      discountCashPaidCents: moneyCentsToString(paidCents),
      discountCashRemainingCents: moneyCentsToString(dueCents > paidCents ? dueCents - paidCents : 0n),
    });
  }
}

/** Serialization failure (SQLSTATE 40001), as surfaced by Prisma for interactive transactions. */
export function isSerializationConflict(err: unknown): boolean {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code === 'P2034') return true;
  const meta = (err.meta ?? {}) as { code?: string };
  return err.code === 'P2010' && meta.code === '40001';
}
