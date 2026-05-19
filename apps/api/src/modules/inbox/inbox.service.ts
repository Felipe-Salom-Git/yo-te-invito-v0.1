import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReviewsService } from '../reviews/reviews.service';
import {
  ErrorCode,
  type AdminInboxListQuery,
  type AdminResolveInboxBody,
  type CreateGastroPromotionRequestBody,
  type CreateReviewModerationRequestBody,
  type InboxItemResponse,
  gastroPromotionStoredPayloadSchema,
  createReviewModerationRequestBodySchema,
} from '@yo-te-invito/shared';

function randomDiscountCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = 'PROMO-';
  for (let i = 0; i < 6; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

function mapInboxItem(row: {
  id: string;
  kind: string;
  status: string;
  title: string;
  summary: string | null;
  payload: unknown;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt: Date | null;
  resolutionNote: string | null;
}): InboxItemResponse {
  return {
    id: row.id,
    kind: row.kind as InboxItemResponse['kind'],
    status: row.status as InboxItemResponse['status'],
    title: row.title,
    summary: row.summary,
    payload: row.payload,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolutionNote: row.resolutionNote,
  };
}

@Injectable()
export class InboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly reviews: ReviewsService,
  ) {}

  async listOutbound(tenantId: string, userId: string): Promise<{ items: InboxItemResponse[] }> {
    const rows = await this.prisma.inboxItem.findMany({
      where: { tenantId, createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return { items: rows.map(mapInboxItem) };
  }

  async listForAdmin(tenantId: string, query: AdminInboxListQuery): Promise<{ items: InboxItemResponse[] }> {
    const rows = await this.prisma.inboxItem.findMany({
      where: {
        tenantId,
        assigneeRole: 'ADMIN',
        ...(query.status ? { status: query.status } : {}),
        ...(query.kind ? { kind: query.kind } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return { items: rows.map(mapInboxItem) };
  }

  async createGastroPromotionRequest(
    tenantId: string,
    userId: string,
    body: CreateGastroPromotionRequestBody,
  ): Promise<InboxItemResponse> {
    const hasGastro = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!hasGastro) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Gastro access required',
      });
    }

    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE', tenantId },
      },
    });
    if (!membership) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No active gastro profile membership',
      });
    }

    const event = await this.prisma.event.findFirst({
      where: { id: body.eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const cat = (event.category ?? '').toLowerCase();
    if (cat !== 'gastro') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Promotion requests are only for gastro-category events',
      });
    }

    const payload = gastroPromotionStoredPayloadSchema.parse({
      ...body,
      gastroProfileId: membership.profileId,
    });

    const row = await this.prisma.inboxItem.create({
      data: {
        tenantId,
        kind: 'GASTRO_PROMOTION_REQUEST',
        status: 'PENDING',
        createdByUserId: userId,
        assigneeRole: 'ADMIN',
        title: `Promo gastro: ${body.promotionTitle}`,
        summary: body.promotionDescription ?? null,
        payload: payload as object,
      },
    });

    return mapInboxItem(row);
  }

  async createReviewModerationRequest(
    tenantId: string,
    userId: string,
    userRole: string,
    body: CreateReviewModerationRequestBody,
  ): Promise<InboxItemResponse> {
    const review = await this.prisma.review.findFirst({
      where: { id: body.reviewId, tenantId },
      include: { event: true },
    });
    if (!review) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Review not found',
      });
    }

    const canManage =
      userRole === 'ADMIN' ||
      (await this.profiles.canManageEvent(tenantId, userId, review.event));
    if (!canManage) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot moderate reviews for this event',
      });
    }

    const pending = await this.prisma.inboxItem.findMany({
      where: {
        tenantId,
        kind: 'REVIEW_MODERATION_REQUEST',
        status: 'PENDING',
      },
    });
    const dup = pending.some(
      (i) => (i.payload as { reviewId?: string }).reviewId === body.reviewId,
    );
    if (dup) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'A pending moderation request already exists for this review',
      });
    }

    if (
      (body.requestType === 'OFFICIAL_REPLY' || body.requestType === 'BOTH') &&
      !(body.proposedReply?.trim() || '').length
    ) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'proposedReply is required for official reply requests',
      });
    }

    const payload = createReviewModerationRequestBodySchema.parse(body);

    const row = await this.prisma.inboxItem.create({
      data: {
        tenantId,
        kind: 'REVIEW_MODERATION_REQUEST',
        status: 'PENDING',
        createdByUserId: userId,
        assigneeRole: 'ADMIN',
        title: `Moderación reseña · evento ${review.eventId.slice(0, 8)}…`,
        summary: body.reason.slice(0, 500),
        payload: payload as object,
      },
    });

    return mapInboxItem(row);
  }

  async resolve(
    tenantId: string,
    adminUserId: string,
    inboxItemId: string,
    body: AdminResolveInboxBody,
  ): Promise<InboxItemResponse> {
    const item = await this.prisma.inboxItem.findFirst({
      where: { id: inboxItemId, tenantId, assigneeRole: 'ADMIN' },
    });
    if (!item) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Inbox item not found',
      });
    }
    if (item.status !== 'PENDING') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Inbox item is not pending',
      });
    }

    if (body.decision === 'REJECTED') {
      const updated = await this.prisma.inboxItem.update({
        where: { id: inboxItemId },
        data: {
          status: 'REJECTED',
          resolvedAt: new Date(),
          resolvedByUserId: adminUserId,
          resolutionNote: body.note ?? null,
        },
      });
      return mapInboxItem(updated);
    }

    if (item.kind === 'GASTRO_PROMOTION_REQUEST') {
      const payload = gastroPromotionStoredPayloadSchema.parse(item.payload);
      let discount = body.discount;
      if (!discount) {
        const type = payload.suggestedDiscountType ?? 'PERCENT';
        const value = payload.suggestedValue ?? 10;
        if (type === 'PERCENT' && value > 100) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Suggested percent cannot exceed 100',
          });
        }
        discount = {
          code: randomDiscountCode(),
          type,
          value,
          validFrom: body.promotionValidFrom,
          validTo: body.promotionValidTo,
        };
      }
      if (discount.type === 'PERCENT' && discount.value > 100) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Percent discount cannot exceed 100',
        });
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        const imgs = payload.imageUrls?.length
          ? payload.imageUrls
          : undefined;
        await tx.gastroDiscount.create({
          data: {
            tenantId,
            eventId: payload.eventId,
            gastroProfileId: payload.gastroProfileId,
            code: discount!.code,
            type: discount!.type,
            value: discount!.value,
            validFrom: discount!.validFrom ? new Date(discount!.validFrom) : null,
            validTo: discount!.validTo ? new Date(discount!.validTo) : null,
            status: 'ACTIVE',
            sourceInboxItemId: inboxItemId,
            displayTitle: payload.promotionTitle,
            displayDescription: payload.promotionDescription ?? null,
            displayImageUrls: imgs?.length ? imgs : undefined,
          },
        });
        return tx.inboxItem.update({
          where: { id: inboxItemId },
          data: {
            status: 'APPROVED',
            resolvedAt: new Date(),
            resolvedByUserId: adminUserId,
            resolutionNote: body.note ?? null,
          },
        });
      });

      return mapInboxItem(updated);
    }

    if (item.kind === 'REVIEW_MODERATION_REQUEST') {
      const payload = createReviewModerationRequestBodySchema.parse(item.payload);
      const review = await this.prisma.review.findFirst({
        where: { id: payload.reviewId, tenantId },
      });
      if (!review) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Review not found',
        });
      }

      const hide =
        payload.requestType === 'HIDE_FROM_PUBLIC' || payload.requestType === 'BOTH';
      const wantsReply =
        payload.requestType === 'OFFICIAL_REPLY' || payload.requestType === 'BOTH';
      const replyText = (body.officialReply ?? payload.proposedReply ?? '').trim();

      if (wantsReply && !replyText) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'officialReply or proposedReply required when approving reply',
        });
      }

      const updatedItem = await this.prisma.$transaction(async (tx) => {
        await tx.review.update({
          where: { id: review.id },
          data: {
            hiddenFromPublic: hide ? true : review.hiddenFromPublic,
            officialReply: wantsReply ? replyText : review.officialReply,
            moderatedAt: new Date(),
            moderatedByUserId: adminUserId,
          },
        });
        return tx.inboxItem.update({
          where: { id: inboxItemId },
          data: {
            status: 'APPROVED',
            resolvedAt: new Date(),
            resolvedByUserId: adminUserId,
            resolutionNote: body.note ?? null,
          },
        });
      });

      await this.reviews.recomputeEventRating(review.eventId);
      return mapInboxItem(updatedItem);
    }

    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'Unsupported inbox kind',
    });
  }
}
