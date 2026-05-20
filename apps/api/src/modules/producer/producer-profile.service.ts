import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateProducerProfileInput, UpdateProducerProfileInput } from '@yo-te-invito/shared';
import { mapProducerProfileToPortal } from './producer-profile.mapper';

function hasContact(profile: {
  primaryPhone: string | null;
  secondaryPhone: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  whatsapp: string | null;
}): boolean {
  return Boolean(
    profile.primaryPhone?.trim() ||
      profile.secondaryPhone?.trim() ||
      profile.primaryEmail?.trim() ||
      profile.secondaryEmail?.trim() ||
      profile.whatsapp?.trim(),
  );
}

@Injectable()
export class ProducerProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(tenantId: string, userId: string) {
    const membership = await this.prisma.userProducerMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: { in: ['ACTIVE', 'PENDING', 'DRAFT'] } },
      },
      include: { profile: true },
    });

    if (!membership) {
      return null;
    }

    return mapProducerProfileToPortal(membership.profile);
  }

  async createMyProfile(tenantId: string, userId: string, body: CreateProducerProfileInput) {
    const existing = await this.prisma.userProducerMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: { in: ['ACTIVE', 'PENDING', 'DRAFT'] } },
      },
    });
    if (existing) {
      throw new ConflictException('Ya tenés un perfil de productora');
    }

    const profile = await this.prisma.producerProfile.create({
      data: {
        tenantId,
        displayName: body.displayName.trim(),
        slug: body.slug?.trim() || null,
        status: 'ACTIVE',
        createdByUserId: userId,
      },
    });

    await this.prisma.userProducerMembership.create({
      data: {
        tenantId,
        userId,
        profileId: profile.id,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });

    return mapProducerProfileToPortal(profile);
  }

  async updateMyProfile(tenantId: string, userId: string, data: UpdateProducerProfileInput) {
    const membership = await this.prisma.userProducerMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: { in: ['ACTIVE', 'PENDING', 'DRAFT'] } },
      },
      include: { profile: true },
    });

    if (!membership) {
      throw new NotFoundException('No active producer profile found for this user');
    }

    const existing = membership.profile;
    const merged = {
      primaryPhone:
        data.primaryPhone !== undefined ? data.primaryPhone || null : existing.primaryPhone,
      secondaryPhone:
        data.secondaryPhone !== undefined ? data.secondaryPhone || null : existing.secondaryPhone,
      primaryEmail:
        data.primaryEmail !== undefined ? data.primaryEmail || null : existing.primaryEmail,
      secondaryEmail:
        data.secondaryEmail !== undefined ? data.secondaryEmail || null : existing.secondaryEmail,
      whatsapp: data.whatsapp !== undefined ? data.whatsapp || null : existing.whatsapp,
    };

    const touchesContact =
      data.primaryPhone !== undefined ||
      data.secondaryPhone !== undefined ||
      data.whatsapp !== undefined ||
      data.primaryEmail !== undefined ||
      data.secondaryEmail !== undefined;

    if (touchesContact && !hasContact(merged)) {
      throw new BadRequestException('Indicá al menos un teléfono o email de contacto');
    }

    const socialLinks =
      data.socialLinks !== undefined
        ? {
            ...((existing.socialLinks as Record<string, string> | null) ?? {}),
            ...(data.socialLinks ?? {}),
          }
        : undefined;

    const updated = await this.prisma.producerProfile.update({
      where: { id: membership.profileId },
      data: {
        slug: data.slug,
        displayName: data.displayName,
        legalName: data.legalName,
        shortDescription: data.shortDescription,
        longDescription: data.longDescription,
        logoUrl: data.logoUrl === null ? null : data.logoUrl,
        coverImageUrl: data.coverImageUrl === null ? null : data.coverImageUrl,
        galleryUrls:
          data.galleryUrls !== undefined ? (data.galleryUrls as string[]) : undefined,
        primaryPhone: merged.primaryPhone,
        secondaryPhone: merged.secondaryPhone,
        primaryEmail: merged.primaryEmail,
        secondaryEmail: merged.secondaryEmail,
        whatsapp: merged.whatsapp,
        city: data.city,
        country: data.country,
        socialLinks: socialLinks as object | undefined,
      },
    });

    return mapProducerProfileToPortal(updated);
  }
}
