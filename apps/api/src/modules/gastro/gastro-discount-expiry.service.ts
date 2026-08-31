import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isGastroDiscountDateExpired } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class GastroDiscountExpiryService {
  private readonly logger = new Logger(GastroDiscountExpiryService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(process.env.NODE_ENV === 'development' ? '*/15 * * * *' : '5 * * * *')
  async runScheduledExpiry(): Promise<void> {
    if (process.env.GASTRO_DISCOUNT_EXPIRY_CRON_ENABLED === 'false') return;
    try {
      const result = await this.persistExpiredDiscounts();
      if (result.updated > 0) {
        this.logger.log(`Gastro discounts marked EXPIRED: ${result.updated}`);
      }
    } catch (err) {
      this.logger.error('Gastro discount expiry job failed', err);
    }
  }

  /** Materializes EXPIRED using the shared AR calendar helper. Idempotent. */
  async persistExpiredDiscounts(now: Date = new Date()): Promise<{
    updated: number;
    ids: string[];
  }> {
    const candidates = await this.prisma.gastroDiscount.findMany({
      where: {
        status: { in: ['ACTIVE', 'APPROVED'] },
        archivedAt: null,
      },
      select: {
        id: true,
        validityMode: true,
        validTo: true,
        discountDate: true,
      },
    });

    const ids = candidates
      .filter((row) =>
        isGastroDiscountDateExpired({
          status: 'ACTIVE',
          validityMode: row.validityMode,
          validTo: row.validTo,
          discountDate: row.discountDate,
          now,
        }),
      )
      .map((row) => row.id);

    if (ids.length === 0) return { updated: 0, ids: [] };

    const updated = await this.prisma.gastroDiscount.updateMany({
      where: { id: { in: ids }, status: { in: ['ACTIVE', 'APPROVED'] } },
      data: { status: 'EXPIRED' },
    });

    return { updated: updated.count, ids };
  }
}
