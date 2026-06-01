import { Injectable, Logger } from '@nestjs/common';
import type { ReferralCommissionType } from '@yo-te-invito/shared';
import { EmailQueueService } from '../../email/email-queue.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  defaultSupportEmail,
  formatCommissionTypeLabel,
  formatCommissionValueDisplay,
  formatMoneyFromCents,
  producerReferralsUrl,
  producerReferrersUrl,
  referrerDashboardUrl,
  referrerProposalUrl,
  resolveProducerRecipientEmails,
  resolveReferrerRecipientEmails,
} from './referral-email.util';

@Injectable()
export class ReferralEmailsService {
  private readonly logger = new Logger(ReferralEmailsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  notifyProducerAssociated(
    tenantId: string,
    referrerProfileId: string,
    producerProfileId: string,
  ): void {
    void this.sendToReferrers(tenantId, referrerProfileId, 'REFERRAL_PRODUCER_ASSOCIATED', async () => {
      const [referrer, producer] = await Promise.all([
        this.prisma.referrerProfile.findFirst({
          where: { id: referrerProfileId, tenantId },
          select: { displayName: true },
        }),
        this.prisma.producerProfile.findFirst({
          where: { id: producerProfileId, tenantId },
          select: { displayName: true },
        }),
      ]);
      return {
        referrerName: referrer?.displayName ?? 'Referido',
        producerName: producer?.displayName ?? 'Productora',
        producerUrl: producerReferrersUrl(),
        referrerDashboardUrl: referrerDashboardUrl(),
        supportEmail: defaultSupportEmail(),
      };
    }).catch((err) => {
      this.logger.error('notifyProducerAssociated failed', err);
    });
  }

  notifyProposalReceived(tenantId: string, proposalId: string): void {
    void this.loadProposal(tenantId, proposalId)
      .then(async (row) => {
        if (!row) return;
        await this.sendToReferrers(
          tenantId,
          row.referrerProfileId,
          'REFERRAL_PROPOSAL_RECEIVED',
          async () => ({
            referrerName: row.referrerProfile.displayName,
            producerName: row.producerProfile.displayName,
            eventTitle: row.event.title,
            commissionType: formatCommissionTypeLabel(row.commissionType),
            commissionValue: formatCommissionValueDisplay(
              row.commissionType,
              Number(row.commissionValue),
            ),
            proposalUrl: referrerProposalUrl(row.eventId),
            supportEmail: defaultSupportEmail(),
          }),
        );
      })
      .catch((err) => this.logger.error(`notifyProposalReceived failed proposal=${proposalId}`, err));
  }

  notifyProposalAccepted(tenantId: string, proposalId: string): void {
    void this.loadProposal(tenantId, proposalId)
      .then(async (row) => {
        if (!row) return;
        await this.sendToProducers(tenantId, row.producerProfileId, 'REFERRAL_PROPOSAL_ACCEPTED', async () => ({
          producerName: row.producerProfile.displayName,
          referrerName: row.referrerProfile.displayName,
          eventTitle: row.event.title,
          agreementUrl: producerReferralsUrl(),
          supportEmail: defaultSupportEmail(),
        }));
      })
      .catch((err) => this.logger.error(`notifyProposalAccepted failed proposal=${proposalId}`, err));
  }

  notifyProposalRejected(tenantId: string, proposalId: string): void {
    void this.loadProposal(tenantId, proposalId)
      .then(async (row) => {
        if (!row) return;
        await this.sendToProducers(tenantId, row.producerProfileId, 'REFERRAL_PROPOSAL_REJECTED', async () => ({
          producerName: row.producerProfile.displayName,
          referrerName: row.referrerProfile.displayName,
          eventTitle: row.event.title,
          proposalUrl: producerReferralsUrl(),
          supportEmail: defaultSupportEmail(),
        }));
      })
      .catch((err) => this.logger.error(`notifyProposalRejected failed proposal=${proposalId}`, err));
  }

  notifyCommissionGenerated(tenantId: string, commissionId: string): void {
    void this.prisma.referralCommission
      .findFirst({
        where: { id: commissionId, tenantId },
        include: {
          event: { select: { title: true } },
        },
      })
      .then(async (c) => {
        if (!c?.referrerProfileId) return;
        const [referrer, producer] = await Promise.all([
          this.prisma.referrerProfile.findFirst({
            where: { id: c.referrerProfileId, tenantId },
            select: { displayName: true },
          }),
          c.producerProfileId
            ? this.prisma.producerProfile.findFirst({
                where: { id: c.producerProfileId, tenantId },
                select: { displayName: true },
              })
            : Promise.resolve(null),
        ]);
        await this.sendToReferrers(
          tenantId,
          c.referrerProfileId,
          'REFERRAL_COMMISSION_GENERATED',
          async () => ({
            referrerName: referrer?.displayName ?? 'Referido',
            producerName: producer?.displayName ?? 'Productora',
            eventTitle: c.event?.title ?? 'Evento',
            commissionAmount: formatMoneyFromCents(c.amountCents),
            currency: 'ARS',
            saleReference: c.orderId ?? c.referralAttributionId ?? commissionId,
            commissionUrl: referrerDashboardUrl(),
            supportEmail: defaultSupportEmail(),
          }),
        );
      })
      .catch((err) => this.logger.error(`notifyCommissionGenerated failed commission=${commissionId}`, err));
  }

  notifyPaymentRequestCreated(tenantId: string, paymentRequestId: string): void {
    void this.prisma.referralPaymentRequest
      .findFirst({
        where: { id: paymentRequestId, tenantId },
        include: {
          referrerProfile: { select: { displayName: true } },
          producerProfile: { select: { displayName: true } },
        },
      })
      .then(async (req) => {
        if (!req) return;
        await this.sendToProducers(tenantId, req.producerProfileId, 'REFERRAL_PAYMENT_REQUEST_CREATED', async () => ({
          producerName: req.producerProfile.displayName,
          referrerName: req.referrerProfile.displayName,
          requestedAmount: formatMoneyFromCents(req.amountRequestedCents),
          currency: 'ARS',
          paymentRequestUrl: producerReferralsUrl(),
          supportEmail: defaultSupportEmail(),
        }));
      })
      .catch((err) =>
        this.logger.error(`notifyPaymentRequestCreated failed request=${paymentRequestId}`, err),
      );
  }

  notifyPaymentMarkedAsPaid(tenantId: string, paymentRequestId: string): void {
    void this.prisma.referralPaymentRequest
      .findFirst({
        where: { id: paymentRequestId, tenantId },
        include: {
          referrerProfile: { select: { displayName: true } },
          producerProfile: { select: { displayName: true } },
        },
      })
      .then(async (req) => {
        if (!req) return;
        const paidAt = req.paidAt ?? new Date();
        await this.sendToReferrers(
          tenantId,
          req.referrerProfileId,
          'REFERRAL_PAYMENT_MARKED_AS_PAID',
          async () => ({
            referrerName: req.referrerProfile.displayName,
            producerName: req.producerProfile.displayName,
            paidAmount: formatMoneyFromCents(req.amountRequestedCents),
            currency: 'ARS',
            markedPaidAt: paidAt.toLocaleString('es-AR', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }),
            paymentRequestUrl: referrerDashboardUrl(),
            supportEmail: defaultSupportEmail(),
          }),
        );
      })
      .catch((err) =>
        this.logger.error(`notifyPaymentMarkedAsPaid failed request=${paymentRequestId}`, err),
      );
  }

  private async loadProposal(tenantId: string, proposalId: string) {
    return this.prisma.referralCommercialProposal.findFirst({
      where: { id: proposalId, tenantId },
      include: {
        event: { select: { id: true, title: true } },
        referrerProfile: { select: { id: true, displayName: true } },
        producerProfile: { select: { id: true, displayName: true } },
      },
    });
  }

  private async sendToReferrers(
    tenantId: string,
    referrerProfileId: string,
    templateId:
      | 'REFERRAL_PRODUCER_ASSOCIATED'
      | 'REFERRAL_PROPOSAL_RECEIVED'
      | 'REFERRAL_COMMISSION_GENERATED'
      | 'REFERRAL_PAYMENT_MARKED_AS_PAID',
    buildVariables: (recipientName: string) => Promise<Record<string, unknown>>,
  ): Promise<void> {
    const recipients = await resolveReferrerRecipientEmails(
      this.prisma,
      tenantId,
      referrerProfileId,
    );
    for (const r of recipients) {
      const variables = await buildVariables(r.name);
      variables.recipientName = variables.recipientName ?? r.name;
      variables.referrerName = variables.referrerName ?? r.name;
      await this.emailQueue.enqueueTemplate({
        templateId,
        to: r.email,
        variables,
      });
    }
  }

  private async sendToProducers(
    tenantId: string,
    producerProfileId: string,
    templateId:
      | 'REFERRAL_PROPOSAL_ACCEPTED'
      | 'REFERRAL_PROPOSAL_REJECTED'
      | 'REFERRAL_PAYMENT_REQUEST_CREATED',
    buildVariables: () => Promise<Record<string, unknown>>,
  ): Promise<void> {
    const recipients = await resolveProducerRecipientEmails(
      this.prisma,
      tenantId,
      producerProfileId,
    );
    const variables = await buildVariables();
    for (const r of recipients) {
      await this.emailQueue.enqueueTemplate({
        templateId,
        to: r.email,
        variables: {
          ...variables,
          producerName: variables.producerName ?? r.name,
          recipientName: variables.recipientName ?? r.name,
        },
      });
    }
  }
}
