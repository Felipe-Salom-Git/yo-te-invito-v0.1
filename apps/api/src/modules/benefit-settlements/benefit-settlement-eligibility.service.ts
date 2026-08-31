import { Injectable } from '@nestjs/common';
import type { BenefitCommercialAgreement, BenefitValidationSource, Prisma } from '@prisma/client';
import {
  benefitAgreementCalendarKeyFromInstant,
  benefitSettlementPeriodBounds,
  compareSettlementValidationOrder,
  isActivityValidationEligibleForSettlement,
  isGastroValidationEligibleForSettlement,
  resolveSettlementAgreementForValidation,
  type BenefitSettlementMissingAgreement,
  type BenefitVertical,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

export type PricedEligibleValidation = {
  validationSource: BenefitValidationSource;
  validationId: string;
  validatedAt: Date;
  agreementId: string;
  unitPriceCents: bigint;
  barterMultiplier: string;
  currency: string;
};

export type EligibleValidationDiscovery = {
  priced: PricedEligibleValidation[];
  missingAgreements: BenefitSettlementMissingAgreement[];
};

@Injectable()
export class BenefitSettlementEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async discoverEligibleValidations(
    tenantId: string,
    vertical: BenefitVertical,
    partner: { gastroProfileId?: string; excursionOperatorId?: string },
    periodKey: string,
    excludeValidationIds?: Set<string>,
  ): Promise<EligibleValidationDiscovery> {
    const { start, end } = benefitSettlementPeriodBounds(periodKey);
    const agreements = await this.loadPartnerAgreements(tenantId, vertical, partner);
    const agreementLikes = agreements.map((row) => this.toAgreementLike(row));

    if (vertical === 'GASTRO') {
      return this.discoverGastro(tenantId, partner.gastroProfileId!, start, end, agreementLikes, excludeValidationIds);
    }
    return this.discoverActivity(
      tenantId,
      partner.excursionOperatorId!,
      start,
      end,
      agreementLikes,
      excludeValidationIds,
    );
  }

  private async discoverGastro(
    tenantId: string,
    gastroProfileId: string,
    start: Date,
    end: Date,
    agreements: ReturnType<typeof this.toAgreementLike>[],
    excludeValidationIds?: Set<string>,
  ): Promise<EligibleValidationDiscovery> {
    const rows = await this.prisma.gastroDiscountValidation.findMany({
      where: {
        claimId: { not: null },
        validatedAt: { gte: start, lte: end },
        discount: {
          tenantId,
          gastroProfileId,
        },
      },
      orderBy: [{ validatedAt: 'asc' }, { id: 'asc' }],
    });

    const priced: PricedEligibleValidation[] = [];
    const missingAgreements: BenefitSettlementMissingAgreement[] = [];

    for (const row of rows) {
      if (!isGastroValidationEligibleForSettlement(row)) continue;
      if (excludeValidationIds?.has(row.id)) continue;

      const agreement = resolveSettlementAgreementForValidation(agreements, row.validatedAt);
      if (!agreement) {
        missingAgreements.push({
          validationSource: 'GASTRO_DISCOUNT_VALIDATION',
          validationId: row.id,
          validatedAt: row.validatedAt.toISOString(),
        });
        continue;
      }
      const source = agreements.find((a) => a.id === agreement.id)!;
      priced.push({
        validationSource: 'GASTRO_DISCOUNT_VALIDATION',
        validationId: row.id,
        validatedAt: row.validatedAt,
        agreementId: source.id,
        unitPriceCents: source.unitPriceCents,
        barterMultiplier: source.barterMultiplier,
        currency: source.currency,
      });
    }

    priced.sort(compareSettlementValidationOrder);
    return { priced, missingAgreements };
  }

  private async discoverActivity(
    tenantId: string,
    excursionOperatorId: string,
    start: Date,
    end: Date,
    agreements: ReturnType<typeof this.toAgreementLike>[],
    excludeValidationIds?: Set<string>,
  ): Promise<EligibleValidationDiscovery> {
    const rows = await this.prisma.activityCouponValidation.findMany({
      where: {
        result: 'VALID',
        claimId: { not: null },
        validatedAt: { gte: start, lte: end },
        coupon: {
          tenantId,
          excursionOperatorId,
        },
      },
      orderBy: [{ validatedAt: 'asc' }, { id: 'asc' }],
    });

    const priced: PricedEligibleValidation[] = [];
    const missingAgreements: BenefitSettlementMissingAgreement[] = [];

    for (const row of rows) {
      if (!isActivityValidationEligibleForSettlement(row)) continue;
      if (excludeValidationIds?.has(row.id)) continue;

      const agreement = resolveSettlementAgreementForValidation(agreements, row.validatedAt);
      if (!agreement) {
        missingAgreements.push({
          validationSource: 'ACTIVITY_COUPON_VALIDATION',
          validationId: row.id,
          validatedAt: row.validatedAt.toISOString(),
        });
        continue;
      }
      const source = agreements.find((a) => a.id === agreement.id)!;
      priced.push({
        validationSource: 'ACTIVITY_COUPON_VALIDATION',
        validationId: row.id,
        validatedAt: row.validatedAt,
        agreementId: source.id,
        unitPriceCents: source.unitPriceCents,
        barterMultiplier: source.barterMultiplier,
        currency: source.currency,
      });
    }

    priced.sort(compareSettlementValidationOrder);
    return { priced, missingAgreements };
  }

  private async loadPartnerAgreements(
    tenantId: string,
    vertical: BenefitVertical,
    partner: { gastroProfileId?: string; excursionOperatorId?: string },
  ): Promise<BenefitCommercialAgreement[]> {
    const where: Prisma.BenefitCommercialAgreementWhereInput = {
      tenantId,
      vertical,
      ...(vertical === 'GASTRO'
        ? { gastroProfileId: partner.gastroProfileId }
        : { excursionOperatorId: partner.excursionOperatorId }),
    };
    return this.prisma.benefitCommercialAgreement.findMany({ where });
  }

  private toAgreementLike(row: BenefitCommercialAgreement) {
    return {
      id: row.id,
      validFromKey: benefitAgreementCalendarKeyFromInstant(row.validFrom),
      validToKey: row.validTo ? benefitAgreementCalendarKeyFromInstant(row.validTo) : null,
      unitPriceCents: row.unitPriceCents,
      barterMultiplier: row.barterMultiplier.toString(),
      currency: row.currency,
    };
  }
}
