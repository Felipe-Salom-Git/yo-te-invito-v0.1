import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  canArchiveCampaign,
  canCancelCampaign,
  canEditCampaignDraft,
  canHardDeleteCampaign,
  canSendCampaign,
  isAllowedCampaignCtaUrl,
  maskEmailHint,
  type AdminCampaignAudienceFilter,
  type AdminCampaignsListQuery,
  type AdminCampaignDeliveriesQuery,
  type CreateAdminCampaignBody,
  type UpdateAdminCampaignBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { isWhatsAppCampaignProviderConfigured } from '../marketing-preferences/whatsapp-campaign-provider.util';
import { CampaignAudienceService } from './campaign-audience.service';
import { CampaignContentService } from './campaign-content.service';
import { CampaignEmailQueueService } from './campaign-email-queue.service';

@Injectable()
export class AdminCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly content: CampaignContentService,
    private readonly audience: CampaignAudienceService,
    private readonly campaignEmails: CampaignEmailQueueService,
  ) {}

  async list(tenantId: string, query: AdminCampaignsListQuery) {
    const where: Prisma.AdminCampaignWhereInput = {
      tenantId,
      archivedAt: query.status ? undefined : null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.channel ? { channel: query.channel } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.adminCampaign.count({ where }),
      this.prisma.adminCampaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.pageSize,
      }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, data: rows.map((r) => this.summary(r)) };
  }

  async get(tenantId: string, id: string) {
    return this.summary(await this.require(tenantId, id));
  }

  async create(
    tenantId: string,
    actor: { id: string; role: string },
    body: CreateAdminCampaignBody,
  ) {
    this.assertCta(body.ctaUrl);
    await this.content.resolveEligible(tenantId, body.contentType, body.contentId);
    const row = await this.prisma.adminCampaign.create({
      data: {
        tenantId,
        createdByUserId: actor.id,
        channel: body.channel,
        contentType: body.contentType,
        contentId: body.contentId,
        audienceKind: body.audienceKind,
        audienceFilter: (body.audienceFilter ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        subject: body.subject,
        headline: body.headline,
        body: body.body,
        ctaLabel: body.ctaLabel,
        ctaUrl: body.ctaUrl ?? null,
      },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CAMPAIGN_CREATED',
      entityType: 'AdminCampaign',
      entityId: row.id,
      metadata: { channel: row.channel, contentType: row.contentType },
    });
    return this.summary(row);
  }

  async update(
    tenantId: string,
    actor: { id: string; role: string },
    id: string,
    body: UpdateAdminCampaignBody,
  ) {
    const row = await this.require(tenantId, id);
    if (!canEditCampaignDraft(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.CAMPAIGN_NOT_EDITABLE,
        message: 'Only DRAFT campaigns can be edited',
      });
    }
    if (body.ctaUrl) this.assertCta(body.ctaUrl);
    const updated = await this.prisma.adminCampaign.update({
      where: { id: row.id },
      data: {
        ...(body.audienceKind ? { audienceKind: body.audienceKind } : {}),
        ...(body.audienceFilter !== undefined
          ? { audienceFilter: body.audienceFilter as Prisma.InputJsonValue }
          : {}),
        ...(body.subject ? { subject: body.subject } : {}),
        ...(body.headline ? { headline: body.headline } : {}),
        ...(body.body ? { body: body.body } : {}),
        ...(body.ctaLabel ? { ctaLabel: body.ctaLabel } : {}),
        ...(body.ctaUrl !== undefined ? { ctaUrl: body.ctaUrl } : {}),
      },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CAMPAIGN_UPDATED',
      entityType: 'AdminCampaign',
      entityId: updated.id,
    });
    return this.summary(updated);
  }

  async preview(tenantId: string, id: string) {
    const row = await this.require(tenantId, id);
    const snapshot = await this.content.resolveEligible(
      tenantId,
      row.contentType,
      row.contentId,
    );
    const filter = (row.audienceFilter ?? {}) as AdminCampaignAudienceFilter;
    const members = await this.audience.resolve({
      tenantId,
      campaignTenantId: tenantId,
      audienceKind: row.audienceKind,
      city: filter.city,
      category: filter.category,
      contentType: row.contentType,
      contentId: row.contentId,
    });
    return {
      campaignId: row.id,
      channel: row.channel,
      content: snapshot,
      subject: row.subject,
      headline: row.headline,
      body: row.body,
      ctaLabel: row.ctaLabel,
      ctaUrl: row.ctaUrl ?? snapshot.canonicalUrl,
      audienceKind: row.audienceKind,
      eligibleCount: members.length,
      whatsappConfigured: isWhatsAppCampaignProviderConfigured(),
    };
  }

  async send(tenantId: string, actor: { id: string; role: string }, id: string) {
    const row = await this.require(tenantId, id);
    if (!canSendCampaign(row.status)) {
      throw new ConflictException({
        code: ErrorCode.CAMPAIGN_ALREADY_SENDING,
        message: 'Campaign cannot be sent in its current status',
      });
    }
    if (row.channel === 'WHATSAPP' && !isWhatsAppCampaignProviderConfigured()) {
      throw new BadRequestException({
        code: ErrorCode.WHATSAPP_PROVIDER_NOT_CONFIGURED,
        message: 'WhatsApp provider is not configured',
      });
    }
    if (
      row.channel === 'EMAIL' &&
      process.env.NODE_ENV === 'production' &&
      !this.campaignEmails.isQueueAvailable()
    ) {
      throw new ServiceUnavailableException({
        code: ErrorCode.CAMPAIGN_QUEUE_UNAVAILABLE,
        message: 'Campaign email queue requires REDIS_URL',
      });
    }

    const snapshot = await this.content.resolveEligible(
      tenantId,
      row.contentType,
      row.contentId,
    );
    const filter = (row.audienceFilter ?? {}) as AdminCampaignAudienceFilter;
    const members = await this.audience.resolve({
      tenantId,
      campaignTenantId: tenantId,
      audienceKind: row.audienceKind,
      city: filter.city,
      category: filter.category,
      contentType: row.contentType,
      contentId: row.contentId,
    });

    const locked = await this.prisma.adminCampaign.updateMany({
      where: { id: row.id, tenantId, status: 'DRAFT' },
      data: {
        status: 'SENDING',
        startedAt: new Date(),
        contentSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        queuedCount: members.length,
      },
    });
    if (locked.count !== 1) {
      throw new ConflictException({
        code: ErrorCode.CAMPAIGN_ALREADY_SENDING,
        message: 'Another admin already started this campaign',
      });
    }

    if (members.length === 0) {
      await this.prisma.adminCampaign.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          queuedCount: 0,
        },
      });
    } else {
      await this.prisma.adminCampaignDelivery.createMany({
        data: members.map((m) => ({
          tenantId,
          campaignId: row.id,
          userId: m.userId,
          channel: row.channel,
          status: 'QUEUED' as const,
          targetHint: maskEmailHint(m.email),
        })),
        skipDuplicates: true,
      });
      if (row.channel === 'EMAIL') {
        await this.campaignEmails.enqueueCampaign(tenantId, row.id);
      }
    }

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CAMPAIGN_SEND_REQUESTED',
      entityType: 'AdminCampaign',
      entityId: row.id,
      metadata: { queued: members.length, channel: row.channel },
    });

    return this.summary(await this.require(tenantId, id));
  }

  async cancel(tenantId: string, actor: { id: string; role: string }, id: string) {
    const row = await this.require(tenantId, id);
    if (!canCancelCampaign(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.CAMPAIGN_NOT_EDITABLE,
        message: 'Campaign cannot be cancelled',
      });
    }
    if (row.status === 'DRAFT') {
      const updated = await this.prisma.adminCampaign.update({
        where: { id: row.id },
        data: { status: 'CANCELLED', completedAt: new Date() },
      });
      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: 'CAMPAIGN_CANCELLED',
        entityType: 'AdminCampaign',
        entityId: row.id,
      });
      return this.summary(updated);
    }
    const updated = await this.prisma.adminCampaign.update({
      where: { id: row.id },
      data: { cancelRequestedAt: new Date() },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CAMPAIGN_CANCELLED',
      entityType: 'AdminCampaign',
      entityId: row.id,
      metadata: { inflight: true },
    });
    return this.summary(updated);
  }

  async archive(tenantId: string, actor: { id: string; role: string }, id: string) {
    const row = await this.require(tenantId, id);
    if (!canArchiveCampaign(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.CAMPAIGN_NOT_EDITABLE,
        message: 'Only finished campaigns can be archived',
      });
    }
    const updated = await this.prisma.adminCampaign.update({
      where: { id: row.id },
      data: { archivedAt: new Date() },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CAMPAIGN_ARCHIVED',
      entityType: 'AdminCampaign',
      entityId: row.id,
    });
    return this.summary(updated);
  }

  async removeDraft(tenantId: string, id: string) {
    const row = await this.require(tenantId, id);
    if (!canHardDeleteCampaign(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.CAMPAIGN_NOT_EDITABLE,
        message: 'Only DRAFT campaigns can be deleted',
      });
    }
    await this.prisma.adminCampaign.delete({ where: { id: row.id } });
    return { ok: true as const };
  }

  async listDeliveries(tenantId: string, id: string, query: AdminCampaignDeliveriesQuery) {
    await this.require(tenantId, id);
    const where: Prisma.AdminCampaignDeliveryWhereInput = {
      tenantId,
      campaignId: id,
      ...(query.status ? { status: query.status } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const [total, rows] = await Promise.all([
      this.prisma.adminCampaignDelivery.count({ where }),
      this.prisma.adminCampaignDelivery.findMany({
        where,
        orderBy: { queuedAt: 'desc' },
        skip,
        take: query.pageSize,
        select: {
          id: true,
          status: true,
          channel: true,
          skipReason: true,
          errorCode: true,
          targetHint: true,
          queuedAt: true,
          processedAt: true,
        },
      }),
    ]);
    return { total, page: query.page, pageSize: query.pageSize, data: rows };
  }

  private assertCta(url: string | null | undefined) {
    if (!url) return;
    if (!isAllowedCampaignCtaUrl(url)) {
      throw new BadRequestException({
        code: ErrorCode.CAMPAIGN_INVALID_CTA,
        message: 'CTA URL must be HTTPS (or localhost HTTP in development)',
      });
    }
  }

  private async require(tenantId: string, id: string) {
    const row = await this.prisma.adminCampaign.findFirst({ where: { id, tenantId } });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Campaign not found',
      });
    }
    return row;
  }

  private summary(row: {
    id: string;
    tenantId: string;
    createdByUserId: string | null;
    status: string;
    channel: string;
    contentType: string;
    contentId: string;
    contentSnapshot: Prisma.JsonValue | null;
    audienceKind: string;
    audienceFilter: Prisma.JsonValue | null;
    subject: string;
    headline: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string | null;
    queuedCount: number;
    sentCount: number;
    skippedCount: number;
    failedCount: number;
    startedAt: Date | null;
    completedAt: Date | null;
    cancelRequestedAt: Date | null;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...row,
      whatsappConfigured: isWhatsAppCampaignProviderConfigured(),
    };
  }
}
