import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  REVIEW_RANKING_DEFAULT_C,
  REVIEW_RANKING_DEFAULT_M,
  type PublicReviewCategory,
} from '@yo-te-invito/shared';
import {
  eventCategoryToReviewCategory,
  publicReviewVisibleWhere,
  readOverallRating,
} from './review-public.util';

@Injectable()
export class ReviewRankingService {
  constructor(private readonly prisma: PrismaService) {}

  computeBayesianRating(
    averageR: number,
    validCount: number,
    categoryMeanC: number,
    m = REVIEW_RANKING_DEFAULT_M,
  ): number {
    const v = validCount;
    const bayesian =
      (v / (v + m)) * averageR + (m / (v + m)) * categoryMeanC;
    return Math.min(10, Math.max(0, Math.round(bayesian * 100) / 100));
  }

  computeRankingScore(
    bayesianRating: number,
    validReviewCount: number,
    moderationPenalty = 0,
  ): number {
    const volumeBonus = Math.min(
      0.5,
      Math.log10(validReviewCount + 1) * 0.15,
    );
    const raw = bayesianRating + volumeBonus - moderationPenalty;
    return Math.min(10, Math.max(0, Math.round(raw * 100) / 100));
  }

  async categoryGlobalAverage(
    tenantId: string,
    category: PublicReviewCategory,
  ): Promise<number> {
    const rows = await this.prisma.review.findMany({
      where: {
        tenantId,
        hiddenFromPublic: false,
        status: { in: ['VISIBLE', 'REPORT_REJECTED'] },
        event: { category, deletedAt: null },
      },
      select: { overallRating: true, score: true },
      take: 500,
    });
    if (rows.length === 0) return REVIEW_RANKING_DEFAULT_C;
    const sum = rows.reduce((acc, r) => acc + readOverallRating(r), 0);
    return Math.round((sum / rows.length) * 100) / 100;
  }

  /** Persists ratingAvg, ratingCount, bayesianRating, rankingScore on Event (internal metrics). */
  async refreshEventRankingCache(tenantId: string, eventId: string): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId },
      select: { category: true },
    });
    if (!event) return;

    const summary = await this.summarizeEvent(
      tenantId,
      eventId,
      eventCategoryToReviewCategory(event.category),
    );

    await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ratingAvg: summary.averageRating,
        ratingCount: summary.validReviewCount,
        bayesianRating: summary.bayesianRating,
        rankingScore: summary.rankingScore,
      },
    });
  }

  async summarizeEvent(
    tenantId: string,
    eventId: string,
    category: PublicReviewCategory,
  ): Promise<{
    averageRating: number | null;
    validReviewCount: number;
    aspectAverages: Record<string, number> | null;
    recentReviewCount: number;
    bayesianRating: number | null;
    rankingScore: number | null;
  }> {
    const where: Prisma.ReviewWhereInput = {
      tenantId,
      eventId,
      ...publicReviewVisibleWhere,
    };

    const rows = await this.prisma.review.findMany({
      where,
      select: {
        overallRating: true,
        score: true,
        aspectRatings: true,
        createdAt: true,
      },
    });

    const validReviewCount = rows.length;
    if (validReviewCount === 0) {
      return {
        averageRating: null,
        validReviewCount: 0,
        aspectAverages: null,
        recentReviewCount: 0,
        bayesianRating: null,
        rankingScore: null,
      };
    }

    const overalls = rows.map((r) => readOverallRating(r));
    const averageRating =
      Math.round(
        (overalls.reduce((a, b) => a + b, 0) / validReviewCount) * 100,
      ) / 100;

    const aspectSums: Record<string, { sum: number; count: number }> = {};
    for (const row of rows) {
      if (!row.aspectRatings || typeof row.aspectRatings !== 'object') continue;
      for (const [key, val] of Object.entries(
        row.aspectRatings as Record<string, number>,
      )) {
        if (typeof val !== 'number') continue;
        if (!aspectSums[key]) aspectSums[key] = { sum: 0, count: 0 };
        aspectSums[key].sum += val;
        aspectSums[key].count += 1;
      }
    }
    const aspectAverages: Record<string, number> = {};
    for (const [key, { sum, count }] of Object.entries(aspectSums)) {
      aspectAverages[key] =
        Math.round((sum / count) * 100) / 100;
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentReviewCount = rows.filter(
      (r) => r.createdAt >= thirtyDaysAgo,
    ).length;

    const categoryMean = await this.categoryGlobalAverage(tenantId, category);
    const bayesianRating = this.computeBayesianRating(
      averageRating,
      validReviewCount,
      categoryMean,
    );
    const rankingScore = this.computeRankingScore(
      bayesianRating,
      validReviewCount,
    );

    return {
      averageRating,
      validReviewCount,
      aspectAverages: Object.keys(aspectAverages).length ? aspectAverages : null,
      recentReviewCount,
      bayesianRating,
      rankingScore,
    };
  }
}
