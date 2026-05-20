import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  profileProducerApplySchema,
  profileGastroApplySchema,
  profileHotelApplySchema,
  profileReferrerApplySchema,
  gastroLocalCreateSchema,
  type RegistrationProfileType,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ReferrerProfilesService } from '../modules/referrer/referrer-profiles.service';
import { ReferrerIdentityService } from '../modules/referrer/referrer-identity.service';

type DbClient = PrismaService | Prisma.TransactionClient;

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

    switch (profileType) {
      case 'PRODUCER':
        await this.createProducerActive(
          tenantId,
          userId,
          profileProducerApplySchema.parse(profileData),
          tx,
        );
        return;
      case 'GASTRO':
        await this.createGastroActive(
          tenantId,
          userId,
          gastroLocalCreateSchema.parse(profileData),
          tx,
        );
        return;
      case 'HOTEL':
        await this.createHotelActive(
          tenantId,
          userId,
          profileHotelApplySchema.parse(profileData),
          tx,
        );
        return;
      case 'REFERRER':
        await this.createReferrerActive(
          tenantId,
          userId,
          profileReferrerApplySchema.parse(profileData),
          tx,
        );
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
    body: ReturnType<typeof profileProducerApplySchema.parse>,
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
    body: ReturnType<typeof gastroLocalCreateSchema.parse>,
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
        summary: body.summary?.trim() || null,
        detail: body.detail?.trim() || null,
        bannerUrl: body.bannerUrl ?? null,
        galleryUrls: body.galleryUrls?.length
          ? (body.galleryUrls as Prisma.InputJsonValue)
          : undefined,
        province: body.location.province,
        city: body.location.city,
        address: body.location.address,
        geoLat: body.location.lat,
        geoLng: body.location.lng,
        openingHours: body.openingHours
          ? (body.openingHours as Prisma.InputJsonValue)
          : undefined,
        openingHoursNote: body.openingHoursNote ?? null,
        contactPhone: body.contactPhone ?? null,
        contactEmail: body.contactEmail,
        menuUrl: body.menuUrl ?? null,
        websiteUrl: body.websiteUrl ?? null,
        subcategoryId: body.subcategoryId ?? null,
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
    body: ReturnType<typeof profileHotelApplySchema.parse>,
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
      body.socialLinks && Object.values(body.socialLinks).some((v) => v && String(v).trim())
        ? (body.socialLinks as Prisma.InputJsonValue)
        : undefined;

    const profile = await db.hotelProfile.create({
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
    body: ReturnType<typeof profileReferrerApplySchema.parse>,
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
        longBio: body.longBio ?? null,
        avatarUrl: body.avatarUrl ?? null,
        city: body.city ?? null,
        region: body.region ?? null,
        publicVisibility: body.publicVisibility ?? false,
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
}
