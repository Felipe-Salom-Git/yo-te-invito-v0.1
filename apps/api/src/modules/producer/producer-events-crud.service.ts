import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  EventCreateDto,
  EventUpdateDto,
  EventDetail,
  EventSummary,
  EventsPaginatedResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class ProducerEventsCrudService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertEventOwnedByUser(
    eventId: string,
    tenantId: string,
    userId: string,
    userRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, producerId: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const isAdmin = userRole === 'ADMIN';
    const isOwner = event.producerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not allowed to modify this event',
      });
    }
    return event;
  }

  private toEventDetail(event: {
    id: string;
    title: string;
    startAt: Date;
    city: string | null;
    venueName: string | null;
    coverImageUrl: string | null;
    description: string | null;
    endAt: Date | null;
    venueAddress: string | null;
    geoLat: number | null;
    geoLng: number | null;
    capacityTotal: number | null;
    isTicketingEnabled: boolean;
    status: string;
    ratingAvg: number | null;
    ratingCount: number;
    media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
  }): EventDetail {
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
      ratingAvg: event.ratingAvg ?? undefined,
      ratingCount: event.ratingCount,
      media: event.media.map((m) => ({
        id: m.id,
        type: m.type as 'IMAGE' | 'VIDEO',
        url: m.url,
        sortOrder: m.sortOrder,
      })),
    };
  }

  async getDetail(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<EventDetail> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      include: {
        media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    return this.toEventDetail({
      ...event,
      media: event.media,
    });
  }

  async list(
    tenantId: string,
    producerId: string,
    userRole: string,
    page = 1,
    limit = 50,
    status?: string,
  ): Promise<EventsPaginatedResponse> {
    const where: {
      tenantId: string;
      deletedAt: null;
      producerId?: string;
      status?: EventStatus;
    } = {
      tenantId,
      deletedAt: null,
    };
    if (userRole !== 'ADMIN') {
      where.producerId = producerId;
    }
    const validStatuses: EventStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'CANCELLED'];
    if (status && validStatuses.includes(status.toUpperCase() as EventStatus)) {
      where.status = status.toUpperCase() as EventStatus;
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
        skip: (page - 1) * limit,
        take: limit,
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
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async create(
    tenantId: string,
    producerId: string,
    body: EventCreateDto,
  ): Promise<EventDetail> {
    const event = await this.prisma.event.create({
      data: {
        tenantId,
        producerId,
        title: body.title,
        description: body.description ?? null,
        startAt: new Date(body.startAt),
        endAt: body.endAt ? new Date(body.endAt) : null,
        city: body.city ?? null,
        venueName: body.venueName ?? null,
        venueAddress: body.venueAddress ?? null,
        capacityTotal: body.capacityTotal ?? null,
        coverImageUrl: body.coverImageUrl ?? null,
        geoLat: body.geoLat ?? null,
        geoLng: body.geoLng ?? null,
        status: 'DRAFT',
        isTicketingEnabled: false,
      },
      include: {
        media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return this.toEventDetail({
      ...event,
      media: event.media,
    });
  }

  async update(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
    body: EventUpdateDto,
  ): Promise<EventDetail> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);

    const event = await this.prisma.event.update({
      where: { id: eventId },
      data: {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.startAt !== undefined && { startAt: new Date(body.startAt) }),
        ...(body.endAt !== undefined && {
          endAt: body.endAt ? new Date(body.endAt) : null,
        }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.venueName !== undefined && { venueName: body.venueName }),
        ...(body.venueAddress !== undefined && {
          venueAddress: body.venueAddress,
        }),
        ...(body.capacityTotal !== undefined && {
          capacityTotal: body.capacityTotal,
        }),
        ...(body.coverImageUrl !== undefined && {
          coverImageUrl: body.coverImageUrl,
        }),
        ...(body.geoLat !== undefined && { geoLat: body.geoLat }),
        ...(body.geoLng !== undefined && { geoLng: body.geoLng }),
        ...(body.status !== undefined && { status: body.status }),
      },
      include: {
        media: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
      },
    });

    return this.toEventDetail({
      ...event,
      media: event.media,
    });
  }
}
