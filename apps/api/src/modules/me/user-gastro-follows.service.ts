import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { readPortalPreferences } from './user-portal-preferences.util';
import type {
  CreateUserGastroFollowBody,
  MeGastroFollowsResponse,
  PatchUserGastroFollowNotifications,
  GastroFollowStatus,
  UserGastroFollow,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class UserGastroFollowsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: {
    id: string;
    gastroProfileId: string;
    webNotificationsEnabled: boolean;
    emailNotificationsEnabled: boolean;
    createdAt: Date;
    gastroProfile?: {
      id: string;
      displayName: string;
      logoUrl: string | null;
      bannerUrl: string | null;
      city: string | null;
      province: string | null;
      publicEventId: string | null;
    };
  }): UserGastroFollow {
    return {
      id: row.id,
      gastroProfileId: row.gastroProfileId,
      webNotificationsEnabled: row.webNotificationsEnabled,
      emailNotificationsEnabled: row.emailNotificationsEnabled,
      createdAt: row.createdAt.toISOString(),
      gastro: row.gastroProfile
        ? {
            id: row.gastroProfile.id,
            displayName: row.gastroProfile.displayName,
            logoUrl: row.gastroProfile.logoUrl,
            bannerUrl: row.gastroProfile.bannerUrl,
            city: row.gastroProfile.city,
            province: row.gastroProfile.province,
            publicEventId: row.gastroProfile.publicEventId,
          }
        : undefined,
    };
  }

  async list(tenantId: string, userId: string): Promise<MeGastroFollowsResponse> {
    const rows = await this.prisma.userGastroFollow.findMany({
      where: { tenantId, userId },
      include: {
        gastroProfile: {
          select: {
            id: true,
            displayName: true,
            logoUrl: true,
            bannerUrl: true,
            city: true,
            province: true,
            publicEventId: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      follows: rows
        .filter((r) => r.gastroProfile.status === 'ACTIVE')
        .map((r) =>
          this.mapRow({
            ...r,
            gastroProfile: r.gastroProfile,
          }),
        ),
    };
  }

  async getStatus(
    tenantId: string,
    userId: string,
    gastroProfileId: string,
  ): Promise<GastroFollowStatus> {
    const row = await this.prisma.userGastroFollow.findFirst({
      where: { tenantId, userId, gastroProfileId },
      select: { id: true },
    });
    return { following: !!row, followId: row?.id ?? null };
  }

  async create(
    tenantId: string,
    userId: string,
    body: CreateUserGastroFollowBody,
  ): Promise<UserGastroFollow> {
    if (body.tenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId mismatch',
      });
    }

    const gastro = await this.prisma.gastroProfile.findFirst({
      where: { id: body.gastroProfileId, tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        displayName: true,
        logoUrl: true,
        bannerUrl: true,
        city: true,
        province: true,
        publicEventId: true,
      },
    });
    if (!gastro) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { preferences: true },
    });
    const portalPrefs = readPortalPreferences(userId, user?.preferences ?? null);

    try {
      const row = await this.prisma.userGastroFollow.create({
        data: {
          tenantId,
          userId,
          gastroProfileId: body.gastroProfileId,
          webNotificationsEnabled: body.webNotificationsEnabled ?? true,
          emailNotificationsEnabled:
            body.emailNotificationsEnabled ?? portalPrefs.emailNotificationsEnabled,
        },
        include: {
          gastroProfile: {
            select: {
              id: true,
              displayName: true,
              logoUrl: true,
              bannerUrl: true,
              city: true,
              province: true,
              publicEventId: true,
            },
          },
        },
      });
      return this.mapRow({ ...row, gastroProfile: row.gastroProfile });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Already following this gastro location',
        });
      }
      throw e;
    }
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const row = await this.prisma.userGastroFollow.findFirst({
      where: { id, tenantId, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Follow not found',
      });
    }
    await this.prisma.userGastroFollow.delete({ where: { id } });
  }

  async patchNotifications(
    tenantId: string,
    userId: string,
    id: string,
    body: PatchUserGastroFollowNotifications,
  ): Promise<UserGastroFollow> {
    const row = await this.prisma.userGastroFollow.findFirst({
      where: { id, tenantId, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Follow not found',
      });
    }
    const updated = await this.prisma.userGastroFollow.update({
      where: { id },
      data: {
        webNotificationsEnabled: body.webNotificationsEnabled,
        emailNotificationsEnabled: body.emailNotificationsEnabled,
      },
      include: {
        gastroProfile: {
          select: {
            id: true,
            displayName: true,
            logoUrl: true,
            bannerUrl: true,
            city: true,
            province: true,
            publicEventId: true,
          },
        },
      },
    });
    return this.mapRow({ ...updated, gastroProfile: updated.gastroProfile });
  }
}
