import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type HotelProfile } from '@prisma/client';
import {
  ErrorCode,
  type HotelProfileResponse,
  type HotelProfileUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';

@Injectable()
export class HotelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
  ) {}

  private readGallery(row: HotelProfile): string[] | null {
    if (!row.galleryUrls || !Array.isArray(row.galleryUrls)) return null;
    return (row.galleryUrls as string[]).filter((u) => typeof u === 'string');
  }

  private readAmenities(row: HotelProfile): string[] | null {
    if (!row.amenities || !Array.isArray(row.amenities)) return null;
    return (row.amenities as string[]).filter((u) => typeof u === 'string' && u.trim());
  }

  private readSocialLinks(row: HotelProfile): HotelProfileResponse['socialLinks'] {
    if (!row.socialLinks || typeof row.socialLinks !== 'object' || Array.isArray(row.socialLinks)) {
      return null;
    }
    return row.socialLinks as HotelProfileResponse['socialLinks'];
  }

  private toResponse(row: HotelProfile): HotelProfileResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      displayName: row.displayName,
      legalName: row.legalName,
      description: row.description,
      logoUrl: row.logoUrl,
      bannerUrl: row.bannerUrl,
      galleryUrls: this.readGallery(row),
      address: row.address,
      city: row.city,
      province: row.province,
      googlePlaceId: row.googlePlaceId,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      starCategory: row.starCategory,
      contactPhone: row.contactPhone,
      whatsappPhone: row.whatsappPhone,
      contactEmail: row.contactEmail,
      websiteUrl: row.websiteUrl,
      bookingUrl: row.bookingUrl,
      socialLinks: this.readSocialLinks(row),
      amenities: this.readAmenities(row),
      status: row.status as HotelProfileResponse['status'],
      publicEventId: row.publicEventId,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async getOwnedProfile(tenantId: string, userId: string): Promise<HotelProfile> {
    const row = await this.prisma.userHotelMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      include: { profile: true },
      orderBy: { createdAt: 'desc' },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No tenés un perfil hotel activo',
      });
    }
    return row.profile;
  }

  private async syncPublicEvent(
    profile: HotelProfile,
    userId: string,
    galleryUrls: string[] | null,
  ): Promise<string> {
    const now = new Date();
    const eventData = {
      tenantId: profile.tenantId,
      producerId: userId,
      category: 'hotel',
      title: profile.displayName,
      description: profile.description,
      startAt: now,
      endAt: null as Date | null,
      city: profile.city,
      province: profile.province,
      venueName: profile.displayName,
      venueAddress: profile.address,
      googlePlaceId: profile.googlePlaceId,
      geoLat: profile.geoLat,
      geoLng: profile.geoLng,
      coverImageUrl: profile.bannerUrl ?? profile.logoUrl,
      status: 'APPROVED' as const,
      isTicketingEnabled: false,
      publishedAt: now,
    };

    let eventId = profile.publicEventId;
    if (eventId) {
      await this.prisma.event.update({
        where: { id: eventId },
        data: eventData,
      });
    } else {
      const created = await this.prisma.event.create({ data: eventData });
      eventId = created.id;
      await this.prisma.hotelProfile.update({
        where: { id: profile.id },
        data: { publicEventId: eventId },
      });
    }

    if (galleryUrls) {
      await this.prisma.eventMedia.updateMany({
        where: { eventId, deletedAt: null },
        data: { deletedAt: now },
      });
      if (galleryUrls.length > 0) {
        await this.prisma.eventMedia.createMany({
          data: galleryUrls.map((url, i) => ({
            eventId,
            type: 'IMAGE',
            url,
            sortOrder: i,
          })),
        });
      }
    }

    return eventId;
  }

  private async assertHotelAccess(tenantId: string, userId: string, userRole: string) {
    if (userRole === 'ADMIN') return;
    const has = await this.profiles.hasHotelAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Necesitás un perfil hotel activo',
      });
    }
  }

  async getMyProfile(tenantId: string, userId: string, userRole: string) {
    await this.assertHotelAccess(tenantId, userId, userRole);
    try {
      const profile = await this.getOwnedProfile(tenantId, userId);
      return { profile: this.toResponse(profile) };
    } catch (e) {
      if (e instanceof NotFoundException) return { profile: null as null };
      throw e;
    }
  }

  async updateMyProfile(
    tenantId: string,
    userId: string,
    userRole: string,
    body: HotelProfileUpdateInput,
  ): Promise<{ profile: HotelProfileResponse }> {
    await this.assertHotelAccess(tenantId, userId, userRole);
    const existing = await this.getOwnedProfile(tenantId, userId);

    const gallery =
      body.galleryUrls !== undefined
        ? (body.galleryUrls?.filter(Boolean) ?? [])
        : undefined;

    const amenities =
      body.amenities !== undefined
        ? (body.amenities?.map((a) => a.trim()).filter(Boolean) ?? [])
        : undefined;

    const contactEmail =
      body.contactEmail !== undefined
        ? body.contactEmail.trim()
          ? body.contactEmail.trim()
          : null
        : undefined;

    const updated = await this.prisma.hotelProfile.update({
      where: { id: existing.id, tenantId },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName.trim() }),
        ...(body.legalName !== undefined && {
          legalName: body.legalName?.trim() || null,
        }),
        ...(body.description !== undefined && {
          description: body.description?.trim() || null,
        }),
        ...(body.logoUrl !== undefined && { logoUrl: body.logoUrl }),
        ...(body.bannerUrl !== undefined && { bannerUrl: body.bannerUrl }),
        ...(gallery !== undefined && {
          galleryUrls: gallery.length ? gallery : Prisma.JsonNull,
        }),
        ...(body.location && {
          address: body.location.address.trim(),
          city: body.location.city.trim(),
          province: body.location.province?.trim() || null,
          googlePlaceId: body.location.googlePlaceId?.trim() || null,
          geoLat: body.location.lat ?? null,
          geoLng: body.location.lng ?? null,
        }),
        ...(body.starCategory !== undefined && { starCategory: body.starCategory }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone?.trim() || null,
        }),
        ...(body.whatsappPhone !== undefined && {
          whatsappPhone: body.whatsappPhone?.trim() || null,
        }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(body.websiteUrl !== undefined && { websiteUrl: body.websiteUrl }),
        ...(body.bookingUrl !== undefined && { bookingUrl: body.bookingUrl }),
        ...(body.socialLinks !== undefined && {
          socialLinks: body.socialLinks
            ? (body.socialLinks as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        }),
        ...(amenities !== undefined && {
          amenities: amenities.length ? amenities : Prisma.JsonNull,
        }),
      },
    });

    if (updated.status === 'ACTIVE') {
      const galleryForSync =
        gallery !== undefined
          ? gallery
          : this.readGallery(updated);
      await this.syncPublicEvent(updated, userId, galleryForSync);
      const refreshed = await this.prisma.hotelProfile.findUniqueOrThrow({
        where: { id: updated.id },
      });
      return { profile: this.toResponse(refreshed) };
    }

    return { profile: this.toResponse(updated) };
  }
}
