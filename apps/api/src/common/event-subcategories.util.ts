import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import {
  ErrorCode,
  resolveExcursionSubcategorySelection,
  type EventSubcategoryPublic,
} from '@yo-te-invito/shared';

type PrismaLike = {
  eventSubcategory: {
    deleteMany(args: { where: { eventId: string } }): Promise<unknown>;
    createMany(args: {
      data: Array<{
        eventId: string;
        subcategoryId: string;
        isPrimary: boolean;
      }>;
    }): Promise<unknown>;
  };
  contentSubcategory: {
    findMany(args: {
      where: {
        id: { in: string[] };
        tenantId: string;
        category: string;
        isActive: boolean;
      };
      select: { id: true };
    }): Promise<Array<{ id: string }>>;
  };
};

export async function validateExcursionSubcategoryIds(
  prisma: PrismaLike,
  tenantId: string,
  ids: string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await prisma.contentSubcategory.findMany({
    where: {
      id: { in: ids },
      tenantId,
      category: 'excursion',
      isActive: true,
    },
    select: { id: true },
  });
  if (rows.length !== ids.length) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'One or more subcategories are invalid, inactive, or not for excursions',
    });
  }
  return ids;
}

export async function resolveValidatedExcursionSubcategories(
  prisma: PrismaLike,
  tenantId: string,
  input: {
    subcategoryId?: string | null;
    subcategoryIds?: string[] | null;
  },
): Promise<{ primaryId: string | null; allIds: string[] } | null> {
  const resolved = resolveExcursionSubcategorySelection(input);
  if (!resolved) return null;
  const allIds = await validateExcursionSubcategoryIds(prisma, tenantId, resolved.allIds);
  const primaryId =
    resolved.primaryId && allIds.includes(resolved.primaryId)
      ? resolved.primaryId
      : (allIds[0] ?? null);
  return { primaryId, allIds };
}

export async function syncEventSubcategories(
  prisma: PrismaLike,
  eventId: string,
  primaryId: string | null,
  allIds: string[],
): Promise<void> {
  await prisma.eventSubcategory.deleteMany({ where: { eventId } });
  if (allIds.length === 0) return;
  await prisma.eventSubcategory.createMany({
    data: allIds.map((subcategoryId) => ({
      eventId,
      subcategoryId,
      isPrimary: subcategoryId === primaryId,
    })),
  });
}

type EventSubcategoryRow = {
  isPrimary: boolean;
  subcategory: { id: string; name: string };
};

export function mapEventSubcategoriesPublic(
  rows: EventSubcategoryRow[] | undefined | null,
): EventSubcategoryPublic[] {
  if (!rows?.length) return [];
  const sorted = [...rows].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.subcategory.name.localeCompare(b.subcategory.name, 'es');
  });
  return sorted.map((row) => ({
    id: row.subcategory.id,
    name: row.subcategory.name,
    isPrimary: row.isPrimary || undefined,
  }));
}

/** Public list/detail filter: match legacy FK or junction assignment. */
export function subcategoryFilterWhere(
  tenantId: string,
  category: string | undefined,
  filter: { subcategoryId?: string; subcategorySlug?: string },
): Prisma.EventWhereInput | null {
  const subScope: Prisma.ContentSubcategoryWhereInput = {
    tenantId,
    isActive: true,
    ...(category?.trim() ? { category: category.trim() } : {}),
  };

  if (filter.subcategoryId?.trim()) {
    const id = filter.subcategoryId.trim();
    return {
      OR: [
        {
          subcategoryId: id,
          ...(category?.trim()
            ? { subcategory: { ...subScope, id } }
            : {}),
        },
        {
          eventSubcategories: {
            some: {
              subcategoryId: id,
              subcategory: { ...subScope, id },
            },
          },
        },
      ],
    };
  }

  if (filter.subcategorySlug?.trim() && category?.trim()) {
    const slug = filter.subcategorySlug.trim();
    return {
      OR: [
        {
          subcategory: { ...subScope, slug },
        },
        {
          eventSubcategories: {
            some: {
              subcategory: { ...subScope, slug },
            },
          },
        },
      ],
    };
  }

  return null;
}
