import { BadRequestException } from '@nestjs/common';
import {
  ErrorCode,
  MAX_CONTENT_TAGS_PER_PUBLICATION,
  type ContentTagPublic,
} from '@yo-te-invito/shared';

type PrismaTagLike = {
  eventTag: {
    deleteMany(args: { where: { eventId: string } }): Promise<unknown>;
    createMany(args: {
      data: Array<{ eventId: string; tagId: string }>;
      skipDuplicates?: boolean;
    }): Promise<unknown>;
  };
  contentTag: {
    findMany(args: {
      where: {
        id: { in: string[] };
        tenantId: string;
        isActive: boolean;
        OR?: Array<{ categoryScope: null } | { categoryScope: string }>;
      };
      select: { id: true; name: true; slug: true };
    }): Promise<Array<{ id: string; name: string; slug: string }>>;
  };
};

function tagScopeOr(category: string | null | undefined) {
  const c = category?.trim();
  if (!c) {
    return [{ categoryScope: null }] as const;
  }
  return [{ categoryScope: null }, { categoryScope: c }] as const;
}

export async function validateEventTagIds(
  prisma: PrismaTagLike,
  tenantId: string,
  eventCategory: string | null | undefined,
  tagIds: string[] | null | undefined,
): Promise<string[]> {
  if (tagIds == null) return [];
  const unique = [...new Set(tagIds.map((id) => id.trim()).filter(Boolean))];
  if (unique.length > MAX_CONTENT_TAGS_PER_PUBLICATION) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: `Maximum ${MAX_CONTENT_TAGS_PER_PUBLICATION} tags per publication`,
    });
  }
  if (unique.length === 0) return [];

  const rows = await prisma.contentTag.findMany({
    where: {
      id: { in: unique },
      tenantId,
      isActive: true,
      OR: [...tagScopeOr(eventCategory)],
    },
    select: { id: true, name: true, slug: true },
  });

  if (rows.length !== unique.length) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'One or more tags are invalid, inactive, or not allowed for this category',
    });
  }

  return unique;
}

export async function syncEventTags(
  prisma: PrismaTagLike,
  eventId: string,
  tagIds: string[],
): Promise<void> {
  await prisma.eventTag.deleteMany({ where: { eventId } });
  if (tagIds.length === 0) return;
  await prisma.eventTag.createMany({
    data: tagIds.map((tagId) => ({ eventId, tagId })),
    skipDuplicates: true,
  });
}

type EventTagRow = {
  tag: { id: string; name: string; slug: string; isActive: boolean };
};

export function mapEventTagsPublic(
  rows: EventTagRow[] | undefined | null,
): ContentTagPublic[] {
  if (!rows?.length) return [];
  return rows
    .filter((r) => r.tag.isActive)
    .map((r) => ({ id: r.tag.id, name: r.tag.name, slug: r.tag.slug }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** Sync tags on a gastro public discovery event after profile save. */
export async function syncGastroPublicEventTags(
  prisma: PrismaTagLike,
  tenantId: string,
  publicEventId: string | null | undefined,
  tagIds: string[] | null | undefined,
): Promise<void> {
  if (tagIds === undefined || !publicEventId) return;
  const validated = await validateEventTagIds(prisma, tenantId, 'gastro', tagIds ?? []);
  await syncEventTags(prisma, publicEventId, validated);
}

export async function loadEventTagsPublic(
  prisma: {
    eventTag: {
      findMany(args: {
        where: { eventId: string };
        include: { tag: { select: { id: true; name: true; slug: true; isActive: true } } };
      }): Promise<EventTagRow[]>;
    };
  },
  eventId: string | null | undefined,
): Promise<ContentTagPublic[]> {
  if (!eventId) return [];
  const rows = await prisma.eventTag.findMany({
    where: { eventId },
    include: { tag: { select: { id: true, name: true, slug: true, isActive: true } } },
  });
  return mapEventTagsPublic(rows);
}

/** Public list/search filter by tag slug. */
export function tagSlugFilterWhere(slug: string | undefined): { eventTags: { some: { tag: { slug: string; isActive: true } } } } | null {
  const s = slug?.trim();
  if (!s) return null;
  return {
    eventTags: {
      some: {
        tag: { slug: s, isActive: true },
      },
    },
  };
}
