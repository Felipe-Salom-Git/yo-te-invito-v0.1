import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventStatus, ProfileStatus, Prisma } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';
import type {
  AdminProducerDetail,
  AdminProducerEventListItem,
  AdminProducerEventMetrics,
  AdminProducerListItem,
  AdminProducersListQuery,
  AdminProducersListResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminEventsService } from './admin-events.service';
import { EventMetricsService } from '../producer/event-metrics.service';

@Injectable()
export class AdminProducersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminEvents: AdminEventsService,
    private readonly eventMetrics: EventMetricsService,
  ) {}

  private toProfileStatus(status: ProfileStatus): AdminProducerListItem['status'] {
    return status.toLowerCase() as AdminProducerListItem['status'];
  }

  private toEventStatus(status: EventStatus): AdminProducerEventListItem['status'] {
    return status.toLowerCase() as AdminProducerEventListItem['status'];
  }

  async list(
    tenantId: string,
    query: AdminProducersListQuery,
  ): Promise<AdminProducersListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const search = query.search?.trim();

    const statusFilter = query.status
      ? (query.status.toUpperCase() as ProfileStatus)
      : undefined;

    const where: Prisma.ProducerProfileWhereInput = {
      tenantId,
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { primaryEmail: { contains: search, mode: 'insensitive' } },
          {
            memberships: {
              some: {
                user: { email: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      }),
    };

    const [profiles, total] = await Promise.all([
      this.prisma.producerProfile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          memberships: {
            where: { membershipRole: 'OWNER' },
            take: 1,
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.producerProfile.count({ where }),
    ]);

    const profileIds = profiles.map((p) => p.id);
    const countRows =
      profileIds.length > 0
        ? await this.prisma.event.groupBy({
            by: ['producerProfileId', 'status'],
            where: {
              tenantId,
              deletedAt: null,
              producerProfileId: { in: profileIds },
            },
            _count: { _all: true },
          })
        : [];

    const countMap = new Map<
      string,
      { total: number; pending: number; approved: number }
    >();
    for (const row of countRows) {
      if (!row.producerProfileId) continue;
      const cur = countMap.get(row.producerProfileId) ?? {
        total: 0,
        pending: 0,
        approved: 0,
      };
      const n = row._count._all;
      cur.total += n;
      if (row.status === 'PENDING') cur.pending += n;
      if (row.status === 'APPROVED') cur.approved += n;
      countMap.set(row.producerProfileId, cur);
    }

    let items: AdminProducerListItem[] = profiles.map((p) => {
      const ownerMembership = p.memberships[0];
      const ownerUser = ownerMembership?.user;
      const counts = countMap.get(p.id) ?? { total: 0, pending: 0, approved: 0 };
      return {
        id: p.id,
        displayName: p.displayName,
        status: this.toProfileStatus(p.status),
        primaryEmail: p.primaryEmail,
        primaryPhone: p.primaryPhone,
        city: p.city,
        owner: {
          userId: ownerUser?.id ?? p.createdByUserId,
          name: ownerUser
            ? `${ownerUser.firstName} ${ownerUser.lastName}`.trim()
            : null,
          email: ownerUser?.email ?? null,
        },
        eventsCount: counts.total,
        pendingEventsCount: counts.pending,
        approvedEventsCount: counts.approved,
        createdAt: p.createdAt.toISOString(),
      };
    });

    if (query.hasPendingEvents) {
      items = items.filter((i) => i.pendingEventsCount > 0);
    }

    return {
      data: items,
      meta: {
        page,
        limit,
        total: query.hasPendingEvents ? items.length : total,
        totalPages: Math.ceil((query.hasPendingEvents ? items.length : total) / limit) || 1,
      },
    };
  }

  async getDetail(tenantId: string, producerId: string): Promise<AdminProducerDetail> {
    const profile = await this.prisma.producerProfile.findFirst({
      where: { id: producerId, tenantId },
      include: {
        memberships: {
          where: { membershipRole: 'OWNER' },
          take: 1,
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Producer not found',
      });
    }

    const counts = await this.getEventCounts(tenantId, producerId);
    const ownerMembership = profile.memberships[0];
    const ownerUser = ownerMembership?.user;

    return {
      id: profile.id,
      displayName: profile.displayName,
      status: this.toProfileStatus(profile.status),
      primaryEmail: profile.primaryEmail,
      primaryPhone: profile.primaryPhone,
      city: profile.city,
      legalName: profile.legalName,
      shortDescription: profile.shortDescription,
      longDescription: profile.longDescription,
      whatsapp: profile.whatsapp,
      secondaryEmail: profile.secondaryEmail,
      secondaryPhone: profile.secondaryPhone,
      slug: profile.slug,
      owner: {
        userId: ownerUser?.id ?? profile.createdByUserId,
        name: ownerUser
          ? `${ownerUser.firstName} ${ownerUser.lastName}`.trim()
          : null,
        email: ownerUser?.email ?? null,
      },
      eventsCount: counts.total,
      pendingEventsCount: counts.pending,
      approvedEventsCount: counts.approved,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
    };
  }

  async listEvents(
    tenantId: string,
    producerId: string,
  ): Promise<{ data: AdminProducerEventListItem[] }> {
    await this.assertProducer(tenantId, producerId);
    const ownerUserId = await this.resolveOwnerUserId(producerId);

    const events = await this.prisma.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { producerProfileId: producerId },
          ...(ownerUserId ? [{ producerId: ownerUserId, producerProfileId: null }] : []),
        ],
      },
      orderBy: { startAt: 'desc' },
      include: {
        ticketTypes: {
          where: { deletedAt: null },
          select: { id: true, status: true },
        },
      },
    });

    const ticketingEventIds = events
      .filter(
        (e) =>
          !e.isGeneralPublication && e.isTicketingEnabled && e.ticketTypes.length > 0,
      )
      .map((e) => e.id);

    const soldByEvent = new Map<string, number>();
    const revenueByEvent = new Map<string, string>();

    if (ticketingEventIds.length > 0) {
      const [soldGroups, revenueGroups] = await Promise.all([
        this.prisma.ticket.groupBy({
          by: ['eventId'],
          where: {
            eventId: { in: ticketingEventIds },
            status: { not: 'REVOKED' },
          },
          _count: { _all: true },
        }),
        this.prisma.order.groupBy({
          by: ['eventId'],
          where: { eventId: { in: ticketingEventIds }, status: 'PAID' },
          _sum: { totalAmount: true },
        }),
      ]);
      for (const g of soldGroups) soldByEvent.set(g.eventId, g._count._all);
      for (const g of revenueGroups) {
        revenueByEvent.set(
          g.eventId,
          g._sum.totalAmount != null ? String(g._sum.totalAmount) : '0',
        );
      }
    }

    const data: AdminProducerEventListItem[] = events.map((e) => {
      const activeTypes = e.ticketTypes.filter((t) => t.status === 'ACTIVE');
      const hasTicketing =
        !e.isGeneralPublication &&
        e.isTicketingEnabled &&
        e.ticketTypes.length > 0 &&
        activeTypes.length > 0;
      return {
        id: e.id,
        title: e.title,
        startAt: e.startAt.toISOString(),
        endAt: e.endAt?.toISOString() ?? null,
        city: e.city,
        venueName: e.venueName,
        status: this.toEventStatus(e.status),
        category: e.category,
        hasTicketing,
        isTicketingEnabled: e.isTicketingEnabled,
        isGeneralPublication: e.isGeneralPublication,
        eventMode: e.isGeneralPublication ? 'PUBLICITY_ONLY' : 'TICKETED',
        ticketTypesCount: e.ticketTypes.length,
        activeTicketTypesCount: activeTypes.length,
        ticketsSold: hasTicketing ? soldByEvent.get(e.id) ?? 0 : undefined,
        revenue: hasTicketing ? revenueByEvent.get(e.id) ?? '0' : undefined,
        ratingAvg: e.ratingAvg,
        ratingCount: e.ratingCount,
      };
    });

    return { data };
  }

  async getEventMetrics(
    tenantId: string,
    producerId: string,
    eventId: string,
  ): Promise<AdminProducerEventMetrics> {
    const event = await this.assertEventForProducer(tenantId, producerId, eventId);

    const ticketTypes = await this.prisma.ticketType.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, status: true, capacityAvailable: true },
    });
    const activeTypes = ticketTypes.filter((t) => t.status === 'ACTIVE');
    const hasTicketing =
      !event.isGeneralPublication &&
      event.isTicketingEnabled &&
      ticketTypes.length > 0 &&
      activeTypes.length > 0;
    const ticketsAvailable = ticketTypes.reduce(
      (sum, t) => sum + t.capacityAvailable,
      0,
    );

    const [favoriteCount, expectedCount] = await Promise.all([
      this.prisma.userFavorite.count({ where: { tenantId, entityId: eventId } }),
      this.prisma.userExpectedEvent.count({ where: { tenantId, eventId } }),
    ]);
    const engagement = {
      viewCount: event.viewCount,
      favoriteCount,
      expectedCount,
    };

    if (event.isGeneralPublication) {
      return {
        hasTicketing: false,
        isGeneralPublication: true,
        ticketTypesCount: 0,
        activeTicketTypesCount: 0,
        ticketsSold: 0,
        courtesyCount: 0,
        revenue: '0',
        currency: 'ARS',
        scanCount: 0,
        ticketsAvailable: 0,
        paidOrdersCount: 0,
        pendingOrdersCount: 0,
        expiredOrdersCount: 0,
        ratingAvg: event.ratingAvg,
        ratingCount: event.ratingCount,
        referralPerformance: [],
        ...engagement,
      };
    }

    if (!hasTicketing) {
      return {
        hasTicketing: false,
        isGeneralPublication: false,
        ticketTypesCount: ticketTypes.length,
        activeTicketTypesCount: activeTypes.length,
        ticketsSold: 0,
        courtesyCount: 0,
        revenue: '0',
        currency: 'ARS',
        scanCount: 0,
        ticketsAvailable: 0,
        paidOrdersCount: 0,
        pendingOrdersCount: 0,
        expiredOrdersCount: 0,
        ratingAvg: event.ratingAvg,
        ratingCount: event.ratingCount,
        referralPerformance: [],
        ...engagement,
      };
    }

    const base = await this.eventMetrics.getMetrics(tenantId, eventId);
    const [paidOrdersCount, pendingOrdersCount, expiredOrdersCount] = await Promise.all([
      this.prisma.order.count({ where: { eventId, status: 'PAID' } }),
      this.prisma.order.count({ where: { eventId, status: 'PENDING_PAYMENT' } }),
      this.prisma.order.count({ where: { eventId, status: 'EXPIRED' } }),
    ]);

    const attendanceRatePercent =
      base.ticketsSold > 0
        ? Math.round((base.scanCount / base.ticketsSold) * 1000) / 10
        : undefined;

    return {
      ...base,
      hasTicketing: true,
      ticketTypesCount: ticketTypes.length,
      activeTicketTypesCount: activeTypes.length,
      ticketsAvailable,
      paidOrdersCount,
      pendingOrdersCount,
      expiredOrdersCount,
      attendanceRatePercent,
      ratingAvg: event.ratingAvg,
      ratingCount: event.ratingCount,
    };
  }

  async approveProducerEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    producerId: string,
    eventId: string,
  ) {
    await this.assertEventForProducer(tenantId, producerId, eventId);
    return this.adminEvents.approveEvent(tenantId, actorId, actorRole, eventId);
  }

  async rejectProducerEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    producerId: string,
    eventId: string,
    reason: string,
  ) {
    await this.assertEventForProducer(tenantId, producerId, eventId);
    return this.adminEvents.rejectEvent(tenantId, actorId, actorRole, eventId, reason);
  }

  async postponeProducerEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    producerId: string,
    eventId: string,
    reason: string,
    newStartAt?: string,
  ) {
    await this.assertEventForProducer(tenantId, producerId, eventId);
    return this.adminEvents.postponeEvent(
      tenantId,
      actorId,
      actorRole,
      eventId,
      reason,
      newStartAt,
    );
  }

  async cancelProducerEvent(
    tenantId: string,
    actorId: string,
    actorRole: string,
    producerId: string,
    eventId: string,
    reason: string,
  ) {
    await this.assertEventForProducer(tenantId, producerId, eventId);
    return this.adminEvents.cancelEvent(tenantId, actorId, actorRole, eventId, reason);
  }

  private async getEventCounts(tenantId: string, producerId: string) {
    const ownerUserId = await this.resolveOwnerUserId(producerId);
    const rows = await this.prisma.event.groupBy({
      by: ['status'],
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { producerProfileId: producerId },
          ...(ownerUserId ? [{ producerId: ownerUserId, producerProfileId: null }] : []),
        ],
      },
      _count: { _all: true },
    });
    let total = 0;
    let pending = 0;
    let approved = 0;
    for (const r of rows) {
      total += r._count._all;
      if (r.status === 'PENDING') pending += r._count._all;
      if (r.status === 'APPROVED') approved += r._count._all;
    }
    return { total, pending, approved };
  }

  private async resolveOwnerUserId(producerId: string): Promise<string | null> {
    const membership = await this.prisma.userProducerMembership.findFirst({
      where: { profileId: producerId, membershipRole: 'OWNER' },
      select: { userId: true },
    });
    if (membership) return membership.userId;
    const profile = await this.prisma.producerProfile.findUnique({
      where: { id: producerId },
      select: { createdByUserId: true },
    });
    return profile?.createdByUserId ?? null;
  }

  private async assertProducer(tenantId: string, producerId: string) {
    const profile = await this.prisma.producerProfile.findFirst({
      where: { id: producerId, tenantId },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Producer not found',
      });
    }
    return profile;
  }

  private async assertEventForProducer(
    tenantId: string,
    producerId: string,
    eventId: string,
  ) {
    await this.assertProducer(tenantId, producerId);
    const ownerUserId = await this.resolveOwnerUserId(producerId);
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
        OR: [
          { producerProfileId: producerId },
          ...(ownerUserId ? [{ producerId: ownerUserId, producerProfileId: null }] : []),
        ],
      },
    });
    if (!event) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Event does not belong to this producer',
      });
    }
    return event;
  }
}
