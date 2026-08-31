import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@yo-te-invito/shared';
import type {
  BenefitIntegrityIssue,
  BenefitIntegrityStatus,
} from '@yo-te-invito/shared';
import {
  checkBarterExpectedVsMaterialized,
  checkCashOverpayment,
  checkClosedWithPendingUsages,
  checkCurrencyMismatch,
  checkNegativeCourtesyBalance,
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
    mode: string;
    baseAmountCents: bigint;
    barterMultiplier: { toString(): string };
    currency: string;
    settlementId: string;
  }>;
  transfers: Array<{
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
}
