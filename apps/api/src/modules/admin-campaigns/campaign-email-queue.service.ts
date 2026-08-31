import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Queue, Worker, type JobsOptions } from 'bullmq';
import {
  evaluateCampaignEmailDelivery,
  finalizeCampaignStatus,
  isCampaignProviderErrorRetryable,
  sanitizeCampaignErrorCode,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { renderEmailTemplate } from '../../email/templates/email-template.renderer';
import { webAppBaseUrl } from '../../common/referral-checkout-url';
import { getDefaultSupportEmail } from '../../email/templates/email-template.util';
import { CampaignContentService } from './campaign-content.service';

const QUEUE_NAME = 'campaign-emails';
const REDIS_URL = process.env.REDIS_URL ?? '';

type CampaignEmailJob = { deliveryId: string; tenantId: string; campaignId: string };

const JOB_OPTS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 4000 },
  removeOnComplete: 500,
  removeOnFail: 200,
};

@Injectable()
export class CampaignEmailQueueService implements OnModuleDestroy {
  private readonly logger = new Logger(CampaignEmailQueueService.name);
  private queue: Queue<CampaignEmailJob> | null = null;
  private worker: Worker<CampaignEmailJob> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly content: CampaignContentService,
  ) {
    if (REDIS_URL) {
      const connection = { url: REDIS_URL };
      this.queue = new Queue<CampaignEmailJob>(QUEUE_NAME, { connection });
      this.worker = new Worker<CampaignEmailJob>(
        QUEUE_NAME,
        async (job) => {
          await this.processDelivery(job.data.deliveryId);
        },
        {
          connection,
          limiter: { max: 4, duration: 1000 },
          concurrency: 2,
        },
      );
      this.worker.on('failed', (job, err) => {
        if (!job) return;
        const attempts = job.opts.attempts ?? 3;
        if (job.attemptsMade < attempts) return;
        void this.markExhaustedFailure(job.data.deliveryId, err).catch((e) =>
          this.logger.error(`campaign delivery fail handler ${job.data.deliveryId}`, e),
        );
      });
    }
  }

  isQueueAvailable(): boolean {
    return this.queue != null;
  }

  async enqueueCampaign(tenantId: string, campaignId: string): Promise<void> {
    const deliveries = await this.prisma.adminCampaignDelivery.findMany({
      where: { tenantId, campaignId, status: 'QUEUED', channel: 'EMAIL' },
      select: { id: true },
    });
    if (this.queue) {
      for (const d of deliveries) {
        await this.queue.add(
          'send',
          { deliveryId: d.id, tenantId, campaignId },
          { ...JOB_OPTS, jobId: `campaign-delivery:${d.id}` },
        );
      }
      return;
    }
    if (process.env.NODE_ENV === 'production') {
      this.logger.error('REDIS_URL missing — campaign emails not enqueued');
      return;
    }
    for (const d of deliveries) {
      await this.processDelivery(d.id);
    }
  }

  async processDelivery(deliveryId: string): Promise<void> {
    const delivery = await this.prisma.adminCampaignDelivery.findUnique({
      where: { id: deliveryId },
      include: { campaign: true },
    });
    if (!delivery) return;

    const user = delivery.userId
      ? await this.prisma.user.findFirst({
          where: { id: delivery.userId, tenantId: delivery.tenantId },
          select: {
            id: true,
            email: true,
            emailVerified: true,
            status: true,
            role: true,
            tenantId: true,
          },
        })
      : null;

    const pref = delivery.userId
      ? await this.prisma.userMarketingPreference.findFirst({
          where: { userId: delivery.userId, tenantId: delivery.tenantId },
        })
      : null;

    let contentEligible = true;
    try {
      await this.content.resolveEligible(
        delivery.tenantId,
        delivery.campaign.contentType,
        delivery.campaign.contentId,
      );
    } catch {
      contentEligible = false;
    }

    const decision = evaluateCampaignEmailDelivery({
      deliveryStatus: delivery.status,
      cancelRequested: Boolean(delivery.campaign.cancelRequestedAt),
      emailOptIn: pref?.emailOptIn,
      email: user?.email,
      emailVerified: user?.emailVerified,
      status: user?.status,
      role: user?.role,
      userTenantId: user?.tenantId,
      campaignTenantId: delivery.tenantId,
      userGone: !user,
      contentEligible,
      channel: delivery.channel,
    });

    if (decision.action === 'already_sent') return;
    if (decision.action === 'skip') {
      await this.markDelivery(delivery.id, {
        status: 'SKIPPED',
        skipReason: decision.reason,
      });
      await this.refreshCampaign(delivery.campaignId);
      return;
    }

    const to = user?.email?.trim();
    if (!to) {
      await this.markDelivery(delivery.id, { status: 'SKIPPED', skipReason: 'NO_EMAIL' });
      await this.refreshCampaign(delivery.campaignId);
      return;
    }

    let token = pref?.emailUnsubscribeToken;
    if (pref && pref.emailOptIn && !token) {
      token = randomBytes(32).toString('hex');
      await this.prisma.userMarketingPreference.update({
        where: { id: pref.id },
        data: { emailUnsubscribeToken: token },
      });
    }

    const snapshot = (delivery.campaign.contentSnapshot ?? {}) as Record<string, unknown>;
    const unsubscribeUrl = token
      ? `${webAppBaseUrl()}/baja-promos?token=${encodeURIComponent(token)}`
      : '';
    const ctaUrl =
      delivery.campaign.ctaUrl ||
      (typeof snapshot.canonicalUrl === 'string' ? snapshot.canonicalUrl : webAppBaseUrl());
    const imageUrl = typeof snapshot.imageUrl === 'string' ? snapshot.imageUrl : '';

    const rendered = renderEmailTemplate({
      templateId: 'ADMIN_CAMPAIGN',
      variables: {
        subject: delivery.campaign.subject,
        headline: delivery.campaign.headline,
        body: delivery.campaign.body,
        contentTitle: typeof snapshot.title === 'string' ? snapshot.title : '',
        contentBenefit: typeof snapshot.benefit === 'string' ? snapshot.benefit : '',
        imageUrl,
        ctaLabel: delivery.campaign.ctaLabel,
        ctaUrl,
        unsubscribeUrl,
        supportEmail: getDefaultSupportEmail(),
      },
    });

    const result = await this.email.send({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
    });

    if (!result.ok) {
      if (isCampaignProviderErrorRetryable(result.errorCode, result.retryable)) {
        throw new Error(sanitizeCampaignErrorCode(result.errorCode));
      }
      await this.markDelivery(delivery.id, {
        status: 'FAILED',
        errorCode: sanitizeCampaignErrorCode(result.errorCode),
      });
      await this.refreshCampaign(delivery.campaignId);
      return;
    }

    await this.markDelivery(delivery.id, {
      status: 'SENT',
      providerMessageId: result.providerMessageId ?? null,
    });
    await this.refreshCampaign(delivery.campaignId);
  }

  private async markExhaustedFailure(deliveryId: string, err: unknown) {
    const current = await this.prisma.adminCampaignDelivery.findUnique({
      where: { id: deliveryId },
      select: { status: true, campaignId: true },
    });
    if (!current || current.status !== 'QUEUED') return;
    const message = err instanceof Error ? err.message : 'SEND_FAILED';
    await this.markDelivery(deliveryId, {
      status: 'FAILED',
      errorCode: sanitizeCampaignErrorCode(message),
    });
    await this.refreshCampaign(current.campaignId);
  }

  private async markDelivery(
    id: string,
    data: {
      status: 'SENT' | 'SKIPPED' | 'FAILED';
      skipReason?: string;
      errorCode?: string;
      providerMessageId?: string | null;
    },
  ) {
    await this.prisma.adminCampaignDelivery.update({
      where: { id },
      data: {
        status: data.status,
        skipReason: data.skipReason,
        errorCode: data.errorCode,
        providerMessageId: data.providerMessageId,
        processedAt: new Date(),
      },
    });
  }

  async refreshCampaign(campaignId: string): Promise<void> {
    const [sent, skipped, failed, queued, campaign] = await Promise.all([
      this.prisma.adminCampaignDelivery.count({ where: { campaignId, status: 'SENT' } }),
      this.prisma.adminCampaignDelivery.count({ where: { campaignId, status: 'SKIPPED' } }),
      this.prisma.adminCampaignDelivery.count({ where: { campaignId, status: 'FAILED' } }),
      this.prisma.adminCampaignDelivery.count({ where: { campaignId, status: 'QUEUED' } }),
      this.prisma.adminCampaign.findUnique({
        where: { id: campaignId },
        select: { cancelRequestedAt: true, status: true },
      }),
    ]);
    if (!campaign || campaign.status !== 'SENDING') {
      await this.prisma.adminCampaign.update({
        where: { id: campaignId },
        data: { sentCount: sent, skippedCount: skipped, failedCount: failed },
      });
      return;
    }
    if (queued > 0 && !campaign.cancelRequestedAt) {
      await this.prisma.adminCampaign.update({
        where: { id: campaignId },
        data: { sentCount: sent, skippedCount: skipped, failedCount: failed },
      });
      return;
    }
    if (queued > 0 && campaign.cancelRequestedAt) {
      await this.prisma.adminCampaignDelivery.updateMany({
        where: { campaignId, status: 'QUEUED' },
        data: {
          status: 'SKIPPED',
          skipReason: 'CANCELLED_BY_ADMIN',
          processedAt: new Date(),
        },
      });
    }
    const skippedFinal = skipped + (campaign.cancelRequestedAt && queued > 0 ? queued : 0);
    const status = finalizeCampaignStatus({
      sent,
      skipped: skippedFinal,
      failed,
      cancelRequested: Boolean(campaign.cancelRequestedAt),
    });
    await this.prisma.adminCampaign.update({
      where: { id: campaignId },
      data: {
        sentCount: sent,
        skippedCount: skippedFinal,
        failedCount: failed,
        status,
        completedAt: new Date(),
      },
    });
  }

  async onModuleDestroy() {
    await this.worker?.close();
    await this.queue?.close();
  }
}
