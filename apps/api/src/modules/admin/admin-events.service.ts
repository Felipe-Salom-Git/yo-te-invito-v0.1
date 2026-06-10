import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventStatus, Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EventPublicationAlertsService } from '../notifications/event-publication-alerts.service';
import { ProducerEventStatusNotificationsService } from '../notifications/producer-event-status-notifications.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type {
  AdminEventStatus,
  AdminEventsListQuery,
  AdminEventsListResponse,
  AdminEventListItem,
  EventsPaginatedResponse,
  EventSummary,
} from '@yo-te-invito/shared';
import {
  buildAdminEventsOrderBy,
  buildAdminEventsWhere,
} from './admin-events-list.util';

type ModerationAuditAction =
  | typeof AuditAction.EVENT_REJECTED
  | typeof AuditAction.EVENT_POSTPONED
  | typeof AuditAction.EVENT_CANCELLED;

/** Legacy `EventSummary` uses Prisma enum casing; admin list uses lowercase slugs. */
function adminStatusToEventSummaryStatus(
  status: AdminEventStatus,
): NonNullable<EventSummary['status']> {
  const map: Record<AdminEventStatus, NonNullable<EventSummary['status']>> = {
    draft: 'DRAFT',
    pending: 'PENDING',
    approved: 'APPROVED',
    paused: 'PAUSED',
    cancelled: 'CANCELLED',
  };
  return map[status];
}

@Injectable()
export class AdminEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly publicationAlerts: EventPublicationAlertsService,
    private readonly producerEventNotifications: ProducerEventStatusNotificationsService,
  ) {}

  /** Legacy shim — prefer {@link listForAdmin} with full query. */
  async list(
    tenantId: string,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<EventsPaginatedResponse> {
    const result = await this.listForAdmin(tenantId, {
      page,
      limit,
      ...(status ? { status: status.toLowerCase() as AdminEventsListQuery['status'] } : {}),
    });
    const data: EventSummary[] = result.data.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt,
      city: e.city,
      venueName: null,
      coverImageUrl: null,
      status: adminStatusToEventSummaryStatus(e.status),
      category: e.category,
    }));
    return {
      data,
      meta: result.meta,
    };
  }

  async listForAdmin(
    tenantId: string,
    query: AdminEventsListQuery,
  ): Promise<AdminEventsListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = buildAdminEventsWhere(tenantId, query);
    const orderBy = buildAdminEventsOrderBy(query);

    const [rows, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          category: true,
          subcategoryId: true,
          status: true,
          city: true,
          producerProfileId: true,
          startAt: true,
          endAt: true,
          createdAt: true,
          updatedAt: true,
          publishedAt: true,
          subcategory: { select: { name: true } },
          producerProfile: { select: { id: true, displayName: true } },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const eventIds = rows.map((e) => e.id);
    const occurrenceCounts =
      eventIds.length > 0
        ? await this.prisma.eventOccurrence.groupBy({
            by: ['eventId'],
            where: { eventId: { in: eventIds }, status: { not: 'CANCELLED' } },
            _count: { _all: true },
          })
        : [];
    const countByEvent = new Map(occurrenceCounts.map((c) => [c.eventId, c._count._all]));

    const data: AdminEventListItem[] = rows.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      subcategoryId: e.subcategoryId,
      subcategoryName: e.subcategory?.name ?? null,
      status: e.status.toLowerCase() as AdminEventListItem['status'],
      city: e.city,
      producerProfileId: e.producerProfileId ?? e.producerProfile?.id ?? null,
      producerName: e.producerProfile?.displayName ?? null,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt?.toISOString() ?? null,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
      publishedAt: e.publishedAt?.toISOString() ?? null,
      occurrenceCount: countByEvent.get(e.id) ?? 0,
      isMultiDate: (countByEvent.get(e.id) ?? 0) > 0,
    }));

    return {
      data,
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

    const previousStatus = event.status;
    const before = { status: previousStatus };
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

    this.publicationAlerts.handleEventBecameApproved(tenantId, eventId, previousStatus);

    this.producerEventNotifications.notifyApproved(tenantId, {
      id: event.id,
      title: event.title,
      producerProfileId: event.producerProfileId,
      producerId: event.producerId,
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
    const previousStatus = event.status;
    const before = { status: previousStatus };
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

    if (
      action === AuditAction.EVENT_REJECTED &&
      previousStatus !== status
    ) {
      this.producerEventNotifications.notifyRejected(
        tenantId,
        {
          id: event.id,
          title: event.title,
          producerProfileId: event.producerProfileId,
          producerId: event.producerId,
        },
        reason,
      );
    }

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
