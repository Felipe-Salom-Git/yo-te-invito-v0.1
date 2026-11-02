import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  type BenefitCommercialAgreementDiscountHistoryResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AGREEMENT_DISPLAY_INCLUDE, agreementScopeWhere } from './benefit-agreement-scope.util';
import {
  agreementRowToDto,
  pickApplicableAgreement,
  todayAgreementKey,
} from './benefit-agreement-dto.util';

/**
 * G10.A3 — contract history of ONE discount.
 * `current`/`history` = discount-scoped agreements only. `legacyUsed` = legacy profile agreements
 * that priced allocations of this discount before G10 (read-only, EXACT via validation → discount).
 */
@Injectable()
export class BenefitDiscountAgreementHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async discountHistory(
    tenantId: string,
    gastroDiscountId: string,
  ): Promise<BenefitCommercialAgreementDiscountHistoryResponse> {
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: gastroDiscountId, tenantId },
      select: { id: true, gastroProfileId: true, displayTitle: true },
    });
    if (!discount) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const rows = discount.gastroProfileId
      ? await this.prisma.benefitCommercialAgreement.findMany({
          where: agreementScopeWhere(tenantId, {
            scope: 'DISCOUNT',
            gastroProfileId: discount.gastroProfileId,
            gastroDiscountId: discount.id,
          }),
          include: AGREEMENT_DISPLAY_INCLUDE,
          orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        })
      : [];

    const todayKey = todayAgreementKey();
    return {
      gastroDiscountId: discount.id,
      gastroProfileId: discount.gastroProfileId,
      discountTitle: discount.displayTitle,
      current: pickApplicableAgreement(rows, todayKey, new Date()),
      history: rows.map((row) => agreementRowToDto(row, todayKey)),
      legacyUsed: await this.loadLegacyUsage(tenantId, discount.id, todayKey),
    };
  }

  private async loadLegacyUsage(tenantId: string, discountId: string, todayKey: string) {
    const validations = await this.prisma.gastroDiscountValidation.findMany({
      where: { discountId, discount: { tenantId } },
      select: { id: true },
    });
    if (validations.length === 0) return [];
    const allocations = await this.prisma.benefitSettlementUsageAllocation.findMany({
      where: {
        tenantId,
        validationSource: 'GASTRO_DISCOUNT_VALIDATION',
        validationId: { in: validations.map((v) => v.id) },
        agreement: { vertical: 'GASTRO', gastroDiscountId: null },
      },
      select: { agreement: { include: AGREEMENT_DISPLAY_INCLUDE } },
    });
    const byAgreement = new Map<string, { row: (typeof allocations)[number]['agreement']; count: number }>();
    for (const { agreement } of allocations) {
      const entry = byAgreement.get(agreement.id) ?? { row: agreement, count: 0 };
      entry.count += 1;
      byAgreement.set(agreement.id, entry);
    }
    return [...byAgreement.values()]
      .sort((a, b) => b.row.validFrom.getTime() - a.row.validFrom.getTime())
      .map(({ row, count }) => ({ agreement: agreementRowToDto(row, todayKey), usageCount: count }));
  }
}
