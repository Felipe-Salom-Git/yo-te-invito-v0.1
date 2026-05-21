import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { readPortalPreferences } from './user-portal-preferences.util';
import type {
  CreateUserProducerFollowBody,
  MeProducerFollowsResponse,
  PatchUserProducerFollowNotifications,
  ProducerFollowStatus,
  UserProducerFollow,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class UserProducerFollowsService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(
    row: {
      id: string;
      producerProfileId: string;
      webNotificationsEnabled: boolean;
      emailNotificationsEnabled: boolean;
      createdAt: Date;
      producerProfile?: {
        id: string;
        displayName: string;
        slug: string | null;
        logoUrl: string | null;
        coverImageUrl: string | null;
        city: string | null;
      };
    },
  ): UserProducerFollow {
    return {
      id: row.id,
      producerProfileId: row.producerProfileId,
      webNotificationsEnabled: row.webNotificationsEnabled,
      emailNotificationsEnabled: row.emailNotificationsEnabled,
      createdAt: row.createdAt.toISOString(),
      producer: row.producerProfile
        ? {
            id: row.producerProfile.id,
            displayName: row.producerProfile.displayName,
            slug: row.producerProfile.slug,
            logoUrl: row.producerProfile.logoUrl,
            coverImageUrl: row.producerProfile.coverImageUrl,
            city: row.producerProfile.city,
          }
        : undefined,
    };
  }

  async list(tenantId: string, userId: string): Promise<MeProducerFollowsResponse> {
    const rows = await this.prisma.userProducerFollow.findMany({
      where: { tenantId, userId },
      include: {
        producerProfile: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            logoUrl: true,
            coverImageUrl: true,
            city: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      follows: rows
        .filter((r) => r.producerProfile.status === 'ACTIVE')
        .map((r) =>
          this.mapRow({
            ...r,
            producerProfile: r.producerProfile,
          }),
        ),
    };
  }

  async getStatus(
    tenantId: string,
    userId: string,
    producerProfileId: string,
  ): Promise<ProducerFollowStatus> {
    const row = await this.prisma.userProducerFollow.findFirst({
      where: { tenantId, userId, producerProfileId },
      select: { id: true },
    });
    return { following: !!row, followId: row?.id ?? null };
  }

  async create(
    tenantId: string,
    userId: string,
    body: CreateUserProducerFollowBody,
  ): Promise<UserProducerFollow> {
    if (body.tenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId mismatch',
      });
    }

    const producer = await this.prisma.producerProfile.findFirst({
      where: { id: body.producerProfileId, tenantId, status: 'ACTIVE' },
      select: {
        id: true,
        displayName: true,
        slug: true,
        logoUrl: true,
        coverImageUrl: true,
        city: true,
      },
    });
    if (!producer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Producer not found',
      });
    }

    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { preferences: true },
    });
    const portalPrefs = readPortalPreferences(userId, user?.preferences ?? null);

    try {
      const row = await this.prisma.userProducerFollow.create({
        data: {
          tenantId,
          userId,
          producerProfileId: body.producerProfileId,
          webNotificationsEnabled: body.webNotificationsEnabled ?? true,
          emailNotificationsEnabled:
            body.emailNotificationsEnabled ?? portalPrefs.emailNotificationsEnabled,
        },
        include: {
          producerProfile: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              logoUrl: true,
              coverImageUrl: true,
              city: true,
            },
          },
        },
      });
      return this.mapRow({ ...row, producerProfile: row.producerProfile });
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Already following this producer',
        });
      }
      throw e;
    }
  }

  async remove(tenantId: string, userId: string, id: string): Promise<void> {
    const row = await this.prisma.userProducerFollow.findFirst({
      where: { id, tenantId, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Follow not found',
      });
    }
    await this.prisma.userProducerFollow.delete({ where: { id } });
  }

  async patchNotifications(
    tenantId: string,
    userId: string,
    id: string,
    body: PatchUserProducerFollowNotifications,
  ): Promise<UserProducerFollow> {
    const row = await this.prisma.userProducerFollow.findFirst({
      where: { id, tenantId, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Follow not found',
      });
    }
    const updated = await this.prisma.userProducerFollow.update({
      where: { id },
      data: {
        webNotificationsEnabled: body.webNotificationsEnabled,
        emailNotificationsEnabled: body.emailNotificationsEnabled,
      },
      include: {
        producerProfile: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            logoUrl: true,
            coverImageUrl: true,
            city: true,
          },
        },
      },
    });
    return this.mapRow({ ...updated, producerProfile: updated.producerProfile });
  }
}
