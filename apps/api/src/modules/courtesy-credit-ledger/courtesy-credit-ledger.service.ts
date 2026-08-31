import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BenefitSettlementUsageAllocation, CourtesyCreditLedgerEntry } from '@prisma/client';
import {
  ErrorCode,
  assertAdjustmentWouldNotGoNegative,
  assertLedgerAmountSignForType,
  assertReversalWouldNotGoNegative,
  computeBarterCreditFromAllocation,
  computeCourtesyCreditBalanceCents,
  moneyCentsToString,
  parseSignedMoneyCentsString,
  signedMoneyCentsToString,
  type CourtesyCreditLedgerEntryDto,
  type CourtesyCreditLedgerListQuery,
  type CourtesyCreditLedgerListResponse,
  type CourtesyCreditPartnerBalanceDto,
  type CourtesyCreditPartnerBalanceQuery,
  type CreateCourtesyCreditAdjustmentBody,
  type ReverseCourtesyCreditLedgerEntryBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type Tx = Prisma.TransactionClient;

type PartnerScope = {
  vertical: 'GASTRO' | 'ACTIVITY';
  gastroProfileId: string | null;
  excursionOperatorId: string | null;
  currency: string;
};

@Injectable()
export class CourtesyCreditLedgerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(
    tenantId: string,
    query: CourtesyCreditLedgerListQuery,
  ): Promise<CourtesyCreditLedgerListResponse> {
    const where = this.partnerWhereClause(tenantId, query);
    if (query.type) {
      Object.assign(where, { type: query.type });
    }
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.courtesyCreditLedgerEntry.count({ where }),
      this.prisma.courtesyCreditLedgerEntry.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: query.pageSize,
      }),
    ]);
    return {
      total,
      page: query.page,
      pageSize: query.pageSize,
      data: rows.map((row) => this.toDto(row)),
    };
  }

  async getPartnerBalance(
    tenantId: string,
    query: CourtesyCreditPartnerBalanceQuery,
  ): Promise<CourtesyCreditPartnerBalanceDto> {
    const entries = await this.prisma.courtesyCreditLedgerEntry.findMany({
      where: this.partnerWhereClause(tenantId, query),
      select: { amountCents: true, type: true },
    });
    return this.buildBalanceDto(query, entries);
  }

  async materializeBarterCreditForAllocation(
    tx: Tx,
    params: {
      tenantId: string;
      settlement: PartnerScope;
      allocation: BenefitSettlementUsageAllocation;
      actorId: string | null;
    },
  ): Promise<{ entry: CourtesyCreditLedgerEntry; created: boolean }> {
    if (params.allocation.mode !== 'BARTER') {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_CREDIT_INVALID_AMOUNT,
        message: 'Only BARTER allocations can materialize courtesy credit',
      });
    }
    if (params.allocation.tenantId !== params.tenantId) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_CREDIT_PARTNER_INVALID,
        message: 'Allocation tenant mismatch',
      });
    }

    const existing = await tx.courtesyCreditLedgerEntry.findFirst({
      where: {
        tenantId: params.tenantId,
        type: 'CREDIT_FROM_SETTLEMENT',
        sourceAllocationId: params.allocation.id,
      },
    });
    if (existing) {
      return { entry: existing, created: false };
    }

    const creditAmountCents = computeBarterCreditFromAllocation({
      baseAmountCents: params.allocation.baseAmountCents,
      barterMultiplier: params.allocation.barterMultiplier.toString(),
    });
    if (!assertLedgerAmountSignForType('CREDIT_FROM_SETTLEMENT', creditAmountCents)) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_CREDIT_INVALID_AMOUNT,
        message: 'Computed BARTER credit must be positive',
      });
    }

    const partner = this.resolvePartnerFromSettlement(params.settlement);
    const entry = await tx.courtesyCreditLedgerEntry.create({
      data: {
        tenantId: params.tenantId,
        vertical: params.settlement.vertical,
        gastroProfileId: partner.gastroProfileId,
        excursionOperatorId: partner.excursionOperatorId,
        type: 'CREDIT_FROM_SETTLEMENT',
        amountCents: creditAmountCents,
        currency: params.allocation.currency,
        sourceAllocationId: params.allocation.id,
        createdByUserId: params.actorId,
      },
    });

    return { entry, created: true };
  }

  async sumMaterializedCreditForAllocations(
    allocationIds: string[],
  ): Promise<bigint> {
    if (allocationIds.length === 0) return 0n;
    const creditEntries = await this.prisma.courtesyCreditLedgerEntry.findMany({
      where: {
        sourceAllocationId: { in: allocationIds },
        type: 'CREDIT_FROM_SETTLEMENT',
      },
      include: { reversalEntry: true },
    });
    let total = 0n;
    for (const credit of creditEntries) {
      total += credit.amountCents;
      if (credit.reversalEntry) {
        total += credit.reversalEntry.amountCents;
      }
    }
    return total;
  }

  async createAdjustment(
    tenantId: string,
    actor: { id: string; role: string },
    body: CreateCourtesyCreditAdjustmentBody,
  ): Promise<CourtesyCreditLedgerEntryDto> {
    const amountCents = parseSignedMoneyCentsString(body.amountCents);
    if (!assertLedgerAmountSignForType('ADJUSTMENT', amountCents)) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_CREDIT_INVALID_AMOUNT,
        message: 'Adjustment amount must be non-zero',
      });
    }

    const partnerFields = this.resolvePartnerFromQuery(body);
    const partner: PartnerScope = {
      vertical: body.vertical,
      gastroProfileId: partnerFields.gastroProfileId,
      excursionOperatorId: partnerFields.excursionOperatorId,
      currency: body.currency,
    };
    const entry = await this.prisma.$transaction(
      async (tx) => {
        await this.lockPartner(tx, tenantId, partner);
        const currentBalance = await this.sumPartnerBalance(tx, tenantId, partner);
        if (!assertAdjustmentWouldNotGoNegative(currentBalance, amountCents)) {
          throw new BadRequestException({
            code: ErrorCode.BENEFIT_CREDIT_INSUFFICIENT_BALANCE,
            message: 'Adjustment would result in negative courtesy credit balance',
          });
        }
        return tx.courtesyCreditLedgerEntry.create({
          data: {
            tenantId,
            vertical: body.vertical,
            gastroProfileId: partner.gastroProfileId,
            excursionOperatorId: partner.excursionOperatorId,
            type: 'ADJUSTMENT',
            amountCents,
            currency: body.currency,
            adjustmentReason: body.reason,
            createdByUserId: actor.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_CREDIT_ADJUSTED',
      entityType: 'CourtesyCreditLedgerEntry',
      entityId: entry.id,
      metadata: {
        amountCents: signedMoneyCentsToString(amountCents),
        currency: body.currency,
        reason: body.reason,
        vertical: body.vertical,
        gastroProfileId: partner.gastroProfileId,
        excursionOperatorId: partner.excursionOperatorId,
      },
    });

    return this.toDto(entry);
  }

  async reverseEntry(
    tenantId: string,
    actor: { id: string; role: string },
    entryId: string,
    body: ReverseCourtesyCreditLedgerEntryBody,
  ): Promise<CourtesyCreditLedgerEntryDto> {
    const original = await this.prisma.courtesyCreditLedgerEntry.findFirst({
      where: { id: entryId, tenantId },
    });
    if (!original) {
      throw new NotFoundException({
        code: ErrorCode.BENEFIT_CREDIT_NOT_FOUND,
        message: 'Courtesy credit ledger entry not found',
      });
    }
    if (original.amountCents <= 0n) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_CREDIT_NOT_REVERSIBLE,
        message: 'Only positive ledger entries can be reversed',
      });
    }

    const partner = {
      vertical: original.vertical,
      gastroProfileId: original.gastroProfileId,
      excursionOperatorId: original.excursionOperatorId,
      currency: original.currency,
    };

    try {
      const reversal = await this.prisma.$transaction(
        async (tx) => {
          await this.lockPartner(tx, tenantId, partner);
          const fresh = await tx.courtesyCreditLedgerEntry.findFirst({
            where: { id: entryId, tenantId },
            include: { reversalEntry: true },
          });
          if (!fresh) {
            throw new NotFoundException({
              code: ErrorCode.BENEFIT_CREDIT_NOT_FOUND,
              message: 'Courtesy credit ledger entry not found',
            });
          }
          if (fresh.reversalEntry) {
            throw new ConflictException({
              code: ErrorCode.BENEFIT_CREDIT_ALREADY_REVERSED,
              message: 'Ledger entry is already reversed',
            });
          }

          const currentBalance = await this.sumPartnerBalance(tx, tenantId, partner);
          if (!assertReversalWouldNotGoNegative(currentBalance, fresh.amountCents)) {
            throw new BadRequestException({
              code: ErrorCode.BENEFIT_CREDIT_INSUFFICIENT_BALANCE,
              message: 'Reversal would result in negative courtesy credit balance',
            });
          }

          const reversalAmount = -fresh.amountCents;
          return tx.courtesyCreditLedgerEntry.create({
            data: {
              tenantId,
              vertical: fresh.vertical,
              gastroProfileId: fresh.gastroProfileId,
              excursionOperatorId: fresh.excursionOperatorId,
              type: 'REVERSAL',
              amountCents: reversalAmount,
              currency: fresh.currency,
              reversalOfEntryId: fresh.id,
              adjustmentReason: body.reason,
              createdByUserId: actor.id,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'BENEFIT_CREDIT_REVERSED',
        entityType: 'CourtesyCreditLedgerEntry',
        entityId: reversal.id,
        metadata: {
          reversalOfEntryId: entryId,
          amountCents: signedMoneyCentsToString(reversal.amountCents),
          currency: reversal.currency,
          reason: body.reason,
        },
      });

      return this.toDto(reversal);
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException({
          code: ErrorCode.BENEFIT_CREDIT_ALREADY_REVERSED,
          message: 'Ledger entry is already reversed',
        });
      }
      throw err;
    }
  }

  async reconcileMissingBarterCredits(): Promise<{
    created: number;
    skipped: number;
    errors: Array<{ allocationId: string; message: string }>;
  }> {
    const allocations = await this.prisma.benefitSettlementUsageAllocation.findMany({
      where: { mode: 'BARTER' },
      include: {
        settlement: {
          select: {
            vertical: true,
            gastroProfileId: true,
            excursionOperatorId: true,
          },
        },
        courtesyCreditFromSettlement: true,
      },
    });

    let created = 0;
    let skipped = 0;
    const errors: Array<{ allocationId: string; message: string }> = [];

    for (const allocation of allocations) {
      if (allocation.courtesyCreditFromSettlement) {
        skipped += 1;
        continue;
      }
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          return this.materializeBarterCreditForAllocation(tx, {
            tenantId: allocation.tenantId,
            settlement: {
              vertical: allocation.settlement.vertical,
              gastroProfileId: allocation.settlement.gastroProfileId,
              excursionOperatorId: allocation.settlement.excursionOperatorId,
              currency: allocation.currency,
            },
            allocation,
            actorId: null,
          });
        });
        if (result.created) {
          created += 1;
        } else {
          skipped += 1;
        }
      } catch (err) {
        errors.push({
          allocationId: allocation.id,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { created, skipped, errors };
  }

  private partnerWhereClause(
    tenantId: string,
    query: CourtesyCreditPartnerBalanceQuery & { type?: string },
  ): Prisma.CourtesyCreditLedgerEntryWhereInput {
    const partner = this.resolvePartnerFromQuery(query);
    return {
      tenantId,
      vertical: query.vertical,
      gastroProfileId: partner.gastroProfileId,
      excursionOperatorId: partner.excursionOperatorId,
      currency: query.currency,
    };
  }

  private resolvePartnerFromQuery(query: {
    vertical: 'GASTRO' | 'ACTIVITY';
    gastroProfileId?: string;
    excursionOperatorId?: string;
  }) {
    if (query.vertical === 'GASTRO') {
      return {
        gastroProfileId: query.gastroProfileId ?? null,
        excursionOperatorId: null,
      };
    }
    return {
      gastroProfileId: null,
      excursionOperatorId: query.excursionOperatorId ?? null,
    };
  }

  private resolvePartnerFromSettlement(settlement: PartnerScope) {
    if (settlement.vertical === 'GASTRO') {
      return {
        gastroProfileId: settlement.gastroProfileId,
        excursionOperatorId: null,
      };
    }
    return {
      gastroProfileId: null,
      excursionOperatorId: settlement.excursionOperatorId,
    };
  }

  private async lockPartner(tx: Tx, tenantId: string, partner: PartnerScope): Promise<void> {
    if (partner.vertical === 'GASTRO') {
      if (!partner.gastroProfileId) {
        throw new BadRequestException({
          code: ErrorCode.BENEFIT_CREDIT_PARTNER_INVALID,
          message: 'GASTRO partner requires gastroProfileId',
        });
      }
      await tx.$executeRaw(
        Prisma.sql`SELECT id FROM "GastroProfile" WHERE id = ${partner.gastroProfileId} AND "tenantId" = ${tenantId} FOR UPDATE`,
      );
      return;
    }
    if (!partner.excursionOperatorId) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_CREDIT_PARTNER_INVALID,
        message: 'ACTIVITY partner requires excursionOperatorId',
      });
    }
    await tx.$executeRaw(
      Prisma.sql`SELECT id FROM "ExcursionOperator" WHERE id = ${partner.excursionOperatorId} AND "tenantId" = ${tenantId} FOR UPDATE`,
    );
  }

  private async sumPartnerBalance(
    tx: Tx,
    tenantId: string,
    partner: PartnerScope,
  ): Promise<bigint> {
    const entries = await tx.courtesyCreditLedgerEntry.findMany({
      where: this.partnerWhereClause(tenantId, partner),
      select: { amountCents: true },
    });
    return computeCourtesyCreditBalanceCents(entries);
  }

  private buildBalanceDto(
    query: CourtesyCreditPartnerBalanceQuery,
    entries: Array<{ amountCents: bigint; type: string }>,
  ): CourtesyCreditPartnerBalanceDto {
    const balance = computeCourtesyCreditBalanceCents(entries);
    let creditGenerated = 0n;
    for (const entry of entries) {
      if (entry.type === 'CREDIT_FROM_SETTLEMENT' && entry.amountCents > 0n) {
        creditGenerated += entry.amountCents;
      }
    }
    const partner = this.resolvePartnerFromQuery(query);
    return {
      vertical: query.vertical,
      gastroProfileId: partner.gastroProfileId,
      excursionOperatorId: partner.excursionOperatorId,
      currency: query.currency,
      balanceCents: signedMoneyCentsToString(balance),
      creditGeneratedCents: moneyCentsToString(creditGenerated),
      balanceAvailableCents: signedMoneyCentsToString(balance),
    };
  }

  private toDto(row: CourtesyCreditLedgerEntry): CourtesyCreditLedgerEntryDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      vertical: row.vertical,
      gastroProfileId: row.gastroProfileId,
      excursionOperatorId: row.excursionOperatorId,
      type: row.type,
      amountCents: signedMoneyCentsToString(row.amountCents),
      currency: row.currency,
      sourceAllocationId: row.sourceAllocationId,
      reversalOfEntryId: row.reversalOfEntryId,
      adjustmentReason: row.adjustmentReason,
      createdByUserId: row.createdByUserId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
