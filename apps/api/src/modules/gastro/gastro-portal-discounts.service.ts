import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  type GastroDiscountCreateInput,
  type GastroDiscountResponse,
  type GastroDiscountUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';

function pendingCode(): string {
  return `PND-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class GastroPortalDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
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
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      status: row.status as GastroDiscountResponse['status'],
      adminNotes: row.adminNotes,
      rejectionReason: row.rejectionReason,
      qrToken: row.qrToken,
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
    if (!['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este ticket ya no puede editarse',
      });
    }
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
    const discountDate = new Date(body.discountDate);
    if (Number.isNaN(discountDate.getTime())) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid discount date',
      });
    }

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
        discountDate,
        validFrom: discountDate,
        validTo: discountDate,
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
      body.discountDate !== undefined ? new Date(body.discountDate) : undefined;
    if (discountDate && Number.isNaN(discountDate.getTime())) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid discount date',
      });
    }

    const updated = await this.prisma.gastroDiscount.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { displayTitle: body.title.trim() }),
        ...(body.summary !== undefined && {
          summary: body.summary.trim(),
          displayDescription: body.summary.trim(),
        }),
        ...(body.detail !== undefined && { detail: body.detail.trim() }),
        ...(discountDate !== undefined && {
          discountDate,
          validFrom: discountDate,
          validTo: discountDate,
        }),
        ...(body.imageUrls !== undefined && {
          submittedImageUrls: this.urlsJson(body.imageUrls),
        }),
      },
    });
    return this.mapDiscount(updated);
  }
}
