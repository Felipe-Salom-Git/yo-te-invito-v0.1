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

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
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

      const agg = await tx.review.aggregate({
        where: { eventId, hiddenFromPublic: false },
        _avg: { score: true },
        _count: true,
      });

      await tx.event.update({
        where: { id: eventId },
        data: {
          ratingAvg: agg._avg.score ?? null,
          ratingCount: agg._count,
        },
      });

      return created;
    });

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
        where: { eventId, hiddenFromPublic: false },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where: { eventId, hiddenFromPublic: false } }),
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
    const agg = await this.prisma.review.aggregate({
      where: { eventId, hiddenFromPublic: false },
      _avg: { score: true },
      _count: true,
    });
    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ratingAvg: agg._avg.score ?? null,
        ratingCount: agg._count,
      },
    });
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
