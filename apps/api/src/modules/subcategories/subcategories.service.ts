import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ContentSubcategory } from '@prisma/client';
import {
  ErrorCode,
  type AdminSubcategoriesListQuery,
  type ContentCategory,
  type ContentMainCategory,
  type CreateSubcategoryBody,
  type PublicSubcategoriesQuery,
  type SubcategoryResponse,
  type UpdateSubcategoryBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { slugifySubcategoryName } from './subcategory-slug.util';

const HOTEL_SUBCATEGORIES_DISABLED =
  'Las subcategorías de hoteles se habilitarán en una próxima etapa.';

@Injectable()
export class SubcategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private toResponse(row: ContentSubcategory): SubcategoryResponse {
    return {
      id: row.id,
      tenantId: row.tenantId,
      category: row.category as ContentCategory,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.imageUrl,
      iconName: row.iconName,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private assertMainCategory(category: string): asserts category is ContentMainCategory {
    if (!['event', 'gastro', 'rental', 'excursion'].includes(category)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid category for subcategory management',
      });
    }
  }

  private assertNotHotel(category: ContentCategory): void {
    if (category === 'hotel') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: HOTEL_SUBCATEGORIES_DISABLED,
      });
    }
  }

  private async uniqueSlug(
    tenantId: string,
    category: string,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let n = 1;
    while (true) {
      const existing = await this.prisma.contentSubcategory.findFirst({
        where: {
          tenantId,
          category,
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!existing) return slug;
      slug = `${baseSlug}-${n++}`;
    }
  }

  async listPublic(query: PublicSubcategoriesQuery) {
    this.assertMainCategory(query.category);
    const rows = await this.prisma.contentSubcategory.findMany({
      where: {
        tenantId: query.tenantId,
        category: query.category,
        isActive: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return {
      data: rows.map((r) => ({
        id: r.id,
        category: r.category as ContentCategory,
        name: r.name,
        slug: r.slug,
        description: r.description,
        imageUrl: r.imageUrl,
        iconName: r.iconName,
        sortOrder: r.sortOrder,
      })),
    };
  }

  async listAdmin(tenantId: string, query: AdminSubcategoriesListQuery) {
    if (query.category === 'hotel') {
      return { data: [], comingSoon: true as const };
    }
    this.assertMainCategory(query.category);
    const rows = await this.prisma.contentSubcategory.findMany({
      where: { tenantId, category: query.category },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return { data: rows.map((r) => this.toResponse(r)) };
  }

  async create(tenantId: string, body: CreateSubcategoryBody) {
    this.assertNotHotel(body.category);
    this.assertMainCategory(body.category);
    const baseSlug = body.slug?.trim() || slugifySubcategoryName(body.name);
    if (!baseSlug) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Could not generate slug from name',
      });
    }
    const slug = await this.uniqueSlug(tenantId, body.category, baseSlug);
    try {
      const row = await this.prisma.contentSubcategory.create({
        data: {
          tenantId,
          category: body.category,
          name: body.name.trim(),
          slug,
          description: body.description ?? null,
          imageUrl: body.imageUrl ?? null,
          iconName: body.iconName ?? null,
          isActive: body.isActive ?? true,
          sortOrder: body.sortOrder ?? 0,
        },
      });
      return this.toResponse(row);
    } catch {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Subcategory slug already exists for this category',
      });
    }
  }

  async update(tenantId: string, id: string, body: UpdateSubcategoryBody) {
    const existing = await this.prisma.contentSubcategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Subcategory not found',
      });
    }
    this.assertNotHotel(existing.category as ContentCategory);

    let slug = existing.slug;
    if (body.slug !== undefined) {
      slug = await this.uniqueSlug(tenantId, existing.category, body.slug, id);
    } else if (body.name !== undefined) {
      slug = await this.uniqueSlug(
        tenantId,
        existing.category,
        slugifySubcategoryName(body.name),
        id,
      );
    }

    const row = await this.prisma.contentSubcategory.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name.trim() }),
        ...(body.slug !== undefined || body.name !== undefined ? { slug } : {}),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.imageUrl !== undefined && { imageUrl: body.imageUrl }),
        ...(body.iconName !== undefined && { iconName: body.iconName }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      },
    });
    return this.toResponse(row);
  }

  async remove(tenantId: string, id: string) {
    const existing = await this.prisma.contentSubcategory.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Subcategory not found',
      });
    }
    this.assertNotHotel(existing.category as ContentCategory);
    const row = await this.prisma.contentSubcategory.update({
      where: { id },
      data: { isActive: false },
    });
    return this.toResponse(row);
  }

  /** Validates subcategory for event create/update — null clears assignment */
  async resolveSubcategoryForEvent(
    tenantId: string,
    category: string | null | undefined,
    subcategoryId: string | null | undefined,
  ): Promise<string | null> {
    if (!subcategoryId) return null;
    const cat = (category ?? 'event').trim();
    if (cat === 'hotel') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: HOTEL_SUBCATEGORIES_DISABLED,
      });
    }
    const sub = await this.prisma.contentSubcategory.findFirst({
      where: { id: subcategoryId, tenantId, isActive: true },
    });
    if (!sub) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Subcategory not found or inactive',
      });
    }
    if (sub.category !== cat) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Subcategory does not belong to the selected category',
      });
    }
    return sub.id;
  }
}
