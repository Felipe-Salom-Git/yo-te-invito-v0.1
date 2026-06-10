import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type GastroProfile } from '@prisma/client';
import {
  ErrorCode,
  parseRentalOpeningHours,
  type GastroLocalCreateInput,
  type GastroLocalResponse,
  type GastroLocalUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import {
  normalizeGastroSummary,
  readGastroGallery,
  readGastroOpeningHoursFields,
  shouldSyncGastroPublicEventAfterUpdate,
  writeGastroOpeningHours,
  writeGastroOpeningHoursMode,
  writeGastroOpeningHoursWeekly,
} from './gastro-profile-fields.util';
import { GastroPublicEventSyncService } from './gastro-public-event-sync.service';
import { readEntitySocialLinks, writeEntitySocialLinks } from '../../common/entity-social-links.util';
import {
  loadEventTagsPublic,
  syncGastroPublicEventTags,
} from '../../common/event-tags.util';

@Injectable()
export class GastroLocalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly subcategories: SubcategoriesService,
    private readonly publicEventSync: GastroPublicEventSyncService,
  ) {}

  private toResponse(
    row: GastroProfile & { subcategory?: { name: string } | null },
    tags?: GastroLocalResponse['tags'],
  ): GastroLocalResponse {
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
      galleryUrls: readGastroGallery(row),
      province: row.province,
      city: row.city,
      address: row.address,
      googlePlaceId: row.googlePlaceId,
      geoLat: row.geoLat,
      geoLng: row.geoLng,
      openingHours: parseRentalOpeningHours(row.openingHours),
      openingHoursNote: row.openingHoursNote,
      ...readGastroOpeningHoursFields(row),
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      menuUrl: row.menuUrl,
      websiteUrl: row.websiteUrl,
      bookingUrl: row.bookingUrl,
      socialLinks: readEntitySocialLinks(row.socialLinks),
      subcategoryId: row.subcategoryId,
      publicEventId: row.publicEventId,
      ...(tags !== undefined ? { tags } : {}),
      status: row.status as GastroLocalResponse['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async withTags(response: GastroLocalResponse): Promise<GastroLocalResponse> {
    const tags = await loadEventTagsPublic(this.prisma, response.publicEventId);
    return { ...response, tags };
  }

  private async assertGastroUser(tenantId: string, userId: string, _userRole: string) {
    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Necesitás un perfil gastronómico activo para gestionar tu local',
      });
    }
  }

  private async getOwnedProfile(tenantId: string, userId: string) {
    const membership = await this.prisma.userGastroMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      include: { profile: true },
      orderBy: { profile: { updatedAt: 'desc' } },
    });
    if (!membership) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No tenés un perfil gastronómico activo',
      });
    }
    return membership.profile;
  }

  async getMyLocal(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<GastroLocalResponse | null> {
    await this.assertGastroUser(tenantId, userId, userRole);
    try {
      const profile = await this.getOwnedProfile(tenantId, userId);
      return this.withTags(this.toResponse(profile));
    } catch (e) {
      if (e instanceof NotFoundException) return null;
      throw e;
    }
  }

  async createMyLocal(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroLocalCreateInput,
  ): Promise<GastroLocalResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const existing = await this.prisma.userGastroMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
      include: { profile: true },
    });
    if (existing?.profile.publicEventId) {
      throw new ConflictException({
        code: 'CONFLICT',
        message: 'Ya tenés un local configurado. Usá editar para actualizarlo.',
      });
    }
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No tenés un perfil gastronómico activo',
      });
    }

    const subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
      tenantId,
      'gastro',
      body.subcategoryId ?? null,
    );

    const gallery = body.galleryUrls?.filter(Boolean) ?? null;
    const profile = await this.prisma.gastroProfile.update({
      where: { id: existing.profile.id },
      data: {
        displayName: body.displayName.trim(),
        summary: normalizeGastroSummary(body.summary),
        detail: body.detail?.trim() || null,
        subcategoryId,
        bannerUrl: body.bannerUrl ?? null,
        galleryUrls: gallery?.length ? gallery : Prisma.JsonNull,
        province: body.location.province.trim(),
        city: body.location.city.trim(),
        address: body.location.address.trim(),
        googlePlaceId: body.location.googlePlaceId?.trim() || null,
        geoLat: body.location.lat ?? null,
        geoLng: body.location.lng ?? null,
        openingHours: writeGastroOpeningHours(body.openingHours),
        openingHoursNote: body.openingHoursNote?.trim() || null,
        openingHoursMode: writeGastroOpeningHoursMode(body.openingHoursMode ?? 'simple'),
        openingHoursWeekly: writeGastroOpeningHoursWeekly(body.openingHoursWeekly),
        contactPhone: body.contactPhone?.trim() || null,
        contactEmail: body.contactEmail.trim(),
        menuUrl: body.menuUrl ?? null,
        websiteUrl: body.websiteUrl ?? null,
        bookingUrl: body.bookingUrl ?? null,
        socialLinks: writeEntitySocialLinks(body.socialLinks),
      },
    });

    const eventId = await this.publicEventSync.syncPublicEvent(profile, userId, gallery);
    await syncGastroPublicEventTags(this.prisma, tenantId, eventId, body.tagIds);
    const refreshed = await this.prisma.gastroProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    return this.withTags(this.toResponse(refreshed));
  }

  async updateMyLocal(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroLocalUpdateInput,
  ): Promise<GastroLocalResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId);

    let subcategoryId: string | null | undefined = undefined;
    if (body.subcategoryId !== undefined) {
      subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        'gastro',
        body.subcategoryId,
      );
    }

    const gallery =
      body.galleryUrls !== undefined
        ? (body.galleryUrls?.filter(Boolean) ?? [])
        : undefined;

    const updated = await this.prisma.gastroProfile.update({
      where: { id: profile.id },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName.trim() }),
        ...(body.summary !== undefined && {
          summary: normalizeGastroSummary(body.summary),
        }),
        ...(body.detail !== undefined && { detail: body.detail?.trim() || null }),
        ...(subcategoryId !== undefined && { subcategoryId }),
        ...(body.bannerUrl !== undefined && { bannerUrl: body.bannerUrl }),
        ...(gallery !== undefined && {
          galleryUrls: gallery.length ? gallery : Prisma.JsonNull,
        }),
        ...(body.location && {
          province: body.location.province.trim(),
          city: body.location.city.trim(),
          address: body.location.address.trim(),
          googlePlaceId: body.location.googlePlaceId?.trim() || null,
          geoLat: body.location.lat ?? null,
          geoLng: body.location.lng ?? null,
        }),
        ...(body.openingHours !== undefined && {
          openingHours: writeGastroOpeningHours(body.openingHours),
        }),
        ...(body.openingHoursNote !== undefined && {
          openingHoursNote: body.openingHoursNote?.trim() || null,
        }),
        ...(body.openingHoursMode !== undefined && {
          openingHoursMode: writeGastroOpeningHoursMode(body.openingHoursMode),
        }),
        ...(body.openingHoursWeekly !== undefined && {
          openingHoursWeekly: writeGastroOpeningHoursWeekly(body.openingHoursWeekly),
        }),
        ...(body.contactPhone !== undefined && {
          contactPhone: body.contactPhone?.trim() || null,
        }),
        ...(body.contactEmail !== undefined && {
          contactEmail: body.contactEmail.trim(),
        }),
        ...(body.menuUrl !== undefined && { menuUrl: body.menuUrl }),
        ...(body.websiteUrl !== undefined && { websiteUrl: body.websiteUrl }),
        ...(body.bookingUrl !== undefined && { bookingUrl: body.bookingUrl }),
        ...(body.socialLinks !== undefined && {
          socialLinks: writeEntitySocialLinks(body.socialLinks),
        }),
      },
    });

    let publicEventId = updated.publicEventId;
    if (shouldSyncGastroPublicEventAfterUpdate({ ...body, subcategoryId })) {
      publicEventId = await this.publicEventSync.syncPublicEvent(
        updated,
        userId,
        gallery !== undefined ? gallery : this.publicEventSync.readGallery(updated),
      );
    }
    if (body.tagIds !== undefined) {
      await syncGastroPublicEventTags(this.prisma, tenantId, publicEventId, body.tagIds);
    }

    const refreshed = await this.prisma.gastroProfile.findUniqueOrThrow({
      where: { id: updated.id },
    });
    return this.withTags(this.toResponse(refreshed));
  }
}
