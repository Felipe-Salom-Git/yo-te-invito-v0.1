import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { ContentTag } from '@prisma/client';
import {
  ErrorCode,
  type AdminContentTagsListQuery,
  type ContentTagAdmin,
  type ContentTagPublic,
  type ContentTagScope,
  type CreateContentTagBody,
  type PublicContentTagsQuery,
  type UpdateContentTagBody,
  isValidContentTagName,
  normalizeContentTagName,
  slugifyContentTagName,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ContentTagsService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeToDb(scope: ContentTagScope | null | undefined): string | null {
    if (scope == null || scope === 'all') return null;
    return scope;
  }

  private scopeFromDb(value: string | null): ContentTagScope | null {
    if (value == null) return 'all';
    return value as ContentTagScope;
  }

  private async uniqueSlug(
    tenantId: string,
    baseSlug: string,
    excludeId?: string,
  ): Promise<string> {
    let slug = baseSlug;
    let n = 1;
    while (true) {
      const existing = await this.prisma.contentTag.findFirst({
        where: {
          tenantId,
          slug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });
      if (!existing) return slug;
      slug = `${baseSlug}-${n++}`;
    }
  }

  private async usageCount(tagId: string): Promise<number> {
    return this.prisma.eventTag.count({ where: { tagId } });
  }

  private toAdmin(row: ContentTag, usageCount?: number): ContentTagAdmin {
    return {
      id: row.id,
      tenantId: row.tenantId,
      name: row.name,
      slug: row.slug,
      description: row.description,
      categoryScope: this.scopeFromDb(row.categoryScope),
      isActive: row.isActive,
      usageCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toPublic(row: Pick<ContentTag, 'id' | 'name' | 'slug'>): ContentTagPublic {
    return { id: row.id, name: row.name, slug: row.slug };
  }

  async listPublic(query: PublicContentTagsQuery) {
    const category = query.category?.trim();
    const rows = await this.prisma.contentTag.findMany({
      where: {
        tenantId: query.tenantId,
        isActive: true,
        ...(category
          ? { OR: [{ categoryScope: null }, { categoryScope: category }] }
          : {}),
      },
      orderBy: [{ name: 'asc' }],
      select: { id: true, name: true, slug: true },
    });
    return { data: rows.map((r) => this.toPublic(r)) };
  }

  async listAdmin(tenantId: string, query: AdminContentTagsListQuery) {
    const q = query.q?.trim();
    const where = {
      tenantId,
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
      ...(query.categoryScope !== undefined
        ? {
            categoryScope:
              query.categoryScope === 'all' ? null : query.categoryScope,
          }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { slug: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.contentTag.findMany({
        where,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.contentTag.count({ where }),
    ]);

    const data = await Promise.all(
      rows.map(async (row) => this.toAdmin(row, await this.usageCount(row.id))),
    );

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async create(tenantId: string, body: CreateContentTagBody) {
    const name = normalizeContentTagName(body.name);
    if (!isValidContentTagName(name)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid tag name',
      });
    }
    const slug = body.slug?.trim() || slugifyContentTagName(name);
    if (!slug) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Could not derive slug from name',
      });
    }
    const existing = await this.prisma.contentTag.findFirst({
      where: {
        tenantId,
        OR: [{ slug }, { name: { equals: name, mode: 'insensitive' } }],
      },
    });
    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'A tag with this name or slug already exists',
      });
    }

    const row = await this.prisma.contentTag.create({
      data: {
        tenantId,
        name,
        slug,
        description: body.description?.trim() || null,
        categoryScope: this.scopeToDb(body.categoryScope),
        isActive: body.isActive ?? true,
      },
    });
    return this.toAdmin(row, 0);
  }

  async update(tenantId: string, id: string, body: UpdateContentTagBody) {
    const existing = await this.prisma.contentTag.findFirst({
      where: { id, tenantId },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Tag not found',
      });
    }

    let name = existing.name;
    if (body.name !== undefined) {
      name = normalizeContentTagName(body.name);
      if (!isValidContentTagName(name)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Invalid tag name',
        });
      }
    }

    let slug = existing.slug;
    if (body.slug !== undefined) {
      slug = await this.uniqueSlug(tenantId, body.slug.trim(), id);
    } else if (body.name !== undefined) {
      const derived = slugifyContentTagName(name);
      if (derived && derived !== existing.slug) {
        slug = await this.uniqueSlug(tenantId, derived, id);
      }
    }

    const row = await this.prisma.contentTag.update({
      where: { id },
      data: {
        name,
        slug,
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.categoryScope !== undefined
          ? { categoryScope: this.scopeToDb(body.categoryScope) }
          : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
    });
    return this.toAdmin(row, await this.usageCount(row.id));
  }

  async setActive(tenantId: string, id: string, isActive: boolean) {
    return this.update(tenantId, id, { isActive });
  }
}
