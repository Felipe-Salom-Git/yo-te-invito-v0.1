import { Injectable } from '@nestjs/common';
import {
  COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES,
  GASTRO_DISCOUNT_TIMEZONE,
  getGastroDiscountCalendarKey,
  gastroDiscountStartOfDay,
  type GastroProfileMetricsResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { GastroOwnershipService } from './gastro-ownership.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ErrorCode } from '@yo-te-invito/shared';

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

@Injectable()
export class GastroProfileMetricsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ownership: GastroOwnershipService,
    private readonly profiles: ProfilesAuthorizationService,
  ) {}

  private async assertCanReadMetrics(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId: string,
  ) {
    if (userRole === 'ADMIN') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: profileId, tenantId },
        select: { id: true },
      });
      if (!profile) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Gastro location not found',
        });
      }
      return;
    }
    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Gastro access required',
      });
    }
    await this.ownership.assertCanManageProfile(tenantId, userId, profileId);
  }

  async getMetricsForProfile(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId: string | null | undefined,
  ): Promise<GastroProfileMetricsResponse> {
    let resolvedId: string;
    if (userRole === 'ADMIN') {
      const explicit = profileId?.trim();
      if (!explicit) {
        throw new NotFoundException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'profileId is required',
        });
      }
      resolvedId = explicit;
    } else {
      resolvedId = await this.ownership.resolveManagedProfileId(
        tenantId,
        userId,
        profileId,
      );
    }

    await this.assertCanReadMetrics(tenantId, userId, userRole, resolvedId);

    const timezone = GASTRO_DISCOUNT_TIMEZONE;
    const todayKey = getGastroDiscountCalendarKey(new Date(), timezone);
    const start30Key = shiftCalendarDays(todayKey, -29);
    const start7Key = shiftCalendarDays(todayKey, -6);
    const start30 = parseCalendarKey(start30Key);
    const start30At = gastroDiscountStartOfDay(
      start30.year,
      start30.month,
      start30.day,
      timezone,
    );
    const start7 = parseCalendarKey(start7Key);
    const start7At = gastroDiscountStartOfDay(start7.year, start7.month, start7.day, timezone);
    const today = parseCalendarKey(todayKey);
    const todayAt = gastroDiscountStartOfDay(today.year, today.month, today.day, timezone);

    const [
      totalViews,
      viewsToday,
      viewsLast7Days,
      viewsLast30Rows,
      activeDiscounts,
      totalClaims,
      totalValidations,
    ] = await Promise.all([
      this.prisma.gastroProfileView.count({
        where: { tenantId, gastroProfileId: resolvedId },
      }),
      this.prisma.gastroProfileView.count({
        where: { tenantId, gastroProfileId: resolvedId, viewedAt: { gte: todayAt } },
      }),
      this.prisma.gastroProfileView.count({
        where: { tenantId, gastroProfileId: resolvedId, viewedAt: { gte: start7At } },
      }),
      this.prisma.gastroProfileView.findMany({
        where: {
          tenantId,
          gastroProfileId: resolvedId,
          viewedAt: { gte: start30At },
        },
        select: { viewedAt: true },
      }),
      this.prisma.gastroDiscount.count({
        where: { tenantId, gastroProfileId: resolvedId, status: 'ACTIVE', visibility: 'PUBLIC' },
      }),
      // G8.8: claims of courtesies still awaiting approval are retained audience, not claims.
      this.prisma.gastroDiscountClaim.count({
        where: {
          tenantId,
          discount: { gastroProfileId: resolvedId },
          NOT: {
            type: 'COURTESY',
            status: 'ACTIVE',
            discount: { status: { in: [...COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES] } },
          },
        },
      }),
      this.prisma.gastroDiscountValidation.count({
        where: { discount: { tenantId, gastroProfileId: resolvedId } },
      }),
    ]);

    const byDay = new Map<string, number>();
    for (let i = 0; i < 30; i++) {
      byDay.set(shiftCalendarDays(start30Key, i), 0);
    }
    for (const row of viewsLast30Rows) {
      const key = getGastroDiscountCalendarKey(row.viewedAt, timezone);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const viewsByDay = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({ date, views }));

    return {
      gastroProfileId: resolvedId,
      timezone,
      totalViews,
      viewsToday,
      viewsLast7Days,
      viewsLast30Days: viewsLast30Rows.length,
      viewsByDay,
      activeDiscounts,
      totalClaims,
      totalValidations,
    };
  }
}
