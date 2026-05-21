import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserCartService } from './user-cart.service';
import { readPortalPreferences } from './user-portal-preferences.util';
import { eventCategoryToReviewCategory } from '../reviews/review-public.util';
import type { MeDashboardResponse, MeTicketItem } from '@yo-te-invito/shared';
import { getContentDetailPath } from './user-portal-links.util';
import { MeRecommendationsService } from './me-recommendations.service';

@Injectable()
export class MeDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: UserCartService,
    private readonly recommendations: MeRecommendationsService,
  ) {}

  private mapTicket(t: {
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
        name: t.ticketType?.name ?? 'Entrada',
      },
      ticketBatchId: t.ticketBatchId ?? undefined,
    };
  }

  private async loadOwnedTickets(tenantId: string, userId: string, email: string) {
    return this.prisma.ticket.findMany({
      where: {
        event: { tenantId, deletedAt: null },
        OR: [
          { ownerUserId: userId },
          {
            ownerUserId: null,
            order: {
              tenantId,
              status: 'PAID',
              buyerEmail: { equals: email, mode: 'insensitive' },
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
            category: true,
          },
        },
        ticketType: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDashboard(tenantId: string, userId: string): Promise<MeDashboardResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true, preferences: true },
    });
    if (!user) {
      return {
        stats: {
          activeTicketsCount: 0,
          upcomingExperiencesCount: 0,
          pendingReviewsCount: 0,
          favoritesCount: 0,
          followedProducersCount: 0,
          attendedEventsCount: 0,
        },
        nextExperience: null,
        pendingReviews: [],
        recentFavorites: [],
        recommendedEvents: [],
        cartSummary: { itemCount: 0, subtotal: '0', hasItems: false },
        recentTickets: [],
      };
    }

    const now = new Date();
    const tickets = await this.loadOwnedTickets(tenantId, userId, user.email);

    const activeTickets = tickets.filter(
      (t) => t.status === 'VALID' || t.status === 'TRANSFER_PENDING',
    );
    const upcoming = activeTickets.filter((t) => t.event.startAt > now);
    const usedEventIds = [...new Set(tickets.filter((t) => t.status === 'USED').map((t) => t.eventId))];

    const userReviews = await this.prisma.review.findMany({
      where: { tenantId, userId },
      select: { eventId: true },
    });
    const reviewedEventIds = new Set(userReviews.map((r) => r.eventId));

    const pendingReviews = tickets
      .filter((t) => t.status === 'USED' && !reviewedEventIds.has(t.eventId))
      .reduce(
        (acc, t) => {
          if (acc.some((x) => x.eventId === t.eventId)) return acc;
          acc.push({
            eventId: t.event.id,
            title: t.event.title,
            category: eventCategoryToReviewCategory(t.event.category),
            entityId: t.event.id,
            attendedAt: t.usedAt?.toISOString() ?? null,
          });
          return acc;
        },
        [] as MeDashboardResponse['pendingReviews'],
      );

    const [favoritesCount, followedProducersCount, cart, recentFavoriteRows, recPreview] =
      await Promise.all([
        this.prisma.userFavorite.count({ where: { tenantId, userId } }),
        this.prisma.userProducerFollow.count({ where: { tenantId, userId } }),
        this.cartService.getCart(tenantId, userId).catch(() => null),
        this.prisma.userFavorite.findMany({
          where: { tenantId, userId },
          orderBy: { createdAt: 'desc' },
          take: 3,
        }),
        this.recommendations.getDashboardPreview(tenantId, userId).catch(() => ({
          events: [],
          followedProducersCount: 0,
        })),
      ]);

    let nextExperience: MeDashboardResponse['nextExperience'] = null;
    if (upcoming.length > 0) {
      const sorted = [...upcoming].sort(
        (a, b) => a.event.startAt.getTime() - b.event.startAt.getTime(),
      );
      const t = sorted[0]!;
      const hoursUntilStart =
        (t.event.startAt.getTime() - now.getTime()) / (1000 * 60 * 60);
      nextExperience = {
        eventId: t.event.id,
        title: t.event.title,
        startAt: t.event.startAt.toISOString(),
        venueName: t.event.venueName,
        category: t.event.category ?? 'event',
        ticketId: t.id,
        hoursUntilStart: Math.max(0, Math.round(hoursUntilStart * 10) / 10),
      };
    }

    const favCards = await Promise.all(
      recentFavoriteRows.map(async (f) => {
        const event = await this.prisma.event.findFirst({
          where: {
            id:
              f.entityType === 'gastro'
                ? (
                    await this.prisma.gastroProfile.findFirst({
                      where: { id: f.entityId },
                      select: { publicEventId: true },
                    })
                  )?.publicEventId ?? f.entityId
                : f.entityId,
            tenantId,
          },
          select: { id: true, title: true, coverImageUrl: true, category: true },
        });
        return {
          id: f.id,
          entityType: f.entityType,
          entityId: f.entityId,
          category: f.category as MeDashboardResponse['recentFavorites'][0]['category'],
          title: event?.title,
          imageUrl: event?.coverImageUrl ?? null,
          href: event
            ? getContentDetailPath(event.category, event.id)
            : undefined,
        };
      }),
    );

    return {
      stats: {
        activeTicketsCount: activeTickets.length,
        upcomingExperiencesCount: upcoming.length,
        pendingReviewsCount: pendingReviews.length,
        favoritesCount,
        followedProducersCount: recPreview.followedProducersCount ?? followedProducersCount,
        attendedEventsCount: usedEventIds.length,
      },
      nextExperience,
      pendingReviews,
      recentFavorites: favCards,
      recommendedEvents: recPreview.events,
      cartSummary: {
        itemCount: cart?.itemCount ?? 0,
        subtotal: cart?.subtotal ?? '0',
        hasItems: (cart?.itemCount ?? 0) > 0,
      },
      recentTickets: activeTickets.slice(0, 5).map((t) => this.mapTicket(t)),
    };
  }
}
