import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import type {
  CreateReviewBody,
  ReviewItem,
  ProducerReviewRow,
  ReviewsListQuery,
  ReviewsResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { mergePublicEventVisibility } from '../../common/utils/event-public-visibility.util';
import {
  publicReviewVisibleWhere,
  readOverallRating,
} from './review-public.util';
import { ReviewRankingService } from './review-ranking.service';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly ranking: ReviewRankingService,
  ) {}

  async create(
    user: { id: string; tenantId: string } | undefined,
    eventId: string,
    body: CreateReviewBody,
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

    const tenantId = event.tenantId;
    const userId = user?.id ?? null;

    if (user && user.tenantId !== tenantId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot review events from another tenant',
      });
    }

    if (userId) {
      const existing = await this.prisma.review.findFirst({
        where: { eventId, userId },
      });

      if (existing) {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'You have already reviewed this event',
        });
      }
    }

    if (body.score < 1 || body.score > 5) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Score must be between 1 and 5',
      });
    }

    const guestName = userId ? null : body.guestName?.trim() || null;

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          tenantId,
          eventId,
          userId,
          score: body.score,
          title: body.title ?? null,
          comment: body.comment ?? null,
          guestName,
        },
      });

      const visible = await tx.review.findMany({
        where: { eventId, ...publicReviewVisibleWhere },
        select: { overallRating: true, score: true },
      });
      const ratingAvg =
        visible.length > 0
          ? visible.reduce((s, r) => s + readOverallRating(r), 0) / visible.length
          : null;

      await tx.event.update({
        where: { id: eventId },
        data: {
          ratingAvg,
          ratingCount: visible.length,
        },
      });

      return created;
    });

    await this.ranking.refreshEventRankingCache(tenantId, eventId);

    return { id: review.id };
  }

  async listPublic(
    eventId: string,
    tenantId: string,
    query: Pick<ReviewsListQuery, 'page' | 'limit'>,
  ): Promise<ReviewsResponse> {
    const event = await this.prisma.event.findFirst({
      where: mergePublicEventVisibility({
        id: eventId,
        tenantId,
        status: 'APPROVED',
        deletedAt: null,
      }),
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { eventId, ...publicReviewVisibleWhere },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where: { eventId, ...publicReviewVisibleWhere } }),
    ]);

    const items: ReviewItem[] = reviews.map((r) => ({
      id: r.id,
      score: r.score,
      title: r.title,
      comment: r.comment,
      userName: r.user
        ? `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email
        : r.guestName?.trim() || 'Visitante',
      createdAt: r.createdAt.toISOString(),
      officialReply: r.officialReply,
    }));

    return {
      reviews: items,
      page: query.page,
      total,
    };
  }

  async recomputeEventRating(eventId: string): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId },
      select: { tenantId: true },
    });
    if (!event) return;
    await this.ranking.refreshEventRankingCache(event.tenantId, eventId);
  }

  async listForProducer(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
  ): Promise<{ reviews: ProducerReviewRow[] }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const canManage =
      userRole === 'ADMIN' ||
      (await this.profiles.canManageEvent(tenantId, userId, event));
    if (!canManage) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot view reviews for this event',
      });
    }

    const reviews = await this.prisma.review.findMany({
      where: { eventId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return {
      reviews: reviews.map((r) => ({
        id: r.id,
        score: r.score,
        title: r.title,
        comment: r.comment,
        userName: r.user
          ? `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email
          : r.guestName?.trim() || 'Visitante',
        createdAt: r.createdAt.toISOString(),
        officialReply: r.officialReply,
        hiddenFromPublic: r.hiddenFromPublic,
      })),
    };
  }
}
