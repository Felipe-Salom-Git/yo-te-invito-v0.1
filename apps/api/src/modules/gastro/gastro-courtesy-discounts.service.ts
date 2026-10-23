import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  ErrorCode,
  parseMoneyCentsString,
  type GastroCourtesyRecipientsPreviewQuery,
  type GastroCourtesySendBody,
  GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
  initialCourtesyDiscountStatus,
  isCourtesyValidityRangeValid,
  isGastroDiscountExpired,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../../email/email.service';
import { BenefitCommercialAgreementsService } from '../benefit-agreements/benefit-commercial-agreements.service';
import { GastroCourtesyDeliveryService } from './gastro-courtesy-delivery.service';
import { allocateGastroClaimShortCode } from '../../common/gastro-claim-short-code.util';
import { CourtesyCreditLedgerService } from '../courtesy-credit-ledger/courtesy-credit-ledger.service';

const MAX_RECIPIENTS = 200;

type Recipient = {
  email: string;
  userId: string | null;
  displayName: string | null;
  source: 'MANUAL_EMAIL' | 'FOLLOWERS';
};

function pendingCode(): string {
  return `CRS-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class GastroCourtesyDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly courtesyLedger: CourtesyCreditLedgerService,
    private readonly benefitAgreements: BenefitCommercialAgreementsService,
    private readonly delivery: GastroCourtesyDeliveryService,
  ) {}

  private async assertCanManageProfile(
    tenantId: string,
    userId: string,
    userRole: string,
    gastroProfileId: string,
  ) {
    if (userRole === 'ADMIN') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: gastroProfileId, tenantId, status: 'ACTIVE' },
      });
      if (!profile) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Local gastronómico no encontrado',
        });
      }
      // Same precondition as the owner path: a courtesy needs the local's public event
      // (GastroDiscount.eventId is required). Fail clearly instead of a Prisma 500.
      if (!profile.publicEventId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'El local todavía no tiene ficha pública; configurala antes de enviar cortesías',
        });
      }
      return profile;
    }

    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Necesitás un perfil gastronómico activo',
      });
    }

    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profileId: gastroProfileId,
        profile: { status: 'ACTIVE' },
      },
      include: { profile: true },
    });
    if (!membership?.profile.publicEventId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No podés enviar cortesías para este local',
      });
    }
    return membership.profile;
  }

  private async resolveRecipients(
    tenantId: string,
    gastroProfileId: string,
    manualEmails: string[],
    sendToFollowers: boolean,
  ): Promise<{ recipients: Recipient[]; duplicateCount: number }> {
    const byEmail = new Map<string, Recipient>();
    let duplicateCount = 0;

    for (const raw of manualEmails) {
      const email = normalizeEmail(raw);
      if (byEmail.has(email)) {
        duplicateCount += 1;
        continue;
      }
      const user = await this.prisma.user.findFirst({
        where: { tenantId, email, deletedAt: null },
        select: { id: true, firstName: true, lastName: true },
      });
      byEmail.set(email, {
        email,
        userId: user?.id ?? null,
        displayName: user
          ? [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || null
          : null,
        source: 'MANUAL_EMAIL',
      });
    }

    if (sendToFollowers) {
      const follows = await this.prisma.userGastroFollow.findMany({
        where: { tenantId, gastroProfileId },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true, deletedAt: true },
          },
        },
      });
      for (const follow of follows) {
        if (follow.user.deletedAt) continue;
        const rawEmail = follow.user.email?.trim();
        if (!rawEmail) continue;
        const email = normalizeEmail(rawEmail);
        if (byEmail.has(email)) {
          duplicateCount += 1;
          continue;
        }
        byEmail.set(email, {
          email,
          userId: follow.user.id,
          displayName:
            [follow.user.firstName, follow.user.lastName].filter(Boolean).join(' ').trim() ||
            null,
          source: 'FOLLOWERS',
        });
      }
    }

    const recipients = [...byEmail.values()];
    if (recipients.length > MAX_RECIPIENTS) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Máximo ${MAX_RECIPIENTS} destinatarios por envío`,
      });
    }

    return { recipients, duplicateCount };
  }

  async previewRecipients(
    tenantId: string,
    userId: string,
    userRole: string,
    query: GastroCourtesyRecipientsPreviewQuery,
  ) {
    await this.assertCanManageProfile(tenantId, userId, userRole, query.gastroProfileId);

    const manualEmails = query.manualEmails ?? [];
    const sendToFollowers = query.sendToFollowers ?? false;

    const manualSet = new Set(manualEmails.map(normalizeEmail));
    const followersCount = sendToFollowers
      ? await this.prisma.userGastroFollow.count({
          where: { tenantId, gastroProfileId: query.gastroProfileId },
        })
      : 0;

    const { recipients, duplicateCount } = await this.resolveRecipients(
      tenantId,
      query.gastroProfileId,
      manualEmails,
      sendToFollowers,
    );

    const followerSample = recipients
      .filter((r) => r.source === 'FOLLOWERS')
      .slice(0, 5)
      .map((r) => ({
        email: r.email,
        userId: r.userId,
        displayName: r.displayName,
      }));

    return {
      manualCount: manualSet.size,
      followersCount,
      duplicateCount,
      totalUnique: recipients.length,
      followerSample,
    };
  }

  async sendCourtesy(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroCourtesySendBody,
    webBaseUrl?: string,
  ) {
    const profile = await this.assertCanManageProfile(
      tenantId,
      userId,
      userRole,
      body.gastroProfileId,
    );

    if (!body.manualEmails.length && !body.sendToFollowers) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Indicá al menos un destinatario (email o seguidores)',
      });
    }

    const validTo = normalizeGastroDiscountExpiryDate(body.validTo);
    if (Number.isNaN(validTo.getTime()) || isGastroDiscountExpired(validTo)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'La fecha de vencimiento debe ser futura',
      });
    }

    const validFrom = body.validFrom
      ? normalizeGastroDiscountValidFromDate(body.validFrom)
      : new Date();
    if (body.validFrom && Number.isNaN(validFrom.getTime())) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Fecha de inicio inválida',
      });
    }

    if (!isCourtesyValidityRangeValid(validFrom, validTo)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'La fecha de inicio no puede ser posterior al vencimiento',
      });
    }

    const { recipients } = await this.resolveRecipients(
      tenantId,
      body.gastroProfileId,
      body.manualEmails,
      body.sendToFollowers,
    );

    if (recipients.length === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: body.sendToFollowers
          ? 'Este restaurante todavía no tiene seguidores con email válido'
          : 'No hay destinatarios válidos',
      });
    }

    if (body.funding) {
      if (userRole !== 'ADMIN') {
        throw new ForbiddenException({
          code: ErrorCode.BENEFIT_CREDIT_FUNDING_ADMIN_ONLY,
          message: 'Funding courtesy from barter credit is admin-only',
        });
      }
    }

    // G8.3.5: even an ADMIN-created courtesy (no review step) must have a CURRENT commercial
    // agreement for the local before anything is created/delivered. No silent exception.
    // Owner-created courtesies are gated at approval time instead.
    if (userRole === 'ADMIN') {
      await this.assertCurrentAgreement(tenantId, profile.id);
    }

    const eventId = profile.publicEventId!;
    const imputedValueCents = body.funding
      ? parseMoneyCentsString(body.funding.imputedValueCents)
      : null;

    // G8.3.1: owner courtesies are born PENDING_REVIEW (claims retained until ADMIN approval).
    // ADMIN courtesies are born ACTIVE. Reuses the existing GastroDiscount lifecycle.
    const discountStatus = initialCourtesyDiscountStatus(userRole);

    const { discount, campaign, debitEntry, createdClaims } = await this.prisma.$transaction(
      async (tx) => {
        const discount = await tx.gastroDiscount.create({
          data: {
            tenantId,
            eventId,
            gastroProfileId: profile.id,
            code: pendingCode(),
            type: 'PERCENT',
            value: 0,
            displayTitle: body.title.trim(),
            summary: body.description?.trim() ?? body.discountLabel.trim(),
            detail: body.description?.trim() ?? body.discountLabel.trim(),
            displayDescription: body.description?.trim() ?? body.discountLabel.trim(),
            validFrom,
            validTo,
            discountDate: validTo,
            status: discountStatus,
            visibility: 'COURTESY_ONLY',
            // Courtesies never own a discount-level (master) QR.
            qrToken: null,
            createdByOrigin: userRole === 'ADMIN' ? 'ADMIN' : 'GASTRO',
            createdByUserId: userId,
          },
        });

        const campaign = await tx.gastroCourtesyCampaign.create({
          data: {
            tenantId,
            gastroProfileId: profile.id,
            discountId: discount.id,
            title: body.title.trim(),
            description: body.description?.trim() ?? null,
            discountLabel: body.discountLabel.trim(),
            message: body.message?.trim() ?? null,
            validFrom,
            validTo,
            createdByUserId: userId,
          },
        });

        // G8.3 (Option A): freeze the recipient set NOW by pre-creating one claim per
        // recipient, in the same transaction as the campaign. While the parent discount is
        // PENDING_REVIEW these claims are retained (not scannable / not visible / not mailed).
        const createdClaims: Array<{ id: string; email: string }> = [];
        for (const recipient of recipients) {
          const claim = await tx.gastroDiscountClaim.create({
            data: {
              tenantId,
              discountId: discount.id,
              courtesyCampaignId: campaign.id,
              email: recipient.email,
              userId: recipient.userId,
              recipientName: recipient.displayName,
              qrToken: randomBytes(24).toString('hex'),
              accessToken: randomBytes(32).toString('hex'),
              shortCode: await allocateGastroClaimShortCode(tx),
              type: 'COURTESY',
              source: recipient.source,
              status: 'ACTIVE',
              expiresAt: validTo,
            },
          });
          createdClaims.push({ id: claim.id, email: recipient.email });
        }

        let debitEntry: { id: string; amountCents: bigint } | null = null;
        if (imputedValueCents != null) {
          const { entry } = await this.courtesyLedger.debitForGastroCourtesyCampaign(tx, {
            tenantId,
            gastroProfileId: profile.id,
            campaignId: campaign.id,
            imputedValueCents,
            currency: 'ARS',
            actorId: userId,
          });
          debitEntry = entry;
        }

        return { discount, campaign, debitEntry, createdClaims };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 60_000,
      },
    );

    const pendingApproval = discountStatus === 'PENDING_REVIEW';

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'GASTRO_DISCOUNT_COURTESY_CREATED',
      entityType: 'GastroCourtesyCampaign',
      entityId: campaign.id,
      after: {
        discountId: discount.id,
        status: discountStatus,
        recipientCount: recipients.length,
        retainedClaims: pendingApproval ? createdClaims.length : 0,
        gastroProfileId: profile.id,
        fundedFromCourtesyCredit: debitEntry != null,
      },
    });

    if (debitEntry) {
      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: userRole,
        action: 'BENEFIT_CREDIT_DEBITED_FOR_COURTESY',
        entityType: 'CourtesyCreditLedgerEntry',
        entityId: debitEntry.id,
        metadata: {
          campaignId: campaign.id,
          gastroProfileId: profile.id,
          amountCents: debitEntry.amountCents.toString(),
          currency: 'ARS',
        },
      });
    }

    const emailConfigured = this.email.isConfigured();
    const requestedCount = recipients.length;
    const base = {
      campaignId: campaign.id,
      discountId: discount.id,
      requestedCount,
      createdCount: createdClaims.length,
      skippedCount: 0,
      emailConfigured,
      discountStatus,
      pendingApproval,
      fundedFromCourtesyCredit: debitEntry != null,
      ledgerEntryId: debitEntry?.id ?? null,
      imputedValueCents: imputedValueCents != null ? imputedValueCents.toString() : null,
    };

    if (pendingApproval) {
      // G8.4: creation and delivery are two moments. Nothing is emailed until ADMIN approves.
      return { ...base, sentCount: 0, failedCount: 0, failures: [] };
    }

    // ADMIN-created: already approved (agreement gate passed) → deliver now.
    const delivery = await this.delivery.deliverCampaign(tenantId, discount.id, {
      actorId: userId,
      actorRole: userRole,
      trigger: 'ADMIN_CREATE',
      webBaseUrl,
    });
    return {
      ...base,
      emailConfigured: delivery.emailConfigured,
      sentCount: delivery.sent,
      failedCount: delivery.failed,
      failures: delivery.failures,
    };
  }

  /**
   * CURRENT commercial agreement gate for the local (same resolver discounts use).
   * Acts as a commercial gate only: nothing from the agreement is copied to the campaign.
   */
  private async assertCurrentAgreement(tenantId: string, gastroProfileId: string) {
    const ctx = await this.benefitAgreements.resolveApplicable(tenantId, {
      vertical: 'GASTRO',
      gastroProfileId,
    });
    if (!ctx.agreement) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND,
        message: GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
      });
    }
    return ctx.agreement;
  }
}