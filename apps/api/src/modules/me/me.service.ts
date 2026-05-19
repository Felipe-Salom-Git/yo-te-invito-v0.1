import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MeResponse,
  MeTicketsResponse,
  MeTicketItem,
  MeOrdersResponse,
  MeOrdersQuery,
  UserPreferences,
  UserPreferencesPatch,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

const MAX_SAVED_EVENT_IDS = 100;

function normalizeEventIdList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of v) {
    if (typeof x !== 'string' || !x.trim()) continue;
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
    if (out.length >= MAX_SAVED_EVENT_IDS) break;
  }
  return out;
}

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  private mapTicketRow(t: {
    id: string;
    status: string;
    qrPayload: string;
    usedAt: Date | null;
    revokedAt: Date | null;
    ticketBatchId: string | null;
    event: { id: string; title: string; startAt: Date; venueName: string | null };
    ticketType: { id: string; name: string } | null;
  }): MeTicketItem {
    return {
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
      ticketBatchId: t.ticketBatchId ?? undefined,
    };
  }

  async getMe(tenantId: string, userId: string): Promise<MeResponse> {
    const [user, producerMemberships, gastroMemberships, hotelMemberships, referrerMemberships] =
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
        this.prisma.userHotelMembership.findMany({
          where: {
            userId,
            tenantId,
            OR: [
              { status: 'ACTIVE', profile: { status: 'ACTIVE' } },
              { status: 'PENDING', profile: { status: 'PENDING' } },
            ],
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
    const hotelProfiles = hotelMemberships.map((m) => ({
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
    const hasHotelAccess =
      hotelMemberships.some((m) => m.status === 'ACTIVE' && m.profile.status === 'ACTIVE') ||
      user.role === 'HOTEL_OWNER';
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
        hotel: { hasAccess: !!hasHotelAccess, profiles: hotelProfiles },
        referrer: { hasAccess: !!hasReferrerAccess, profiles: referrerProfiles },
      },
    };
  }

  async getMyTickets(tenantId: string, userId: string): Promise<MeTicketsResponse> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true },
    });

    const tickets = await this.prisma.ticket.findMany({
      where: {
        event: { deletedAt: null, tenantId },
        OR: [
          { ownerUserId: userId },
          {
            ownerUserId: null,
            order: {
              tenantId,
              status: 'PAID',
              buyerEmail: { equals: user.email, mode: 'insensitive' },
            },
          },
        ],
      },
      include: {
        event: { select: { id: true, title: true, startAt: true, venueName: true } },
        ticketType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      tickets: tickets.map((t) => this.mapTicketRow(t)),
    };
  }

  async getMyTicketById(
    tenantId: string,
    userId: string,
    ticketId: string,
  ): Promise<MeTicketItem> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true },
    });

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        event: { deletedAt: null, tenantId },
        OR: [
          { ownerUserId: userId },
          {
            ownerUserId: null,
            order: {
              tenantId,
              status: 'PAID',
              buyerEmail: { equals: user.email, mode: 'insensitive' },
            },
          },
        ],
      },
      include: {
        event: { select: { id: true, title: true, startAt: true, venueName: true } },
        ticketType: { select: { id: true, name: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    return this.mapTicketRow(ticket);
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
      favoriteEventIds: normalizeEventIdList(prefs.favoriteEventIds),
      expectedEventIds: normalizeEventIdList(prefs.expectedEventIds),
    };
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    patch: UserPreferencesPatch,
  ): Promise<UserPreferences> {
    const user = await this.prisma.user.findFirstOrThrow({
      where: { id: userId, tenantId, deletedAt: null },
      select: { preferences: true },
    });
    const prev = (user.preferences as Record<string, unknown> | null) ?? {};
    const next: Record<string, unknown> = { ...prev };

    if (patch.preferredCity !== undefined) {
      next.preferredCity = patch.preferredCity;
    }
    if (patch.notifyNewEvents !== undefined) {
      next.notifyNewEvents = patch.notifyNewEvents;
    }
    if (patch.notifyReminders !== undefined) {
      next.notifyReminders = patch.notifyReminders;
    }
    if (patch.favoriteEventIds !== undefined) {
      next.favoriteEventIds = normalizeEventIdList(patch.favoriteEventIds);
    }
    if (patch.expectedEventIds !== undefined) {
      next.expectedEventIds = normalizeEventIdList(patch.expectedEventIds);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: next as Prisma.InputJsonValue },
    });
    return this.getPreferences(tenantId, userId);
  }
}
