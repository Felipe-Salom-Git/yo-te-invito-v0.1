import { Injectable, Logger } from '@nestjs/common';
import { isCourtesyOnlyVisibility, isCourtesyClaimPendingDelivery } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../../email/email.service';
import { GastroDiscountClaimEmailService } from './gastro-discount-claim-email.service';

export type CourtesyDeliveryTrigger = 'APPROVAL' | 'ADMIN_CREATE' | 'REDELIVER';

export type CourtesyDeliverySummary = {
  /** Claims we tried to email in this run (usable + never successfully sent). */
  attempted: number;
  sent: number;
  failed: number;
  /** Usable claims that already had a successful delivery (never re-sent: idempotent). */
  skippedAlreadySent: number;
  emailConfigured: boolean;
  failures: Array<{ email: string; reason: string }>;
};

const emptySummary = (emailConfigured: boolean): CourtesyDeliverySummary => ({
  attempted: 0,
  sent: 0,
  failed: 0,
  skippedAlreadySent: 0,
  emailConfigured,
  failures: [],
});

/**
 * G8.4 — Post-approval delivery of a courtesy campaign.
 *
 * Delivery is decoupled from approval/creation: the recipient set was frozen when the
 * claims were created (retained), so this service NEVER creates claims nor recalculates
 * the audience. It only emails each already-existing, usable claim that has not been
 * delivered yet (`emailSentAt IS NULL`):
 *
 *  - idempotent: a second run skips claims that already have `emailSentAt`
 *  - failure-safe: an email failure is recorded on the claim (`emailSendError`) and
 *    reported in the summary; it never throws, so it cannot revert the approval
 *  - retry: calling it again only targets the claims that failed
 *  - isolation: scoped by tenant + discount + campaign; only individual claim QRs are
 *    used (`claim.qrToken`), NEVER `discount.qrToken`
 *
 * Reuses `GastroDiscountClaimEmailService` (template `GASTRO_DISCOUNT_QR_COURTESY`) and the
 * existing email service; there is no second delivery engine.
 */
@Injectable()
export class GastroCourtesyDeliveryService {
  private readonly logger = new Logger(GastroCourtesyDeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly claimEmail: GastroDiscountClaimEmailService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async deliverCampaign(
    tenantId: string,
    discountId: string,
    opts: {
      actorId: string;
      actorRole: string;
      trigger: CourtesyDeliveryTrigger;
      webBaseUrl?: string;
    },
  ): Promise<CourtesyDeliverySummary> {
    const emailConfigured = this.email.isConfigured();

    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      include: {
        gastroProfile: { select: { id: true, displayName: true } },
        courtesyCampaign: true,
      },
    });

    // Only a live, approved courtesy delivers. Pending / rejected / cancelled never do.
    if (
      !discount ||
      !isCourtesyOnlyVisibility(discount.visibility) ||
      !['ACTIVE', 'APPROVED'].includes(discount.status) ||
      !discount.courtesyCampaign ||
      !discount.gastroProfile
    ) {
      return emptySummary(emailConfigured);
    }
    const campaign = discount.courtesyCampaign;
    const profile = discount.gastroProfile;

    const claims = await this.prisma.gastroDiscountClaim.findMany({
      where: {
        tenantId,
        discountId: discount.id,
        courtesyCampaignId: campaign.id,
        type: 'COURTESY',
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
    });

    const summary = emptySummary(emailConfigured);
    for (const claim of claims) {
      if (
        !isCourtesyClaimPendingDelivery({
          claimType: claim.type,
          claimStatus: claim.status,
          emailSentAt: claim.emailSentAt,
        })
      ) {
        summary.skippedAlreadySent += 1;
        continue;
      }

      summary.attempted += 1;
      try {
        const expiresAt = claim.expiresAt ?? campaign.validTo ?? discount.validTo ?? null;
        const result = await this.claimEmail.sendClaimEmail({
          claimId: claim.id,
          accessToken: claim.accessToken,
          to: claim.email,
          kind: 'COURTESY',
          recipientUserId: claim.userId,
          userName: claim.recipientName,
          gastroName: profile.displayName,
          discountTitle: campaign.title,
          discountDescription: campaign.description ?? null,
          discountLabel: campaign.discountLabel ?? campaign.title,
          // Individual claim QR only. NEVER the discount-level (master) token.
          qrPayload: this.claimEmail.buildQrPayload(discount.id, claim.qrToken),
          qrCode: claim.qrToken,
          shortCode: claim.shortCode,
          validFrom: (campaign.validFrom ?? discount.validFrom)?.toISOString() ?? null,
          validTo: expiresAt ? expiresAt.toISOString() : null,
          courtesyMessage: campaign.message ?? null,
          webBaseUrl: opts.webBaseUrl,
        });
        if (result.sent) {
          summary.sent += 1;
        } else {
          summary.failed += 1;
          summary.failures.push({
            email: claim.email,
            reason: result.error ?? 'Failed to send email',
          });
        }
      } catch (err) {
        // Never propagate: delivery problems must not undo an approval nor stop the batch.
        summary.failed += 1;
        const reason = err instanceof Error ? err.message : 'Failed to send email';
        summary.failures.push({ email: claim.email, reason });
        this.logger.error(`Courtesy delivery failed claim=${claim.id}`, err);
        await this.prisma.gastroDiscountClaim
          .update({ where: { id: claim.id }, data: { emailSendError: reason } })
          .catch(() => undefined);
      }
    }

    try {
      await this.audit.logAction({
        tenantId,
        actorId: opts.actorId,
        actorRole: opts.actorRole,
        action: 'GASTRO_DISCOUNT_COURTESY_SENT',
        entityType: 'GastroCourtesyCampaign',
        entityId: campaign.id,
        metadata: {
          trigger: opts.trigger,
          sentCount: summary.sent,
          failedCount: summary.failed,
          skippedCount: summary.skippedAlreadySent,
          createdCount: claims.length,
          totalRecipients: claims.length,
          emailConfigured,
        },
      });
    } catch (err) {
      this.logger.error(`Courtesy delivery audit failed campaign=${campaign.id}`, err);
    }

    return summary;
  }
}
