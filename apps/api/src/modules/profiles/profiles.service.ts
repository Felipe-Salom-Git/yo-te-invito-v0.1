import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  ProfileProducerApplyInput,
  ProfileGastroApplyInput,
  ProfileReferrerApplyInput,
} from '@yo-te-invito/shared';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) { }

  async applyProducer(
    tenantId: string,
    userId: string,
    body: ProfileProducerApplyInput,
  ) {
    const existing = await this.prisma.userProducerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de productor activo',
      });
    }

    const profile = await this.prisma.producerProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        legalName: body.legalName ?? null,
        shortDescription: body.description ?? null,
        city: body.city ?? null,
        country: body.country ?? null,
        createdByUserId: userId,
        status: 'PENDING',
      },
    });

    await this.prisma.userProducerMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'PENDING',
      },
    });

    return {
      id: profile.id,
      displayName: profile.displayName,
      status: profile.status,
      message: 'Solicitud enviada. Serás notificado cuando sea aprobada.',
    };
  }

  async applyGastro(
    tenantId: string,
    userId: string,
    body: ProfileGastroApplyInput,
  ) {
    const existing = await this.prisma.userGastroMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil gastronómico activo',
      });
    }

    const profile = await this.prisma.gastroProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        legalName: body.legalName ?? null,
        description: body.description ?? null,
        address: body.address ?? null,
        city: body.city ?? null,
        contactPhone: body.contactPhone ?? null,
        createdByUserId: userId,
        status: 'PENDING',
      },
    });

    await this.prisma.userGastroMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'PENDING',
      },
    });

    return {
      id: profile.id,
      displayName: profile.displayName,
      status: profile.status,
      message: 'Solicitud enviada. Serás notificado cuando sea aprobada.',
    };
  }

  async applyReferrer(
    tenantId: string,
    userId: string,
    body: ProfileReferrerApplyInput,
  ) {
    const existing = await this.prisma.userReferrerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de referidor activo',
      });
    }

    const profile = await this.prisma.referrerProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        publicHandle: body.publicHandle ?? null,
        bio: body.bio ?? null,
        createdByUserId: userId,
        status: 'PENDING',
      },
    });

    await this.prisma.userReferrerMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'PENDING',
      },
    });

    return {
      id: profile.id,
      displayName: profile.displayName,
      status: profile.status,
      message: 'Solicitud enviada. Serás notificado cuando sea aprobada.',
    };
  }
}
