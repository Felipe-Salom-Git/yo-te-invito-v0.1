import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ReviewReplyAuthorType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { AuditService } from '../audit/audit.service';
import { ReviewNotificationsService } from '../notifications/review-notifications.service';
import { ReviewRankingService } from './review-ranking.service';
import { ReviewReputationService } from './review-reputation.service';
import {
  applyPublicReviewListFilters,
  buildPublicReviewItem,
  eventCategoryToReviewCategory,
  legacyScoreFromOverall,
  publicReviewListOrderBy,
  publicReviewVisibleWhere,
  readOverallRating,
  syncHiddenFlags,
} from './review-public.util';
import {
  ErrorCode,
  createPublicReviewBodyForCategorySchema,
  parseAspectRatingsForCategory,
  type CreatePublicReviewBody,
  type PublicReviewCategory,
  type PublicReviewItemV2,
  type PublicReviewReply,
  type PublicReviewsListQuery,
  type ReviewEntitySummaryQuery,
  type ReviewReplyBody,
  type UserPublicReviewsQuery,
} from '@yo-te-invito/shared';
import { mergePublicEventVisibility } from '../../common/utils/event-public-visibility.util';

@Injectable()
export class PublicReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly ranking: ReviewRankingService,
    private readonly reputation: ReviewReputationService,
    private readonly audit: AuditService,
    private readonly reviewNotifications: ReviewNotificationsService,
  ) {}

  private displayName(user: {
    firstName: string;
    lastName: string;
    email: string;
  }): string {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  /** Public reviewer profile — never falls back to email. */
  private publicDisplayName(user: { firstName: string; lastName: string }): string {
    const name = `${user.firstName} ${user.lastName}`.trim();
    return name || 'Comentarista';
  }

  private async buildUserPublicProfileStats(
    tenantId: string,
    userId: string,
  ): Promise<{
    averageOverallRating: number | null;
    categoriesCommented: PublicReviewCategory[];
    reviewsWithOfficialReplyCount: number;
  }> {
    const rows = await this.prisma.review.findMany({
      where: { tenantId, userId, ...publicReviewVisibleWhere },
      select: {
        overallRating: true,
        score: true,
        officialReply: true,
        event: { select: { category: true } },
      },
    });

    if (rows.length === 0) {
      return {
        averageOverallRating: null,
        categoriesCommented: [],
        reviewsWithOfficialReplyCount: 0,
      };
    }

    let ratingSum = 0;
    let withReply = 0;
    const categories = new Set<PublicReviewCategory>();

    for (const row of rows) {
      ratingSum += readOverallRating(row);
      categories.add(eventCategoryToReviewCategory(row.event.category));
      if (row.officialReply?.trim()) withReply += 1;
    }

    return {
      averageOverallRating: Math.round((ratingSum / rows.length) * 10) / 10,
      categoriesCommented: [...categories],
      reviewsWithOfficialReplyCount: withReply,
    };
  }

  private mapReply(review: {
    officialReply: string | null;
    replyAuthorType: ReviewReplyAuthorType | null;
    replyCreatedAt: Date | null;
    replyUpdatedAt: Date | null;
  }, authorDisplayName: string): PublicReviewReply | null {
    if (!review.officialReply?.trim()) return null;
    return {
      body: review.officialReply,
      authorType: review.replyAuthorType ?? 'PRODUCER',
      authorDisplayName,
      createdAt: (review.replyCreatedAt ?? new Date()).toISOString(),
      updatedAt: review.replyUpdatedAt?.toISOString() ?? null,
    };
  }

  async createForAuthenticatedUser(
    user: { id: string; tenantId: string },
    eventId: string,
    body: CreatePublicReviewBody,
  ): Promise<{ id: string }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    if (user.tenantId !== event.tenantId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot review events from another tenant',
      });
    }

    const category = eventCategoryToReviewCategory(event.category);
    const parsed = createPublicReviewBodyForCategorySchema(category).safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: parsed.error.errors[0]?.message ?? 'Invalid review body',
        details: parsed.error.flatten(),
      });
    }

    let aspectRatings: Record<string, number>;
    try {
      aspectRatings = parseAspectRatingsForCategory(
        category,
        parsed.data.aspectRatings,
      );
    } catch (e) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: e instanceof Error ? e.message : 'Invalid aspectRatings',
      });
    }

    const existing = await this.prisma.review.findFirst({
      where: { eventId, userId: user.id },
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'You have already reviewed this entity',
      });
    }

    const overallRating = parsed.data.overallRating;
    const legacyScore = legacyScoreFromOverall(overallRating);

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          tenantId: event.tenantId,
          eventId,
          userId: user.id,
          score: legacyScore,
          overallRating,
          aspectRatings: aspectRatings as object,
          title: parsed.data.title ?? null,
          comment: parsed.data.comment,
          guestName: null,
          status: 'VISIBLE',
          hiddenFromPublic: false,
        },
      });
      return created;
    });

    await this.ranking.refreshEventRankingCache(event.tenantId, eventId);

    this.reviewNotifications.notifyReviewReceived(
      event.tenantId,
      review.id,
      {
        id: event.id,
        title: event.title,
        category: event.category,
        producerProfileId: event.producerProfileId,
        producerId: event.producerId,
      },
      user.id,
    );

    return { id: review.id };
  }

  async getEntitySummary(query: ReviewEntitySummaryQuery) {
    const event = await this.loadPublicEvent(
      query.entityId,
      query.tenantId,
      query.category,
    );
    const summary = await this.ranking.summarizeEvent(
      query.tenantId,
      event.id,
      query.category,
    );
    return {
      averageRating: summary.averageRating,
      validReviewCount: summary.validReviewCount,
      aspectAverages: summary.aspectAverages,
      recentReviewCount: summary.recentReviewCount,
    };
  }

  async listPublic(query: PublicReviewsListQuery) {
    const event = await this.loadPublicEvent(
      query.entityId,
      query.tenantId,
      query.category,
    );
    const summary = await this.ranking.summarizeEvent(
      query.tenantId,
      event.id,
      query.category,
    );

    const where = applyPublicReviewListFilters(
      {
        eventId: event.id,
        ...publicReviewVisibleWhere,
      },
      {
        sort: query.sort,
        replyFilter: query.replyFilter,
        overallRating: query.overallRating,
      },
    );

    const orderBy = publicReviewListOrderBy(query.sort);

    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, category: true } },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const items: PublicReviewItemV2[] = [];
    for (const row of rows) {
      if (!row.userId || !row.user) continue;
      const tier = await this.reputation.computeTier(query.tenantId, row.userId);
      const replyAuthor =
        row.replyAuthorType === 'PLATFORM_ADMIN'
          ? 'Plataforma'
          : row.replyAuthorType === 'GASTRO_OWNER'
            ? 'Establecimiento'
            : row.replyAuthorType === 'HOTEL_OWNER'
              ? 'Hotel'
              : 'Organizador';
      items.push(
        buildPublicReviewItem(
          row as Parameters<typeof buildPublicReviewItem>[0],
          { displayName: this.displayName(row.user), reviewerTier: tier },
          this.mapReply(row, replyAuthor),
        ),
      );
    }

    return {
      reviews: items,
      page: query.page,
      total,
      summary: {
        averageRating: summary.averageRating,
        validReviewCount: summary.validReviewCount,
        aspectAverages: summary.aspectAverages,
      },
    };
  }

  async getUserPublicProfile(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }
    const tier = await this.reputation.computeTier(tenantId, userId);
    const visibleReviewCount = await this.prisma.review.count({
      where: { tenantId, userId, ...publicReviewVisibleWhere },
    });
    const stats = await this.buildUserPublicProfileStats(tenantId, userId);
    return {
      userId: user.id,
      displayName: this.publicDisplayName(user),
      avatarUrl: null,
      reviewerTier: tier,
      visibleReviewCount,
      ...stats,
    };
  }

  async listUserPublicReviews(
    tenantId: string,
    userId: string,
    query: UserPublicReviewsQuery,
  ) {
    const profile = await this.getUserPublicProfile(tenantId, userId);
    const where = applyPublicReviewListFilters(
      { tenantId, userId, ...publicReviewVisibleWhere },
      {
        sort: query.sort,
        replyFilter: query.replyFilter,
        overallRating: query.overallRating,
      },
    );
    const orderBy = publicReviewListOrderBy(query.sort);
    const [rows, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, category: true } },
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const reviews: PublicReviewItemV2[] = rows
      .filter((r) => r.user)
      .map((row) =>
        buildPublicReviewItem(
          row as Parameters<typeof buildPublicReviewItem>[0],
          { displayName: profile.displayName, reviewerTier: profile.reviewerTier },
          this.mapReply(row, 'Organizador'),
        ),
      );

    return { profile, reviews, page: query.page, total };
  }

  private async canReplyAsAuthor(
    tenantId: string,
    userId: string,
    userRole: string,
    event: { id: string; category: string | null; producerId: string; producerProfileId: string | null },
    authorType: ReviewReplyAuthorType,
  ): Promise<boolean> {
    switch (authorType) {
      case 'PLATFORM_ADMIN':
        return userRole === 'ADMIN';
      case 'PRODUCER':
        return (
          userRole === 'ADMIN' ||
          (await this.profiles.canManageEvent(tenantId, userId, event))
        );
      case 'GASTRO_OWNER':
        return this.profiles.canManageGastroPublicEvent(
          tenantId,
          userId,
          userRole,
          event.id,
        );
      case 'HOTEL_OWNER':
        return this.profiles.canManageHotelReviewEvent(tenantId, userId, userRole, {
          id: event.id,
          category: event.category,
          producerId: event.producerId,
        });
      default:
        return false;
    }
  }

  async replyAsManager(
    tenantId: string,
    userId: string,
    userRole: string,
    reviewId: string,
    body: ReviewReplyBody,
    authorType: ReviewReplyAuthorType,
  ): Promise<{ ok: true }> {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
      include: { event: true },
    });
    if (!review) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Review not found',
      });
    }

    const allowed = await this.canReplyAsAuthor(
      tenantId,
      userId,
      userRole,
      review.event,
      authorType,
    );
    if (!allowed) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot reply to this review',
      });
    }

    const now = new Date();
    await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        officialReply: body.body,
        replyAuthorType: authorType,
        replyAuthorId: userId,
        replyCreatedAt: review.replyCreatedAt ?? now,
        replyUpdatedAt: now,
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'REVIEW_REPLY_UPDATED',
      entityType: 'Review',
      entityId: reviewId,
      after: { replyAuthorType: authorType },
    });

    if (review.userId) {
      this.reviewNotifications.notifyOfficialReply(
        tenantId,
        reviewId,
        {
          id: review.event.id,
          title: review.event.title,
          category: review.event.category,
          producerProfileId: review.event.producerProfileId,
          producerId: review.event.producerId,
        },
        review.userId,
      );
    }

    return { ok: true };
  }

  async hideReviewAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    reviewId: string,
    reason?: string,
    adminNote?: string,
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
      include: { event: true },
    });
    if (!review) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Review not found',
      });
    }

    const flags = syncHiddenFlags('HIDDEN');
    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: 'HIDDEN',
          ...flags,
          hiddenReason: reason ?? adminNote ?? null,
          hiddenAt: new Date(),
          hiddenByUserId: adminUserId,
          moderatedAt: new Date(),
          moderatedByUserId: adminUserId,
        },
      });
    });

    await this.ranking.refreshEventRankingCache(tenantId, review.eventId);

    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'REVIEW_HIDDEN',
      entityType: 'Review',
      entityId: reviewId,
      before: { status: review.status, hiddenFromPublic: review.hiddenFromPublic },
      after: { status: 'HIDDEN', hiddenFromPublic: true },
      metadata: { reason, adminNote },
    });

    if (review.userId) {
      this.reviewNotifications.notifyReviewHidden(
        tenantId,
        reviewId,
        {
          id: review.event.id,
          title: review.event.title,
          category: review.event.category,
          producerProfileId: review.event.producerProfileId,
          producerId: review.event.producerId,
        },
        review.userId,
        'admin-hide',
      );
    }

    return { ok: true };
  }

  async restoreReviewAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    reviewId: string,
  ) {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
      include: { event: true },
    });
    if (!review) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Review not found',
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: {
          status: 'VISIBLE',
          hiddenFromPublic: false,
          hiddenReason: null,
          hiddenAt: null,
          hiddenByUserId: null,
        },
      });
    });

    await this.ranking.refreshEventRankingCache(tenantId, review.eventId);

    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'REVIEW_RESTORED',
      entityType: 'Review',
      entityId: reviewId,
      before: { status: review.status },
      after: { status: 'VISIBLE' },
    });

    if (review.userId) {
      this.reviewNotifications.notifyReviewRestored(
        tenantId,
        reviewId,
        {
          id: review.event.id,
          title: review.event.title,
          category: review.event.category,
          producerProfileId: review.event.producerProfileId,
          producerId: review.event.producerId,
        },
        review.userId,
      );
    }

    return { ok: true };
  }

  private async loadPublicEvent(
    entityId: string,
    tenantId: string,
    category: ReviewEntitySummaryQuery['category'],
  ) {
    const event = await this.prisma.event.findFirst({
      where: mergePublicEventVisibility({
        id: entityId,
        tenantId,
        status: 'APPROVED',
        deletedAt: null,
        category,
      }),
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Entity not found',
      });
    }
    return event;
  }
}
