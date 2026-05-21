import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mergePublicEventVisibility } from '../../common/utils/event-public-visibility.util';
import { readPortalPreferences } from './user-portal-preferences.util';
import type { EventSummary, MeRecommendationsQuery, MeRecommendationsResponse } from '@yo-te-invito/shared';

const recommendationEventSelect = {
  id: true,
  title: true,
  startAt: true,
  city: true,
  venueName: true,
  coverImageUrl: true,
  category: true,
  subcategoryId: true,
  description: true,
  ratingAvg: true,
  ratingCount: true,
  producerProfileId: true,
  producerProfile: { select: { displayName: true } },
  isTicketingEnabled: true,
  isGeneralPublication: true,
  ticketTypes: {
    where: { deletedAt: null, status: 'ACTIVE' as const },
    select: { id: true },
    take: 1,
  },
} satisfies Prisma.EventSelect;

type RecommendationEventRow = Prisma.EventGetPayload<{
  select: typeof recommendationEventSelect;
}>;

@Injectable()
export class MeRecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  private publicWhere(base: Prisma.EventWhereInput): Prisma.EventWhereInput {
    return mergePublicEventVisibility(base);
  }

  private mapEvent(e: RecommendationEventRow): EventSummary & { producerDisplayName?: string } {
    const hasTicketing =
      e.isTicketingEnabled && !e.isGeneralPublication && e.ticketTypes.length > 0;
    return {
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      city: e.city,
      venueName: e.venueName,
      coverImageUrl: e.coverImageUrl,
      category: e.category,
      subcategoryId: e.subcategoryId,
      description: e.description,
      ratingAvg: e.ratingAvg,
      ratingCount: e.ratingCount,
      hasTicketing,
      producerDisplayName: e.producerProfile?.displayName,
    };
  }

  async getRecommendations(
    tenantId: string,
    userId: string,
    query: MeRecommendationsQuery,
  ): Promise<MeRecommendationsResponse> {
    const limit = query.limit;
    const now = new Date();

    const follows = await this.prisma.userProducerFollow.findMany({
      where: { tenantId, userId },
      select: { producerProfileId: true },
    });
    const producerIds = follows.map((f) => f.producerProfileId);

    const fromFollowed: Array<EventSummary & { producerDisplayName?: string }> = [];
    if (producerIds.length > 0) {
      const rows = await this.prisma.event.findMany({
        where: this.publicWhere({
          tenantId,
          status: 'APPROVED',
          deletedAt: null,
          startAt: { gt: now },
          producerProfileId: { in: producerIds },
        }),
        select: recommendationEventSelect,
        orderBy: [{ startAt: 'asc' }, { rankingScore: 'desc' }],
        take: limit,
      });
      fromFollowed.push(...rows.map((e) => this.mapEvent(e)));
    }

    const excludeIds = new Set(fromFollowed.map((e) => e.id));
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { preferences: true },
    });
    const prefs = readPortalPreferences(userId, user?.preferences ?? null);
    const categories = prefs.favoriteCategories;

    const forYouWhere = this.publicWhere({
      tenantId,
      status: 'APPROVED',
      deletedAt: null,
      startAt: { gt: now },
      id: { notIn: [...excludeIds] },
      ...(categories.length > 0 ? { category: { in: categories } } : {}),
    });

    const forYouRows = await this.prisma.event.findMany({
      where: forYouWhere,
      select: recommendationEventSelect,
      orderBy: [{ rankingScore: 'desc' }, { ratingCount: 'desc' }, { startAt: 'asc' }],
      take: Math.max(0, limit - fromFollowed.length) || limit,
    });

    return {
      fromFollowedProducers: fromFollowed,
      forYou: forYouRows.map((e) => this.mapEvent(e)),
      followedProducersCount: producerIds.length,
    };
  }

  /** Up to 6 events for dashboard preview */
  async getDashboardPreview(tenantId: string, userId: string) {
    const rec = await this.getRecommendations(tenantId, userId, { limit: 6 });
    const merged = [...rec.fromFollowedProducers, ...rec.forYou].slice(0, 6);
    return { events: merged, followedProducersCount: rec.followedProducersCount };
  }
}
