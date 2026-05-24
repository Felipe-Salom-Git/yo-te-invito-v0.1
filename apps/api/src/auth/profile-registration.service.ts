import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  parseProfileSignupData,
  gastroProfileToPersistInput,
  type RegistrationProfileType,
  type ProducerProfileSignupInput,
  type ProducerProfileApplyInput,
  type GastroProfileSignupInput,
  type GastroProfileApplyInput,
  type GastroProfilePersistInput,
  type HotelProfileSignupInput,
  type HotelProfileApplyInput,
  hotelProfileToPersistInput,
  type HotelProfilePersistInput,
  type ReferrerProfileSignupInput,
  type ReferrerProfileApplyInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ReferrerProfilesService } from '../modules/referrer/referrer-profiles.service';
import { ReferrerIdentityService } from '../modules/referrer/referrer-identity.service';

type DbClient = PrismaService | Prisma.TransactionClient;

type ProducerPersistInput = ProducerProfileApplyInput;
type HotelPersistInput = HotelProfilePersistInput | HotelProfileApplyInput;
type ReferrerPersistInput = ReferrerProfileSignupInput | ReferrerProfileApplyInput;

@Injectable()
export class ProfileRegistrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly referrerProfiles: ReferrerProfilesService,
    private readonly referrerIdentity: ReferrerIdentityService,
  ) {}

  private db(tx?: Prisma.TransactionClient): DbClient {
    return tx ?? this.prisma;
  }

  async createProfileForRegistration(
    tenantId: string,
    userId: string,
    profileType: RegistrationProfileType,
    profileData: unknown,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (profileType === 'USER') return;

    const parsed = parseProfileSignupData(profileType, profileData);
    if (!parsed.success) {
      throw new BadRequestException({
        code: 'VALIDATION_FAILED',
        message: 'Datos de perfil inválidos',
        details: parsed.error.flatten(),
      });
    }

    switch (parsed.profileType) {
      case 'PRODUCER':
        await this.createProducerActive(tenantId, userId, parsed.data, tx);
        return;
      case 'GASTRO':
        await this.createGastroActive(
          tenantId,
          userId,
          gastroProfileToPersistInput(parsed.data),
          tx,
        );
        return;
      case 'HOTEL':
        await this.createHotelActive(
          tenantId,
          userId,
          hotelProfileToPersistInput(parsed.data),
          tx,
        );
        return;
      case 'REFERRER':
        await this.createReferrerActive(tenantId, userId, parsed.data, tx);
        return;
      default:
        throw new BadRequestException({
          code: 'VALIDATION_FAILED',
          message: 'Tipo de perfil no válido para registro',
        });
    }
  }

  async createProducerActive(
    tenantId: string,
    userId: string,
    body: ProducerPersistInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    const existing = await db.userProducerMembership.findFirst({
      where: {
        tenantId,
        userId,
        profile: { status: { in: ['PENDING', 'ACTIVE'] } },
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de productor',
      });
    }

    const profile = await db.producerProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        legalName: body.legalName ?? null,
        shortDescription: body.description ?? body.shortDescription ?? null,
        city: body.city ?? null,
        country: body.country ?? null,
        createdByUserId: userId,
        status: 'ACTIVE',
      },
    });

    await db.userProducerMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  async createGastroActive(
    tenantId: string,
    userId: string,
    body: GastroProfilePersistInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    const existing = await db.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        profile: { status: { in: ['PENDING', 'ACTIVE'] } },
      },
    });
    if (existing) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil gastronómico',
      });
    }

    const profile = await db.gastroProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        legalName: body.legalName,
        summary: body.summary,
        province: body.province,
        city: body.city,
        address: body.address,
        geoLat: body.geoLat,
        geoLng: body.geoLng,
        contactPhone: body.contactPhone,
        contactEmail: body.contactEmail,
        createdByUserId: userId,
        status: 'ACTIVE',
      },
    });

    await db.userGastroMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  async createHotelActive(
    tenantId: string,
    userId: string,
    body: HotelPersistInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    const duplicate = await db.userHotelMembership.findFirst({
      where: {
        tenantId,
        userId,
        profile: { status: { in: ['PENDING', 'ACTIVE'] } },
      },
    });
    if (duplicate) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil hotelero',
      });
    }

    const social =
      'socialLinks' in body &&
      body.socialLinks &&
      Object.values(body.socialLinks).some((v) => v && String(v).trim())
        ? (body.socialLinks as Prisma.InputJsonValue)
        : undefined;

    const profile = await db.hotelProfile.create({
      data: {
        tenantId,
        displayName: body.displayName.trim(),
        legalName: 'legalName' in body ? body.legalName?.trim() || null : null,
        description: body.description?.trim() || null,
        address: body.address?.trim() || null,
        city: body.city?.trim() || null,
        starCategory: 'starCategory' in body ? body.starCategory ?? null : null,
        contactPhone: 'contactPhone' in body ? body.contactPhone?.trim() || null : null,
        contactEmail: 'contactEmail' in body ? body.contactEmail?.trim() || null : null,
        websiteUrl: body.websiteUrl.trim(),
        bookingUrl: 'bookingUrl' in body ? body.bookingUrl?.trim() || null : null,
        socialLinks: social ?? undefined,
        createdByUserId: userId,
        status: 'ACTIVE',
      },
    });

    await db.userHotelMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  async createReferrerActive(
    tenantId: string,
    userId: string,
    body: ReferrerPersistInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    const active = await db.userReferrerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (active) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de referidor activo',
      });
    }

    const { slug, publicHandle } = await this.referrerIdentity.assignIdentityForNewProfile(
      tenantId,
      body.displayName,
    );

    const profile = await db.referrerProfile.create({
      data: {
        tenantId,
        displayName: body.displayName,
        slug,
        publicHandle,
        bio: body.bio ?? null,
        longBio: 'longBio' in body ? body.longBio ?? null : null,
        avatarUrl: 'avatarUrl' in body ? body.avatarUrl ?? null : null,
        city: body.city ?? null,
        region: 'region' in body ? body.region ?? null : null,
        publicVisibility: 'publicVisibility' in body ? body.publicVisibility ?? false : false,
        associationLinkToken: this.referrerProfiles.newToken(),
        createdByUserId: userId,
        status: 'ACTIVE',
      },
    });

    await db.userReferrerMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  /** Apply flow: same persistence as signup (validated with apply schema in controller). */
  async createProducerFromApply(
    tenantId: string,
    userId: string,
    body: ProducerProfileApplyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.createProducerActive(tenantId, userId, body, tx);
  }

  async createGastroFromApply(
    tenantId: string,
    userId: string,
    body: GastroProfileApplyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.createGastroActive(tenantId, userId, gastroProfileToPersistInput(body), tx);
  }

  async createHotelFromApply(
    tenantId: string,
    userId: string,
    body: HotelProfileApplyInput,
    tx?: Prisma.TransactionClient,
  ) {
    return this.createHotelActive(tenantId, userId, body, tx);
  }

  async createReferrerFromApply(
    tenantId: string,
    userId: string,
    body: ReferrerProfileApplyInput,
    tx?: Prisma.TransactionClient,
  ) {
    const db = this.db(tx);
    const active = await db.userReferrerMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    if (active) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un perfil de referidor activo',
      });
    }

    const pendingMembership = await db.userReferrerMembership.findFirst({
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
      const profile = await db.referrerProfile.update({
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
      await db.userReferrerMembership.update({
        where: { id: pendingMembership.id },
        data: { status: 'ACTIVE' },
      });
      return profile;
    }

    await this.createReferrerActive(tenantId, userId, body, tx);
    const created = await db.referrerProfile.findFirst({
      where: { tenantId, createdByUserId: userId },
      orderBy: { createdAt: 'desc' },
    });
    return created!;
  }
}
