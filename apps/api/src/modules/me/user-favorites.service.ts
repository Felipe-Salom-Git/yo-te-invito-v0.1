import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import type { FavoriteEntityType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { readPortalPreferences } from './user-portal-preferences.util';
import {
  mapCategory,
  mapEntityType,
  resolveFavoriteProvider,
} from './user-favorite-provider.util';
import type {
  CreateUserFavoriteBody,
  MeFavoritesResponse,
  PatchUserFavoriteNotifications,
  UserFavorite,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { getContentDetailPath } from './user-portal-links.util';

@Injectable()
export class UserFavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveDiscountEvent(discountId: string, tenantId: string) {
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      select: { id: true, eventId: true, gastroProfileId: true },
    });
    if (!discount) return null;
    const event = await this.prisma.event.findFirst({
      where: { id: discount.eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        title: true,
        category: true,
        coverImageUrl: true,
        producerProfileId: true,
        rentalLocationId: true,
        excursionOperatorId: true,
      },
    });
    return { discount, event };
  }

  private mapRow(
    row: {
      id: string;
      entityType: FavoriteEntityType;
      entityId: string;
      category: string;
      providerType: string;
      providerId: string;
      webNotificationsEnabled: boolean;
      emailNotificationsEnabled: boolean;
      createdAt: Date;
    },
    meta?: { title?: string; imageUrl?: string | null; href?: string },
  ): UserFavorite {
    return {
      id: row.id,
      entityType: row.entityType,
      entityId: row.entityId,
      category: row.category as UserFavorite['category'],
      providerType: row.providerType as UserFavorite['providerType'],
      providerId: row.providerId,
      webNotificationsEnabled: row.webNotificationsEnabled,
      emailNotificationsEnabled: row.emailNotificationsEnabled,
      createdAt: row.createdAt.toISOString(),
      title: meta?.title,
      imageUrl: meta?.imageUrl ?? null,
      href: meta?.href,
    };
  }

  async list(tenantId: string, userId: string): Promise<MeFavoritesResponse> {
    const rows = await this.prisma.userFavorite.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });

    const favorites: UserFavorite[] = [];
    for (const row of rows) {
      const meta = await this.resolveDisplayMeta(tenantId, row.entityType, row.entityId);
      favorites.push(this.mapRow(row, meta));
    }
    return { favorites };
  }

  private async resolveDisplayMeta(
    tenantId: string,
    entityType: FavoriteEntityType,
    entityId: string,
  ): Promise<{ title: string; imageUrl: string | null; href: string } | undefined> {
    if (entityType === 'discount') {
      const d = await this.resolveDiscountEvent(entityId, tenantId);
      if (!d?.event) return undefined;
      return {
        title: d.event.title,
        imageUrl: d.event.coverImageUrl,
        href: getContentDetailPath(d.event.category, d.event.id),
      };
    }
    if (entityType === 'gastro') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: entityId, tenantId },
        select: { displayName: true, bannerUrl: true, publicEventId: true },
      });
      if (!profile) return undefined;
      return {
        title: profile.displayName,
        imageUrl: profile.bannerUrl,
        href: profile.publicEventId
          ? getContentDetailPath('gastro', profile.publicEventId)
          : `/restaurants/${entityId}`,
      };
    }
    const event = await this.prisma.event.findFirst({
      where: { id: entityId, tenantId, deletedAt: null },
      select: { id: true, title: true, category: true, coverImageUrl: true },
    });
    if (!event) return undefined;
    return {
      title: event.title,
      imageUrl: event.coverImageUrl,
      href: getContentDetailPath(event.category, event.id),
    };
  }

  async create(
    tenantId: string,
    userId: string,
    body: CreateUserFavoriteBody,
  ): Promise<UserFavorite> {
    if (body.tenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId mismatch',
      });
    }

    const prefs = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { preferences: true },
    });
    const portalPrefs = readPortalPreferences(userId, prefs?.preferences ?? null);
    const defaultEmail = portalPrefs.emailNotificationsEnabled;

    let entityType = body.entityType;
    let entityId = body.entityId;
    let category: string;
    let providerType: UserFavorite['providerType'];
    let providerId: string;

    if (entityType === 'discount') {
      const resolved = await this.resolveDiscountEvent(entityId, tenantId);
      if (!resolved?.event) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Discount not found',
        });
      }
      category = mapCategory(resolved.event.category);
      const provider = await resolveFavoriteProvider(this.prisma, resolved.event);
      providerType = provider.providerType as UserFavorite['providerType'];
      providerId = provider.providerId;
    } else if (entityType === 'gastro') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id: entityId, tenantId },
        select: { id: true, publicEventId: true },
      });
      if (!profile) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Gastro profile not found',
        });
      }
      category = 'gastro';
      providerType = 'gastro';
      providerId = profile.id;
    } else {
      const event = await this.prisma.event.findFirst({
        where: { id: entityId, tenantId, deletedAt: null },
        select: {
          id: true,
          tenantId: true,
          category: true,
          producerProfileId: true,
          rentalLocationId: true,
          excursionOperatorId: true,
        },
      });
      if (!event) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Publication not found',
        });
      }
      category = mapCategory(event.category);
      entityType = mapEntityType(category);
      const provider = await resolveFavoriteProvider(this.prisma, event);
      providerType = provider.providerType as UserFavorite['providerType'];
      providerId = provider.providerId;
    }

    try {
      const row = await this.prisma.userFavorite.create({
        data: {
          tenantId,
          userId,
          entityType,
          entityId,
          category,
          providerType,
          providerId,
          webNotificationsEnabled: body.webNotificationsEnabled ?? true,
          emailNotificationsEnabled: body.emailNotificationsEnabled ?? defaultEmail,
        },
      });
      const meta = await this.resolveDisplayMeta(tenantId, row.entityType, row.entityId);
      return this.mapRow(row, meta);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Already in favorites',
        });
      }
      throw e;
    }
  }

  async remove(tenantId: string, userId: string, favoriteId: string): Promise<void> {
    const result = await this.prisma.userFavorite.deleteMany({
      where: { id: favoriteId, tenantId, userId },
    });
    if (result.count === 0) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Favorite not found',
      });
    }
  }

  async patchNotifications(
    tenantId: string,
    userId: string,
    favoriteId: string,
    patch: PatchUserFavoriteNotifications,
  ): Promise<UserFavorite> {
    const row = await this.prisma.userFavorite.findFirst({
      where: { id: favoriteId, tenantId, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Favorite not found',
      });
    }
    const updated = await this.prisma.userFavorite.update({
      where: { id: favoriteId },
      data: {
        webNotificationsEnabled:
          patch.webNotificationsEnabled ?? row.webNotificationsEnabled,
        emailNotificationsEnabled:
          patch.emailNotificationsEnabled ?? row.emailNotificationsEnabled,
      },
    });
    const meta = await this.resolveDisplayMeta(tenantId, updated.entityType, updated.entityId);
    return this.mapRow(updated, meta);
  }
}
