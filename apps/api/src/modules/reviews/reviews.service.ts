import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateReviewBody,
  ReviewItem,
  ReviewsListQuery,
  ReviewsResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    userId: string,
    eventId: string,
    body: CreateReviewBody,
  ): Promise<{ id: string }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const existing = await this.prisma.review.findUnique({
      where: { eventId_userId: { eventId, userId } },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'You have already reviewed this event',
      });
    }

    if (body.score < 1 || body.score > 5) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Score must be between 1 and 5',
      });
    }

    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          tenantId,
          eventId,
          userId,
          score: body.score,
          title: body.title ?? null,
          comment: body.comment ?? null,
        },
      });

      const agg = await tx.review.aggregate({
        where: { eventId },
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
      where: { id: eventId, tenantId, status: 'APPROVED', deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { eventId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.review.count({ where: { eventId } }),
    ]);

    const items: ReviewItem[] = reviews.map((r) => ({
      id: r.id,
      score: r.score,
      title: r.title,
      comment: r.comment,
      userName: `${r.user.firstName} ${r.user.lastName}`.trim() || r.user.email,
      createdAt: r.createdAt.toISOString(),
    }));

    return {
      reviews: items,
      page: query.page,
      total,
    };
  }
}
