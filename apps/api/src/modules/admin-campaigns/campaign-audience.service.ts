import { Injectable } from '@nestjs/common';
import { isEmailCampaignEligible, type AdminCampaignAudienceKind } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

export type CampaignAudienceMember = {
  userId: string;
  email: string;
};

function readPreferredCities(preferences: unknown): string[] {
  if (!preferences || typeof preferences !== 'object') return [];
  const rec = preferences as Record<string, unknown>;
  const list = rec.preferredCities;
  const cities = Array.isArray(list)
    ? list.filter((c): c is string => typeof c === 'string')
    : [];
  if (typeof rec.preferredCity === 'string' && rec.preferredCity.trim()) {
    cities.push(rec.preferredCity);
  }
  return cities.map((c) => c.trim().toLowerCase());
}

function readFavoriteCategories(preferences: unknown): string[] {
  if (!preferences || typeof preferences !== 'object') return [];
  const list = (preferences as Record<string, unknown>).favoriteCategories;
  if (!Array.isArray(list)) return [];
  return list.filter((c): c is string => typeof c === 'string');
}

@Injectable()
export class CampaignAudienceService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(params: {
    tenantId: string;
    campaignTenantId: string;
    audienceKind: AdminCampaignAudienceKind;
    city?: string;
    category?: string;
    contentType: string;
    contentId: string;
  }): Promise<CampaignAudienceMember[]> {
    const prefs = await this.prisma.userMarketingPreference.findMany({
      where: { tenantId: params.tenantId, emailOptIn: true },
      select: { userId: true },
    });
    if (prefs.length === 0) return [];

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: params.tenantId,
        id: { in: prefs.map((p) => p.userId) },
        status: 'ACTIVE',
        role: { not: 'SCANNER' },
        email: { not: null },
        emailVerified: { not: null },
      },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        status: true,
        role: true,
        tenantId: true,
        preferences: true,
      },
    });

    let scoped = users.filter((u) => {
      const check = isEmailCampaignEligible({
        emailOptIn: true,
        email: u.email,
        emailVerified: u.emailVerified,
        status: u.status,
        role: u.role,
        userTenantId: u.tenantId,
        campaignTenantId: params.campaignTenantId,
      });
      return check.ok;
    });

    if (params.audienceKind === 'CITY' && params.city) {
      const needle = params.city.trim().toLowerCase();
      scoped = scoped.filter((u) => readPreferredCities(u.preferences).includes(needle));
    }

    if (params.audienceKind === 'FAVORITE_CATEGORY' && params.category) {
      const favUserIds = new Set(
        (
          await this.prisma.userFavorite.findMany({
            where: {
              tenantId: params.tenantId,
              userId: { in: scoped.map((u) => u.id) },
              category: params.category,
            },
            select: { userId: true },
          })
        ).map((f) => f.userId),
      );
      scoped = scoped.filter(
        (u) =>
          readFavoriteCategories(u.preferences).includes(params.category!) ||
          favUserIds.has(u.id),
      );
    }

    if (params.audienceKind === 'CONTENT_CLAIMANTS') {
      const claimantIds = await this.claimantUserIds(
        params.tenantId,
        params.contentType,
        params.contentId,
      );
      const set = new Set(claimantIds);
      scoped = scoped.filter((u) => set.has(u.id));
    }

    const byEmail = new Map<string, CampaignAudienceMember>();
    for (const u of scoped) {
      const email = u.email?.trim().toLowerCase();
      if (!email || !u.email) continue;
      if (!byEmail.has(email)) {
        byEmail.set(email, { userId: u.id, email: u.email });
      }
    }
    return [...byEmail.values()];
  }

  private async claimantUserIds(
    tenantId: string,
    contentType: string,
    contentId: string,
  ): Promise<string[]> {
    if (contentType === 'GASTRO_DISCOUNT') {
      const rows = await this.prisma.gastroDiscountClaim.findMany({
        where: { tenantId, discountId: contentId, userId: { not: null } },
        select: { userId: true },
      });
      return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
    }
    if (contentType === 'ACTIVITY_COUPON') {
      const rows = await this.prisma.activityCouponClaim.findMany({
        where: { tenantId, couponId: contentId, userId: { not: null } },
        select: { userId: true },
      });
      return rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
    }
    const [favorites, expected] = await Promise.all([
      this.prisma.userFavorite.findMany({
        where: { tenantId, entityId: contentId },
        select: { userId: true },
      }),
      this.prisma.userExpectedEvent.findMany({
        where: { tenantId, eventId: contentId },
        select: { userId: true },
      }),
    ]);
    return [...favorites.map((f) => f.userId), ...expected.map((e) => e.userId)].filter(
      (id): id is string => Boolean(id),
    );
  }
}
