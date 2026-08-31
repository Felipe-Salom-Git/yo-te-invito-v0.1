import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import type {
  BenefitSettlement,
  BenefitSettlementTransfer,
  BenefitSettlementUsageAllocation,
} from '@prisma/client';
import {
  ErrorCode,
  computeCashDueCents,
  computeCashOutstandingCents,
  computeCashReceivedCents,
  deriveBenefitSettlementStatus,
  deriveCashCollectionStatus,
  moneyCentsToString,
  roundBarterCreditCents,
  sumMoneyCentsBigInt,
  type AllocateBenefitSettlementResponse,
  type AllocateBenefitSettlementUsagesBody,
  type BenefitSettlementAllocationDto,
  type BenefitSettlementDto,
  type BenefitSettlementSummary,
  type BenefitSettlementsListQuery,
  type GenerateBenefitSettlementBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  BenefitSettlementEligibilityService,
  type PricedEligibleValidation,
} from './benefit-settlement-eligibility.service';

type SettlementRow = BenefitSettlement & {
  gastroProfile?: { displayName: string } | null;
  excursionOperator?: { name: string } | null;
  allocations?: BenefitSettlementUsageAllocation[];
  transfers?: BenefitSettlementTransfer[];
};

@Injectable()
export class BenefitSettlementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly eligibility: BenefitSettlementEligibilityService,
  ) {}

  async list(tenantId: string, query: BenefitSettlementsListQuery) {
    const where: Prisma.BenefitSettlementWhereInput = {
      tenantId,
      ...(query.vertical ? { vertical: query.vertical } : {}),
      ...(query.gastroProfileId ? { gastroProfileId: query.gastroProfileId } : {}),
      ...(query.excursionOperatorId ? { excursionOperatorId: query.excursionOperatorId } : {}),
      ...(query.periodKey ? { periodKey: query.periodKey } : {}),
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.benefitSettlement.count({ where }),
      this.prisma.benefitSettlement.findMany({
        where,
        include: {
          gastroProfile: { select: { displayName: true } },
          excursionOperator: { select: { name: true } },
          allocations: true,
          transfers: true,
        },
        orderBy: [{ periodKey: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);
    const data = await Promise.all(rows.map((row) => this.toDto(tenantId, row)));
    return { total, page: query.page, pageSize: query.pageSize, data };
  }

  async get(tenantId: string, id: string): Promise<BenefitSettlementDto> {
    return this.toDto(tenantId, await this.require(tenantId, id));
  }

  async assertSettlementExists(tenantId: string, id: string): Promise<void> {
    const row = await this.prisma.benefitSettlement.findFirst({
      where: { id, tenantId },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_SETTLEMENT_NOT_FOUND,
        message: 'Benefit settlement not found',
      });
    }
  }

  async generate(
    tenantId: string,
    actor: { id: string; role: string },
    body: GenerateBenefitSettlementBody,
  ): Promise<BenefitSettlementDto> {
    await this.assertPartnerExists(tenantId, body);
    const existing = await this.findExistingSettlement(tenantId, body);
    if (existing) {
      if (existing.status === 'CLOSED') {
        throw new ConflictException({
          code: ErrorCode.BENEFIT_SETTLEMENT_ALREADY_CLOSED,
          message: 'Settlement for this partner and period is already closed',
        });
      }
      return this.refresh(tenantId, actor, existing.id);
    }

    const allocatedIds = await this.loadAllocatedValidationIds(tenantId);
    const discovery = await this.eligibility.discoverEligibleValidations(
      tenantId,
      body.vertical,
      {
        gastroProfileId: body.gastroProfileId,
        excursionOperatorId: body.excursionOperatorId,
      },
      body.periodKey,
      allocatedIds,
    );
    this.assertNoMissingAgreements(discovery.missingAgreements);

    const row = await this.prisma.benefitSettlement.create({
      data: {
        tenantId,
        vertical: body.vertical,
        gastroProfileId: body.gastroProfileId ?? null,
        excursionOperatorId: body.excursionOperatorId ?? null,
        periodKey: body.periodKey,
        createdByUserId: actor.id,
      },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
        allocations: true,
        transfers: true,
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_SETTLEMENT_GENERATED',
      entityType: 'BenefitSettlement',
      entityId: row.id,
      metadata: { periodKey: body.periodKey, vertical: body.vertical },
    });

    return this.toDto(tenantId, row);
  }

  async refresh(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
  ): Promise<BenefitSettlementDto> {
    const row = await this.require(tenantId, id);
    if (row.status === 'CLOSED') {
      throw new ConflictException({
        code: ErrorCode.BENEFIT_SETTLEMENT_ALREADY_CLOSED,
        message: 'Closed settlements cannot be refreshed',
      });
    }

    const allocatedIds = new Set(row.allocations?.map((a) => a.validationId) ?? []);
    const discovery = await this.eligibility.discoverEligibleValidations(
      tenantId,
      row.vertical,
      {
        gastroProfileId: row.gastroProfileId ?? undefined,
        excursionOperatorId: row.excursionOperatorId ?? undefined,
      },
      row.periodKey,
      allocatedIds,
    );
    this.assertNoMissingAgreements(discovery.missingAgreements);

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_SETTLEMENT_REFRESHED',
      entityType: 'BenefitSettlement',
      entityId: row.id,
    });

    return this.toDto(tenantId, row);
  }

  async allocate(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
    body: AllocateBenefitSettlementUsagesBody,
  ): Promise<AllocateBenefitSettlementResponse> {
    const row = await this.require(tenantId, id);
    if (row.status === 'CLOSED') {
      throw new ConflictException({
        code: ErrorCode.BENEFIT_SETTLEMENT_ALREADY_CLOSED,
        message: 'Cannot allocate on a closed settlement',
      });
    }

    const allocatedIds = new Set(row.allocations?.map((a) => a.validationId) ?? []);
    const discovery = await this.eligibility.discoverEligibleValidations(
      tenantId,
      row.vertical,
      {
        gastroProfileId: row.gastroProfileId ?? undefined,
        excursionOperatorId: row.excursionOperatorId ?? undefined,
      },
      row.periodKey,
      allocatedIds,
    );
    this.assertNoMissingAgreements(discovery.missingAgreements);

    const pending = discovery.priced;
    if (pending.length < body.count) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_SETTLEMENT_INSUFFICIENT_PENDING_USAGES,
        message: `Only ${pending.length} pending usages available; requested ${body.count}`,
      });
    }

    const selected = pending.slice(0, body.count);
    const auditAction =
      body.mode === 'CASH' ? 'BENEFIT_USAGE_ALLOCATED_CASH' : 'BENEFIT_USAGE_ALLOCATED_BARTER';

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const created: BenefitSettlementUsageAllocation[] = [];
        for (const usage of selected) {
          const allocation = await tx.benefitSettlementUsageAllocation.create({
            data: this.allocationData(tenantId, row.id, usage, body.mode, actor.id),
          });
          created.push(allocation);
        }

        const refreshed = await tx.benefitSettlement.findFirstOrThrow({
          where: { id: row.id, tenantId },
          include: {
            gastroProfile: { select: { displayName: true } },
            excursionOperator: { select: { name: true } },
            allocations: true,
            transfers: true,
          },
        });

        const summary = await this.buildSummary(tenantId, refreshed);
        const nextStatus = deriveBenefitSettlementStatus({
          status: refreshed.status,
          allocatedUsageCount:
            summary.allocatedCashCount + summary.allocatedBarterCount,
          pendingUsageCount: summary.pendingUsageCount,
        });

        const updated = await tx.benefitSettlement.update({
          where: { id: refreshed.id },
          data: { status: nextStatus },
          include: {
            gastroProfile: { select: { displayName: true } },
            excursionOperator: { select: { name: true } },
            allocations: true,
            transfers: true,
          },
        });

        return { updated, created };
      });

      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: auditAction,
        entityType: 'BenefitSettlement',
        entityId: result.updated.id,
        metadata: { mode: body.mode, count: body.count },
      });

      return {
        settlement: await this.toDto(tenantId, result.updated),
        allocations: result.created.map((a) => this.allocationDto(a)),
      };
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCode.BENEFIT_SETTLEMENT_ALLOCATION_CONFLICT,
          message: 'Validation already allocated economically',
        });
      }
      throw err;
    }
  }

  async close(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
  ): Promise<BenefitSettlementDto> {
    const row = await this.require(tenantId, id);
    if (row.status === 'CLOSED') {
      throw new ConflictException({
        code: ErrorCode.BENEFIT_SETTLEMENT_ALREADY_CLOSED,
        message: 'Settlement is already closed',
      });
    }

    const summary = await this.buildSummary(tenantId, row);
    if (summary.pendingUsageCount > 0) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_SETTLEMENT_INSUFFICIENT_PENDING_USAGES,
        message: 'Cannot close settlement while pending usages remain',
      });
    }

    const updated = await this.prisma.benefitSettlement.update({
      where: { id: row.id },
      data: { status: 'CLOSED', closedAt: new Date() },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
        allocations: true,
        transfers: true,
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_SETTLEMENT_CLOSED',
      entityType: 'BenefitSettlement',
      entityId: updated.id,
    });

    return this.toDto(tenantId, updated);
  }

  private allocationData(
    tenantId: string,
    settlementId: string,
    usage: PricedEligibleValidation,
    mode: AllocateBenefitSettlementUsagesBody['mode'],
    actorId: string,
  ): Prisma.BenefitSettlementUsageAllocationCreateInput {
    return {
      tenant: { connect: { id: tenantId } },
      settlement: { connect: { id: settlementId } },
      validationSource: usage.validationSource,
      validationId: usage.validationId,
      mode,
      agreement: { connect: { id: usage.agreementId } },
      unitPriceCents: usage.unitPriceCents,
      barterMultiplier: new Decimal(usage.barterMultiplier),
      baseAmountCents: usage.unitPriceCents,
      currency: usage.currency,
      allocatedBy: { connect: { id: actorId } },
    };
  }

  private async buildSummary(
    tenantId: string,
    row: SettlementRow,
  ): Promise<BenefitSettlementSummary> {
    const allocatedIds = new Set(row.allocations?.map((a) => a.validationId) ?? []);
    const discovery = await this.eligibility.discoverEligibleValidations(
      tenantId,
      row.vertical,
      {
        gastroProfileId: row.gastroProfileId ?? undefined,
        excursionOperatorId: row.excursionOperatorId ?? undefined,
      },
      row.periodKey,
      allocatedIds,
    );

    const allocations = row.allocations ?? [];
    const cashAllocations = allocations.filter((a) => a.mode === 'CASH');
    const barterAllocations = allocations.filter((a) => a.mode === 'BARTER');

    const eligibleAll = [...discovery.priced, ...this.allocatedAsPriced(allocations)];
    const eligibleBase = sumMoneyCentsBigInt(eligibleAll.map((v) => v.unitPriceCents));
    const pendingBase = sumMoneyCentsBigInt(discovery.priced.map((v) => v.unitPriceCents));

    const cashDueCents = computeCashDueCents(allocations);
    const transfers = row.transfers ?? [];
    const cashReceivedCents = computeCashReceivedCents(transfers);
    const activeTransferCount = transfers.filter((t) => t.reversedAt == null).length;

    let barterCreditPreview = 0n;
    for (const allocation of barterAllocations) {
      barterCreditPreview += roundBarterCreditCents(
        allocation.baseAmountCents,
        allocation.barterMultiplier.toString(),
      );
    }

    return {
      eligibleUsageCount: eligibleAll.length,
      allocatedCashCount: cashAllocations.length,
      allocatedBarterCount: barterAllocations.length,
      pendingUsageCount: discovery.priced.length,
      eligibleBaseAmountCents: eligibleBase,
      cashBaseAmountCents: sumMoneyCentsBigInt(cashAllocations.map((a) => a.baseAmountCents)),
      barterBaseAmountCents: sumMoneyCentsBigInt(barterAllocations.map((a) => a.baseAmountCents)),
      pendingBaseAmountCents: pendingBase,
      cashDueCents: moneyCentsToString(cashDueCents),
      cashReceivedCents: moneyCentsToString(cashReceivedCents),
      cashOutstandingCents: moneyCentsToString(
        computeCashOutstandingCents(cashDueCents, cashReceivedCents),
      ),
      cashCollectionStatus: deriveCashCollectionStatus(cashDueCents, cashReceivedCents),
      transferCount: activeTransferCount,
      ...(barterAllocations.length > 0
        ? { barterCreditPreviewCents: moneyCentsToString(barterCreditPreview) }
        : {}),
    };
  }

  private allocatedAsPriced(allocations: BenefitSettlementUsageAllocation[]): PricedEligibleValidation[] {
    return allocations.map((a) => ({
      validationSource: a.validationSource,
      validationId: a.validationId,
      validatedAt: a.allocatedAt,
      agreementId: a.agreementId,
      unitPriceCents: a.unitPriceCents,
      barterMultiplier: a.barterMultiplier.toString(),
      currency: a.currency,
    }));
  }

  private async toDto(tenantId: string, row: SettlementRow): Promise<BenefitSettlementDto> {
    const withAllocations =
      row.allocations != null
        ? row
        : await this.require(tenantId, row.id);
    const summary = await this.buildSummary(tenantId, withAllocations);
    return {
      id: row.id,
      tenantId: row.tenantId,
      vertical: row.vertical,
      gastroProfileId: row.gastroProfileId,
      excursionOperatorId: row.excursionOperatorId,
      partnerDisplayName:
        row.gastroProfile?.displayName ?? row.excursionOperator?.name ?? null,
      periodKey: row.periodKey,
      status: row.status,
      summary,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      closedAt: row.closedAt?.toISOString() ?? null,
    };
  }

  private allocationDto(row: BenefitSettlementUsageAllocation): BenefitSettlementAllocationDto {
    return {
      id: row.id,
      settlementId: row.settlementId,
      validationSource: row.validationSource,
      validationId: row.validationId,
      mode: row.mode,
      agreementId: row.agreementId,
      unitPriceCents: moneyCentsToString(row.unitPriceCents),
      barterMultiplier: row.barterMultiplier.toString(),
      baseAmountCents: moneyCentsToString(row.baseAmountCents),
      currency: row.currency,
      allocatedAt: row.allocatedAt.toISOString(),
      allocatedByUserId: row.allocatedByUserId,
    };
  }

  private async require(tenantId: string, id: string): Promise<SettlementRow> {
    const row = await this.prisma.benefitSettlement.findFirst({
      where: { id, tenantId },
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
        message: 'Benefit settlement not found',
      });
    }
    return row;
  }

  private async findExistingSettlement(
    tenantId: string,
    body: GenerateBenefitSettlementBody,
  ) {
    return this.prisma.benefitSettlement.findFirst({
      where: {
        tenantId,
        vertical: body.vertical,
        periodKey: body.periodKey,
        ...(body.vertical === 'GASTRO'
          ? { gastroProfileId: body.gastroProfileId }
          : { excursionOperatorId: body.excursionOperatorId }),
      },
      include: {
        gastroProfile: { select: { displayName: true } },
        excursionOperator: { select: { name: true } },
        allocations: true,
        transfers: true,
      },
    });
  }

  private async loadAllocatedValidationIds(tenantId: string): Promise<Set<string>> {
    const rows = await this.prisma.benefitSettlementUsageAllocation.findMany({
      where: { tenantId },
      select: { validationId: true },
    });
    return new Set(rows.map((r) => r.validationId));
  }

  private assertNoMissingAgreements(
    missing: import('@yo-te-invito/shared').BenefitSettlementMissingAgreement[],
  ) {
    if (missing.length === 0) return;
    throw new BadRequestException({
      code: ErrorCode.BENEFIT_SETTLEMENT_MISSING_AGREEMENTS,
      message: `${missing.length} eligible validation(s) have no commercial agreement`,
      missingAgreements: missing,
    });
  }

  private async assertPartnerExists(
    tenantId: string,
    body: GenerateBenefitSettlementBody,
  ): Promise<void> {
    if (body.vertical === 'GASTRO') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: body.gastroProfileId, tenantId },
      });
      if (!profile) {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_SETTLEMENT_PARTNER_INVALID,
          message: 'Gastro profile not found for tenant',
        });
      }
      return;
    }
    const operator = await this.prisma.excursionOperator.findFirst({
      where: { id: body.excursionOperatorId, tenantId, deletedAt: null },
    });
    if (!operator) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_SETTLEMENT_PARTNER_INVALID,
        message: 'Excursion operator not found for tenant',
      });
    }
  }
}
