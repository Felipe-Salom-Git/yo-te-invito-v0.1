import { ConflictException, Injectable } from '@nestjs/common';
import type {
  ProducerProfileApplyInput,
  GastroProfileApplyInput,
  HotelProfileApplyInput,
  ReferrerProfileApplyInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileRegistrationService } from '../../auth/profile-registration.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profileRegistration: ProfileRegistrationService,
  ) {}

  async applyProducer(tenantId: string, userId: string, body: ProducerProfileApplyInput) {
    const existing = await this.prisma.userProducerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de productor activo',
      });
    }

    await this.profileRegistration.createProducerFromApply(tenantId, userId, body);

    const profile = await this.prisma.producerProfile.findFirst({
      where: { tenantId, createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: profile!.id,
      displayName: profile!.displayName,
      status: profile!.status,
      message: 'Tu perfil de productor está activo. Ya podés entrar al panel.',
    };
  }

  async applyGastro(tenantId: string, userId: string, body: GastroProfileApplyInput) {
    const existing = await this.prisma.userGastroMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil gastronómico activo',
      });
    }

    await this.profileRegistration.createGastroFromApply(tenantId, userId, body);

    const profile = await this.prisma.gastroProfile.findFirst({
      where: { tenantId, createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: profile!.id,
      displayName: profile!.displayName,
      status: profile!.status,
      message: 'Tu perfil gastronómico está activo. Ya podés gestionar tu local.',
    };
  }

  async applyHotel(tenantId: string, userId: string, body: HotelProfileApplyInput) {
    const duplicate = await this.prisma.userHotelMembership.findFirst({
      where: {
        tenantId,
        userId,
        profile: { status: { in: ['PENDING', 'ACTIVE'] } },
      },
    });
    if (duplicate) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés una solicitud o perfil hotelero activo',
      });
    }

    await this.profileRegistration.createHotelFromApply(tenantId, userId, body);

    const profile = await this.prisma.hotelProfile.findFirst({
      where: { tenantId, createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      id: profile!.id,
      displayName: profile!.displayName,
      status: profile!.status,
      message: 'Tu perfil de hotel está activo. Ya podés entrar al panel.',
    };
  }

  async applyReferrer(tenantId: string, userId: string, body: ReferrerProfileApplyInput) {
    const profile = await this.profileRegistration.createReferrerFromApply(
      tenantId,
      userId,
      body,
    );

    return {
      id: profile.id,
      displayName: profile.displayName,
      status: profile.status,
      message:
        '¡Listo! Tu perfil de referidor está activo. Entrá al panel para ver métricas y tu link personal.',
    };
  }
}
