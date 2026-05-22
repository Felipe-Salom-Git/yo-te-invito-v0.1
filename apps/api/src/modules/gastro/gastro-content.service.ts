import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { GastroContent } from '@prisma/client';
import {
  ErrorCode,
  type GastroContentCreateInput,
  type GastroContentResponse,
  type GastroContentStatus,
  type GastroContentType,
  type GastroContentUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';

@Injectable()
export class GastroContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
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
    return {
      id: row.id,
      eventId: row.eventId,
      gastroProfileId: row.gastroProfileId,
      type: this.mapType(row.type),
      title: row.title,
      body: row.body,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      status: this.mapStatus(row.status),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async assertCanManageEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
  ) {
    if (userRole !== 'ADMIN') {
      const has = await this.profiles.hasGastroAccess(tenantId, userId);
      if (!has) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Gastro access required',
        });
      }
    }
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
    return event;
  }

  private async resolveProfileForEvent(tenantId: string, eventId: string, userId: string, userRole: string) {
    await this.assertCanManageEvent(tenantId, userId, userRole, eventId);
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { tenantId, publicEventId: eventId, status: 'ACTIVE' },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No hay un local gastronómico activo vinculado a este evento',
      });
    }
    if (userRole !== 'ADMIN') {
      const membership = await this.prisma.userGastroMembership.findFirst({
        where: {
          tenantId,
          userId,
          profileId: profile.id,
          status: 'ACTIVE',
        },
      });
      if (!membership) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'No podés gestionar contenido de este establecimiento',
        });
      }
    }
    return profile;
  }

  async listByEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
  ): Promise<GastroContentResponse[]> {
    await this.resolveProfileForEvent(tenantId, eventId, userId, userRole);
    const rows = await this.prisma.gastroContent.findMany({
      where: { tenantId, eventId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((r) => this.toResponse(r));
  }

  async createForEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
    input: GastroContentCreateInput,
  ): Promise<GastroContentResponse> {
    const profile = await this.resolveProfileForEvent(tenantId, eventId, userId, userRole);
    const status = input.status ?? 'draft';
    const row = await this.prisma.gastroContent.create({
      data: {
        tenantId,
        gastroProfileId: profile.id,
        eventId,
        type: this.toPrismaType(input.type),
        title: input.title?.trim() || null,
        body: input.body?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        sortOrder: input.sortOrder ?? 0,
        status: this.toPrismaStatus(status),
      },
    });
    return this.toResponse(row);
  }

  async updateById(
    tenantId: string,
    userId: string,
    userRole: string,
    contentId: string,
    patch: GastroContentUpdateInput,
  ): Promise<GastroContentResponse> {
    const existing = await this.prisma.gastroContent.findFirst({
      where: { id: contentId, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Content not found',
      });
    }
    await this.resolveProfileForEvent(tenantId, existing.eventId, userId, userRole);

    const nextType = patch.type ?? this.mapType(existing.type);
    const nextTitle = patch.title !== undefined ? patch.title?.trim() || null : existing.title;
    const nextBody = patch.body !== undefined ? patch.body?.trim() || null : existing.body;
    const nextImage =
      patch.imageUrl !== undefined ? patch.imageUrl?.trim() || null : existing.imageUrl;

    if (nextType === 'image' && !nextImage) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Las publicaciones de tipo imagen requieren imageUrl',
      });
    }

    const updated = await this.prisma.gastroContent.update({
      where: { id: contentId },
      data: {
        ...(patch.type !== undefined ? { type: this.toPrismaType(patch.type) } : {}),
        ...(patch.title !== undefined ? { title: nextTitle } : {}),
        ...(patch.body !== undefined ? { body: nextBody } : {}),
        ...(patch.imageUrl !== undefined ? { imageUrl: nextImage } : {}),
        ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
        ...(patch.status !== undefined ? { status: this.toPrismaStatus(patch.status) } : {}),
      },
    });
    return this.toResponse(updated);
  }

  /** Published editorial blocks for public location detail. */
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
