import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  moneyCentsToString,
  type BenefitSettlementPendingValidationsResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BenefitSettlementEligibilityService } from './benefit-settlement-eligibility.service';
import { loadBenefitValidationDetails } from './benefit-validation-details';

/** G7.12.2 — eligible validations of a settlement (tenant + partner + period) not yet allocated. */
@Injectable()
export class BenefitSettlementPendingValidationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: BenefitSettlementEligibilityService,
  ) {}

  async list(
    tenantId: string,
    settlementId: string,
  ): Promise<BenefitSettlementPendingValidationsResponse> {
    const row = await this.prisma.benefitSettlement.findFirst({
      where: { id: settlementId, tenantId },
      select: {
        id: true,
        vertical: true,
        gastroProfileId: true,
        excursionOperatorId: true,
        periodKey: true,
        allocations: { select: { validationId: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_SETTLEMENT_NOT_FOUND,
        message: 'Benefit settlement not found',
      });
    }

    const discovery = await this.eligibility.discoverEligibleValidations(
      tenantId,
      row.vertical,
      {
        gastroProfileId: row.gastroProfileId ?? undefined,
        excursionOperatorId: row.excursionOperatorId ?? undefined,
      },
      row.periodKey,
      new Set(row.allocations.map((a) => a.validationId)),
    );
    const details = await loadBenefitValidationDetails(this.prisma, discovery.priced);

    return {
      settlementId: row.id,
      missingAgreementCount: discovery.missingAgreements.length,
      data: discovery.priced.map((v) => {
        const detail = details.get(v.validationId);
        return {
          validationSource: v.validationSource,
          validationId: v.validationId,
          validatedAt: v.validatedAt.toISOString(),
          benefitId: detail?.benefitId ?? '',
          benefitTitle: detail?.benefitTitle ?? '—',
          shortCode: detail?.shortCode ?? null,
          agreementId: v.agreementId,
          unitPriceCents: moneyCentsToString(v.unitPriceCents),
          barterMultiplier: v.barterMultiplier,
          currency: v.currency,
        };
      }),
    };
  }
}
