import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  getBenefitSettlementPeriodKey,
  gastroDiscountPendingValidationsResponseSchema,
  moneyCentsToString,
  resolveGastroDiscountSettlementBillability,
  type GastroDiscountPendingValidation,
  type GastroDiscountPendingValidationsResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { BenefitSettlementEligibilityService } from './benefit-settlement-eligibility.service';
import { ECONOMIC_SUMMARY_DISCOUNT_SELECT } from './gastro-discount-economic-summary.loader';

type PricingVerdict = Pick<
  GastroDiscountPendingValidation,
  'pricingStatus' | 'agreementId' | 'unitPriceCents' | 'barterMultiplier' | 'currency'
>;

/**
 * G10.D2 — claimed validations of ONE discount that are not allocated yet (ADMIN).
 * EN: pricing per period comes from `discoverEligibleValidations`, the same engine `allocate` uses,
 *     so the list can never offer something allocate would price differently.
 * ES: el pricing por período sale del mismo motor que usa `allocate`.
 */
@Injectable()
export class GastroDiscountPendingValidationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: BenefitSettlementEligibilityService,
  ) {}

  async listForAdmin(
    tenantId: string,
    profileId: string,
    discountId: string,
  ): Promise<GastroDiscountPendingValidationsResponse> {
    const discount = profileId?.trim()
      ? await this.prisma.gastroDiscount.findFirst({
          where: { id: discountId, tenantId, gastroProfileId: profileId.trim() },
          select: ECONOMIC_SUMMARY_DISCOUNT_SELECT,
        })
      : null;
    if (!discount || !discount.gastroProfileId) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Discount not found' });
    }
    const gastroProfileId = discount.gastroProfileId;

    const validations = await this.prisma.gastroDiscountValidation.findMany({
      where: { discountId: discount.id, claimId: { not: null } },
      select: { id: true, validatedAt: true, claim: { select: { shortCode: true, email: true } } },
      orderBy: [{ validatedAt: 'asc' }, { id: 'asc' }],
    });
    const allocated = await this.prisma.benefitSettlementUsageAllocation.findMany({
      where: {
        tenantId,
        validationSource: 'GASTRO_DISCOUNT_VALIDATION',
        validationId: { in: validations.map((v) => v.id) },
      },
      select: { validationId: true },
    });
    const allocatedIds = new Set(allocated.map((a) => a.validationId));
    const pending = validations.filter((v) => !allocatedIds.has(v.id));

    const periodOf = new Map(pending.map((v) => [v.id, getBenefitSettlementPeriodKey(v.validatedAt)] as const));
    const periods = [...new Set(periodOf.values())];
    const [settlements, verdicts] = await Promise.all([
      this.prisma.benefitSettlement.findMany({
        where: { tenantId, vertical: 'GASTRO', gastroProfileId, periodKey: { in: periods } },
        select: { id: true, periodKey: true, status: true },
      }),
      this.priceByPeriod(tenantId, gastroProfileId, periods, allocatedIds),
    ]);
    const settlementByPeriod = new Map(settlements.map((s) => [s.periodKey, s] as const));

    const data: GastroDiscountPendingValidation[] = pending.flatMap((v) => {
      const verdict = verdicts.get(v.id);
      if (!verdict) return [];
      const periodKey = periodOf.get(v.id)!;
      const settlement = settlementByPeriod.get(periodKey) ?? null;
      const blockedReason =
        verdict.pricingStatus !== 'PRICED'
          ? verdict.pricingStatus
          : settlement?.status === 'CLOSED'
            ? ('SETTLEMENT_CLOSED' as const)
            : null;
      return [
        {
          validationId: v.id,
          validatedAt: v.validatedAt.toISOString(),
          periodKey,
          ...verdict,
          claimShortCode: v.claim?.shortCode ?? null,
          claimEmail: v.claim?.email ?? null,
          settlementId: settlement?.id ?? null,
          settlementStatus: settlement?.status ?? null,
          allocatable: blockedReason == null,
          blockedReason,
        },
      ];
    });

    return gastroDiscountPendingValidationsResponseSchema.parse({
      discountId: discount.id,
      gastroProfileId,
      billable: resolveGastroDiscountSettlementBillability(discount) === 'BILLABLE',
      data,
    });
  }

  private async priceByPeriod(
    tenantId: string,
    gastroProfileId: string,
    periods: string[],
    allocatedIds: Set<string>,
  ): Promise<Map<string, PricingVerdict>> {
    const verdicts = new Map<string, PricingVerdict>();
    const empty = { agreementId: null, unitPriceCents: null, barterMultiplier: null, currency: null };
    for (const periodKey of periods) {
      const discovery = await this.eligibility.discoverEligibleValidations(
        tenantId,
        'GASTRO',
        { gastroProfileId },
        periodKey,
        allocatedIds,
      );
      for (const p of discovery.priced) {
        verdicts.set(p.validationId, {
          pricingStatus: 'PRICED',
          agreementId: p.agreementId,
          unitPriceCents: moneyCentsToString(p.unitPriceCents),
          barterMultiplier: p.barterMultiplier,
          currency: p.currency,
        });
      }
      for (const m of discovery.missingAgreements) {
        verdicts.set(m.validationId, { pricingStatus: 'MISSING_AGREEMENT', ...empty });
      }
      for (const f of discovery.fundedCourtesyExcluded) {
        verdicts.set(f.validationId, { pricingStatus: 'FUNDED_COURTESY', ...empty });
      }
    }
    return verdicts;
  }
}
