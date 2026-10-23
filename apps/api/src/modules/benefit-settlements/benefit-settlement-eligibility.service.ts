import { BadRequestException, Injectable } from '@nestjs/common';
import type { BenefitCommercialAgreement, BenefitValidationSource, Prisma } from '@prisma/client';
import {
  ErrorCode,
  benefitAgreementCalendarKeyFromInstant,
  benefitSettlementPeriodBounds,
  compareSettlementValidationOrder,
  isActivityValidationEligibleForSettlement,
  isGastroCourtesyFundedByCredit,
  resolveGastroValidationSettlementEligibility,
  resolveSettlementAgreementForValidation,
  type BenefitSettlementMissingAgreement,
  type BenefitVertical,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

/** G8.11 — validation → discount → courtesyCampaign → DEBIT_COURTESY (existing relations only). */
export const GASTRO_SETTLEMENT_VALIDATION_SELECT = {
  id: true,
  claimId: true,
  validatedAt: true,
  discount: {
    select: {
      tenantId: true,
      gastroProfileId: true,
      visibility: true,
      courtesyCampaign: {
        select: {
          id: true,
          courtesyCreditDebit: { select: { id: true, type: true } },
        },
      },
    },
  },
} satisfies Prisma.GastroDiscountValidationSelect;

type GastroValidationReader = {
  gastroDiscountValidation: {
    findMany(args: {
      where: Prisma.GastroDiscountValidationWhereInput;
      select: typeof GASTRO_SETTLEMENT_VALIDATION_SELECT;
    }): Promise<
      Array<Prisma.GastroDiscountValidationGetPayload<{ select: typeof GASTRO_SETTLEMENT_VALIDATION_SELECT }>>
    >;
  };
};

export type FundedCourtesyExclusion = {
  validationId: string;
  validatedAt: Date;
  courtesyCampaignId: string;
};

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
  /** Not billable (D1): never priced, never allocatable, never counted as pending. */
  fundedCourtesyExcluded: FundedCourtesyExclusion[];
};

export function fundedCourtesyAllocationError(validationIds: string[]): BadRequestException {
  return new BadRequestException({
    code: ErrorCode.BENEFIT_SETTLEMENT_VALIDATION_FUNDED_COURTESY,
    message: `${validationIds.length} selected validation(s) belong to a courtesy funded with courtesy credit (not billable)`,
    fundedValidationIds: validationIds,
  });
}

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
      select: GASTRO_SETTLEMENT_VALIDATION_SELECT,
      orderBy: [{ validatedAt: 'asc' }, { id: 'asc' }],
    });

    const priced: PricedEligibleValidation[] = [];
    const missingAgreements: BenefitSettlementMissingAgreement[] = [];
    const fundedCourtesyExcluded: FundedCourtesyExclusion[] = [];

    for (const row of rows) {
      const eligibility = resolveGastroValidationSettlementEligibility(row, {
        tenantId,
        gastroProfileId,
        alreadyAllocated: excludeValidationIds?.has(row.id) ?? false,
      });
      if (!eligibility.eligible) {
        if (eligibility.reason === 'FUNDED_COURTESY') {
          fundedCourtesyExcluded.push({
            validationId: row.id,
            validatedAt: row.validatedAt,
            courtesyCampaignId: row.discount.courtesyCampaign!.id,
          });
        }
        continue;
      }

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
    return { priced, missingAgreements, fundedCourtesyExcluded };
  }

  /**
   * G8.11.3 — defense in depth: re-read the funding context (inside the allocation transaction)
   * and reject any credit-funded courtesy validation, whatever the selection path was.
   */
  async assertNoFundedCourtesyValidations(
    client: GastroValidationReader,
    validationIds: string[],
  ): Promise<void> {
    if (validationIds.length === 0) return;
    const rows = await client.gastroDiscountValidation.findMany({
      where: { id: { in: validationIds } },
      select: GASTRO_SETTLEMENT_VALIDATION_SELECT,
    });
    const funded = rows.filter((row) => isGastroCourtesyFundedByCredit(row.discount)).map((r) => r.id);
    if (funded.length > 0) {
      throw fundedCourtesyAllocationError(funded);
    }
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
    return { priced, missingAgreements, fundedCourtesyExcluded: [] };
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
