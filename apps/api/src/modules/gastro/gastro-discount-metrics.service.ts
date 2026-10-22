import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  ErrorCode,
  GASTRO_DISCOUNT_TIMEZONE,
  getGastroDiscountCalendarKey,
  gastroDiscountStartOfDay,
  type GastroDiscountOperationalMetricsResponse,
  type GastroDiscountSummaryResponse,
  type GastroDiscountStatusUpdate,
  isGastroDiscountExpired,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditAction } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import {
  computeGastroDiscountClaimMetrics,
  mapGastroDiscountSummaryClaim,
} from './gastro-discount-metrics.util';

function shiftCalendarDays(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  const utc = Date.UTC(y, m - 1, d + deltaDays);
  const dt = new Date(utc);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function parseCalendarKey(key: string): { year: number; month: number; day: number } {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return { year: y, month: m, day: d };
}

type DiscountRow = {
  id: string;
  displayTitle: string | null;
  summary: string | null;
  detail: string | null;
  status: string;
  validityMode: string;
  validWeekday: string | null;
  validFrom: Date | null;
  validTo: Date | null;
  discountDate: Date | null;
  gastroProfileId: string | null;
  qrToken: string | null;
  createdAt: Date;
  updatedAt: Date;
  gastroProfile?: { id: string; displayName: string } | null;
};

@Injectable()
export class GastroDiscountMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private mapDiscountSummary(
    row: DiscountRow,
    claims: ReturnType<typeof mapGastroDiscountSummaryClaim>[],
    metrics: ReturnType<typeof computeGastroDiscountClaimMetrics>,
    validationCount?: number,
  ): GastroDiscountSummaryResponse {
    return {
      discount: {
        id: row.id,
        title: row.displayTitle,
        summary: row.summary,
        detail: row.detail,
        status: row.status as GastroDiscountSummaryResponse['discount']['status'],
        validityMode: (row.validityMode ?? 'DATE_RANGE') as
          | 'DATE_RANGE'
          | 'WEEKLY_RECURRING',
        validWeekday: (row.validWeekday ?? null) as GastroDiscountSummaryResponse['discount']['validWeekday'],
        validFrom: row.validFrom?.toISOString() ?? null,
        validTo: row.validTo?.toISOString() ?? null,
        discountDate: row.discountDate?.toISOString() ?? null,
        locationId: row.gastroProfile?.id ?? row.gastroProfileId,
        locationName: row.gastroProfile?.displayName ?? null,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      },
      metrics: validationCount !== undefined ? { ...metrics, validationCount } : metrics,
      claims,
      hasExistingClaims: claims.length > 0,
    };
  }

  /**
   * Operational metrics for one discount. Scope: tenantId + gastroProfileId + discountId.
   */
  async getOperationalMetrics(
    tenantId: string,
    gastroProfileId: string,
    discountId: string,
  ): Promise<GastroDiscountOperationalMetricsResponse> {
    const profileId = gastroProfileId?.trim();
    if (!profileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId, gastroProfileId: profileId },
      select: {
        id: true,
        gastroProfileId: true,
        status: true,
        qrToken: true,
        qrGeneratedAt: true,
      },
    });
    if (!row || !row.gastroProfileId) {
      const foreign = await this.prisma.gastroDiscount.findFirst({
        where: { id: discountId, tenantId },
        select: { id: true },
      });
      if (foreign) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Discount does not belong to this location',
        });
      }
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const timezone = GASTRO_DISCOUNT_TIMEZONE;
    const todayKey = getGastroDiscountCalendarKey(new Date(), timezone);
    const start30Key = shiftCalendarDays(todayKey, -29);
    const start30 = parseCalendarKey(start30Key);
    const start30At = gastroDiscountStartOfDay(
      start30.year,
      start30.month,
      start30.day,
      timezone,
    );

    const [
      claims,
      validations,
      usageCount,
      lastValidation,
      recentClaimCodes,
      recentValidationRows,
      claimsLast30,
      validationsLast30,
    ] = await Promise.all([
      this.prisma.gastroDiscountClaim.count({
        where: { tenantId, discountId },
      }),
      this.prisma.gastroDiscountValidation.count({
        where: { discountId },
      }),
      this.prisma.gastroDiscountClaim.count({
        where: {
          tenantId,
          discountId,
          OR: [{ status: 'USED' }, { usedAt: { not: null } }],
        },
      }),
      this.prisma.gastroDiscountValidation.findFirst({
        where: { discountId },
        orderBy: { validatedAt: 'desc' },
        select: { validatedAt: true },
      }),
      this.prisma.gastroDiscountClaim.findMany({
        where: { tenantId, discountId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { shortCode: true },
      }),
      this.prisma.gastroDiscountValidation.findMany({
        where: { discountId },
        orderBy: { validatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          validatedAt: true,
          claimId: true,
          claim: { select: { shortCode: true, status: true } },
        },
      }),
      this.prisma.gastroDiscountClaim.findMany({
        where: { tenantId, discountId, createdAt: { gte: start30At } },
        select: { createdAt: true },
      }),
      this.prisma.gastroDiscountValidation.findMany({
        where: { discountId, validatedAt: { gte: start30At } },
        select: { validatedAt: true },
      }),
    ]);

    const byDay = new Map<string, { claims: number; validations: number }>();
    for (let i = 0; i < 30; i++) {
      byDay.set(shiftCalendarDays(start30Key, i), { claims: 0, validations: 0 });
    }
    for (const c of claimsLast30) {
      const key = getGastroDiscountCalendarKey(c.createdAt, timezone);
      const bucket = byDay.get(key);
      if (bucket) bucket.claims += 1;
    }
    for (const v of validationsLast30) {
      const key = getGastroDiscountCalendarKey(v.validatedAt, timezone);
      const bucket = byDay.get(key);
      if (bucket) bucket.validations += 1;
    }
    const activityByDay = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    return {
      discountId: row.id,
      gastroProfileId: row.gastroProfileId,
      timezone,
      status: row.status as GastroDiscountOperationalMetricsResponse['status'],
      claims,
      validations,
      usageCount,
      availableClaims: Math.max(0, claims - usageCount),
      lastValidationAt: lastValidation?.validatedAt.toISOString() ?? null,
      hasQrToken: Boolean(row.qrToken),
      qrGeneratedAt: row.qrGeneratedAt?.toISOString() ?? null,
      recentShortCodes: recentClaimCodes.map((c) => c.shortCode),
      activityByDay,
      recentValidations: recentValidationRows.map((v) => ({
        id: v.id,
        validatedAt: v.validatedAt.toISOString(),
        claimId: v.claimId,
        shortCode: v.claim?.shortCode ?? null,
        claimStatus:
          (v.claim?.status as GastroDiscountOperationalMetricsResponse['recentValidations'][number]['claimStatus']) ??
          null,
      })),
    };
  }

  async buildSummaryForDiscount(
    tenantId: string,
    discountId: string,
    includeValidationCount = false,
  ): Promise<GastroDiscountSummaryResponse> {
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      include: {
        gastroProfile: { select: { id: true, displayName: true } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const claims = await this.prisma.gastroDiscountClaim.findMany({
      where: { discountId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const mappedClaims = claims.map((c) => mapGastroDiscountSummaryClaim(c));
    const metrics = computeGastroDiscountClaimMetrics(claims);

    let validationCount: number | undefined;
    if (includeValidationCount) {
      validationCount = await this.prisma.gastroDiscountValidation.count({
        where: { discountId },
      });
    }

    return this.mapDiscountSummary(row, mappedClaims, metrics, validationCount);
  }

  private assertDiscountConfigurable(row: DiscountRow) {
    if (!row.displayTitle?.trim()) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El descuento debe tener título',
      });
    }
    if (row.validityMode === 'WEEKLY_RECURRING' && !row.validWeekday) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El descuento recurrente debe tener un día de la semana',
      });
    }
    if (row.validityMode !== 'WEEKLY_RECURRING') {
      const expiresAt = row.validTo ?? row.discountDate;
      if (!expiresAt) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'El descuento debe tener fecha de validez',
        });
      }
      if (isGastroDiscountExpired(expiresAt)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'No se puede activar un descuento vencido',
        });
      }
    }
  }

  async updateDiscountStatus(
    tenantId: string,
    discountId: string,
    body: GastroDiscountStatusUpdate,
    actor: { id: string; role: string },
    opts?: { profileId?: string },
  ): Promise<GastroDiscountSummaryResponse> {
    const row = await this.prisma.gastroDiscount.findFirst({
      where: {
        id: discountId,
        tenantId,
        ...(opts?.profileId ? { gastroProfileId: opts.profileId } : {}),
      },
      include: {
        gastroProfile: { select: { id: true, displayName: true } },
      },
    });

    if (!row) {
      if (opts?.profileId) {
        const foreign = await this.prisma.gastroDiscount.findFirst({
          where: { id: discountId, tenantId },
          select: { id: true },
        });
        if (foreign) {
          throw new ForbiddenException({
            code: ErrorCode.FORBIDDEN,
            message: 'No tenés permiso para gestionar este descuento',
          });
        }
      }
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    if (['REJECTED', 'EXPIRED', 'PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento no puede activarse o desactivarse en su estado actual',
      });
    }

    const beforeStatus = row.status;

    if (body.status === 'ACTIVE') {
      this.assertDiscountConfigurable(row);
      const qrToken = row.qrToken ?? randomBytes(24).toString('hex');
      await this.prisma.gastroDiscount.update({
        where: { id: discountId },
        data: {
          status: 'ACTIVE',
          qrToken,
          ...(row.qrToken ? {} : { qrGeneratedAt: new Date() }),
        },
      });
      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: AuditAction.GASTRO_DISCOUNT_ACTIVATED,
        entityType: 'GastroDiscount',
        entityId: discountId,
        before: { status: beforeStatus },
        after: { status: 'ACTIVE' },
      });
    } else {
      await this.prisma.gastroDiscount.update({
        where: { id: discountId },
        data: { status: 'CANCELLED' },
      });
      await this.audit.logAction({
        tenantId,
        actorId: actor.id,
        actorRole: actor.role,
        action: AuditAction.GASTRO_DISCOUNT_CANCELLED,
        entityType: 'GastroDiscount',
        entityId: discountId,
        before: { status: beforeStatus },
        after: { status: 'CANCELLED' },
      });
    }

    return this.buildSummaryForDiscount(tenantId, discountId, actor.role === 'ADMIN');
  }
}
