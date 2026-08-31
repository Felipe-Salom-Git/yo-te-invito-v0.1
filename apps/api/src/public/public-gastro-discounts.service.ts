import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  buildGastroDiscountQrPayload,
  ErrorCode,
  isGastroDiscountExpired,
  isGastroDiscountValidToday,
  getGastroWeekdayLabelEs,
  getGastroDiscountLocalDayBounds,
  normalizeGastroDiscountExpiryDate,
  type GastroWeekday,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../modules/audit/audit.service';
import { GastroDiscountClaimEmailService } from '../modules/gastro/gastro-discount-claim-email.service';
import { allocateGastroClaimShortCode } from '../common/gastro-claim-short-code.util';

const PUBLIC_STATUSES = ['APPROVED', 'ACTIVE'] as const;

function readUrls(json: unknown): string[] {
  if (!json) return [];
  if (Array.isArray(json)) return json.filter((u): u is string => typeof u === 'string');
  if (typeof json === 'string') {
    try {
      const parsed = JSON.parse(json) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((u): u is string => typeof u === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapListRow(
  d: {
    id: string;
    displayTitle: string | null;
    summary: string | null;
    detail: string | null;
    displayImageUrls: unknown;
    discountDate: Date | null;
    validFrom?: Date | null;
    validTo?: Date | null;
    validityMode?: string | null;
    validWeekday?: string | null;
    type: string;
    value: number;
    gastroProfile: {
      id: string;
      displayName: string;
      city: string | null;
      publicEventId: string | null;
    } | null;
  },
) {
  const imgs = readUrls(d.displayImageUrls);
  return {
    id: d.id,
    title: d.displayTitle,
    summary: d.summary ?? null,
    detail: d.detail,
    headerImageUrl: imgs[0] ?? null,
    discountDate: d.discountDate?.toISOString() ?? null,
    validFrom: d.validFrom?.toISOString() ?? null,
    validTo: d.validTo?.toISOString() ?? null,
    validityMode: (d.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
    validWeekday: (d.validWeekday ?? null) as GastroWeekday | null,
    type: d.type as 'PERCENT' | 'FIXED',
    value: d.value,
    locationId: d.gastroProfile!.id,
    locationName: d.gastroProfile!.displayName,
    locationCity: d.gastroProfile!.city,
    locationSlug: d.gastroProfile!.publicEventId,
  };
}

function isClaimActive(claim: {
  status: string;
  expiresAt: Date | null;
  usedAt: Date | null;
}): boolean {
  if (claim.status === 'CANCELLED' || claim.status === 'USED' || claim.usedAt) return false;
  if (claim.status === 'EXPIRED') return false;
  if (isGastroDiscountExpired(claim.expiresAt)) return false;
  return claim.status === 'ACTIVE';
}

@Injectable()
export class PublicGastroDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly claimEmail: GastroDiscountClaimEmailService,
    private readonly audit: AuditService,
  ) {}

  private discountsWhere(tenantId: string, subcategorySlug?: string) {
    const { start: todayStart } = getGastroDiscountLocalDayBounds();
    return {
      tenantId,
      visibility: 'PUBLIC' as const,
      status: { in: [...PUBLIC_STATUSES] },
      archivedAt: null,
      gastroProfile: {
        status: 'ACTIVE' as const,
        ...(subcategorySlug ? { subcategory: { slug: subcategorySlug } } : {}),
      },
      OR: [
        { validityMode: 'WEEKLY_RECURRING' as const },
        { validTo: { gte: todayStart } },
        { validTo: null, discountDate: { gte: todayStart } },
      ],
    };
  }

  async countPublished(tenantId: string) {
    return this.prisma.gastroDiscount.count({
      where: this.discountsWhere(tenantId),
    });
  }

  async list(tenantId: string, opts?: { subcategorySlug?: string; limit?: number }) {
    const rows = await this.prisma.gastroDiscount.findMany({
      where: this.discountsWhere(tenantId, opts?.subcategorySlug),
      orderBy: [{ discountDate: 'asc' }, { createdAt: 'desc' }],
      take: opts?.limit ?? 50,
      include: {
        gastroProfile: {
          select: {
            id: true,
            displayName: true,
            city: true,
            publicEventId: true,
          },
        },
      },
    });
    return {
      data: rows.filter((r) => r.gastroProfile).map((r) => mapListRow(r)),
    };
  }

  async getById(tenantId: string, discountId: string) {
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, ...this.discountsWhere(tenantId) },
      include: {
        gastroProfile: {
          select: {
            id: true,
            displayName: true,
            city: true,
            publicEventId: true,
          },
        },
      },
    });
    if (!row?.gastroProfile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    const base = mapListRow(row);
    const imgs = readUrls(row.displayImageUrls);
    return {
      ...base,
      imageUrls: imgs,
      eventId: row.eventId,
      claimable:
        !!row.qrToken &&
        PUBLIC_STATUSES.includes(row.status as (typeof PUBLIC_STATUSES)[number]) &&
        isGastroDiscountValidToday({
          validityMode: (row.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
          validWeekday: row.validWeekday as GastroWeekday | null,
          validFrom: row.validFrom,
          validTo: row.validTo,
          discountDate: row.discountDate,
          status: row.status,
        }).valid,
    };
  }

  async claim(
    tenantId: string,
    discountId: string,
    email: string,
    userId?: string | null,
    webBaseUrl?: string,
    actorRole = 'GUEST',
    actorId?: string,
  ) {
    let normalizedEmail = email.trim().toLowerCase();
    if (userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { email: true },
      });
      if (user?.email) normalizedEmail = user.email.trim().toLowerCase();
    }
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: {
        id: discountId,
        tenantId,
        visibility: 'PUBLIC',
        status: { in: [...PUBLIC_STATUSES] },
      },
      include: {
        gastroProfile: { select: { id: true, displayName: true, status: true } },
      },
    });
    if (!discount?.gastroProfile || discount.gastroProfile.status !== 'ACTIVE') {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    if (!discount.qrToken) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento aún no está disponible para reclamar',
      });
    }

    const todayCheck = isGastroDiscountValidToday({
      validityMode: (discount.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
      validWeekday: discount.validWeekday as GastroWeekday | null,
      validFrom: discount.validFrom,
      validTo: discount.validTo,
      discountDate: discount.discountDate,
      status: discount.status,
    });
    if (!todayCheck.valid) {
      if (todayCheck.reason === 'EXPIRED') {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'La fecha de validez de este descuento ya finalizó.',
        });
      }
      if (todayCheck.reason === 'NOT_VALID_TODAY' && discount.validWeekday) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Este cupón solo es válido los ${getGastroWeekdayLabelEs(discount.validWeekday as GastroWeekday)}.`,
        });
      }
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento aún no está disponible para reclamar.',
      });
    }

    const existing = await this.prisma.gastroDiscountClaim.findUnique({
      where: {
        discountId_email: { discountId, email: normalizedEmail },
      },
    });

    const title = discount.displayTitle?.trim() || 'Descuento';
    const locationName = discount.gastroProfile.displayName;
    const rawExpires = discount.validTo ?? discount.discountDate ?? null;
    const expiresAt = rawExpires ? normalizeGastroDiscountExpiryDate(rawExpires) : null;

    const finish = async (claim: {
      id: string;
      accessToken: string;
      qrToken: string;
      emailSentAt: Date | null;
    }) => {
      const qrPayload = this.claimEmail.buildQrPayload(discount.id, claim.qrToken);
      const sendResult = await this.claimEmail.sendClaimEmail({
        claimId: claim.id,
        accessToken: claim.accessToken,
        to: normalizedEmail,
        kind: 'REQUESTED',
        recipientUserId: userId ?? null,
        gastroName: locationName,
        discountTitle: title,
        discountDescription: discount.summary ?? discount.detail,
        qrPayload,
        qrCode: claim.qrToken,
        validTo: expiresAt?.toISOString() ?? null,
        webBaseUrl,
      });
      return {
        claimId: claim.id,
        accessToken: claim.accessToken,
        email: normalizedEmail,
        emailSent: sendResult.sent,
        qrPayload,
        discountTitle: discount.displayTitle,
        locationName,
        message: 'Te enviamos el QR de descuento por email. También podés verlo desde Mi cuenta.',
      };
    };

    if (existing && isClaimActive(existing)) {
      return finish(existing);
    }

    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ya tenés un QR para este descuento que no está activo',
      });
    }

    const claim = await this.prisma.gastroDiscountClaim.create({
      data: {
        tenantId,
        discountId,
        email: normalizedEmail,
        userId: userId ?? null,
        qrToken: randomBytes(24).toString('hex'),
        accessToken: randomBytes(32).toString('hex'),
        shortCode: await allocateGastroClaimShortCode(this.prisma),
        type: 'PUBLIC_REQUEST',
        source: 'WEB',
        status: 'ACTIVE',
        expiresAt,
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actorId ?? userId ?? 'anonymous',
      actorRole,
      action: 'GASTRO_DISCOUNT_REQUESTED',
      entityType: 'GastroDiscountClaim',
      entityId: claim.id,
      metadata: { discountId, email: normalizedEmail },
    });

    return finish(claim);
  }

  async getClaimView(tenantId: string, claimId: string, accessToken: string) {
    const claim = await this.prisma.gastroDiscountClaim.findFirst({
      where: { id: claimId, tenantId, accessToken },
      include: {
        discount: {
          include: {
            gastroProfile: { select: { id: true, displayName: true } },
            courtesyCampaign: { select: { title: true, discountLabel: true, validTo: true } },
          },
        },
        validations: { select: { id: true }, take: 1 },
      },
    });
    const profile = claim?.discount.gastroProfile;
    if (!claim || !profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Claim not found',
      });
    }
    const d = claim.discount;
    const campaign = d.courtesyCampaign;
    const expiresAt =
      claim.expiresAt ?? d.validTo ?? campaign?.validTo ?? d.discountDate ?? null;
    const usedAt = claim.usedAt ?? null;
    let status = claim.status;
    if (status === 'ACTIVE' && !usedAt && claim.validations.length > 0) {
      status = 'USED';
    }
    if (
      status === 'ACTIVE' &&
      expiresAt &&
      isGastroDiscountExpired(expiresAt)
    ) {
      status = 'EXPIRED';
    }
    if (usedAt) status = 'USED';

    return {
      claimId: claim.id,
      email: claim.email,
      qrPayload: this.claimEmail.buildQrPayload(d.id, claim.qrToken),
      discountTitle: campaign?.title ?? d.displayTitle,
      discountSummary: d.summary,
      discountLabel: campaign?.discountLabel ?? null,
      locationName: profile.displayName,
      locationId: profile.id,
      discountDate: d.discountDate?.toISOString() ?? null,
      validTo: expiresAt?.toISOString() ?? null,
      usedAt: usedAt?.toISOString() ?? null,
      status,
      type: claim.type,
      emailSentAt: claim.emailSentAt?.toISOString() ?? null,
    };
  }
}
