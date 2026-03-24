import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MeResponse,
  MeTicketsResponse,
  MeOrdersResponse,
  MeOrdersQuery,
  UserPreferences,
  UserPreferencesPatch,
} from '@yo-te-invito/shared';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(tenantId: string, userId: string): Promise<MeResponse> {
    const [user, producerMemberships, gastroMemberships, referrerMemberships] =
      await Promise.all([
        this.prisma.user.findFirstOrThrow({
          where: { id: userId, tenantId, deletedAt: null },
          select: {
            id: true,
            tenantId: true,
            email: true,
            role: true,
            status: true,
            firstName: true,
            lastName: true,
          },
        }),
        this.prisma.userProducerMembership.findMany({
          where: {
            userId,
            tenantId,
            status: 'ACTIVE',
            profile: { status: 'ACTIVE' },
          },
          include: { profile: { select: { id: true, displayName: true, status: true } } },
        }),
        this.prisma.userGastroMembership.findMany({
          where: {
            userId,
            tenantId,
            status: 'ACTIVE',
            profile: { status: 'ACTIVE' },
          },
          include: { profile: { select: { id: true, displayName: true, status: true } } },
        }),
        this.prisma.userReferrerMembership.findMany({
          where: {
            userId,
            tenantId,
            status: 'ACTIVE',
            profile: { status: 'ACTIVE' },
          },
          include: { profile: { select: { id: true, displayName: true, status: true } } },
        }),
      ]);

    const producerProfiles = producerMemberships.map((m) => ({
      id: m.profile.id,
      displayName: m.profile.displayName,
      status: m.profile.status,
      membershipRole: m.membershipRole,
    }));
    const gastroProfiles = gastroMemberships.map((m) => ({
      id: m.profile.id,
      displayName: m.profile.displayName,
      status: m.profile.status,
      membershipRole: m.membershipRole,
    }));
    const referrerProfiles = referrerMemberships.map((m) => ({
      id: m.profile.id,
      displayName: m.profile.displayName,
      status: m.profile.status,
      membershipRole: m.membershipRole,
    }));

    const hasProducerAccess =
      producerProfiles.length > 0 ||
      user.role === 'PRODUCER_OWNER' ||
      user.role === 'PRODUCER_STAFF';
    const hasGastroAccess =
      gastroProfiles.length > 0 || user.role === 'GASTRO_OWNER';
    const hasReferrerAccess =
      referrerProfiles.length > 0 || user.role === 'REFERRER';

    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      status: user.status,
      firstName: user.firstName,
      lastName: user.lastName,
      availableProfiles: {
        tickets: true,
        producer: { hasAccess: !!hasProducerAccess, profiles: producerProfiles },
        gastro: { hasAccess: !!hasGastroAccess, profiles: gastroProfiles },
        referrer: { hasAccess: !!hasReferrerAccess, profiles: referrerProfiles },
      },
    };
  }

  async getMyTickets(tenantId: string, userId: string): Promise<MeTicketsResponse> {
    const tickets = await this.prisma.ticket.findMany({
      where: { ownerUserId: userId, event: { deletedAt: null } },
      include: {
        event: { select: { id: true, title: true, startAt: true, venueName: true } },
        ticketType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      tickets: tickets.map((t) => ({
        ticketId: t.id,
        status: t.status,
        qrPayload: t.qrPayload,
        usedAt: t.usedAt?.toISOString() ?? null,
        revokedAt: t.revokedAt?.toISOString() ?? null,
        event: {
          id: t.event.id,
          title: t.event.title,
          startAt: t.event.startAt.toISOString(),
          venueName: t.event.venueName,
        },
        ticketType: {
          id: t.ticketType?.id ?? '',
          name: t.ticketType?.name ?? 'Unknown',
        },
      })),
    };
  }

  async getMyOrders(
    tenantId: string,
    userId: string,
    query: MeOrdersQuery,
  ): Promise<MeOrdersResponse> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true },
    });

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        buyerEmail: user.email,
      },
      select: {
        id: true,
        eventId: true,
        status: true,
        buyerEmail: true,
        totalAmount: true,
        currency: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      orders: orders.map((o) => ({
        id: o.id,
        eventId: o.eventId,
        status: o.status,
        buyerEmail: o.buyerEmail,
        totalAmount: o.totalAmount.toString(),
        currency: o.currency,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  async getPreferences(
    tenantId: string,
    userId: string,
  ): Promise<UserPreferences> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, preferences: true },
    });
    const prefs = (user.preferences as Record<string, unknown> | null) ?? {};
    return {
      userId: user.id,
      preferredCity:
        typeof prefs.preferredCity === 'string' ? prefs.preferredCity : null,
      notifyNewEvents:
        typeof prefs.notifyNewEvents === 'boolean' ? prefs.notifyNewEvents : true,
      notifyReminders:
        typeof prefs.notifyReminders === 'boolean' ? prefs.notifyReminders : true,
    };
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    patch: UserPreferencesPatch,
  ): Promise<UserPreferences> {
    const current = await this.getPreferences(tenantId, userId);
    const next = {
      preferredCity: patch.preferredCity ?? current.preferredCity,
      notifyNewEvents: patch.notifyNewEvents ?? current.notifyNewEvents,
      notifyReminders: patch.notifyReminders ?? current.notifyReminders,
    };
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: next },
    });
    return { ...next, userId };
  }
}
