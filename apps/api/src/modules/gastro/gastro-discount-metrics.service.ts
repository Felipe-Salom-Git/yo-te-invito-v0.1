import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  ErrorCode,
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
