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
