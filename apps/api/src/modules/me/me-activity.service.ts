import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  eventCategoryToReviewCategory,
  mapReviewStatus,
  readOverallRating,
} from '../reviews/review-public.util';
import type {
  MeActivityAttendedResponse,
  MeActivityResponse,
  MeActivityReviewsResponse,
} from '@yo-te-invito/shared';
import { TicketTransferOfferService } from './ticket-transfer-offer.service';

@Injectable()
export class MeActivityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transferOffers: TicketTransferOfferService,
  ) {}

  async getAttended(tenantId: string, userId: string): Promise<MeActivityAttendedResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { email: true },
    });
    if (!user) return { events: [] };

    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: 'USED',
        event: { tenantId, deletedAt: null },
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
          select: { id: true, title: true, category: true, startAt: true },
        },
      },
      orderBy: { usedAt: 'desc' },
    });

    const reviews = await this.prisma.review.findMany({
      where: { tenantId, userId },
      select: { eventId: true, id: true },
    });
    const reviewByEvent = new Map(reviews.map((r) => [r.eventId, r.id]));

    const seen = new Set<string>();
    const events = [];
    for (const t of tickets) {
      if (seen.has(t.eventId)) continue;
      seen.add(t.eventId);
      const reviewId = reviewByEvent.get(t.eventId) ?? null;
      events.push({
        eventId: t.event.id,
        title: t.event.title,
        category: t.event.category ?? 'event',
        startAt: t.event.startAt.toISOString(),
        attendedAt: (t.usedAt ?? t.event.startAt).toISOString(),
        hasReview: !!reviewId,
        reviewId,
      });
    }

    return { events };
  }

  async getMyReviews(tenantId: string, userId: string): Promise<MeActivityReviewsResponse> {
    const rows = await this.prisma.review.findMany({
      where: { tenantId, userId },
      include: { event: { select: { id: true, title: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return {
      reviews: rows.map((r) => ({
        id: r.id,
        eventId: r.eventId,
        entityId: r.eventId,
        category: eventCategoryToReviewCategory(r.event.category),
        overallRating: readOverallRating(r),
        comment: r.comment,
        status: mapReviewStatus(r.status),
        createdAt: r.createdAt.toISOString(),
        officialReply: r.officialReply,
        eventTitle: r.event.title,
      })),
    };
  }

  async getActivity(tenantId: string, userId: string): Promise<MeActivityResponse> {
    const [attended, reviews, transfers] = await Promise.all([
      this.getAttended(tenantId, userId),
      this.getMyReviews(tenantId, userId),
      this.transferOffers.listForUser(tenantId, userId, { role: 'all' }),
    ]);
    return {
      attended: attended.events,
      reviews: reviews.reviews,
      transfers: transfers.offers,
    };
  }
}
