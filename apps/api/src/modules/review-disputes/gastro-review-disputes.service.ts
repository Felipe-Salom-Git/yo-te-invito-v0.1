import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCode,
  type CreateReviewDisputeInput,
  type ReviewDisputeResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReviewNotificationsService } from '../notifications/review-notifications.service';
import { OPEN_DISPUTE_STATUSES, createDisputeRecord, mapDispute } from './review-dispute-records';

/**
 * G12.1-C — "Denunciar" for gastro reviews: same dispute domain / admin queue as producers,
 * scoped to the local (`GastroProfile.publicEventId` = review event).
 * G12.1-C — «Denunciar» valoraciones gastro: mismo dominio y cola admin que productoras,
 * con alcance por local.
 */
@Injectable()
export class GastroReviewDisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly reviewNotifications: ReviewNotificationsService,
  ) {}

  async createDispute(
    tenantId: string,
    userId: string,
    userRole: string,
    reviewId: string,
    body: CreateReviewDisputeInput,
  ): Promise<ReviewDisputeResponse> {
    const review = await this.prisma.review.findFirst({
      where: { id: reviewId, tenantId },
      include: { event: true },
    });
    if (!review) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Review not found' });
    }
    if (review.event.category !== 'gastro') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Review does not belong to a gastro local',
      });
    }

    const profile = await this.prisma.gastroProfile.findFirst({
      where: { tenantId, publicEventId: review.eventId },
      select: { id: true },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Local not found for this review',
      });
    }

    const canManage = await this.profiles.canManageGastroPublicEvent(
      tenantId,
      userId,
      userRole,
      review.eventId,
    );
    if (!canManage) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Cannot dispute reviews for this local',
      });
    }

    const existingOpen = await this.prisma.reviewDisputeRequest.findFirst({
      where: {
        tenantId,
        reviewId,
        gastroProfileId: profile.id,
        status: { in: OPEN_DISPUTE_STATUSES },
      },
    });
    if (existingOpen) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Ya existe una solicitud abierta para esta valoración',
      });
    }

    const dispute = await createDisputeRecord(this.prisma, {
      tenantId,
      userId,
      review: { id: reviewId, eventId: review.eventId, eventTitle: review.event.title },
      owner: { gastroProfileId: profile.id },
      body,
    });

    this.reviewNotifications.notifyDisputeCreated(
      tenantId,
      dispute.id,
      {
        id: review.event.id,
        title: review.event.title,
        category: review.event.category,
        producerProfileId: review.event.producerProfileId,
        producerId: review.event.producerId,
      },
      [userId],
    );

    return mapDispute(dispute);
  }
}
