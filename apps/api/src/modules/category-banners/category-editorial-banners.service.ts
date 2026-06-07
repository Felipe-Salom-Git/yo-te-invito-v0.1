import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, type CategoryEditorialBanner } from '@prisma/client';
import {
  ErrorCode,
  type AdminCategoryEditorialBannersResponse,
  type ContentMainCategory,
  type CreateCategoryEditorialBannerBody,
  type PublicCategoryEditorialBannersResponse,
  type ReorderCategoryEditorialBannerBody,
  type UpdateCategoryEditorialBannerBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const MAX_EDITORIAL_BANNERS = 5;

type Actor = { id: string; role: string };

@Injectable()
export class CategoryEditorialBannersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private toItem(row: CategoryEditorialBanner) {
    return {
      id: row.id,
      category: row.category as ContentMainCategory,
      title: row.title,
      subtitle: row.subtitle,
      imageUrl: row.imageUrl,
      imageObjectKey: row.imageObjectKey,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listPublic(
    tenantId: string,
    category: ContentMainCategory,
  ): Promise<PublicCategoryEditorialBannersResponse> {
    const rows = await this.prisma.categoryEditorialBanner.findMany({
      where: { tenantId, category, isActive: true },
      orderBy: { sortOrder: 'asc' },
      take: MAX_EDITORIAL_BANNERS,
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        category: row.category as ContentMainCategory,
        title: row.title,
        subtitle: row.subtitle,
        imageUrl: row.imageUrl,
        ctaLabel: row.ctaLabel,
        ctaHref: row.ctaHref,
        sortOrder: row.sortOrder,
      })),
    };
  }

  async listAdmin(
    tenantId: string,
    category: ContentMainCategory,
  ): Promise<AdminCategoryEditorialBannersResponse> {
    const rows = await this.prisma.categoryEditorialBanner.findMany({
      where: { tenantId, category },
      orderBy: { sortOrder: 'asc' },
    });
    return { data: rows.map((row) => this.toItem(row)) };
  }

  async create(
    tenantId: string,
    actor: Actor,
    body: CreateCategoryEditorialBannerBody,
  ): Promise<AdminCategoryEditorialBannersResponse> {
    const count = await this.prisma.categoryEditorialBanner.count({
      where: { tenantId, category: body.category },
    });
    if (count >= MAX_EDITORIAL_BANNERS) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Maximum ${MAX_EDITORIAL_BANNERS} editorial banners per category`,
      });
    }

    const maxSort = await this.prisma.categoryEditorialBanner.aggregate({
      where: { tenantId, category: body.category },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const row = await this.prisma.categoryEditorialBanner.create({
      data: {
        tenantId,
        category: body.category,
        title: body.title.trim(),
        subtitle: body.subtitle?.trim() || null,
        imageUrl: body.imageUrl,
        imageObjectKey: body.imageObjectKey?.trim() || null,
        ctaLabel: body.ctaLabel?.trim() || null,
        ctaHref: body.ctaHref,
        isActive: body.isActive ?? true,
        sortOrder,
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.CATEGORY_EDITORIAL_BANNER_CREATED,
      entityType: 'CategoryEditorialBanner',
      entityId: row.id,
      after: this.toItem(row),
      metadata: { category: body.category },
    });

    return this.listAdmin(tenantId, body.category);
  }

  async update(
    tenantId: string,
    actor: Actor,
    id: string,
    body: UpdateCategoryEditorialBannerBody,
  ): Promise<AdminCategoryEditorialBannersResponse> {
    const existing = await this.prisma.categoryEditorialBanner.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Category editorial banner not found',
      });
    }

    const before = this.toItem(existing);
    const data: Partial<CategoryEditorialBanner> = {};

    if (body.title !== undefined) data.title = body.title.trim();
    if (body.subtitle !== undefined) data.subtitle = body.subtitle?.trim() || null;
    if (body.imageUrl !== undefined) data.imageUrl = body.imageUrl;
    if (body.imageObjectKey !== undefined) {
      data.imageObjectKey = body.imageObjectKey?.trim() || null;
    }
    if (body.ctaLabel !== undefined) data.ctaLabel = body.ctaLabel?.trim() || null;
    if (body.ctaHref !== undefined) data.ctaHref = body.ctaHref;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const row = await this.prisma.categoryEditorialBanner.update({
      where: { id },
      data,
    });

    const after = this.toItem(row);
    let action: AuditAction = AuditAction.CATEGORY_EDITORIAL_BANNER_UPDATED;
    if (body.isActive === true && !existing.isActive) {
      action = AuditAction.CATEGORY_EDITORIAL_BANNER_ACTIVATED;
    } else if (body.isActive === false && existing.isActive) {
      action = AuditAction.CATEGORY_EDITORIAL_BANNER_DEACTIVATED;
    }

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action,
      entityType: 'CategoryEditorialBanner',
      entityId: id,
      before,
      after,
      metadata: { category: existing.category },
    });

    return this.listAdmin(tenantId, existing.category as ContentMainCategory);
  }

  async reorder(
    tenantId: string,
    actor: Actor,
    id: string,
    body: ReorderCategoryEditorialBannerBody,
  ): Promise<AdminCategoryEditorialBannersResponse> {
    const existing = await this.prisma.categoryEditorialBanner.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Category editorial banner not found',
      });
    }

    const siblings = await this.prisma.categoryEditorialBanner.findMany({
      where: { tenantId, category: existing.category },
      orderBy: { sortOrder: 'asc' },
    });

    const index = siblings.findIndex((s) => s.id === id);
    if (index < 0) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Category editorial banner not found',
      });
    }

    const swapIndex = body.direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      return this.listAdmin(tenantId, existing.category as ContentMainCategory);
    }

    const other = siblings[swapIndex]!;
    const before = siblings.map((s) => ({ id: s.id, sortOrder: s.sortOrder }));

    await this.prisma.$transaction([
      this.prisma.categoryEditorialBanner.update({
        where: { id },
        data: { sortOrder: other.sortOrder },
      }),
      this.prisma.categoryEditorialBanner.update({
        where: { id: other.id },
        data: { sortOrder: existing.sortOrder },
      }),
    ]);

    const afterRows = await this.prisma.categoryEditorialBanner.findMany({
      where: { tenantId, category: existing.category },
      orderBy: { sortOrder: 'asc' },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: AuditAction.CATEGORY_EDITORIAL_BANNER_REORDERED,
      entityType: 'CategoryEditorialBanner',
      entityId: id,
      before: { items: before },
      after: { items: afterRows.map((s) => ({ id: s.id, sortOrder: s.sortOrder })) },
      metadata: { category: existing.category, direction: body.direction },
    });

    return this.listAdmin(tenantId, existing.category as ContentMainCategory);
  }
}
