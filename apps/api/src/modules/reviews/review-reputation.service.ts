import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { UserReviewerTier } from '@yo-te-invito/shared';

@Injectable()
export class ReviewReputationService {
  constructor(private readonly prisma: PrismaService) {}

  async computeTier(tenantId: string, userId: string): Promise<UserReviewerTier> {
    const [visibleCount, hiddenCount, totalCount] = await Promise.all([
      this.prisma.review.count({
        where: {
          tenantId,
          userId,
          hiddenFromPublic: false,
          status: { in: ['VISIBLE', 'REPORT_REJECTED'] },
        },
      }),
      this.prisma.review.count({
        where: {
          tenantId,
          userId,
          OR: [
            { status: 'HIDDEN' },
            { hiddenFromPublic: true },
          ],
        },
      }),
      this.prisma.review.count({
        where: { tenantId, userId },
      }),
    ]);

    if (visibleCount < 3) return 'NEW';

    const hiddenRatio = totalCount > 0 ? hiddenCount / totalCount : 0;

    if (hiddenCount >= 3 && hiddenRatio >= 0.4) {
      return 'LOW_RELIABILITY';
    }
    if (hiddenCount >= 2 || hiddenRatio >= 0.25) {
      return 'UNDER_OBSERVATION';
    }
    if (visibleCount >= 10 && hiddenCount <= 1) {
      return 'TRUSTED';
    }
    return 'ACTIVE';
  }
}
