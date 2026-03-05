import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, AuditAction } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class AdminEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async approveEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
  ): Promise<{ id: string; status: string }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    if (event.status === 'APPROVED') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Event is already approved',
      });
    }

    const before = { status: event.status };
    const now = new Date();
    const after = { status: 'APPROVED' as const, publishedAt: now.toISOString() };

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.event.update({
        where: { id: eventId },
        data: { status: 'APPROVED', publishedAt: now },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorRole,
          action: AuditAction.EVENT_APPROVED,
          entityType: 'Event',
          entityId: eventId,
          before: before as object,
          after: after as object,
        },
      });
    });

    return { id: eventId, status: 'APPROVED' };
  }
}
