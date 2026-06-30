import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  buildGastroDiscountQrPayload,
  ErrorCode,
  type GastroDiscountCreateInput,
  type GastroDiscountResponse,
  type GastroDiscountUpdateInput,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroDiscountMetricsService } from './gastro-discount-metrics.service';
import type { GastroDiscountStatusUpdate, GastroDiscountSummaryResponse } from '@yo-te-invito/shared';

function pendingCode(): string {
  return `PND-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class GastroPortalDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly discountMetrics: GastroDiscountMetricsService,
  ) {}

  mapDiscount(row: {
    id: string;
    tenantId: string;
    eventId: string;
    gastroProfileId: string | null;
    code: string;
    type: string;
    value: number;
    displayTitle: string | null;
    summary: string | null;
    detail: string | null;
    discountDate: Date | null;
    validFrom: Date | null;
    validTo: Date | null;
    validityMode?: string;
    validWeekday?: string | null;
    status: string;
    adminNotes: string | null;
    rejectionReason: string | null;
    qrToken: string | null;
    emailSentAt: Date | null;
    emailSendError: string | null;
    lastEmailAttemptAt: Date | null;
    displayImageUrls?: unknown;
    submittedImageUrls?: unknown;
    createdAt: Date;
    updatedAt: Date;
  }): GastroDiscountResponse {
    const readUrls = (v: unknown) =>
      v && Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
    const submitted = readUrls(row.submittedImageUrls);
    const display = readUrls(row.displayImageUrls);
    const headerImageUrl = display[0] ?? submitted[0] ?? null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      eventId: row.eventId,
      gastroProfileId: row.gastroProfileId,
      code: row.code,
      type: row.type as 'PERCENT' | 'FIXED',
      value: row.value,
      title: row.displayTitle,
      summary: row.summary,
      detail: row.detail,
      discountDate: row.discountDate?.toISOString() ?? null,
      validityMode: (row.validityMode ?? 'DATE_RANGE') as GastroDiscountResponse['validityMode'],
      validWeekday: (row.validWeekday ?? null) as GastroDiscountResponse['validWeekday'],
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      status: row.status as GastroDiscountResponse['status'],
      adminNotes: row.adminNotes,
      rejectionReason: row.rejectionReason,
      qrToken: row.qrToken,
      qrPayload:
        row.qrToken && ['APPROVED', 'ACTIVE'].includes(row.status)
          ? buildGastroDiscountQrPayload(row.id, row.qrToken)
          : null,
      emailSentAt: row.emailSentAt?.toISOString() ?? null,
      emailSendError: row.emailSendError,
      lastEmailAttemptAt: row.lastEmailAttemptAt?.toISOString() ?? null,
      headerImageUrl,
      imageUrls: submitted,
      submittedImageUrls: submitted,
      displayImageUrls: display,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private urlsJson(urls: string[]): Prisma.InputJsonValue {
    return urls as Prisma.InputJsonValue;
  }

  private async assertGastroUser(tenantId: string, userId: string, _userRole: string) {
    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Necesitás un perfil gastronómico activo para gestionar tickets de descuento',
      });
    }
  }

  private async getOwnedProfile(tenantId: string, userId: string) {
    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      include: { profile: true },
      orderBy: { profile: { updatedAt: 'desc' } },
    });
    if (!membership?.profile.publicEventId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Configurá tu local gastronómico antes de crear tickets de descuento',
      });
    }
    return membership.profile;
  }

  private assertEditableStatus(status: string) {
    if (
      !['PENDING_REVIEW', 'COMMISSION_NEGOTIATION', 'ACTIVE', 'APPROVED', 'CANCELLED'].includes(
        status,
      )
    ) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este ticket no puede editarse en su estado actual',
      });
    }
  }

  private async assertOwnDiscount(tenantId: string, userId: string, userRole: string, id: string) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId);
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id, tenantId, gastroProfileId: profile.id },
    });
    if (!row) {
      const foreign = await this.prisma.gastroDiscount.findFirst({
        where: { id, tenantId },
        select: { id: true },
      });
      if (foreign) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'No tenés permiso para gestionar este descuento',
        });
      }
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return { row, profile };
  }

  async listMyDiscounts(tenantId: string, userId: string, userRole: string) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId);
    const or: Prisma.GastroDiscountWhereInput[] = [{ gastroProfileId: profile.id }];
    if (profile.publicEventId) {
      or.push({ eventId: profile.publicEventId });
    }
    const rows = await this.prisma.gastroDiscount.findMany({
      where: { tenantId, OR: or },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows.map((r) => this.mapDiscount(r)) };
  }

  async getMyDiscount(tenantId: string, userId: string, userRole: string, id: string) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId);
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id, tenantId, gastroProfileId: profile.id },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    return this.mapDiscount(row);
  }

  async createMyDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroDiscountCreateInput,
  ) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId);
    const validityMode = body.validityMode ?? 'DATE_RANGE';
    const isWeekly = validityMode === 'WEEKLY_RECURRING';

    const created = await this.prisma.gastroDiscount.create({
      data: {
        tenantId,
        eventId: profile.publicEventId!,
        gastroProfileId: profile.id,
        code: pendingCode(),
        type: 'PERCENT',
        value: 0,
        displayTitle: body.title.trim(),
        summary: body.summary.trim(),
        detail: body.detail.trim(),
        displayDescription: body.summary.trim(),
        validityMode,
        ...(isWeekly
          ? {
              validWeekday: body.validWeekday!,
              discountDate: null,
              validFrom: null,
              validTo: null,
            }
          : {
              discountDate: normalizeGastroDiscountExpiryDate(body.discountDate!),
              validFrom: normalizeGastroDiscountValidFromDate(body.discountDate!),
              validTo: normalizeGastroDiscountExpiryDate(body.discountDate!),
            }),
        status: 'PENDING_REVIEW',
        commissionCoordinationAcceptedAt: new Date(),
        submittedImageUrls: this.urlsJson(body.imageUrls),
      },
    });
    return this.mapDiscount(created);
  }

  async updateMyDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    body: GastroDiscountUpdateInput,
  ) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId);
    const existing = await this.prisma.gastroDiscount.findFirst({
      where: { id, tenantId, gastroProfileId: profile.id },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    this.assertEditableStatus(existing.status);

    const discountDate =
      body.discountDate !== undefined
        ? normalizeGastroDiscountExpiryDate(body.discountDate)
        : undefined;
    if (body.discountDate !== undefined && Number.isNaN(discountDate!.getTime())) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid discount date',
      });
    }

    const nextValidityMode = body.validityMode ?? existing.validityMode;
    const switchingToWeekly = nextValidityMode === 'WEEKLY_RECURRING';
    const switchingToDateRange = nextValidityMode === 'DATE_RANGE';

    const updated = await this.prisma.gastroDiscount.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { displayTitle: body.title.trim() }),
        ...(body.summary !== undefined && {
          summary: body.summary.trim(),
          displayDescription: body.summary.trim(),
        }),
        ...(body.detail !== undefined && { detail: body.detail.trim() }),
        ...(body.validityMode !== undefined && { validityMode: body.validityMode }),
        ...(switchingToWeekly && {
          validWeekday: body.validWeekday ?? existing.validWeekday,
          discountDate: null,
          validFrom: null,
          validTo: null,
        }),
        ...(switchingToDateRange &&
          discountDate !== undefined && {
            discountDate,
            validFrom: normalizeGastroDiscountValidFromDate(body.discountDate!),
            validTo: discountDate,
            validWeekday: null,
          }),
        ...(nextValidityMode === 'DATE_RANGE' &&
          body.validityMode === undefined &&
          discountDate !== undefined && {
            discountDate,
            validFrom: normalizeGastroDiscountValidFromDate(body.discountDate!),
            validTo: discountDate,
          }),
        ...(nextValidityMode === 'WEEKLY_RECURRING' &&
          body.validWeekday !== undefined && { validWeekday: body.validWeekday }),
        ...(body.imageUrls !== undefined && {
          submittedImageUrls: this.urlsJson(body.imageUrls),
        }),
      },
    });
    return this.mapDiscount(updated);
  }

  async getDiscountSummary(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
  ): Promise<GastroDiscountSummaryResponse> {
    await this.assertOwnDiscount(tenantId, userId, userRole, id);
    return this.discountMetrics.buildSummaryForDiscount(tenantId, id, false);
  }

  async updateDiscountStatus(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    body: GastroDiscountStatusUpdate,
  ): Promise<GastroDiscountSummaryResponse> {
    const { profile } = await this.assertOwnDiscount(tenantId, userId, userRole, id);
    return this.discountMetrics.updateDiscountStatus(tenantId, id, body, {
      id: userId,
      role: userRole,
    }, { profileId: profile.id });
  }
}
