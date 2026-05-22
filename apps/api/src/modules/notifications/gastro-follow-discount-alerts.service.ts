import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { readPortalPreferences } from '../me/user-portal-preferences.util';
import { UserNotificationsService } from './user-notifications.service';

const GASTRO_CONTENT_ALERT_KINDS: NotificationKind[] = [
  NotificationKind.FOLLOWED_GASTRO_NEW_DISCOUNT,
];

@Injectable()
export class GastroFollowDiscountAlertsService {
  private readonly logger = new Logger(GastroFollowDiscountAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  private maxAlertsPerUserPerHour(): number {
    const n = Number(process.env.SMART_ALERTS_MAX_PER_USER_HOUR ?? 5);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
  }

  private async isThrottled(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.notificationDeliveryLog.count({
      where: {
        userId,
        kind: { in: GASTRO_CONTENT_ALERT_KINDS },
        sentAt: { gte: since },
      },
    });
    return count >= this.maxAlertsPerUserPerHour();
  }

  /**
   * Notifica seguidores cuando un descuento pasa a ACTIVE (idempotente por discountId).
   */
  async notifyFollowersOfNewActiveDiscount(
    tenantId: string,
    discountId: string,
  ): Promise<{ attempted: number; delivered: number; skipped?: string }> {
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        displayTitle: true,
        code: true,
        gastroProfileId: true,
        gastroProfile: { select: { id: true, displayName: true } },
      },
    });

    if (!discount?.gastroProfileId) {
      return { attempted: 0, delivered: 0, skipped: 'no_profile' };
    }

    const localName = discount.gastroProfile?.displayName?.trim() || 'Un local';
    const discountTitle = discount.displayTitle?.trim() || discount.code;
    const href = `/descuentos/${discount.id}?tenantId=${encodeURIComponent(tenantId)}`;
    const referenceKey = `gastro-discount-active:${discount.id}`;

    const follows = await this.prisma.userGastroFollow.findMany({
      where: { tenantId, gastroProfileId: discount.gastroProfileId },
      include: {
        user: {
          select: {
            id: true,
            tenantId: true,
            email: true,
            preferences: true,
            status: true,
          },
        },
      },
    });

    let delivered = 0;
    for (const row of follows) {
      if (row.user.status !== 'ACTIVE') continue;
      if (!row.webNotificationsEnabled && !row.emailNotificationsEnabled) continue;

      const prefs = readPortalPreferences(row.user.id, row.user.preferences);
      if (await this.isThrottled(row.user.id)) continue;

      const result = await this.notifications.deliver({
        tenantId: row.user.tenantId,
        userId: row.user.id,
        userEmail: row.user.email,
        kind: NotificationKind.FOLLOWED_GASTRO_NEW_DISCOUNT,
        referenceKey,
        title: 'Nuevo descuento en un local que seguís',
        body: `${localName} publicó: ${discountTitle}`,
        href,
        sendInApp: prefs.webNotificationsEnabled && row.webNotificationsEnabled,
        sendEmail:
          prefs.emailNotificationsEnabled &&
          row.emailNotificationsEnabled,
        preferences: prefs,
      });
      if (result.inApp || result.email || result.push) delivered += 1;
    }

    if (follows.length > 0) {
      this.logger.debug(
        `notifyFollowersOfNewActiveDiscount discount=${discountId} followers=${follows.length} delivered=${delivered}`,
      );
    }

    return { attempted: follows.length, delivered };
  }
}
