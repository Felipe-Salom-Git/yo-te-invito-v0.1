import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, ProfileStatus, Prisma } from '@prisma/client';
import {
  ErrorCode,
  type AdminGastroLocationCreateInput,
  type AdminGastroLocationStatusPatchInput,
  type AdminGastroLocationUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SubcategoriesService } from '../subcategories/subcategories.service';
import { AdminGastroService } from './admin-gastro.service';
import {
  normalizeGastroSummary,
  shouldSyncGastroPublicEventAfterUpdate,
  writeGastroOpeningHours,
} from '../gastro/gastro-profile-fields.util';
import { GastroPublicEventSyncService } from '../gastro/gastro-public-event-sync.service';
import { writeEntitySocialLinks } from '../../common/entity-social-links.util';

@Injectable()
export class AdminGastroLocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subcategories: SubcategoriesService,
    private readonly publicEventSync: GastroPublicEventSyncService,
    private readonly adminGastro: AdminGastroService,
  ) {}

  private resolveProfileStatus(status?: ProfileStatus): ProfileStatus {
    return status ?? 'ACTIVE';
  }

  private shouldPublishOnWrite(status: ProfileStatus, publish?: boolean): boolean {
    if (publish === false) return false;
    return status === 'ACTIVE';
  }

  private async assertOwnerUser(tenantId: string, ownerUserId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: ownerUserId, tenantId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Owner user not found',
      });
    }
    return user;
  }

  private async ensureOwnerMembership(
    tenantId: string,
    profileId: string,
    ownerUserId: string,
  ): Promise<void> {
    await this.assertOwnerUser(tenantId, ownerUserId);
    const existing = await this.prisma.userGastroMembership.findUnique({
      where: { userId_profileId: { userId: ownerUserId, profileId } },
    });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        await this.prisma.userGastroMembership.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', membershipRole: 'OWNER' },
        });
      }
      return;
    }
    await this.prisma.userGastroMembership.create({
      data: {
        tenantId,
        userId: ownerUserId,
        profileId,
        membershipRole: 'OWNER',
        status: 'ACTIVE',
      },
    });
  }

  async create(
    tenantId: string,
    adminUserId: string,
    body: AdminGastroLocationCreateInput,
  ) {
    const effectiveTenantId = body.tenantId ?? tenantId;
    if (effectiveTenantId !== tenantId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'tenantId does not match authenticated tenant',
      });
    }

    const status = this.resolveProfileStatus(body.status);
    const subcategoryId = await this.subcategories.resolveSubcategoryForEvent(
      effectiveTenantId,
      'gastro',
      body.subcategoryId ?? null,
    );
    const gallery = body.galleryUrls?.filter(Boolean) ?? null;

    const profile = await this.prisma.gastroProfile.create({
      data: {
        tenantId: effectiveTenantId,
        displayName: body.displayName.trim(),
        legalName: body.legalName?.trim() || null,
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
        contactPhone: body.contactPhone?.trim() || null,
        contactEmail: body.contactEmail.trim(),
        menuUrl: body.menuUrl ?? null,
        websiteUrl: body.websiteUrl ?? null,
        bookingUrl: body.bookingUrl ?? null,
        socialLinks: writeEntitySocialLinks(body.socialLinks),
        status,
        createdByUserId: adminUserId,
      },
    });

    if (body.ownerUserId) {
      await this.ensureOwnerMembership(effectiveTenantId, profile.id, body.ownerUserId);
    }

    if (this.shouldPublishOnWrite(status, body.publish)) {
      await this.publicEventSync.syncPublicEvent(profile, adminUserId, gallery);
    } else if (status !== 'ACTIVE') {
      await this.publicEventSync.syncVisibilityForProfile(profile);
    }

    return this.adminGastro.getLocation(effectiveTenantId, profile.id);
  }

  /** Keeps discovery Event in sync whenever the profile should be publicly visible. */
  private async syncActiveProfilePublicEvent(
    profile: { id: string; tenantId: string; status: ProfileStatus },
    actorUserId: string,
    galleryUrls?: string[] | null,
  ): Promise<void> {
    const fresh = await this.prisma.gastroProfile.findUniqueOrThrow({
      where: { id: profile.id },
    });
    if (fresh.status !== 'ACTIVE') {
      await this.publicEventSync.syncVisibilityForProfile(fresh);
      return;
    }
    await this.publicEventSync.syncPublicEvent(
      fresh,
      actorUserId,
      galleryUrls !== undefined
        ? galleryUrls
        : this.publicEventSync.readGallery(fresh),
    );
  }

  async update(
    tenantId: string,
    adminUserId: string,
    profileId: string,
    body: AdminGastroLocationUpdateInput,
  ) {
    const existing = await this.prisma.gastroProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }

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
      where: { id: profileId },
      data: {
        ...(body.displayName !== undefined && { displayName: body.displayName.trim() }),
        ...(body.legalName !== undefined && { legalName: body.legalName?.trim() || null }),
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

    if (body.ownerUserId) {
      await this.ensureOwnerMembership(tenantId, profileId, body.ownerUserId);
    }

    const actorUserId =
      body.ownerUserId ??
      existing.createdByUserId ??
      adminUserId;

    if (updated.status === 'ACTIVE') {
      const shouldFullSync =
        !updated.publicEventId ||
        shouldSyncGastroPublicEventAfterUpdate({ ...body, subcategoryId });
      if (shouldFullSync) {
        await this.syncActiveProfilePublicEvent(
          updated,
          actorUserId,
          gallery !== undefined ? gallery : undefined,
        );
      } else {
        await this.publicEventSync.syncVisibilityForProfile(updated);
      }
    } else {
      await this.publicEventSync.syncVisibilityForProfile(updated);
    }

    return this.adminGastro.getLocation(tenantId, profileId);
  }

  async updateStatus(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    body: AdminGastroLocationStatusPatchInput,
  ) {
    const existing = await this.prisma.gastroProfile.findFirst({
      where: { id: profileId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }

    const status = body.status as ProfileStatus;
    const before = { status: existing.status };
    const after = { status };

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.gastroProfile.update({
        where: { id: profileId },
        data: { status },
      });
      const auditAction =
        status === 'SUSPENDED'
          ? AuditAction.GASTRO_PROFILE_SUSPENDED
          : status === 'ACTIVE'
            ? AuditAction.GASTRO_PROFILE_ACTIVATED
            : null;
      if (auditAction) {
        await tx.auditLog.create({
          data: {
            tenantId,
            actorId: adminUserId,
            actorRole: adminRole,
            action: auditAction,
            entityType: 'GastroProfile',
            entityId: profileId,
            before: before as object,
            after: after as object,
          },
        });
      }
      return row;
    });

    const actorUserId = existing.createdByUserId ?? adminUserId;

    if (status === 'ACTIVE') {
      await this.syncActiveProfilePublicEvent(updated, actorUserId);
    } else {
      await this.publicEventSync.syncVisibilityForProfile(updated);
    }

    return this.adminGastro.getLocation(tenantId, profileId);
  }
}
