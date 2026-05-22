import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import type { ProducerDashboardMetricsResponse } from '@yo-te-invito/shared';

function isEventPast(startAt: Date, endAt: Date | null, now: Date): boolean {
  const end = endAt ?? startAt;
  return end < now;
}

function isEventActive(startAt: Date, endAt: Date | null, now: Date): boolean {
  const end = endAt ?? startAt;
  return startAt <= now && end >= now;
}

function isEventFuture(startAt: Date, now: Date): boolean {
  return startAt > now;
}

function interestRate(
  views: number,
  favorites: number,
  expected: number,
): number | null {
  if (views <= 0) return null;
  return Math.round(((favorites + expected) / views) * 1000) / 10;
}

@Injectable()
export class ProducerDashboardMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profilesAuth: ProfilesAuthorizationService,
  ) {}

  async getDashboard(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<ProducerDashboardMetricsResponse> {
    const producerProfileId = await this.profilesAuth.getDefaultProducerProfileId(
      tenantId,
      userId,
    );

    const empty: ProducerDashboardMetricsResponse = {
      events: { total: 0, active: 0, upcoming: 0, past: 0 },
      sales: { ticketsSold: 0, revenue: null },
      engagement: {
        totalEventViews: 0,
        totalEventFavorites: 0,
        totalEventExpected: 0,
        profileViews: 0,
        producerFollowers: 0,
      },
      topEvents: [],
      eventEngagement: [],
    };

    if (!producerProfileId) {
      return empty;
    }

    const where = await this.buildEventsWhere(tenantId, userId, userRole, producerProfileId);
    const now = new Date();

    const events = await this.prisma.event.findMany({
      where,
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        status: true,
        viewCount: true,
      },
      orderBy: { startAt: 'desc' },
    });

    const eventIds = events.map((e) => e.id);
    let active = 0;
    let upcoming = 0;
    let past = 0;
    for (const e of events) {
      if (isEventFuture(e.startAt, now)) upcoming += 1;
      else if (isEventActive(e.startAt, e.endAt, now)) active += 1;
      else if (isEventPast(e.startAt, e.endAt, now)) past += 1;
    }

    const [
      profile,
      followerCount,
      favoriteCounts,
      expectedCounts,
      ticketsSold,
      revenueResult,
      reviewSummary,
    ] = await Promise.all([
      this.prisma.producerProfile.findFirst({
        where: { id: producerProfileId, tenantId },
        select: { viewCount: true },
      }),
      this.prisma.userProducerFollow.count({
        where: { tenantId, producerProfileId },
      }),
      eventIds.length > 0
        ? this.prisma.userFavorite.groupBy({
            by: ['entityId'],
            where: { tenantId, entityId: { in: eventIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      eventIds.length > 0
        ? this.prisma.userExpectedEvent.groupBy({
            by: ['eventId'],
            where: { tenantId, eventId: { in: eventIds } },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      eventIds.length > 0
        ? this.prisma.ticket.count({
            where: { eventId: { in: eventIds }, status: { not: 'REVOKED' } },
          })
        : Promise.resolve(0),
      eventIds.length > 0
        ? this.prisma.order.aggregate({
            where: { eventId: { in: eventIds }, status: 'PAID' },
            _sum: { totalAmount: true },
          })
        : Promise.resolve({ _sum: { totalAmount: null } }),
      this.getReviewsSummary(tenantId, eventIds),
    ]);

    const favByEvent = new Map(
      favoriteCounts.map((r) => [r.entityId, r._count._all]),
    );
    const expByEvent = new Map(
      expectedCounts.map((r) => [r.eventId, r._count._all]),
    );

    const totalEventViews = events.reduce((s, e) => s + e.viewCount, 0);
    const totalEventFavorites = [...favByEvent.values()].reduce((s, n) => s + n, 0);
    const totalEventExpected = [...expByEvent.values()].reduce((s, n) => s + n, 0);

    const eventEngagement = events.map((e) => ({
      id: e.id,
      viewCount: e.viewCount,
      favoriteCount: favByEvent.get(e.id) ?? 0,
      expectedCount: expByEvent.get(e.id) ?? 0,
    }));

    const topEvents = [...events]
      .map((e) => {
        const favoriteCount = favByEvent.get(e.id) ?? 0;
        const expectedCount = expByEvent.get(e.id) ?? 0;
        const viewCount = e.viewCount;
        return {
          id: e.id,
          title: e.title,
          startAt: e.startAt.toISOString(),
          status: e.status,
          viewCount,
          favoriteCount,
          expectedCount,
          interestRate: interestRate(viewCount, favoriteCount, expectedCount),
          _score: viewCount + favoriteCount * 2 + expectedCount * 2,
        };
      })
      .sort((a, b) => b._score - a._score)
      .slice(0, 5)
      .map(({ _score: _s, ...rest }) => rest);

    const revenueRaw = revenueResult._sum.totalAmount;
    const revenue =
      revenueRaw != null && eventIds.length > 0 ? String(revenueRaw) : null;

    return {
      events: {
        total: events.length,
        active,
        upcoming,
        past,
      },
      sales: {
        ticketsSold,
        revenue,
        currency: revenue != null ? 'ARS' : undefined,
      },
      engagement: {
        totalEventViews,
        totalEventFavorites,
        totalEventExpected,
        profileViews: profile?.viewCount ?? 0,
        producerFollowers: followerCount,
      },
      reviews: reviewSummary,
      topEvents,
      eventEngagement,
    };
  }

  private async buildEventsWhere(
    tenantId: string,
    userId: string,
    userRole: string,
    producerProfileId: string,
  ) {
    const where: {
      tenantId: string;
      deletedAt: null;
      OR?: Array<{ producerId: string } | { producerProfileId: string }>;
      producerProfileId?: string;
    } = { tenantId, deletedAt: null };

    if (userRole === 'ADMIN') {
      where.producerProfileId = producerProfileId;
    } else {
      where.OR = [{ producerId: userId }, { producerProfileId }];
    }
    return where;
  }

  private async getReviewsSummary(tenantId: string, eventIds: string[]) {
    if (eventIds.length === 0) {
      return { averageRating: null, totalReviews: 0 };
    }
    const rows = await this.prisma.review.findMany({
      where: { tenantId, eventId: { in: eventIds } },
      select: { overallRating: true, score: true },
    });
    if (rows.length === 0) {
      return { averageRating: null, totalReviews: 0 };
    }
    const sum = rows.reduce(
      (s, r) => s + (r.overallRating ?? (r.score <= 5 ? r.score * 2 : r.score)),
      0,
    );
    return {
      averageRating: Math.round((sum / rows.length) * 10) / 10,
      totalReviews: rows.length,
    };
  }
}
