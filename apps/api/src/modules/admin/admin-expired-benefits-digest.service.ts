import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import {
  EXPIRED_BENEFITS_DIGEST_CRON_DEVELOPMENT,
  EXPIRED_BENEFITS_DIGEST_CRON_PRODUCTION,
  EXPIRED_BENEFITS_DIGEST_KIND,
  EXPIRED_BENEFITS_DIGEST_TIMEZONE,
  expiredBenefitsDigestKey,
  formatExpiredBenefitsDigestLines,
  shouldSendExpiredBenefitsDigest,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../email/email-queue.service';
import { adminPanelUrl } from '../../email/templates/admin-operational-email.util';
import { getDefaultSupportEmail } from '../../email/templates/email-template.util';

const WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AdminExpiredBenefitsDigestService {
  private readonly logger = new Logger(AdminExpiredBenefitsDigestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  @Cron(
    process.env.NODE_ENV === 'development'
      ? EXPIRED_BENEFITS_DIGEST_CRON_DEVELOPMENT
      : EXPIRED_BENEFITS_DIGEST_CRON_PRODUCTION,
    { timeZone: EXPIRED_BENEFITS_DIGEST_TIMEZONE },
  )
  async runScheduled(): Promise<void> {
    if (process.env.ADMIN_EXPIRED_BENEFITS_DIGEST_CRON_ENABLED === 'false') return;
    try {
      const result = await this.runOnce();
      if (result.emailsQueued > 0) {
        this.logger.log(
          `Expired benefits digest queued=${result.emailsQueued} tenants=${result.tenants}`,
        );
      }
    } catch (err) {
      this.logger.error('Expired benefits digest failed', err);
    }
  }

  async runOnce(now: Date = new Date()): Promise<{ emailsQueued: number; tenants: number }> {
    const since = new Date(now.getTime() - WINDOW_MS);
    const digestKey = expiredBenefitsDigestKey(now);

    const [gastro, coupons] = await Promise.all([
      this.prisma.gastroDiscount.findMany({
        where: { status: 'EXPIRED', archivedAt: null, updatedAt: { gte: since } },
        select: { tenantId: true, displayTitle: true },
      }),
      this.prisma.activityCoupon.findMany({
        where: { status: 'EXPIRED', archivedAt: null, updatedAt: { gte: since } },
        select: { tenantId: true, title: true },
      }),
    ]);

    const tenantIds = [...new Set([...gastro.map((g) => g.tenantId), ...coupons.map((c) => c.tenantId)])];
    let emailsQueued = 0;

    for (const tenantId of tenantIds) {
      const gastroTitles = gastro
        .filter((g) => g.tenantId === tenantId)
        .map((g) => g.displayTitle?.trim() || 'Descuento');
      const couponTitles = coupons.filter((c) => c.tenantId === tenantId).map((c) => c.title);
      if (
        !shouldSendExpiredBenefitsDigest({
          gastroExpiredCount: gastroTitles.length,
          activityCouponExpiredCount: couponTitles.length,
        })
      ) {
        continue;
      }

      const gastroFmt = formatExpiredBenefitsDigestLines(gastroTitles);
      const couponFmt = formatExpiredBenefitsDigestLines(couponTitles);

      const admins = await this.prisma.user.findMany({
        where: {
          tenantId,
          role: 'ADMIN',
          status: 'ACTIVE',
          email: { not: null },
        },
        select: { id: true, email: true },
      });

      for (const admin of admins) {
        const to = admin.email?.trim();
        if (!to) continue;
        try {
          await this.prisma.adminOperationalDigestLog.create({
            data: {
              tenantId,
              kind: EXPIRED_BENEFITS_DIGEST_KIND,
              digestKey,
              recipientUserId: admin.id,
            },
          });
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
            continue;
          }
          throw err;
        }
        try {
          await this.emailQueue.enqueueTemplate({
            templateId: 'ADMIN_EXPIRED_BENEFITS_DIGEST',
            to,
            variables: {
              digestDate: digestKey,
              gastroCount: String(gastroTitles.length),
              couponCount: String(couponTitles.length),
              gastroLines: gastroFmt.lines,
              couponLines: couponFmt.lines,
              gastroExtraCount: String(gastroFmt.extraCount),
              couponExtraCount: String(couponFmt.extraCount),
              adminUrl: adminPanelUrl('/admin/gastronomicos'),
              supportEmail: getDefaultSupportEmail(),
            },
          });
          emailsQueued += 1;
        } catch (err) {
          await this.prisma.adminOperationalDigestLog.deleteMany({
            where: {
              tenantId,
              kind: EXPIRED_BENEFITS_DIGEST_KIND,
              digestKey,
              recipientUserId: admin.id,
            },
          });
          throw err;
        }
      }
    }

    return { emailsQueued, tenants: tenantIds.length };
  }
}
