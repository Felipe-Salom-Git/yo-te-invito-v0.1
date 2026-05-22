import { Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, type PublicHotelLocationDetail } from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import type { HotelProfile } from '@prisma/client';

@Injectable()
export class PublicHotelLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  private readGallery(row: HotelProfile): string[] | null {
    if (!row.galleryUrls || !Array.isArray(row.galleryUrls)) return null;
    return (row.galleryUrls as string[]).filter((u) => typeof u === 'string');
  }

  private readAmenities(row: HotelProfile): string[] | null {
    if (!row.amenities || !Array.isArray(row.amenities)) return null;
    return (row.amenities as string[]).filter((u) => typeof u === 'string' && u.trim());
  }

  private readSocial(row: HotelProfile): PublicHotelLocationDetail['socialLinks'] {
    if (!row.socialLinks || typeof row.socialLinks !== 'object' || Array.isArray(row.socialLinks)) {
      return null;
    }
    return row.socialLinks as PublicHotelLocationDetail['socialLinks'];
  }

  private mapDetail(row: HotelProfile): PublicHotelLocationDetail {
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
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      starCategory: row.starCategory,
      contactPhone: row.contactPhone,
      whatsappPhone: row.whatsappPhone,
      contactEmail: row.contactEmail,
      websiteUrl: row.websiteUrl,
      bookingUrl: row.bookingUrl,
      socialLinks: this.readSocial(row),
      amenities: this.readAmenities(row),
      status: row.status as PublicHotelLocationDetail['status'],
      publicEventId: row.publicEventId,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async getByPublicEventId(tenantId: string, eventId: string): Promise<PublicHotelLocationDetail> {
    const row = await this.prisma.hotelProfile.findFirst({
      where: { publicEventId: eventId, tenantId, status: 'ACTIVE' },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Hotel not found',
      });
    }
    return this.mapDetail(row);
  }

  async getById(tenantId: string, id: string): Promise<PublicHotelLocationDetail> {
    const row = await this.prisma.hotelProfile.findFirst({
      where: { id, tenantId, status: 'ACTIVE', publicEventId: { not: null } },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Hotel not found',
      });
    }
    return this.mapDetail(row);
  }
}
