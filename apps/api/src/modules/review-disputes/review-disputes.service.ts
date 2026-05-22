import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ReviewDisputeStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReviewsService } from '../reviews/reviews.service';
import { AuditService } from '../audit/audit.service';
import {
  ErrorCode,
  emptyReviewScoreDistribution,
  type AdminReviewDisputeActionInput,
  type AdminReviewDisputeListQuery,
  type CreateReviewDisputeInput,
  type ProducerManagedReviewListQuery,
  type ProducerManagedReviewListResponse,
  type ProducerManagedReviewSummary,
  type ReviewDisputeResponse,
} from '@yo-te-invito/shared';
import {
  eventCategoryToReviewCategory,
  readAspectRatings,
  readOverallRating,
} from '../reviews/review-public.util';

const OPEN_DISPUTE_STATUSES: ReviewDisputeStatus[] = ['PENDING', 'IN_REVIEW'];

function reviewUserName(row: {
  guestName: string | null;
  user: { firstName: string; lastName: string } | null;
}): string {
  if (row.user) {
    return `${row.user.firstName} ${row.user.lastName}`.trim() || 'Usuario';
  }
  return row.guestName?.trim() || 'Invitado';
}

function mapDispute(row: {
  id: string;
  reviewId: string;
  producerProfileId: string;
  eventId: string;
  reasonType: string;
  message: string;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  review: { score: number; comment: string | null; guestName: string | null; user: { firstName: string; lastName: string } | null };
  event: { title: string };
}): ReviewDisputeResponse {
  return {
    id: row.id,
    reviewId: row.reviewId,
    producerProfileId: row.producerProfileId,
    eventId: row.eventId,
    eventTitle: row.event.title,
    reasonType: row.reasonType as ReviewDisputeResponse['reasonType'],
    message: row.message,
    status: row.status as ReviewDisputeResponse['status'],
    adminNote: row.adminNote,
    reviewScore: row.review.score,
    reviewComment: row.review.comment,
    reviewUserDisplayName: reviewUserName(row.review),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ReviewDisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly reviews: ReviewsService,
    private readonly audit: AuditService,
  ) {}

  private async requireProducerProfileId(tenantId: string, userId: string) {
    const profileId = await this.profiles.getDefaultProducerProfileId(tenantId, userId);
    if (!profileId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No active producer profile found',
      });
    }
    return profileId;
  }

  private async eventIdsForProducer(tenantId: string, producerProfileId: string) {
    const events = await this.prisma.event.findMany({
      where: { tenantId, producerProfileId, deletedAt: null },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    });
    return events;
  }

  async getProducerSummary(tenantId: string, userId: string): Promise<ProducerManagedReviewSummary> {
    const producerProfileId = await this.requireProducerProfileId(tenantId, userId);
    const events = await this.eventIdsForProducer(tenantId, producerProfileId);
    const eventIds = events.map((e) => e.id);
    if (eventIds.length === 0) {
      return {
        averageRating: null,
        totalReviews: 0,
        distribution: emptyReviewScoreDistribution(),
        unansweredCount: 0,
        openDisputeCount: 0,
      };
    }

    const rows = await this.prisma.review.findMany({
      where: { tenantId, eventId: { in: eventIds } },
      select: { overallRating: true, score: true, officialReply: true },
    });

    const distribution = emptyReviewScoreDistribution();
    let sum = 0;
    let unansweredCount = 0;
    for (const r of rows) {
      const overall = readOverallRating(r);
      sum += overall;
      const key = String(overall) as keyof typeof distribution;
      if (key in distribution) distribution[key] += 1;
      if (!r.officialReply?.trim()) unansweredCount += 1;
    }

    const openDisputeCount = await this.prisma.reviewDisputeRequest.count({
      where: {
        tenantId,
        producerProfileId,
        status: { in: OPEN_DISPUTE_STATUSES },
        eventId: { in: eventIds },
      },
    });

    return {
      averageRating:
        rows.length > 0 ? Math.round((sum / rows.length) * 10) / 10 : null,
      totalReviews: rows.length,
      distribution,
      unansweredCount,
      openDisputeCount,
    };
  }

  async listProducerReviews(
    tenantId: string,
    userId: string,
    query: ProducerManagedReviewListQuery,
  ): Promise<ProducerManagedReviewListResponse> {
    const producerProfileId = await this.requireProducerProfileId(tenantId, userId);
    const events = await this.eventIdsForProducer(tenantId, producerProfileId);
    let eventIds = events.map((e) => e.id);

    if (query.eventId) {
      if (!eventIds.includes(query.eventId)) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Event does not belong to this producer',
        });
      }
      eventIds = [query.eventId];
    }

    if (eventIds.length === 0) {
      return { reviews: [], page: query.page, total: 0, events: [] };
    }

    const disputes = await this.prisma.reviewDisputeRequest.findMany({
      where: { tenantId, producerProfileId },
      orderBy: { createdAt: 'desc' },
    });
    const latestDisputeByReview = new Map<string, (typeof disputes)[0]>();
    for (const d of disputes) {
      if (!latestDisputeByReview.has(d.reviewId)) {
        latestDisputeByReview.set(d.reviewId, d);
      }
    }

    const where: Prisma.ReviewWhereInput = {
      tenantId,
      eventId: { in: eventIds },
    };

    const andParts: Prisma.ReviewWhereInput[] = Array.isArray(where.AND)
      ? [...where.AND]
      : where.AND
        ? [where.AND]
        : [];

    if (query.overallRating) {
      andParts.push({
        OR: [
          { overallRating: query.overallRating },
          {
            overallRating: null,
            score: Math.min(5, Math.max(1, Math.round(query.overallRating / 2))),
          },
        ],
      });
    } else if (query.rating) {
      where.score = query.rating;
    }

    if (query.replyFilter === 'UNANSWERED') {
      andParts.push({ OR: [{ officialReply: null }, { officialReply: '' }] });
    } else if (query.replyFilter === 'ANSWERED') {
      andParts.push({
        officialReply: { not: null },
        NOT: { officialReply: '' },
      });
    }

    if (andParts.length > 0) {
      where.AND = andParts;
    }

    if (query.publicStatus) {
      where.status = query.publicStatus;
    }

    if (query.disputeStatus && query.disputeStatus !== 'ALL') {
      const allReviews = await this.prisma.review.findMany({
        where,
        select: { id: true },
      });
      const matchingReviewIds: string[] = [];
      for (const r of allReviews) {
        const d = latestDisputeByReview.get(r.id);
        if (query.disputeStatus === 'NONE') {
          if (!d || !OPEN_DISPUTE_STATUSES.includes(d.status)) {
            matchingReviewIds.push(r.id);
          }
        } else if (query.disputeStatus === 'OPEN') {
          if (d && OPEN_DISPUTE_STATUSES.includes(d.status)) {
            matchingReviewIds.push(r.id);
          }
        } else if (d?.status === query.disputeStatus) {
          matchingReviewIds.push(r.id);
        }
      }
      where.id = { in: matchingReviewIds.length ? matchingReviewIds : ['__none__'] };
    }

    const total = await this.prisma.review.count({ where });
    const skip = (query.page - 1) * query.limit;

    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      query.sort === 'oldest'
        ? [{ createdAt: 'asc' }]
        : query.sort === 'highest'
          ? [{ overallRating: 'desc' }, { createdAt: 'desc' }]
          : query.sort === 'lowest'
            ? [{ overallRating: 'asc' }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }];

    const rows = await this.prisma.review.findMany({
      where,
      include: {
        event: { select: { title: true, category: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy,
      skip,
      take: query.limit,
    });

    return {
      reviews: rows.map((r) => {
        const d = latestDisputeByReview.get(r.id);
        const category = eventCategoryToReviewCategory(r.event.category);
        return {
          id: r.id,
          eventId: r.eventId,
          eventTitle: r.event.title,
          eventCategory: category,
          overallRating: readOverallRating(r),
          score: r.score,
          aspectRatings: (() => {
            const aspects = readAspectRatings(r);
            return Object.keys(aspects).length > 0 ? aspects : null;
          })(),
          title: r.title,
          comment: r.comment,
          userDisplayName: reviewUserName(r),
          hiddenFromPublic: r.hiddenFromPublic,
          status: r.status,
          officialReply: r.officialReply,
          replyAuthorType: r.replyAuthorType as ProducerManagedReviewListResponse['reviews'][0]['replyAuthorType'],
          replyUpdatedAt: r.replyUpdatedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          dispute: d
            ? {
                id: d.id,
                status: d.status as ReviewDisputeResponse['status'],
                reasonType: d.reasonType as ReviewDisputeResponse['reasonType'],
                adminNote: d.adminNote,
                createdAt: d.createdAt.toISOString(),
              }
            : null,
        };
      }),
      page: query.page,
      total,
      events,
    };
  }

  async createDispute(
    tenantId: string,
    userId: string,
    userRole: string,
    reviewId: string,
    body: CreateReviewDisputeInput,
  ): Promise<ReviewDisputeResponse> {
    const producerProfileId = await this.requireProducerProfileId(tenantId, userId);

    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
      include: { event: true, user: { select: { firstName: true, lastName: true } } },
    });
    if (!review) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Review not found' });
    }

    const canManage =
      userRole === 'ADMIN' ||
      (review.event.producerProfileId === producerProfileId &&
        (await this.profiles.canManageEvent(tenantId, userId, review.event)));
    if (!canManage) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot dispute reviews for this event',
      });
    }

    const existingOpen = await this.prisma.reviewDisputeRequest.findFirst({
      where: {
        tenantId,
        reviewId,
        producerProfileId,
        status: { in: OPEN_DISPUTE_STATUSES },
      },
    });
    if (existingOpen) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Ya existe una solicitud abierta para esta valoración',
      });
    }

    const dispute = await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: reviewId },
        data: { status: 'IN_REVIEW' },
      });

      const inbox = await tx.inboxItem.create({
        data: {
          tenantId,
          kind: 'REVIEW_DISPUTE_REQUEST',
          status: 'PENDING',
          createdByUserId: userId,
          assigneeRole: 'ADMIN',
          title: `Revisión valoración · ${review.event.title}`,
          summary: body.message.slice(0, 500),
          payload: {
            reviewId,
            reasonType: body.reasonType,
            message: body.message,
            eventId: review.eventId,
            producerProfileId,
          } as object,
        },
      });

      return tx.reviewDisputeRequest.create({
        data: {
          tenantId,
          reviewId,
          producerProfileId,
          eventId: review.eventId,
          requestedByUserId: userId,
          reasonType: body.reasonType,
          message: body.message,
          status: 'PENDING',
          inboxItemId: inbox.id,
        },
        include: {
          review: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          event: { select: { title: true } },
        },
      });
    });

    return mapDispute(dispute);
  }

  async listProducerDisputes(
    tenantId: string,
    userId: string,
  ): Promise<{ disputes: ReviewDisputeResponse[] }> {
    const producerProfileId = await this.requireProducerProfileId(tenantId, userId);
    const rows = await this.prisma.reviewDisputeRequest.findMany({
      where: { tenantId, producerProfileId },
      include: {
        review: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        event: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { disputes: rows.map(mapDispute) };
  }

  async getProducerDispute(
    tenantId: string,
    userId: string,
    disputeId: string,
  ): Promise<ReviewDisputeResponse> {
    const producerProfileId = await this.requireProducerProfileId(tenantId, userId);
    const row = await this.prisma.reviewDisputeRequest.findFirst({
      where: { id: disputeId, tenantId, producerProfileId },
      include: {
        review: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        event: { select: { title: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Dispute not found' });
    }
    return mapDispute(row);
  }

  async listAdminDisputes(tenantId: string, query: AdminReviewDisputeListQuery) {
    const where = {
      tenantId,
      ...(query.status ? { status: query.status } : {}),
    };
    const total = await this.prisma.reviewDisputeRequest.count({ where });
    const skip = (query.page - 1) * query.limit;
    const rows = await this.prisma.reviewDisputeRequest.findMany({
      where,
      include: {
        review: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        event: { select: { title: true } },
        producerProfile: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.limit,
    });

    return {
      disputes: rows.map((row) => ({
        ...mapDispute(row),
        producerDisplayName: row.producerProfile.displayName,
      })),
      page: query.page,
      total,
    };
  }

  async getAdminDispute(tenantId: string, disputeId: string) {
    const row = await this.prisma.reviewDisputeRequest.findFirst({
      where: { id: disputeId, tenantId },
      include: {
        review: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        event: { select: { title: true } },
        producerProfile: { select: { displayName: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Dispute not found' });
    }
    return {
      ...mapDispute(row),
      producerDisplayName: row.producerProfile.displayName,
    };
  }

  private async loadDisputeForAdmin(tenantId: string, disputeId: string) {
    const row = await this.prisma.reviewDisputeRequest.findFirst({
      where: { id: disputeId, tenantId },
      include: {
        review: true,
        inboxItem: true,
        event: { select: { title: true } },
        producerProfile: { select: { displayName: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Dispute not found' });
    }
    return row;
  }

  private async syncInboxResolved(
    tx: Prisma.TransactionClient,
    inboxItemId: string | null,
    adminUserId: string,
    inboxStatus: 'APPROVED' | 'REJECTED',
    note?: string,
  ) {
    if (!inboxItemId) return;
    const item = await tx.inboxItem.findUnique({ where: { id: inboxItemId } });
    if (item && item.status === 'PENDING') {
      await tx.inboxItem.update({
        where: { id: inboxItemId },
        data: {
          status: inboxStatus,
          resolvedAt: new Date(),
          resolvedByUserId: adminUserId,
          resolutionNote: note ?? null,
        },
      });
    }
  }

  async markInReview(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    disputeId: string,
    body: AdminReviewDisputeActionInput,
  ) {
    const row = await this.loadDisputeForAdmin(tenantId, disputeId);
    if (!['PENDING', 'IN_REVIEW'].includes(row.status)) {
      throw new BadRequestException('Dispute is not open for status change');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const d = await tx.reviewDisputeRequest.update({
        where: { id: disputeId },
        data: {
          status: 'IN_REVIEW',
          adminNote: body.adminNote ?? row.adminNote,
        },
        include: {
          review: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          event: { select: { title: true } },
        },
      });
      return d;
    });

    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'REVIEW_DISPUTE_IN_REVIEW',
      entityType: 'ReviewDisputeRequest',
      entityId: disputeId,
      before: { status: row.status },
      after: { status: 'IN_REVIEW' },
    });

    return mapDispute(updated);
  }

  async acceptDispute(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    disputeId: string,
    body: AdminReviewDisputeActionInput,
  ) {
    const row = await this.loadDisputeForAdmin(tenantId, disputeId);
    if (!['PENDING', 'IN_REVIEW'].includes(row.status)) {
      throw new BadRequestException('Dispute is not open for acceptance');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: row.reviewId },
        data: {
          status: 'HIDDEN',
          hiddenFromPublic: true,
          hiddenAt: new Date(),
          hiddenByUserId: adminUserId,
          moderatedAt: new Date(),
          moderatedByUserId: adminUserId,
        },
      });
      await this.syncInboxResolved(tx, row.inboxItemId, adminUserId, 'APPROVED', body.adminNote);

      return tx.reviewDisputeRequest.update({
        where: { id: disputeId },
        data: {
          status: 'ACCEPTED',
          adminNote: body.adminNote ?? null,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
        },
        include: {
          review: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          event: { select: { title: true } },
        },
      });
    });

    await this.reviews.recomputeEventRating(row.eventId);

    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'REVIEW_DISPUTE_ACCEPTED',
      entityType: 'ReviewDisputeRequest',
      entityId: disputeId,
      before: { status: row.status, hiddenFromPublic: row.review.hiddenFromPublic },
      after: { status: 'ACCEPTED', hiddenFromPublic: true },
      metadata: { reviewId: row.reviewId },
    });

    return mapDispute(updated);
  }

  async rejectDispute(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    disputeId: string,
    body: AdminReviewDisputeActionInput,
  ) {
    const row = await this.loadDisputeForAdmin(tenantId, disputeId);
    if (!['PENDING', 'IN_REVIEW'].includes(row.status)) {
      throw new BadRequestException('Dispute is not open for rejection');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.review.update({
        where: { id: row.reviewId },
        data: { status: 'REPORT_REJECTED', hiddenFromPublic: false },
      });
      await this.syncInboxResolved(tx, row.inboxItemId, adminUserId, 'REJECTED', body.adminNote);
      return tx.reviewDisputeRequest.update({
        where: { id: disputeId },
        data: {
          status: 'REJECTED',
          adminNote: body.adminNote ?? null,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
        },
        include: {
          review: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          event: { select: { title: true } },
        },
      });
    });

    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'REVIEW_DISPUTE_REJECTED',
      entityType: 'ReviewDisputeRequest',
      entityId: disputeId,
      before: { status: row.status },
      after: { status: 'REJECTED' },
    });

    return mapDispute(updated);
  }

  async resolveDispute(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    disputeId: string,
    body: AdminReviewDisputeActionInput,
  ) {
    const row = await this.loadDisputeForAdmin(tenantId, disputeId);
    if (['CANCELLED'].includes(row.status)) {
      throw new BadRequestException('Dispute is closed');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.syncInboxResolved(tx, row.inboxItemId, adminUserId, 'APPROVED', body.adminNote);
      return tx.reviewDisputeRequest.update({
        where: { id: disputeId },
        data: {
          status: 'RESOLVED',
          adminNote: body.adminNote ?? row.adminNote,
          resolvedByUserId: adminUserId,
          resolvedAt: new Date(),
        },
        include: {
          review: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          event: { select: { title: true } },
        },
      });
    });

    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'REVIEW_DISPUTE_RESOLVED',
      entityType: 'ReviewDisputeRequest',
      entityId: disputeId,
      before: { status: row.status },
      after: { status: 'RESOLVED', adminNote: body.adminNote },
    });

    return mapDispute(updated);
  }

  private async gastroPublicEventScope(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<{ eventIds: string[]; events: Array<{ id: string; title: string }> }> {
    if (userRole === 'ADMIN') {
      const rows = await this.prisma.event.findMany({
        where: { tenantId, category: 'gastro', deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
        take: 50,
      });
      return { eventIds: rows.map((e) => e.id), events: rows };
    }

    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      include: { profile: { select: { publicEventId: true } } },
      orderBy: { profile: { updatedAt: 'desc' } },
    });
    const eventId = membership?.profile.publicEventId;
    if (!eventId) {
      return { eventIds: [], events: [] };
    }
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) {
      return { eventIds: [], events: [] };
    }
    return { eventIds: [event.id], events: [{ id: event.id, title: event.title }] };
  }

  private async hotelReviewEventScope(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<{ eventIds: string[]; events: Array<{ id: string; title: string }> }> {
    if (userRole === 'ADMIN') {
      const rows = await this.prisma.event.findMany({
        where: { tenantId, category: 'hotel', deletedAt: null },
        select: { id: true, title: true },
        orderBy: { title: 'asc' },
        take: 50,
      });
      return { eventIds: rows.map((e) => e.id), events: rows };
    }

    const rows = await this.prisma.event.findMany({
      where: { tenantId, category: 'hotel', deletedAt: null, producerId: userId },
      select: { id: true, title: true },
      orderBy: { title: 'asc' },
    });
    return { eventIds: rows.map((e) => e.id), events: rows };
  }

  private async managedReviewsSummary(
    tenantId: string,
    eventIds: string[],
  ): Promise<ProducerManagedReviewSummary> {
    if (eventIds.length === 0) {
      return {
        averageRating: null,
        totalReviews: 0,
        distribution: emptyReviewScoreDistribution(),
      };
    }

    const rows = await this.prisma.review.findMany({
      where: { tenantId, eventId: { in: eventIds } },
      select: { overallRating: true, score: true },
    });

    const distribution = emptyReviewScoreDistribution();
    let sum = 0;
    for (const r of rows) {
      const overall = readOverallRating(r);
      sum += overall;
      const key = String(overall) as keyof typeof distribution;
      if (key in distribution) distribution[key] += 1;
    }

    return {
      averageRating:
        rows.length > 0 ? Math.round((sum / rows.length) * 10) / 10 : null,
      totalReviews: rows.length,
      distribution,
    };
  }

  private async listManagedReviewsForEvents(
    tenantId: string,
    scope: { eventIds: string[]; events: Array<{ id: string; title: string }> },
    query: ProducerManagedReviewListQuery,
    disputeProducerProfileId: string | null,
  ): Promise<ProducerManagedReviewListResponse> {
    let eventIds = scope.eventIds;
    if (query.eventId) {
      if (!eventIds.includes(query.eventId)) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Event not in your scope',
        });
      }
      eventIds = [query.eventId];
    }

    if (eventIds.length === 0) {
      return { reviews: [], page: query.page, total: 0, events: scope.events };
    }

    const latestDisputeByReview = new Map<string, { id: string; status: string; reasonType: string; adminNote: string | null; createdAt: Date }>();
    if (disputeProducerProfileId) {
      const disputes = await this.prisma.reviewDisputeRequest.findMany({
        where: { tenantId, producerProfileId: disputeProducerProfileId },
        orderBy: { createdAt: 'desc' },
      });
      for (const d of disputes) {
        if (!latestDisputeByReview.has(d.reviewId)) {
          latestDisputeByReview.set(d.reviewId, d);
        }
      }
    }

    const where: Prisma.ReviewWhereInput = {
      tenantId,
      eventId: { in: eventIds },
    };

    const andParts: Prisma.ReviewWhereInput[] = [];

    if (query.overallRating) {
      andParts.push({
        OR: [
          { overallRating: query.overallRating },
          {
            overallRating: null,
            score: Math.min(5, Math.max(1, Math.round(query.overallRating / 2))),
          },
        ],
      });
    } else if (query.rating) {
      where.score = query.rating;
    }

    if (query.replyFilter === 'UNANSWERED') {
      andParts.push({ OR: [{ officialReply: null }, { officialReply: '' }] });
    } else if (query.replyFilter === 'ANSWERED') {
      andParts.push({
        officialReply: { not: null },
        NOT: { officialReply: '' },
      });
    }

    if (query.publicStatus) {
      where.status = query.publicStatus;
    }

    if (andParts.length > 0) {
      where.AND = andParts;
    }

    if (query.disputeStatus && query.disputeStatus !== 'ALL' && disputeProducerProfileId) {
      const allReviews = await this.prisma.review.findMany({
        where,
        select: { id: true },
      });
      const matchingReviewIds: string[] = [];
      for (const r of allReviews) {
        const d = latestDisputeByReview.get(r.id);
        if (query.disputeStatus === 'NONE') {
          if (!d || !OPEN_DISPUTE_STATUSES.includes(d.status as ReviewDisputeStatus)) {
            matchingReviewIds.push(r.id);
          }
        } else if (query.disputeStatus === 'OPEN') {
          if (d && OPEN_DISPUTE_STATUSES.includes(d.status as ReviewDisputeStatus)) {
            matchingReviewIds.push(r.id);
          }
        } else if (d?.status === query.disputeStatus) {
          matchingReviewIds.push(r.id);
        }
      }
      where.id = { in: matchingReviewIds.length ? matchingReviewIds : ['__none__'] };
    }

    const total = await this.prisma.review.count({ where });
    const skip = (query.page - 1) * query.limit;

    const orderBy: Prisma.ReviewOrderByWithRelationInput[] =
      query.sort === 'oldest'
        ? [{ createdAt: 'asc' }]
        : query.sort === 'highest'
          ? [{ overallRating: 'desc' }, { createdAt: 'desc' }]
          : query.sort === 'lowest'
            ? [{ overallRating: 'asc' }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }];

    const rows = await this.prisma.review.findMany({
      where,
      include: {
        event: { select: { title: true, category: true } },
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy,
      skip,
      take: query.limit,
    });

    return {
      reviews: rows.map((r) => {
        const d = latestDisputeByReview.get(r.id);
        const category = eventCategoryToReviewCategory(r.event.category);
        return {
          id: r.id,
          eventId: r.eventId,
          eventTitle: r.event.title,
          eventCategory: category,
          overallRating: readOverallRating(r),
          score: r.score,
          aspectRatings: (() => {
            const aspects = readAspectRatings(r);
            return Object.keys(aspects).length > 0 ? aspects : null;
          })(),
          title: r.title,
          comment: r.comment,
          userDisplayName: reviewUserName(r),
          hiddenFromPublic: r.hiddenFromPublic,
          status: r.status,
          officialReply: r.officialReply,
          replyAuthorType: r.replyAuthorType as ProducerManagedReviewListResponse['reviews'][0]['replyAuthorType'],
          replyUpdatedAt: r.replyUpdatedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
          dispute: d
            ? {
                id: d.id,
                status: d.status as ReviewDisputeResponse['status'],
                reasonType: d.reasonType as ReviewDisputeResponse['reasonType'],
                adminNote: d.adminNote,
                createdAt: d.createdAt.toISOString(),
              }
            : null,
        };
      }),
      page: query.page,
      total,
      events: scope.events,
    };
  }

  async getGastroSummary(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<ProducerManagedReviewSummary> {
    const scope = await this.gastroPublicEventScope(tenantId, userId, userRole);
    return this.managedReviewsSummary(tenantId, scope.eventIds);
  }

  async listGastroReviews(
    tenantId: string,
    userId: string,
    userRole: string,
    query: ProducerManagedReviewListQuery,
  ): Promise<ProducerManagedReviewListResponse> {
    const scope = await this.gastroPublicEventScope(tenantId, userId, userRole);
    return this.listManagedReviewsForEvents(tenantId, scope, query, null);
  }

  async getHotelSummary(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<ProducerManagedReviewSummary> {
    const scope = await this.hotelReviewEventScope(tenantId, userId, userRole);
    return this.managedReviewsSummary(tenantId, scope.eventIds);
  }

  async listHotelReviews(
    tenantId: string,
    userId: string,
    userRole: string,
    query: ProducerManagedReviewListQuery,
  ): Promise<ProducerManagedReviewListResponse> {
    const scope = await this.hotelReviewEventScope(tenantId, userId, userRole);
    return this.listManagedReviewsForEvents(tenantId, scope, query, null);
  }
}
