import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import type {
  CommercialRelationshipReviewCreateInput,
  CommercialRelationshipReviewResponse,
  CommercialRelationshipReviewSummary,
  CommercialReviewTarget,
} from '@yo-te-invito/shared';
import {
  ErrorCode,
  averageCommercialAspectScores,
  legacyCommercialRatingFromOverall,
  parseCommercialAspectRatings,
} from '@yo-te-invito/shared';

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

  private readOverall(row: { overallRating: number | null; rating: number }): number {
    return row.overallRating ?? row.rating * 2;
  }

  private readAspectRatings(raw: unknown): Record<string, number> | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'number') out[k] = v;
    }
    return Object.keys(out).length > 0 ? out : null;
  }

  private normalizePayload(
    body: CommercialRelationshipReviewCreateInput,
    targetType: CommercialReviewTarget,
  ): {
    rating: number;
    overallRating: number;
    aspectRatings: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  } {
    if (body.aspectRatings) {
      const aspectRatings = parseCommercialAspectRatings(targetType, body.aspectRatings);
      const overallRating =
        body.overallRating ?? averageCommercialAspectScores(aspectRatings);
      const rating = legacyCommercialRatingFromOverall(overallRating);
      return {
        rating,
        overallRating,
        aspectRatings: aspectRatings as Prisma.InputJsonValue,
      };
    }
    if (body.rating == null) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'rating or aspectRatings required',
      });
    }
    const rating = body.rating;
    const overallRating = body.overallRating ?? Math.min(10, Math.max(1, rating * 2));
    return { rating, overallRating, aspectRatings: Prisma.JsonNull };
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
    overallRating: number | null;
    aspectRatings: unknown;
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
      overallRating: row.overallRating,
      aspectRatings: this.readAspectRatings(row.aspectRatings),
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

  private summaryFromRows(
    rows: Array<{ overallRating: number | null; rating: number }>,
  ): CommercialRelationshipReviewSummary {
    if (rows.length === 0) return { averageRating: null, totalReviews: 0 };
    const sum = rows.reduce((a, b) => a + this.readOverall(b), 0);
    return {
      averageRating: Math.round((sum / rows.length) * 10) / 10,
      totalReviews: rows.length,
    };
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

    return {
      aboutReferrer,
      aboutProducer,
      summaryAboutReferrer: this.summaryFromRows(
        rows.filter((r) => r.targetType === 'REFERRER'),
      ),
      summaryAboutProducer: this.summaryFromRows(
        rows.filter((r) => r.targetType === 'PRODUCER'),
      ),
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

    return {
      aboutReferrer,
      aboutProducer,
      summaryAboutReferrer: this.summaryFromRows(
        rows.filter((r) => r.targetType === 'REFERRER'),
      ),
      summaryAboutProducer: this.summaryFromRows(
        rows.filter((r) => r.targetType === 'PRODUCER'),
      ),
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

    const normalized = this.normalizePayload(body, 'REFERRER');

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
        rating: normalized.rating,
        overallRating: normalized.overallRating,
        aspectRatings: normalized.aspectRatings,
        comment: body.comment?.trim() || null,
      },
      update: {
        rating: normalized.rating,
        overallRating: normalized.overallRating,
        aspectRatings: normalized.aspectRatings,
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

    const normalized = this.normalizePayload(body, 'PRODUCER');

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
        rating: normalized.rating,
        overallRating: normalized.overallRating,
        aspectRatings: normalized.aspectRatings,
        comment: body.comment?.trim() || null,
      },
      update: {
        rating: normalized.rating,
        overallRating: normalized.overallRating,
        aspectRatings: normalized.aspectRatings,
        comment: body.comment?.trim() || null,
      },
    });
    return this.mapRow(row);
  }
}
