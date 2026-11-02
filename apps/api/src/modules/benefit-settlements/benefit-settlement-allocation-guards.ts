import { BadRequestException } from '@nestjs/common';
import { ErrorCode } from '@yo-te-invito/shared';
import type { PrismaService } from '../../prisma/prisma.service';

type AllocationCountClient = Pick<PrismaService, 'benefitSettlementUsageAllocation'>;

/** Count economic allocations tied to a partner's settlements (blocks destructive deletes). */
export async function countPartnerSettlementAllocations(
  prisma: AllocationCountClient,
  tenantId: string,
  partner:
    | { vertical: 'GASTRO'; gastroProfileId: string }
    | { vertical: 'ACTIVITY'; excursionOperatorId: string },
): Promise<number> {
  return prisma.benefitSettlementUsageAllocation.count({
    where: {
      tenantId,
      settlement:
        partner.vertical === 'GASTRO'
          ? { vertical: 'GASTRO', gastroProfileId: partner.gastroProfileId }
          : { vertical: 'ACTIVITY', excursionOperatorId: partner.excursionOperatorId },
    },
  });
}

/**
 * G10.D2 — allocation isolation: when allocating from a discount detail, every selected validation
 * must belong to that GastroDiscount (of the settlement's tenant and local). Nothing is allocated otherwise.
 */
export async function assertValidationsBelongToDiscount(
  prisma: Pick<PrismaService, 'gastroDiscountValidation'>,
  input: {
    tenantId: string;
    settlement: { vertical: string; gastroProfileId: string | null };
    gastroDiscountId: string;
    validationIds: string[];
  },
): Promise<void> {
  const { tenantId, settlement, gastroDiscountId, validationIds } = input;
  const owned =
    settlement.vertical === 'GASTRO' && settlement.gastroProfileId
      ? await prisma.gastroDiscountValidation.findMany({
          where: {
            id: { in: validationIds },
            discountId: gastroDiscountId,
            discount: { tenantId, gastroProfileId: settlement.gastroProfileId },
          },
          select: { id: true },
        })
      : [];
  const ownedIds = new Set(owned.map((v) => v.id));
  const foreign = validationIds.filter((id) => !ownedIds.has(id));
  if (foreign.length > 0) {
    throw new BadRequestException({
      code: ErrorCode.BENEFIT_SETTLEMENT_VALIDATION_DISCOUNT_MISMATCH,
      message: `${foreign.length} selected validation(s) do not belong to this discount`,
      invalidValidationIds: foreign,
    });
  }
}
