import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  MeResponse,
  MeTicketsResponse,
  MeTicketItem,
  MeTicketDetail,
  MeOrdersResponse,
  MeOrdersQuery,
  UserPortalPreferences,
  UserPortalPreferencesPatch,
  PatchTicketReminderBody,
  TicketTransferOfferSummary,
  TicketTemplateResponse,
} from '@yo-te-invito/shared';
import {
  readPortalPreferences,
  mergePortalPreferencesPatch,
  isTicketReminderEnabled,
} from './user-portal-preferences.util';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class MeService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireUser<T extends Prisma.UserSelect>(
    tenantId: string,
    userId: string,
    select: T,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select,
    });
    if (!user) {
      throw new UnauthorizedException({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Session invalid — user not found',
      });
    }
    return user;
  }

  private mapTicketRow(t: {
    id: string;
    status: string;
    qrPayload: string;
    usedAt: Date | null;
    revokedAt: Date | null;
    ticketBatchId: string | null;
    occurrence?: {
      startAt: Date;
      endAt: Date | null;
      venueName: string | null;
    } | null;
    event: {
      id: string;
      title: string;
      startAt: Date;
      venueName: string | null;
      city?: string | null;
    };
    ticketType: { id: string; name: string } | null;
  }): MeTicketItem {
    const displayStart = t.occurrence?.startAt ?? t.event.startAt;
    return {
      ticketId: t.id,
      status: t.status,
      qrPayload: t.qrPayload,
      usedAt: t.usedAt?.toISOString() ?? null,
      revokedAt: t.revokedAt?.toISOString() ?? null,
      event: {
        id: t.event.id,
        title: t.event.title,
        startAt: displayStart.toISOString(),
        venueName: t.occurrence?.venueName ?? t.event.venueName,
        city: t.event.city ?? null,
        occurrenceStartAt: t.occurrence?.startAt.toISOString() ?? null,
        occurrenceEndAt: t.occurrence?.endAt?.toISOString() ?? null,
        occurrenceVenueName: t.occurrence?.venueName ?? null,
      },
      ticketType: {
        id: t.ticketType?.id ?? '',
        name: t.ticketType?.name ?? 'Unknown',
      },
      ticketBatchId: t.ticketBatchId ?? undefined,
    };
  }

  async getMe(tenantId: string, userId: string): Promise<MeResponse> {
    const user = await this.requireUser(tenantId, userId, {
      id: true,
      tenantId: true,
      email: true,
      role: true,
      status: true,
      firstName: true,
      lastName: true,
    });

    const [producerMemberships, gastroMemberships, hotelMemberships, referrerMemberships] =
      await Promise.all([
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
    const user = await this.requireUser(tenantId, userId, { email: true });

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
        event: {
          select: { id: true, title: true, startAt: true, venueName: true, city: true },
        },
        ticketType: { select: { id: true, name: true } },
        occurrence: {
          select: { startAt: true, endAt: true, venueName: true },
        },
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
    const user = await this.requireUser(tenantId, userId, { email: true });

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
        event: {
          select: { id: true, title: true, startAt: true, venueName: true, city: true },
        },
        ticketType: { select: { id: true, name: true } },
        occurrence: {
          select: { startAt: true, endAt: true, venueName: true },
        },
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
    const user = await this.requireUser(tenantId, userId, { email: true });

    const orders = await this.prisma.order.findMany({
      where: {
        tenantId,
        OR: [{ buyerUserId: userId }, { buyerEmail: user.email }],
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
  ): Promise<UserPortalPreferences> {
    const user = await this.requireUser(tenantId, userId, { id: true, preferences: true });
    return readPortalPreferences(user.id, user.preferences);
  }

  async updatePreferences(
    tenantId: string,
    userId: string,
    patch: UserPortalPreferencesPatch,
  ): Promise<UserPortalPreferences> {
    const user = await this.requireUser(tenantId, userId, { preferences: true });
    const merged = mergePortalPreferencesPatch(user.preferences, patch);
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: merged },
    });
    return this.getPreferences(tenantId, userId);
  }

  async patchTicketReminder(
    tenantId: string,
    userId: string,
    ticketId: string,
    body: PatchTicketReminderBody,
  ): Promise<{ ticketId: string; reminderEnabled: boolean }> {
    await this.getMyTicketById(tenantId, userId, ticketId);
    const user = await this.requireUser(tenantId, userId, { preferences: true });
    const prefs = readPortalPreferences(userId, user.preferences);
    const overrides = { ...prefs.ticketReminderOverrides };
    if (body.enabled) {
      delete overrides[ticketId];
    } else {
      overrides[ticketId] = false;
    }
    const merged = mergePortalPreferencesPatch(user.preferences, {
      ticketReminderOverrides: overrides,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferences: merged },
    });
    const next = readPortalPreferences(userId, merged as Prisma.JsonValue);
    return {
      ticketId,
      reminderEnabled: isTicketReminderEnabled(next, ticketId),
    };
  }

  private mapTicketTemplateForBuyer(
    row: {
      id: string;
      tenantId: string;
      name: string;
      canvasWidth: number;
      canvasHeight: number;
      backgroundType: string;
      backgroundValue: string;
      elementsJson: unknown;
      qrZoneJson: unknown;
      version: number;
      createdAt: Date;
      updatedAt: Date;
    },
    ticketTypeId: string,
  ): TicketTemplateResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      ticketTypeId,
      name: row.name,
      canvasWidth: row.canvasWidth,
      canvasHeight: row.canvasHeight,
      backgroundType: row.backgroundType,
      backgroundValue: row.backgroundValue,
      elementsJson: Array.isArray(row.elementsJson) ? row.elementsJson : [],
      qrZoneJson: row.qrZoneJson,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getMyTicketDetail(
    tenantId: string,
    userId: string,
    ticketId: string,
  ): Promise<MeTicketDetail> {
    const user = await this.requireUser(tenantId, userId, {
      email: true,
      firstName: true,
      lastName: true,
      preferences: true,
    });
    const prefs = readPortalPreferences(userId, user.preferences);

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
        event: {
          select: {
            id: true,
            title: true,
            startAt: true,
            venueName: true,
            city: true,
            category: true,
            endAt: true,
          },
        },
        ticketType: {
          select: {
            id: true,
            name: true,
            ticketTemplate: true,
          },
        },
        ticketBatch: { select: { name: true } },
        order: { select: { id: true } },
        ownerUser: { select: { firstName: true, lastName: true } },
        activeTransferOffer: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    const eventEnd = ticket.event.endAt ?? ticket.event.startAt;
    const eventNotPast = eventEnd >= new Date();

    const canTransfer =
      ticket.status === 'VALID' &&
      !ticket.usedAt &&
      !ticket.revokedAt &&
      !ticket.activeTransferOffer &&
      eventNotPast;

    const transferOffer: TicketTransferOfferSummary | null = ticket.activeTransferOffer
      ? {
          id: ticket.activeTransferOffer.id,
          status: ticket.activeTransferOffer.status as TicketTransferOfferSummary['status'],
          sourceTicketId: ticket.activeTransferOffer.sourceTicketId,
          destinationTicketId: ticket.activeTransferOffer.destinationTicketId,
          sellerUserId: ticket.activeTransferOffer.sellerUserId,
          buyerUserId: ticket.activeTransferOffer.buyerUserId,
          acceptToken: ticket.activeTransferOffer.acceptToken,
          expiresAt: ticket.activeTransferOffer.expiresAt.toISOString(),
          completedAt: ticket.activeTransferOffer.completedAt?.toISOString() ?? null,
          cancelledAt: ticket.activeTransferOffer.cancelledAt?.toISOString() ?? null,
          rejectedAt: ticket.activeTransferOffer.rejectedAt?.toISOString() ?? null,
          message: ticket.activeTransferOffer.message ?? null,
          createdAt: ticket.activeTransferOffer.createdAt.toISOString(),
        }
      : null;

    const holderFromOwner = ticket.ownerUser
      ? `${ticket.ownerUser.firstName} ${ticket.ownerUser.lastName}`.trim()
      : null;

    const templateRow = ticket.ticketType?.ticketTemplate;
    const ticketTemplate = templateRow
      ? this.mapTicketTemplateForBuyer(templateRow, ticket.ticketType!.id)
      : null;

    return {
      ...this.mapTicketRow(ticket),
      source: ticket.source,
      reminderEnabled: isTicketReminderEnabled(prefs, ticketId),
      canTransfer,
      transferOffer,
      category: ticket.event.category ?? undefined,
      orderId: ticket.orderId ?? ticket.order?.id ?? null,
      holderName: holderFromOwner || `${user.firstName} ${user.lastName}`.trim() || null,
      batchName: ticket.ticketBatch?.name ?? null,
      ticketTemplate,
    };
  }
}
