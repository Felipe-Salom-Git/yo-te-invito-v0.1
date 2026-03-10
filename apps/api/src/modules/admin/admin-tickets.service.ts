import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import {
  ErrorCode,
  type RevokeTicketBody,
  type RevokeTicketResponse,
} from '@yo-te-invito/shared';

@Injectable()
export class AdminTicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async revoke(
    tenantId: string,
    actorId: string,
    actorRole: string,
    ticketId: string,
    body: RevokeTicketBody,
  ): Promise<RevokeTicketResponse> {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId },
      include: { event: true },
    });

    if (!ticket) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    if (ticket.event.tenantId !== tenantId) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    if (ticket.status === 'REVOKED') {
      if (body.idempotencyKey) {
        const lastRevoke = await this.prisma.auditLog.findFirst({
          where: {
            tenantId,
            action: AuditAction.TICKET_REVOKED,
            entityType: 'Ticket',
            entityId: ticketId,
          },
          orderBy: { createdAt: 'desc' },
        });
        const meta = lastRevoke?.metadata as { idempotencyKey?: string } | null;
        if (meta?.idempotencyKey === body.idempotencyKey) {
          return {
            ticketId: ticket.id,
            status: 'REVOKED',
            revokedAt: ticket.revokedAt!.toISOString(),
            reason: (ticket.revokedReason as RevokeTicketResponse['reason']) ?? body.reason,
            message: 'Ticket already revoked',
          };
        }
      }
      if (
        ticket.revokedReason === body.reason &&
        (ticket.revokedNote ?? null) === (body.note ?? null)
      ) {
        return {
          ticketId: ticket.id,
          status: 'REVOKED',
          revokedAt: ticket.revokedAt!.toISOString(),
          reason: (ticket.revokedReason as RevokeTicketResponse['reason']) ?? body.reason,
          message: 'Ticket already revoked',
        };
      }
      throw new ConflictException({
        code: ErrorCode.TICKET_ALREADY_REVOKED,
        message: 'Ticket already revoked',
      });
    }

    const now = new Date();
    const before = {
      status: ticket.status,
      revokedAt: ticket.revokedAt?.toISOString() ?? null,
      reason: ticket.revokedReason,
      note: ticket.revokedNote,
    };
    const after = {
      status: 'REVOKED' as const,
      revokedAt: now.toISOString(),
      reason: body.reason,
      note: body.note ?? null,
    };
    const metadata: Record<string, unknown> = {};
    if (ticket.orderId) metadata.orderId = ticket.orderId;
    if (ticket.eventId) metadata.eventId = ticket.eventId;
    if (body.idempotencyKey) metadata.idempotencyKey = body.idempotencyKey;

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'REVOKED',
          revokedAt: now,
          revokedByUserId: actorId,
          revokedReason: body.reason,
          revokedNote: body.note ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorRole,
          action: AuditAction.TICKET_REVOKED,
          entityType: 'Ticket',
          entityId: ticketId,
          before: before as object,
          after: after as object,
          ...(Object.keys(metadata).length > 0 ? { metadata: metadata as object } : {}),
        },
      });
    });

    return {
      ticketId,
      status: 'REVOKED',
      revokedAt: now.toISOString(),
      reason: body.reason,
      message: 'Ticket revoked successfully',
    };
  }
}
