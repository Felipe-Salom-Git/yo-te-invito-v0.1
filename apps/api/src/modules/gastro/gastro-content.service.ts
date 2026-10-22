import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GastroContent, GastroProfile } from '@prisma/client';
import { Prisma } from '@prisma/client';
import {
  ErrorCode,
  prepareGastroContentGalleryWrite,
  resolveGastroContentCoverImageUrl,
  resolveGastroContentGalleryUrls,
  type GastroContentCreateInput,
  type GastroContentResponse,
  type GastroContentStatus,
  type GastroContentType,
  type GastroContentUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroOwnershipService } from './gastro-ownership.service';

@Injectable()
export class GastroContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly ownership: GastroOwnershipService,
  ) {}

  private mapType(type: string): GastroContentType {
    return type === 'IMAGE' ? 'image' : 'editorial';
  }

  private mapStatus(status: string): GastroContentStatus {
    switch (status) {
      case 'PUBLISHED':
        return 'published';
      case 'INACTIVE':
        return 'inactive';
      default:
        return 'draft';
    }
  }

  private toPrismaType(type: GastroContentType): 'EDITORIAL' | 'IMAGE' {
    return type === 'image' ? 'IMAGE' : 'EDITORIAL';
  }

  private toPrismaStatus(status: GastroContentStatus): 'DRAFT' | 'PUBLISHED' | 'INACTIVE' {
    switch (status) {
      case 'published':
        return 'PUBLISHED';
      case 'inactive':
        return 'INACTIVE';
      default:
        return 'DRAFT';
    }
  }

  private toResponse(row: GastroContent): GastroContentResponse {
    const galleryInput = {
      imageUrl: row.imageUrl,
      galleryUrls: row.galleryUrls,
    };
    return {
      id: row.id,
      eventId: row.eventId,
      gastroProfileId: row.gastroProfileId,
      type: this.mapType(row.type),
      title: row.title,
      body: row.body,
      imageUrl: resolveGastroContentCoverImageUrl(galleryInput),
      galleryUrls: resolveGastroContentGalleryUrls(galleryInput),
      sortOrder: row.sortOrder,
      status: this.mapStatus(row.status),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private galleryWriteData(
    input: {
      imageUrl?: string | null;
      galleryUrls?: string[] | null;
    },
    existing?: Pick<GastroContent, 'imageUrl' | 'galleryUrls'> | null,
  ): { imageUrl: string | null; galleryUrls: Prisma.InputJsonValue | typeof Prisma.JsonNull } {
    const prepared = prepareGastroContentGalleryWrite({
      imageUrl: input.imageUrl,
      galleryUrls: input.galleryUrls,
      existingImageUrl: existing?.imageUrl,
      existingGalleryUrls: existing?.galleryUrls,
    });
    return {
      imageUrl: prepared.imageUrl,
      galleryUrls:
        prepared.galleryUrls.length > 0
          ? (prepared.galleryUrls as Prisma.InputJsonValue)
          : Prisma.JsonNull,
    };
  }

  /**
   * Canonical access: tenant + gastroProfileId + membership (or ADMIN in tenant).
   * Does not trust client eventId / contentId alone.
   */
  private async assertCanManageProfileContent(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId: string,
  ): Promise<GastroProfile> {
    const id = profileId.trim();
    if (!id) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'profileId is required',
      });
    }

    if (userRole === 'ADMIN') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { id, tenantId },
      });
      if (!profile) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Gastro location not found',
        });
      }
      return profile;
    }

    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Gastro access required',
      });
    }
    return this.ownership.assertCanManageProfile(tenantId, userId, id);
  }

  private async loadContentForManage(
    tenantId: string,
    userId: string,
    userRole: string,
    contentId: string,
  ): Promise<GastroContent> {
    const existing = await this.prisma.gastroContent.findFirst({
      where: { id: contentId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Content not found',
      });
    }
    await this.assertCanManageProfileContent(
      tenantId,
      userId,
      userRole,
      existing.gastroProfileId,
    );
    return existing;
  }

  private async resolveProfileForEvent(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<GastroProfile> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    if ((event.category ?? '').toLowerCase() !== 'gastro') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Content applies only to gastro-category events',
      });
    }
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { tenantId, publicEventId: eventId },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No hay un local gastronómico vinculado a este evento',
      });
    }
    await this.assertCanManageProfileContent(tenantId, userId, userRole, profile.id);
    return profile;
  }

  private async resolveProfileIdForCaller(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId?: string | null,
  ): Promise<string> {
    if (userRole === 'ADMIN') {
      const explicit = profileId?.trim();
      if (!explicit) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'profileId is required',
        });
      }
      await this.assertCanManageProfileContent(tenantId, userId, userRole, explicit);
      return explicit;
    }
    return this.ownership.resolveManagedProfileId(tenantId, userId, profileId);
  }

  async listByProfile(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId?: string | null,
  ): Promise<GastroContentResponse[]> {
    const resolvedId = await this.resolveProfileIdForCaller(
      tenantId,
      userId,
      userRole,
      profileId,
    );
    const profile = await this.assertCanManageProfileContent(
      tenantId,
      userId,
      userRole,
      resolvedId,
    );
    const rows = await this.prisma.gastroContent.findMany({
      where: { tenantId, gastroProfileId: profile.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toResponse(r));
  }

  async getById(
    tenantId: string,
    userId: string,
    userRole: string,
    contentId: string,
  ): Promise<GastroContentResponse> {
    const row = await this.loadContentForManage(tenantId, userId, userRole, contentId);
    return this.toResponse(row);
  }

  async createForProfile(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId: string | null | undefined,
    input: GastroContentCreateInput,
  ): Promise<GastroContentResponse> {
    const resolvedId = await this.resolveProfileIdForCaller(
      tenantId,
      userId,
      userRole,
      profileId,
    );
    const profile = await this.assertCanManageProfileContent(
      tenantId,
      userId,
      userRole,
      resolvedId,
    );
    if (!profile.publicEventId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El local debe tener ficha pública antes de publicar contenido',
      });
    }
    const status = input.status ?? 'draft';
    const gallery = this.galleryWriteData({
      imageUrl: input.imageUrl,
      galleryUrls: input.galleryUrls,
    });
    const maxSort = await this.prisma.gastroContent.aggregate({
      where: { tenantId, gastroProfileId: profile.id },
      _max: { sortOrder: true },
    });
    const row = await this.prisma.gastroContent.create({
      data: {
        tenantId,
        gastroProfileId: profile.id,
        eventId: profile.publicEventId,
        type: this.toPrismaType(input.type),
        title: input.title?.trim() || null,
        body: input.body?.trim() || null,
        imageUrl: gallery.imageUrl,
        galleryUrls: gallery.galleryUrls,
        sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
        status: this.toPrismaStatus(status),
      },
    });
    return this.toResponse(row);
  }

  async listByEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
  ): Promise<GastroContentResponse[]> {
    const profile = await this.resolveProfileForEvent(tenantId, eventId, userId, userRole);
    return this.listByProfile(tenantId, userId, userRole, profile.id);
  }

  async createForEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
    input: GastroContentCreateInput,
  ): Promise<GastroContentResponse> {
    const profile = await this.resolveProfileForEvent(tenantId, eventId, userId, userRole);
    return this.createForProfile(tenantId, userId, userRole, profile.id, input);
  }

  async updateById(
    tenantId: string,
    userId: string,
    userRole: string,
    contentId: string,
    patch: GastroContentUpdateInput,
  ): Promise<GastroContentResponse> {
    const existing = await this.loadContentForManage(tenantId, userId, userRole, contentId);

    const nextType = patch.type ?? this.mapType(existing.type);
    const nextTitle = patch.title !== undefined ? patch.title?.trim() || null : existing.title;
    const nextBody = patch.body !== undefined ? patch.body?.trim() || null : existing.body;
    const galleryTouched =
      patch.imageUrl !== undefined || patch.galleryUrls !== undefined;
    const gallery = galleryTouched
      ? this.galleryWriteData(
          { imageUrl: patch.imageUrl, galleryUrls: patch.galleryUrls },
          existing,
        )
      : null;

    if (nextType === 'image') {
      const cover =
        gallery?.imageUrl ??
        resolveGastroContentCoverImageUrl({
          imageUrl: existing.imageUrl,
          galleryUrls: existing.galleryUrls,
        });
      if (!cover) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Las publicaciones de tipo imagen requieren al menos una imagen',
        });
      }
    }

    const updated = await this.prisma.gastroContent.update({
      where: { id: contentId },
      data: {
        ...(patch.type !== undefined ? { type: this.toPrismaType(patch.type) } : {}),
        ...(patch.title !== undefined ? { title: nextTitle } : {}),
        ...(patch.body !== undefined ? { body: nextBody } : {}),
        ...(gallery
          ? { imageUrl: gallery.imageUrl, galleryUrls: gallery.galleryUrls }
          : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
        ...(patch.status !== undefined ? { status: this.toPrismaStatus(patch.status) } : {}),
      },
    });
    return this.toResponse(updated);
  }

  /** Logical delete — sets status INACTIVE (keeps row + gallery URLs). */
  async archiveById(
    tenantId: string,
    userId: string,
    userRole: string,
    contentId: string,
  ): Promise<GastroContentResponse> {
    return this.updateById(tenantId, userId, userRole, contentId, { status: 'inactive' });
  }

  async reorderForProfile(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId: string | null | undefined,
    orderedIds: string[],
  ): Promise<GastroContentResponse[]> {
    const resolvedId = await this.resolveProfileIdForCaller(
      tenantId,
      userId,
      userRole,
      profileId,
    );
    const profile = await this.assertCanManageProfileContent(
      tenantId,
      userId,
      userRole,
      resolvedId,
    );
    const unique = [...new Set(orderedIds.map((id) => id.trim()).filter(Boolean))];
    if (unique.length === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'orderedIds is required',
      });
    }

    const existing = await this.prisma.gastroContent.findMany({
      where: { tenantId, gastroProfileId: profile.id, id: { in: unique } },
      select: { id: true },
    });
    if (existing.length !== unique.length) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'One or more content items do not belong to this local',
      });
    }

    await this.prisma.$transaction(
      unique.map((id, index) =>
        this.prisma.gastroContent.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.listByProfile(tenantId, userId, userRole, profile.id);
  }

  /** Published posts for public location detail (tenant + profile only). */
  async listPublishedForProfile(tenantId: string, gastroProfileId: string) {
    const rows = await this.prisma.gastroContent.findMany({
      where: {
        tenantId,
        gastroProfileId,
        status: 'PUBLISHED',
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => {
      const mapped = this.toResponse(r);
      const { gastroProfileId: _omit, ...publicItem } = mapped;
      return publicItem;
    });
  }
}
