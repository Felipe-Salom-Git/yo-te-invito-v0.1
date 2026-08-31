import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { isGastroDiscountDateExpired } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { GastroLifecycleNotificationsService } from '../notifications/gastro-lifecycle-notifications.service';

@Injectable()
export class GastroDiscountExpiryService {
  private readonly logger = new Logger(GastroDiscountExpiryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly lifecycleNotifications: GastroLifecycleNotificationsService,
  ) {}

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
        tenantId: true,
        displayTitle: true,
        validityMode: true,
        validTo: true,
        discountDate: true,
      },
    });

    const expired = candidates.filter((row) =>
      isGastroDiscountDateExpired({
        status: 'ACTIVE',
        validityMode: row.validityMode,
        validTo: row.validTo,
        discountDate: row.discountDate,
        now,
      }),
    );

    const ids = expired.map((row) => row.id);

    if (ids.length === 0) return { updated: 0, ids: [] };

    const updated = await this.prisma.gastroDiscount.updateMany({
      where: { id: { in: ids }, status: { in: ['ACTIVE', 'APPROVED'] } },
      data: { status: 'EXPIRED' },
    });

    for (const row of expired) {
      this.lifecycleNotifications.notifyDiscountExpired(
        row.tenantId,
        row.id,
        row.displayTitle ?? 'tu descuento',
      );
    }

    return { updated: updated.count, ids };
  }
}
