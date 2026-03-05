import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  EventsListQuery,
  EventsPaginatedResponse,
  EventSummary,
  EventDetail,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class PublicEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: EventsListQuery): Promise<EventsPaginatedResponse> {
    const where: Prisma.EventWhereInput = {
      tenantId: query.tenantId,
      status: 'APPROVED',
      deletedAt: null,
    };

    if (query.city) {
      where.city = query.city;
    }

    if (query.dateFrom || query.dateTo) {
      where.startAt = {};
      if (query.dateFrom) {
        where.startAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.startAt.lte = new Date(query.dateTo);
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          title: true,
          startAt: true,
          city: true,
          venueName: true,
          coverImageUrl: true,
        },
        orderBy: { startAt: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.event.count({ where }),
    ]);

    const items: EventSummary[] = data.map((e) => ({
      id: e.id,
      title: e.title,
      startAt: e.startAt.toISOString(),
      city: e.city,
      venueName: e.venueName,
      coverImageUrl: e.coverImageUrl,
    }));

    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async detail(id: string, tenantId: string): Promise<EventDetail> {
    const event = await this.prisma.event.findFirst({
      where: {
        id,
        tenantId,
        status: 'APPROVED',
        deletedAt: null,
      },
      include: {
        media: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    return {
      id: event.id,
      title: event.title,
      startAt: event.startAt.toISOString(),
      city: event.city,
      venueName: event.venueName,
      coverImageUrl: event.coverImageUrl,
      description: event.description,
      endAt: event.endAt?.toISOString() ?? null,
      venueAddress: event.venueAddress,
      geoLat: event.geoLat,
      geoLng: event.geoLng,
      capacityTotal: event.capacityTotal,
      isTicketingEnabled: event.isTicketingEnabled,
      status: event.status,
      media: event.media.map((m) => ({
        id: m.id,
        type: m.type,
        url: m.url,
        sortOrder: m.sortOrder,
      })),
    };
  }
}
