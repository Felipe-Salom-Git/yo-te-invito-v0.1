import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCode,
  computeCashDueCents,
  computeCashOutstandingCents,
  computeCashReceivedCents,
  moneyCentsToString,
  sumMoneyCentsBigInt,
  type GastroDiscountEconomicAllocationRow,
  type GastroDiscountEconomicMetricsResponse,
  type GastroDiscountEconomicTraceabilityResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { CourtesyCreditLedgerService } from '../courtesy-credit-ledger/courtesy-credit-ledger.service';

/**
 * G6 — Per-discount economic reporting.
 * Trace: GastroDiscount → GastroDiscountValidation → BenefitSettlementUsageAllocation
 * via validationSource=GASTRO_DISCOUNT_VALIDATION + validationId.
 */
@Injectable()
export class GastroDiscountEconomicReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly courtesyLedger: CourtesyCreditLedgerService,
  ) {}

  async getTraceability(
    tenantId: string,
    gastroProfileId: string,
    discountId: string,
  ): Promise<GastroDiscountEconomicTraceabilityResponse> {
    await this.assertDiscountScope(tenantId, gastroProfileId, discountId);
    const { validations, allocations } = await this.loadTrace(
      tenantId,
      gastroProfileId,
      discountId,
    );
    const allocatedIds = new Set(allocations.map((a) => a.validationId));
    return {
      discountId,
      gastroProfileId,
      validationCount: validations.length,
      allocatedValidationCount: validations.filter((v) => allocatedIds.has(v.id)).length,
      validationIds: validations.map((v) => v.id),
      allocations,
    };
  }

  async getEconomicMetrics(
    tenantId: string,
    gastroProfileId: string,
    discountId: string,
  ): Promise<GastroDiscountEconomicMetricsResponse> {
    await this.assertDiscountScope(tenantId, gastroProfileId, discountId);
    const { validations, allocations } = await this.loadTrace(
      tenantId,
      gastroProfileId,
      discountId,
    );

    const cashRows = allocations.filter((a) => a.mode === 'CASH');
    const barterRows = allocations.filter((a) => a.mode === 'BARTER');
    const cashBase = sumMoneyCentsBigInt(
      cashRows.map((a) => BigInt(a.baseAmountCents)),
    );
    const barterBase = sumMoneyCentsBigInt(
      barterRows.map((a) => BigInt(a.baseAmountCents)),
    );

    const barterAllocationIds = barterRows.map((a) => a.id);
    const creditGenerated =
      barterAllocationIds.length > 0
        ? await this.courtesyLedger.sumMaterializedCreditForAllocations(barterAllocationIds)
        : 0n;

    const creditByAllocation = new Map<string, bigint>();
    if (barterAllocationIds.length > 0) {
      const credits = await this.prisma.courtesyCreditLedgerEntry.findMany({
        where: {
          tenantId,
          type: 'CREDIT_FROM_SETTLEMENT',
          sourceAllocationId: { in: barterAllocationIds },
        },
        select: { sourceAllocationId: true, amountCents: true },
      });
      for (const c of credits) {
        if (!c.sourceAllocationId) continue;
        creditByAllocation.set(
          c.sourceAllocationId,
          (creditByAllocation.get(c.sourceAllocationId) ?? 0n) + c.amountCents,
        );
      }
    }

    const allocationsWithCredit: GastroDiscountEconomicAllocationRow[] = allocations.map(
      (a) => ({
        ...a,
        creditGeneratedCents:
          a.mode === 'BARTER'
            ? moneyCentsToString(creditByAllocation.get(a.id) ?? 0n)
            : null,
      }),
    );

    const segmentMap = new Map<
      string,
      {
        agreementId: string;
        unitPriceCents: string;
        barterMultiplier: string;
        currency: string;
        usageCount: number;
        baseAmountCents: bigint;
        modes: Set<'CASH' | 'BARTER'>;
      }
    >();
    for (const a of allocations) {
      const key = `${a.agreementId}:${a.unitPriceCents}:${a.barterMultiplier}:${a.currency}`;
      let seg = segmentMap.get(key);
      if (!seg) {
        seg = {
          agreementId: a.agreementId,
          unitPriceCents: a.unitPriceCents,
          barterMultiplier: a.barterMultiplier,
          currency: a.currency,
          usageCount: 0,
          baseAmountCents: 0n,
          modes: new Set(),
        };
        segmentMap.set(key, seg);
      }
      seg.usageCount += 1;
      seg.baseAmountCents += BigInt(a.baseAmountCents);
      seg.modes.add(a.mode);
    }

    const settlementIds = [...new Set(allocations.map((a) => a.settlementId))];
    const settlements = await this.buildSettlementContexts(
      tenantId,
      settlementIds,
      allocations,
    );

    const partnerBalance = await this.courtesyLedger.getPartnerBalance(tenantId, {
      vertical: 'GASTRO',
      gastroProfileId,
    });

    const currency =
      allocations[0]?.currency ?? partnerBalance.currency ?? 'ARS';

    return {
      discountId,
      gastroProfileId,
      currency,
      validatedUsageCount: validations.length,
      allocatedUsageCount: allocations.length,
      cash: {
        usageCount: cashRows.length,
        baseAmountCents: cashBase,
      },
      barter: {
        usageCount: barterRows.length,
        baseAmountCents: barterBase,
        creditGeneratedCents: moneyCentsToString(creditGenerated),
      },
      snapshotSegments: [...segmentMap.values()].map((s) => ({
        agreementId: s.agreementId,
        unitPriceCents: s.unitPriceCents,
        barterMultiplier: s.barterMultiplier,
        currency: s.currency,
        usageCount: s.usageCount,
        baseAmountCents: moneyCentsToString(s.baseAmountCents),
        modes: [...s.modes],
      })),
      settlements,
      partner: {
        gastroProfileId,
        currency: partnerBalance.currency,
        balanceAvailableCents: partnerBalance.balanceAvailableCents,
        creditGeneratedCents: partnerBalance.creditGeneratedCents,
        creditConsumedCents: partnerBalance.creditConsumedCents,
      },
      allocations: allocationsWithCredit,
    };
  }

  private async assertDiscountScope(
    tenantId: string,
    gastroProfileId: string,
    discountId: string,
  ): Promise<void> {
    const profileId = gastroProfileId?.trim();
    if (!profileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId, gastroProfileId: profileId },
      select: { id: true },
    });
    if (!row) {
      const foreign = await this.prisma.gastroDiscount.findFirst({
        where: { id: discountId, tenantId },
        select: { id: true },
      });
      if (foreign) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Discount does not belong to this location',
        });
      }
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
  }

  private async loadTrace(
    tenantId: string,
    gastroProfileId: string,
    discountId: string,
  ): Promise<{
    validations: Array<{
      id: string;
      claimId: string | null;
      validatedAt: Date;
    }>;
    allocations: GastroDiscountEconomicAllocationRow[];
  }> {
    const validations = await this.prisma.gastroDiscountValidation.findMany({
      where: {
        claimId: { not: null },
        discount: { id: discountId, tenantId, gastroProfileId },
      },
      select: { id: true, claimId: true, validatedAt: true },
      orderBy: [{ validatedAt: 'asc' }, { id: 'asc' }],
    });

    if (validations.length === 0) {
      return { validations, allocations: [] };
    }

    const validationIds = validations.map((v) => v.id);
    const validationById = new Map(validations.map((v) => [v.id, v]));

    const rows = await this.prisma.benefitSettlementUsageAllocation.findMany({
      where: {
        tenantId,
        validationSource: 'GASTRO_DISCOUNT_VALIDATION',
        validationId: { in: validationIds },
      },
      orderBy: [{ allocatedAt: 'asc' }, { id: 'asc' }],
    });

    const allocations: GastroDiscountEconomicAllocationRow[] = rows.map((a) => {
      const v = validationById.get(a.validationId);
      return {
        id: a.id,
        settlementId: a.settlementId,
        validationSource: a.validationSource as 'GASTRO_DISCOUNT_VALIDATION',
        validationId: a.validationId,
        mode: a.mode as 'CASH' | 'BARTER',
        agreementId: a.agreementId,
        unitPriceCents: moneyCentsToString(a.unitPriceCents),
        barterMultiplier: a.barterMultiplier.toString(),
        baseAmountCents: moneyCentsToString(a.baseAmountCents),
        currency: a.currency,
        allocatedAt: a.allocatedAt.toISOString(),
        allocatedByUserId: a.allocatedByUserId,
        claimId: v?.claimId ?? null,
        validatedAt: v?.validatedAt.toISOString() ?? null,
      };
    });

    return { validations, allocations };
  }

  private async buildSettlementContexts(
    tenantId: string,
    settlementIds: string[],
    discountAllocations: GastroDiscountEconomicAllocationRow[],
  ) {
    if (settlementIds.length === 0) return [];

    const settlements = await this.prisma.benefitSettlement.findMany({
      where: { tenantId, id: { in: settlementIds } },
      include: {
        allocations: true,
        transfers: true,
      },
    });

    return settlements.map((s) => {
      const discountRows = discountAllocations.filter((a) => a.settlementId === s.id);
      const discountCashBase = sumMoneyCentsBigInt(
        discountRows.filter((a) => a.mode === 'CASH').map((a) => BigInt(a.baseAmountCents)),
      );
      const discountBarterBase = sumMoneyCentsBigInt(
        discountRows.filter((a) => a.mode === 'BARTER').map((a) => BigInt(a.baseAmountCents)),
      );
      const cashDue = computeCashDueCents(s.allocations);
      const cashReceived = computeCashReceivedCents(s.transfers);
      const otherDiscountValidations = s.allocations.filter(
        (a) =>
          a.validationSource === 'GASTRO_DISCOUNT_VALIDATION' &&
          !discountRows.some((d) => d.id === a.id),
      );

      return {
        settlementId: s.id,
        periodKey: s.periodKey,
        status: s.status,
        discountAllocationCount: discountRows.length,
        discountCashBaseCents: discountCashBase,
        discountBarterBaseCents: discountBarterBase,
        settlementCashDueCents: moneyCentsToString(cashDue),
        settlementCashReceivedCents: moneyCentsToString(cashReceived),
        settlementCashOutstandingCents: moneyCentsToString(
          computeCashOutstandingCents(cashDue, cashReceived),
        ),
        settlementTotalAllocationCount: s.allocations.length,
        containsOtherDiscounts: otherDiscountValidations.length > 0,
      };
    });
  }
}
