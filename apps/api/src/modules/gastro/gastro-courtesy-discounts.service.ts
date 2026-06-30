import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  ErrorCode,
  type GastroCourtesyRecipientsPreviewQuery,
  type GastroCourtesySendBody,
  isGastroDiscountExpired,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { AuditService } from '../audit/audit.service';
import { GastroDiscountClaimEmailService } from './gastro-discount-claim-email.service';
import { EmailService } from '../../email/email.service';

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
    private readonly claimEmail: GastroDiscountClaimEmailService,
    private readonly email: EmailService,
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
        const email = normalizeEmail(follow.user.email);
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

    const eventId = profile.publicEventId!;
    const discount = await this.prisma.gastroDiscount.create({
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
        status: 'ACTIVE',
        visibility: 'COURTESY_ONLY',
      },
    });

    const campaign = await this.prisma.gastroCourtesyCampaign.create({
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

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'GASTRO_DISCOUNT_COURTESY_CREATED',
      entityType: 'GastroCourtesyCampaign',
      entityId: campaign.id,
      after: {
        discountId: discount.id,
        recipientCount: recipients.length,
        gastroProfileId: profile.id,
      },
    });

    let sentCount = 0;
    let skippedCount = 0;
    let createdCount = 0;
    let failedCount = 0;
    const failures: Array<{ email: string; reason: string }> = [];
    const emailConfigured = this.email.isConfigured();
    const requestedCount = recipients.length;

    for (const recipient of recipients) {
      const existing = await this.prisma.gastroDiscountClaim.findUnique({
        where: {
          courtesyCampaignId_email: {
            courtesyCampaignId: campaign.id,
            email: recipient.email,
          },
        },
      });
      if (existing) {
        skippedCount += 1;
        continue;
      }

      const qrToken = randomBytes(24).toString('hex');
      const claim = await this.prisma.gastroDiscountClaim.create({
        data: {
          tenantId,
          discountId: discount.id,
          courtesyCampaignId: campaign.id,
          email: recipient.email,
          userId: recipient.userId,
          recipientName: recipient.displayName,
          qrToken,
          accessToken: randomBytes(32).toString('hex'),
          type: 'COURTESY',
          source: recipient.source,
          status: 'ACTIVE',
          expiresAt: validTo,
        },
      });

      createdCount += 1;
      const qrPayload = this.claimEmail.buildQrPayload(discount.id, qrToken);
      const sendResult = await this.claimEmail.sendClaimEmail({
        claimId: claim.id,
        accessToken: claim.accessToken,
        to: recipient.email,
        kind: 'COURTESY',
        recipientUserId: recipient.userId,
        userName: recipient.displayName,
        gastroName: profile.displayName,
        discountTitle: body.title.trim(),
        discountDescription: body.description ?? null,
        discountLabel: body.discountLabel.trim(),
        qrPayload,
        qrCode: qrToken,
        validTo: validTo.toISOString(),
        courtesyMessage: body.message ?? null,
        webBaseUrl,
      });
      if (sendResult.sent) {
        sentCount += 1;
      } else {
        failedCount += 1;
        failures.push({
          email: recipient.email,
          reason: sendResult.error ?? 'Failed to send email',
        });
      }
    }

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'GASTRO_DISCOUNT_COURTESY_SENT',
      entityType: 'GastroCourtesyCampaign',
      entityId: campaign.id,
      metadata: {
        sentCount,
        skippedCount,
        failedCount,
        createdCount,
        totalRecipients: recipients.length,
        emailConfigured,
      },
    });

    return {
      campaignId: campaign.id,
      discountId: discount.id,
      requestedCount,
      createdCount,
      sentCount,
      skippedCount,
      failedCount,
      failures,
      emailConfigured,
    };
  }
}
