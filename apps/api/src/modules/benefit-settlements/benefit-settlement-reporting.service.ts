import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  addMoneyCentsField,
  emptyBenefitReportingKpis,
  mergeBenefitReportingKpis,
  moneyCentsToString,
  roundBarterCreditCents,
  sortBenefitTimelineEvents,
  type BenefitReportingIntegrityQuery,
  type BenefitReportingIntegrityResponse,
  type BenefitReportingKpis,
  type BenefitReportingMonthlyResponse,
  type BenefitReportingPartnersQuery,
  type BenefitReportingPartnersResponse,
  type BenefitReportingPeriodQuery,
  type BenefitSettlementAuditResponse,
  type BenefitTimelineEvent,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { userDisplayLabel } from '../../common/user-contact.util';
import { BenefitSettlementIntegrityService } from './benefit-settlement-integrity.service';
import { BenefitSettlementsService } from './benefit-settlements.service';
import { CourtesyCreditLedgerService } from '../courtesy-credit-ledger/courtesy-credit-ledger.service';

@Injectable()
export class BenefitSettlementReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlements: BenefitSettlementsService,
    private readonly integrity: BenefitSettlementIntegrityService,
    private readonly courtesyLedger: CourtesyCreditLedgerService,
  ) {}

  async getMonthly(
    tenantId: string,
    query: BenefitReportingPeriodQuery,
  ): Promise<BenefitReportingMonthlyResponse> {
    const settlements = await this.loadSettlementsForPeriod(tenantId, query);
    let kpis = emptyBenefitReportingKpis();
    const partnerKeys = new Set<string>();

    for (const settlement of settlements) {
      const dto = await this.settlements.get(tenantId, settlement.id);
      kpis = mergeBenefitReportingKpis(kpis, this.kpisFromSummary(dto.summary));
      partnerKeys.add(this.partnerKey(settlement));
    }

    const ledgerKpis = await this.aggregatePartnerLedgerKpis(tenantId, settlements);
    kpis = {
      ...kpis,
      courtesyCreditConsumedCents: ledgerKpis.courtesyCreditConsumedCents,
      courtesyCreditAvailableCents: ledgerKpis.courtesyCreditAvailableCents,
    };

    return {
      periodKey: query.periodKey,
      currency: 'ARS',
      settlementCount: settlements.length,
      kpis,
    };
  }

  async getPartners(
    tenantId: string,
    query: BenefitReportingPartnersQuery,
  ): Promise<BenefitReportingPartnersResponse> {
    const where = this.periodWhere(tenantId, query);
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.benefitSettlement.count({ where }),
      this.prisma.benefitSettlement.findMany({
        where,
        include: {
          gastroProfile: { select: { displayName: true } },
          excursionOperator: { select: { name: true } },
        },
        orderBy: [{ periodKey: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);

    const data = [];
    for (const row of rows) {
      const dto = await this.settlements.get(tenantId, row.id);
      const { status, issues } = await this.integrity.evaluateSettlement(
        tenantId,
        row.id,
        dto.summary,
      );
      if (query.integrityStatus && query.integrityStatus !== status) {
        continue;
      }
      const partnerId = row.gastroProfileId ?? row.excursionOperatorId ?? row.id;
      const ledgerKpis = await this.partnerLedgerKpisForSettlement(tenantId, row);
      const rowKpis = {
        ...this.kpisFromSummary(dto.summary),
        courtesyCreditConsumedCents: ledgerKpis.courtesyCreditConsumedCents,
        courtesyCreditAvailableCents: ledgerKpis.courtesyCreditAvailableCents,
      };
      data.push({
        partnerId,
        partnerDisplayName:
          row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
        vertical: row.vertical,
        periodKey: row.periodKey,
        settlementId: row.id,
        settlementStatus: row.status,
        cashCollectionStatus: dto.summary.cashCollectionStatus,
        integrityStatus: status,
        kpis: rowKpis,
      });
    }

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      data,
    };
  }

  async getIntegrity(
    tenantId: string,
    query: BenefitReportingIntegrityQuery,
  ): Promise<BenefitReportingIntegrityResponse> {
    const where: Prisma.BenefitSettlementWhereInput = {
      tenantId,
      ...(query.periodKey ? { periodKey: query.periodKey } : {}),
      ...(query.vertical ? { vertical: query.vertical } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.benefitSettlement.count({ where }),
      this.prisma.benefitSettlement.findMany({
        where,
        include: {
          gastroProfile: { select: { displayName: true } },
          excursionOperator: { select: { name: true } },
        },
        orderBy: [{ periodKey: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);

    let ok = 0;
    let warnings = 0;
    let errors = 0;
    const data = [];

    for (const row of rows) {
      const dto = await this.settlements.get(tenantId, row.id);
      const result = await this.integrity.evaluateSettlement(tenantId, row.id, dto.summary);
      if (result.status === 'OK') ok += 1;
      else if (result.status === 'WARNING') warnings += 1;
      else errors += 1;
      data.push({
        settlementId: row.id,
        partnerDisplayName:
          row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
        vertical: row.vertical,
        periodKey: row.periodKey,
        integrityStatus: result.status,
        issues: result.issues,
      });
    }

    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      checked: data.length,
      ok,
      warnings,
      errors,
      data,
    };
  }

  async getSettlementAudit(
    tenantId: string,
    settlementId: string,
  ): Promise<BenefitSettlementAuditResponse> {
    const row = await this.prisma.benefitSettlement.findFirst({
      where: { id: settlementId, tenantId },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
        allocations: {
          include: {
            agreement: true,
            courtesyCreditFromSettlement: true,
            allocatedBy: {
              select: { id: true, email: true, username: true, firstName: true, lastName: true },
            },
          },
        },
        transfers: {
          include: {
            registeredBy: {
              select: { id: true, email: true, username: true, firstName: true, lastName: true },
            },
            reversedBy: {
              select: { id: true, email: true, username: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_SETTLEMENT_NOT_FOUND,
        message: 'Benefit settlement not found',
      });
    }

    const dto = await this.settlements.get(tenantId, settlementId);
    const integrityResult = await this.integrity.evaluateSettlement(
      tenantId,
      settlementId,
      dto.summary,
    );

    const agreementMap = new Map<string, (typeof row.allocations)[number]['agreement']>();
    for (const allocation of row.allocations) {
      agreementMap.set(allocation.agreementId, allocation.agreement);
    }

    const benefitTitles = await this.resolveBenefitTitles(row.allocations);

    const agreements = [...agreementMap.values()].map((a) => ({
      agreementId: a.id,
      validFrom: a.validFrom.toISOString().slice(0, 10),
      validTo: a.validTo ? a.validTo.toISOString().slice(0, 10) : null,
      unitPriceCents: moneyCentsToString(a.unitPriceCents),
      barterMultiplier: a.barterMultiplier.toString(),
      currency: a.currency,
    }));

    const allocations = row.allocations.map((a) => {
      const creditExpected =
        a.mode === 'BARTER'
          ? moneyCentsToString(
              roundBarterCreditCents(a.baseAmountCents, a.barterMultiplier.toString()),
            )
          : undefined;
      const creditEntry = a.courtesyCreditFromSettlement;
      return {
        allocationId: a.id,
        validationSource: a.validationSource,
        validationId: a.validationId,
        validatedAt: a.allocatedAt.toISOString(),
        benefitTitle: benefitTitles.get(a.validationId) ?? null,
        mode: a.mode,
        agreementId: a.agreementId,
        unitPriceCents: moneyCentsToString(a.unitPriceCents),
        barterMultiplier: a.barterMultiplier.toString(),
        baseAmountCents: moneyCentsToString(a.baseAmountCents),
        allocatedAt: a.allocatedAt.toISOString(),
        allocatedByLabel: a.allocatedBy ? userDisplayLabel(a.allocatedBy) : null,
        creditExpectedCents: creditExpected,
        creditMaterializedCents: creditEntry
          ? moneyCentsToString(creditEntry.amountCents)
          : undefined,
        ledgerEntryId: creditEntry?.id ?? null,
      };
    });

    const transfers = row.transfers.map((t) => ({
      transferId: t.id,
      amountCents: moneyCentsToString(t.amountCents),
      currency: t.currency,
      transferredAt: t.transferredAt.toISOString(),
      reference: t.reference,
      registeredAt: t.createdAt.toISOString(),
      registeredByLabel: t.registeredBy ? userDisplayLabel(t.registeredBy) : null,
      reversed: t.reversedAt != null,
      reversalReason: t.reversalReason,
      reversedByLabel: t.reversedBy ? userDisplayLabel(t.reversedBy) : null,
      reversedAt: t.reversedAt?.toISOString() ?? null,
    }));

    const partnerScope = this.partnerScopeFromRow(row);
    const ledgerMovements: BenefitSettlementAuditResponse['ledgerMovements'] = [];
    const courtesyCampaigns: BenefitSettlementAuditResponse['courtesyCampaigns'] = [];

    if (partnerScope) {
      const allocationIds = row.allocations.map((a) => a.id);
      const entries = await this.prisma.courtesyCreditLedgerEntry.findMany({
        where: {
          tenantId,
          OR: [
            { sourceAllocationId: { in: allocationIds } },
            {
              vertical: row.vertical,
              gastroProfileId: partnerScope.gastroProfileId,
              excursionOperatorId: partnerScope.excursionOperatorId,
            },
          ],
        },
        include: {
          sourceCourtesyCampaign: true,
          createdBy: {
            select: { id: true, email: true, username: true, firstName: true, lastName: true },
          },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });

      for (const entry of entries) {
        ledgerMovements.push({
          entryId: entry.id,
          type: entry.type,
          amountCents: entry.amountCents.toString(),
          createdAt: entry.createdAt.toISOString(),
          actorLabel: entry.createdBy ? userDisplayLabel(entry.createdBy) : null,
          reason: entry.adjustmentReason ?? entry.reversalOfEntryId ?? null,
        });
        if (entry.type === 'DEBIT_COURTESY' && entry.sourceCourtesyCampaign) {
          const campaign = entry.sourceCourtesyCampaign;
          courtesyCampaigns.push({
            campaignId: campaign.id,
            discountLabel: campaign.discountLabel ?? campaign.title,
            imputedAmountCents: moneyCentsToString(-entry.amountCents),
            createdAt: campaign.createdAt.toISOString(),
            ledgerEntryId: entry.id,
          });
        }
      }
    }

    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: [
          { entityId: settlementId, entityType: 'BenefitSettlement' },
          {
            entityType: 'BenefitSettlementTransfer',
            entityId: { in: row.transfers.map((t) => t.id) },
          },
          {
            entityType: 'CourtesyCreditLedgerEntry',
            entityId: {
              in: ledgerMovements.map((m) => m.entryId),
            },
          },
        ],
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 200,
    });

    const actorIds = [...new Set(auditLogs.map((l) => l.actorId))];
    const actors = await this.prisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, email: true, username: true, firstName: true, lastName: true },
    });
    const actorMap = new Map(actors.map((u) => [u.id, userDisplayLabel(u)]));

    const timeline = sortBenefitTimelineEvents([
      ...agreements.map(
        (a): BenefitTimelineEvent => ({
          occurredAt: `${a.validFrom}T00:00:00.000Z`,
          kind: 'AGREEMENT',
          label: `Acuerdo vigente desde ${a.validFrom}`,
          tieBreak: a.agreementId,
        }),
      ),
      {
        occurredAt: row.createdAt.toISOString(),
        kind: 'SETTLEMENT',
        label: 'Liquidación generada',
        tieBreak: row.id,
      },
      ...allocations.map(
        (a): BenefitTimelineEvent => ({
          occurredAt: a.allocatedAt,
          kind: 'ALLOCATION',
          label: `${a.mode === 'CASH' ? 'Usos asignados a transferencia' : 'Usos asignados a canje'}`,
          amountCents: a.baseAmountCents,
          actorLabel: a.allocatedByLabel,
          entityType: 'BenefitSettlementUsageAllocation',
          entityId: a.allocationId,
          tieBreak: a.allocationId,
        }),
      ),
      ...allocations
        .filter((a) => a.ledgerEntryId && a.creditMaterializedCents)
        .map(
          (a): BenefitTimelineEvent => ({
            occurredAt: a.allocatedAt,
            kind: 'CREDIT',
            label: 'Crédito de canje materializado',
            amountCents: a.creditMaterializedCents,
            entityType: 'CourtesyCreditLedgerEntry',
            entityId: a.ledgerEntryId!,
            tieBreak: a.ledgerEntryId!,
          }),
        ),
      ...transfers.flatMap((t): BenefitTimelineEvent[] => {
        const events: BenefitTimelineEvent[] = [
          {
            occurredAt: t.registeredAt,
            kind: 'TRANSFER',
            label: 'Transferencia registrada',
            amountCents: t.amountCents,
            actorLabel: t.registeredByLabel,
            entityType: 'BenefitSettlementTransfer',
            entityId: t.transferId,
            tieBreak: t.transferId,
          },
        ];
        if (t.reversed && t.reversedAt) {
          events.push({
            occurredAt: t.reversedAt,
            kind: 'TRANSFER',
            label: 'Transferencia revertida',
            amountCents: t.amountCents,
            actorLabel: t.reversedByLabel,
            entityType: 'BenefitSettlementTransfer',
            entityId: `${t.transferId}-reversal`,
            tieBreak: `${t.transferId}-reversal`,
          });
        }
        return events;
      }),
      ...courtesyCampaigns.map(
        (c): BenefitTimelineEvent => ({
          occurredAt: c.createdAt,
          kind: 'COURTESY',
          label: `Cortesía financiada con saldo: ${c.discountLabel ?? c.campaignId}`,
          amountCents: c.imputedAmountCents,
          entityType: 'GastroCourtesyCampaign',
          entityId: c.campaignId,
          tieBreak: c.campaignId,
        }),
      ),
      ...ledgerMovements
        .filter((m) => m.type === 'ADJUSTMENT' || m.type === 'REVERSAL')
        .map(
          (m): BenefitTimelineEvent => ({
            occurredAt: m.createdAt,
            kind: m.type === 'ADJUSTMENT' ? 'ADJUSTMENT' : 'AUDIT',
            label: m.type === 'ADJUSTMENT' ? 'Ajuste manual' : 'Reversión de movimiento',
            amountCents: m.amountCents.startsWith('-') ? m.amountCents.slice(1) : m.amountCents,
            actorLabel: m.actorLabel,
            entityType: 'CourtesyCreditLedgerEntry',
            entityId: m.entryId,
            tieBreak: m.entryId,
          }),
        ),
      ...auditLogs.map(
        (log): BenefitTimelineEvent => ({
          occurredAt: log.createdAt.toISOString(),
          kind: 'AUDIT',
          label: log.action.replace(/_/g, ' ').toLowerCase(),
          actorLabel: actorMap.get(log.actorId) ?? 'Usuario no disponible',
          entityType: log.entityType,
          entityId: log.entityId,
          tieBreak: log.id,
        }),
      ),
    ]);

    return {
      settlementId: row.id,
      periodKey: row.periodKey,
      partnerDisplayName:
        row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
      vertical: row.vertical,
      integrityStatus: integrityResult.status,
      issues: integrityResult.issues,
      agreements,
      allocations,
      transfers,
      courtesyCampaigns,
      ledgerMovements,
      timeline: timeline.map((e) => ({
        occurredAt: e.occurredAt,
        kind: e.kind,
        label: e.label,
        amountCents: e.amountCents,
        actorLabel: e.actorLabel,
        entityType: e.entityType,
        entityId: e.entityId,
      })),
    };
  }

  private kpisFromSummary(summary: {
    eligibleUsageCount: number;
    eligibleBaseAmountCents: string;
    cashBaseAmountCents: string;
    cashReceivedCents: string;
    cashOutstandingCents: string;
    barterBaseAmountCents: string;
    barterCreditExpectedCents?: string;
    barterCreditMaterializedCents?: string;
  }): BenefitReportingKpis {
    return {
      usageCount: summary.eligibleUsageCount,
      baseGeneratedCents: summary.eligibleBaseAmountCents,
      cashAllocatedCents: summary.cashBaseAmountCents,
      cashReceivedCents: summary.cashReceivedCents,
      cashOutstandingCents: summary.cashOutstandingCents,
      barterBaseCents: summary.barterBaseAmountCents,
      barterCreditExpectedCents: summary.barterCreditExpectedCents ?? '0',
      barterCreditMaterializedCents: summary.barterCreditMaterializedCents ?? '0',
      courtesyCreditConsumedCents: '0',
      courtesyCreditAvailableCents: '0',
    };
  }

  private periodWhere(tenantId: string, query: BenefitReportingPeriodQuery) {
    return {
      tenantId,
      periodKey: query.periodKey,
      ...(query.vertical ? { vertical: query.vertical } : {}),
      ...(query.gastroProfileId ? { gastroProfileId: query.gastroProfileId } : {}),
      ...(query.excursionOperatorId ? { excursionOperatorId: query.excursionOperatorId } : {}),
    };
  }

  private async loadSettlementsForPeriod(tenantId: string, query: BenefitReportingPeriodQuery) {
    return this.prisma.benefitSettlement.findMany({
      where: this.periodWhere(tenantId, query),
      select: {
        id: true,
        vertical: true,
        gastroProfileId: true,
        excursionOperatorId: true,
      },
    });
  }

  private partnerKey(row: {
    vertical: string;
    gastroProfileId: string | null;
    excursionOperatorId: string | null;
  }): string {
    return `${row.vertical}:${row.gastroProfileId ?? row.excursionOperatorId ?? 'unknown'}`;
  }

  private partnerScopeFromRow(row: {
    vertical: 'GASTRO' | 'ACTIVITY';
    gastroProfileId: string | null;
    excursionOperatorId: string | null;
  }) {
    if (row.vertical === 'GASTRO' && row.gastroProfileId) {
      return { gastroProfileId: row.gastroProfileId, excursionOperatorId: null };
    }
    if (row.vertical === 'ACTIVITY' && row.excursionOperatorId) {
      return { gastroProfileId: null, excursionOperatorId: row.excursionOperatorId };
    }
    return null;
  }

  private async aggregatePartnerLedgerKpis(
    tenantId: string,
    settlements: Array<{
      vertical: 'GASTRO' | 'ACTIVITY';
      gastroProfileId: string | null;
      excursionOperatorId: string | null;
    }>,
  ) {
    const seen = new Set<string>();
    let consumed = '0';
    let available = '0';
    for (const row of settlements) {
      const key = this.partnerKey(row);
      if (seen.has(key)) continue;
      seen.add(key);
      const kpis = await this.partnerLedgerKpisForSettlement(tenantId, row);
      consumed = addMoneyCentsField(consumed, kpis.courtesyCreditConsumedCents);
      available = addMoneyCentsField(available, kpis.courtesyCreditAvailableCents);
    }
    return {
      courtesyCreditConsumedCents: consumed,
      courtesyCreditAvailableCents: available,
    };
  }

  private async partnerLedgerKpisForSettlement(
    tenantId: string,
    row: {
      vertical: 'GASTRO' | 'ACTIVITY';
      gastroProfileId: string | null;
      excursionOperatorId: string | null;
    },
  ) {
    const scope = this.partnerScopeFromRow(row);
    if (!scope) {
      return { courtesyCreditConsumedCents: '0', courtesyCreditAvailableCents: '0' };
    }
    const balance = await this.courtesyLedger.getPartnerBalance(tenantId, {
      vertical: row.vertical,
      currency: 'ARS',
      ...(row.vertical === 'GASTRO'
        ? { gastroProfileId: row.gastroProfileId! }
        : { excursionOperatorId: row.excursionOperatorId! }),
    });
    return {
      courtesyCreditConsumedCents: balance.creditConsumedCents,
      courtesyCreditAvailableCents: balance.balanceAvailableCents,
    };
  }

  private async resolveBenefitTitles(
    allocations: Array<{ validationSource: string; validationId: string }>,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const gastroIds = allocations
      .filter((a) => a.validationSource === 'GASTRO_DISCOUNT_VALIDATION')
      .map((a) => a.validationId);
    const activityIds = allocations
      .filter((a) => a.validationSource === 'ACTIVITY_COUPON_VALIDATION')
      .map((a) => a.validationId);

    if (gastroIds.length) {
      const rows = await this.prisma.gastroDiscountValidation.findMany({
        where: { id: { in: gastroIds } },
        include: { discount: { select: { displayTitle: true, code: true } } },
      });
      for (const v of rows) {
        map.set(v.id, v.discount.displayTitle ?? v.discount.code);
      }
    }
    if (activityIds.length) {
      const rows = await this.prisma.activityCouponValidation.findMany({
        where: { id: { in: activityIds } },
        include: { coupon: { select: { title: true } } },
      });
      for (const v of rows) {
        map.set(v.id, v.coupon.title);
      }
    }
    return map;
  }
}
