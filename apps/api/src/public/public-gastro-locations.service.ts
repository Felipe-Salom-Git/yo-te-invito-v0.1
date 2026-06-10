import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ErrorCode,
  parseRentalOpeningHours,
  type PublicGastroLocationsListQuery,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { GastroContentService } from '../modules/gastro/gastro-content.service';
import { readEntitySocialLinks } from '../common/entity-social-links.util';
import { parseRelatedLinks } from '../common/related-links.util';
import { readGastroOpeningHoursFields } from '../modules/gastro/gastro-profile-fields.util';
import { loadEventTagsPublic } from '../common/event-tags.util';

@Injectable()
export class PublicGastroLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gastroContent: GastroContentService,
  ) {}

  async list(query: PublicGastroLocationsListQuery) {
    const rows = await this.prisma.gastroProfile.findMany({
      where: {
        tenantId: query.tenantId,
        status: 'ACTIVE',
        publicEventId: { not: null },
        ...(query.city ? { city: { contains: query.city, mode: 'insensitive' } } : {}),
      },
      include: { subcategory: { select: { name: true } } },
      orderBy: { displayName: 'asc' },
      take: query.limit ?? 50,
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        publicEventId: r.publicEventId,
        displayName: r.displayName,
        summary: r.summary,
        city: r.city,
        province: r.province,
        bannerUrl: r.bannerUrl,
        subcategoryName: r.subcategory?.name ?? null,
      })),
    };
  }

  async getByPublicEventId(tenantId: string, eventId: string) {
    const row = await this.prisma.gastroProfile.findFirst({
      where: { publicEventId: eventId, tenantId, status: 'ACTIVE' },
      include: { subcategory: { select: { name: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }
    return this.mapDetail(row, tenantId);
  }

  async getById(tenantId: string, id: string) {
    const row = await this.prisma.gastroProfile.findFirst({
      where: { id, tenantId, status: 'ACTIVE', publicEventId: { not: null } },
      include: { subcategory: { select: { name: true } } },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }
    return this.mapDetail(row, tenantId);
  }

  private async mapDetail(
    row: {
      id: string;
      tenantId: string;
      displayName: string;
      legalName: string | null;
      summary: string | null;
      detail: string | null;
      description: string | null;
      logoUrl: string | null;
      bannerUrl: string | null;
      galleryUrls: unknown;
      province: string | null;
      city: string | null;
      address: string | null;
      geoLat: number | null;
      geoLng: number | null;
      openingHours: unknown;
      openingHoursNote: string | null;
      openingHoursMode: string;
      openingHoursWeekly: unknown;
      contactPhone: string | null;
      contactEmail: string | null;
      menuUrl: string | null;
      websiteUrl: string | null;
      bookingUrl: string | null;
      socialLinks: unknown;
      relatedLinks: unknown;
      subcategoryId: string | null;
      publicEventId: string | null;
      status: string;
      ratingAvg: number | null;
      ratingCount: number;
      createdAt: Date;
      updatedAt: Date;
      subcategory: { name: string } | null;
    },
    tenantId: string,
  ) {
    const gallery =
      row.galleryUrls && Array.isArray(row.galleryUrls)
        ? (row.galleryUrls as string[])
        : null;
    const content = await this.gastroContent.listPublishedForProfile(tenantId, row.id);
    const tags = await loadEventTagsPublic(this.prisma, row.publicEventId);
    return {
      id: row.id,
      tenantId: row.tenantId,
      displayName: row.displayName,
      legalName: row.legalName,
      summary: row.summary,
      detail: row.detail,
      description: row.description,
      logoUrl: row.logoUrl,
      bannerUrl: row.bannerUrl,
      galleryUrls: gallery,
      province: row.province,
      city: row.city,
      address: row.address,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      openingHours: parseRentalOpeningHours(row.openingHours),
      openingHoursNote: row.openingHoursNote,
      ...readGastroOpeningHoursFields({
        openingHoursMode: row.openingHoursMode,
        openingHoursWeekly: row.openingHoursWeekly,
      }),
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail ?? null,
      menuUrl: row.menuUrl,
      websiteUrl: row.websiteUrl,
      bookingUrl: row.bookingUrl,
      socialLinks: readEntitySocialLinks(row.socialLinks),
      relatedLinks: parseRelatedLinks(row.relatedLinks),
      subcategoryId: row.subcategoryId,
      publicEventId: row.publicEventId,
      status: row.status,
      subcategoryName: row.subcategory?.name ?? null,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      content,
      tags,
    };
  }

  async listDiscounts(tenantId: string, locationId: string) {
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { id: locationId, tenantId, status: 'ACTIVE' },
      select: { id: true, publicEventId: true },
    });
    if (!profile?.publicEventId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }
    const now = new Date();
    const rows = await this.prisma.gastroDiscount.findMany({
      where: {
        tenantId,
        gastroProfileId: profile.id,
        status: { in: ['APPROVED', 'ACTIVE'] },
        OR: [{ discountDate: null }, { discountDate: { gte: now } }],
      },
      orderBy: { discountDate: 'asc' },
    });
    return {
      discounts: rows.map((d) => {
        const imgs =
          d.displayImageUrls && Array.isArray(d.displayImageUrls)
            ? (d.displayImageUrls as string[])
            : [];
        return {
          id: d.id,
          title: d.displayTitle,
          summary: d.summary ?? d.displayDescription,
          detail: d.detail,
          headerImageUrl: imgs[0] ?? null,
          discountDate: d.discountDate?.toISOString() ?? null,
          type: d.type,
          value: d.value,
        };
      }),
    };
  }
}
