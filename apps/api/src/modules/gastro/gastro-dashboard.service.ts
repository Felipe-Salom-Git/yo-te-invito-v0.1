import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  type GastroDashboardAlert,
  type GastroDashboardResponse,
  type GastroDiscountStatus,
  type GastroValidationListQuery,
  type GastroValidationListResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ReviewDisputesService } from '../review-disputes/review-disputes.service';

@Injectable()
export class GastroDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly reviewDisputes: ReviewDisputesService,
  ) {}

  private async assertGastroUser(tenantId: string, userId: string, userRole: string) {
    if (userRole === 'ADMIN') return;
    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Gastro access required',
      });
    }
  }

  private async resolveProfile(tenantId: string, userId: string, userRole: string) {
    if (userRole === 'ADMIN') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { tenantId, status: 'ACTIVE' },
        orderBy: { updatedAt: 'desc' },
      });
      return profile ?? null;
    }
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
    return membership?.profile ?? null;
  }

  private discountWhereForProfile(
    tenantId: string,
    profile: { id: string; publicEventId: string | null } | null,
    userRole: string,
  ): Prisma.GastroDiscountWhereInput {
    if (userRole === 'ADMIN' && !profile) {
      return {
        tenantId,
        event: { deletedAt: null, category: 'gastro' },
      };
    }
    if (!profile) {
      return { id: { in: [] } };
    }
    const or: Prisma.GastroDiscountWhereInput[] = [{ gastroProfileId: profile.id }];
    if (profile.publicEventId) {
      or.push({ eventId: profile.publicEventId });
    }
    return { tenantId, OR: or };
  }

  private validationWhere(
    tenantId: string,
    profile: { id: string; publicEventId: string | null } | null,
    userRole: string,
    opts?: { discountId?: string; from?: Date; to?: Date },
  ): Prisma.GastroDiscountValidationWhereInput {
    const discountWhere = this.discountWhereForProfile(tenantId, profile, userRole);
    return {
      ...(opts?.discountId ? { discountId: opts.discountId } : {}),
      ...(opts?.from || opts?.to
        ? {
            validatedAt: {
              ...(opts.from ? { gte: opts.from } : {}),
              ...(opts.to ? { lte: opts.to } : {}),
            },
          }
        : {}),
      discount: discountWhere,
    };
  }

  private mapValidationRow(v: {
    id: string;
    discountId: string;
    validatedAt: Date;
    discount: {
      displayTitle: string | null;
      code: string;
      status: string;
    };
  }) {
    return {
      id: v.id,
      discountId: v.discountId,
      discountTitle: v.discount.displayTitle?.trim() || v.discount.code,
      discountStatus: v.discount.status as GastroDiscountStatus,
      validatedAt: v.validatedAt.toISOString(),
    };
  }

  async getDashboard(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<GastroDashboardResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.resolveProfile(tenantId, userId, userRole);
    const discountWhere = this.discountWhereForProfile(tenantId, profile, userRole);
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const validationWhere = this.validationWhere(tenantId, profile, userRole);

    const [
      activeDiscounts,
      totalValidations,
      validationsLast7Days,
      recentRows,
      expiredCount,
      inactiveCount,
      publishedContentCount,
      reviewSummary,
    ] = await Promise.all([
      this.prisma.gastroDiscount.count({
        where: { ...discountWhere, status: 'ACTIVE' },
      }),
      this.prisma.gastroDiscountValidation.count({ where: validationWhere }),
      this.prisma.gastroDiscountValidation.count({
        where: { ...validationWhere, validatedAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.gastroDiscountValidation.findMany({
        where: validationWhere,
        orderBy: { validatedAt: 'desc' },
        take: 5,
        include: {
          discount: { select: { displayTitle: true, code: true, status: true } },
        },
      }),
      this.prisma.gastroDiscount.count({
        where: {
          ...discountWhere,
          OR: [
            { status: 'EXPIRED' },
            { discountDate: { lt: now } },
            { validTo: { lt: now } },
          ],
        },
      }),
      this.prisma.gastroDiscount.count({
        where: {
          ...discountWhere,
          status: {
            in: ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION', 'REJECTED', 'CANCELLED'],
          },
        },
      }),
      profile
        ? this.prisma.gastroContent.count({
            where: {
              gastroProfileId: profile.id,
              status: 'PUBLISHED',
            },
          })
        : Promise.resolve(0),
      profile?.publicEventId
        ? this.reviewDisputes
            .getGastroSummary(tenantId, userId, userRole)
            .then((s) => s.unansweredCount ?? 0)
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    const alerts: GastroDashboardAlert[] = [];
    if (expiredCount > 0) alerts.push('EXPIRED_DISCOUNTS');
    if (inactiveCount > 0) alerts.push('INACTIVE_DISCOUNTS');
    if (profile && publishedContentCount === 0) alerts.push('MISSING_PUBLIC_CONTENT');
    if (profile && !profile.bannerUrl && !profile.logoUrl) alerts.push('MISSING_MAIN_IMAGE');

    const hasMainImage = !!(profile?.bannerUrl?.trim() || profile?.logoUrl?.trim());

    return {
      profile: {
        id: profile?.id ?? null,
        displayName: profile?.displayName ?? null,
        status: profile?.status ?? null,
        publicEventId: profile?.publicEventId ?? null,
        hasMainImage,
        publishedContentCount,
      },
      kpis: {
        activeDiscounts,
        totalValidations,
        validationsLast7Days,
        reviewsPendingReply: reviewSummary,
      },
      alerts,
      recentValidations: recentRows.map((v) => ({
        id: v.id,
        discountId: v.discountId,
        discountTitle: v.discount.displayTitle?.trim() || v.discount.code,
        validatedAt: v.validatedAt.toISOString(),
      })),
    };
  }

  async listValidations(
    tenantId: string,
    userId: string,
    userRole: string,
    query: GastroValidationListQuery,
  ): Promise<GastroValidationListResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.resolveProfile(tenantId, userId, userRole);

    if (query.discountId) {
      const d = await this.prisma.gastroDiscount.findFirst({
        where: { id: query.discountId, ...this.discountWhereForProfile(tenantId, profile, userRole) },
      });
      if (!d) {
        return { data: [], total: 0, page: query.page, limit: query.limit };
      }
    }

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    const where = this.validationWhere(tenantId, profile, userRole, {
      discountId: query.discountId,
      from,
      to,
    });

    const skip = (query.page - 1) * query.limit;
    const [total, rows] = await Promise.all([
      this.prisma.gastroDiscountValidation.count({ where }),
      this.prisma.gastroDiscountValidation.findMany({
        where,
        orderBy: { validatedAt: 'desc' },
        skip,
        take: query.limit,
        include: {
          discount: { select: { displayTitle: true, code: true, status: true } },
        },
      }),
    ]);

    return {
      data: rows.map((v) => this.mapValidationRow(v)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
