import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import type {
  CommercialRelationshipReviewCreateInput,
  CommercialRelationshipReviewResponse,
  CommercialRelationshipReviewSummary,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class CommercialReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
  ) {}

  private async getReferrerProfileId(tenantId: string, userId: string) {
    const membership = await this.prisma.userReferrerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE' },
      select: { profileId: true },
    });
    return membership?.profileId ?? null;
  }

  private mapRow(row: {
    id: string;
    producerProfileId: string;
    referrerProfileId: string;
    relationshipId: string;
    reviewerUserId: string;
    reviewerRole: 'PRODUCER' | 'REFERRER';
    targetType: 'PRODUCER' | 'REFERRER';
    rating: number;
    comment: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CommercialRelationshipReviewResponse {
    return {
      id: row.id,
      producerProfileId: row.producerProfileId,
      referrerProfileId: row.referrerProfileId,
      relationshipId: row.relationshipId,
      reviewerUserId: row.reviewerUserId,
      reviewerRole: row.reviewerRole,
      targetType: row.targetType,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async requireActiveRelationship(
    tenantId: string,
    producerProfileId: string,
    referrerProfileId: string,
  ) {
    const rel = await this.prisma.producerReferrerRelationship.findFirst({
      where: {
        producerProfileId,
        referrerProfileId,
        status: 'ACTIVE',
        producerProfile: { tenantId },
        referrerProfile: { tenantId },
      },
    });
    if (!rel) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No existe una relación comercial activa entre productora y referido',
      });
    }
    return rel;
  }

  async listForProducerReferrer(
    tenantId: string,
    userId: string,
    producerProfileId: string,
    referrerProfileId: string,
  ): Promise<{
    aboutReferrer: CommercialRelationshipReviewResponse[];
    aboutProducer: CommercialRelationshipReviewResponse[];
    summaryAboutReferrer: CommercialRelationshipReviewSummary;
    summaryAboutProducer: CommercialRelationshipReviewSummary;
  }> {
    const myProducerId = await this.profiles.getDefaultProducerProfileId(tenantId, userId);
    if (myProducerId !== producerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'Forbidden' });
    }
    await this.requireActiveRelationship(tenantId, producerProfileId, referrerProfileId);

    const rows = await this.prisma.commercialRelationshipReview.findMany({
      where: { tenantId, producerProfileId, referrerProfileId },
      orderBy: { createdAt: 'desc' },
    });

    const aboutReferrer = rows
      .filter((r) => r.targetType === 'REFERRER')
      .map((r) => this.mapRow(r));
    const aboutProducer = rows
      .filter((r) => r.targetType === 'PRODUCER')
      .map((r) => this.mapRow(r));

    const avg = (items: { rating: number }[]) => {
      if (items.length === 0) return { averageRating: null, totalReviews: 0 };
      const sum = items.reduce((a, b) => a + b.rating, 0);
      return {
        averageRating: Math.round((sum / items.length) * 10) / 10,
        totalReviews: items.length,
      };
    };

    return {
      aboutReferrer,
      aboutProducer,
      summaryAboutReferrer: avg(aboutReferrer),
      summaryAboutProducer: avg(aboutProducer),
    };
  }

  async listForReferrerProducer(
    tenantId: string,
    userId: string,
    referrerProfileId: string,
    producerProfileId: string,
  ) {
    const myReferrerId = await this.getReferrerProfileId(tenantId, userId);
    if (myReferrerId !== referrerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'Forbidden' });
    }
    await this.requireActiveRelationship(tenantId, producerProfileId, referrerProfileId);

    const rows = await this.prisma.commercialRelationshipReview.findMany({
      where: { tenantId, producerProfileId, referrerProfileId },
      orderBy: { createdAt: 'desc' },
    });

    const aboutReferrer = rows
      .filter((r) => r.targetType === 'REFERRER')
      .map((r) => this.mapRow(r));
    const aboutProducer = rows
      .filter((r) => r.targetType === 'PRODUCER')
      .map((r) => this.mapRow(r));

    const avg = (items: { rating: number }[]) => {
      if (items.length === 0) return { averageRating: null, totalReviews: 0 };
      const sum = items.reduce((a, b) => a + b.rating, 0);
      return {
        averageRating: Math.round((sum / items.length) * 10) / 10,
        totalReviews: items.length,
      };
    };

    return {
      aboutReferrer,
      aboutProducer,
      summaryAboutReferrer: avg(aboutReferrer),
      summaryAboutProducer: avg(aboutProducer),
    };
  }

  async createAsProducer(
    tenantId: string,
    userId: string,
    body: CommercialRelationshipReviewCreateInput,
  ): Promise<CommercialRelationshipReviewResponse> {
    if (body.targetType !== 'REFERRER') {
      throw new BadRequestException('Producer must review the referrer');
    }
    const producerProfileId = await this.profiles.getDefaultProducerProfileId(tenantId, userId);
    if (!producerProfileId || producerProfileId !== body.producerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'Forbidden' });
    }
    const rel = await this.requireActiveRelationship(
      tenantId,
      body.producerProfileId,
      body.referrerProfileId,
    );

    const row = await this.prisma.commercialRelationshipReview.upsert({
      where: {
        relationshipId_reviewerUserId_targetType: {
          relationshipId: rel.id,
          reviewerUserId: userId,
          targetType: 'REFERRER',
        },
      },
      create: {
        tenantId,
        relationshipId: rel.id,
        producerProfileId: body.producerProfileId,
        referrerProfileId: body.referrerProfileId,
        reviewerUserId: userId,
        reviewerRole: 'PRODUCER',
        targetType: 'REFERRER',
        rating: body.rating,
        comment: body.comment?.trim() || null,
      },
      update: {
        rating: body.rating,
        comment: body.comment?.trim() || null,
      },
    });
    return this.mapRow(row);
  }

  async createAsReferrer(
    tenantId: string,
    userId: string,
    body: CommercialRelationshipReviewCreateInput,
  ): Promise<CommercialRelationshipReviewResponse> {
    if (body.targetType !== 'PRODUCER') {
      throw new BadRequestException('Referrer must review the producer');
    }
    const referrerProfileId = await this.getReferrerProfileId(tenantId, userId);
    if (!referrerProfileId || referrerProfileId !== body.referrerProfileId) {
      throw new ForbiddenException({ code: ErrorCode.FORBIDDEN, message: 'Forbidden' });
    }
    const rel = await this.requireActiveRelationship(
      tenantId,
      body.producerProfileId,
      body.referrerProfileId,
    );

    const row = await this.prisma.commercialRelationshipReview.upsert({
      where: {
        relationshipId_reviewerUserId_targetType: {
          relationshipId: rel.id,
          reviewerUserId: userId,
          targetType: 'PRODUCER',
        },
      },
      create: {
        tenantId,
        relationshipId: rel.id,
        producerProfileId: body.producerProfileId,
        referrerProfileId: body.referrerProfileId,
        reviewerUserId: userId,
        reviewerRole: 'REFERRER',
        targetType: 'PRODUCER',
        rating: body.rating,
        comment: body.comment?.trim() || null,
      },
      update: {
        rating: body.rating,
        comment: body.comment?.trim() || null,
      },
    });
    return this.mapRow(row);
  }
}
