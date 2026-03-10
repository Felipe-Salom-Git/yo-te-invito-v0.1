import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import {
  ErrorCode,
  type TransferTicketBody,
  type TransferTicketResponse,
} from '@yo-te-invito/shared';

@Injectable()
export class TicketTransferService {
  constructor(private readonly prisma: PrismaService) {}

  async transfer(
    requesterId: string,
    requesterTenantId: string,
    ticketId: string,
    body: TransferTicketBody,
  ): Promise<TransferTicketResponse> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId },
      include: {
        event: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    if (ticket.event.tenantId !== requesterTenantId) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    if (body.idempotencyKey) {
      const existing = await this.prisma.ticketTransfer.findFirst({
        where: {
          ticketId,
          idempotencyKey: body.idempotencyKey,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        return {
          ticketId,
          fromUserId: existing.fromUserId,
          toUserId: existing.toUserId,
          transferredAt: existing.createdAt.toISOString(),
          message: 'Ticket already transferred',
        };
      }
    }

    if (!ticket.ownerUserId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Ticket has no owner',
      });
    }

    if (ticket.ownerUserId !== requesterId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'You are not the ticket owner',
      });
    }

    if (ticket.status !== 'VALID') {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: `Ticket is not transferable (status: ${ticket.status})`,
      });
    }

    if (ticket.usedAt) {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: 'Ticket has already been used',
      });
    }

    if (ticket.revokedAt) {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: 'Ticket has been revoked',
      });
    }

    if (body.toUserId === requesterId) {
      throw new ConflictException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Cannot transfer to yourself',
      });
    }

    const toUser = await this.prisma.user.findFirst({
      where: { id: body.toUserId, tenantId: requesterTenantId },
    });

    if (!toUser) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Recipient user not found',
      });
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updateResult = await tx.ticket.updateMany({
        where: {
          id: ticketId,
          ownerUserId: requesterId,
          status: 'VALID',
          usedAt: null,
          revokedAt: null,
        },
        data: { ownerUserId: body.toUserId },
      });

      if (updateResult.count === 0) {
        throw new ConflictException({
          code: ErrorCode.TRANSFER_CONFLICT,
          message: 'Ticket could not be transferred (concurrent update or state changed)',
        });
      }

      const transfer = await tx.ticketTransfer.create({
        data: {
          ticketId,
          fromUserId: requesterId,
          toUserId: body.toUserId,
          idempotencyKey: body.idempotencyKey ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: requesterTenantId,
          actorId: requesterId,
          actorRole: 'USER',
          action: AuditAction.TICKET_TRANSFERRED,
          entityType: 'Ticket',
          entityId: ticketId,
          before: {
            ownerUserId: requesterId,
          } as object,
          after: {
            ownerUserId: body.toUserId,
          } as object,
          metadata: {
            transferId: transfer.id,
            toUserId: body.toUserId,
          } as object,
        },
      });

      return {
        ticketId,
        fromUserId: requesterId,
        toUserId: body.toUserId,
        transferredAt: transfer.createdAt.toISOString(),
        message: 'Ticket transferred successfully',
      };
    });
  }
}
