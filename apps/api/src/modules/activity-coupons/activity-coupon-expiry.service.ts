import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isGastroDiscountDateExpired } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ActivityCouponExpiryService {
  private readonly logger = new Logger(ActivityCouponExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.NODE_ENV === 'development' ? '*/15 * * * *' : '10 * * * *')
  async runScheduledExpiry(): Promise<void> {
    if (process.env.ACTIVITY_COUPON_EXPIRY_CRON_ENABLED === 'false') return;
    try {
      const result = await this.persistExpired(new Date());
      if (result.updated > 0) {
        this.logger.log(`Activity coupons marked EXPIRED: ${result.updated}`);
      }
    } catch (err) {
      this.logger.error('Activity coupon expiry job failed', err);
    }
  }

  async persistExpired(now: Date = new Date()): Promise<{ updated: number; ids: string[] }> {
    const candidates = await this.prisma.activityCoupon.findMany({
      where: {
        status: { in: ['ACTIVE', 'APPROVED'] },
        archivedAt: null,
      },
      select: {
        id: true,
        validityMode: true,
        validTo: true,
        couponDate: true,
      },
    });
    const expired = candidates.filter((row) =>
      isGastroDiscountDateExpired({
        status: 'ACTIVE',
        validityMode: row.validityMode,
        validTo: row.validTo,
        discountDate: row.couponDate,
        now,
      }),
    );
    const ids = expired.map((row) => row.id);
    if (ids.length === 0) return { updated: 0, ids: [] };
    const updated = await this.prisma.activityCoupon.updateMany({
      where: { id: { in: ids }, status: { in: ['ACTIVE', 'APPROVED'] } },
      data: { status: 'EXPIRED' },
    });
    return { updated: updated.count, ids };
  }
}
