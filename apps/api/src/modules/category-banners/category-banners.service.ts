import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CategoryBannerItem, Event, Prisma } from '@prisma/client';
import {
  ErrorCode,
  type AdminCategoryBannerConfigResponse,
  type CategoryBannerResolvedItem,
  type ContentMainCategory,
  type PublicCategoryBannerResponse,
  type UpdateCategoryBannerItemsBody,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isEventPubliclyVisible,
  mergePublicEventVisibility,
} from '../../common/utils/event-public-visibility.util';

const MAX_BANNER_ITEMS = 5;

type EventBannerRow = Pick<
  Event,
  | 'id'
  | 'title'
  | 'description'
  | 'coverImageUrl'
  | 'category'
  | 'subcategoryId'
  | 'city'
  | 'venueName'
  | 'startAt'
  | 'status'
  | 'deletedAt'
  | 'tenantId'
> & {
  subcategory?: { name: string } | null;
};

@Injectable()
export class CategoryBannersService {
  constructor(private readonly prisma: PrismaService) {}

  private categoryWhere(category: ContentMainCategory): Prisma.EventWhereInput {
    if (category === 'event') {
      return { OR: [{ category: 'event' }, { category: null }] };
    }
    return { category };
  }

  private eventMatchesCategory(
    event: { category: string | null },
    category: ContentMainCategory,
  ): boolean {
    const c = (event.category ?? 'event').toLowerCase();
    if (category === 'event') return c === 'event';
    return c === category;
  }

  private isPublicBannerEvent(event: EventBannerRow, now = new Date()): boolean {
    if (event.deletedAt) return false;
    if (event.status !== 'APPROVED') return false;
    return isEventPubliclyVisible(event.startAt, event.category, now);
  }

  private toResolvedItem(
    event: EventBannerRow,
    opts: { isManual: boolean; position?: number },
  ): CategoryBannerResolvedItem {
    return {
      id: event.id,
      eventId: event.id,
      title: event.title,
      description: event.description,
      coverImageUrl: event.coverImageUrl,
      category: event.category,
      subcategoryId: event.subcategoryId,
      subcategoryName: event.subcategory?.name ?? null,
      city: event.city,
      venueName: event.venueName,
      startAt: event.startAt.toISOString(),
      position: opts.position,
      isManual: opts.isManual,
    };
  }

  private publicBaseWhere(
    tenantId: string,
    category: ContentMainCategory,
  ): Prisma.EventWhereInput {
    return mergePublicEventVisibility({
      tenantId,
      status: 'APPROVED',
      deletedAt: null,
      ...this.categoryWhere(category),
    });
  }

  private async loadEventsByIds(
    tenantId: string,
    ids: string[],
  ): Promise<Map<string, EventBannerRow>> {
    if (ids.length === 0) return new Map();
    const rows = await this.prisma.event.findMany({
      where: { tenantId, id: { in: ids }, deletedAt: null },
      select: {
        id: true,
        title: true,
        description: true,
        coverImageUrl: true,
        category: true,
        subcategoryId: true,
        city: true,
        venueName: true,
        startAt: true,
        status: true,
        deletedAt: true,
        tenantId: true,
        subcategory: { select: { name: true } },
      },
    });
    return new Map(rows.map((r) => [r.id, r]));
  }

  async getPublic(
    tenantId: string,
    category: ContentMainCategory,
  ): Promise<PublicCategoryBannerResponse> {
    const manualRows: CategoryBannerItem[] = await this.prisma.categoryBannerItem.findMany({
      where: { tenantId, category, isActive: true },
      orderBy: { position: 'asc' },
      take: MAX_BANNER_ITEMS,
    });

    const manualEventIds = manualRows.map((r: CategoryBannerItem) => r.eventId);
    const eventsById = await this.loadEventsByIds(tenantId, manualEventIds);

    const data: CategoryBannerResolvedItem[] = [];
    const seen = new Set<string>();
    let manualValidCount = 0;

    for (const row of manualRows) {
      const event = eventsById.get(row.eventId);
      if (!event || !this.isPublicBannerEvent(event)) continue;
      if (!this.eventMatchesCategory(event, category)) continue;
      data.push(this.toResolvedItem(event, { isManual: true, position: row.position }));
      seen.add(event.id);
      manualValidCount += 1;
      if (data.length >= MAX_BANNER_ITEMS) break;
    }

    if (data.length < MAX_BANNER_ITEMS) {
      const recent = await this.prisma.event.findMany({
        where: {
          ...this.publicBaseWhere(tenantId, category),
          ...(seen.size > 0 ? { id: { notIn: [...seen] } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_BANNER_ITEMS - data.length,
        select: {
          id: true,
          title: true,
          description: true,
          coverImageUrl: true,
          category: true,
          subcategoryId: true,
          city: true,
          venueName: true,
          startAt: true,
          status: true,
          deletedAt: true,
          tenantId: true,
          subcategory: { select: { name: true } },
        },
      });

      for (const event of recent) {
        data.push(this.toResolvedItem(event, { isManual: false }));
      }
    }

    return {
      mode: manualValidCount > 0 ? 'manual' : 'automatic',
      data,
    };
  }

  async getAdmin(
    tenantId: string,
    category: ContentMainCategory,
  ): Promise<AdminCategoryBannerConfigResponse> {
    const rows: CategoryBannerItem[] = await this.prisma.categoryBannerItem.findMany({
      where: { tenantId, category, isActive: true },
      orderBy: { position: 'asc' },
    });

    if (rows.length === 0) {
      return { mode: 'automatic', items: [] };
    }

    const eventsById = await this.loadEventsByIds(
      tenantId,
      rows.map((r: CategoryBannerItem) => r.eventId),
    );

    const items = rows
      .map((row: CategoryBannerItem) => {
        const event = eventsById.get(row.eventId);
        if (!event) return null;
        return {
          id: row.id,
          eventId: row.eventId,
          position: row.position,
          isActive: row.isActive,
          title: event.title,
          coverImageUrl: event.coverImageUrl,
          category: event.category,
          status: event.status.toLowerCase(),
          startAt: event.startAt.toISOString(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return { mode: 'manual', items };
  }

  async replaceAdmin(
    tenantId: string,
    category: ContentMainCategory,
    body: UpdateCategoryBannerItemsBody,
  ): Promise<AdminCategoryBannerConfigResponse> {
    const items = body.items ?? [];

    const eventIds = items.map((i) => i.eventId);
    const uniqueIds = new Set(eventIds);
    if (uniqueIds.size !== eventIds.length) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Duplicate eventId in banner items',
      });
    }

    if (items.length > MAX_BANNER_ITEMS) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: `Maximum ${MAX_BANNER_ITEMS} banner items allowed`,
      });
    }

    if (items.length > 0) {
      const events = await this.prisma.event.findMany({
        where: { tenantId, id: { in: eventIds }, deletedAt: null },
        select: { id: true, category: true, status: true, startAt: true },
      });

      if (events.length !== eventIds.length) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'One or more events were not found for this tenant',
        });
      }

      for (const event of events) {
        if (!this.eventMatchesCategory(event, category)) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'All banner items must belong to the selected category',
          });
        }
        if (event.status !== 'APPROVED') {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Only approved content can be added to category banners',
          });
        }
        if (
          category === 'event' &&
          !isEventPubliclyVisible(event.startAt, event.category)
        ) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'Expired events cannot be added to event banners',
          });
        }
      }
    }

    const normalized = [...items]
      .sort((a, b) => a.position - b.position)
      .map((item, index) => ({
        eventId: item.eventId,
        position: index + 1,
      }));

    await this.prisma.$transaction(async (tx) => {
      await tx.categoryBannerItem.deleteMany({ where: { tenantId, category } });
      if (normalized.length > 0) {
        await tx.categoryBannerItem.createMany({
          data: normalized.map((item) => ({
            tenantId,
            category,
            eventId: item.eventId,
            position: item.position,
            isActive: true,
          })),
        });
      }
    });

    return this.getAdmin(tenantId, category);
  }

  async removeAdminItem(
    tenantId: string,
    category: ContentMainCategory,
    itemId: string,
  ): Promise<AdminCategoryBannerConfigResponse> {
    const existing = await this.prisma.categoryBannerItem.findFirst({
      where: { id: itemId, tenantId, category },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Category banner item not found',
      });
    }

    await this.prisma.categoryBannerItem.delete({ where: { id: itemId } });

    const remaining: CategoryBannerItem[] = await this.prisma.categoryBannerItem.findMany({
      where: { tenantId, category, isActive: true },
      orderBy: { position: 'asc' },
    });

    await this.prisma.$transaction(
      remaining.map((row: CategoryBannerItem, index: number) =>
        this.prisma.categoryBannerItem.update({
          where: { id: row.id },
          data: { position: index + 1 },
        }),
      ),
    );

    return this.getAdmin(tenantId, category);
  }
}
