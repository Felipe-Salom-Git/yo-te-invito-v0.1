import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@yo-te-invito/shared';
import type {
  BenefitIntegrityIssue,
  BenefitIntegrityStatus,
} from '@yo-te-invito/shared';
import {
  checkAgreementScopeMismatch,
  checkAllocationAgreementDiscountMismatch,
  checkBarterExpectedVsMaterialized,
  checkCashOverpayment,
  checkClosedWithPendingUsages,
  checkCurrencyMismatch,
  checkDiscountCashOverpayment,
  checkFundedCourtesyAllocation,
  checkTransferDiscountScopeMismatch,
  computeDiscountCashDueCents,
  computeDiscountCashPaidCents,
  checkNegativeCourtesyBalance,
  checkOrphanAllocation,
  checkPartnerMismatchAllocation,
  isGastroCourtesyFundedByCredit,
  runBarterCreditDriftCheck,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

type SettlementIntegrityRow = {
  id: string;
  status: string;
  periodKey: string;
  vertical: 'GASTRO' | 'ACTIVITY';
  gastroProfileId: string | null;
  excursionOperatorId: string | null;
  partnerDisplayName: string | null;
  summary: {
    pendingUsageCount: number;
    barterCreditExpectedCents?: string;
    barterCreditMaterializedCents?: string;
  };
  allocations: Array<{
    id: string;
    validationSource: string;
    validationId: string;
    agreementId: string;
    mode: string;
    baseAmountCents: bigint;
    barterMultiplier: { toString(): string };
    currency: string;
    settlementId: string;
  }>;
  transfers: Array<{
    id: string;
    gastroDiscountId: string | null;
    amountCents: bigint;
    reversedAt: Date | null;
    currency: string;
  }>;
};

@Injectable()
export class BenefitSettlementIntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  async evaluateSettlement(
    tenantId: string,
    settlementId: string,
    summary?: SettlementIntegrityRow['summary'],
  ): Promise<{ status: BenefitIntegrityStatus; issues: BenefitIntegrityIssue[] }> {
    const row = await this.prisma.benefitSettlement.findFirst({
      where: { id: settlementId, tenantId },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
        allocations: true,
        transfers: true,
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_SETTLEMENT_NOT_FOUND,
        message: 'Settlement not found',
      });
    }

    const issues = await this.collectIssues(tenantId, {
      id: row.id,
      status: row.status,
      periodKey: row.periodKey,
      vertical: row.vertical,
      gastroProfileId: row.gastroProfileId,
      excursionOperatorId: row.excursionOperatorId,
      partnerDisplayName:
        row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
      summary: summary ?? {
        pendingUsageCount: 0,
      },
      allocations: row.allocations,
      transfers: row.transfers,
    });

    return {
      status: this.deriveStatus(issues),
      issues,
    };
  }

  async collectIssues(
    tenantId: string,
    row: SettlementIntegrityRow,
  ): Promise<BenefitIntegrityIssue[]> {
    const issues: BenefitIntegrityIssue[] = [];

    const currencyMismatch = checkCurrencyMismatch(
      [
        ...row.allocations.map((a) => a.currency),
        ...row.transfers.map((t) => t.currency),
      ],
      'BenefitSettlement',
      row.id,
    );
    if (currencyMismatch) issues.push(currencyMismatch);

    const overpay = checkCashOverpayment(row.allocations, row.transfers, row.id);
    if (overpay) issues.push(overpay);

    const closedPending = checkClosedWithPendingUsages(
      row.status,
      row.summary.pendingUsageCount,
      row.id,
    );
    if (closedPending) issues.push(closedPending);

    const barterDrift = checkBarterExpectedVsMaterialized(
      row.summary.barterCreditExpectedCents,
      row.summary.barterCreditMaterializedCents,
      row.id,
    );
    if (barterDrift) issues.push(barterDrift);

    issues.push(...(await this.checkAllocationLogicalIntegrity(tenantId, row)));
    issues.push(...(await this.checkDiscountTransfers(tenantId, row)));

    const barterAllocationIds = row.allocations
      .filter((a) => a.mode === 'BARTER')
      .map((a) => a.id);
    if (barterAllocationIds.length > 0) {
      const creditEntries = await this.prisma.courtesyCreditLedgerEntry.findMany({
        where: {
          tenantId,
          type: 'CREDIT_FROM_SETTLEMENT',
          sourceAllocationId: { in: barterAllocationIds },
        },
        select: {
          id: true,
          type: true,
          amountCents: true,
          sourceAllocationId: true,
        },
      });
      issues.push(
        ...runBarterCreditDriftCheck({
          barterAllocations: row.allocations.map((a) => ({
            id: a.id,
            baseAmountCents: a.baseAmountCents,
            barterMultiplier: a.barterMultiplier.toString(),
            mode: a.mode,
          })),
          creditEntries,
        }),
      );
    }

    const partnerScope = this.partnerScope(row);
    if (partnerScope) {
      const ledgerEntries = await this.prisma.courtesyCreditLedgerEntry.findMany({
        where: {
          tenantId,
          vertical: row.vertical,
          gastroProfileId: partnerScope.gastroProfileId,
          excursionOperatorId: partnerScope.excursionOperatorId,
        },
        select: { amountCents: true },
      });
      const negative = checkNegativeCourtesyBalance(
        ledgerEntries,
        row.partnerDisplayName ?? 'partner',
      );
      if (negative) issues.push(negative);
    }

    return issues;
  }

  /** G10 — tenant-wide coherence of discount-scoped agreements (AGREEMENT_SCOPE_MISMATCH). */
  async evaluateAgreementScopes(tenantId: string): Promise<BenefitIntegrityIssue[]> {
    const rows = await this.prisma.benefitCommercialAgreement.findMany({
      where: { tenantId, vertical: 'GASTRO', gastroDiscountId: { not: null } },
      select: {
        id: true,
        gastroProfileId: true,
        gastroDiscountId: true,
        gastroDiscount: { select: { id: true, tenantId: true, gastroProfileId: true } },
      },
    });
    const issues: BenefitIntegrityIssue[] = [];
    for (const row of rows) {
      const discount = row.gastroDiscount?.tenantId === tenantId ? row.gastroDiscount : null;
      const issue = checkAgreementScopeMismatch({
        agreementId: row.id,
        agreementGastroProfileId: row.gastroProfileId,
        gastroDiscountId: row.gastroDiscountId,
        discountExists: discount != null,
        discountGastroProfileId: discount?.gastroProfileId ?? null,
      });
      if (issue) issues.push(issue);
    }
    return issues;
  }

  deriveStatus(issues: BenefitIntegrityIssue[]): BenefitIntegrityStatus {
    if (issues.some((i) => i.severity === 'ERROR')) return 'ERROR';
    if (issues.some((i) => i.severity === 'WARNING')) return 'WARNING';
    return 'OK';
  }

  private partnerScope(row: SettlementIntegrityRow) {
    if (row.vertical === 'GASTRO' && row.gastroProfileId) {
      return { gastroProfileId: row.gastroProfileId, excursionOperatorId: null };
    }
    if (row.vertical === 'ACTIVITY' && row.excursionOperatorId) {
      return { gastroProfileId: null, excursionOperatorId: row.excursionOperatorId };
    }
    return null;
  }

  /**
   * G10.D5 — attributed transfers: discount of the settlement's local (TRANSFER_DISCOUNT_SCOPE_MISMATCH)
   * and active attributed transfers(S, D) ≤ discountCashDue(S, D) (DISCOUNT_CASH_OVERPAYMENT).
   * Legacy transfers without discount are never inspected per discount (SETTLEMENT_LEVEL).
   */
  private async checkDiscountTransfers(
    tenantId: string,
    row: SettlementIntegrityRow,
  ): Promise<BenefitIntegrityIssue[]> {
    const attributed = row.transfers.filter((t) => t.gastroDiscountId != null);
    if (attributed.length === 0) return [];
    const discountIds = [...new Set(attributed.map((t) => t.gastroDiscountId!))];
    const cashValidationIds = row.allocations.filter((a) => a.mode === 'CASH').map((a) => a.validationId);
    const [discounts, validations] = await Promise.all([
      this.prisma.gastroDiscount.findMany({
        where: { id: { in: discountIds } },
        select: { id: true, tenantId: true, gastroProfileId: true },
      }),
      cashValidationIds.length
        ? this.prisma.gastroDiscountValidation.findMany({
            where: { id: { in: cashValidationIds }, discountId: { in: discountIds } },
            select: { id: true, discountId: true },
          })
        : Promise.resolve([] as Array<{ id: string; discountId: string }>),
    ]);
    const discountById = new Map(discounts.filter((d) => d.tenantId === tenantId).map((d) => [d.id, d] as const));

    const issues: BenefitIntegrityIssue[] = [];
    for (const transfer of attributed) {
      const discount = discountById.get(transfer.gastroDiscountId!);
      const mismatch = checkTransferDiscountScopeMismatch({
        transferId: transfer.id,
        settlementVertical: row.vertical,
        settlementGastroProfileId: row.gastroProfileId,
        gastroDiscountId: transfer.gastroDiscountId,
        discountExists: discount != null,
        discountGastroProfileId: discount?.gastroProfileId ?? null,
      });
      if (mismatch) issues.push(mismatch);
    }
    for (const discountId of discountIds) {
      const owned = new Set(validations.filter((v) => v.discountId === discountId).map((v) => v.id));
      const overpay = checkDiscountCashOverpayment({
        settlementId: row.id,
        gastroDiscountId: discountId,
        discountCashDueCents: computeDiscountCashDueCents(row.allocations, owned),
        discountCashPaidCents: computeDiscountCashPaidCents(row.transfers, discountId),
      });
      if (overpay) issues.push(overpay);
    }
    return issues;
  }

  private async checkAllocationLogicalIntegrity(
    tenantId: string,
    row: SettlementIntegrityRow,
  ): Promise<BenefitIntegrityIssue[]> {
    const issues: BenefitIntegrityIssue[] = [];
    if (!row.allocations.length) return issues;

    const gastroIds = row.allocations
      .filter((a) => a.validationSource === 'GASTRO_DISCOUNT_VALIDATION')
      .map((a) => a.validationId);
    const activityIds = row.allocations
      .filter((a) => a.validationSource === 'ACTIVITY_COUPON_VALIDATION')
      .map((a) => a.validationId);

    const agreementIds = [...new Set(row.allocations.map((a) => a.agreementId))];
    const [gastroRows, activityRows, agreementRows] = await Promise.all([
      gastroIds.length
        ? this.prisma.gastroDiscountValidation.findMany({
            where: { id: { in: gastroIds } },
            select: {
              id: true,
              discountId: true,
              discount: {
                select: {
                  gastroProfileId: true,
                  courtesyCampaign: {
                    select: { id: true, courtesyCreditDebit: { select: { id: true, type: true } } },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
      activityIds.length
        ? this.prisma.activityCouponValidation.findMany({
            where: { id: { in: activityIds } },
            select: {
              id: true,
              coupon: { select: { excursionOperatorId: true } },
            },
          })
        : Promise.resolve([]),
      this.prisma.benefitCommercialAgreement.findMany({
        where: { id: { in: agreementIds } },
        select: { id: true, gastroDiscountId: true },
      }),
    ]);

    const gastroMap = new Map(
      gastroRows.map((v) => [v.id, v.discount.gastroProfileId] as const),
    );
    const validationDiscount = new Map(gastroRows.map((v) => [v.id, v.discountId] as const));
    const agreementDiscount = new Map(agreementRows.map((a) => [a.id, a.gastroDiscountId] as const));
    const fundedGastroIds = new Set<string>();
    for (const v of gastroRows) {
      if (isGastroCourtesyFundedByCredit(v.discount)) fundedGastroIds.add(v.id);
    }
    const activityMap = new Map(
      activityRows.map((v) => [v.id, v.coupon.excursionOperatorId] as const),
    );

    for (const allocation of row.allocations) {
      if (allocation.validationSource === 'GASTRO_DISCOUNT_VALIDATION') {
        const partnerId = gastroMap.get(allocation.validationId);
        const orphan = checkOrphanAllocation({
          allocationId: allocation.id,
          validationSource: allocation.validationSource,
          validationId: allocation.validationId,
          validationExists: partnerId != null,
        });
        if (orphan) issues.push(orphan);
        const mismatch = checkPartnerMismatchAllocation({
          allocationId: allocation.id,
          settlementVertical: row.vertical,
          settlementGastroProfileId: row.gastroProfileId,
          settlementExcursionOperatorId: row.excursionOperatorId,
          validationGastroProfileId: partnerId ?? null,
          validationExcursionOperatorId: null,
        });
        if (mismatch) issues.push(mismatch);
        const fundedCourtesy = checkFundedCourtesyAllocation({
          allocationId: allocation.id,
          fundedByCourtesyCredit: fundedGastroIds.has(allocation.validationId),
        });
        if (fundedCourtesy) issues.push(fundedCourtesy);
        const agreementMismatch = checkAllocationAgreementDiscountMismatch({
          allocationId: allocation.id,
          agreementGastroDiscountId: agreementDiscount.get(allocation.agreementId) ?? null,
          validationDiscountId: validationDiscount.get(allocation.validationId) ?? null,
        });
        if (agreementMismatch) issues.push(agreementMismatch);
      } else if (allocation.validationSource === 'ACTIVITY_COUPON_VALIDATION') {
        const partnerId = activityMap.get(allocation.validationId);
        const orphan = checkOrphanAllocation({
          allocationId: allocation.id,
          validationSource: allocation.validationSource,
          validationId: allocation.validationId,
          validationExists: partnerId != null,
        });
        if (orphan) issues.push(orphan);
        const mismatch = checkPartnerMismatchAllocation({
          allocationId: allocation.id,
          settlementVertical: row.vertical,
          settlementGastroProfileId: row.gastroProfileId,
          settlementExcursionOperatorId: row.excursionOperatorId,
          validationGastroProfileId: null,
          validationExcursionOperatorId: partnerId ?? null,
        });
        if (mismatch) issues.push(mismatch);
      }
    }

    return issues;
  }
}
