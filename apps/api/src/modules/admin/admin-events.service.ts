import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventStatus, Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type { EventsPaginatedResponse, EventSummary } from '@yo-te-invito/shared';

type ModerationAuditAction =
  | typeof AuditAction.EVENT_REJECTED
  | typeof AuditAction.EVENT_POSTPONED
  | typeof AuditAction.EVENT_CANCELLED;

@Injectable()
export class AdminEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    tenantId: string,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<EventsPaginatedResponse> {
    const where: { tenantId: string; deletedAt: null; status?: EventStatus } = {
      tenantId,
      deletedAt: null,
    };
    const validStatuses: EventStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'CANCELLED'];
    if (status && validStatuses.includes(status.toUpperCase() as EventStatus)) {
      where.status = status.toUpperCase() as EventStatus;
    }
    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          startAt: true,
          city: true,
          venueName: true,
          coverImageUrl: true,
          status: true,
        },
        orderBy: { startAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    const items = data.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      city: e.city,
      venueName: e.venueName,
      coverImageUrl: e.coverImageUrl,
      status: e.status.toLowerCase(),
    }));
    return {
      data: items as EventSummary[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

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

    return { id: eventId, status: 'approved' };
  }

  async rejectEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    return this.moderateWithReason(
      tenantId,
      actorId,
      actorRole,
      eventId,
      'CANCELLED',
      AuditAction.EVENT_REJECTED,
      reason,
    );
  }

  async postponeEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    reason: string,
    newStartAt?: string,
  ): Promise<{ id: string; status: string }> {
    const event = await this.assertEvent(tenantId, eventId);
    const before = { status: event.status, startAt: event.startAt.toISOString() };
    const updateData: Prisma.EventUpdateInput = { status: 'PAUSED' };
    if (newStartAt) {
      const parsed = new Date(newStartAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Invalid newStartAt',
        });
      }
      updateData.startAt = parsed;
    }
    const after = {
      status: 'PAUSED' as const,
      reason,
      ...(newStartAt ? { startAt: new Date(newStartAt).toISOString() } : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: eventId }, data: updateData });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorRole,
          action: AuditAction.EVENT_POSTPONED,
          entityType: 'Event',
          entityId: eventId,
          before: before as object,
          after: after as object,
        },
      });
    });

    return { id: eventId, status: 'paused' };
  }

  async cancelEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    return this.moderateWithReason(
      tenantId,
      actorId,
      actorRole,
      eventId,
      'CANCELLED',
      AuditAction.EVENT_CANCELLED,
      reason,
    );
  }

  private async moderateWithReason(
    tenantId: string,
    actorId: string,
    actorRole: string,
    eventId: string,
    status: EventStatus,
    action: ModerationAuditAction,
    reason: string,
  ): Promise<{ id: string; status: string }> {
    const event = await this.assertEvent(tenantId, eventId);
    const before = { status: event.status };
    const after = { status, reason };

    await this.prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id: eventId }, data: { status } });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId,
          actorRole,
          action,
          entityType: 'Event',
          entityId: eventId,
          before: before as object,
          after: after as object,
        },
      });
    });

    return { id: eventId, status: status.toLowerCase() };
  }

  private async assertEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return event;
  }
}
