import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { Prisma } from '@prisma/client';
import type {
  ProfileProducerApplyInput,
  ProfileGastroApplyInput,
  ProfileHotelApplyInput,
  ProfileReferrerApplyInput,
} from '@yo-te-invito/shared';
import { ReferrerProfilesService } from '../referrer/referrer-profiles.service';
import { ReferrerIdentityService } from '../referrer/referrer-identity.service';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrerProfiles: ReferrerProfilesService,
    private readonly referrerIdentity: ReferrerIdentityService,
  ) {}

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

  async applyHotel(
    tenantId: string,
    userId: string,
    body: ProfileHotelApplyInput,
  ) {
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

    const social =
      body.socialLinks && Object.values(body.socialLinks).some((v) => v && String(v).trim())
        ? (body.socialLinks as Prisma.InputJsonValue)
        : undefined;

    const profile = await this.prisma.hotelProfile.create({
      data: {
        tenantId,
        displayName: body.displayName.trim(),
        legalName: body.legalName?.trim() || null,
        description: body.description?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        starCategory: body.starCategory ?? null,
        contactPhone: body.contactPhone?.trim() || null,
        contactEmail: body.contactEmail?.trim() || null,
        websiteUrl: body.websiteUrl.trim(),
        bookingUrl: body.bookingUrl?.trim() || null,
        socialLinks: social ?? undefined,
        createdByUserId: userId,
        status: 'PENDING',
      },
    });

    await this.prisma.userHotelMembership.create({
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
    const active = await this.prisma.userReferrerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (active) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de referidor activo',
      });
    }

    const pendingMembership = await this.prisma.userReferrerMembership.findFirst({
      where: { tenantId, userId, profile: { status: 'PENDING' } },
      include: { profile: true },
    });

    const token = this.referrerProfiles.newToken();

    if (pendingMembership) {
      const { slug, publicHandle } = await this.referrerIdentity.ensureIdentityForExistingProfile(
        tenantId,
        body.displayName,
        pendingMembership.profile.id,
        {
          slug: pendingMembership.profile.slug,
          publicHandle: pendingMembership.profile.publicHandle,
        },
      );
      const profile = await this.prisma.referrerProfile.update({
        where: { id: pendingMembership.profile.id },
        data: {
          displayName: body.displayName,
          slug,
          publicHandle,
          bio: body.bio ?? null,
          longBio: body.longBio ?? null,
          avatarUrl: body.avatarUrl ?? null,
          city: body.city ?? null,
          region: body.region ?? null,
          publicVisibility: body.publicVisibility ?? false,
          status: 'ACTIVE',
        },
      });
      await this.prisma.userReferrerMembership.update({
        where: { id: pendingMembership.id },
        data: { status: 'ACTIVE' },
      });
      return {
        id: profile.id,
        displayName: profile.displayName,
        status: profile.status,
        message:
          'Tu perfil de referidor está activo. Podés entrar al panel y compartir tu link con productoras.',
      };
    }

    const { slug, publicHandle } = await this.referrerIdentity.assignIdentityForNewProfile(
      tenantId,
      body.displayName,
    );

    const profile = await this.prisma.referrerProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        slug,
        publicHandle,
        bio: body.bio ?? null,
        longBio: body.longBio ?? null,
        avatarUrl: body.avatarUrl ?? null,
        city: body.city ?? null,
        region: body.region ?? null,
        publicVisibility: body.publicVisibility ?? false,
        associationLinkToken: token,
        createdByUserId: userId,
        status: 'ACTIVE',
      },
    });

    await this.prisma.userReferrerMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });

    return {
      id: profile.id,
      displayName: profile.displayName,
      status: profile.status,
      message:
        '¡Listo! Tu perfil de referidor está activo. Entrá al panel para ver métricas y tu link personal.',
    };
  }
}
