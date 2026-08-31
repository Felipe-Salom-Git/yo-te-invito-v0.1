import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { BenefitSettlementTransfer } from '@prisma/client';
import {
  ErrorCode,
  assertTransferWouldNotOverpay,
  computeCashDueCents,
  computeCashReceivedCents,
  moneyCentsToString,
  parseMoneyCentsString,
  type BenefitSettlementTransferDto,
  type BenefitSettlementTransfersListResponse,
  type RegisterBenefitSettlementTransferBody,
  type ReverseBenefitSettlementTransferBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BenefitSettlementsService } from './benefit-settlements.service';

@Injectable()
export class BenefitSettlementTransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settlements: BenefitSettlementsService,
  ) {}

  async list(tenantId: string, settlementId: string): Promise<BenefitSettlementTransfersListResponse> {
    await this.settlements.assertSettlementExists(tenantId, settlementId);
    const rows = await this.prisma.benefitSettlementTransfer.findMany({
      where: { tenantId, settlementId },
      orderBy: [{ transferredAt: 'desc' }, { createdAt: 'desc' }],
    });
    return { data: rows.map((row) => this.toDto(row)) };
  }

  async register(
    tenantId: string,
    actor: { id: string; role: string },
    settlementId: string,
    body: RegisterBenefitSettlementTransferBody,
  ): Promise<BenefitSettlementTransferDto> {
    const amountCents = parseMoneyCentsString(body.amountCents);
    const transferredAt = new Date(body.transferredAt);

    const row = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT id FROM "BenefitSettlement" WHERE id = ${settlementId} AND "tenantId" = ${tenantId} FOR UPDATE`,
        );

        const settlement = await tx.benefitSettlement.findFirst({
          where: { id: settlementId, tenantId },
          include: { allocations: true, transfers: true },
        });
        if (!settlement) {
          throw new NotFoundException({
            code: ErrorCode.BENEFIT_SETTLEMENT_NOT_FOUND,
            message: 'Benefit settlement not found',
          });
        }

        const cashDueCents = computeCashDueCents(settlement.allocations);
        if (cashDueCents === 0n) {
          throw new BadRequestException({
            code: ErrorCode.BENEFIT_SETTLEMENT_NO_CASH_DUE,
            message: 'Settlement has no CASH allocations; transfer not allowed',
          });
        }

        const settlementCurrency = this.resolveSettlementCurrency(settlement.allocations);
        if (body.currency !== settlementCurrency) {
          throw new BadRequestException({
            code: ErrorCode.BENEFIT_TRANSFER_CURRENCY_MISMATCH,
            message: `Transfer currency must match settlement currency (${settlementCurrency})`,
          });
        }

        const cashReceivedCents = computeCashReceivedCents(settlement.transfers);
        if (!assertTransferWouldNotOverpay(cashDueCents, cashReceivedCents, amountCents)) {
          throw new BadRequestException({
            code: ErrorCode.BENEFIT_TRANSFER_OVERPAYMENT,
            message: 'Transfer would exceed cash due for this settlement',
            cashDueCents: moneyCentsToString(cashDueCents),
            cashReceivedCents: moneyCentsToString(cashReceivedCents),
            cashOutstandingCents: moneyCentsToString(cashDueCents - cashReceivedCents),
          });
        }

        return tx.benefitSettlementTransfer.create({
          data: {
            tenantId,
            settlementId,
            amountCents,
            currency: body.currency,
            transferredAt,
            reference: body.reference ?? null,
            notes: body.notes ?? null,
            registeredByUserId: actor.id,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_TRANSFER_REGISTERED',
      entityType: 'BenefitSettlementTransfer',
      entityId: row.id,
      metadata: {
        settlementId,
        amountCents: moneyCentsToString(amountCents),
        currency: body.currency,
      },
    });

    return this.toDto(row);
  }

  async reverse(
    tenantId: string,
    actor: { id: string; role: string },
    settlementId: string,
    transferId: string,
    body: ReverseBenefitSettlementTransferBody,
  ): Promise<BenefitSettlementTransferDto> {
    const updated = await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw(
          Prisma.sql`SELECT id FROM "BenefitSettlement" WHERE id = ${settlementId} AND "tenantId" = ${tenantId} FOR UPDATE`,
        );

        const transfer = await tx.benefitSettlementTransfer.findFirst({
          where: { id: transferId, tenantId, settlementId },
        });
        if (!transfer) {
          throw new NotFoundException({
            code: ErrorCode.BENEFIT_TRANSFER_NOT_FOUND,
            message: 'Benefit settlement transfer not found',
          });
        }
        if (transfer.reversedAt != null) {
          throw new ConflictException({
            code: ErrorCode.BENEFIT_TRANSFER_ALREADY_REVERSED,
            message: 'Transfer is already reversed',
          });
        }

        return tx.benefitSettlementTransfer.update({
          where: { id: transfer.id },
          data: {
            reversedAt: new Date(),
            reversedByUserId: actor.id,
            reversalReason: body.reason,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'BENEFIT_TRANSFER_REVERSED',
      entityType: 'BenefitSettlementTransfer',
      entityId: updated.id,
      metadata: {
        settlementId,
        reason: body.reason,
        amountCents: moneyCentsToString(updated.amountCents),
      },
    });

    return this.toDto(updated);
  }

  private resolveSettlementCurrency(
    allocations: Array<{ mode: string; currency: string }>,
  ): string {
    const cash = allocations.filter((a) => a.mode === 'CASH');
    return cash[0]?.currency ?? 'ARS';
  }

  private toDto(row: BenefitSettlementTransfer): BenefitSettlementTransferDto {
    return {
      id: row.id,
      settlementId: row.settlementId,
      amountCents: moneyCentsToString(row.amountCents),
      currency: row.currency,
      transferredAt: row.transferredAt.toISOString(),
      reference: row.reference,
      notes: row.notes,
      proofUrl: row.proofUrl,
      registeredByUserId: row.registeredByUserId,
      createdAt: row.createdAt.toISOString(),
      reversedAt: row.reversedAt?.toISOString() ?? null,
      reversedByUserId: row.reversedByUserId,
      reversalReason: row.reversalReason,
      isActive: row.reversedAt == null,
    };
  }
}
