import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async listPendingProducerProfiles(tenantId: string) {
    const profiles = await this.prisma.producerProfile.findMany({
      where: { tenantId, status: 'PENDING' },
      select: {
        id: true,
        displayName: true,
        createdByUserId: true,
        createdAt: true,
      },
    });
    return { profiles };
  }

  async approveProducerProfile(tenantId: string, profileId: string) {
    const profile = await this.prisma.producerProfile.findFirst({
      where: { id: profileId, tenantId, status: 'PENDING' },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Perfil no encontrado o ya aprobado',
      });
    }

    await this.prisma.$transaction([
      this.prisma.producerProfile.update({
        where: { id: profileId },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.userProducerMembership.updateMany({
        where: { profileId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    return { id: profileId, status: 'ACTIVE', message: 'Perfil aprobado' };
  }

  async listPendingGastroProfiles(tenantId: string) {
    const profiles = await this.prisma.gastroProfile.findMany({
      where: { tenantId, status: 'PENDING' },
      select: {
        id: true,
        displayName: true,
        createdByUserId: true,
        createdAt: true,
      },
    });
    return { profiles };
  }

  async approveGastroProfile(tenantId: string, profileId: string) {
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { id: profileId, tenantId, status: 'PENDING' },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Perfil no encontrado o ya aprobado',
      });
    }

    await this.prisma.$transaction([
      this.prisma.gastroProfile.update({
        where: { id: profileId },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.userGastroMembership.updateMany({
        where: { profileId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    return { id: profileId, status: 'ACTIVE', message: 'Perfil aprobado' };
  }

  async listPendingHotelProfiles(tenantId: string) {
    const profiles = await this.prisma.hotelProfile.findMany({
      where: { tenantId, status: 'PENDING' },
      select: {
        id: true,
        displayName: true,
        websiteUrl: true,
        createdByUserId: true,
        createdAt: true,
      },
    });
    return { profiles };
  }

  async approveHotelProfile(tenantId: string, profileId: string) {
    const profile = await this.prisma.hotelProfile.findFirst({
      where: { id: profileId, tenantId, status: 'PENDING' },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Perfil no encontrado o ya aprobado',
      });
    }

    await this.prisma.$transaction([
      this.prisma.hotelProfile.update({
        where: { id: profileId },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.userHotelMembership.updateMany({
        where: { profileId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    return { id: profileId, status: 'ACTIVE', message: 'Perfil aprobado' };
  }

  /** Legacy: new self-service referrers are ACTIVE immediately; only old PENDING rows appear here. */
  async listPendingReferrerProfiles(tenantId: string) {
    const profiles = await this.prisma.referrerProfile.findMany({
      where: { tenantId, status: 'PENDING' },
      select: {
        id: true,
        displayName: true,
        createdByUserId: true,
        createdAt: true,
      },
    });
    return { profiles };
  }

  async approveReferrerProfile(tenantId: string, profileId: string) {
    const profile = await this.prisma.referrerProfile.findFirst({
      where: { id: profileId, tenantId, status: 'PENDING' },
    });
    if (!profile) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Perfil no encontrado o ya aprobado',
      });
    }

    await this.prisma.$transaction([
      this.prisma.referrerProfile.update({
        where: { id: profileId },
        data: { status: 'ACTIVE' },
      }),
      this.prisma.userReferrerMembership.updateMany({
        where: { profileId },
        data: { status: 'ACTIVE' },
      }),
    ]);

    return { id: profileId, status: 'ACTIVE', message: 'Perfil aprobado' };
  }
}
