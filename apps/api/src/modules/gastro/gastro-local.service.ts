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
  type GastroLocationSummary,
  type GastroLocationsListResponse,
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
import { GastroOwnershipService } from './gastro-ownership.service';
import { readEntitySocialLinks, writeEntitySocialLinks } from '../../common/entity-social-links.util';
import {
  normalizeRelatedLinksForWrite,
  parseRelatedLinks,
} from '../../common/related-links.util';
import {
  loadEventTagsPublic,
  syncGastroPublicEventTags,
} from '../../common/event-tags.util';
import {
  loadEventSubcategoriesPublic,
  resolveValidatedGastroSubcategories,
  syncGastroPublicEventSubcategories,
} from '../../common/event-subcategories.util';

@Injectable()
export class GastroLocalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly ownership: GastroOwnershipService,
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
      relatedLinks: parseRelatedLinks(row.relatedLinks),
      subcategoryId: row.subcategoryId,
      publicEventId: row.publicEventId,
      ...(tags !== undefined ? { tags } : {}),
      status: row.status as GastroLocalResponse['status'],
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toSummary(
    row: GastroProfile & { subcategory?: { name: string } | null },
  ): GastroLocationSummary {
    return {
      id: row.id,
      displayName: row.displayName,
      status: row.status as GastroLocationSummary['status'],
      city: row.city,
      province: row.province,
      address: row.address,
      publicEventId: row.publicEventId,
      subcategoryName: row.subcategory?.name ?? null,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async withTagsAndSubcategories(
    response: GastroLocalResponse,
  ): Promise<GastroLocalResponse> {
    const [tags, subcategories] = await Promise.all([
      loadEventTagsPublic(this.prisma, response.publicEventId),
      loadEventSubcategoriesPublic(this.prisma, response.publicEventId),
    ]);
    return { ...response, tags, subcategories };
  }

  private async assertGastroUser(tenantId: string, userId: string, _userRole: string) {
    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Necesitás un perfil gastronómico para gestionar tus locales',
      });
    }
  }

  private async applyCopyFromProfile(
    tenantId: string,
    userId: string,
    body: GastroLocalCreateInput,
  ): Promise<GastroLocalCreateInput> {
    const copyId = body.copyFromProfileId?.trim();
    if (!copyId) return body;
    const source = await this.ownership.assertCanManageProfile(tenantId, userId, copyId);
    const social = readEntitySocialLinks(source.socialLinks);
    return {
      ...body,
      location: {
        province: body.location.province || source.province || '',
        city: body.location.city || source.city || '',
        address: body.location.address || source.address || '',
        lat: body.location.lat ?? source.geoLat ?? null,
        lng: body.location.lng ?? source.geoLng ?? null,
        googlePlaceId: body.location.googlePlaceId ?? source.googlePlaceId ?? null,
      },
      contactPhone: body.contactPhone ?? source.contactPhone ?? null,
      contactEmail: body.contactEmail || source.contactEmail || body.contactEmail,
      menuUrl: body.menuUrl ?? source.menuUrl ?? null,
      websiteUrl: body.websiteUrl ?? source.websiteUrl ?? null,
      bookingUrl: body.bookingUrl ?? source.bookingUrl ?? null,
      socialLinks: body.socialLinks ?? social ?? null,
    };
  }

  private async buildProfileCreateData(
    tenantId: string,
    body: GastroLocalCreateInput,
    subcategoryId: string | null,
  ) {
    const gallery = body.galleryUrls?.filter(Boolean) ?? null;
    return {
      tenantId,
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
      relatedLinks:
        normalizeRelatedLinksForWrite(body.relatedLinks) as Prisma.InputJsonValue,
    };
  }

  async listMyLocations(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<GastroLocationsListResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profiles = await this.ownership.listManagedProfiles(tenantId, userId);
    return { data: profiles.map((p) => this.toSummary(p)) };
  }

  async getMyLocal(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId?: string,
  ): Promise<GastroLocalResponse | null> {
    await this.assertGastroUser(tenantId, userId, userRole);
    try {
      const profile = await this.ownership.getManagedProfileById(
        tenantId,
        userId,
        profileId,
      );
      return this.withTagsAndSubcategories(this.toResponse(profile));
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
    const shell = await this.ownership.findSetupShellProfile(tenantId, userId);
    if (!shell) {
      throw new ConflictException({
        code: 'CONFLICT',
        message:
          'Ya tenés locales configurados. Usá «Nuevo local» para agregar otra propuesta.',
      });
    }

    const prepared = await this.applyCopyFromProfile(tenantId, userId, body);
    const subcats = await resolveValidatedGastroSubcategories(this.prisma, tenantId, {
      subcategoryId: prepared.subcategoryId,
      subcategoryIds: prepared.subcategoryIds,
    });
    const subcategoryId =
      subcats?.primaryId ??
      (await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        'gastro',
        prepared.subcategoryId ?? null,
      ));
    const subcategoryAllIds = subcats?.allIds ?? (subcategoryId ? [subcategoryId] : []);

    const gallery = prepared.galleryUrls?.filter(Boolean) ?? null;
    const profile = await this.prisma.gastroProfile.update({
      where: { id: shell.id },
      data: await this.buildProfileCreateData(tenantId, prepared, subcategoryId),
    });

    const eventId = await this.publicEventSync.syncPublicEvent(profile, userId, gallery);
    await syncGastroPublicEventTags(this.prisma, tenantId, eventId, prepared.tagIds);
    await syncGastroPublicEventSubcategories(
      this.prisma,
      eventId,
      subcategoryId,
      subcategoryAllIds,
    );
    const refreshed = await this.prisma.gastroProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    return this.withTagsAndSubcategories(this.toResponse(refreshed));
  }

  async createAdditionalLocal(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroLocalCreateInput,
  ): Promise<GastroLocalResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const prepared = await this.applyCopyFromProfile(tenantId, userId, body);
    const subcats = await resolveValidatedGastroSubcategories(this.prisma, tenantId, {
      subcategoryId: prepared.subcategoryId,
      subcategoryIds: prepared.subcategoryIds,
    });
    const subcategoryId =
      subcats?.primaryId ??
      (await this.subcategories.resolveSubcategoryForEvent(
        tenantId,
        'gastro',
        prepared.subcategoryId ?? null,
      ));
    const subcategoryAllIds = subcats?.allIds ?? (subcategoryId ? [subcategoryId] : []);

    const gallery = prepared.galleryUrls?.filter(Boolean) ?? null;
    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.gastroProfile.create({
        data: {
          ...await this.buildProfileCreateData(tenantId, prepared, subcategoryId),
          createdByUserId: userId,
          status: 'PENDING',
        },
      });
      await tx.userGastroMembership.create({
        data: {
          tenantId,
          userId,
          profileId: created.id,
          membershipRole: 'OWNER',
          status: 'ACTIVE',
        },
      });
      return created;
    });

    const eventId = await this.publicEventSync.syncPublicEvent(profile, userId, gallery);
    await syncGastroPublicEventTags(this.prisma, tenantId, eventId, prepared.tagIds);
    await syncGastroPublicEventSubcategories(
      this.prisma,
      eventId,
      subcategoryId,
      subcategoryAllIds,
    );
    const refreshed = await this.prisma.gastroProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    return this.withTagsAndSubcategories(this.toResponse(refreshed));
  }

  async updateMyLocal(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroLocalUpdateInput,
    profileId?: string,
  ): Promise<GastroLocalResponse> {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.ownership.getManagedProfileById(
      tenantId,
      userId,
      profileId,
    );

    let subcategoryId: string | null | undefined = undefined;
    let subcategorySync: { primaryId: string | null; allIds: string[] } | null = null;
    if (body.subcategoryId !== undefined || body.subcategoryIds !== undefined) {
      subcategorySync = await resolveValidatedGastroSubcategories(this.prisma, tenantId, {
        subcategoryId: body.subcategoryId,
        subcategoryIds: body.subcategoryIds,
      });
      if (subcategorySync) {
        subcategoryId = subcategorySync.primaryId;
      } else if (body.subcategoryId !== undefined) {
        subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
          tenantId,
          'gastro',
          body.subcategoryId,
        );
      }
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
        ...(body.relatedLinks !== undefined && {
          relatedLinks:
            normalizeRelatedLinksForWrite(body.relatedLinks) ?? Prisma.JsonNull,
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
    if (subcategorySync !== null) {
      await syncGastroPublicEventSubcategories(
        this.prisma,
        publicEventId,
        subcategorySync.primaryId,
        subcategorySync.allIds,
      );
    }

    const refreshed = await this.prisma.gastroProfile.findUniqueOrThrow({
      where: { id: updated.id },
    });
    return this.withTagsAndSubcategories(this.toResponse(refreshed));
  }
}
